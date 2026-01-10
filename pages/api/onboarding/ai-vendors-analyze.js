// pages/api/onboarding/ai-vendors-analyze.js
// STEP 4 — AI Vendor Analysis API
// SAFE STUB (Production-ready, AI can be swapped in later)

import { createClient } from "@supabase/supabase-js";

// Force Node runtime (avoids edge/turbopack issues)
export const runtime = "nodejs";

// Supabase admin (server-only)
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
    /* -------------------------------------------------
       AUTH — Verify session
    -------------------------------------------------- */
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Authentication session missing.",
      });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    /* -------------------------------------------------
       INPUT
    -------------------------------------------------- */
    const { orgId, vendors } = req.body || {};

    if (!orgId || !Array.isArray(vendors)) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or vendors array",
      });
    }

    /* -------------------------------------------------
       ANALYSIS (LIGHTWEIGHT + SAFE)
       This is where real AI will plug in later
    -------------------------------------------------- */
    const analyzed = vendors.map((v) => ({
      ...v,
      issues: {
        missingEmail: !v.email,
        missingPolicy: !v.policyNumber,
        missingExpiration: !v.expiration,
      },
      riskLevel:
        !v.policyNumber || !v.expiration
          ? "high"
          : v.email
          ? "low"
          : "medium",
    }));

    const summary = {
      totalVendors: analyzed.length,
      missingEmails: analyzed.filter((v) => !v.email).length,
      highRisk: analyzed.filter((v) => v.riskLevel === "high").length,
    };

    /* -------------------------------------------------
       RESPONSE (ALWAYS JSON)
    -------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      summary,
      vendors: analyzed,
    });
  } catch (err) {
    console.error("[ai-vendors-analyze]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "AI analysis failed",
    });
  }
}
