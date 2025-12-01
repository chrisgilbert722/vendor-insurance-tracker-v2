/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🔥 IMPORTANT: Force Next.js to run in server mode,
  // not static export. This is what enables /onboarding to actually exist.
  output: "standalone",

  // Optional but recommended for dynamic apps
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
