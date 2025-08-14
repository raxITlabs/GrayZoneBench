import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useCache: true, // Enable 'use cache' directive
    cacheComponents: true, // Enable dynamic IO for enhanced caching
  },
};

export default nextConfig;
