// pages/admin/onboarding-wizard/step5.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 5
// Bulk Nudge System + Renewal Reminder Engine (Operations)
// FULL COCKPIT V9 WEAPONIZED THEME
// ==========================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";

export default function OnboardingWizardStep5() {
  const router = useRouter();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("all"); // all | missing_coi | coverage | critical
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);

  const [sending, setSending] = useState(false);
  const [lastResults, setLastResults] = useState(null);

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD VENDORS FROM STATUS ENDPOINT
  // -----------------------------------------------------------
  async function loadVendors() {
    try {
      const res = await fetch("/api/onboarding/vendors-status");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed loading vendors.");
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
  // FILTER & SELECTION HELPERS
  // -----------------------------------------------------------
  function passesFilter(v) {
    if (filter === "all") return true;
    if (filter === "missing_coi") return !v.last_uploaded_coi;
    if (filter === "coverage") return !v.coverage_ok;
    if (filter === "critical") return v.hasCriticalAlerts;
    return true;
  }

  function toggleVendorSelection(id) {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  function selectAllFiltered() {
    const ids = vendors.filter(passesFilter).map((v) => v.id);
    setSelectedVendorIds(ids);
  }

  function clearSelection() {
    setSelectedVendorIds([]);
  }

  // -----------------------------------------------------------
  // SEND BULK NUDGES VIA API
  // -----------------------------------------------------------
  async function sendNudges(mode) {
    if (!selectedVendorIds.length) {
      return setToast({
        open: true,
        type: "error",
        message: "Select at least one vendor.",
      });
    }

    setSending(true);

    try {
      const res = await fetch("/api/onboarding/bulk-nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: 1,
          vendorIds: selectedVendorIds,
          mode, // 'missing_coi' | 'coverage_issues' | 'renewal'
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Bulk nudge failed.");
      }

      setLastResults(json);

      setToast({
        open: true,
        type: "success",
        message: `Nudges sent: ${json.sentCount}, Failed: ${json.failedCount}`,
      });
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed sending nudges.",
      });
    } finally {
      setSending(false);
    }
  }

  // -----------------------------------------------------------
  // NAVIGATION
  // -----------------------------------------------------------
  function goBack() {
    router.push("/admin/onboarding-wizard/step4");
  }

  // -----------------------------------------------------------
  // RENDER VENDOR GRID
  // -----------------------------------------------------------
  function renderVendorGrid() {
    if (loading) return <div>Loading…</div>;
    if (!vendors.length) return <div>No vendors found.</div>;

    const filtered = vendors.filter(passesFilter);

    if (!filtered.length) {
      return (
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            background: "rgba(15,23,42,0.85)",
            border: "1px solid rgba(148,163,184,0.4)",
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          No vendors match this filter yet.
        </div>
      );
    }

    return (
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
          gap: 18,
        }}
      >
        {filtered.map((v) => {
          const selected = selectedVendorIds.includes(v.id);

          return (
            <div
              key={v.id}
              onClick={() => toggleVendorSelection(v.id)}
              style={{
                padding: 16,
                borderRadius: 18,
                background: "rgba(15,23,42,0.88)",
                border: selected
                  ? "1px solid rgba(56,189,248,0.9)"
                  : "1px solid rgba(80,120,255,0.35)",
                boxShadow: selected
                  ? "0 0 25px rgba(56,189,248,0.45), inset 0 0 20px rgba(15,23,42,0.9)"
                  : "0 0 20px rgba(64,106,255,0.25), inset 0 0 16px rgba(15,23,42,0.9)",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleVendorSelection(v.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: "#38bdf8",
                  }}
                />
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  {v.vendor_name}
                </span>
              </div>

              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                <div>{v.last_uploaded_coi ? "📄 COI Uploaded" : "⚠ Missing COI"}</div>
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
  // RESULTS SUMMARY
  // -----------------------------------------------------------
  function renderResultsSummary() {
    if (!lastResults) return null;

    return (
      <div
        style={{
          marginTop: 22,
          padding: 12,
          borderRadius: 14,
          background: "rgba(15,23,42,0.88)",
          border: "1px solid rgba(148,163,184,0.5)",
          fontSize: 13,
          color: "#e5e7eb",
        }}
      >
        <strong>Last run:</strong> Sent {lastResults.sentCount}, Failed{" "}
        {lastResults.failedCount}
      </div>
    );
  }

  // -----------------------------------------------------------
  // PAGE RENDER
  // -----------------------------------------------------------
  return (
    <CockpitWizardLayout>
      <div style={{ position: "relative", zIndex: 3 }}>
        <h1
          style={{
            fontSize: 30,
            marginBottom: 10,
            background: "linear-gradient(90deg,#38bdf8,#fbbf24,#ef4444)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          AI Onboarding Wizard — Step 5
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: 16, fontSize: 13 }}>
          Monitor onboarding progress and nudge vendors who are delayed or non-compliant.
        </p>

        <button
          onClick={goBack}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(31,41,55,0.8)",
            border: "1px solid rgba(148,163,184,0.6)",
            color: "white",
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          ← Back to Step 4
        </button>

        {renderVendorGrid()}

        {vendors.length > 0 && (
          <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => sendNudges("missing_coi")}
              disabled={sending || selectedVendorIds.length === 0}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: "linear-gradient(90deg,#f97316,#ea580c)",
                border: "1px solid #f97316",
                color: "white",
                cursor:
                  selectedVendorIds.length === 0 || sending
                    ? "not-allowed"
                    : "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ⚠ Nudge: Missing COI
            </button>

            <button
              onClick={() => sendNudges("coverage_issues")}
              disabled={sending || selectedVendorIds.length === 0}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: "linear-gradient(90deg,#facc15,#eab308)",
                border: "1px solid #facc15",
                color: "white",
                cursor:
                  selectedVendorIds.length === 0 || sending
                    ? "not-allowed"
                    : "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              🛡 Nudge: Coverage Issues
            </button>

            <button
              onClick={() => sendNudges("renewal")}
              disabled={sending || selectedVendorIds.length === 0}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: "linear-gradient(90deg,#22c55e,#16a34a)",
                border: "1px solid #22c55e",
                color: "white",
                cursor:
                  selectedVendorIds.length === 0 || sending
                    ? "not-allowed"
                    : "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              📆 Nudge: Renewal Reminder
            </button>
          </div>
        )}

        {renderResultsSummary()}

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

