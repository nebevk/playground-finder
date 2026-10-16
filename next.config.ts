import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { productionEnvProblems } from "./src/lib/env-checks";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Fail Vercel production deploys on missing configuration (src/lib/env-checks.ts).
if (process.env.VERCEL_ENV === "production") {
  const problems = productionEnvProblems(process.env);
  if (problems.length > 0) {
    throw new Error(`Production environment is misconfigured:\n- ${problems.join("\n- ")}`);
  }
}

const projectRoot = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only the features the app actually uses (map "locate me" geolocation).
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    serverActions: {
      // The add flow sends up to 8 photos (≤ 3.5 MB in total, src/lib/photo-checks.ts) in one
      // Server Action request. The default is 1 MB; Vercel Functions cap request bodies at 4.5 MB.
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: supabaseHost === "127.0.0.1" || supabaseHost === "localhost" ? "http" : "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
