// // site/next.config.ts
// import type { NextConfig } from "next";
// import path from "path";

// const nextConfig: NextConfig = {
//   experimental: {
//     useCache: true,
//     cacheComponents: true,
//   },
//   transpilePackages: [],
//   output: "standalone",

//   // Do NOT lift roots unless you truly need it
//   // outputFileTracingRoot: path.join(__dirname, "../"),
//   // turbopack: { root: path.join(__dirname, "../") },

//   env: {
//     NEXT_TELEMETRY_DISABLED: "1",
//   },

//   webpack(config) {
//     // Make the bundler resolve "@" to the site/ folder
//     config.resolve.alias = {
//       ...(config.resolve.alias || {}),
//       "@": path.resolve(__dirname),
//     };
//     return config;
//   },
// };

// export default nextConfig;


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useCache: true,
    cacheComponents: true,
  },
};

export default nextConfig;
