// pages/api/requirements-v2/rules.js
import { getClient } from "../../../lib/db";

export default async function handler(req, res) {
  const { method } = req;

  //
  // 1) GET RULES FOR A GROUP
  //
  if (method === "GET") {
    // /api/requirements-v2/rules?groupId=123
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ ok: false, error: "Missing groupId" });
    }

    let client;
    try {
      client = await getClient();
      const result = await client.query(
        `
          SELECT id,
                 group_id,
                 field_key,
                 operator,
                 expected_value,
                 severity,
                 requirement_text,
                 internal_note,
                 is_active,
                 created_at
          FROM requirements_v2
          WHERE group_id = $1
          ORDER BY created_at ASC
        `,
        [groupId]
      );

      return res.status(200).json({ ok: true, rules: result.rows });
    } catch (err) {
      console.error("GET rules error:", err);
      return res.status(500).json({ ok: false, error: "Failed to load rules" });
    } finally {
      if (client) await client.end();
    }
  }

  //
  // 2) CREATE RULE
  //
  if (method === "POST") {
    const {
      groupId,
      field_key,
      operator,
      expected_value,
      severity,
      requirement_text,
      internal_note,
    } = req.body || {};

    // Required fields for a rule
    if (!groupId || !field_key || !operator || !expected_value) {
      return res.status(400).json({
        ok: false,
        error:
          "groupId, field_key, operator, and expected_value are required fields.",
      });
    }

    let client;
    try {
      client = await getClient();
      const result = await client.query(
        `
          INSERT INTO requirements_v2
          (group_id, field_key, operator, expected_value, severity, requirement_text, internal_note)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, group_id, field_key, operator, expected_value,
                    severity, requirement_text, internal_note, is_active, created_at
        `,
        [
          groupId,
          field_key,
          operator,
          expected_value,
          severity || "medium",
          requirement_text || null,
          internal_note || null,
        ]
      );

      return res.status(201).json({ ok: true, rule: result.rows[0] });
    } catch (err) {
      console.error("POST rule error:", err);
      return res.status(500).json({ ok: false, error: "Failed to create rule" });
    } finally {
      if (client) await client.end();
    }
  }

  //
  // 3) UPDATE RULE
  //
  if (method === "PUT") {
    const {
      id,
      field_key,
      operator,
      expected_value,
      severity,
      requirement_text,
      internal_note,
      is_active,
    } = req.body || {};

    if (!id) {
      return res.status(400).json({ ok: false, error: "Missing rule id" });
    }

    let client;
    try {
      client = await getClient();
      const result = await client.query(
        `
          UPDATE requirements_v2
          SET field_key = COALESCE($2, field_key),
              operator = COALESCE($3, operator),
              expected_value = COALESCE($4, expected_value),
              severity = COALESCE($5, severity),
              requirement_text = COALESCE($6, requirement_text),
              internal_note = COALESCE($7, internal_note),
              is_active = COALESCE($8, is_active)
          WHERE id = $1
          RETURNING id, group_id, field_key, operator, expected_value,
                    severity, requirement_text, internal_note, is_active, created_at
        `,
        [
          id,
          field_key || null,
          operator || null,
          expected_value || null,
          severity || null,
          requirement_text || null,
          internal_note || null,
          is_active,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ ok: false, error: "Rule not found" });
      }

      return res.status(200).json({ ok: true, rule: result.rows[0] });
    } catch (err) {
      console.error("PUT rule error:", err);
      return res.status(500).json({ ok: false, error: "Failed to update rule" });
    } finally {
      if (client) await client.end();
    }
  }

  //
  // 4) DELETE RULE
  //
  if (method === "DELETE") {
    // /api/requirements-v2/rules?id=123
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ ok: false, error: "Missing rule id" });
    }

    let client;
    try {
      client = await getClient();
      await client.query("DELETE FROM requirements_v2 WHERE id = $1", [id]);

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("DELETE rule error:", err);
      return res.status(500).json({ ok: false, error: "Failed to delete rule" });
    } finally {
      if (client) await client.end();
    }
  }

  //
  // 5) DEFAULT
  //
  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ ok: false, error: `Method ${method} Not Allowed` });
}
