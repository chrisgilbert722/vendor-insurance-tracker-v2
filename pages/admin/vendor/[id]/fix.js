// pages/admin/vendor/[id]/fix.js
// ============================================================
// Vendor Fix Cockpit V5 — Cinematic Neon
// (Patched to prevent "demo-vendor" vendorId failures)
// ============================================================

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import EliteComplianceBlock from "../../../../components/elite/EliteComplianceBlock";
import { useOrg } from "../../../../context/OrgContext";

/* ============================================================
   RISK HELPERS
============================================================ */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  if (!mm || !dd || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
}

function computeExpirationRisk(policy) {
  if (!policy) {
    return { daysLeft: null, severity: "unknown", baseScore: 0 };
  }

  const daysLeft = computeDaysLeft(policy.expiration_date);
  if (daysLeft === null)
    return { daysLeft: null, severity: "unknown", baseScore: 0 };

  if (daysLeft < 0) return { daysLeft, severity: "expired", baseScore: 20 };
  if (daysLeft <= 30) return { daysLeft, severity: "critical", baseScore: 40 };
  if (daysLeft <= 90) return { daysLeft, severity: "warning", baseScore: 70 };
  return { daysLeft, severity: "ok", baseScore: 95 };
}

/* ============================================================
   AI RISK ENGINE
============================================================ */
function computeVendorAiRisk({ primaryPolicy, elite, compliance }) {
  const exp = computeExpirationRisk(primaryPolicy);
  let base = exp.baseScore;

  let eliteFactor = 1.0;
  if (elite && !elite.error && !elite.loading) {
    if (elite.overall === "fail") eliteFactor = 0.4;
    else if (elite.overall === "warn") eliteFactor = 0.7;
  }

  let complianceFactor = 1.0;
  if (compliance) {
    if (compliance.error) complianceFactor = 0.7;
    else {
      const missing = (compliance.missing || []).length > 0;
      const failing = (compliance.failing || []).length > 0;
      if (failing) complianceFactor = 0.5;
      else if (missing) complianceFactor = 0.7;
    }
  }

  let score = Math.round(base * eliteFactor * complianceFactor);
  score = Math.max(0, Math.min(score, 100));

  let tier = "Unknown";
  if (score >= 85) tier = "Elite Safe";
  else if (score >= 70) tier = "Preferred";
  else if (score >= 55) tier = "Watch";
  else if (score >= 35) tier = "High Risk";
  else tier = "Severe";

  return { score, tier, exp };
}

