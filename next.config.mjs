/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // ✅ Enables appDir for Next 14+ correctly
  experimental: {
    appDir: true,
  },

  // ✅ Ensure both app and pages routes are scanned
  webpack(config) {
    console.log("✅ Including /src/app/api routes...");
    return config;
  },
};

export default nextConfig;

