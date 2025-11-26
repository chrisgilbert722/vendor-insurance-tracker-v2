// pages/api/requirements-v2/save.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const { group, rule, type } = req.body;

    if (!type) {
      return res.status(400).json({ ok: false, error: "Missing save type" });
    }

    /* ====================================
       1️⃣ SAVE GROUP (create or update)
    ===================================== */
    if (type === "group") {
      if (!group?.name || !group?.org_id) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing group name or org_id" });
      }

      // UPDATE EXISTING
      if (group.id) {
        const result = await client.query(
          `
          UPDATE requirement_groups
          SET name = $1,
              description = $2,
              icon = $3,
              order_index = $4
          WHERE id = $5
          RETURNING *;
        `,
          [
            group.name,
            group.description || "",
            group.icon || "⚙️",
            group.order_index || 0,
            group.id,
          ]
        );

        return res.status(200).json({ ok: true, group: result.rows[0] });
      }

      // CREATE NEW
      const insert = await client.query(
        `
        INSERT INTO requirement_groups (org_id, name, description, icon)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `,
        [
          group.org_id,
          group.name,
          group.description || "",
          group.icon || "⚙️",
        ]
      );

      return res.status(200).json({ ok: true, group: insert.rows[0] });
    }

    /* ====================================
       2️⃣ SAVE RULE (create or update)
    ===================================== */
    if (type === "rule") {
      if (!rule?.group_id) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing rule group_id" });
      }

      // UPDATE EXISTING RULE
      if (rule.id) {
        const update = await client.query(
          `
          UPDATE requirements
          SET coverage_type = $1,
              min_limit_each_occurrence = $2,
              min_limit_aggregate = $3,
              require_additional_insured = $4,
              require_waiver = $5,
              min_risk_score = $6,
              notes = $7,
              active = $8,
              order_index = $9
          WHERE id = $10
          RETURNING *;
        `,
          [
            rule.coverage_type,
            rule.min_limit_each_occurrence,
            rule.min_limit_aggregate,
            rule.require_additional_insured,
            rule.require_waiver,
            rule.min_risk_score,
            rule.notes || "",
            rule.active !== false,
            rule.order_index || 0,
            rule.id,
          ]
        );

        return res.status(200).json({ ok: true, rule: update.rows[0] });
      }

      // CREATE NEW RULE
      const insert = await client.query(
        `
        INSERT INTO requirements (
          group_id,
          coverage_type,
          min_limit_each_occurrence,
          min_limit_aggregate,
          require_additional_insured,
          require_waiver,
          min_risk_score,
          notes,
          active
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
        RETURNING *;
      `,
        [
          rule.group_id,
          rule.coverage_type,
          rule.min_limit_each_occurrence,
          rule.min_limit_aggregate,
          rule.require_additional_insured,
          rule.require_waiver,
          rule.min_risk_score,
          rule.notes || "",
        ]
      );

      return res.status(200).json({ ok: true, rule: insert.rows[0] });
    }

    return res.status(400).json({
      ok: false,
      error: "Unknown save type. Expected 'group' or 'rule'",
    });
  } catch (err) {
    console.error("REQ-V2 SAVE ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    await client.end();
  }
}
