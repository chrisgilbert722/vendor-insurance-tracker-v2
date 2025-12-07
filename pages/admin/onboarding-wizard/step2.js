// pages/admin/onboarding-wizard/step2.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 2
// Requirements Generation → Vendor Selection → AI Email Invites
// ==========================================================

import { useState, useEffect } from "react";
import { openai } from "../../../lib/openaiClient";
import ToastV2 from "../../../components/ToastV2";

export default function OnboardingWizardStep2({ vendors = [] }) {
  // STEP 2 STATES
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // NEW — vendor selection + AI onboarding invite system
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteResults, setInviteResults] = useState(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // Redirect safety if no vendor data
  useEffect(() => {
    if (!vendors.length) {
      console.warn("Step 2 loaded without vendors. Add router state later.");
    }
  }, [vendors]);

  // -----------------------------------------------------------
  // STEP 2 — AI Generate Requirements Profiles
  // -----------------------------------------------------------
  async function generateRequirements() {
    if (!vendors.length) {
      return setToast({
        open: true,
        type: "error",
        message: "No vendors found. Upload CSV in Step 1 first.",
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

Generate a requirements profile in JSON ONLY:

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

        let raw = completion.choices[0].message?.content?.trim() || "";
        const first = raw.indexOf("{");
        const last = raw.lastIndexOf("}");
        const json = JSON.parse(raw.slice(first, last + 1));

        newProfiles.push({
          vendor: vendor,
          profile: json,
        });
      }

      setProfiles(newProfiles);

      setToast({
        open: true,
        type: "success",
        message: "AI generated requirements for all vendors.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: "Failed generating requirements.",
      });
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------------------------
  // SELECT / DESELECT vendor for onboarding
  // -----------------------------------------------------------
  function toggleVendorSelection(id) {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  // -----------------------------------------------------------
  // SEND AI ONBOARDING EMAILS
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
          orgId: vendors[0]?.org_id || null,
          vendorIds: selectedVendorIds,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Onboarding emails failed.");
      }

      setInviteResults(json);
      setResultsOpen(true);

      setToast({
        open: true,
        type: "success",
        message: `Sent: ${json.sentCount}, Failed: ${json.failedCount}`,
      });
    } catch (err) {
      console.error(err);
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
  // VENDOR SELECTION UI
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
            {/* SELECT BOX */}
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
                {item.vendor.vendor_name}
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

  // -----------------------------------------------------------
  // INVITE RESULT DRAWER
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
          padding: 20,
          borderLeft: "1px solid rgba(148,163,184,0.4)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.6)",
          overflowY: "auto",
          zIndex: 1000,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Onboarding Email Results</h2>

        <p>
          <strong>Sent:</strong> {inviteResults.sentCount}
          <br />
          <strong>Failed:</strong> {inviteResults.failedCount}
        </p>

        <h3>Sent Emails</h3>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
{JSON.stringify(inviteResults.sent, null, 2)}
        </pre>

        <h3>Failed</h3>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#fca5a5" }}>
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
  // PAGE OUTPUT
  // -----------------------------------------------------------
  return (
    <div style={{ padding: 40, color: "white" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>
        AI Onboarding Wizard — Step 2
      </h1>

      <button
        onClick={generateRequirements}
        disabled={loading}
        style={{
          padding: "12px 18px",
          borderRadius: 12,
          background:
            "linear-gradient(90deg,#38bdf8,#0ea5e9,#1e40af)",
          border: "1px solid rgba(56,189,248,0.8)",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 15,
          fontWeight: 600,
          color: "white",
          marginBottom: 20,
        }}
      >
        {loading ? "Analyzing…" : "⚡ Generate Requirements for All Vendors"}
      </button>

      {renderVendorSelection()}

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
              selectedVendorIds.length === 0 ? "not-allowed" : "pointer",
            color: "white",
          }}
        >
          {sendingInvites ? "Sending invites…" : "📨 Send AI Onboarding Emails"}
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
