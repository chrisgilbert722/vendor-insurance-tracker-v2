// pages/admin/onboarding-wizard/step6.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 6 (FINAL HANDOFF)
// Vendor Creation + Requirements Injection (APPROVED ONLY)
// FULL COCKPIT V9 WEAPONIZED THEME
// ==========================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useOrg } from "../../../context/OrgContext";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";

export default function OnboardingWizardStep6() {
  const router = useRouter();
  const { activeOrgId } = useOrg();

  const [profiles, setProfiles] = useState([]); // APPROVED ONLY
  const [creating, setCreating] = useState(false);
  const [createdVendors, setCreatedVendors] = useState([]);
  const [done, setDone] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD APPROVED PROFILES FROM STEP 3
  // -----------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem("approvedOnboardingProfiles");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      setProfiles(parsed || []);
    } catch (err) {
      console.error("Error loading approved profiles:", err);
    }
  }, []);

  // -----------------------------------------------------------
  // BUILD PAYLOAD (PRESERVE _onboard_id)
  // -----------------------------------------------------------
  function buildVendorPayload() {
    return profiles.map((p) => {
      const v = p.vendor || {};
      return {
        onboard_id: v._onboard_id,
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
  // -----------------------------------------------------------
  async function handleRunStep6() {
    if (!profiles.length) {
      return setToast({
        open: true,
        type: "error",
        message: "No approved profiles found. Complete Steps 1–5 first.",
      });
    }

    if (!activeOrgId) {
      return setToast({
        open: true,
        type: "error",
        message: "No active organization selected.",
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
          orgId: activeOrgId,
          vendors: vendorPayload,
        }),
      });

      const jsonCreate = await resCreate.json();
      if (!resCreate.ok || !jsonCreate.ok) {
        throw new Error(jsonCreate.error || "Vendor creation failed.");
      }

      const created = jsonCreate.created || [];
      setCreatedVendors(created);

      // 2️⃣ ASSIGN REQUIREMENTS (MATCH BY onboard_id)
      const assignments = created.map((createdVendor) => {
        const match = profiles.find(
          (p) => p.vendor._onboard_id === createdVendor.onboard_id
        );

        return {
          vendorId: createdVendor.id,
          requirements: match?.requirements || {},
        };
      });

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
        message: `Created ${created.length} vendors and activated compliance.`,
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
  // PAGE RENDER
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
          Finalize onboarding. This will create vendors and activate live
          compliance monitoring.
        </p>

        {/* NAV */}
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

        {/* ACTION */}
        {profiles.length > 0 && !done && (
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
              ? "Creating vendors & activating compliance…"
              : "🚀 Launch Compliance System"}
          </button>
        )}

        {/* RESULT */}
        {done && createdVendors.length > 0 && (
          <div
            style={{
              marginTop: 26,
              padding: 16,
              borderRadius: 16,
              background: "rgba(15,23,42,0.92)",
              border: "1px solid rgba(34,197,94,0.6)",
              boxShadow: "0 0 24px rgba(34,197,94,0.45)",
              fontSize: 13,
              color: "#bbf7d0",
            }}
          >
            🎉 Onboarding complete. {createdVendors.length} vendors activated.
          </div>
        )}

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
