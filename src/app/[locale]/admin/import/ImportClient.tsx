"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/Toast/ToastProvider";
import { parseCsv, parseBool } from "@/lib/csv";
import { haversineMeters } from "@/lib/geo";
import { PLAYGROUND_FEATURE_KEYS, SURFACE_TYPES } from "@/lib/playground-types";
import { geocodeAddressAction } from "../add/actions";
import {
  allPlaygroundPointsAction,
  bulkInsertPlaygroundsAction,
  type ExistingPoint,
} from "./actions";

const COLS: Record<string, string[]> = {
  name: ["name", "ime", "naziv"],
  address: ["address", "naslov", "lokacija"],
  lat: ["lat", "latitude", "y", "gps_lat"],
  lng: ["lng", "lon", "long", "longitude", "x", "gps_lng"],
  description: ["description", "opis"],
  surface: ["surface", "surface_type", "podlaga"],
  is_fenced: ["fenced", "is_fenced", "ograjeno"],
  has_shade: ["shade", "has_shade", "senca"],
  has_water: ["water", "has_water", "pitnik", "voda"],
  has_toilets: ["toilets", "has_toilets", "stranisce", "wc"],
  has_parking: ["parking", "has_parking", "parkirisce"],
};

const DUP_M = 60;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Candidate = {
  key: number;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  description: string;
  surface_type: string;
  features: Record<string, boolean>;
  status: "pending" | "geocoding" | "ready" | "failed";
  dup: { name: string; dist: number } | null;
  include: boolean;
};

function indexHeaders(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    const norm = h.trim().toLowerCase();
    for (const [field, aliases] of Object.entries(COLS)) {
      if (aliases.includes(norm)) map[field] = i;
    }
  });
  return map;
}

