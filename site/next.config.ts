import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    useCache: true, // Enable 'use cache' directive
    cacheComponents: true, // Enable dynamic IO for enhanced caching
  },
  // Enable transpilation of local packages for monorepo setup
  transpilePackages: [],
  // Optimize for Vercel deployment
  output: 'standalone',
  // Configure for monorepo - include files from parent directories
  outputFileTracingRoot: path.join(__dirname, '../'),
  // Configure Turbopack for monorepo module resolution
  turbopack: {
    root: path.join(__dirname, '../'),
  },
  // Ensure environment variables are handled correctly
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },
};

export default nextConfig;
