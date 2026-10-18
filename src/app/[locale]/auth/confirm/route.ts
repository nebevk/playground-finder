import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

// Landing route for the signup-confirmation email: /auth/confirm?token_hash=…&type=email
// (supabase/templates/confirmation.html). Verifying the token confirms the address and signs
// the user in, in whatever browser opened the link — no PKCE verifier cookie needed.
// If a link scanner opened it first, the address is already confirmed: the login page says so.
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");

  if (tokenHash && searchParams.get("type") === "email") {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
    if (!error) {
      // Back to where signup started (BL-55), saved with the account; used once.
      const returnTo = safeNextPath(data.user?.user_metadata?.return_to, "");
      if (returnTo) {
        await supabase.auth.updateUser({ data: { return_to: null } });
        return NextResponse.redirect(`${origin}${returnTo}`);
      }
      return NextResponse.redirect(`${origin}/${locale}/profile?confirmed=1`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=link_invalid`);
}
