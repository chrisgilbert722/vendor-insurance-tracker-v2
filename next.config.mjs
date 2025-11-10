/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  webpack(config) {
    console.log("✅ Building Vendor Insurance Tracker v2...");
    return config;
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "/src/app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
