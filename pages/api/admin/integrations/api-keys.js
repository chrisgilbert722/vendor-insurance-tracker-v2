import crypto from "crypto";
import { sql } from "../../../../lib/db";

function genKey() {
  return "sk_live_" + crypto.randomBytes(24).toString("hex");
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { orgId } = req.query;
      if (!orgId) return res.status(400).json({ ok: false, error: "orgId required" });

      const keys = await sql`
        SELECT id, name, enabled, created_at
        FROM api_keys
        WHERE org_id = ${orgId}
        ORDER BY created_at DESC
      `;

      return res.json({ ok: true, keys });
    }

    if (req.method === "POST") {
      const { orgId, name } = req.body || {};
      if (!orgId) return res.status(400).json({ ok: false, error: "orgId required" });

      const key = genKey();

      const [row] = await sql`
        INSERT INTO api_keys (org_id, name, key)
        VALUES (${orgId}, ${name || "API Key"}, ${key})
        RETURNING id, name, created_at
      `;

      // IMPORTANT: return key ONCE
      return res.json({
        ok: true,
        key: {
          id: row.id,
          name: row.name,
          key, // copy-once
          created_at: row.created_at,
        },
      });
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ ok: false, error: "id required" });

      await sql`
        UPDATE api_keys SET enabled = false WHERE id = ${id}
      `;

      return res.json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).end();
  } catch (err) {
    console.error("[api-keys]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
