// pages/api/org/switch.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  const { orgId } = req.body || {};

  if (!orgId) {
    return res.status(400).json({ ok: false, error: "orgId required" });
  }

  // 🚀 DO NOT SET ANY COOKIES ANYMORE.
  // We rely 100% on OrgContext using the correct org from the DB.
  // Remove the corrupted cookie behavior permanently.

  return res.status(200).json({ ok: true, orgId });
}
