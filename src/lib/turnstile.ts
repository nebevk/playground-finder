const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Server-side verification of a Cloudflare Turnstile token submitted with a form.
// The widget injects a hidden `cf-turnstile-response` input into its parent form.
//
// When TURNSTILE_SECRET_KEY is not configured the check passes, so environments
// without Turnstile (local dev, previews) keep working. When it IS configured,
// a missing or invalid token fails the check.
export async function verifyTurnstile(formData: FormData): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      console.warn("verifyTurnstile: TURNSTILE_SECRET_KEY missing; skipping verification");
    }
    return true;
  }

  const token = formData.get("cf-turnstile-response");
  if (typeof token !== "string" || token.length === 0) return false;

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!res.ok) {
      console.error("verifyTurnstile: siteverify HTTP error", res.status);
      return false;
    }
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (!data.success) {
      console.warn("verifyTurnstile: token rejected", data["error-codes"]);
    }
    return data.success;
  } catch (err) {
    console.error("verifyTurnstile: siteverify request failed", err);
    return false;
  }
}
