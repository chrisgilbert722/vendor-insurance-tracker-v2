// pages/api/requirements-v2/rules/[id].js
import { sql } from "../../../../lib/db";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const rawId = req.query.id;
    const ruleId = Number(rawId);

    // 🔒 Guard: rule IDs are INTEGER only
    if (!Number.isInteger(ruleId)) {
      return res.status(200).json({
        ok: true,
        rule: null,
      });
    }

    const rows = await sql`
      SELECT *
      FROM requirements_rules_v2
      WHERE id = ${ruleId}
      LIMIT 1;
    `;

    return res.status(200).json({
      ok: true,
      rule: rows[0] || null,
    });
  } catch (err) {
    console.error("RULE DETAIL API ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
