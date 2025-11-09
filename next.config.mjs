/** @type {import('next').NextConfig} */
import path from "path";
import fs from "fs";

const nextConfig = {
  output: "standalone",

  webpack(config) {
    console.log("🔍 Scanning /src/app/api manually...");
    const apiPath = path.join(process.cwd(), "src/app/api");
    if (fs.existsSync(apiPath)) {
      const dirs = fs.readdirSync(apiPath);
      console.log("✅ Found API subfolders:", dirs);
    } else {
      console.log("⚠️ No src/app/api directory found!");
    }
    return config;
  },

  // Ensure Next.js crawls all route folders
  experimental: {
    serverActions: true,
  },

  // Fix route resolution
  outputFileTracingRoot: path.join(process.cwd(), "src"),

  // Map /api/* to /src/app/api/*
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


