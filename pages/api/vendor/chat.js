// pages/api/vendor/chat.js
import { Client } from "pg";
import OpenAI from "openai";

// reused helpers from elsewhere
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use POST." });
  }

  const { vendorId, message } = req.body || {};
  const vId = parseInt(vendorId, 10);

  if (!message || !vId || Number.isNaN(vId)) {
    return res
      .status(400)
      .json({ ok: false, error: "vendorId and message are required." });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Load vendor
    const vendRes = await client.query(
      `SELECT id, org_id, name, email, phone, address, created_at
       FROM public.vendors
       WHERE id = $1`,
      [vId]
    );

    if (vendRes.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Vendor not found." });
    }

    const vendor = vendRes.rows[0];

    // Load vendor policies
    const polRes = await client.query(
      `SELECT id, policy_number, carrier, coverage_type,
              expiration_date, effective_date, status, created_at
       FROM public.policies
       WHERE vendor_id = $1
       ORDER BY created_at DESC`,
      [vId]
    );
    const policies = polRes.rows || [];

    // Load org-wide requirements
    const reqRes = await client.query(
      `SELECT id, coverage_type, minimum_limit, required
       FROM public.requirements
       ORDER BY id ASC`
    );
    const requirements = reqRes.rows || [];

    // Risk summary
    let expiredCount = 0;
    let expSoonCount = 0;
    let total = policies.length;
    let latestExp = null;
    const now = new Date();

    for (const p of policies) {
      const d = parseExpiration(p.expiration_date);
      if (!d) continue;
      if (!latestExp || d > latestExp) latestExp = d;
      if (d < now) expiredCount++;
      else {
        const days = computeDaysLeft(p.expiration_date);
        if (days !== null && days <= 60) expSoonCount++;
      }
    }

    // Compliance summary
    const coverageSet = new Set(
      policies
        .map((p) => (p.coverage_type || "").toLowerCase())
        .filter((c) => c.length > 0)
    );

    const missing = [];
    const present = [];

    for (const r of requirements) {
      const key = (r.coverage_type || "").toLowerCase();
      if (!key) continue;
      const found = Array.from(coverageSet).some((c) => c.includes(key));
      if (found) {
        present.push(r);
      } else if (r.required) {
        missing.push(r);
      }
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const context = {
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
      },
      riskSummary: {
        totalPolicies: total,
        expiredCount,
        expiringSoonCount: expSoonCount,
        latestExpiration: latestExp
          ? latestExp.toISOString().slice(0, 10)
          : null,
      },
      requirements,
      missingRequirements: missing,
      presentRequirements: present,
      policies: policies.map((p) => ({
        id: p.id,
        policy_number: p.policy_number,
        carrier: p.carrier,
        coverage_type: p.coverage_type,
        expiration_date: p.expiration_date,
        effective_date: p.effective_date,
        status: p.status,
        daysLeft: computeDaysLeft(p.expiration_date),
      })),
    };

    const prompt = `
You are an INTERNAL commercial insurance & COI risk analyst for a vendor.

You are talking to a risk manager / GC / property manager who wants quick, accurate answers.
Tone: G-MODE (direct, blunt, no fluff) but still professional and not insulting.
You are NOT talking to the vendor. This is internal use only.

You will receive:
- Vendor info
- Policies
- Org-wide coverage requirements
- Which required coverages are missing
- A user question

Your job:
- Answer the question as clearly as possible
- Call out risk, gaps, and next actions
- Do NOT invent coverages or limits that are not in the data
- If you don't know something, say you don't know

CONTEXT:
${JSON.stringify(context, null, 2)}

USER QUESTION:
"${message}"
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content:
            "You are an internal insurance risk analyst for a compliance team. Be concise, accurate, and direct. Never hallucinate coverage that is not present.",
        },
        { role: "user", content: prompt },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() || null;

    if (!reply) {
      return res
        .status(500)
        .json({ ok: false, error: "No reply from AI model." });
    }

    return res.status(200).json({ ok: true, reply });
  } catch (err) {
    console.error("vendor/chat error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Chat engine failed." });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
