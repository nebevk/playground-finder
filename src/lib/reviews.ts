import { createClient } from "./supabase/server";

export type ReviewWithMeta = {
  id: string;
  rating: number;
  comment: string | null;
  helpful_count: number;
  created_at: string;
  user_id: string;
  username: string;
  is_mine: boolean;
  i_marked_helpful: boolean;
};

export async function getReviewsForPlayground(
  playgroundId: string,
  currentUserId: string | null,
): Promise<ReviewWithMeta[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, helpful_count, created_at, user_id, profiles!inner(username)")
    .eq("playground_id", playgroundId)
    .eq("flagged", false)
    .order("helpful_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !rows) return [];

  const reviewIds = rows.map((r) => r.id);
  let myHelpful = new Set<string>();
  if (currentUserId && reviewIds.length > 0) {
    const { data: helpRows } = await supabase
      .from("review_helpful")
      .select("review_id")
      .eq("user_id", currentUserId)
      .in("review_id", reviewIds);
    myHelpful = new Set((helpRows ?? []).map((h) => h.review_id));
  }

  return rows.map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      helpful_count: r.helpful_count,
      created_at: r.created_at,
      user_id: r.user_id,
      username: profile?.username ?? "",
      is_mine: currentUserId === r.user_id,
      i_marked_helpful: myHelpful.has(r.id),
    };
  });
}
