import { NextResponse } from "next/server";
import { checkDiscoverySecret, dailyCap, discoveryRequestSchema, MAX_BODY_BYTES, runDiscoveries } from "@/lib/discoveries";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/discoveries (BL-70, FR-ADM-09): OpenStreetMap playgrounds from the daily routine, into
// the review queue as pending. The rules are in src/lib/discoveries.ts. Other methods get 405 (Next
// answers so for every method this file doesn't export); the proxy's matcher skips /api.
export async function POST(request: Request) {
  const auth = checkDiscoverySecret(request.headers.get("authorization"), process.env.DISCOVERY_SECRET);
  if (auth === "not_configured") return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (auth === "unauthorized") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = discoveryRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: "invalid_body", detail: `${issue.path.join(".") || "body"}: ${issue.message}` },
      { status: 400 },
    );
  }

  try {
    const result = await runDiscoveries(createAdminClient(), parsed.data, {
      cap: dailyCap(process.env.DISCOVERY_DAILY_CAP),
      now: new Date(),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/discoveries failed", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
