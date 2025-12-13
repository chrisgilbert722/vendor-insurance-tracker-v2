// pages/admin/onboarding-wizard/step3.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 3
// Review & Approve Requirements (Approval Gate)
// FULL COCKPIT V9 WEAPONIZED THEME
// ==========================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";

export default function OnboardingWizardStep3() {
  const router = useRouter();

  const [profiles, setProfiles] = useState([]); // [{ vendor, requirements }]
  const [approved, setApproved] = useState({});
  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD PROFILES FROM STEP 2
  // -----------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboardingProfiles");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      setProfiles(parsed || []);

      const initApproval = {};
      parsed.forEach((p) => {
        initApproval[p.vendor._onboard_id] = false;
      });
      setApproved(initApproval);
    } catch (err) {
      console.error("Failed loading onboardingProfiles:", err);
    }
  }, []);

  // -----------------------------------------------------------
  // NAVIGATION
  // -----------------------------------------------------------
  function goBack() {
    router.push("/admin/onboarding-wizard/step2");
  }

  function goNext() {
    const allApproved = Object.values(approved).every(Boolean);

    if (!allApproved) {
      return setToast({
        open: true,
        type: "error",
        message: "Approve requirements for all vendors before continuing.",
      });
    }

    localStorage.setItem(
      "approvedOnboardingProfiles",
      JSON.stringify(profiles)
    );

    router.push("/admin/onboarding-wizard/step4");
  }

  // -----------------------------------------------------------
  // TOGGLE APPROVAL
  // -----------------------------------------------------------
  function toggleApproval(id) {
    setApproved((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  // -----------------------------------------------------------
  // RENDER PROFILE CARD
  // -----------------------------------------------------------
  function renderProfileCard(profile) {
    const vendor = profile.vendor;
    const reqs = profile.requirements;
    const id = vendor._onboard_id;

    return (
      <div
        key={id}
        style={{
          padding: 22,
          marginBottom: 22,
          borderRadius: 20,
          background: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(80,120,255,0.35)",
          boxShadow:
            "0 0 25px rgba(64,106,255,0.25), inset 0 0 18px rgba(15,23,42,0.9)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 600 }}>
            {vendor.vendor_name || "Vendor"}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            <input
              type="checkbox"
              checked={approved[id] || false}
              onChange={() => toggleApproval(id)}
              style={{
                width: 18,
                height: 18,
                accentColor: "#10b981",
              }}
            />
            Approve requirements
          </label>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(148,163,184,0.35)",
            fontSize: 12,
            color: "#e5e7eb",
            whiteSpace: "pre-wrap",
          }}
        >
          {JSON.stringify(reqs, null, 2)}
        </div>

        {!approved[id] && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#fca5a5",
            }}
          >
            Requirements must be approved before onboarding can continue.
          </div>
        )}
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
            marginBottom: 12,
            background: "linear-gradient(90deg,#38bdf8,#10b981,#e5e7eb)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          AI Onboarding Wizard — Step 3
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: 18, fontSize: 13 }}>
          Review and approve compliance requirements before contacting vendors.
        </p>

        <div style={{ marginBottom: 20 }}>
          <button
            onClick={goBack}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.6)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              cursor: "pointer",
              marginRight: 10,
            }}
          >
            ← Back to Step 2
          </button>

          <button
            onClick={goNext}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid #10b981",
              background:
                "linear-gradient(90deg,#10b981,#059669,#064e3b)",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Continue → Step 4
          </button>
        </div>

        {profiles.length === 0 && (
          <div
            style={{
              padding: 18,
              borderRadius: 14,
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(148,163,184,0.4)",
              fontSize: 13,
              color: "#9ca3af",
            }}
          >
            No profiles found. Complete Step 2 before continuing.
          </div>
        )}

        {profiles.map(renderProfileCard)}

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
    </CockpitWizardLayout>
  );
}
