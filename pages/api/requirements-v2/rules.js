import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req, res) {
  try {
    const { method } = req;

    // =========================================================
    // 🔒 Resolve orgExternalId → internal numeric org_id
    // =========================================================
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    // =========================================================
    // GET — list rules (optionally by group)
    // =========================================================
    if (method === "GET") {
      const groupIdRaw = req.query?.groupId;
      const groupId = groupIdRaw ? Number(groupIdRaw) : null;

      if (groupIdRaw && !Number.isInteger(groupId)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid groupId",
        });
      }

      const rows = await sql`
        SELECT
          r.id,
          r.group_id,
          r.name,
          r.description,
          r.severity,
          r.is_active,
          r.logic,
          r.created_at,
          r.updated_at
        FROM requirements_rules_v2 r
        JOIN requirements_groups_v2 g
          ON g.id = r.group_id
        WHERE g.org_id = ${orgId}
          AND (${groupId}::int IS NULL OR r.group_id = ${groupId})
        ORDER BY r.created_at ASC;
      `;

      return res.status(200).json({
        ok: true,
        rules: rows || [],
      });
    }

    // =========================================================
    // POST — create rule
    // =========================================================
    if (method === "POST") {
      const {
        group_id,
        name,
        description,
        severity,
        logic,
      } = req.body || {};

      const groupId = Number(group_id);

      if (
        !Number.isInteger(groupId) ||
        !name ||
        typeof name !== "string"
      ) {
        return res.status(400).json({
          ok: false,
          error: "Invalid rule input",
        });
      }

      // Ensure group belongs to org
      const groupCheck = await sql`
        SELECT id
        FROM requirements_groups_v2
        WHERE id = ${groupId}
          AND org_id = ${orgId}
        LIMIT 1;
      `;

      if (groupCheck.length === 0) {
        return res.status(403).json({
          ok: false,
          error: "Group does not belong to organization",
        });
      }

      const rows = await sql`
        INSERT INTO requirements_rules_v2
          (group_id, name, description, severity, logic, is_active)
        VALUES
          (
            ${groupId},
            ${name},
            ${description || null},
            ${severity || "medium"},
            ${logic || {}},
            TRUE
          )
        RETURNING *;
      `;

      return res.status(200).json({
        ok: true,
        rule: rows[0],
      });
    }

    // =========================================================
    // PUT — update rule
    // =========================================================
    if (method === "PUT") {
      const {
        id,
        name,
        description,
        severity,
        logic,
        is_active,
      } = req.body || {};

      const ruleId = Number(id);

      if (!Number.isInteger(ruleId)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid rule id",
        });
      }

      const rows = await sql`
        UPDATE requirements_rules_v2 r
        SET
          name        = COALESCE(${name}, r.name),
          description = COALESCE(${description}, r.description),
          severity    = COALESCE(${severity}, r.severity),
          logic       = COALESCE(${logic}, r.logic),
          is_active   = COALESCE(${is_active}, r.is_active),
          updated_at  = NOW()
        FROM requirements_groups_v2 g
        WHERE r.id = ${ruleId}
          AND r.group_id = g.id
          AND g.org_id = ${orgId}
        RETURNING r.*;
      `;

      return res.status(200).json({
        ok: true,
        rule: rows[0],
      });
    }

    // =========================================================
    // DELETE — remove rule
    // =========================================================
    if (method === "DELETE") {
      const rawId = req.query?.id;
      const ruleId = Number(rawId);

      if (!Number.isInteger(ruleId)) {
        return res.status(200).json({
          ok: true,
          deleted: false,
        });
      }

      await sql`
        DELETE FROM requirements_rules_v2 r
        USING requirements_groups_v2 g
        WHERE r.id = ${ruleId}
          AND r.group_id = g.id
          AND g.org_id = ${orgId};
      `;

      return res.status(200).json({
        ok: true,
        deleted: true,
      });
    }

    // =========================================================
    // Unsupported method
    // =========================================================
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });

  } catch (err) {
    console.error("[requirements-v2/rules] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
