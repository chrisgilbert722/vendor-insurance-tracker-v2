// pages/api/vendor/fix-actions.js
import { supabase } from "../../../lib/supabaseClient";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET /api/vendor/fix-actions?vendorId=...&orgId=...
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { vendorId, orgId } = req.query;

    if (!vendorId || !orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing vendorId or orgId" });
    }

    // 1️⃣ Load vendor (from Neon via /api/vendor or from Supabase if you mirror it)
    // Here we assume you already have /api/vendor/[id] working:
    const vendorResp = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/vendor/${vendorId}`
    );
    const vendorData = await vendorResp.json();
    if (!vendorResp.ok || !vendorData.ok) {
      throw new Error(vendorData.error || "Failed to load vendor");
    }
    const vendor = vendorData.vendor;

    // 2️⃣ Load compliance from cache
    const { data: cacheRow, error: cacheErr } = await supabase
      .from("vendor_compliance_cache")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("org_id", orgId)
      .single();

    if (cacheErr && cacheErr.code !== "PGRST116") {
      console.error("Compliance cache fetch error", cacheErr);
    }

    // 3️⃣ Load alerts and filter to this vendor
    const alertsResp = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/alerts?orgId=${orgId}`
    );
    const alertsData = await alertsResp.json();
    if (!alertsResp.ok || !alertsData.ok) {
      throw new Error(alertsData.error || "Failed to load alerts");
    }
    const vendorAlerts = (alertsData.alerts || []).filter(
      (a) => String(a.vendor_id) === String(vendorId)
    );

    // If no AI key, fallback simple action text
    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        ok: true,
        steps: [
          "Review missing and failing requirements for this vendor.",
          "Request updated COI and endorsements from the vendor or broker.",
          "Update policies in the system and re-run compliance.",
        ],
        vendorEmail:
          "Please provide an updated Certificate of Insurance that meets our current coverage and endorsement requirements.",
        internalNotes:
          "AI is not configured. Recommend manual outreach to vendor to resolve missing coverage/endorsements.",
      });
    }

    const prompt = `
You are an expert vendor risk & insurance compliance assistant.

You are given:
- Vendor details
- This vendor's compliance result
- A list of alerts specific to this vendor

You must produce:
1) A clear, concise list of action steps to bring this vendor into full compliance.
2) A ready-to-send email TO THE VENDOR requesting exactly what is needed.
3) A short internal note for the compliance/ops team summarizing the situation.

Vendor:
${JSON.stringify(
  {
    id: vendor.id,
    name: vendor.name || vendor.vendor_name,
    email: vendor.email || null,
  },
  null,
  2
)}

Compliance (cached):
${JSON.stringify(
  cacheRow
    ? {
        summary: cacheRow.summary,
        status: cacheRow.status,
        missing: cacheRow.missing,
        failing: cacheRow.failing,
      }
    : { summary: null, status: null },
  null,
  2
)}

Alerts for this vendor:
${JSON.stringify(
  vendorAlerts.map((a) => ({
    type: a.type,
    severity: a.severity,
    coverage_type: a.coverage_type,
    message: a.message,
  })),
  null,
  2
)}

Format your response as strict JSON:
{
  "steps": ["...", "...", "..."],
  "vendorEmail": "email body here in plain text",
  "internalNotes": "short note for internal team"
}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        steps: [
          "Review vendor alerts and compliance issues.",
          "Request updated COI and endorsements from vendor.",
          "Re-run compliance after documents are updated.",
        ],
        vendorEmail:
          "Please provide an updated Certificate of Insurance meeting our current requirements.",
        internalNotes: "AI JSON parse failed; using fallback content.",
      };
    }

    return res.status(200).json({
      ok: true,
      steps: parsed.steps || [],
      vendorEmail: parsed.vendorEmail || "",
      internalNotes: parsed.internalNotes || "",
    });
  } catch (err) {
    console.error("FIX ACTIONS ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to build fix plan" });
  }
}
