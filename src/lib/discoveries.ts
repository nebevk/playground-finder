import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { haversineMeters, SAME_PLAYGROUND_M } from "./geo";
import { DESCRIPTION_MAX, NAME_MAX } from "./limits";
import { featuresFromAnswers, PLAYGROUND_FEATURE_KEYS, type FeatureKey } from "./playground-types";
import { inSlovenia } from "./slovenia";
import type { Database } from "./supabase/types";

// The discoveries API (BL-70, ADR-0003, FR-ADM-09): a daily routine posts OpenStreetMap playgrounds
// to POST /api/discoveries, and the ones that pass wait in the review queue as pending. The routine
// holds only a shared secret; this server holds the service role and enforces every rule.

export const MAX_CANDIDATES = 20;
export const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_DAILY_CAP = 2;
const MAX_DAILY_CAP = 50;
const MIN_SECRET_LENGTH = 32;
// The database's limits (ops 0012, 0020).
const EXTERNAL_ID_MAX = 100;
const SOURCE_NOTES_MAX = 1000;
const OSM_ID = /^(node|way|relation)\/[1-9]\d*$/;
const TIME_ZONE = "Europe/Ljubljana";

// ── Who may call ────────────────────────────────────────────────────────────

export type AuthResult = "ok" | "unauthorized" | "not_configured";

// `Authorization: Bearer <DISCOVERY_SECRET>`, compared in constant time. Fails closed: without a
// secret, or with a short one, nothing gets in (503), so a missing env var can't open the door.
export function checkDiscoverySecret(header: string | null, secret: string | undefined): AuthResult {
  if (!secret || secret.length < MIN_SECRET_LENGTH) return "not_configured";
  const token = header?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return "unauthorized";
  // Hashing both gives equal lengths, so the comparison leaks neither the secret nor its length.
  const given = createHash("sha256").update(token).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(given, expected) ? "ok" : "unauthorized";
}

// DISCOVERY_DAILY_CAP: discoveries a day, 2 unless set (at most 50).
export function dailyCap(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_DAILY_CAP) : DEFAULT_DAILY_CAP;
}

// ── What may be sent ────────────────────────────────────────────────────────

// The whole request: a 400 only when this is wrong. Each candidate is checked on its own.
export const discoveryRequestSchema = z.object({
  max: z.number().int().min(1).optional(),
  candidates: z.array(z.unknown()).min(1).max(MAX_CANDIDATES),
});
export type DiscoveryRequest = z.infer<typeof discoveryRequestSchema>;

// Answers as in the forms (ops 0022): true = has it, false = doesn't, missing = don't know.
const featureAnswersSchema = z
  .object(Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, z.boolean()])) as Record<FeatureKey, z.ZodBoolean>)
  .partial()
  .strict();

const candidateSchema = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX),
    lat: z.number().finite(),
    lng: z.number().finite(),
    description: z.string().trim().max(DESCRIPTION_MAX).optional(),
    features: featureAnswersSchema.optional(),
    source: z.literal("osm"),
    external_id: z.string().max(EXTERNAL_ID_MAX).regex(OSM_ID, "expected node/<id>, way/<id> or relation/<id>"),
    source_notes: z.string().trim().max(SOURCE_NOTES_MAX).optional(),
  })
  .strict();
export type Candidate = z.infer<typeof candidateSchema>;

export type Rejected = { index: number; external_id?: string; reason: "invalid" | "outside_slovenia"; detail: string };
export type Skipped = {
  index: number;
  external_id: string;
  reason: "duplicate_external_id" | "nearby" | "daily_cap";
  /** The playground already there (nearby), or the candidate earlier in this request. */
  nearby_id?: string;
  nearby_external_id?: string;
};
type Valid = { index: number; candidate: Candidate };

export function validateCandidate(raw: unknown, index: number): { ok: true; candidate: Candidate } | { ok: false; rejected: Rejected } {
  const sent = (raw as { external_id?: unknown } | null)?.external_id;
  const external_id = typeof sent === "string" ? sent.slice(0, EXTERNAL_ID_MAX) : undefined;
  const parsed = candidateSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join(".") || "candidate";
    return { ok: false, rejected: { index, external_id, reason: "invalid", detail: `${field}: ${issue.message}` } };
  }
  const { lat, lng } = parsed.data;
  if (!inSlovenia(lat, lng)) {
    return { ok: false, rejected: { index, external_id, reason: "outside_slovenia", detail: `${lat}, ${lng}` } };
  }
  return { ok: true, candidate: parsed.data };
}

// ── What gets in ────────────────────────────────────────────────────────────

