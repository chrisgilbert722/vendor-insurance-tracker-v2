import { resolveAlertV2 } from "../../../lib/alertsV2Engine";
import { sql } from "../../../lib/db";
import { logTimelineEvent, TIMELINE_EVENTS } from "../../../lib/timeline";

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
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const orgId = cleanOrgId(req.body?.orgId);
    const id = req.body?.id;
    const alertId = req.body?.alertId || id; // Support both formats
    const resolvedBy = req.body?.resolvedBy || "user";
    const resolutionNote = req.body?.resolutionNote || "";

    if (!orgId) {
      return res.status(200).json({ ok: false, skipped: true, error: "Missing or invalid orgId" });
    }
    if (!id && !alertId) {
      return res.status(400).json({ ok: false, error: "Missing alert id" });
    }

    // Get vendor_id before resolving (for timeline)
    const [alert] = await sql`
      SELECT vendor_id, type FROM alerts_v2 WHERE id = ${alertId || id} LIMIT 1;
    `;

    await resolveAlertV2(alertId || id, orgId);

    // Log to timeline for audit trail
    if (alert?.vendor_id) {
      await logTimelineEvent({
        vendorId: alert.vendor_id,
        action: TIMELINE_EVENTS.ALERT_RESOLVED,
        message: `Alert resolved${resolvedBy === "system" ? " automatically" : ""}: ${alert.type || "unknown"}${resolutionNote ? ` - ${resolutionNote}` : ""}`,
        severity: "info",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[alerts-v2/resolve] error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
}
