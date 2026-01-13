import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  experimental: {
    optimizePackageImports: [],
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // 🔒 SINGLE SOURCE OF TRUTH FOR IMPORTS
    config.resolve.alias = {
      ...config.resolve.alias,

      // DB
      "@db": path.resolve(process.cwd(), "lib/db.js"),

      // ORG / AUTH
      "@resolveOrg": path.resolve(
        process.cwd(),
        "lib/server/resolveOrg.js"
      ),
      "@/lib/getUserOrg": path.resolve(
        process.cwd(),
        "lib/getUserOrg.js"
      ),

      // SUPABASE
      "@/lib/supabaseClient": path.resolve(
        process.cwd(),
        "lib/supabaseClient.js"
      ),
      "@/lib/supabaseServer": path.resolve(
        process.cwd(),
        "lib/supabaseServer.js"
      ),

      // OPENAI
      "@/lib/openaiClient": path.resolve(
        process.cwd(),
        "lib/openaiClient.js"
      ),
    };

    return config;
  },
};

export default nextConfig;
