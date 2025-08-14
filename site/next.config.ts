// next.config.ts (in site/)
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    useCache: true,
    cacheComponents: true,
  },
  transpilePackages: [],
  output: "standalone",

  env: { NEXT_TELEMETRY_DISABLED: "1" },

  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname), // makes "@/lib/utils" → "<site>/lib/utils"
    };
    return config;
  },
};

export default nextConfig;
