import { describe, expect, it } from "vitest";
import { productionEnvProblems } from "@/lib/env-checks";

const complete = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
  SUPABASE_SECRET_KEY: "sb_secret_x",
  NEXT_PUBLIC_PRIVACY_EMAIL: "zasebnost@igrala.si",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAA",
  TURNSTILE_SECRET_KEY: "0x4BBB",
};

describe("production environment guard (fails Vercel production deploys)", () => {
  it("[GDPR-10] [NFR-SEC-02] accepts a complete configuration", () => {
    expect(productionEnvProblems(complete)).toEqual([]);
  });

  it("[GDPR-10] requires a real privacy contact address", () => {
    expect(productionEnvProblems({ ...complete, NEXT_PUBLIC_PRIVACY_EMAIL: "" })).toEqual([
      "NEXT_PUBLIC_PRIVACY_EMAIL is not set",
    ]);
    expect(productionEnvProblems({ ...complete, NEXT_PUBLIC_PRIVACY_EMAIL: "nobody" })).toEqual([
      "NEXT_PUBLIC_PRIVACY_EMAIL is not an email address",
    ]);
    expect(productionEnvProblems({ ...complete, NEXT_PUBLIC_PRIVACY_EMAIL: "privacy@example.invalid" })).toHaveLength(1);
  });

  it("[NFR-SEC-02] requires both Turnstile keys, so public forms are never unprotected", () => {
    expect(productionEnvProblems({ ...complete, TURNSTILE_SECRET_KEY: undefined })).toEqual([
      "TURNSTILE_SECRET_KEY is not set",
    ]);
    expect(productionEnvProblems({ ...complete, NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined })).toEqual([
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set",
    ]);
  });

  it("[FR-ADD-04] requires the service-role key that photo uploads use", () => {
    expect(productionEnvProblems({ ...complete, SUPABASE_SECRET_KEY: " " })).toEqual(["SUPABASE_SECRET_KEY is not set"]);
  });
});
