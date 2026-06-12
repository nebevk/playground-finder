"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionContext } from "@/lib/admin";
import { PLAYGROUND_FEATURE_KEYS, SURFACE_TYPES } from "@/lib/playground-types";

export type ExistingPoint = { id: string; name: string; lat: number; lng: number };

// All existing playground points, for client-side duplicate flagging during import.
export async function allPlaygroundPointsAction(): Promise<ExistingPoint[]> {
  const ctx = await getAdminActionContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("playgrounds_geo")
    .select("id, name, lat, lng");
  if (error || !data) {
    if (error) console.error("allPlaygroundPointsAction failed", error);
    return [];
  }
  return data.flatMap((r) =>
    r.id != null && r.name != null && r.lat != null && r.lng != null
      ? [{ id: r.id, name: r.name, lat: r.lat, lng: r.lng }]
      : [],
  );
}

export type ImportRow = {
  name: string;
  lat: number;
  lng: number;
  description: string;
  surface_type: string;
  features: Record<string, boolean>;
};

export async function bulkInsertPlaygroundsAction(
  rows: ImportRow[],
  locale: string,
): Promise<{ ok: boolean; inserted: number }> {
  const ctx = await getAdminActionContext();
  if (!ctx) return { ok: false, inserted: 0 };

  const clean = rows
    .filter((r) => r.name.trim() && Number.isFinite(r.lat) && Number.isFinite(r.lng))
    .map((r) => {
      const surface_type = (SURFACE_TYPES as readonly string[]).includes(r.surface_type)
        ? r.surface_type
        : null;
      const features = Object.fromEntries(
        PLAYGROUND_FEATURE_KEYS.map((k) => [k, r.features[k] === true]),
      );
      return {
        name: r.name.trim(),
        description: r.description.trim() || null,
        location: `SRID=4326;POINT(${r.lng} ${r.lat})`,
        surface_type,
        ...features,
        user_id: ctx.user.id,
      };
    });

  if (clean.length === 0) return { ok: false, inserted: 0 };

  const { data, error } = await ctx.admin.from("playgrounds").insert(clean).select("id");
  if (error) {
    console.error("bulkInsertPlaygroundsAction failed", error);
    return { ok: false, inserted: 0 };
  }

  revalidatePath(`/${locale}/admin/playgrounds`);
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}`);
  return { ok: true, inserted: data?.length ?? 0 };
}
