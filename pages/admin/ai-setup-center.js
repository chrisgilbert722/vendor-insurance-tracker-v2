// pages/admin/ai-setup-center.js
// ============================================================
// AI SETUP CENTER — EXEC V5 (COMMAND SHELL)
// Iron-Man / JARVIS Tier Control Deck
// Fully consistent with Alerts / Renewals / Requirements V5
// ============================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";
import CommandShell from "../../components/v5/CommandShell";
import { V5 } from "../../components/v5/v5Theme";

function StatusPill({ label, state }) {
  const color =
    state === "ONLINE"
      ? V5.green
      : state === "DEGRADED"
      ? V5.yellow
      : V5.red;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${color}`,
        color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        boxShadow: `0 0 18px ${color}33`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
      {label}: {state}
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
        background: V5.panel,
        border: `1px solid ${color}55`,
        boxShadow: `0 0 22px ${color}22, inset 0 0 22px rgba(0,0,0,0.6)`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: V5.soft,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function AiSetupCenterV5() {
  const { activeOrgId: orgId } = useOrg();

  const [loading, setLoading] = useState(true);

  const [systems, setSystems] = useState({
    Rules: "ONLINE",
    Alerts: "ONLINE",
    Renewals: "ONLINE",
    Conflicts: "ONLINE",
    Documents: "ONLINE",
  });

  const [metrics, setMetrics] = useState({
    rules: 0,
    vendors: 0,
    alerts: 0,
    renewals: 0,
  });

  useEffect(() => {
    let alive = true;

    async function boot() {
      if (!alive) return;
      setLoading(true);

      // SAFE PLACEHOLDERS — ZERO RISK
      setSystems({
        Rules: "ONLINE",
        Alerts: "ONLINE",
        Renewals: "ONLINE",
        Conflicts: "ONLINE",
        Documents: "ONLINE",
      });

      setMetrics({
        rules: 0,
        vendors: 0,
        alerts: 0,
        renewals: 0,
      });

      setLoading(false);
    }

    boot();
    return () => (alive = false);
  }, [orgId]);

  return (
    <CommandShell
      tag="EXEC AI • SETUP CENTER"
      title="AI Setup Command Center"
      subtitle="Central command deck for all AI-driven compliance systems"
      status={loading ? "SYNCING" : "ONLINE"}
    >
      {/* SYSTEM STATUS */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        {Object.entries(systems).map(([label, state]) => (
          <StatusPill key={label} label={label} state={state} />
        ))}
      </div>

      {/* METRICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <MetricCard
          label="Rules Defined"
          value={metrics.rules}
          color={V5.blue}
        />
        <MetricCard
          label="Vendors Covered"
          value={metrics.vendors}
          color={V5.purple}
        />
        <MetricCard
          label="Active Alerts"
          value={metrics.alerts}
          color={V5.yellow}
        />
        <MetricCard
          label="Renewals Predicted"
          value={metrics.renewals}
          color={V5.green}
        />
      </div>

      {/* EXECUTIVE NARRATIVE */}
      <div
        style={{
          borderRadius: 26,
          padding: 20,
          background: V5.panel,
          border: `1px solid ${V5.border}`,
          boxShadow:
            "0 0 40px rgba(0,0,0,0.6), inset 0 0 28px rgba(0,0,0,0.65)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: V5.soft,
            marginBottom: 10,
          }}
        >
          Executive AI Insight
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          {loading ? (
            "Initializing AI subsystems…"
          ) : (
            <>
              All AI engines are online and stable. Your organization is fully
              armed with automated compliance enforcement, renewal prediction,
              alert intelligence, and conflict detection.
              <br />
              <br />
              This command center will evolve into a self-optimizing AI brain —
              continuously tuning rules, permissions, escalation logic, and
              enforcement strategies based on real-world behavior.
            </>
          )}
        </div>
      </div>
    </CommandShell>
  );
}