// In request order: skip a candidate already in the database (any status, so a rejected one never
// comes back) or earlier in this request, one within 150 m of a playground of any status or of an
// earlier candidate, and everything past the daily cap.
export function planDiscoveries(
  valid: readonly Valid[],
  { known, nearby, allowed }: { known: ReadonlySet<string>; nearby: ReadonlyMap<number, string>; allowed: number },
): { insert: Valid[]; skipped: Skipped[] } {
  const insert: Valid[] = [];
  const skipped: Skipped[] = [];
  const seen = new Set<string>();
  for (const v of valid) {
    const { external_id, lat, lng } = v.candidate;
    const duplicate = known.has(external_id) || seen.has(external_id);
    seen.add(external_id);
    if (duplicate) {
      skipped.push({ index: v.index, external_id, reason: "duplicate_external_id" });
      continue;
    }
    const nearbyId = nearby.get(v.index);
    if (nearbyId) {
      skipped.push({ index: v.index, external_id, reason: "nearby", nearby_id: nearbyId });
      continue;
    }
    const close = insert.find((i) => haversineMeters(lat, lng, i.candidate.lat, i.candidate.lng) <= SAME_PLAYGROUND_M);
    if (close) {
      skipped.push({ index: v.index, external_id, reason: "nearby", nearby_external_id: close.candidate.external_id });
      continue;
    }
    if (insert.length >= allowed) {
      skipped.push({ index: v.index, external_id, reason: "daily_cap" });
      continue;
    }
    insert.push(v);
  }
  return { insert, skipped };
}

// When today began in Ljubljana, as an instant: the daily cap counts from there. Computed twice
// because on a daylight-saving day midnight's offset differs from now's.
export function startOfDay(now: Date, timeZone = TIME_ZONE): Date {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  const parts = (d: Date) => Object.fromEntries(format.formatToParts(d).map((p) => [p.type, Number(p.value)]));
  const offset = (d: Date) => {
    const p = parts(d);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - (d.getTime() - (d.getTime() % 1000));
  };
  const today = parts(now);
  const midnight = Date.UTC(today.year, today.month - 1, today.day);
  const first = midnight - offset(now);
  return new Date(midnight - offset(new Date(first)));
}

export type DiscoveryResult = {
  inserted: { index: number; external_id: string; id: string }[];
  skipped: Skipped[];
  rejected: Rejected[];
  counts: { inserted: number; skipped: number; rejected: number };
  cap_remaining_today: number;
};

// Runs a validated request with the service-role client: every lookup sees pending and rejected
// playgrounds too, which RLS would hide. Throws on a database error (the route answers 500).
export async function runDiscoveries(
  db: SupabaseClient<Database>,
  request: DiscoveryRequest,
  { cap, now }: { cap: number; now: Date },
): Promise<DiscoveryResult> {
  const rejected: Rejected[] = [];
  const valid: Valid[] = [];
  request.candidates.forEach((raw, index) => {
    const result = validateCandidate(raw, index);
    if (result.ok) valid.push({ index, candidate: result.candidate });
    else rejected.push(result.rejected);
  });

  const ids = [...new Set(valid.map((v) => v.candidate.external_id))];
  const [known, today] = await Promise.all([
    ids.length > 0
      ? db.from("playgrounds").select("external_id").eq("source", "osm").in("external_id", ids)
      : Promise.resolve({ data: [], error: null }),
    db
      .from("playgrounds")
      .select("id", { count: "exact", head: true })
      .eq("source", "osm")
      .gte("created_at", startOfDay(now).toISOString()),
  ]);
  if (known.error) throw known.error;
  if (today.error) throw today.error;

  const nearby = new Map<number, string>();
  await Promise.all(
    valid.map(async ({ index, candidate }) => {
      const { data, error } = await db.rpc("playgrounds_near", {
        p_lat: candidate.lat,
        p_lng: candidate.lng,
        p_radius_m: SAME_PLAYGROUND_M,
      });
      if (error) throw error;
      if (data?.[0]?.id) nearby.set(index, data[0].id);
    }),
  );

  const remaining = Math.max(0, cap - (today.count ?? 0));
  const plan = planDiscoveries(valid, {
    known: new Set((known.data ?? []).flatMap((r) => (r.external_id ? [r.external_id] : []))),
    nearby,
    allowed: Math.min(request.max ?? cap, remaining),
  });

  const inserted: DiscoveryResult["inserted"] = [];
  const skipped = [...plan.skipped];
  for (const { index, candidate } of plan.insert) {
    const { data, error } = await db
      .from("playgrounds")
      .upsert(
        {
          name: candidate.name,
          description: candidate.description || null,
          location: `SRID=4326;POINT(${candidate.lng} ${candidate.lat})`,
          ...featuresFromAnswers(candidate.features ?? {}),
          status: "pending",
          source: "osm",
          external_id: candidate.external_id,
          source_notes: candidate.source_notes || null,
          user_id: null,
        },
        { onConflict: "source,external_id", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    // No row back: a request running at the same time added this feature first.
    if (data?.[0]) inserted.push({ index, external_id: candidate.external_id, id: data[0].id });
    else skipped.push({ index, external_id: candidate.external_id, reason: "duplicate_external_id" });
  }
  skipped.sort((a, b) => a.index - b.index);

  return {
    inserted,
    skipped,
    rejected,
    counts: { inserted: inserted.length, skipped: skipped.length, rejected: rejected.length },
    cap_remaining_today: Math.max(0, remaining - inserted.length),
  };
}
