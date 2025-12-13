import crypto from "crypto";
import { sql } from "./db";

/**
 * Sign payload with HMAC SHA256
 */
function sign(secret, body) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Emit an event to all enabled webhooks for an org.
 * READ/WRITE: writes delivery logs.
 */
export async function emitWebhook(orgId, type, payload) {
  const hooks = await sql`
    SELECT id, url, secret
    FROM webhooks
    WHERE org_id = ${orgId} AND enabled = true
  `;

  if (!hooks.length) return { delivered: 0 };

  const event = {
    id: `evt_${crypto.randomUUID()}`,
    type,
    orgId,
    occurredAt: new Date().toISOString(),
    payload,
  };

  const body = JSON.stringify(event);

  let delivered = 0;

  for (const h of hooks) {
    try {
      const signature = sign(h.secret, body);

      const res = await fetch(h.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature": signature,
          "X-Event-Type": type,
        },
        body,
      });

      delivered++;

      await sql`
        INSERT INTO webhook_deliveries (webhook_id, event_type, success, status_code)
        VALUES (${h.id}, ${type}, true, ${res.status})
      `;
    } catch (err) {
      await sql`
        INSERT INTO webhook_deliveries (webhook_id, event_type, success, error)
        VALUES (${h.id}, ${type}, false, ${err.message})
      `;
    }
  }

  return { delivered };
}

/**
 * Verify a webhook signature (for customers to use)
 * Included so you can document it.
 */
export function verifySignature(secret, rawBody, signature) {
  const expected = sign(secret, rawBody);
  return expected === signature;
}
