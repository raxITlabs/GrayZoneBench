import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useCache: true, // Enable 'use cache' directive
    cacheComponents: true, // Enable dynamic IO for enhanced caching
  },
  // Enable transpilation of local packages for monorepo setup
  transpilePackages: [],
  // Optimize for Vercel deployment
  output: 'standalone',
  // Ensure environment variables are handled correctly
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },
};

export default nextConfig;
