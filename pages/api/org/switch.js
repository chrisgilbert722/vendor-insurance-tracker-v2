// pages/api/org/switch.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  const { orgId } = req.body || {};

  if (!orgId) {
    return res.status(400).json({ ok: false, error: "orgId required" });
  }

  // Manual cookie header – NO external dependency needed
  const cookie = `activeOrgId=${orgId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${
    60 * 60 * 24 * 365
  }${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;

  res.setHeader("Set-Cookie", cookie);

  return res.status(200).json({ ok: true });
}
