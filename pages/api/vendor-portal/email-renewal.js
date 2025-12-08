// pages/api/vendor/email-renewal.js
import { Client } from "pg";
import OpenAI from "openai";

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

  const { vendorId } = req.body || {};
  const vId = parseInt(vendorId, 10);

  if (!vId || Number.isNaN(vId)) {
    return res
      .status(400)
      .json({ ok: false, error: "vendorId is required and must be a number." });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Load vendor
    const vendRes = await client.query(
      `SELECT id, name, email
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
              expiration_date, effective_date, status
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

    // Build summaries
    const expired = [];
    const expiringSoon = [];
    const now = new Date();

    for (const p of policies) {
      const d = parseExpiration(p.expiration_date);
      const daysLeft = computeDaysLeft(p.expiration_date);
      if (!d || daysLeft === null) continue;

      if (d < now) {
        expired.push({ ...p, daysLeft });
      } else if (daysLeft <= 30) {
        expiringSoon.push({ ...p, daysLeft });
      }
    }

    // Requirements-based missing coverage
    const coverageSet = new Set(
      policies
        .map((p) => (p.coverage_type || "").toLowerCase())
        .filter((c) => c.length > 0)
    );

    const missingReqs = [];
    for (const r of requirements) {
      const key = (r.coverage_type || "").toLowerCase();
      if (!key || !r.required) continue;
      const found = Array.from(coverageSet).some((c) => c.includes(key));
      if (!found) missingReqs.push(r);
    }

    // Build context for OpenAI
    const context = {
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
      },
      expiredPolicies: expired.map((p) => ({
        policy_number: p.policy_number,
        carrier: p.carrier,
        coverage_type: p.coverage_type,
        expiration_date: p.expiration_date,
        daysPast: Math.abs(p.daysLeft),
      })),
      expiringSoonPolicies: expiringSoon.map((p) => ({
        policy_number: p.policy_number,
        carrier: p.carrier,
        coverage_type: p.coverage_type,
        expiration_date: p.expiration_date,
        daysLeft: p.daysLeft,
      })),
      missingRequirements: missingReqs.map((r) => ({
        coverage_type: r.coverage_type,
        minimum_limit: r.minimum_limit,
      })),
      requirementsCount: requirements.length,
    };

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are drafting a vendor-facing email from a compliance team.

Context (JSON):
${JSON.stringify(context, null, 2)}

Task:
- Write a professional, concise email to this vendor.
- Tone: formal, corporate, and respectful (no slang, no jokes).
- Purpose: request updated COI(s) and/or missing coverage so the vendor meets our insurance requirements.
- Mention:
  - Any expired policies.
  - Any policies expiring within 30 days.
  - Any required coverages that appear to be missing.
- Do NOT mention internal commentary (like "high risk" or "compliance grenade").
- This email will be SENT TO THE VENDOR.

Requirements:
1. Start with a clear subject line (plain text).
2. Then provide the email body text.
3. The email body should:
   - Greet the vendor.
   - Briefly explain why you're reaching out.
   - Clearly state what updated documentation is needed.
   - If there are multiple issues (expired + missing), group them logically.
   - Ask them to upload or send a new COI.
   - Close with a polite, firm sign-off.

Signature should end with:
"Compliance Operations Team"

Format your response as:
SUBJECT: <subject here>
BODY:
<email body here>
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an enterprise-grade compliance communications specialist. You write clean, vendor-facing emails.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content || "";
    const lines = content.split("\n");

    let subject = "Insurance Documentation Request";
    let bodyLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toUpperCase().startsWith("SUBJECT:")) {
        subject = line.replace(/SUBJECT:/i, "").trim() || subject;
      } else if (line.toUpperCase().startsWith("BODY:")) {
        // everything after BODY: is the email
        bodyLines = lines.slice(i + 1);
        break;
      }
    }

    const body = bodyLines.join("\n").trim() || content.trim();

    return res.status(200).json({
      ok: true,
      subject,
      body,
    });
  } catch (err) {
    console.error("email-renewal error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to generate email." });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
