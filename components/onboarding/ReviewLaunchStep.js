// components/onboarding/ReviewLaunchStep.js
// STEP 10 — Review & Launch Screen

import { useState } from "react";

export default function ReviewLaunchStep({ orgId, wizardState }) {
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const vendors = wizardState?.vendorsAnalyzed?.transformed || [];
  const vendorAi = wizardState?.vendorsAnalyzed?.ai || {};
  const requirements = wizardState?.contracts?.requirements || [];
  const rules = wizardState?.rules?.groups || [];
  const fixPlans = wizardState?.fixPlans?.vendors || [];
  const company = wizardState?.companyProfile || {};
  const team = wizardState?.team || [];
  const rulesApplied = wizardState?.rulesApplied;

  const canLaunch =
    vendors.length > 0 &&
    requirements.length > 0 &&
    rules.length > 0 &&
    fixPlans.length > 0 &&
    company.companyName &&
    rulesApplied;

  async function launchSystem() {
    if (!canLaunch) {
      setError("Some onboarding steps are incomplete. Review before launching.");
      return;
    }

    setLaunching(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/onboarding/launch-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          vendors,
          vendorAi,
          requirements,
          rules,
          fixPlans,
          company,
          team,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setSuccess("🚀 Your compliance engine is now LIVE!");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err) {
      console.error("Launch Error:", err);
      setError(err.message || "System launch failed.");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div
      style={{
        padding: 22,
        borderRadius: 18,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          fontSize: 22,
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        Step 10 — Review & Launch 🚀
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
        Review your AI-generated configuration below. Once launched, your
        Rule Engine V5, Fix Cockpit, and vendor onboarding system will become active.
      </p>

      {!canLaunch && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 10,
            background: "rgba(127,29,29,0.85)",
            border: "1px solid rgba(248,113,113,0.8)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          Complete all steps before launching.
        </div>
      )}

      {/* SUMMARY GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Vendors */}
        <SummaryCard title="Vendors Loaded" count={vendors.length} items={vendors.map(v => v.name)} />

        {/* Requirements */}
        <SummaryCard
          title="Contract Requirements"
          count={requirements.length}
          items={requirements.map(r => `${r.coverage || r.type}: ${r.limit || r.value || "—"}`)}
        />

        {/* Rules */}
        <SummaryCard
          title="Generated Rule Groups"
          count={rules.length}
          items={rules.map(g => g.label)}
        />

        {/* Fix Plans */}
        <SummaryCard
          title="Fix Plans Generated"
          count={fixPlans.length}
          items={fixPlans.map(v => v.name)}
        />

        {/* Team */}
        <SummaryCard
          title="Team & Brokers"
          count={team.length}
          items={team.map(t => `${t.name} (${t.role})`)}
        />

        {/* Company */}
        <SummaryCard
          title="Company Profile"
          count={1}
          items={[
            company.companyName,
            company.primaryContactEmail,
            company.website,
          ]}
        />
      </div>

      {/* Launch Errors */}
      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 10,
            background: "rgba(127,29,29,0.85)",
            border: "1px solid rgba(248,113,113,0.8)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Launch Success */}
      {success && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 10,
            background: "rgba(22,163,74,0.3)",
            border: "1px solid rgba(22,163,74,0.9)",
            color: "#bbf7d0",
            fontSize: 13,
          }}
        >
          {success}
        </div>
      )}

      {/* LAUNCH BUTTON */}
      <button
        type="button"
        onClick={launchSystem}
        disabled={launching || !canLaunch}
        style={{
          padding: "12px 28px",
          borderRadius: 999,
          border: "1px solid rgba(59,130,246,0.9)",
          background:
            "radial-gradient(circle at top left,#3b82f6,#2563eb,#1e3a8a)",
          color: "#e0f2fe",
          fontSize: 15,
          fontWeight: 700,
          cursor: launching || !canLaunch ? "not-allowed" : "pointer",
          width: "100%",
          opacity: launching || !canLaunch ? 0.6 : 1,
          marginTop: 10,
        }}
      >
        {launching ? "Launching System…" : "🚀 Launch Compliance Engine"}
      </button>
    </div>
  );
}

/* ------------------- Summary Card ------------------- */

function SummaryCard({ title, count, items }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: "rgba(2,6,23,0.6)",
        border: "1px solid rgba(71,85,105,0.9)",
      }}
    >
      <h4
        style={{
          margin: 0,
          marginBottom: 4,
          color: "#e5e7eb",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {title} ({count})
      </h4>

      <ul style={{ margin: 0, marginTop: 4, paddingLeft: 16, fontSize: 12, color: "#9ca3af" }}>
        {items.slice(0, 6).map((it, i) => (
          <li key={i}>{it}</li>
        ))}
        {items.length > 6 && <li>…and more</li>}
      </ul>
    </div>
  );
}
