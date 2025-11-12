/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Explicitly tell Next.js to use /pages directory
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],

  // ✅ Ensure correct runtime
  experimental: {
    runtime: 'nodejs',
  },

  // ✅ Disable appDir since we deleted /app
  appDir: false,
};

export default nextConfig;
