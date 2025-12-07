// pages/api/renewals/status.js
// ==========================================================
// RENEWAL INTELLIGENCE V3 — STEP 1
// Renewal Status Engine — returns expiration + risk + SLA stage
// ==========================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const orgId = req.query.orgId || 1;

    // 1️⃣ Fetch all vendors + their latest policy expiration date
    const vendors = await sql`
      SELECT
        v.id,
        v.vendor_name,
        v.org_id,
        v.last_uploaded_coi,
        v.last_uploaded_at,
        p.expiration_date,
        p.effective_date,
        p.policy_number,
        p.carrier
      FROM vendors v
      LEFT JOIN policies p ON p.vendor_id = v.id
      WHERE v.org_id = ${orgId}
      ORDER BY v.vendor_name ASC;
    `;

    const now = new Date();

    const enriched = vendors.map((v) => {
      let daysToExpire = null;
      let status = "unknown";
      let riskScore = 50; // baseline
      let slaStage = null;

      if (v.expiration_date) {
        const [mm, dd, yyyy] = v.expiration_date.split("/");
        const expDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        const diffMs = expDate - now;
        daysToExpire = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      // 2️⃣ Classify SLA stage based on daysToExpire
      if (daysToExpire === null) {
        status = "no_data";
        slaStage = "missing";
        riskScore += 25;
      } else if (daysToExpire < 0) {
        status = "expired";
        slaStage = "expired";
        riskScore += 50;
      } else if (daysToExpire <= 3) {
        status = "critical";
        slaStage = "3_day";
        riskScore += 40;
      } else if (daysToExpire <= 7) {
        status = "high";
        slaStage = "7_day";
        riskScore += 30;
      } else if (daysToExpire <= 30) {
        status = "medium";
        slaStage = "30_day";
        riskScore += 15;
      } else if (daysToExpire <= 90) {
        status = "low";
        slaStage = "90_day";
        riskScore += 5;
      } else {
        status = "healthy";
        slaStage = "healthy";
      }

      // 3️⃣ Determine reliability score based on past uploads
      let reliability = 50;

      if (v.last_uploaded_at) {
        const lastUploadDate = new Date(v.last_uploaded_at);
        const daysSinceUpload = Math.floor(
          (now - lastUploadDate) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceUpload < 300) reliability += 20;
        if (daysSinceUpload < 150) reliability += 20;
        if (daysSinceUpload < 60) reliability += 10;
      }

      reliability = Math.min(100, reliability);

      return {
        vendorId: v.id,
        vendorName: v.vendor_name,
        orgId: v.org_id,
        expirationDate: v.expiration_date || null,
        daysToExpire,
        status,
        slaStage,
        riskScore,
        reliability,
        policyNumber: v.policy_number || null,
        carrier: v.carrier || null,
        lastCOI: v.last_uploaded_coi || null,
        lastCOIUploadedAt: v.last_uploaded_at || null,
      };
    });

    return res.status(200).json({
      ok: true,
      vendors: enriched,
    });
  } catch (err) {
    console.error("[RENEWAL STATUS ENGINE ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
