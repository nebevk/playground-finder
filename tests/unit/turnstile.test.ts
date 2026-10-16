import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "@/lib/turnstile";

function form(token?: string) {
  const fd = new FormData();
  if (token !== undefined) fd.set("cf-turnstile-response", token);
  return fd;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe("Turnstile server-side verification", () => {
  it("[NFR-SEC-02] passes without calling Cloudflare when no secret is configured (local dev)", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstile(form())).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("[NFR-SEC-02] rejects a submission with no token when a secret is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(await verifyTurnstile(form())).toBe(false);
    expect(await verifyTurnstile(form(""))).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("[NFR-SEC-02] sends the secret and token to siteverify and accepts a valid token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })));

    expect(await verifyTurnstile(form("tok"))).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = new URLSearchParams(init.body);
    expect(body.get("secret")).toBe("secret");
    expect(body.get("response")).toBe("tok");
  });

  it("[NFR-SEC-02] rejects a token Cloudflare marks invalid", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] })),
    );
    expect(await verifyTurnstile(form("bad"))).toBe(false);
  });

  it("[NFR-SEC-02] fails closed when siteverify errors or is unreachable", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
    expect(await verifyTurnstile(form("tok"))).toBe(false);

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect(await verifyTurnstile(form("tok"))).toBe(false);
  });

  // Known gap (backlog BL-05): today a missing secret in production lets everything through.
  it.todo("[NFR-SEC-02] rejects submissions in production when the site key is set but the secret is missing");
});
