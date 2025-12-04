// pages/api/coverage/intel/apply.js
// ==========================================================
// SMART MERGE: APPLY AI RULEPLAN → V5 ENGINE
// - Reuses existing groups by name (per org)
// - Skips duplicate rules
// - Creates only what's missing
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

  const { orgId, rulePlan } = req.body || {};

  if (!orgId) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing orgId for apply-to-V5." });
  }

  if (!rulePlan || !Array.isArray(rulePlan.groups)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid rulePlan; expected { groups: [...] }.",
    });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  let createdGroups = 0;
  let reusedGroups = 0;
  let createdRules = 0;
  let skippedDuplicates = 0;

  try {
    await client.connect();

    // Loop through each AI-generated group
    for (const group of rulePlan.groups) {
      const groupName = (group.name || "Untitled Group").trim();

      // SMART MERGE — try to find existing group by name first
      const existingGroupRes = await client.query(
        `
        SELECT id
        FROM requirements_groups_v2
        WHERE org_id = $1
          AND name = $2
        LIMIT 1;
        `,
        [orgId, groupName]
      );

      let groupId;
      if (existingGroupRes.rows.length > 0) {
        // Reuse existing group
        groupId = existingGroupRes.rows[0].id;
        reusedGroups++;
      } else {
        // Create new group
        const insertGroupRes = await client.query(
          `
          INSERT INTO requirements_groups_v2
            (org_id, name, description, is_active, order_index)
          VALUES ($1, $2, $3, TRUE, 0)
          RETURNING id;
          `,
          [orgId, groupName, group.description || null]
        );
        groupId = insertGroupRes.rows[0].id;
        createdGroups++;
      }

      // Now handle rules for this group
      for (const rule of group.rules || []) {
        const field_key = rule.field_key || null;
        const operator = rule.operator || "equals";
        const expected_value =
          rule.expected_value !== undefined ? rule.expected_value : null;
        const severity = rule.severity || "medium";
        const requirement_text = rule.requirement_text || "";

        // SMART MERGE — check for existing duplicate rule
        const dupCheckRes = await client.query(
          `
          SELECT id
          FROM requirements_rules_v2
          WHERE group_id = $1
            AND field_key = $2
            AND operator = $3
            AND CAST(expected_value AS TEXT) = CAST($4 AS TEXT)
            AND COALESCE(requirement_text, '') = COALESCE($5, '')
          LIMIT 1;
          `,
          [groupId, field_key, operator, expected_value, requirement_text]
        );

        if (dupCheckRes.rows.length > 0) {
          // Duplicate rule - skip
          skippedDuplicates++;
          continue;
        }

        // Insert new rule
        await client.query(
          `
          INSERT INTO requirements_rules_v2
            (group_id, field_key, operator, expected_value, severity, requirement_text, internal_note, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, NULL, TRUE);
          `,
          [groupId, field_key, operator, expected_value, severity, requirement_text]
        );

        createdRules++;
      }
    }

    return res.status(200).json({
      ok: true,
      message: "Smart-merge apply completed.",
      createdGroups,
      reusedGroups,
      createdRules,
      skippedDuplicates,
    });
  } catch (err) {
    console.error("SMART MERGE APPLY ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to apply rulePlan.",
    });
  } finally {
    try {
      await client.end();
    } catch (e) {
      // ignore
    }
  }
}
