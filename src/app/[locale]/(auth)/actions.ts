"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { withinRateLimit } from "@/lib/rate-limit";
import { getSiteUrl, safeNextPath } from "@/lib/site";
import { verifyTurnstile } from "@/lib/turnstile";

// `verified`: a recovery token was already used up (and the user signed in) by this form.
export type AuthState = { error?: string; info?: string; verified?: boolean } | undefined;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "sl");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Unconfirmed addresses can't sign in (email confirmations are on); say so, rather than
  // a generic "check your details" that sends people retyping a correct password.
  if (error) return { error: error.code === "email_not_confirmed" ? "email_not_confirmed" : "generic" };
  // Back to where sign-in was needed (BL-55); only same-site paths.
  redirect(safeNextPath(formData.get("next"), `/${locale}/profile`));
}

// Bump when the privacy policy or terms change materially, so stored consents
// are traceable to the text the user actually saw.
const CONSENT_POLICY_VERSION = "2026-07";

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const consent = formData.get("consent") === "on";
  const ageConfirmed = formData.get("age_confirmed") === "on";
  const locale = String(formData.get("locale") ?? "sl");

  if (!consent) return { error: "consent_required" };
  if (!ageConfirmed) return { error: "age_required" };
  if (!(await verifyTurnstile(formData))) return { error: "turnstile_failed" };
  if (!(await withinRateLimit("signup"))) return { error: "rate_limited" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/${locale}/auth/callback`,
      // Consent audit trail (GDPR/ZVOP-2), stored in auth user metadata so no
      // extra table is needed and it is deleted together with the account.
      data: {
        consent_privacy_at: new Date().toISOString(),
        consent_policy_version: CONSENT_POLICY_VERSION,
        age_confirmed: true,
        // Where to land after confirming the email (BL-55); read once by /auth/confirm.
        return_to: safeNextPath(formData.get("next"), "") || null,
      },
    },
  });

  if (error) return { error: error.message };
  return { info: "check_email" };
}

export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const locale = String(formData.get("locale") ?? "sl");

  if (!email) return { error: "email_required" };
  if (!(await verifyTurnstile(formData))) return { error: "turnstile_failed" };
  if (!(await withinRateLimit("password_reset"))) return { error: "rate_limited" };

  const supabase = await createClient();
  // The email's link comes from the recovery template (supabase/templates/recovery.html):
  // site URL + token hash, no PKCE, so it works in any browser. redirectTo only feeds
  // Supabase's default template.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/${locale}/reset-password`,
  });

  // Always report success so the form can't be used to probe which emails exist.
  return { info: "check_email" };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const tokenHash = String(formData.get("token_hash") ?? "");
  const locale = String(formData.get("locale") ?? "sl");

  // Check the input first, so a typo doesn't use up the one-time link.
  if (password.length < 6) return { error: "password_too_short" };
  if (password !== confirm) return { error: "password_mismatch" };

  const supabase = await createClient();

  // The recovery link carries a one-time token. It's verified only now, on submit: email
  // scanners that pre-open links can't use it up, and no PKCE verifier cookie is needed,
  // so the link works in any browser. Verifying signs in the link's owner.
  let verified = false;
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (error) return { error: "link_invalid" };
    verified = true;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "session_expired" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password" ? "same_password" : "generic", verified };

  redirect(`/${locale}/profile`);
}

export async function resendVerificationAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const locale = String(formData.get("locale") ?? "sl");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "auth_required" };
  if (user.email_confirmed_at) return { info: "already_verified" };
  if (!(await withinRateLimit("resend_verification", user.id))) return { error: "rate_limited" };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: `${getSiteUrl()}/${locale}/auth/callback` },
  });

  // Supabase rate-limits resends; surface that as a normal error state.
  if (error) return { error: error.message };
  return { info: "check_email" };
}

export async function logoutAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "sl");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/profile`);
}
