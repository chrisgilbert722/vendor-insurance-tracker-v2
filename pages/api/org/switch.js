// pages/api/org/switch.js
import { serialize } from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  const { orgId } = req.body || {};

  if (!orgId) {
    return res.status(400).json({ ok: false, error: "orgId required" });
  }

  const cookie = serialize("activeOrgId", String(orgId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "strict",
    path: "/",
  });

  res.setHeader("Set-Cookie", cookie);

  return res.status(200).json({ ok: true });
}
