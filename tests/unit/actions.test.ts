// Server Action input rules, tested with Supabase, Turnstile and Next's redirect mocked.
// These run before any database call, so they need no services.
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = {
  auth: { getUser: vi.fn(), signUp: vi.fn() },
  from: vi.fn(),
  storage: { from: vi.fn() },
};

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: vi.fn(async () => true) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

const { signupAction } = await import("@/app/[locale]/(auth)/actions");
const { createPlaygroundAction } = await import("@/app/[locale]/add/actions");
const { verifyTurnstile } = await import("@/lib/turnstile");

function fd(fields: Record<string, string | File | File[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    for (const item of Array.isArray(v) ? v : [v]) f.append(k, item);
  }
  return f;
}

const without = <T extends object>(obj: T, key: keyof T) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

const photo = (bytes = 1024, type = "image/jpeg") =>
  new File([new Uint8Array(bytes)], "p.jpg", { type });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyTurnstile).mockResolvedValue(true);
  supabase.auth.signUp.mockResolvedValue({ error: null });
});

describe("signup", () => {
  const valid = { email: "a@example.com", password: "secret123", consent: "on", age_confirmed: "on" };

  it("[GDPR-01] rejects signup when the privacy/terms consent box is not checked", async () => {
    expect(await signupAction(undefined, fd(without(valid, "consent")))).toEqual({
      error: "consent_required",
    });
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("[GDPR-02] rejects signup without the 15+ age confirmation", async () => {
    expect(await signupAction(undefined, fd(without(valid, "age_confirmed")))).toEqual({
      error: "age_required",
    });
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("[NFR-SEC-02] rejects signup when Turnstile verification fails", async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(false);
    expect(await signupAction(undefined, fd(valid))).toEqual({ error: "turnstile_failed" });
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("[GDPR-01] [GDPR-02] records consent time, policy version and age confirmation", async () => {
    expect(await signupAction(undefined, fd(valid))).toEqual({ info: "check_email" });
    const data = supabase.auth.signUp.mock.calls[0][0].options.data;
    expect(Date.parse(data.consent_privacy_at)).not.toBeNaN();
    expect(data.consent_policy_version).toMatch(/^\d{4}-\d{2}$/);
    expect(data.age_confirmed).toBe(true);
  });
});

describe("add playground", () => {
  const valid = { lat: "46.05", lng: "14.50", name: "Tivoli", locale: "sl" };
  const verified = { id: "u1", email_confirmed_at: "2026-01-01T00:00:00Z" };
  const unverified = { id: "u1", email_confirmed_at: null };

  function mockInsertOk() {
    const single = vi.fn().mockResolvedValue({ data: { id: "pg1" }, error: null });
    const insert = vi.fn(() => ({ select: () => ({ single }) }));
    supabase.from.mockReturnValue({ insert });
    return insert;
  }

  it("[FR-ADD-01] rejects anonymous submissions", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    expect(await createPlaygroundAction(undefined, fd(valid))).toEqual({ error: "auth_required" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("[NFR-SEC-02] rejects the submission when Turnstile verification fails", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: verified } });
    vi.mocked(verifyTurnstile).mockResolvedValue(false);
    expect(await createPlaygroundAction(undefined, fd(valid))).toEqual({ error: "turnstile_failed" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("[FR-ADD-03] rejects more than 8 photos", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: verified } });
    const photos = Array.from({ length: 9 }, () => photo());
    expect(await createPlaygroundAction(undefined, fd({ ...valid, photos }))).toEqual({
      error: "too_many_photos",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("[FR-ADD-03] rejects photos over 3 MiB or in formats other than PNG/JPEG/WebP", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: verified } });
    const tooBig = photo(3 * 1024 * 1024 + 1);
    const gif = photo(1024, "image/gif");
    for (const bad of [tooBig, gif]) {
      expect(await createPlaygroundAction(undefined, fd({ ...valid, photos: [bad] }))).toEqual({
        error: "upload_failed",
      });
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("[FR-ADD-04] rejects photos from a user whose email is not verified", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: unverified } });
    expect(await createPlaygroundAction(undefined, fd({ ...valid, photos: [photo()] }))).toEqual({
      error: "verify_email",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("[FR-ADD-04] still lets an unverified user add a playground without photos", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: unverified } });
    const insert = mockInsertOk();
    await expect(createPlaygroundAction(undefined, fd(valid))).rejects.toMatchObject({
      url: "/sl/map?added=pg1",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Tivoli", user_id: "u1", location: "SRID=4326;POINT(14.5 46.05)" }),
    );
  });
});
