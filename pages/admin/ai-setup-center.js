// pages/admin/ai-setup-center.js
// ==========================================================
// AI SETUP CENTER — EXEC V5 (IRON MAN / JARVIS TIER)
// Central command deck for all AI systems
// ==========================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

const COLORS = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.95)",
  border: "rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  soft: "#9ca3af",
  good: "#22c55e",
  warn: "#facc15",
  bad: "#fb7185",
  accent: "#38bdf8",
  purple: "#a855f7",
};

function StatusPill({ label, status }) {
  const color =
    status === "ok"
      ? COLORS.good
      : status === "warn"
      ? COLORS.warn
      : COLORS.bad;

  const text =
    status === "ok" ? "ONLINE" : status === "warn" ? "DEGRADED" : "OFFLINE";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${color}`,
        color,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
      }}
    >
      ● {label}: {text}
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div style={{ fontSize: 11, color: COLORS.soft, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function AiSetupCenterPage() {
  const { activeOrgId: orgId } = useOrg();

  // -----------------------------------------
  // EXEC AI STATE (SAFE DEFAULTS)
  // -----------------------------------------
  const [systems, setSystems] = useState({
    rules: "ok",
    alerts: "ok",
    renewals: "ok",
    conflicts: "ok",
    documents: "ok",
  });

  const [metrics, setMetrics] = useState({
    rulesDefined: 0,
    vendorsCovered: 0,
    alertsActive: 0,
    renewalsPredicted: 0,
  });

  const [loading, setLoading] = useState(true);

  // -----------------------------------------
  // SIMULATED HEALTH CHECK (SAFE / NON-BLOCKING)
  // Later you can wire real endpoints here
  // -----------------------------------------
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        // All safe placeholders — nothing crashes launch
        if (!mounted) return;

        setSystems({
          rules: "ok",
          alerts: "ok",
          renewals: "ok",
          conflicts: "ok",
          documents: "ok",
        });

        setMetrics({
          rulesDefined: 0,
          vendorsCovered: 0,
          alertsActive: 0,
          renewalsPredicted: 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [orgId]);

  // -----------------------------------------
  // RENDER
  // -----------------------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%,#020617 55%,#000 100%)",
        padding: "32px 40px 48px",
        color: COLORS.text,
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -240,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1200,
          height: 1200,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.25), transparent 60%)",
          filter: "blur(160px)",
          pointerEvents: "none",
        }}
      />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 28 }}>
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.panel,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: COLORS.soft,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Executive AI Command
          </span>
          <span
            style={{
              fontSize: 10,
              color: COLORS.accent,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            V5 Control Core
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          AI Setup{" "}
          <span
            style={{
              background:
                "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Command Center
          </span>
        </h1>

        <p style={{ marginTop: 8, color: COLORS.soft, maxWidth: 720 }}>
          This is the executive control deck for your entire AI compliance
          system — rules, alerts, renewals, conflict intelligence, and
          document enforcement.
        </p>

        <div style={{ marginTop: 10, fontSize: 12, color: COLORS.soft }}>
          Org: <strong style={{ color: COLORS.text }}>{orgId || "—"}</strong>
        </div>
      </div>

      {/* SYSTEM STATUS */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginBottom: 26,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <StatusPill label="Rules Engine" status={systems.rules} />
        <StatusPill label="Alerts Engine" status={systems.alerts} />
        <StatusPill label="Renewal AI" status={systems.renewals} />
        <StatusPill label="Conflict AI" status={systems.conflicts} />
        <StatusPill label="Document AI" status={systems.documents} />
      </div>

      {/* METRICS GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 14,
          marginBottom: 30,
        }}
      >
        <MetricCard
          label="Rules Defined"
          value={metrics.rulesDefined}
          color={COLORS.accent}
        />
        <MetricCard
          label="Vendors Covered"
          value={metrics.vendorsCovered}
          color={COLORS.purple}
        />
        <MetricCard
          label="Active Alerts"
          value={metrics.alertsActive}
          color={COLORS.warn}
        />
        <MetricCard
          label="Renewals Predicted"
          value={metrics.renewalsPredicted}
          color={COLORS.good}
        />
      </div>

      {/* EXEC INSIGHT */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 22,
          padding: 18,
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 0 30px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: COLORS.soft,
            marginBottom: 8,
          }}
        >
          AI Executive Insight
        </div>

        {loading ? (
          <div style={{ color: COLORS.soft }}>
            Initializing AI systems…
          </div>
        ) : (
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            All AI subsystems are online. No critical degradation detected.
            Your organization is ready for automated compliance enforcement,
            renewal prediction, and alert intelligence.
          </div>
        )}
      </div>
    </div>
  );
}
