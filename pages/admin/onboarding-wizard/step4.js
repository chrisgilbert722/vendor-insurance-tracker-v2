// pages/admin/onboarding-wizard/step4.js
// =============================================================
// AI ONBOARDING WIZARD — STEP 4
// Vendor Setup Timeline + Bulk Status Dashboard
// =============================================================

import { useEffect, useState } from "react";
import ToastV2 from "../../../components/ToastV2";

export default function OnboardingWizardStep4() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });
  // -----------------------------------------------------------
  // LOAD ALL VENDORS + ONBOARDING STATUS
  // -----------------------------------------------------------
  async function loadVendors() {
    try {
      setLoading(true);

      const res = await fetch("/api/onboarding/vendors-status");
      const json = await res.json();

      if (!json.ok) throw new Error(json.error);

      setVendors(json.vendors || []);

    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVendors();
  }, []);
  // -----------------------------------------------------------
  // LOAD SYSTEM TIMELINE FOR SELECTED VENDOR
  // -----------------------------------------------------------
  async function loadTimeline(vendorId) {
    try {
      const res = await fetch(`/api/onboarding/vendor-timeline?vendorId=${vendorId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setTimeline(json.events || []);
      setSelectedVendor(vendorId);
    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: "Failed loading timeline." });
    }
  }
  // -----------------------------------------------------------
  // COMPUTE SETUP COMPLETION SCORE
  // -----------------------------------------------------------
  function computeScore(v) {
    let score = 0;

    if (v.last_uploaded_coi) score += 40;

    if (v.coverage_ok) score += 20;
    if (v.endorsements_ok) score += 20;

    if (!v.hasCriticalAlerts) score += 20;

    return score;
  }
  function renderVendorGrid() {
    if (!vendors.length) return <div>No vendors to display.</div>;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
          gap: 20,
          marginTop: 20,
        }}
      >
        {vendors.map((v) => {
          const score = computeScore(v);
          const color =
            score === 100
              ? "#10b981"
              : score >= 70
              ? "#38bdf8"
              : score >= 40
              ? "#fbbf24"
              : "#ef4444";

          return (
            <div
              key={v.id}
              onClick={() => loadTimeline(v.id)}
              style={{
                padding: 20,
                borderRadius: 16,
                background: "rgba(15,23,42,0.85)",
                border: "1px solid rgba(148,163,184,0.25)",
                cursor: "pointer",
                transition: "0.2s ease",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                {v.vendor_name}
              </div>

              {/* SCORE BUBBLE */}
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: 12,
                  background: color,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {score}% Ready
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: "#9ca3af" }}>
                <div>
                  {v.last_uploaded_coi ? "📄 COI Uploaded" : "⚠ Missing COI"}
                </div>
                <div>
                  {v.coverage_ok ? "✔ Coverage OK" : "⚠ Coverage Issues"}
                </div>
                <div>
                  {v.endorsements_ok
                    ? "✔ Endorsements OK"
                    : "⚠ Missing Endorsements"}
                </div>
                <div>
                  {v.hasCriticalAlerts
                    ? "❌ Critical Alerts Found"
                    : "✔ No Critical Alerts"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  function renderTimelineDrawer() {
    if (!selectedVendor) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 380,
          height: "100vh",
          background: "rgba(15,23,42,0.95)",
          borderLeft: "1px solid rgba(148,163,184,0.4)",
          padding: 20,
          overflowY: "auto",
          zIndex: 999,
        }}
      >
        <button
          onClick={() => setSelectedVendor(null)}
          style={{
            marginBottom: 20,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "rgba(31,41,55,0.8)",
            color: "#9ca3af",
          }}
        >
          ← Close
        </button>

        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Vendor Timeline</h2>

        {timeline.map((ev, idx) => (
          <div
            key={idx}
            style={{
              padding: 10,
              borderBottom: "1px solid rgba(75,85,99,0.3)",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {new Date(ev.created_at).toLocaleString()}
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>{ev.message}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ padding: 40, color: "white" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>
        AI Onboarding Wizard — Step 4  
      </h1>
      <p style={{ fontSize: 14, color: "#9ca3af" }}>
        Track vendor onboarding progress and document readiness.
      </p>

      {loading ? (
        <div>Loading…</div>
      ) : (
        renderVendorGrid()
      )}

      {renderTimelineDrawer()}

      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
