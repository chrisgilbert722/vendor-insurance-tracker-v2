// pages/api/onboarding/ai-vendors-analyze.js
// STEP 4 — AI Vendor Analysis API (UUID-SAFE + FRONTEND-CONTRACT SAFE)
// ✅ Accepts { orgId } OR { orgId, vendors: [] }
// ✅ NEVER 400 just because vendors array is missing
// ✅ Supabase auth required (Bearer token)
// ✅ Returns { ok:true, summary, vendors } always

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

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

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
       ✅ Frontend currently sends ONLY { orgId }
       ✅ vendors is OPTIONAL
    -------------------------------------------------- */
    const body = req.body || {};
    const orgId = body.orgId;

    // vendors is optional — default to empty array
    const vendors = Array.isArray(body.vendors) ? body.vendors : [];

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId",
      });
    }

    /* -------------------------------------------------
       ANALYSIS (LIGHTWEIGHT + SAFE)
       - If vendors not provided, we still return ok:true
       - This prevents Step 4 from hard failing / getting stuck
    -------------------------------------------------- */
    const analyzed = vendors.map((v) => {
      // tolerate multiple possible shapes
      const email =
        v.email || v.contactEmail || v.executionEmail || v.notificationEmail || "";

      const policyNumber = v.policyNumber || v.policy_number || v.policy || "";
      const expiration = v.expiration || v.expiration_date || v.expDate || "";

      const missingEmail = !email || !isValidEmail(email);
      const missingPolicy = !policyNumber;
      const missingExpiration = !expiration;

      const riskLevel =
        missingPolicy || missingExpiration ? "high" : missingEmail ? "medium" : "low";

      return {
        ...v,
        email,
        policyNumber,
        expiration,
        issues: {
          missingEmail,
          missingPolicy,
          missingExpiration,
        },
        riskLevel,
      };
    });

    const summary = {
      orgId,
      totalVendors: analyzed.length,
      missingEmails: analyzed.filter((v) => v.issues?.missingEmail).length,
      highRisk: analyzed.filter((v) => v.riskLevel === "high").length,
      skipped: analyzed.length === 0, // important: still ok:true even if skipped
    };

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
