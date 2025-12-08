// pages/api/vendors/[id].js
import { Client } from "pg";

/**
 * Vendor API — Contract-Aware Edition
 * Adds:
 *   • contract_json
 *   • contract_score
 *   • contract_status
 *   • contract_requirements (array)
 *   • contract_mismatches (array)
 *   • requirements_json (merged coverage + contract reqs)
 *   • contract_issues_json
 *
 * Safe for Fix Cockpit + Contract Review UI
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { id } = req.query;

  const connectionString =
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  const client = new Client({ connectionString });

  try {
    await client.connect();

    let vendor = null;
    let organization = null;
    let policies = [];

    const numericId = Number(id);

    /* ============================================================
       CASE 1 — Numeric Vendor ID
    ============================================================ */
    if (!Number.isNaN(numericId) && numericId > 0) {
      const vendorResult = await client.query(
        `SELECT * FROM vendors WHERE id = $1 LIMIT 1`,
        [numericId]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Vendor not found" });
      }

      vendor = vendorResult.rows[0];

      /* -------------------------------------------
         Load organization
      ------------------------------------------- */
      if (vendor.org_id) {
        const orgResult = await client.query(
          `SELECT * FROM orgs WHERE id = $1 LIMIT 1`,
          [vendor.org_id]
        );
        organization = orgResult.rows[0] || null;
      }

      /* -------------------------------------------
         Load policies
      ------------------------------------------- */
      const policiesResult = await client.query(
        `
        SELECT *
        FROM policies
        WHERE vendor_id = $1
        ORDER BY created_at DESC
        `,
        [numericId]
      );

      policies = policiesResult.rows;

      /* -------------------------------------------
         Load Contract Intelligence V3 Fields
      ------------------------------------------- */
      vendor.contract_json = vendor.contract_json || null;
      vendor.contract_score = vendor.contract_score || null;
      vendor.contract_status = vendor.contract_status || "unknown";
      vendor.contract_mismatches = vendor.contract_mismatches || [];
      vendor.contract_requirements = vendor.contract_requirements || [];
      vendor.contract_issues_json = vendor.contract_issues_json || [];

      /* -------------------------------------------
         requirements_json for Fix Cockpit
         Merge coverage + contract requirements
      ------------------------------------------- */
      const coverageReqs = vendor.requirements_json || [];

      vendor.requirements_json = [
        ...(Array.isArray(coverageReqs) ? coverageReqs : []),
        ...vendor.contract_requirements.map((r) => ({
          name: r.label,
          limit: r.value,
          source: "contract",
        })),
      ];
    }

    /* ============================================================
       CASE 2 — Slug fallback (demo mode)
    ============================================================ */
    else {
      return res.status(200).json({
        ok: true,
        vendor: {
          id: "demo-vendor",
          name: "Demo Vendor",
          contract_json: null,
          contract_score: null,
          contract_requirements: [],
          contract_mismatches: [],
          contract_status: "unknown",
          requirements_json: [],
        },
        organization: { id: "demo-org", name: "Demo Organization" },
        policies: [],
      });
    }

    /* ============================================================
       SAFE NORMALIZATION
    ============================================================ */
    vendor.contactEmail = vendor.email || vendor.contactEmail || "";
    vendor.resolved_name = vendor.name;

    vendor.documents = vendor.documents || [];
    vendor.timeline = vendor.timeline || [];
    vendor.endorsements = vendor.endorsements || [];
    vendor.rulesFired = vendor.rulesFired || [];

    return res.status(200).json({
      ok: true,
      vendor,
      organization,
      policies,
    });
  } catch (err) {
    console.error("[Vendor API error]:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
