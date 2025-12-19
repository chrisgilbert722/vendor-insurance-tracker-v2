// pages/api/requirements-v2/groups.js
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
    // (centralized, canonical, safe)
    // =========================================================
    const orgId = await resolveOrg(req, res);
    if (!orgId) return; // resolveOrg already responded

    // =========================================================
    // GET — list requirement groups for org
    // =========================================================
    if (method === "GET") {
      const rows = await sql`
        SELECT 
          g.id,
          g.org_id,
          g.name,
          g.description,
          g.is_active,
          g.order_index,
          g.created_at,
          g.updated_at,
          (
            SELECT COUNT(*)
            FROM requirements_rules_v2 r
            WHERE r.group_id = g.id
          ) AS rule_count
        FROM requirements_groups_v2 g
        WHERE g.org_id = ${orgId}
        ORDER BY g.order_index ASC, g.created_at ASC;
      `;

      return res.status(200).json({
        ok: true,
        groups: rows || [],
      });
    }

    // =========================================================
    // POST — create new group
    // =========================================================
    if (method === "POST") {
      const { name, description } = req.body || {};

      if (!name || typeof name !== "string") {
        return res.status(400).json({
          ok: false,
          error: "Missing or invalid group name",
        });
      }

      const rows = await sql`
        INSERT INTO requirements_groups_v2
          (org_id, name, description, is_active, order_index)
        VALUES
          (${orgId}, ${name}, ${description || null}, TRUE, 0)
        RETURNING *;
      `;

      return res.status(200).json({
        ok: true,
        group: rows[0],
      });
    }

    // =========================================================
    // PUT — update existing group
    // =========================================================
    if (method === "PUT") {
      const { id, name, description, is_active, order_index } = req.body || {};
      const groupId = Number(id);

      if (!Number.isInteger(groupId)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid group id",
        });
      }

      const rows = await sql`
        UPDATE requirements_groups_v2
        SET
          name        = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          is_active   = COALESCE(${is_active}, is_active),
          order_index = COALESCE(${order_index}, order_index),
          updated_at  = NOW()
        WHERE id = ${groupId}
          AND org_id = ${orgId}
        RETURNING *;
      `;

      return res.status(200).json({
        ok: true,
        group: rows[0],
      });
    }

    // =========================================================
    // DELETE — remove group
    // =========================================================
    if (method === "DELETE") {
      const rawId = req.query?.id;
      const groupId = Number(rawId);

      if (!Number.isInteger(groupId)) {
        return res.status(200).json({
          ok: true,
          deleted: false,
        });
      }

      await sql`
        DELETE FROM requirements_groups_v2
        WHERE id = ${groupId}
          AND org_id = ${orgId};
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
    console.error("[requirements-v2/groups] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
