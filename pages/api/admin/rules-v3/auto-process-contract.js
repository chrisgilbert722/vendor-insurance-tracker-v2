// pages/api/admin/rules-v3/auto-process-contract.js
//
// FULL CONTRACT AUTOMATION:
// 1. Load contract doc
// 2. Infer rules
// 3. Run rule engine V3
// 4. Return results
//

import { sql } from "../../../../lib/db";
import { openai } from "../../../../lib/openaiClient";

// Reuse the inference logic
import handlerInfer from "./infer-from-contract";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({ ok: false, error: "Missing documentId" });
    }

    // 1) Load the document to get vendor + org
    const docs = await sql`
      SELECT id, vendor_id, org_id, doc_type
      FROM vendor_documents
      WHERE id = ${documentId}
      LIMIT 1;
    `;

    if (!docs.length) {
      return res.status(404).json({ ok: false, error: "Document not found" });
    }

    const doc = docs[0];

    if (doc.doc_type !== "contract") {
      return res.status(400).json({
        ok: false,
        error: `Document ${documentId} is not a contract.`,
      });
    }

    // 2) STEP A — Infer Rules (calls the real inference engine)
    const inferRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/rules-v3/infer-from-contract`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          orgId: doc.org_id,
          groupLabel: `Auto Contract Rules - Doc ${documentId}`,
        }),
      }
    ).then((r) => r.json());

    if (!inferRes.ok) {
      return res.status(500).json({
        ok: false,
        error: "Rule inference failed.",
        inferRes,
      });
    }

    // 3) STEP B — Run Rule Engine V3 for vendor
    const engineRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/engine/run-v3`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: doc.vendor_id,
          orgId: doc.org_id,
        }),
      }
    ).then((r) => r.json());

    if (!engineRes.ok) {
      return res.status(500).json({
        ok: false,
        error: "Rule engine run failed.",
        engineRes,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Contract inference + rule engine completed.",
      group: inferRes.group,
      rulesCreated: inferRes.rulesCreated,
      vendorId: doc.vendor_id,
      engine: engineRes,
    });
  } catch (err) {
    console.error("[AUTO PROCESS CONTRACT ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Auto contract processing failed.",
    });
  }
}
