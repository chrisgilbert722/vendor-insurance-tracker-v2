// pages/admin/vendor/[id]/fix.js
// ============================================================
// Vendor Fix Cockpit V5 — Cinematic Neon
// Fully Patched: Correct fix-plan endpoint + correct ID handling
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
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
}

function computeExpirationRisk(policy) {
  if (!policy) return { daysLeft: null, severity: "unknown", baseScore: 0 };

  const daysLeft = computeDaysLeft(policy.expiration_date);
  if (daysLeft === null) return { daysLeft: null, severity: "unknown", baseScore: 0 };

  if (daysLeft < 0) return { daysLeft, severity: "expired", baseScore: 20 };
  if (daysLeft <= 30) return { daysLeft, severity: "critical", baseScore: 40 };
  if (daysLeft <= 90) return { daysLeft, severity: "warning", baseScore: 70 };
  return { daysLeft, severity: "ok", baseScore: 95 };
}

function computeVendorAiRisk({ primaryPolicy, elite, compliance }) {
  const exp = computeExpirationRisk(primaryPolicy);
  let base = exp.baseScore;

  let eliteFactor = elite?.overall === "fail" ? 0.4 : elite?.overall === "warn" ? 0.7 : 1.0;

  let complianceFactor = 1.0;
  if (compliance) {
    const missing = (compliance.missing || []).length > 0;
    const failing = (compliance.failing || []).length > 0;
    if (failing) complianceFactor = 0.5;
    else if (missing) complianceFactor = 0.7;
  }

  let score = Math.round(base * eliteFactor * complianceFactor);
  score = Math.min(Math.max(score, 0), 100);

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
     LOAD VENDOR + POLICIES + COMPLIANCE + ELITE ENGINE
============================================================ */
  useEffect(() => {
    if (!id) return;

    async function loadAll() {
      try {
        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies || []);

        if (data.vendor?.org_id) {
          await loadComplianceAndElite(data.vendor.id, data.vendor.org_id, data.policies);
        } else {
          setLoadingCompliance(false);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingVendor(false);
      }
    }

    async function loadComplianceAndElite(vendorId, orgId, policyList) {
      try {
        const res = await fetch(`/api/requirements/check?vendorId=${vendorId}&orgId=${orgId}`);
        const data = await res.json();

        if (!data.ok) throw new Error(data.error);
        setCompliance(data);

        const primary = policyList?.[0];
        if (primary) {
          const eliteRes = await fetch("/api/elite/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              coidata: {
                expirationDate: primary.expiration_date,
                generalLiabilityLimit: primary.limit_each_occurrence,
                autoLimit: primary.auto_limit,
                workCompLimit: primary.work_comp_limit,
                policyType: primary.coverage_type,
              },
            }),
          });

          const eliteJson = await eliteRes.json();
          setEliteResult(eliteJson.ok ? eliteJson : { error: eliteJson.error });
        }
      } catch (err) {
        setCompliance({ error: err.message });
      } finally {
        setLoadingCompliance(false);
      }
    }

    loadAll();
  }, [id, activeOrgId]);

  /* ============================================================
     RULE ENGINE V5 — Correct ID Handling
============================================================ */
  async function runRuleEngineV5(vendorIdArg, orgIdArg) {
    const vendorId = Number(vendorIdArg || vendor?.id);
    const orgId = Number(orgIdArg || org?.id || activeOrgId);

    if (!vendorId || !orgId || Number.isNaN(vendorId) || Number.isNaN(orgId)) {
      console.warn("Invalid IDs for rule engine:", { vendorId, orgId });
      return;
    }

    try {
      setEngineLoading(true);
      setEngineError("");

      const res = await fetch("/api/engine/run-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, orgId, dryRun: false }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setEngineSummary(json);
      setFailingRules(json.failingRules || []);
    } catch (err) {
      setEngineError(err.message);
    } finally {
      setEngineLoading(false);
    }
  }

  /* ============================================================
     AUTO-RUN ENGINE
============================================================ */
  useEffect(() => {
    if (!vendor || !org) return;

    const vendorId = Number(vendor.id);
    const orgId = Number(org.id || activeOrgId);
    if (!vendorId || !orgId) return;

    runRuleEngineV5(vendorId, orgId);
  }, [vendor, org, activeOrgId]);

  /* ============================================================
     FIX PLAN — FINAL PATCHED VERSION
============================================================ */
  async function loadFixPlan() {
    if (!vendor?.id || !org?.id) {
      setFixError("Vendor or Org not loaded.");
      return;
    }

    const vendorId = Number(vendor.id);
    const orgId = Number(org.id);

    try {
      setFixLoading(true);
      setFixError("");

      const res = await fetch(`/api/vendor/fix-plan?vendorId=${vendorId}&orgId=${orgId}`);
      const data = await res.json();

      if (!data.ok) throw new Error(data.error);

      setFixSteps(data.steps || []);
      setFixSubject(data.vendorEmailSubject || "");
      setFixBody(data.vendorEmailBody || "");
      setFixInternalNotes(data.internalNotes || "");
    } catch (err) {
      setFixError(err.message);
    } finally {
      setFixLoading(false);
    }
  }

  /* ============================================================
     SEND EMAIL
============================================================ */
  async function sendFixEmail() {
    if (!vendor?.id || !org?.id) return;

    const vendorId = Number(vendor.id);
    const orgId = Number(org.id);

    try {
      setSendLoading(true);

      const res = await fetch("/api/vendor/send-fix-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          orgId,
          subject: fixSubject,
          body: fixBody,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setSendSuccess(data.message);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSendLoading(false);
    }
  }

  /* ============================================================
     UI RENDER
============================================================ */
  if (loadingVendor) return <div style={{ padding: 40, color: "#fff" }}>Loading…</div>;
  if (error) return <div style={{ padding: 40, color: "#ff8888" }}>Error: {error}</div>;
  if (!vendor) return <div>Vendor not found</div>;

  const primaryPolicy = policies[0] || null;
  const aiRisk = computeVendorAiRisk({ primaryPolicy, elite: eliteResult, compliance });
  const allRequirements = vendor.requirements_json || [];

  return (
    <div style={{ minHeight: "100vh", color: "#e5e7eb", padding: "30px 40px" }}>
      <div style={{ marginBottom: 18 }}>
        <h1>Fix Plan for {vendor.name}</h1>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        <button onClick={loadFixPlan} disabled={fixLoading}>
          {fixLoading ? "Loading…" : "⚡ Generate Fix Plan"}
        </button>
      </div>

      {fixError && <div style={{ color: "salmon" }}>{fixError}</div>}

      {fixSteps.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Action Steps</h3>
          <ul>
            {fixSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {fixBody && (
        <div style={{ marginTop: 20 }}>
          <h3>Email to Vendor</h3>
          <pre>{fixBody}</pre>
        </div>
      )}
    </div>
  );
}
