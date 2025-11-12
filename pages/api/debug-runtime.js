// src/pages/api/debug-runtime.js
export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    message: "✅ Node runtime active",
    runtime: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  });
}
