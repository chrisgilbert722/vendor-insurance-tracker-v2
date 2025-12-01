/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  output: "standalone",

  // Must be an array or removed completely.
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
