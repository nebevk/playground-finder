// Production configuration guard, run from next.config.ts on Vercel production builds.
// A problem fails the deploy — Vercel keeps the previous deployment live — instead of shipping
// a privacy page without a contact, unprotected forms, or uploads that can't be stored.

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY", // photo uploads, admin actions, account deletion
  "NEXT_PUBLIC_PRIVACY_EMAIL", // GDPR contact on /privacy and /terms (GDPR-10)
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY", // spam check on public forms (NFR-SEC-02)
  "TURNSTILE_SECRET_KEY",
] as const;

export function productionEnvProblems(env: Record<string, string | undefined>): string[] {
  const problems: string[] = REQUIRED.filter((key) => !env[key]?.trim()).map((key) => `${key} is not set`);
  const email = env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    problems.push("NEXT_PUBLIC_PRIVACY_EMAIL is not an email address");
  }
  if (email && /@example\./i.test(email)) {
    problems.push("NEXT_PUBLIC_PRIVACY_EMAIL is a placeholder; use the real, monitored inbox");
  }
  return problems;
}
