"use server";

import { unstable_cache } from "next/cache";
import { geocodeInSlovenia, type Place } from "@/lib/geocode";
import { withinRateLimit } from "@/lib/rate-limit";

export type PlaceSearch = { place: Place | null } | { error: "rate_limited" | "failed" };

// A place's answer is cached for a day (Nominatim asks for caching): the same town searched by
// many people is looked up once. Failures throw, so they aren't cached.
const cachedPlace = unstable_cache((query: string) => geocodeInSlovenia(query), ["place-search-v1"], {
  revalidate: 60 * 60 * 24,
});

// Search by place (FR-MAP-10): where a town or neighbourhood is, so the page can list the
// playgrounds around it. Only when the visitor submits a search, and rate-limited per client.
export async function searchPlaceAction(query: string): Promise<PlaceSearch> {
  const q = query.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 100);
  if (q.length < 2) return { place: null };
  if (!(await withinRateLimit("place_search"))) return { error: "rate_limited" };
  try {
    return { place: await cachedPlace(q) };
  } catch (err) {
    console.error("searchPlaceAction failed", err);
    return { error: "failed" };
  }
}
