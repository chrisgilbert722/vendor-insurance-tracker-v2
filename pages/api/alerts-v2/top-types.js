import { getTopAlertTypesV2 } from "../../../lib/alertsV2Engine";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanOrgId(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return UUID_RE.test(s) ? s : null;
}

function parseVendorId(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  if (/^\d+$/.test(s)) return Number(s);
  return s;
}


export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const orgId = cleanOrgId(req.query.orgId);
    if (!orgId) {
      return res.status(200).json({ ok: false, skipped: true, items: [] });
    }
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 8)));
    const items = await getTopAlertTypesV2(orgId, limit);
    return res.status(200).json({ ok: true, items });
  } catch (err) {
    console.error("[alerts-v2/top-types] error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
}
