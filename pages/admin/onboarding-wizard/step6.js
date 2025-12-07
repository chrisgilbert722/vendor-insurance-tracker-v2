// pages/admin/onboarding-wizard/step6.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 6
// Vendor Auto-Creation + Requirements Injection
// FULL COCKPIT V9 WEAPONIZED THEME
// ==========================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";

export default function OnboardingWizardStep6() {
  const router = useRouter();

  const [profiles, setProfiles] = useState([]); // [{ vendor, requirements }]
  const [creating, setCreating] = useState(false);
  const [createdVendors, setCreatedVendors] = useState([]);
  const [done, setDone] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD AI PROFILES FROM STEP 2 (localStorage)
  // -----------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboardingProfiles");
      if (!raw) {
        console.warn("Step 6: no onboardingProfiles found.");
        return;
      }
      const parsed = JSON.parse(raw);
      setProfiles(parsed || []);
    } catch (err) {
      console.error("Error loading onboardingProfiles:", err);
    }
  }, []);

  // -----------------------------------------------------------
  // NORMALIZE VENDOR PAYLOAD FOR CREATE API
  // -----------------------------------------------------------
  function buildVendorPayload() {
    return profiles.map((p) => {
      const v = p.vendor || {};
      return {
        vendor_name: v.vendor_name || v.name || "New Vendor",
        email: v.email || null,
        phone: v.phone || null,
        work_type: v.work_type || v.category || null,
        address: v.address || null,
        notes: v.notes || null,
      };
    });
  }

  // -----------------------------------------------------------
  // RUN STEP 6 ENGINE
  // 1) Create vendor rows
  // 2) Assign AI requirement JSON
  // -----------------------------------------------------------
  async function handleRunStep6() {
    if (!profiles.length) {
      return setToast({
        open: true,
        type: "error",
        message: "No profiles found — complete Steps 1–5 first.",
      });
    }

    setCreating(true);

    try {
      // 1️⃣ CREATE VENDORS
      const vendorPayload = buildVendorPayload();

      const resCreate = await fetch("/api/onboarding/create-vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: 1, // TODO: replace with activeOrgId when wiring to OrgContext
          vendors: vendorPayload,
        }),
      });

      const jsonCreate = await resCreate.json();
      if (!resCreate.ok || !jsonCreate.ok) {
        throw new Error(jsonCreate.error || "Vendor creation failed.");
      }

      const created = jsonCreate.created || [];
      setCreatedVendors(created);

      // 2️⃣ ASSIGN REQUIREMENTS — we assume same order as profiles
      const assignments = created.map((c, idx) => ({
        vendorId: c.id,
        requirements: profiles[idx]?.requirements || {},
      }));

      const resAssign = await fetch("/api/onboarding/assign-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });

      const jsonAssign = await resAssign.json();
      if (!resAssign.ok || !jsonAssign.ok) {
        throw new Error(jsonAssign.error || "Assigning requirements failed.");
      }

      setDone(true);

      setToast({
        open: true,
        type: "success",
        message: `Created ${created.length} vendors and applied AI requirements.`,
      });
    } catch (err) {
      console.error("[STEP 6 ERROR]", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Step 6 failed.",
      });
    } finally {
      setCreating(false);
    }
  }

  // -----------------------------------------------------------
  // NAVIGATION
  // -----------------------------------------------------------
  function goBack() {
    router.push("/admin/onboarding-wizard/step5");
  }

  function goToDashboard() {
    router.push("/dashboard");
  }

  // -----------------------------------------------------------
  // SUMMARY PANEL (Profiles Preview)
// -----------------------------------------------------------
  function renderProfilesPreview() {
    if (!profiles.length) {
      return (
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(148,163,184,0.5)",
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          No AI profiles loaded. Complete Steps 2–3 to generate and save
          vendor requirement profiles.
        </div>
      );
    }

    return (
      <div
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 18,
        }}
      >
        {profiles.map((p, idx) => (
          <div
            key={idx}
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(80,120,255,0.4)",
              boxShadow:
                "0 0 24px rgba(64,106,255,0.35), inset 0 0 18px rgba(15,23,42,0.95)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              {p.vendor.vendor_name || "New Vendor"}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
              {p.vendor.email && <div>📧 {p.vendor.email}</div>}
              {p.vendor.work_type && <div>🛠 {p.vendor.work_type}</div>}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#cbd5f5",
                background: "rgba(0,0,0,0.35)",
                padding: 10,
                borderRadius: 12,
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              <div style={{ marginBottom: 4, fontWeight: 500 }}>
                Requirements (JSON):
              </div>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
{JSON.stringify(p.requirements, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // -----------------------------------------------------------
  // CREATED VENDORS SUMMARY
  // -----------------------------------------------------------
  function renderCreatedSummary() {
    if (!createdVendors.length) return null;

    return (
      <div
        style={{
          marginTop: 26,
          padding: 16,
          borderRadius: 16,
          background: "rgba(15,23,42,0.92)",
          border: "1px solid rgba(34,197,94,0.6)",
          boxShadow: "0 0 24px rgba(34,197,94,0.45)",
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 8, fontWeight: 600, color: "#bbf7d0" }}>
          Vendors Created:
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {createdVendors.map((v) => (
            <li key={v.id} style={{ marginBottom: 4 }}>
              #{v.id} — {v.vendor_name}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // -----------------------------------------------------------
  // PAGE RENDER (COCKPIT WRAPPED)
  // -----------------------------------------------------------
  return (
    <CockpitWizardLayout>
      <div style={{ position: "relative", zIndex: 3 }}>
        <h1
          style={{
            fontSize: 30,
            marginBottom: 10,
            background: "linear-gradient(90deg,#22c55e,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          AI Onboarding Wizard — Step 6
        </h1>

        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 18 }}>
          This final step will create real vendor records in your database and
          attach the AI-generated requirements profiles to each vendor.
        </p>

        {/* NAV BAR */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={goBack}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "rgba(31,41,55,0.85)",
              border: "1px solid rgba(148,163,184,0.6)",
              color: "white",
              cursor: "pointer",
              marginRight: 10,
            }}
          >
            ← Back to Step 5
          </button>

          {done && (
            <button
              onClick={goToDashboard}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                background:
                  "linear-gradient(90deg,#22c55e,#16a34a,#15803d)",
                border: "1px solid #22c55e",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Finish → Go To Dashboard
            </button>
          )}
        </div>

        {/* AI PROFILE PREVIEW GRID */}
        {renderProfilesPreview()}

        {/* RUN ENGINE BUTTON */}
        {profiles.length > 0 && (
          <button
            onClick={handleRunStep6}
            disabled={creating}
            style={{
              marginTop: 24,
              padding: "12px 20px",
              borderRadius: 12,
              background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
              border: "1px solid rgba(56,189,248,0.8)",
              color: "white",
              cursor: creating ? "not-allowed" : "pointer",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {creating
              ? "Creating vendors & applying requirements…"
              : "🚀 Create Vendors & Apply Requirements"}
          </button>
        )}

        {/* CREATED SUMMARY */}
        {renderCreatedSummary()}

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
