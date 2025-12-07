// pages/admin/onboarding-wizard/step4.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 4
// Bulk Onboarding Dashboard + Vendor Timeline Viewer
// ==========================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ToastV2 from "../../../components/ToastV2";

export default function OnboardingWizardStep4() {
  const router = useRouter();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedVendor, setSelectedVendor] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const [timelineOpen, setTimelineOpen] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD AGGREGATED VENDOR ONBOARDING STATUS
  // -----------------------------------------------------------
  async function loadVendors() {
    try {
      const res = await fetch("/api/onboarding/vendors-status");
      const json = await res.json();

      if (!json.ok) throw new Error(json.error);
      setVendors(json.vendors);

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
  // LOAD TIMELINE FOR SELECTED VENDOR
  // -----------------------------------------------------------
  async function loadTimelineFor(vendorId) {
    try {
      const res = await fetch(`/api/onboarding/vendor-timeline?vendorId=${vendorId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setTimeline(json.events);
      setSelectedVendor(vendorId);
      setTimelineOpen(true);

    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: "Failed loading timeline." });
    }
  }

  // -----------------------------------------------------------
  // COMPUTE READINESS SCORE (0–100)
  // -----------------------------------------------------------
  function computeScore(v) {
    let score = 0;

    if (v.last_uploaded_coi) score += 40;
    if (v.coverage_ok)      score += 20;
    if (v.endorsements_ok)  score += 20;
    if (!v.hasCriticalAlerts) score += 20;

    return score;
  }

  // -----------------------------------------------------------
  // ONBOARDING DASHBOARD CARDS
  // -----------------------------------------------------------
  function renderVendorGrid() {
    if (loading) return <div>Loading…</div>;
    if (!vendors.length) return <div>No vendors found.</div>;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: 20,
          marginTop: 30,
        }}
      >
        {vendors.map((v) => {
          const score = computeScore(v);
          const color =
            score === 100 ? "#10b981" :
            score >= 70 ? "#38bdf8" :
            score >= 40 ? "#fbbf24" :
                          "#ef4444";

          return (
            <div
              key={v.id}
              onClick={() => loadTimelineFor(v.id)}
              style={{
                padding: 20,
                borderRadius: 16,
                background: "rgba(15,23,42,0.85)",
                border: "1px solid rgba(148,163,184,0.25)",
                cursor: "pointer",
              }}
            >
              <h3 style={{ marginBottom: 8 }}>{v.vendor_name}</h3>

              <div
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: 12,
                  background: color,
                  color: "white",
                  fontWeight: 600,
                }}
              >
                {score}% Ready
              </div>

              <div style={{ marginTop: 12, fontSize: 13, color: "#9ca3af" }}>
                <div>{v.last_uploaded_coi ? "📄 COI Uploaded" : "⚠ No COI Uploaded"}</div>
                <div>{v.coverage_ok ? "✔ Coverage OK" : "⚠ Coverage Issues"}</div>
                <div>{v.endorsements_ok ? "✔ Endorsements OK" : "⚠ Missing Endorsements"}</div>
                <div>{v.hasCriticalAlerts ? "❌ Critical Alerts" : "✔ No Critical Alerts"}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // -----------------------------------------------------------
  // TIMELINE SLIDEOVER DRAWER
  // -----------------------------------------------------------
  function renderTimelineDrawer() {
    if (!timelineOpen) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 420,
          height: "100vh",
          background: "rgba(15,23,42,0.97)",
          borderLeft: "1px solid rgba(148,163,184,0.4)",
          padding: 20,
          overflowY: "auto",
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setTimelineOpen(false)}
          style={{
            marginBottom: 20,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "rgba(31,41,55,0.7)",
            color: "white",
            cursor: "pointer",
          }}
        >
          ← Close
        </button>

        <h2>Vendor Timeline</h2>

        {timeline.map((ev, i) => (
          <div
            key={i}
            style={{
              padding: 10,
              borderBottom: "1px solid rgba(75,85,99,0.3)",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {new Date(ev.created_at).toLocaleString()}
            </div>
            <div style={{ fontSize: 14 }}>{ev.message}</div>
          </div>
        ))}
      </div>
    );
  }

  // -----------------------------------------------------------
  // NAVIGATION (Back ↔ Next)
  // -----------------------------------------------------------
  function goBack() {
    router.push("/admin/onboarding-wizard/step3");
  }

  function goNext() {
    router.push("/admin/onboarding-wizard/step5"); // (Optional future step)
  }

  // -----------------------------------------------------------
  // PAGE OUTPUT
  // -----------------------------------------------------------
  return (
    <div style={{ padding: 40, color: "white" }}>
      <h1 style={{ fontSize: 28 }}>AI Onboarding Wizard — Step 4</h1>
      <p style={{ color: "#9ca3af" }}>
        Vendor readiness overview, progress scoring, and onboarding timeline.
      </p>

      {/* BACK BUTTON */}
      <button
        onClick={goBack}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid rgba(148,163,184,0.5)",
          background: "rgba(31,41,55,0.7)",
          color: "white",
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        ← Back to Step 3
      </button>

      {renderVendorGrid()}
      {renderTimelineDrawer()}

      <ToastV2
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() =>
          setToast((p) => ({
            ...p,
            open: false,
          }))
        }
      />
    </div>
  );
}
