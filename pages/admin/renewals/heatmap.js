// pages/admin/renewals/heatmap.js
// ==========================================================
// RENEWAL INTELLIGENCE V3 — STEP 2
// Renewal Heatmap UI (Cockpit V9 Weaponized)
// Uses /api/renewals/status for live renewal urgency.
// ==========================================================

import { useEffect, useState, useMemo } from "react";
import { useOrg } from "../../../context/OrgContext";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";

export default function RenewalHeatmapPage() {
  const { activeOrgId: orgId } = useOrg();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD RENEWAL STATUS FROM API
  // -----------------------------------------------------------
  async function loadStatus() {
    try {
      setLoading(true);
      const res = await fetch(`/api/renewals/status?orgId=${orgId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed loading renewal status");
      setVendors(json.vendors || []);
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId) loadStatus();
  }, [orgId]);

  // -----------------------------------------------------------
  // BUCKET LOGIC
  // -----------------------------------------------------------
  const buckets = useMemo(() => {
    const s = {
      expired: [],
      within7: [],
      within30: [],
      within90: [],
      healthy: [],
      missing: [],
    };

    vendors.forEach((v) => {
      if (v.daysToExpire === null) s.missing.push(v);
      else if (v.daysToExpire < 0) s.expired.push(v);
      else if (v.daysToExpire <= 7) s.within7.push(v);
      else if (v.daysToExpire <= 30) s.within30.push(v);
      else if (v.daysToExpire <= 90) s.within90.push(v);
      else s.healthy.push(v);
    });

    return s;
  }, [vendors]);

  // -----------------------------------------------------------
  // BUCKET DEFINITIONS (Color-coded)
  // -----------------------------------------------------------
  const BUCKETS = [
    {
      key: "expired",
      label: "Expired",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.15)",
      description: "Renewals past due. Immediate action required.",
    },
    {
      key: "within7",
      label: "0–7 Days",
      color: "#f97316",
      bg: "rgba(249,115,22,0.15)",
      description: "Renewal imminent. High urgency.",
    },
    {
      key: "within30",
      label: "8–30 Days",
      color: "#facc15",
      bg: "rgba(250,204,21,0.15)",
      description: "Due this month. Renewal cycle active.",
    },
    {
      key: "within90",
      label: "31–90 Days",
      color: "#38bdf8",
      bg: "rgba(56,189,248,0.15)",
      description: "Medium horizon.",
    },
    {
      key: "healthy",
      label: "90+ Days",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.15)",
      description: "Low urgency. Good standing.",
    },
    {
      key: "missing",
      label: "Missing",
      color: "#6b7280",
      bg: "rgba(107,114,128,0.18)",
      description: "Missing expiration date — needs cleanup.",
    },
  ];

  // -----------------------------------------------------------
  // SINGLE BUCKET RENDERER
  // -----------------------------------------------------------
  function renderBucket(bucket) {
    const list = buckets[bucket.key] || [];

    return (
      <div
        key={bucket.key}
        style={{
          borderRadius: 18,
          padding: 18,
          background: "rgba(15,23,42,0.9)",
          border: `1px solid ${bucket.color}60`,
          boxShadow: `0 0 24px ${bucket.color}45, inset 0 0 18px rgba(15,23,42,0.9)`,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: bucket.color }}>
              {bucket.label}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {bucket.description}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "999px",
              background: bucket.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: bucket.color,
            }}
          >
            {list.length}
          </div>
        </div>

        {/* LIST OF VENDORS */}
        {list.length === 0 ? (
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            No vendors in this range.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {list.map((v) => (
              <div
                key={v.vendorId}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(15,23,42,0.96)",
                  border: "1px solid rgba(148,163,184,0.4)",
                  fontSize: 11,
                  color: "#e5e7eb",
                  whiteSpace: "nowrap",
                }}
              >
                {v.vendorName} –{" "}
                {v.daysToExpire === null
                  ? "No exp"
                  : v.daysToExpire < 0
                  ? `${Math.abs(v.daysToExpire)}d overdue`
                  : `${v.daysToExpire}d`}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------
  // MAIN PAGE RENDER
  // -----------------------------------------------------------
  return (
    <CockpitWizardLayout>
      <div style={{ position: "relative", zIndex: 3 }}>
        <h1
          style={{
            fontSize: 30,
            marginBottom: 10,
            background: "linear-gradient(90deg,#38bdf8,#facc15,#ef4444)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Renewal Heatmap
        </h1>

        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
          A cockpit view of renewal urgency across your entire portfolio.
        </p>

        {/* REFRESH */}
        <button
          onClick={loadStatus}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            marginBottom: 16,
            background: loading
              ? "rgba(56,189,248,0.35)"
              : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            border: "1px solid rgba(56,189,248,0.8)",
            color: "white",
            fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>

        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {BUCKETS.map((b) => renderBucket(b))}
        </div>

        <ToastV2
          open={toast.open}
          type={toast.type}
          message={toast.message}
          onClose={() =>
            setToast((prev) => ({
              ...prev,
              open: false,
            }))
          }
        />
      </div>
    </CockpitWizardLayout>
  );
}
