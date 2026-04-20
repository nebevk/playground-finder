"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const consent = formData.get("consent") === "on";
  const locale = String(formData.get("locale") ?? "sl");

  if (!consent) return { error: "consent_required" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${locale}/auth/callback` },
  });

  if (error) return { error: error.message };
  return { info: "check_email" };
}

export async function logoutAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "sl");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/profile`);
}
