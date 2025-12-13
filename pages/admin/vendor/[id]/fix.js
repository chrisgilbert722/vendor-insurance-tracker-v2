// pages/admin/vendor/[id]/fix.js
// ============================================================
// Vendor Fix Cockpit V5 — Alert → Fix → Resolve (WIRED)
// ============================================================

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import EliteComplianceBlock from "../../../../components/elite/EliteComplianceBlock";
import { useOrg } from "../../../../context/OrgContext";
import { resolveAlert } from "../../../../lib/alerts/resolveAlert";

// ---------- RISK HELPERS ----------
function parseExpiration(x) {
  if (!x) return null;
  const [mm, dd, yyyy] = String(x).split("/");
  if (!mm || !dd || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function daysLeft(x) {
  const d = parseExpiration(x);
  if (!d) return null;
  return Math.floor((d - new Date()) / 86400000);
}

function expirationRisk(policy) {
  if (!policy) return { score: 0, sev: "unknown", left: null };
  const left = daysLeft(policy.expiration_date);
  if (left === null) return { score: 0, sev: "unknown", left };
  if (left < 0) return { score: 20, sev: "expired", left };
  if (left <= 30) return { score: 40, sev: "critical", left };
  if (left <= 90) return { score: 70, sev: "warning", left };
  return { score: 95, sev: "ok", left };
}

function eliteRisk(e) {
  if (!e || e.error || e.loading) return { factor: 1, sev: "unknown" };
  if (e.overall === "fail") return { factor: 0.4, sev: "fail" };
  if (e.overall === "warn") return { factor: 0.7, sev: "warn" };
  return { factor: 1, sev: "pass" };
}

function complianceRisk(c) {
  if (!c || c.error) return { factor: 1, sev: "unknown" };
  const missing = (c.missing || []).length > 0;
  const failing = (c.failing || []).length > 0;
  if (failing) return { factor: 0.5, sev: "failing" };
  if (missing) return { factor: 0.7, sev: "missing" };
  return { factor: 1, sev: "ok" };
}

function ruleRisk(r) {
  if (!r) return { factor: 1, sev: "unknown", score: null };
  const s = r.globalScore;
  if (s == null) return { factor: 1, sev: "unknown", score: null };
  if (s >= 85) return { factor: 1, sev: "elite", score: s };
  if (s >= 70) return { factor: 0.9, sev: "good", score: s };
  if (s >= 50) return { factor: 0.7, sev: "watch", score: s };
  return { factor: 0.4, sev: "critical", score: s };
}

function computeUnified(primary, elite, comp, rule) {
  const exp = expirationRisk(primary);
  const e = eliteRisk(elite);
  const c = complianceRisk(comp);
  const r = ruleRisk(rule);

  let s = exp.score * e.factor * c.factor * r.factor;
  s = Math.max(0, Math.min(100, Math.round(s)));

  let tier = "Severe";
  if (s >= 85) tier = "Elite Safe";
  else if (s >= 70) tier = "Preferred";
  else if (s >= 55) tier = "Watch";
  else if (s >= 35) tier = "High Risk";

  return { score: s, tier, exp, e, c, r };
}

export default function VendorFixPage() {
  const router = useRouter();
  const { id, alertId } = router.query;
  const { activeOrgId } = useOrg();

  const [vendor, setVendor] = useState(null);
  const [org, setOrg] = useState(null);
  const [policies, setPolicies] = useState([]);

  const [compliance, setCompliance] = useState(null);
  const [eliteResult, setEliteResult] = useState(null);
  const [engineSummary, setEngineSummary] = useState(null);
  const [failingRules, setFailingRules] = useState([]);

  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState("");

  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixBody, setFixBody] = useState("");
  const [fixSubject, setFixSubject] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  const [loadingVendor, setLoadingVendor] = useState(true);
  const [error, setError] = useState("");

  const isDemo = !id || Number.isNaN(Number(id));

  // ---------- ALERT RESOLUTION ----------
  async function handleResolveAlert(type) {
    if (!alertId || !org?.id) return;
    try {
      await resolveAlert({
        orgId: org.id,
        alertId,
        resolutionType: type,
      });

      // Remove alert context after resolution
      router.replace(`/admin/vendor/${vendor.id}/fix`, undefined, {
        shallow: true,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to resolve alert");
    }
  }

  // ---------- LOAD VENDOR ----------
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoadingVendor(true);
        setError("");

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies || []);

        if (data.vendor?.org_id) {
          const r = await fetch(
            `/api/requirements/check?vendorId=${data.vendor.id}&orgId=${data.vendor.org_id}`
          );
          const comp = await r.json();
          setCompliance(comp.ok ? comp : { error: comp.error });

          const p = data.policies?.[0];
          if (p) {
            const eliteRes = await fetch("/api/elite/evaluate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                coidata: {
                  expirationDate: p.expiration_date,
                  generalLiabilityLimit: p.limit_each_occurrence,
                  autoLimit: p.auto_limit,
                  workCompLimit: p.work_comp_limit,
                  policyType: p.coverage_type,
                },
              }),
            });
            const e = await eliteRes.json();
            setEliteResult(
              e.ok ? { overall: e.overall, rules: e.rules || [] } : { error: e.error }
            );
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load vendor.");
      } finally {
        setLoadingVendor(false);
      }
    })();
  }, [id, activeOrgId]);

  // ---------- FIX PLAN ----------
  async function loadFixPlan() {
    if (!vendor || !org) return;
    if (isDemo) {
      setFixError("Fix Plan disabled for demo vendors.");
      return;
    }
    try {
      setFixLoading(true);
      setFixError("");
      setFixSteps([]);
      setFixBody("");
      setFixSubject("");
      setFixInternalNotes("");

      const res = await fetch(
        `/api/vendor/fix-plan?vendorId=${vendor.id}&orgId=${org.id}`
      );
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);

      setFixSteps(d.steps || []);
      setFixBody(d.vendorEmailBody || "");
      setFixSubject(d.vendorEmailSubject || "");
      setFixInternalNotes(d.internalNotes || "");
    } catch (err) {
      setFixError(err.message || "Failed to load fix plan.");
    } finally {
      setFixLoading(false);
    }
  }

  // ---------- EARLY RETURNS ----------
  if (loadingVendor) {
    return <div style={{ padding: 40, background: "#020617", color: "#e5e7eb" }}>Loading vendor…</div>;
  }

  if (error) {
    return <div style={{ padding: 40, background: "#020617", color: "#fecaca" }}>{error}</div>;
  }

  if (!vendor) {
    return <div style={{ padding: 40, background: "#020617", color: "#e5e7eb" }}>Vendor not found.</div>;
  }

  const primary = policies[0] || null;
  const risk = computeUnified(primary, eliteResult, compliance, engineSummary);

  return (
    <div style={{ minHeight: "100vh", background: "#020617", padding: 32, color: "#e5e7eb" }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Fix Cockpit — Elite Risk Intelligence</h1>

      {/* ALERT CONTEXT ACTIONS */}
      {alertId && (
        <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
          <button
            onClick={() => handleResolveAlert("resolved")}
            style={{ padding: "8px 16px", borderRadius: 999, background: "#16a34a", color: "#ecfdf5" }}
          >
            ✅ Resolve Alert
          </button>
          <button
            onClick={() => handleResolveAlert("acknowledged")}
            style={{ padding: "8px 16px", borderRadius: 999, background: "#334155", color: "#e5e7eb" }}
          >
            ⚠️ Acknowledge
          </button>
        </div>
      )}

      {/* FIX PLAN */}
      <button
        onClick={loadFixPlan}
        disabled={fixLoading}
        style={{ marginBottom: 16, padding: "8px 16px", borderRadius: 999 }}
      >
        {fixLoading ? "Generating…" : "⚡ Generate Fix Plan"}
      </button>

      {fixError && <div style={{ color: "#fca5a5" }}>{fixError}</div>}

      {fixSteps.map((s, i) => (
        <div key={i} style={{ padding: 10, border: "1px solid #334155", borderRadius: 12, marginBottom: 8 }}>
          {s}
        </div>
      ))}

      <div style={{ marginTop: 24 }}>
        <strong>Unified Risk Score:</strong> {risk.score} ({risk.tier})
      </div>
    </div>
  );
}
