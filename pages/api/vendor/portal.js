// pages/api/vendor/portal.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    // Look up vendor by magic-link token
    const vendorRows = await sql`
      SELECT
        v.id,
        v.name,
        v.email,
        v.org_id,
        o.name AS org_name
      FROM vendors v
      JOIN organizations o ON o.id = v.org_id
      WHERE v.magic_link_token = ${token}
      LIMIT 1;
    `;

    if (vendorRows.length === 0) {
      return res.status(404).json({ ok: false, error: "Invalid vendor link" });
    }

    const v = vendorRows[0];

    // TODO: replace with real requirements table
    const requirements = {
      coverages: [
        { name: "General Liability", limit: "$1M / $2M" },
        { name: "Auto Liability", limit: "$1M CSL" },
        { name: "Workers' Comp", limit: "Statutory" },
      ],
    };

    // TODO: replace with real compliance engine status
    const status = {
      state: "pending", // "compliant" | "pending" | "non-compliant"
      label: "Pending COI Upload",
      description:
        "We have not received a current COI for this vendor. Please upload your latest certificate.",
    };

    // TODO: hook into alerts_v2 to show real vendor alerts
    const alerts = [];

    return res.status(200).json({
      ok: true,
      vendor: {
        id: v.id,
        name: v.name,
        email: v.email,
      },
      org: {
        id: v.org_id,
        name: v.org_name,
      },
      requirements,
      status,
      alerts,
    });
  } catch (err) {
    console.error("[vendor/portal] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
