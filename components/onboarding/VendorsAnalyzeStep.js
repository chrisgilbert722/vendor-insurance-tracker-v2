// pages/api/onboarding/ai-vendors-analyze.js
// STEP 4 — AI Vendor Analysis API (FAIL-OPEN + SAFE)
// ✅ No client created at import time
// ✅ Uses supabaseServer helper
// ✅ NEVER bricks UI

import { supabaseServer } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing session" });
    }

    const supabase = supabaseServer();

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const body = req.body || {};
    const orgId = body.orgId || null;

    // Accept vendors OR vendorCsv
    const vendors =
      Array.isArray(body.vendors)
        ? body.vendors
        : Array.isArray(body.vendorCsv)
        ? body.vendorCsv
        : [];

    // FAIL-OPEN: nothing to analyze
    if (!orgId || vendors.length === 0) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: !orgId ? "Missing orgId" : "No vendors provided",
        summary: { totalVendors: vendors.length, missingEmails: 0, highRisk: 0 },
        vendors: [],
      });
    }

    // Lightweight deterministic analysis
    const analyzed = vendors.map((v) => {
      const email = v.email || v.contactEmail || "";
      const policyNumber = v.policyNumber || v.policy_number || "";
      const expiration = v.expiration || v.expiration_date || v.expDate || "";

      const missingEmail = !String(email).trim();
      const missingPolicy = !String(policyNumber).trim();
      const missingExpiration = !String(expiration).trim();

      const riskLevel =
        missingPolicy || missingExpiration
          ? "high"
          : missingEmail
          ? "medium"
          : "low";

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

    // 🚨 HARD FAIL-OPEN
    return res.status(200).json({
      ok: true,
      skipped: true,
      error: err.message || "AI analysis failed",
      summary: { totalVendors: 0, missingEmails: 0, highRisk: 0 },
      vendors: [],
    });
  }
}
