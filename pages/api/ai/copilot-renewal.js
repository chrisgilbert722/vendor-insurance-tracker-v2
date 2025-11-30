// pages/api/ai/copilot-renewal.js
import OpenAI from "openai";
import { sql } from "../../../lib/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ============================================================
   MODEL ROUTING
============================================================ */
function selectModel(persona, message, context) {
  const msgLower = message.toLowerCase();

  // Document or deep coverage evaluation
  if (
    msgLower.includes("interpret") ||
    msgLower.includes("analyze pdf") ||
    msgLower.includes("explain this document") ||
    msgLower.includes("endorsement") ||
    msgLower.includes("coverage details") ||
    msgLower.includes("read")
  ) {
    return "gpt-4o"; // or "gpt-5" if desired
  }

  // Broker: high reasoning
  if (persona === "broker") return "gpt-4o";

  // Admin: mid/high reasoning
  if (persona === "admin") return "gpt-4o";

  // Vendor: cheap + fast
  if (persona === "vendor") return "gpt-4o-mini";

  return "gpt-4o-mini";
}

/* ============================================================
   CONTEXT BUILDER
============================================================ */
async function buildRenewalContext({ orgId, vendorId, policyId }) {
  const ctx = { orgId };

  if (policyId) {
    const policyRows = await sql`
      SELECT * FROM policies WHERE id = ${policyId} LIMIT 1;
    `;
    ctx.policy = policyRows[0] || null;
  }

  if (vendorId) {
    const vendorRows = await sql`
      SELECT * FROM vendors WHERE id = ${vendorId} LIMIT 1;
    `;
    ctx.vendor = vendorRows[0] || null;
  }

  if (policyId) {
    const scheduleRows = await sql`
      SELECT * FROM policy_renewal_schedule WHERE policy_id = ${policyId} LIMIT 1;
    `;
    ctx.schedule = scheduleRows[0] || null;

    const events = await sql`
      SELECT * FROM policy_renewal_events
      WHERE policy_id = ${policyId}
      ORDER BY created_at DESC
      LIMIT 20;
    `;
    ctx.events = events || [];
  }

  if (vendorId) {
    const alerts = await sql`
      SELECT *
      FROM alerts_v2
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 20;
    `;
    ctx.alerts = alerts || [];
  }

  return ctx;
}

/* ============================================================
   SYSTEM PROMPT BUILDER
============================================================ */
function buildSystemPrompt(persona, ctx) {
  const base = `
You are "Compliance Copilot", an expert in:
- insurance compliance
- COI interpretation
- renewal strategy
- vendor risk
- construction coverage
- endorsements & commercial insurance

Your job is to give clean, simple, actionable answers.

Context:
${JSON.stringify(ctx, null, 2)}
`;

  if (persona === "admin") {
    return (
      base +
      `
You are helping an ADMIN.
Explain risk, compliance issues, renewal timing, and provide escalation steps.
`
    );
  }
  if (persona === "vendor") {
    return (
      base +
      `
You are helping a VENDOR.
Give plain-language steps, explain what's missing, and generate broker email text.
`
    );
  }
  if (persona === "broker") {
    return (
      base +
      `
You are helping a BROKER.
Explain exactly what to update in the COI, including limits and endorsements.
`
    );
  }
  return base;
}

/* ============================================================
   MAIN HANDLER
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, vendorId, policyId, persona, message } = req.body;

    if (!orgId || !persona || !message) {
      return res.status(400).json({ ok: false, error: "Missing fields." });
    }

    const context = await buildRenewalContext({ orgId, vendorId, policyId });
    const systemPrompt = buildSystemPrompt(persona, context);

    // MODEL ROUTING
    const model = selectModel(persona, message, context);

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.2,
    });

    const reply = completion.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      ok: true,
      reply,
      context,
      model,
    });
  } catch (err) {
    console.error("[copilot-renewal] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
