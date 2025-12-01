/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Disable static export mode
  output: 'standalone',

  // Ensures Next.js runs server functions normally
  experimental: {
    optimizePackageImports: false,
  },
};

export default nextConfig;
