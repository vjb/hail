import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opaque to outsiders: no X-Powered-By header, no browser source maps in production.
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Native module (reads Content Credentials): load it from node_modules at runtime, don't bundle it.
  serverExternalPackages: ["@contentauth/c2pa-node"],
};

export default nextConfig;
