// pages/api/alerts-v2/timeline.js
import { getAlertTimelineV2 } from "../../../lib/alertsV2Engine";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanOrgId(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return UUID_RE.test(s) ? s : null;
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

    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
    const items = await getAlertTimelineV2(orgId, days);

    return res.status(200).json({ ok: true, items });
  } catch (err) {
    console.error("[alerts-v2/timeline] error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal error",
    });
  }
}