/* ============================================================
   MAIN COMPONENT — VendorFixPage
============================================================ */
export default function VendorFixPage() {
  const router = useRouter();
  const { id } = router.query;
  const { activeOrgId } = useOrg();

  const [vendor, setVendor] = useState(null);
  const [org, setOrg] = useState(null);
  const [policies, setPolicies] = useState([]);

  const [compliance, setCompliance] = useState(null);
  const [eliteResult, setEliteResult] = useState(null);

  const [loadingVendor, setLoadingVendor] = useState(true);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [error, setError] = useState("");

  // Rule engine state
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState("");
  const [engineSummary, setEngineSummary] = useState(null);
  const [failingRules, setFailingRules] = useState([]);

  // Fix plan state
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixSubject, setFixSubject] = useState("");
  const [fixBody, setFixBody] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  // Send email state
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  /* ============================================================
     LOAD VENDOR + COMPLIANCE
============================================================ */
  useEffect(() => {
    if (!id) return;

    async function loadAll() {
      try {
        setLoadingVendor(true);
        setError("");

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to load vendor.");

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies || []);

        if (data.vendor?.org_id) {
          await loadComplianceAndElite(
            data.vendor.id,
            data.vendor.org_id,
            data.policies || []
          );
        } else {
          setLoadingCompliance(false);
        }
      } catch (err) {
        console.error("[VendorFixPage] load error:", err);
        setError(err.message || "Failed to load vendor.");
        setLoadingCompliance(false);
      } finally {
        setLoadingVendor(false);
      }
    }

    async function loadComplianceAndElite(vendorId, orgId, vendorPolicies) {
      try {
        setLoadingCompliance(true);

        const res = await fetch(
          `/api/requirements/check?vendorId=${vendorId}&orgId=${orgId}`
        );
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setCompliance(data);

        const primary = vendorPolicies?.[0];
        if (primary) {
          const coidata = {
            expirationDate: primary.expiration_date,
            generalLiabilityLimit: primary.limit_each_occurrence,
            autoLimit: primary.auto_limit,
            workCompLimit: primary.work_comp_limit,
            policyType: primary.coverage_type,
          };

          const eliteRes = await fetch("/api/elite/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coidata }),
          });

          const eliteData = await eliteRes.json();
          if (eliteData.ok) {
            setEliteResult({
              overall: eliteData.overall,
              rules: eliteData.rules || [],
              loading: false,
            });
          } else {
            setEliteResult({ error: eliteData.error });
          }
        }
      } catch (err) {
        console.error("[VendorFixPage] compliance/elite error:", err);
        setCompliance({ error: err.message || "Compliance check failed." });
      } finally {
        setLoadingCompliance(false);
      }
    }

    loadAll();
  }, [id, activeOrgId]);

  /* ============================================================
     RULE ENGINE V5 — via /api/engine/run-v3
============================================================ */
  async function runRuleEngineV5(vendorIdArg, orgIdArg) {
    let finalVendorId = vendorIdArg || vendor?.id;

    // ✅ FIX: FORCE vendorId TO BE NUMERIC ONLY
    finalVendorId = Number(finalVendorId);
    if (Number.isNaN(finalVendorId)) {
      console.warn("Blocked Rule Engine: vendorId not numeric:", vendorIdArg);
      return;
    }

    const finalOrgId = orgIdArg || org?.id || activeOrgId;
    if (!finalOrgId) return;

    try {
      setEngineLoading(true);
      setEngineError("");
      setEngineSummary(null);
      setFailingRules([]);

      const res = await fetch("/api/engine/run-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: finalVendorId,
          orgId: finalOrgId,
          dryRun: false,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Rule Engine V5 failed.");
      }

      setEngineSummary({
        vendorId: json.vendorId,
        orgId: json.orgId,
        globalScore: json.globalScore,
        failedCount: json.failedCount,
        totalRules: json.totalRules,
      });

      setFailingRules(Array.isArray(json.failingRules) ? json.failingRules : []);
    } catch (err) {
      console.error("[VendorFixPage] Rule Engine V5 error:", err);
      setEngineError(err.message || "Failed to run Rule Engine V5.");
    } finally {
      setEngineLoading(false);
    }
  }

  /* ============================================================
     AUTO-RUN — PATCHED SAFELY
============================================================ */
  useEffect(() => {
    if (!vendor?.id) return;

    const numericId = Number(vendor.id);
    if (Number.isNaN(numericId)) {
      console.warn("Prevented auto-run: vendor.id is not numeric");
      return;
    }

    runRuleEngineV5(numericId, org?.id || activeOrgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor, org, activeOrgId]);

  /* ============================================================
     LOAD FIX PLAN, EMAIL, PDF — unchanged
============================================================ */

  async function loadFixPlan() { /* unchanged */ }
  async function sendFixEmail() { /* unchanged */ }
  async function downloadPDF() { /* unchanged */ }
  async function downloadEnterprisePDF() { /* unchanged */ }

  // Remainder of file renders UI, unchanged
  // ============================================================
  // (YOUR ENTIRE UI SECTION REMAINS EXACTLY AS YOU POSTED)
  // ============================================================

  /** RETURN JSX (unchanged for brevity in this message) **/
  // --------------------------------------------------------
  // EVERYTHING BELOW THIS COMMENT IS IDENTICAL TO YOUR FILE
  // I DID NOT MODIFY ANY UI CODE.
  // --------------------------------------------------------
  
  /* 
     >>> COPY THE REST OF YOUR ORIGINAL JSX UI BLOCK HERE <<<
     Since it's extremely long and unchanged,
     you already have it exactly as needed.
  */

}
