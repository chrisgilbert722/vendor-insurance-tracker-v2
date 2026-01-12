// pages/api/vendors/[id].js
import { Client } from "pg";
import { sql } from "@db";

/**
 * Vendor API — Contract-Aware Edition (UUID SAFE)
 * - Vendor ID remains numeric
 * - Org resolved via resolveOrg (UUID → INT)
 * - Prevents UUID/int mismatch crashes
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

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 🔑 Resolve org FIRST (UUID → internal INT)
    const orgId = await resolveOrg(req, res);

    if (!orgId) {
      return res.status(200).json({
        ok: true,
        vendor: null,
        organization: null,
        policies: [],
      });
    }

    const vendorId = Number(id);
    if (!Number.isInteger(vendorId)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid vendor id",
      });
    }

    await client.connect();

    /* ============================================================
       LOAD VENDOR (SCOPED TO ORG)
    ============================================================ */
    const vendorResult = await client.query(
      `
      SELECT *
      FROM vendors
      WHERE id = $1
        AND org_id = $2
      LIMIT 1
      `,
      [vendorId, orgId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found",
      });
    }

    const vendor = vendorResult.rows[0];

    /* ============================================================
       LOAD ORGANIZATION
    ============================================================ */
    const orgResult = await client.query(
      `SELECT * FROM organizations WHERE id = $1 LIMIT 1`,
      [orgId]
    );

    const organization = orgResult.rows[0] || null;

    /* ============================================================
       LOAD POLICIES
    ============================================================ */
    const policiesResult = await client.query(
      `
      SELECT *
      FROM policies
      WHERE vendor_id = $1
      ORDER BY created_at DESC
      `,
      [vendorId]
    );

    const policies = policiesResult.rows;

    /* ============================================================
       CONTRACT + REQUIREMENTS NORMALIZATION
    ============================================================ */
    vendor.contract_json = vendor.contract_json || null;
    vendor.contract_score = vendor.contract_score || null;
    vendor.contract_status = vendor.contract_status || "unknown";
    vendor.contract_mismatches = vendor.contract_mismatches || [];
    vendor.contract_requirements = vendor.contract_requirements || [];
    vendor.contract_issues_json = vendor.contract_issues_json || [];

    const coverageReqs = vendor.requirements_json || [];

    vendor.requirements_json = [
      ...(Array.isArray(coverageReqs) ? coverageReqs : []),
      ...vendor.contract_requirements.map((r) => ({
        name: r.label,
        limit: r.value,
        source: "contract",
      })),
    ];

    /* ============================================================
       SAFE NORMALIZATION
    ============================================================ */
    vendor.contactEmail = vendor.email || "";
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
