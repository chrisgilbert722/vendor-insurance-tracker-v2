// pages/api/ai/copilot-renewal.js
import OpenAI from "openai";
import { sql } from "../../../lib/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ============================================================
   MODEL ROUTER — UACC INTELLIGENCE
============================================================ */
function selectModel(persona, message, context) {
  const msg = message.toLowerCase();

  // Document-heavy / COI / Contract / Endorsements
  if (
    msg.includes("interpret") ||
    msg.includes("analyze") ||
    msg.includes("explain this document") ||
    msg.includes("endorsement") ||
    msg.includes("coverage details") ||
    msg.includes("read this") ||
    msg.includes("contract") ||
    msg.includes("pdf")
  ) {
    return "gpt-4o"; // upgrade to "gpt-5" any time
  }

  // Broker = higher reasoning needed
  if (persona === "broker") return "gpt-4o";

  // Admin needs strategic/compliance reasoning
  if (persona === "admin") return "gpt-4o";

  // Vendor = simple, cost-efficient
  if (persona === "vendor") return "gpt-4o-mini";

  return "gpt-4o-mini";
}

/* ============================================================
   MEMORY ENGINE — Persistent Vendor/Policy Memory
============================================================ */
async function saveMemory(orgId, vendorId, policyId, role, userMsg, aiReply) {
  await sql`
    INSERT INTO copilot_memory (org_id, vendor_id, policy_id, role, message, memory)
    VALUES (
      ${orgId},
      ${vendorId},
      ${policyId},
      ${role},
      ${userMsg},
      ${{
        aiReply,
        ts: new Date().toISOString(),
      }}
    );
  `;
}

async function loadMemory(orgId, vendorId, policyId, role) {
  const rows = await sql`
    SELECT memory
    FROM copilot_memory
    WHERE org_id = ${orgId}
      AND (vendor_id = ${vendorId} OR vendor_id IS NULL)
      AND (policy_id = ${policyId} OR policy_id IS NULL)
      AND role = ${role}
    ORDER BY created_at DESC
    LIMIT 12;
  `;

  return rows.map((r) => r.memory);
}

/* ============================================================
   CONTEXT ENGINE — UACC Core Data Loader
============================================================ */
async function buildUACCContext({ orgId, vendorId, policyId }) {
  const ctx = { orgId };

  /* --- POLICY INFO --- */
  if (policyId) {
    const p = await sql`
      SELECT * FROM policies WHERE id = ${policyId} LIMIT 1;
    `;
    ctx.policy = p[0] || null;
  }

  /* --- VENDOR INFO --- */
  if (vendorId) {
    const v = await sql`
      SELECT * FROM vendors WHERE id = ${vendorId} LIMIT 1;
    `;
    ctx.vendor = v[0] || null;
  }

  /* --- RENEWAL SCHEDULE --- */
  if (policyId) {
    const s = await sql`
      SELECT * FROM policy_renewal_schedule
      WHERE policy_id = ${policyId}
      LIMIT 1;
    `;
    ctx.schedule = s[0] || null;

    const ev = await sql`
      SELECT *
      FROM policy_renewal_events
      WHERE policy_id = ${policyId}
      ORDER BY created_at DESC
      LIMIT 20;
    `;
    ctx.renewalEvents = ev || [];
  }

  /* --- ALERTS (Renewal + Rule + Missing Coverage) --- */
  if (vendorId) {
    const a = await sql`
      SELECT *
      FROM alerts_v2
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 20;
    `;
    ctx.alerts = a || [];
  }

  /* --- RULES CONTEXT (Rule Engine V5/V6) --- */
  const rules = await sql`
    SELECT *
    FROM requirement_rules
    WHERE org_id = ${orgId}
    ORDER BY id ASC;
  `;
  ctx.rules = rules || [];

  /* --- COMPLIANCE SNAPSHOT --- */
  if (vendorId) {
    const comp = await sql`
      SELECT *
      FROM vendor_compliance_cache
      WHERE vendor_id = ${vendorId} AND org_id = ${orgId}
      LIMIT 1;
    `;
    ctx.compliance = comp[0] || null;
  }

  return ctx;
}

/* ============================================================
   SYSTEM PROMPT — UACC Reasoning Brain
============================================================ */
function buildSystemPrompt(persona, ctx, memory) {
  const base = `
You are "Compliance Copilot", the Unified AI Compliance Core (UACC).

You are an expert in:
- insurance compliance
- COI interpretation
- document analysis (contracts, W9, safety manuals, licenses)
- renewal strategy
- endorsements (CG 20 10, CG 20 37, CG 24 04, etc.)
- vendor risk scoring
- alerts investigation
- rule engine reasoning
- coverage matching
- policy expiration forecasting
- broker communication
- compliance remediation
- administrative guidance

You ALWAYS:
- give clean, simple, actionable next steps
- explain in human language (plain English)
- offer optional deeper detail
- generate sample messages as needed
- avoid jargon for vendors

===== CONTEXT FROM UACC =====
${JSON.stringify(ctx, null, 2)}

===== MEMORY =====
${JSON.stringify(memory, null, 2)}
`;

  if (persona === "admin") {
    return (
      base +
      `
You are assisting an ADMIN.
You explain risk, alerts, rules, renewals, vendor issues, and next steps.
Provide insight, root causes, and escalation options.
`
    );
  }

  if (persona === "vendor") {
    return (
      base +
      `
You are assisting a VENDOR.
Explain things simply.
Tell them exactly what is missing.
Write emails they can send their broker.
Walk them step-by-step.
`
    );
  }

  if (persona === "broker") {
    return (
      base +
      `
You are assisting a BROKER.
Explain missing endorsements, incorrect limits, required coverage.
Reference common forms (ISO forms).
Tell them exactly how to fix the COI.
`
    );
  }

  return base;
}

/* ============================================================
   MAIN HANDLER — UACC
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

    /* --- LOAD CONTEXT --- */
    const context = await buildUACCContext({ orgId, vendorId, policyId });

    /* --- LOAD MEMORY --- */
    const memory = await loadMemory(orgId, vendorId, policyId, persona);

    /* --- SYSTEM PROMPT --- */
    const systemPrompt = buildSystemPrompt(persona, context, memory);

    /* --- MODEL SELECTION --- */
    const model = selectModel(persona, message, context);

    /* --- CALL LLM --- */
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.2,
    });

    const reply = completion.choices?.[0]?.message?.content || "";

    /* --- SAVE MEMORY --- */
    await saveMemory(orgId, vendorId, policyId, persona, message, reply);

    /* --- RETURN --- */
    return res.status(200).json({
      ok: true,
      reply,
      model,
      context,
      memoryUsed: memory,
    });
  } catch (err) {
    console.error("[UACC copilot-renewal ERROR]:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
