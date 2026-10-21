import { signedPhotoUrls } from "./playgrounds";
import { createClient } from "./supabase/server";

type PlaygroundRef = { id: string; name: string } | null;

export type MyContributions = {
  playgrounds: { id: string; name: string; flagged: boolean }[];
  reviews: { id: string; rating: number; comment: string | null; flagged: boolean; playground: PlaygroundRef }[];
  /** `url` is null while the photo is in review: storage only serves photos that aren't flagged. */
  photos: { id: string; url: string | null; flagged: boolean; playground: PlaygroundRef }[];
};

// Everything the signed-in user has added (FR-COM-07), newest first. Flagged items are included:
// the owner select policies (ops 0006) let people read their own flagged rows. The playground a
// review or photo belongs to is null when it is someone else's and in review.
export async function getMyContributions(userId: string): Promise<MyContributions> {
  const supabase = await createClient();
  const [playgrounds, reviews, photos] = await Promise.all([
    supabase
      .from("playgrounds")
      .select("id, name, flagged")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, rating, comment, flagged, playgrounds(id, name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("photos")
      .select("id, storage_path, flagged, playgrounds(id, name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  for (const { error } of [playgrounds, reviews, photos]) {
    if (error) console.error("getMyContributions failed", error);
  }

  const photoRows = photos.data ?? [];
  const urlByPath = await signedPhotoUrls(
    supabase,
    photoRows.filter((p) => !p.flagged).map((p) => p.storage_path),
  );

  return {
    playgrounds: playgrounds.data ?? [],
    reviews: (reviews.data ?? []).map(({ playgrounds: playground, ...r }) => ({ ...r, playground })),
    photos: photoRows.map((p) => ({
      id: p.id,
      url: urlByPath.get(p.storage_path) ?? null,
      flagged: p.flagged,
      playground: p.playgrounds,
    })),
  };
}
