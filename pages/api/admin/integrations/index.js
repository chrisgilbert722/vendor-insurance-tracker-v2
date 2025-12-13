import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId } = req.query;
    if (!orgId) return res.status(400).json({ ok: false, error: "orgId required" });

    const keys = await sql`
      SELECT id, name, enabled, created_at
      FROM api_keys
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC
    `;

    const webhooks = await sql`
      SELECT id, url, enabled, created_at
      FROM webhooks
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC
    `;

    return res.json({ ok: true, keys, webhooks });
  } catch (err) {
    console.error("[admin/integrations/index]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
