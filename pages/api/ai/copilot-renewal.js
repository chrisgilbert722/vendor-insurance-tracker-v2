// pages/api/ai/copilot-renewal.js
import OpenAI from "openai";
import { sql } from "../../../lib/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ============================================================
   CONTEXT BUILDER
============================================================ */
async function buildRenewalContext({ orgId, vendorId, policyId }) {
  const ctx = { orgId };

  // POLICY
  if (policyId) {
    const policyRows = await sql`
      SELECT *
      FROM policies
      WHERE id = ${policyId}
      LIMIT 1;
    `;
    ctx.policy = policyRows[0] || null;
  }

  // VENDOR
  if (vendorId) {
    const vendorRows = await sql`
      SELECT *
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;
    ctx.vendor = vendorRows[0] || null;
  }

  // RENEWAL SCHEDULE
  if (policyId) {
    const scheduleRows = await sql`
      SELECT *
      FROM policy_renewal_schedule
      WHERE policy_id = ${policyId}
      LIMIT 1;
    `;
    ctx.schedule = scheduleRows[0] || null;
  }

  // RENEWAL EVENTS
  if (policyId) {
    const events = await sql`
      SELECT *
      FROM policy_renewal_events
      WHERE policy_id = ${policyId}
      ORDER BY created_at DESC
      LIMIT 20;
    `;
    ctx.events = events || [];
  }

  // ALERTS (vendor-based)
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

  // COMPLIANCE SNAPSHOT
  if (vendorId && orgId) {
    const compRows = await sql`
      SELECT *
      FROM vendor_compliance_cache
      WHERE org_id = ${orgId} AND vendor_id = ${vendorId}
      LIMIT 1;
    `;
    ctx.compliance = compRows[0] || null;
  }

  return ctx;
}

/* ============================================================
   SYSTEM PROMPTS (AI Personas)
============================================================ */
function buildSystemPrompt(persona, ctx) {
  const base = `
You are "Compliance Copilot" — an AI assistant expert in:
- insurance compliance
- COI interpretation
- policy renewals
- construction & vendor risk
- broker coordination
- contractor onboarding
- commercial insurance logic
- missing coverage detection
- renewal communication

Always speak clearly.
Always provide exact action steps.
Never use legal jargon unless explaining it.

Context:
${JSON.stringify(ctx, null, 2)}
`;

  if (persona === "admin") {
    return (
      base +
      `
You are helping an ADMIN.
Your goals:
- Explain why the vendor is failing
- Identify missing coverage
- Identify risk
- Break down alerts clearly
- Suggest renewal next steps
- Suggest escalation (vendor/broker/internal)
- Recommend what admin should do next
Answer like a senior risk manager.
      `
    );
  }

  if (persona === "vendor") {
    return (
      base +
      `
You are helping a VENDOR.
Your goals:
- Explain why they are not compliant
- Tell them EXACTLY what document is missing
- Tell them EXACTLY what needs to be fixed in their COI
- Provide step-by-step instructions
- Provide sample broker emails
- Keep the language VERY simple
You are their friendly compliance coach.
      `
    );
  }

  if (persona === "broker") {
    return (
      base +
      `
You are helping an INSURANCE BROKER.
Your goals:
- Identify missing limits / endorsements
- Explain required coverage
- Show exactly what must be updated in the COI
- Provide precise insurance terminology
- Help them generate corrected COIs
Respond like a senior commercial insurance analyst.
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

    // 1. Build context
    const context = await buildRenewalContext({ orgId, vendorId, policyId });

    // 2. Build system prompt
    const systemPrompt = buildSystemPrompt(persona, context);

    // 3. AI Completion
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
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
    });
  } catch (err) {
    console.error("[copilot-renewal] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
