// pages/api/vendors/[id].js
import { Client } from "pg";

/**
 * Vendor API — Safe version
 * Prevents UI crashes by normalizing the vendor into the fields
 * your cinematic Vendor Profile expects.
 *
 * Works with both:
 *   /api/vendors/2              (numeric ID)
 *   /api/vendors/summit-roofing (slug fallback)
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { id } = req.query;

  // Prepare DB client
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
       CASE 1 — Numeric ID (REAL DATABASE MODE)
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

      if (vendor.org_id) {
        const orgResult = await client.query(
          `SELECT * FROM orgs WHERE id = $1 LIMIT 1`,
          [vendor.org_id]
        );
        organization = orgResult.rows[0] || null;
      }

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
    }

    /* ============================================================
       CASE 2 — Slug fallback (summit-roofing)
       This allows the UI to keep working during the transition.
       ============================================================ */
    else {
      return res.status(200).json({
        ok: true,
        vendor: {
          id: "summit-roofing",
          name: "Summit Roofing & Coatings",
          category: "Roofing / Exterior Work",
          location: "Denver, CO",
          contactEmail: "risk@summitroofing.example",
          complianceScore: 72,
          status: "At Risk",
          riskLevel: "High",
          alertsOpen: 3,
          criticalIssues: 1,
          lastUpdated: "2025-11-20T14:23:00Z",
          aiSummary:
            "Vendor is 72% compliant. GL limits are below blueprint, Workers Comp is missing for onsite crew, and the primary COI expires in 23 days.",
          coverage: [],
          endorsements: [],
          documents: [],
          rulesFired: [],
          requirementsSummary: { total: 0, passed: 0, failed: 0 },
          timeline: [],
        },
        organization: { id: "demo-org", name: "Demo Organization" },
        policies: [],
      });
    }

    /* ============================================================
       NORMALIZE vendor object so UI NEVER crashes
       (Cinematic Vendor Profile requires these fields)
       ============================================================ */

    vendor.contactEmail = vendor.email || vendor.contactEmail || "";
    vendor.category = vendor.category || "";
    vendor.location = vendor.address || "";
    vendor.resolved_name = vendor.name;

    // Convert policies → UI coverage shape (safe defaults)
    vendor.coverage = policies.map((p) => ({
      id: p.id,
      label: p.coverage_type || "Coverage",
      required: 0,
      actual: 0,
      unit: "limit",
      status: "Pass",
      severity: "Low",
      field: "",
      policy_number: p.policy_number,
      carrier: p.carrier,
      effective_date: p.effective_date,
      expiration_date: p.expiration_date,
    }));

    // Placeholders until requirements + rules are wired
    vendor.endorsements = vendor.endorsements || [];
    vendor.documents = vendor.documents || [];
    vendor.rulesFired = vendor.rulesFired || [];
    vendor.requirementsSummary =
      vendor.requirementsSummary || { total: 0, passed: 0, failed: 0 };
    vendor.timeline = vendor.timeline || [];

    return res.status(200).json({
      ok: true,
      vendor,
      organization,
      policies,
    });
  } catch (err) {
    console.error("Vendor API error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
