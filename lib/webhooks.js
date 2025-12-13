import crypto from "crypto";
import { sql } from "./db";

export async function emitWebhook(orgId, type, payload) {
  const hooks = await sql`
    SELECT id, url, secret
    FROM webhooks
    WHERE org_id = ${orgId} AND enabled = true
  `;

  const event = {
    id: `evt_${crypto.randomUUID()}`,
    type,
    orgId,
    occurredAt: new Date().toISOString(),
    payload,
  };

  for (const h of hooks) {
    try {
      const body = JSON.stringify(event);
      const sig = crypto
        .createHmac("sha256", h.secret)
        .update(body)
        .digest("hex");

      await fetch(h.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature": sig,
        },
        body,
      });

      await sql`
        INSERT INTO webhook_deliveries (webhook_id, event_type, success)
        VALUES (${h.id}, ${type}, true)
      `;
    } catch (err) {
      await sql`
        INSERT INTO webhook_deliveries (webhook_id, event_type, success, error)
        VALUES (${h.id}, ${type}, false, ${err.message})
      `;
    }
  }
}
