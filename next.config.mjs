/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  webpack(config) {
    console.log("✅ Including /src/app/api routes...");
    return config;
  },

  experimental: {
    serverActions: {}, // ✅ this replaces the old `appDir` key
  },
};

export default nextConfig;
