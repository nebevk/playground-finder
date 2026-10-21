// Text limits. The database enforces the same ones (check constraints, ops 0012), because the API
// is public; here they give people a form that simply stops at the limit.
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 2000;
export const REVIEW_COMMENT_MAX = 2000;

// For admin imports of scraped text: trimmed and cut to `max` characters, never rejected.
export function clampText(value: string, max: number): string {
  return value.trim().slice(0, max).trim();
}