export function ImportClient({ locale }: { locale: string }) {
  const t = useTranslations("admin.import");
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importing, startImport] = useTransition();

  const [raw, setRaw] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [phase, setPhase] = useState<"input" | "review">("input");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  function num(v: string | undefined): number | null {
    if (v == null) return null;
    const n = Number(v.trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function handleParse() {
    if (!raw.trim()) {
      showToast(t("emptyInput"), "error");
      return;
    }
    const rows = parseCsv(raw);
    if (rows.length < 2) {
      showToast(t("nothingValid"), "error");
      return;
    }
    const idx = indexHeaders(rows[0]);
    const get = (r: string[], field: string) =>
      idx[field] != null ? r[idx[field]] : undefined;

    const parsed: Candidate[] = rows.slice(1).map((r, i) => {
      const lat = num(get(r, "lat"));
      const lng = num(get(r, "lng"));
      const hasCoords = lat != null && lng != null;
      const address = (get(r, "address") ?? "").trim();
      return {
        key: i,
        name: (get(r, "name") ?? "").trim(),
        address,
        lat,
        lng,
        description: (get(r, "description") ?? "").trim(),
        surface_type: (get(r, "surface") ?? "").trim().toLowerCase(),
        features: Object.fromEntries(
          PLAYGROUND_FEATURE_KEYS.map((k) => [k, parseBool(get(r, k))]),
        ),
        status: hasCoords ? "ready" : address ? "pending" : "failed",
        dup: null,
        include: hasCoords,
      };
    });
    setCandidates(parsed);
    setPhase("review");
  }

  async function handleProcess() {
    setProcessing(true);
    const existing: ExistingPoint[] = await allPlaygroundPointsAction();
    const pending = candidates.filter((c) => c.status === "pending");
    setProgress({ done: 0, total: pending.length });

    const next = [...candidates];
    let done = 0;
    for (let i = 0; i < next.length; i++) {
      const c = next[i];
      if (c.status === "pending") {
        next[i] = { ...c, status: "geocoding" };
        setCandidates([...next]);
        const geo = await geocodeAddressAction(c.address);
        if (geo) {
          next[i] = { ...next[i], lat: geo.lat, lng: geo.lng, status: "ready" };
        } else {
          next[i] = { ...next[i], status: "failed", include: false };
        }
        done++;
        setProgress({ done, total: pending.length });
        setCandidates([...next]);
        await sleep(1100); // respect Nominatim ~1 req/s
      }
    }

    // Duplicate flags against existing playgrounds.
    for (let i = 0; i < next.length; i++) {
      const c = next[i];
      if (c.lat == null || c.lng == null) continue;
      let best: { name: string; dist: number } | null = null;
      for (const e of existing) {
        const d = haversineMeters(c.lat, c.lng, e.lat, e.lng);
        if (d <= DUP_M && (!best || d < best.dist)) best = { name: e.name, dist: Math.round(d) };
      }
      next[i] = {
        ...c,
        dup: best,
        include: c.status === "ready" && !best ? c.include : c.include && !best,
      };
    }
    setCandidates([...next]);
    setProcessing(false);
  }

  function patch(key: number, p: Partial<Candidate>) {
    setCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, ...p } : c)));
  }

  function handleImport() {
    const rows = candidates
      .filter((c) => c.include && c.status === "ready" && c.lat != null && c.lng != null && c.name.trim())
      .map((c) => ({
        name: c.name,
        lat: c.lat as number,
        lng: c.lng as number,
        description: c.description,
        surface_type: c.surface_type,
        features: c.features,
      }));
    if (rows.length === 0) {
      showToast(t("nothingValid"), "error");
      return;
    }
    startImport(async () => {
      const res = await bulkInsertPlaygroundsAction(rows, locale);
      if (!res.ok) {
        showToast(t("error"), "error");
        return;
      }
      showToast(t("success", { count: res.inserted }), "success");
      setCandidates([]);
      setRaw("");
      setPhase("input");
    });
  }

  const pendingCount = candidates.filter((c) => c.status === "pending").length;
  const selectedCount = candidates.filter(
    (c) => c.include && c.status === "ready",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-base-content/70">{t("intro")}</p>
      <p className="rounded-box bg-base-200/60 p-3 font-mono text-xs text-base-content/70">
        {t("formatHelp")}
      </p>

      {phase === "input" ? (
        <>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            placeholder="name,address,surface,fenced,shade…"
            aria-label={t("pasteLabel")}
            className="textarea textarea-bordered w-full font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setRaw(await f.text());
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn btn-outline btn-sm gap-1"
            >
              <Upload className="size-4" aria-hidden />
              {t("upload")}
            </button>
            <button type="button" onClick={handleParse} className="btn btn-primary btn-sm">
              {t("parse")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">{t("parsedCount", { count: candidates.length })}</span>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                className="btn btn-sm gap-1"
              >
                {processing && <span className="loading loading-spinner loading-xs" aria-hidden />}
                {processing ? t("processing", progress) : t("process")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPhase("input");
                setCandidates([]);
              }}
              className="btn btn-ghost btn-sm"
            >
              ✕
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="w-0">{t("colInclude")}</th>
                  <th>{t("colName")}</th>
                  <th>{t("colCoords")}</th>
                  <th>{t("colSurface")}</th>
                  <th>{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.key} className={c.dup ? "bg-warning/10" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        checked={c.include}
                        disabled={c.status !== "ready"}
                        onChange={(e) => patch(c.key, { include: e.target.checked })}
                        className="checkbox checkbox-sm"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => patch(c.key, { name: e.target.value })}
                        className="input input-ghost input-xs w-full min-w-32"
                      />
                    </td>
                    <td className="whitespace-nowrap text-xs tabular-nums">
                      {c.lat != null && c.lng != null
                        ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`
                        : "—"}
                    </td>
                    <td className="text-xs">
                      {(SURFACE_TYPES as readonly string[]).includes(c.surface_type)
                        ? c.surface_type
                        : "—"}
                    </td>
                    <td className="text-xs">
                      {c.status === "ready" && !c.dup && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="size-3" aria-hidden />
                          {t("statusReady")}
                        </span>
                      )}
                      {c.status === "geocoding" && (
                        <span className="loading loading-spinner loading-xs" aria-hidden />
                      )}
                      {c.status === "failed" && (
                        <span className="text-error">{t("statusFailed")}</span>
                      )}
                      {c.dup && (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <AlertTriangle className="size-3" aria-hidden />
                          {t("dupWarning", { name: c.dup.name, distance: c.dup.dist })}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || selectedCount === 0}
            className="btn btn-primary self-start gap-2"
          >
            {importing && <span className="loading loading-spinner loading-sm" aria-hidden />}
            {t("import", { count: selectedCount })}
          </button>
        </>
      )}
    </div>
  );
}
