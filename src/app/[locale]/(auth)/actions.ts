"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { verifyTurnstile } from "@/lib/turnstile";

export type AuthState = { error?: string; info?: string } | undefined;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "sl");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  redirect(`/${locale}/profile`);
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

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/${locale}/auth/callback?next=/${locale}/reset-password`,
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
  const locale = String(formData.get("locale") ?? "sl");

  if (password.length < 6) return { error: "password_too_short" };
  if (password !== confirm) return { error: "password_mismatch" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The recovery link established a session via /auth/callback; without one the
  // link was invalid or expired.
  if (!user) return { error: "session_expired" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

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
