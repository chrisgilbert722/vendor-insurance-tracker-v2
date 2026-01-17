// pages/api/broker/create-link.js
// Creates a shareable broker portal link for external parties
// Brokers can view vendor compliance status (read-only)

import { sql } from "../../../lib/db";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, brokerName, brokerEmail, expirationDays = 30 } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // Verify org exists
    const [org] = await sql`
      SELECT id, name FROM orgs WHERE id = ${orgId} LIMIT 1;
    `;

    if (!org) {
      return res.status(404).json({ ok: false, error: "Organization not found" });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.min(expirationDays, 90)); // Max 90 days

    // Store token (reuse vendor_portal_tokens with portal_type)
    await sql`
      INSERT INTO vendor_portal_tokens (
        org_id,
        vendor_id,
        token,
        expires_at,
        portal_type,
        metadata
      )
      VALUES (
        ${orgId},
        NULL,
        ${token},
        ${expiresAt},
        'broker',
        ${JSON.stringify({ brokerName, brokerEmail, createdAt: new Date().toISOString() })}
      );
    `;

    // Build portal URL
    const origin = req.headers.origin || process.env.APP_URL || `https://${req.headers.host}`;
    const portalUrl = `${origin}/broker/portal/${token}`;

    return res.status(200).json({
      ok: true,
      token,
      portalUrl,
      expiresAt: expiresAt.toISOString(),
      orgName: org.name,
    });
  } catch (err) {
    console.error("[broker/create-link] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to create broker link",
    });
  }
}
