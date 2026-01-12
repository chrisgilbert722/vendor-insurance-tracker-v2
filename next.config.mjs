/** @type {import('next').NextConfig} */
import path from "path";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  experimental: {
    optimizePackageImports: [],
  },

  // 🚫 Disable Turbopack (Webpack-only build)
  turbopack: false,

  webpack: (config) => {
    // Required fallbacks (xlsx, pdf, etc.)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // ✅ Absolute aliases (server-safe)
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
