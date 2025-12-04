// pages/api/vendor/suggestions.js
import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing vendor token." });
    }

    // Look up vendor + org from token
    const portal = await sql`
      SELECT vp.vendor_id, vp.org_id, v.name AS vendor_name, o.name AS org_name
      FROM vendor_portal_tokens vp
      JOIN vendors v ON v.id = vp.vendor_id
      JOIN orgs o ON o.id = vp.org_id
      WHERE vp.token = ${token}
      LIMIT 1;
    `;

    if (!portal.length) {
      return res.status(404).json({ ok: false, error: "Invalid portal token." });
    }

    const vendorId = portal[0].vendor_id;
    const orgId = portal[0].org_id;

    // Alerts
    const alerts = await sql`
      SELECT code, label, severity, message
      FROM vendor_alerts
      WHERE vendor_id = ${vendorId}
      ORDER BY severity DESC;
    `;

    // Requirements
    const reqs = await sql`
      SELECT name, limit
      FROM coverage_requirements
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    // Timeline (for context)
    const timeline = await sql`
      SELECT action, message, severity, created_at
      FROM vendor_timeline
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 30;
    `;

    const context = `
Vendor: ${portal[0].vendor_name}
Org: ${portal[0].org_name}

==== COVERAGE REQUIREMENTS ====
${reqs.length ? reqs.map(r => `• ${r.name}: ${r.limit || "no limit listed"}`).join("\n") : "None"}

==== ACTIVE ALERTS (Fix Needed) ====
${alerts.length ? alerts.map(a => `• [${a.severity}] ${a.label || a.code} — ${a.message}`).join("\n") : "No alerts"}

==== RECENT ACTIVITY ====
${timeline.length ? timeline.map(t => `• ${t.action} — ${t.message}`).join("\n") : "No recent activity"}

Your job:
- Produce automatic “Smart Suggestions” IN BULLET POINTS.
- Always start with "Suggested Next Actions".
- Prioritize critical + high severity alerts.
- Then list missing coverages (requirements).
- Then summarize helpful compliance advice.
- DO NOT invent information.
- Keep it friendly, short, and actionable.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: context },
        { role: "user", content: "Generate smart compliance suggestions for this vendor." }
      ],
      max_tokens: 250,
      temperature: 0.3
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({ ok: false, error: "No response from AI." });
    }

    return res.status(200).json({ ok: true, suggestions: reply });

  } catch (err) {
    console.error("[suggestions ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "Server failure: " + err.message,
    });
  }
}
