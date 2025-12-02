// pages/api/vendor/assistant.js
import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { token, question } = req.body;

    if (!token || !question) {
      return res.status(400).json({ ok: false, error: "Missing token or question" });
    }

    // ---------------------------------------------
    // 1) LOOK UP PORTAL BY TOKEN
    // ---------------------------------------------
    const portal = await sql`
      SELECT 
        vp.id AS portal_id,
        vp.vendor_id,
        vp.org_id,
        v.name AS vendor_name,
        o.name AS org_name
      FROM vendor_portal_tokens vp
      JOIN vendors v ON vp.vendor_id = v.id
      JOIN orgs o ON vp.org_id = o.id
      WHERE vp.token = ${token}
      LIMIT 1;
    `;

    if (!portal.length) {
      return res.status(404).json({ ok: false, error: "Invalid vendor token" });
    }

    const vendorId = portal[0].vendor_id;
    const orgId = portal[0].org_id;

    // ---------------------------------------------
    // 2) GET ALERTS
    // ---------------------------------------------
    const alerts = await sql`
      SELECT code, label, message, severity
      FROM vendor_alerts
      WHERE vendor_id = ${vendorId}
      ORDER BY severity DESC;
    `;

    // ---------------------------------------------
    // 3) GET REQUIREMENTS
    // ---------------------------------------------
    const coverages = await sql`
      SELECT name, limit
      FROM coverage_requirements
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    // ---------------------------------------------
    // 4) GET TIMELINE
    // ---------------------------------------------
    const timeline = await sql`
      SELECT action, message, severity, created_at
      FROM vendor_timeline
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    // ---------------------------------------------
    // 5) BUILD AI CONTEXT
    // ---------------------------------------------
    const context = `
Vendor: ${portal[0].vendor_name}
Organization: ${portal[0].org_name}

=== COVERAGE REQUIREMENTS ===
${coverages.length > 0 
  ? coverages.map(c => `• ${c.name}: ${c.limit || "no limit provided"}`).join("\n")
  : "No coverage requirements found."
}

=== ACTIVE ALERTS ===
${alerts.length > 0
  ? alerts.map(a => `• [${a.severity}] ${a.label || a.code}: ${a.message}`).join("\n")
  : "No active alerts."
}

=== RECENT ACTIVITY ===
${timeline.length > 0
  ? timeline.map(t => `• ${t.action} — ${t.message} (${t.created_at})`).join("\n")
  : "No timeline activity."
}

Your job:
- Answer the user's question CLEARLY and SIMPLY.
- If the vendor asks "What do I need to fix?", summarize alerts.
- If they ask about requirements, list required coverages.
- If they ask about uploads, give timeline info.
- If they ask "why am I not compliant?", summarize highest severity alerts.
- DO NOT invent requirements. Use ONLY the data above.
- Be friendly, helpful, and concise.
`;

    // ---------------------------------------------
    // 6) CALL OPENAI
    // ---------------------------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: context },
        { role: "user", content: question }
      ],
      max_tokens: 300,
      temperature: 0.4
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || null;

    if (!reply) {
      return res.status(500).json({
        ok: false,
        error: "No response from AI."
      });
    }

    // ---------------------------------------------
    // 7) LOG ASSISTANT INTERACTION TO TIMELINE
    // ---------------------------------------------
    await sql`
      INSERT INTO vendor_timeline (vendor_id, action, message, severity)
      VALUES (${vendorId}, 'assistant_reply', ${reply}, 'info')
    `;

    return res.status(200).json({
      ok: true,
      reply,
    });

  } catch (err) {
    console.error("[assistant.js ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "Server error: " + err.message,
    });
  }
}
