// pages/api/coverage/intel/apply.js
// ==========================================================
// APPLY AI RULEPLAN → V5 ENGINE
// Creates: Groups + Rules in requirements_v2 tables
// ==========================================================

import { Client } from "pg";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Only POST supported for Apply API." });
  }

  const { orgId, rulePlan } = req.body;

  if (!orgId) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing orgId for apply-to-V5." });
  }

  if (!rulePlan || !rulePlan.groups || !Array.isArray(rulePlan.groups)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid rulePlan; expected { groups: [...] }.",
    });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  let createdGroups = 0;
  let createdRules = 0;

  try {
    await client.connect();

    // Loop through each AI-generated group
    for (const group of rulePlan.groups) {
      const groupName = group.name || "Untitled Group";

      // Create group
      const groupRes = await client.query(
        `
        INSERT INTO requirements_groups_v2
          (org_id, name, description, is_active, order_index)
        VALUES ($1, $2, $3, TRUE, 0)
        RETURNING id;
        `,
        [orgId, groupName, group.description || null]
      );

      createdGroups++;
      const groupId = groupRes.rows[0].id;

      // Create rules inside this group
      for (const rule of group.rules || []) {
        await client.query(
          `
          INSERT INTO requirements_rules_v2
            (group_id, field_key, operator, expected_value, severity, requirement_text, internal_note, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, NULL, TRUE);
          `,
          [
            groupId,
            rule.field_key,
            rule.operator,
            rule.expected_value,
            rule.severity || "medium",
            rule.requirement_text || "",
          ]
        );

        createdRules++;
      }
    }

    return res.status(200).json({
      ok: true,
      message: "Successfully applied rulePlan to V5.",
      createdGroups,
      createdRules,
    });
  } catch (err) {
    console.error("APPLY V5 ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to apply rulePlan.",
    });
  } finally {
    await client.end().catch(() => {});
  }
}
