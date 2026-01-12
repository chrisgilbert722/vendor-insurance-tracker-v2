/** @type {import('next').NextConfig} */
import path from "path";

const nextConfig = {
  reactStrictMode: true,

  output: "standalone",

  experimental: {
    optimizePackageImports: [],
  },

  // 🔑 Explicitly enable Turbopack (required in Next 16)
  turbopack: {},

  webpack: (config) => {
    // ✅ Preserve existing fallbacks (xlsx, etc.)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // ✅ ABSOLUTE ALIASES — REQUIRED FOR VERCEL BUILDS
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
