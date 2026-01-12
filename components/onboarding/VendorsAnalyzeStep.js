// pages/api/onboarding/ai-vendors-analyze.js
// STEP 4 — AI Vendor Analysis API (FAIL-OPEN + COMPATIBLE)
// ✅ Accepts vendors OR vendorCsv
// ✅ NEVER 400s for missing vendors (returns ok:true, skipped:true)
// ✅ Keeps auth check

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // AUTH
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing session" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const body = req.body || {};
    const orgId = body.orgId || null;

    // ✅ COMPAT: accept either vendors OR vendorCsv
    const vendors =
      Array.isArray(body.vendors) ? body.vendors :
      Array.isArray(body.vendorCsv) ? body.vendorCsv :
      [];

    // FAIL-OPEN: do not brick UI if empty
    if (!orgId || vendors.length === 0) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: !orgId ? "Missing orgId" : "No vendors provided",
        summary: { totalVendors: vendors.length, missingEmails: 0, highRisk: 0 },
        vendors: [],
      });
    }

    // Lightweight analysis (safe stub)
    const analyzed = vendors.map((v) => {
      const email = v.email || v.contactEmail || "";
      const policyNumber = v.policyNumber || v.policy_number || "";
      const expiration = v.expiration || v.expiration_date || v.expDate || "";

      const missingEmail = !String(email || "").trim();
      const missingPolicy = !String(policyNumber || "").trim();
      const missingExpiration = !String(expiration || "").trim();

      const riskLevel =
        missingPolicy || missingExpiration ? "high" : missingEmail ? "medium" : "low";

      return {
        ...v,
        issues: { missingEmail, missingPolicy, missingExpiration },
        riskLevel,
      };
    });

    const summary = {
      totalVendors: analyzed.length,
      missingEmails: analyzed.filter((v) => v.issues?.missingEmail).length,
      highRisk: analyzed.filter((v) => v.riskLevel === "high").length,
    };

    return res.status(200).json({
      ok: true,
      summary,
      vendors: analyzed,
    });
  } catch (err) {
    console.error("[ai-vendors-analyze]", err);
    // FAIL-OPEN response (still ok:true so UI never bricks)
    return res.status(200).json({
      ok: true,
      skipped: true,
      error: err.message || "AI analysis failed",
      summary: { totalVendors: 0, missingEmails: 0, highRisk: 0 },
      vendors: [],
    });
  }
}
