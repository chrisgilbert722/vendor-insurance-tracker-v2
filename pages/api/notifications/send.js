// pages/api/notifications/send.js
// Notification Delivery API — uses templates table + your existing Resend wrapper.

import { sql } from "../../../lib/db";
import { sendEmail } from "../../../lib/sendEmail";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

// Replace {{PLACEHOLDER}} tokens
function applyTemplate(text, params = {}) {
  if (!text) return "";
  let out = text;
  for (const [key, val] of Object.entries(params)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    out = out.replace(regex, val ?? "");
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const {
      orgId,
      to,
      templateKey,
      bodyParams = {},
      subjectOverride,
    } = req.body || {};

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }
    if (!to) {
      return res.status(400).json({ ok: false, error: "Missing 'to' email" });
    }
    if (!templateKey) {
      return res.status(400).json({
        ok: false,
        error: "Missing templateKey",
      });
    }

    // Fetch template for org
    const rows = await sql`
      SELECT subject, body
      FROM templates
      WHERE org_id = ${orgId} AND key = ${templateKey}
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: `No template found for key '${templateKey}'`,
      });
    }

    const tmpl = rows[0];

    // Apply placeholders
    const subject =
      subjectOverride ||
      applyTemplate(tmpl.subject, bodyParams);

    const finalBody = applyTemplate(tmpl.body, bodyParams);

    // Send email using your unified Resend wrapper
    const result = await sendEmail({
      to,
      subject,
      body: finalBody,
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: result.error || "Failed to send email",
      });
    }

    return res.status(200).json({
      ok: true,
      id: result.id,
      message: "Email sent successfully.",
    });
  } catch (err) {
    console.error("[notifications/send ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Unexpected notification error",
    });
  }
}
