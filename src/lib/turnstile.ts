const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Server-side verification of a Cloudflare Turnstile token submitted with a form.
// The widget injects a hidden `cf-turnstile-response` input into its parent form.
//
// Without any Turnstile keys the check passes, so local dev, CI and previews keep working
// (Vercel production builds refuse to deploy without them, src/lib/env-checks.ts).
// With the widget enabled but no secret, it fails closed: the form can't be verified.
export async function verifyTurnstile(formData: FormData): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      console.error("verifyTurnstile: widget enabled but TURNSTILE_SECRET_KEY is missing — rejecting");
      return false;
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
