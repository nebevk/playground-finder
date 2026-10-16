import { afterEach, describe, expect, it, vi } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrubEvent, scrubUrl, sentryOptions } from "@/lib/sentry-options";

afterEach(() => vi.unstubAllEnvs());

describe("error tracking settings", () => {
  it("[NFR-OPS-04] is off without a DSN, and on with one", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    expect(sentryOptions().enabled).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o1.ingest.de.sentry.io/1");
    expect(sentryOptions().enabled).toBe(true);
  });

  it("[NFR-OPS-04] sends errors only, without personal data", () => {
    const o = sentryOptions();
    expect(o.sendDefaultPii).toBe(false);
    expect(o.tracesSampleRate).toBe(0);
  });
});

describe("scrubbing one-time tokens and personal data", () => {
  it("[NFR-OPS-04] hides reset and confirmation tokens in URLs, absolute or relative", () => {
    expect(scrubUrl("https://app.si/sl/reset-password?token_hash=SECRET&type=recovery")).toBe(
      "https://app.si/sl/reset-password?token_hash=%5Bscrubbed%5D&type=recovery",
    );
    expect(scrubUrl("/sl/auth/callback?code=SECRET&next=/sl")).not.toContain("SECRET");
    expect(scrubUrl("https://app.si/#access_token=SECRET&type=bearer")).toBe("https://app.si/#[scrubbed]");
    expect(scrubUrl("https://app.si/sl/map?added=pg1")).toBe("https://app.si/sl/map?added=pg1");
  });

  it("[NFR-OPS-04] strips cookies, auth headers, user identity and tokens from events", () => {
    const event = {
      type: undefined,
      request: {
        url: "https://app.si/sl/reset-password?token_hash=SECRET",
        query_string: "token_hash=SECRET",
        cookies: { "sb-access-token": "SECRET" },
        headers: { Cookie: "sb=SECRET", Authorization: "Bearer SECRET", "user-agent": "phone" },
      },
      user: { id: "u1", email: "parent@example.com" },
      breadcrumbs: [{ category: "navigation", data: { from: "/sl", to: "/sl/auth/confirm?token_hash=SECRET" } }],
    } as unknown as ErrorEvent;

    const out = JSON.stringify(scrubEvent(event));
    expect(out).not.toContain("SECRET");
    expect(out).not.toContain("parent@example.com");
    expect(out).toContain("user-agent");
  });
});
