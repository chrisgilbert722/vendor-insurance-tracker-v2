// pages/api/admin/rules-v3/groups.js
import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { orgId } = req.query;
      if (!orgId) {
        return res.status(400).json({ ok: false, error: "Missing orgId" });
      }

      const groups = await sql`
        SELECT id, org_id, label, description, severity, active, created_at
        FROM rule_groups
        WHERE org_id = ${orgId}
        ORDER BY created_at DESC;
      `;

      return res.status(200).json({ ok: true, groups });
    }

    if (req.method === "POST") {
      const { orgId, label, description, severity } = req.body;

      if (!orgId || !label) {
        return res.status(400).json({
          ok: false,
          error: "orgId and label are required.",
        });
      }

      const severitySafe = severity || "medium";

      const rows = await sql`
        INSERT INTO rule_groups (org_id, label, description, severity, active)
        VALUES (${orgId}, ${label}, ${description || ""}, ${severitySafe}, TRUE)
        RETURNING id, org_id, label, description, severity, active, created_at;
      `;

      return res.status(200).json({ ok: true, group: rows[0] });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("[rules-v3/groups] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
