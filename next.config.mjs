/** @type {import('next').NextConfig} */
import path from "path";

const nextConfig = {
  reactStrictMode: true,

  output: "standalone",

  experimental: {
    optimizePackageImports: [],
  },

  // ❌ REMOVE TURBOPACK — it ignores webpack aliases
  // turbopack: {},

  webpack: (config) => {
    // Required fallbacks (xlsx, etc.)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // ✅ Webpack aliases (NOW ACTUALLY USED)
    config.resolve.alias = {
      ...config.resolve.alias,
      "@db": path.resolve(process.cwd(), "src/lib/db.js"),
      "@resolveOrg": path.resolve(
        process.cwd(),
        "lib/server/resolveOrg.js"
      ),
    };

    return config;
  },
};

export default nextConfig;
