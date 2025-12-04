// pages/api/vendor/fix-issue.js
import { sql } from "../../../lib/db";
import { logVendorActivity } from "../../../lib/vendorActivity";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { vendorId, orgId, code } = req.body;

    if (!vendorId || !orgId || !code) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId, orgId or code",
      });
    }

    /* ============================================================
       1) Log vendor fix action
    ============================================================ */
    await logVendorActivity(
      vendorId,
      "fix_issue",
      `Vendor marked issue resolved: ${code}`,
      "info"
    );

    /* ============================================================
       2) Remove alert from vendor_alerts
    ============================================================ */
    await sql`
      DELETE FROM vendor_alerts
      WHERE vendor_id = ${vendorId} AND code = ${code};
    `;

    /* ============================================================
       3) Reload remaining alerts
    ============================================================ */
    const remaining = await sql`
      SELECT severity FROM vendor_alerts
      WHERE vendor_id = ${vendorId};
    `;

    let newStatus = "compliant";

    const hasCritical = remaining.some((a) => a.severity === "critical");
    const hasMedium = remaining.some((a) => a.severity === "medium");
    const hasHigh = remaining.some((a) => a.severity === "high");

    if (hasCritical) newStatus = "non_compliant";
    else if (hasHigh || hasMedium) newStatus = "pending";

    /* ============================================================
       4) Update vendor status
    ============================================================ */
    await sql`
      UPDATE vendors
      SET compliance_status = ${newStatus}, updated_at = NOW()
      WHERE id = ${vendorId};
    `;

    /* ============================================================
       5) Log status change
    ============================================================ */
    await logVendorActivity(
      vendorId,
      "status_update",
      `Vendor status updated to ${newStatus}`,
      newStatus === "compliant" ? "info" : "warning"
    );

    return res.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error("[fix-issue] ERROR:", err);

    try {
      await logVendorActivity(
        null,
        "error",
        `fix-issue failed: ${err.message}`,
        "critical"
      );
    } catch (_) {}

    return res.status(500).json({ ok: false, error: err.message });
  }
}
