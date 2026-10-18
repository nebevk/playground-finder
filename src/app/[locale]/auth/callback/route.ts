import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-site paths (no "//evil.com" or "/\evil.com").
  const next = safeNextPath(searchParams.get("next"), `/${locale}/profile`);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Missing or failed code: typically the link was opened in a different browser than the one
  // that requested it (PKCE), or it expired. Say so instead of a silent login page.
  return NextResponse.redirect(`${origin}/${locale}/login?error=link_invalid`);
}
