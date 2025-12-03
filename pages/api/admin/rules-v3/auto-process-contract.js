// pages/api/admin/rules-v3/auto-process-contract.js
//
// FULL CONTRACT AUTOMATION + ADMIN NOTIFICATIONS
// 1. Load contract doc
// 2. Infer rules from contract
// 3. Run rule engine
// 4. Log timeline entry for vendor
// 5. (Optional) Email admin alert
//

import { sql } from "../../../../lib/db";

// Reuse inference engine (same server)
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

    /* --------------------------------------------------------
       1) Load contract document
    -------------------------------------------------------- */
    const docs = await sql`
      SELECT id, vendor_id, org_id, doc_type, filename
      FROM vendor_documents
      WHERE id = ${documentId}
      LIMIT 1;
    `;

    if (!docs.length) {
      return res
        .status(404)
        .json({ ok: false, error: "Document not found" });
    }

    const doc = docs[0];

    if (doc.doc_type !== "contract") {
      return res.status(400).json({
        ok: false,
        error: `Document ${documentId} is not a contract.`,
      });
    }

    const vendorId = doc.vendor_id;
    const orgId = doc.org_id;

    /* --------------------------------------------------------
       2) STEP A — Infer rules from contract
    -------------------------------------------------------- */
    const inferRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/rules-v3/infer-from-contract`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          orgId,
          groupLabel: `Auto-Inferred Rules from ${doc.filename}`,
        }),
      }
    ).then((r) => r.json());

    if (!inferRes.ok) {
      await logTimeline(
        vendorId,
        "contract_inference_failed",
        `Contract rule inference failed for ${doc.filename}.`,
        "critical"
      );

      return res.status(500).json({
        ok: false,
        error: "Rule inference failed.",
        inferRes,
      });
    }

    /* --------------------------------------------------------
       3) STEP B — Run Rule Engine V3
    -------------------------------------------------------- */
    const engineRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/engine/run-v3`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          orgId,
        }),
      }
    ).then((r) => r.json());

    if (!engineRes.ok) {
      await logTimeline(
        vendorId,
        "rule_engine_failed",
        `Rule Engine V3 failed after contract inference.`,
        "critical"
      );

      return res.status(500).json({
        ok: false,
        error: "Rule engine run failed.",
        engineRes,
      });
    }

    /* --------------------------------------------------------
       4) TIMELINE — Notify admins of event
    -------------------------------------------------------- */
    await logTimeline(
      vendorId,
      "contract_rules_inferred",
      `Contract '${doc.filename}' processed automatically. ${inferRes.rulesCreated} rules created; compliance re-evaluated.`,
      "info"
    );

    /* --------------------------------------------------------
       5) OPTIONAL — Email org admins
          (Add your own notification logic here)
    -------------------------------------------------------- */
    // await notifyAdmins({
    //   orgId,
    //   vendorId,
    //   subject: "Contract Rules Inferred Automatically",
    //   message: `Contract '${doc.filename}' created ${inferRes.rulesCreated} rules and re-ran compliance checks.`
    // });

    /* --------------------------------------------------------
       RETURN
    -------------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      message: "Contract fully processed (rules inferred + engine run).",
      group: inferRes.group,
      rulesCreated: inferRes.rulesCreated,
      vendorId,
      engineResults: engineRes,
    });
  } catch (err) {
    console.error("[AUTO PROCESS CONTRACT ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Auto contract processing failed.",
    });
  }
}

/* --------------------------------------------------------
   HELPERS
-------------------------------------------------------- */

async function logTimeline(vendorId, action, message, severity = "info") {
  try {
    await sql`
      INSERT INTO vendor_timeline (vendor_id, action, message, severity)
      VALUES (${vendorId}, ${action}, ${message}, ${severity});
    `;
  } catch (err) {
    console.error("[TIMELINE LOGGING ERROR]", err);
  }
}
