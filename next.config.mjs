/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  output: "standalone",

  experimental: {
    optimizePackageImports: [],
  },

  // 🔑 Explicitly enable Turbopack (required in Next 16)
  turbopack: {},

  // 🔑 Required for client-side Excel (.xlsx) support
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
