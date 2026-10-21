import createIntlMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { contentSecurityPolicy } from "./lib/csp";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // A fresh nonce for every request (NFR-SEC-03). Next reads the policy from the request to put
  // the nonce on its own scripts, and the layout reads x-nonce; next-intl passes both on.
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  const withNonce = new NextRequest(request, { headers });

  const response = intlMiddleware(withNonce);
  response.headers.set("Content-Security-Policy", csp);
  return updateSession(withNonce, response);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
