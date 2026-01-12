// pages/api/requirements-v2/rules/[id].js
import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // 🔒 Resolve org FIRST (external UUID → internal int)
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    // 🔢 Rule ID must be INTEGER
    const rawId = req.query.id;
    const ruleId = Number(rawId);

    if (!Number.isInteger(ruleId)) {
      return res.status(200).json({
        ok: true,
        rule: null,
      });
    }

    // 🔐 Org-scoped rule lookup (prevents cross-org leaks)
    const rows = await sql`
      SELECT *
      FROM requirements_rules_v2
      WHERE id = ${ruleId}
        AND org_id = ${orgId}
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
