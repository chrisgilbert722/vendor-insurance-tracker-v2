import crypto from "crypto";
import { sql } from "../../../../lib/db";
import { emitWebhook } from "../../../../lib/webhooks";

function genSecret() {
  return "whsec_" + crypto.randomBytes(24).toString("hex");
}

export default async function handler(req, res) {
  try {
    // LIST
    if (req.method === "GET") {
      const { orgId } = req.query;
      if (!orgId) return res.status(400).json({ ok: false, error: "orgId required" });

      const webhooks = await sql`
        SELECT id, url, enabled, created_at
        FROM webhooks
        WHERE org_id = ${orgId}
        ORDER BY created_at DESC
      `;

      return res.json({ ok: true, webhooks });
    }

    // CREATE
    if (req.method === "POST") {
      const { orgId, url } = req.body || {};
      if (!orgId || !url) return res.status(400).json({ ok: false, error: "orgId + url required" });

      const secret = genSecret();

      const [row] = await sql`
        INSERT INTO webhooks (org_id, url, secret, enabled)
        VALUES (${orgId}, ${url}, ${secret}, true)
        RETURNING id, url, enabled, created_at
      `;

      // Return secret ONCE
      return res.json({ ok: true, webhook: { ...row, secret } });
    }

    // TOGGLE ENABLED
    if (req.method === "PATCH") {
      const { id, enabled } = req.body || {};
      if (!id || typeof enabled !== "boolean") {
        return res.status(400).json({ ok: false, error: "id + enabled required" });
      }

      await sql`
        UPDATE webhooks SET enabled = ${enabled}
        WHERE id = ${id}
      `;

      return res.json({ ok: true });
    }

    // DELETE
    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ ok: false, error: "id required" });

      await sql`DELETE FROM webhooks WHERE id = ${id}`;
      return res.json({ ok: true });
    }

    // TEST EVENT
    if (req.method === "PUT") {
      const { orgId } = req.body || {};
      if (!orgId) return res.status(400).json({ ok: false, error: "orgId required" });

      const result = await emitWebhook(orgId, "test.event", {
        message: "Webhook test event from Compliance Platform",
      });

      return res.json({ ok: true, result });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE", "PUT"]);
    return res.status(405).end();
  } catch (err) {
    console.error("[admin/webhooks]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
