// pages/admin/onboarding-wizard/step2.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 2
// Requirements Generation → Vendor Selection → AI Email Invites
// FULL COCKPIT V9 WEAPONIZED THEME
// ==========================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { openai } from "../../../lib/openaiClient";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";  // ✅ NEW

export default function OnboardingWizardStep2() {
  const router = useRouter();

  // -----------------------------------------------------------
  // STATE
  // -----------------------------------------------------------
  const [vendors, setVendors] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteResults, setInviteResults] = useState(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD VENDORS FROM STEP 1
  // -----------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboardingVendors");
      if (raw) setVendors(JSON.parse(raw));
    } catch (err) {
      console.error("Vendor load error:", err);
    }
  }, []);

  // -----------------------------------------------------------
  // GENERATE REQUIREMENTS (AI)
  // -----------------------------------------------------------
  async function generateRequirements() {
    if (!vendors.length) {
      return setToast({
        open: true,
        type: "error",
        message: "No vendors found — upload CSV in Step 1.",
      });
    }

    setLoading(true);

    try {
      const newProfiles = [];

      for (const vendor of vendors) {
        const prompt = `
You are an insurance compliance assistant.
Analyze this vendor and return ONLY valid JSON:

Vendor:
${JSON.stringify(vendor, null, 2)}

Format:
{
  "version": "v5",
  "work_type": string,
  "required_coverages": ["GL","Auto","WC","Umbrella"],
  "limits": {
    "gl_eachOccurrence": number,
    "gl_aggregate": number,
    "auto_csl": number,
    "umbrella_limit": number
  },
  "endorsements": ["Additional Insured","Waiver of Subrogation"],
  "risk_category": "low"|"medium"|"high",
  "notes": string
}
        `.trim();

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1",
          temperature: 0,
          messages: [
            { role: "system", content: "Return ONLY strict JSON." },
            { role: "user", content: prompt },
          ],
        });

        const raw = completion.choices[0].message?.content.trim() || "{}";
        const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));

        newProfiles.push({ vendor, profile: json });
      }

      setProfiles(newProfiles);

      setToast({
        open: true,
        type: "success",
        message: "AI generated requirements.",
      });
    } catch (err) {
      console.error("Generation error:", err);
      setToast({
        open: true,
        type: "error",
        message: "AI failed generating requirements.",
      });
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------------------------
  // TOGGLE VENDOR SELECTION
  // -----------------------------------------------------------
  function toggleVendorSelection(id) {
    setSelectedVendorIds((prev) =>
      prev.includes(id)
        ? prev.filter((v) => v !== id)
        : [...prev, id]
    );
  }

  // -----------------------------------------------------------
  // SEND AI ONBOARDING INVITES
  // -----------------------------------------------------------
  async function handleSendInvites() {
    if (!selectedVendorIds.length) {
      return setToast({
        open: true,
        type: "error",
        message: "Select at least one vendor.",
      });
    }

    setSendingInvites(true);

    try {
      const res = await fetch("/api/onboarding/send-vendor-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: 1,
          vendorIds: selectedVendorIds,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setInviteResults(json);
      setResultsOpen(true);

      setToast({
        open: true,
        type: "success",
        message: `Sent: ${json.sentCount}, Failed: ${json.failedCount}`,
      });
    } catch (err) {
      console.error("Invite error:", err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSendingInvites(false);
    }
  }

  // -----------------------------------------------------------
  // NAVIGATION
  // -----------------------------------------------------------
  function goBack() {
    router.push("/admin/onboarding-wizard");
  }

  function goNext() {
    if (!profiles.length) {
      return setToast({
        open: true,
        type: "error",
        message: "Generate requirements before continuing.",
      });
    }

    localStorage.setItem(
      "onboardingProfiles",
      JSON.stringify(
        profiles.map((p) => ({
          vendor: p.vendor,
          requirements: p.profile,
        }))
      )
    );

    router.push("/admin/onboarding-wizard/step3");
  }

  // -----------------------------------------------------------
  // RENDER SELECTABLE VENDOR CARDS (Weaponized Cockpit)
  // -----------------------------------------------------------
  function renderVendorSelection() {
    if (!profiles.length) return null;

    return (
      <div style={{ marginTop: 30 }}>
        <h2
          style={{
            marginBottom: 14,
            background: "linear-gradient(90deg,#38bdf8,#a78bfa)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Select Vendors to Onboard
        </h2>

        {profiles.map((item, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 22,
              padding: 18,
              borderRadius: 18,
              background: "rgba(15,23,42,0.78)",
              border: "1px solid rgba(80,120,255,0.35)",
              boxShadow:
                "0 0 25px rgba(64,106,255,0.25), inset 0 0 22px rgba(20,30,60,0.5)",
              backdropFilter: "blur(10px)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedVendorIds.includes(item.vendor.id)}
                onChange={() => toggleVendorSelection(item.vendor.id)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: "#38bdf8",
                }}
              />

              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {item.vendor.vendor_name || "(Unnamed Vendor)"}
              </span>
            </label>

            <pre
              style={{
                marginTop: 12,
                background: "rgba(0,0,0,0.3)",
                padding: 12,
                borderRadius: 12,
                fontSize: 12,
                whiteSpace: "pre-wrap",
                color: "#e5e7eb",
              }}
            >
{JSON.stringify(item.profile, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  // -----------------------------------------------------------
  // RESULTS DRAWER (Weaponized)
  // -----------------------------------------------------------
  function renderInviteResults() {
    if (!resultsOpen || !inviteResults) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 420,
          height: "100vh",
          background: "rgba(15,23,42,0.97)",
          backdropFilter: "blur(10px)",
          borderLeft: "1px solid rgba(80,120,255,0.35)",
          boxShadow: "-12px 0 30px rgba(0,0,0,0.7)",
          padding: 22,
          zIndex: 999,
          overflowY: "auto",
        }}
      >
        <h2>Email Sending Results</h2>

        <p>
          <strong>Sent:</strong> {inviteResults.sentCount}
          <br />
          <strong>Failed:</strong> {inviteResults.failedCount}
        </p>

        <h3>Sent Emails:</h3>
        <pre style={{ fontSize: 12 }}>
{JSON.stringify(inviteResults.sent, null, 2)}
        </pre>

        <h3>Failed Emails:</h3>
        <pre style={{ fontSize: 12, color: "#fca5a5" }}>
{JSON.stringify(inviteResults.failed, null, 2)}
        </pre>

        <button
          onClick={() => setResultsOpen(false)}
          style={{
            marginTop: 20,
            padding: "10px 16px",
            background: "rgba(31,41,55,0.9)",
            border: "1px solid rgba(148,163,184,0.5)",
            borderRadius: 10,
            color: "white",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  // -----------------------------------------------------------
  // MAIN PAGE RENDER (COCKPIT WRAPPED)
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
            marginBottom: 25,
          }}
        >
          AI Onboarding Wizard — Step 2
        </h1>

        {/* NAVIGATION */}
        <button
          onClick={goBack}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(31,41,55,0.7)",
            border: "1px solid rgba(148,163,184,0.5)",
            color: "white",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          ← Back to Step 1
        </button>

        {/* GENERATE REQUIREMENTS */}
        <button
          onClick={generateRequirements}
          disabled={loading}
          style={{
            marginLeft: 12,
            padding: "12px 18px",
            borderRadius: 12,
            background: "linear-gradient(90deg,#38bdf8,#0ea5e9,#1e40af)",
            border: "1px solid rgba(56,189,248,0.8)",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 15,
            fontWeight: 600,
            color: "white",
          }}
        >
          {loading ? "Analyzing…" : "⚡ Generate Requirements"}
        </button>

        {renderVendorSelection()}

        {/* SEND INVITES */}
        {profiles.length > 0 && (
          <button
            onClick={handleSendInvites}
            disabled={sendingInvites || selectedVendorIds.length === 0}
            style={{
              marginTop: 25,
              padding: "14px 20px",
              borderRadius: 12,
              background:
                selectedVendorIds.length
                  ? "linear-gradient(90deg,#38bdf8,#0ea5e9)"
                  : "rgba(148,163,184,0.4)",
              border:
                selectedVendorIds.length
                  ? "1px solid rgba(56,189,248,0.7)"
                  : "1px solid rgba(148,163,184,0.5)",
              fontSize: 16,
              color: "white",
              cursor:
                selectedVendorIds.length === 0 || sendingInvites
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {sendingInvites ? "Sending…" : "📨 Send AI Onboarding Emails"}
          </button>
        )}

        {/* CONTINUE */}
        {profiles.length > 0 && (
          <button
            onClick={goNext}
            style={{
              marginTop: 25,
              marginLeft: 14,
              padding: "12px 20px",
              borderRadius: 12,
              background:
                "linear-gradient(90deg,#10b981,#059669,#064e3b)",
              border: "1px solid #10b981",
              color: "white",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Continue → Step 3
          </button>
        )}

        {renderInviteResults()}

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
