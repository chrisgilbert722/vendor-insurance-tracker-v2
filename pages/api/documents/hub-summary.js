// pages/api/documents/hub-summary.js
import { sql } from "../../../lib/db";

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
  return x;
}

export default async function handler(req, res) {
  try {
    const { orgId } = req.query;
    if (!orgId) return res.status(400).json({ ok: false, error: "Missing orgId" });

    // Pull vendors (baseline)
    const vendors = await sql`
      SELECT id
      FROM vendors
      WHERE org_id = ${Number(orgId)};
    `;
    const vendorCount = vendors.length;

    // Pull docs from BOTH tables safely:
    // 1) vendor_documents (new system)
    const vdocs = await sql`
      SELECT vendor_id, document_type, uploaded_at
      FROM vendor_documents
      WHERE org_id = ${Number(orgId)};
    `;

    // 2) documents (legacy table used by vendor profile)
    const legacy = await sql`
      SELECT vendor_id, type, created_at
      FROM documents
      WHERE org_id = ${Number(orgId)};
    `.catch(() => []); // don't break if table doesn't have org_id

    const all = [];

    for (const d of vdocs) {
      all.push({
        vendor_id: d.vendor_id,
        type: normalizeType(d.document_type),
        at: d.uploaded_at,
        source: "vendor_documents",
      });
    }

    for (const d of legacy || []) {
      all.push({
        vendor_id: d.vendor_id,
        type: normalizeType(d.type),
        at: d.created_at,
        source: "documents",
      });
    }

    // Aggregate by type
    const byType = {};
    for (const row of all) {
      const t = row.type || "other";
      if (!byType[t]) byType[t] = { type: t, docCount: 0, vendorSet: new Set(), lastAt: null };
      byType[t].docCount += 1;
      if (row.vendor_id) byType[t].vendorSet.add(row.vendor_id);
      if (row.at && (!byType[t].lastAt || new Date(row.at) > new Date(byType[t].lastAt))) {
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

    // Ensure all “expected” tiles exist even if 0 docs
    const expected = ["coi","w9","license","contract","endorsement","safety","waiver","other"];
    const map = Object.fromEntries(types.map((t) => [t.type, t]));
    const final = expected.map((k) => map[k] || ({
      type: k,
      docCount: 0,
      vendorCount: 0,
      missingVendorCount: vendorCount,
      lastUploadedAt: null,
    }));

    return res.json({
      ok: true,
      vendorCount,
      types: final,
    });
  } catch (err) {
    console.error("[hub-summary] error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
}
