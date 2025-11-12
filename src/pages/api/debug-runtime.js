export default async function handler(req, res) {
  try {
    const runtime =
      process.env.NEXT_RUNTIME ||
      process.env.VERCEL_REGION ||
      "unknown";

    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;

    return res.status(200).json({
      ok: true,
      message: "✅ Server runtime info retrieved successfully",
      environment: {
        runtime,
        nodeVersion,
        platform,
        arch,
      },
      tips: [
        "If runtime = 'edge', this will cause DOMMatrix or window errors.",
        "If runtime = 'nodejs' or includes 'linux', you are good.",
      ],
    });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Unknown runtime error" });
  }
}
