import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opaque to outsiders: no X-Powered-By header, no browser source maps in production.
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
