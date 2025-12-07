// pages/admin/onboarding-wizard/step4.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 4
// Bulk Onboarding Dashboard + Vendor Timeline Viewer
// FULL COCKPIT V9 WEAPONIZED THEME
// ==========================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";

export default function OnboardingWizardStep4() {
  const router = useRouter();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [timeline, setTimeline] = useState([]);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD BULK VENDOR STATUS
  // -----------------------------------------------------------
  async function loadStatus() {
    try {
      const res = await fetch("/api/onboarding/vendors-status");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed loading status.");
      setVendors(json.vendors || []);
    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  // -----------------------------------------------------------
  // LOAD TIMELINE FOR SELECTED VENDOR
  // -----------------------------------------------------------
  async function loadTimeline(vendorId) {
    try {
      const res = await fetch(`/api/onboarding/vendor-timeline?vendorId=${vendorId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed loading timeline.");
      setTimeline(json.events || []);
      setTimelineOpen(true);
    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: err.message });
    }
  }

  // -----------------------------------------------------------
  // COMPUTE READINESS SCORE
  // -----------------------------------------------------------
  function score(v) {
    let s = 0;
    if (v.last_uploaded_coi) s += 40;
    if (v.coverage_ok) s += 20;
    if (v.endorsements_ok) s += 20;
    if (!v.hasCriticalAlerts) s += 20;
    return s;
  }

  // -----------------------------------------------------------
  // TIMELINE DRAWER (Cockpit Weaponized)
  // -----------------------------------------------------------
  function renderTimelineDrawer() {
    if (!timelineOpen) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 430,
          height: "100vh",
          background: "rgba(15,23,42,0.96)",
          borderLeft: "1px solid rgba(80,120,255,0.35)",
          boxShadow: "-14px 0 40px rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          padding: 22,
          overflowY: "auto",
          zIndex: 999,
        }}
      >
        <button
          onClick={() => setTimelineOpen(false)}
          style={{
            padding: "6px 12px",
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.5)",
            background: "rgba(31,41,55,0.85)",
            color: "white",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          ← Close Timeline
        </button>

        <h2
          style={{
            fontSize: 22,
            background: "linear-gradient(90deg,#38bdf8,#a78bfa)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            marginBottom: 16,
          }}
        >
          Vendor Timeline
        </h2>

        {timeline.map((ev, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 14,
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(80,120,255,0.25)",
              boxShadow:
                "0 0 18px rgba(64,106,255,0.15), inset 0 0 12px rgba(15,23,42,0.8)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                marginBottom: 6,
                color: "#9ca3af",
              }}
            >
              {new Date(ev.created_at).toLocaleString()}
            </div>
            <div style={{ fontSize: 14, color: "#e5e7eb" }}>{ev.message}</div>
          </div>
        ))}
      </div>
    );
  }

  // -----------------------------------------------------------
  // VENDOR GRID (WEAPONIZED COCKPIT)
  // -----------------------------------------------------------
  function renderVendorGrid() {
    if (loading) return <div>Loading…</div>;
    if (!vendors.length) return <div>No vendors found.</div>;

    return (
      <div
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: 22,
        }}
      >
        {vendors.map((v) => {
          const s = score(v);

          const color =
            s === 100
              ? "#10b981"
              : s >= 70
              ? "#38bdf8"
              : s >= 40
              ? "#fbbf24"
              : "#ef4444";

          return (
            <div
              key={v.id}
              onClick={() => loadTimeline(v.id)}
              style={{
                padding: 22,
                borderRadius: 20,
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(80,120,255,0.35)",
                boxShadow:
                  "0 0 30px rgba(64,106,255,0.25), inset 0 0 20px rgba(15,23,42,0.85)",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                {v.vendor_name}
              </div>

              {/* SCORE BADGE */}
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: 12,
                  background: color,
                  color: "white",
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {s}% Ready
              </div>

              <div style={{ fontSize: 13, color: "#9ca3af" }}>
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
                    ? "❌ Critical Alerts"
                    : "✔ No Critical Alerts"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // -----------------------------------------------------------
  // NAVIGATION
  // -----------------------------------------------------------
  function goBack() {
    router.push("/admin/onboarding-wizard/step3");
  }

  function goNext() {
    router.push("/admin/onboarding-wizard/step5");
  }

  // -----------------------------------------------------------
  // PAGE OUTPUT (COCKPIT WRAPPED)
  // -----------------------------------------------------------
  return (
    <CockpitWizardLayout>
      <div style={{ position: "relative", zIndex: 3 }}>
        <h1
          style={{
            fontSize: 30,
            background: "linear-gradient(90deg,#38bdf8,#a78bfa,#e5e7eb)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            marginBottom: 10,
          }}
        >
          AI Onboarding Wizard — Step 4
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: 18, fontSize: 13 }}>
          Monitor vendor onboarding readiness and review their timeline events.
        </p>

        {/* NAVIGATION */}
        <button
          onClick={goBack}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(31,41,55,0.75)",
            border: "1px solid rgba(148,163,184,0.5)",
            color: "white",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          ← Back to Step 3
        </button>

        {/* VENDOR GRID */}
        {renderVendorGrid()}

        {/* TIMELINE DRAWER */}
        {renderTimelineDrawer()}

        {/* NEXT BUTTON */}
        <button
          onClick={goNext}
          style={{
            marginTop: 30,
            padding: "12px 20px",
            borderRadius: 12,
            background: "linear-gradient(90deg,#10b981,#059669,#064e3b)",
            border: "1px solid #10b981",
            color: "white",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Continue → Step 5
        </button>

        {/* TOAST */}
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
