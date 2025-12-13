// pages/api/alerts/resolve.js
// ============================================================
// ALERTS V2 — RESOLVE / ACKNOWLEDGE ENDPOINT (SAFE + AUDITABLE)
// - Marks alert as resolved (resolved_at)
// - Stores resolution details inside metadata (no schema change required)
// - Requires orgId + alertId
// - Idempotent: resolving an already-resolved alert returns current state
// ============================================================

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "256kb" },
  },
};

function safeString(v, max = 4000) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeResolutionType(t) {
  const v = String(t || "").toLowerCase().trim();
  if (v === "resolve" || v === "resolved") return "resolved";
  if (v === "ack" || v === "acknowledge" || v === "acknowledged")
    return "acknowledged";
  if (v === "auto" || v === "auto_resolved") return "auto_resolved";
  return "resolved";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const {
      orgId,
      alertId,
      resolutionType,
      note,
      resolvedBy, // optional: user id/email/name (whatever you have)
    } = req.body || {};

    const org_id = Number(orgId);
    const alert_id = Number(alertId);

    if (!Number.isFinite(org_id) || org_id <= 0) {
      return res.status(400).json({ ok: false, error: "Missing/invalid orgId" });
    }
    if (!Number.isFinite(alert_id) || alert_id <= 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing/invalid alertId" });
    }

    const type = normalizeResolutionType(resolutionType);
    const resolution_note = safeString(note, 4000);
    const resolved_by = safeString(resolvedBy, 320);

    // 1) Read current alert (scoped to org)
    const existingRows = await sql`
      SELECT id, org_id, vendor_id, type, severity, category, message, rule_id, metadata, resolved_at
      FROM alerts_v2
      WHERE id = ${alert_id}
        AND org_id = ${org_id}
      LIMIT 1;
    `;

    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ ok: false, error: "Alert not found" });
    }

    const existing = existingRows[0];

    // 2) Idempotent: if already resolved, return it (no changes)
    if (existing.resolved_at) {
      return res.json({ ok: true, alert: existing, alreadyResolved: true });
    }

    // 3) Resolve + write audit fields into metadata (no schema change required)
    // metadata.resolution = { type, note, by, at }
    const updatedRows = await sql`
      UPDATE alerts_v2
      SET
        resolved_at = NOW(),
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{resolution}',
          jsonb_build_object(
            'type', ${type},
            'note', ${resolution_note},
            'by', ${resolved_by},
            'at', NOW()
          ),
          true
        )
      WHERE id = ${alert_id}
        AND org_id = ${org_id}
        AND resolved_at IS NULL
      RETURNING id, org_id, vendor_id, type, severity, category, message, rule_id, metadata, resolved_at;
    `;

    // If 0 rows updated due to race condition, re-read and return.
    if (!updatedRows || updatedRows.length === 0) {
      const reread = await sql`
        SELECT id, org_id, vendor_id, type, severity, category, message, rule_id, metadata, resolved_at
        FROM alerts_v2
        WHERE id = ${alert_id}
          AND org_id = ${org_id}
        LIMIT 1;
      `;
      return res.json({ ok: true, alert: reread?.[0] || existing, raced: true });
    }

    return res.json({ ok: true, alert: updatedRows[0] });
  } catch (err) {
    console.error("alerts/resolve error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
