// pages/admin/onboarding-wizard/step2.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 2
// Requirements Generation → Vendor Selection → AI Email Invites
// WITH WIZARD NAVIGATION (BACK ↔ NEXT)
// ==========================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/router";                      // ✅ NEW
import { openai } from "../../../lib/openaiClient";
import ToastV2 from "../../../components/ToastV2";

export default function OnboardingWizardStep2() {
  const router = useRouter();                                 // ✅ NEW

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
    message: "",
    type: "success",
  });

  // -----------------------------------------------------------
  // LOAD VENDORS FROM STEP 1
  // -----------------------------------------------------------
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined"
        ? localStorage.getItem("onboardingVendors")
        : null;

      if (raw) {
        const parsed = JSON.parse(raw);
        setVendors(parsed);
      } else {
        console.warn("⚠ Step 2: No vendor data found.");
      }
    } catch (err) {
      console.error("Vendor load error:", err);
    }
  }, []);

  // -----------------------------------------------------------
  // STEP 2 — AI GENERATE REQUIREMENTS
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
Based on this vendor info:

${JSON.stringify(vendor, null, 2)}

Generate a V5 requirements profile in JSON ONLY:
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
            { role: "system", content: "Return ONLY valid JSON." },
            { role: "user", content: prompt },
          ],
        });

        let raw = completion.choices?.[0]?.message?.content?.trim() || "";
        const first = raw.indexOf("{");
        const last = raw.lastIndexOf("}");
        const json = JSON.parse(raw.slice(first, last + 1));

        newProfiles.push({ vendor, profile: json });
      }

      setProfiles(newProfiles);

      setToast({
        open: true,
        type: "success",
        message: "AI requirements generated.",
      });
    } catch (err) {
      console.error("Generation error:", err);
      setToast({
        open: true,
        type: "error",
        message: "AI failed to generate requirements.",
      });
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------------------------
  // SELECT VENDORS FOR EMAIL INVITES
  // -----------------------------------------------------------
  function toggleVendorSelection(id) {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  // -----------------------------------------------------------
  // SEND EMAIL INVITES (Step 3 engine)
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

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Invite sending failed");
      }

      setInviteResults(json);
      setResultsOpen(true);

      setToast({
        open: true,
        type: "success",
        message: `Sent: ${json.sentCount}  Failed: ${json.failedCount}`,
      });
    } catch (err) {
      console.error("Invite error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed sending invites.",
      });
    } finally {
      setSendingInvites(false);
    }
  }

  // -----------------------------------------------------------
  // WIZARD NAVIGATION BUTTONS (BACK / NEXT)
  // -----------------------------------------------------------
  function goBack() {
    router.push("/admin/onboarding-wizard");          // ← Step 1
  }

  function goNext() {
    if (!profiles.length) {
      return setToast({
        open: true,
        type: "error",
        message: "Generate requirements before continuing.",
      });
    }

    const profilesOnly = profiles.map((p) => ({
      vendor: p.vendor,
      requirements: p.profile,
    }));

    localStorage.setItem("onboardingProfiles", JSON.stringify(profilesOnly));

    router.push("/admin/onboarding-wizard/step3");     // → Step 3
  }

  // -----------------------------------------------------------
  // UI HELPERS
  // -----------------------------------------------------------
  function renderVendorSelection() {
    if (!profiles.length) return null;

    return (
      <div style={{ marginTop: 30 }}>
        <h3 style={{ fontSize: 20, marginBottom: 10 }}>
          Select Vendors to Onboard
        </h3>

        {profiles.map((item, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 14,
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(148,163,184,0.3)",
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
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                {item.vendor.vendor_name || "(Unnamed Vendor)"}
              </span>
            </label>

            <pre
              style={{
                marginTop: 10,
                whiteSpace: "pre-wrap",
                fontSize: 12,
                color: "#e5e7eb",
                background: "rgba(0,0,0,0.3)",
                padding: 12,
                borderRadius: 10,
              }}
            >
{JSON.stringify(item.profile, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    );
  }

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
          padding: 20,
          borderLeft: "1px solid rgba(148,163,184,0.4)",
          overflowY: "auto",
          zIndex: 1000,
        }}
      >
        <h2>Onboarding Results</h2>

        <p>
          <strong>Sent:</strong> {inviteResults.sentCount}
          <br />
          <strong>Failed:</strong> {inviteResults.failedCount}
        </p>

        <h3>Sent Emails</h3>
        <pre style={{ fontSize: 12 }}>
{JSON.stringify(inviteResults.sent, null, 2)}
        </pre>

        <h3>Failed</h3>
        <pre style={{ fontSize: 12, color: "#fca5a5" }}>
{JSON.stringify(inviteResults.failed, null, 2)}
        </pre>

        <button
          onClick={() => setResultsOpen(false)}
          style={{
            marginTop: 20,
            padding: "10px 16px",
            borderRadius: 12,
            background: "rgba(31,41,55,0.8)",
            border: "1px solid rgba(148,163,184,0.5)",
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
  // PAGE RENDER
  // -----------------------------------------------------------
  return (
    <div style={{ padding: 40, color: "white" }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>
        AI Onboarding Wizard — Step 2
      </h1>

      {/* BACK BUTTON */}
      <button
        onClick={goBack}
        style={{
          marginBottom: 20,
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid rgba(148,163,184,0.5)",
          background: "rgba(31,41,55,0.7)",
          color: "white",
          cursor: "pointer",
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
            marginTop: 20,
            padding: "14px 20px",
            borderRadius: 12,
            background: selectedVendorIds.length
              ? "linear-gradient(90deg,#38bdf8,#0ea5e9)"
              : "rgba(148,163,184,0.4)",
            border: "1px solid rgba(56,189,248,0.7)",
            fontSize: 16,
            fontWeight: 600,
            cursor:
              selectedVendorIds.length === 0
                ? "not-allowed"
                : "pointer",
            color: "white",
          }}
        >
          {sendingInvites ? "Sending…" : "📨 Send AI Onboarding Emails"}
        </button>
      )}

      {/* NEXT BUTTON (ONLY AFTER PROFILES GENERATED) */}
      {profiles.length > 0 && (
        <button
          onClick={goNext}
          style={{
            marginTop: 20,
            marginLeft: 12,
            padding: "12px 20px",
            borderRadius: 12,
            background: "linear-gradient(90deg,#10b981,#059669)",
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
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
    </div>
  );
}
