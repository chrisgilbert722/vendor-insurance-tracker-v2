// pages/api/documents/hub-summary.js
import { sql } from "../../../lib/db";
import { requireOrgId } from "../../../lib/requireOrg";

/* ------------------------------------------
   Normalize document types (SAFE)
------------------------------------------ */
function normalizeType(t) {
  const x = String(t || "").toLowerCase().trim();
  if (!x) return "other";
  if (x.includes("coi") || x.includes("insurance")) return "coi";
  if (x === "w9" || x.includes("w-9")) return "w9";
  if (x.includes("license")) return "license";
  if (x.includes("contract")) return "contract";
  if (x.includes("endorsement")) return "endorsement";
  if (x.includes("waiver")) return "waiver";
  if (x.includes("safety")) return "safety";
  return "other";
}

export default async function handler(req, res) {
  try {
    // 🔒 Resolve org (UUID → INT). Guard already responds if invalid.
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    /* ------------------------------------------
       Vendors (baseline)
    ------------------------------------------ */
    const vendors = await sql`
      SELECT id
      FROM vendors
      WHERE org_id = ${orgId};
    `;

    const vendorCount = Array.isArray(vendors) ? vendors.length : 0;

    /* ------------------------------------------
       New vendor_documents table
    ------------------------------------------ */
    let vdocs = [];
    try {
      vdocs = await sql`
        SELECT vendor_id, document_type, uploaded_at
        FROM vendor_documents
        WHERE org_id = ${orgId};
      `;
    } catch {
      vdocs = [];
    }

    /* ------------------------------------------
       Legacy documents table (optional)
    ------------------------------------------ */
    let legacy = [];
    try {
      legacy = await sql`
        SELECT vendor_id, type, created_at
        FROM documents
        WHERE org_id = ${orgId};
      `;
    } catch {
      legacy = [];
    }

    /* ------------------------------------------
       Normalize all documents
    ------------------------------------------ */
    const all = [];

    for (const d of Array.isArray(vdocs) ? vdocs : []) {
      all.push({
        vendor_id: d.vendor_id,
        type: normalizeType(d.document_type),
        at: d.uploaded_at,
      });
    }

    for (const d of Array.isArray(legacy) ? legacy : []) {
      all.push({
        vendor_id: d.vendor_id,
        type: normalizeType(d.type),
        at: d.created_at,
      });
    }

    /* ------------------------------------------
       Aggregate by document type
    ------------------------------------------ */
    const byType = {};

    for (const row of all) {
      const t = row.type || "other";

      if (!byType[t]) {
        byType[t] = {
          type: t,
          docCount: 0,
          vendorSet: new Set(),
          lastAt: null,
        };
      }

      byType[t].docCount += 1;

      if (row.vendor_id) {
        byType[t].vendorSet.add(row.vendor_id);
      }

      if (
        row.at &&
        (!byType[t].lastAt ||
          new Date(row.at) > new Date(byType[t].lastAt))
      ) {
        byType[t].lastAt = row.at;
      }
    }

    const types = Object.values(byType).map((x) => ({
      type: x.type,
      docCount: x.docCount,
      vendorCount: x.vendorSet.size,
      missingVendorCount: Math.max(0, vendorCount - x.vendorSet.size),
      lastUploadedAt: x.lastAt,
    }));

    /* ------------------------------------------
       Ensure all expected tiles exist
    ------------------------------------------ */
    const expected = [
      "coi",
      "w9",
      "license",
      "contract",
      "endorsement",
      "safety",
      "waiver",
      "other",
    ];

    const map = Object.fromEntries(types.map((t) => [t.type, t]));

    const final = expected.map(
      (k) =>
        map[k] || {
          type: k,
          docCount: 0,
          vendorCount: 0,
          missingVendorCount: vendorCount,
          lastUploadedAt: null,
        }
    );

    return res.status(200).json({
      ok: true,
      vendorCount,
      types: final,
    });
  } catch (err) {
    console.error("[hub-summary]", err);

    // 🔇 NEVER break UI
    return res.status(200).json({
      ok: true,
      vendorCount: 0,
      types: [],
    });
  }
}
