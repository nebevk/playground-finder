import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default withNextIntl(nextConfig);
