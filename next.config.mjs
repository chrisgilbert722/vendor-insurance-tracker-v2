import path from "path";

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
