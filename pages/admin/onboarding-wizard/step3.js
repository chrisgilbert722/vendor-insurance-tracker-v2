// pages/admin/onboarding-wizard/step3.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 3
// Email Preview → Edit → Send → Proceed to Step 4
// FULL COCKPIT V9 WEAPONIZED THEME
// ==========================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";

export default function OnboardingWizardStep3() {
  const router = useRouter();

  const [profiles, setProfiles] = useState([]);   // [{ vendor, requirements }]
  const [subjects, setSubjects] = useState({});
  const [emails, setEmails] = useState({});
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD PROFILES FROM STEP 2 (localStorage)
  // -----------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboardingProfiles");
      if (!raw) {
        console.warn("Step 3: no onboardingProfiles found.");
        return;
      }

      const parsed = JSON.parse(raw);
      setProfiles(parsed || []);

      const subj = {};
      const body = {};

      parsed.forEach((p) => {
        const name = p.vendor.vendor_name || "Vendor";

        subj[p.vendor.vendor_name] =
          "Insurance Requirements & COI Upload Instructions";

        body[p.vendor.vendor_name] = `
Hi ${name},

Below are your current insurance requirements for working with us:

${JSON.stringify(p.requirements, null, 2)}

Please upload your Certificate of Insurance and any required documents using your secure upload link:

https://yourdomain.com/vendor/upload?name=${encodeURIComponent(
          name
        )}

If you have any questions about these requirements, reply directly to this email and our compliance team will assist you.

Thank you!
Compliance Team
        `.trim();
      });

      setSubjects(subj);
      setEmails(body);
    } catch (err) {
      console.error("Failed to load onboardingProfiles:", err);
    }
  }, []);

  // -----------------------------------------------------------
  // NAVIGATION
  // -----------------------------------------------------------
  function goBack() {
    router.push("/admin/onboarding-wizard/step2");
  }

  function goNext() {
    router.push("/admin/onboarding-wizard/step4");
  }

  // -----------------------------------------------------------
  // SEND EMAILS VIA EXISTING INVITE API
  // -----------------------------------------------------------
  async function sendEmails() {
    if (!profiles.length) {
      return setToast({
        open: true,
        type: "error",
        message: "No vendors to send.",
      });
    }

    // NOTE: this expects real vendor IDs; if you're still pre-DB, adapt later
    const vendorIds = profiles
      .map((p) => p.vendor.id)
      .filter((id) => id !== undefined && id !== null);

    if (!vendorIds.length) {
      return setToast({
        open: true,
        type: "error",
        message:
          "No valid vendor IDs found. Ensure vendors are created in the database.",
      });
    }

    setSending(true);

    try {
      const res = await fetch("/api/onboarding/send-vendor-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: 1,
          vendorIds,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed sending emails.");

      setResults(json);
      setResultsOpen(true);

      setToast({
        open: true,
        type: "success",
        message: `Emails sent: ${json.sentCount}, Failed: ${json.failedCount}`,
      });
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed sending emails.",
      });
    } finally {
      setSending(false);
    }
  }

  // -----------------------------------------------------------
  // EMAIL CARD RENDER (ONE PER VENDOR)
// -----------------------------------------------------------
  function renderEmailCard(profile) {
    const vendorName = profile.vendor.vendor_name || "Vendor";
    const subject = subjects[vendorName] || "";
    const body = emails[vendorName] || "";

    return (
      <div
        key={vendorName}
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
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          {vendorName}
        </div>

        {/* SUBJECT */}
        <input
          value={subject}
          onChange={(e) =>
            setSubjects((prev) => ({
              ...prev,
              [vendorName]: e.target.value,
            }))
          }
          style={{
            width: "100%",
            borderRadius: 10,
            padding: "8px 10px",
            border: "1px solid rgba(148,163,184,0.5)",
            background: "rgba(15,23,42,0.95)",
            color: "#e5e7eb",
            fontSize: 13,
            marginBottom: 8,
          }}
        />

        {/* BODY */}
        <textarea
          rows={8}
          value={body}
          onChange={(e) =>
            setEmails((prev) => ({
              ...prev,
              [vendorName]: e.target.value,
            }))
          }
          style={{
            width: "100%",
            borderRadius: 12,
            padding: 10,
            border: "1px solid rgba(148,163,184,0.5)",
            background: "rgba(15,23,42,0.97)",
            color: "#e5e7eb",
            fontSize: 12,
            resize: "vertical",
            whiteSpace: "pre-wrap",
            marginBottom: 10,
          }}
        />

        {/* REQUIREMENTS PREVIEW */}
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(55,65,81,0.8)",
            background: "rgba(15,23,42,0.9)",
            fontSize: 11,
            color: "#cbd5f5",
          }}
        >
          <div style={{ marginBottom: 4, fontWeight: 500 }}>
            Requirements (JSON Preview)
          </div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
{JSON.stringify(profile.requirements, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // RESULTS DRAWER
  // -----------------------------------------------------------
  function renderResultsDrawer() {
    if (!resultsOpen || !results) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 420,
          height: "100vh",
          background: "rgba(15,23,42,0.97)",
          borderLeft: "1px solid rgba(80,120,255,0.4)",
          boxShadow: "-16px 0 40px rgba(0,0,0,0.8)",
          padding: 22,
          zIndex: 999,
          overflowY: "auto",
        }}
      >
        <h2>Email Sending Results</h2>

        <p>
          <strong>Sent:</strong> {results.sentCount}
          <br />
          <strong>Failed:</strong> {results.failedCount}
        </p>

        <h3>Sent</h3>
        <pre style={{ fontSize: 12 }}>
{JSON.stringify(results.sent, null, 2)}
        </pre>

        <h3>Failed</h3>
        <pre style={{ fontSize: 12, color: "#fca5a5" }}>
{JSON.stringify(results.failed, null, 2)}
        </pre>

        <button
          onClick={() => setResultsOpen(false)}
          style={{
            marginTop: 20,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(31,41,55,0.9)",
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
  // PAGE RENDER (COCKPIT WRAPPED)
// -----------------------------------------------------------
  return (
    <CockpitWizardLayout>
      <div style={{ position: "relative", zIndex: 3 }}>
        <h1
          style={{
            fontSize: 30,
            marginBottom: 12,
            background: "linear-gradient(90deg,#38bdf8,#a855f7,#e5e7eb)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          AI Onboarding Wizard — Step 3
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: 18, fontSize: 13 }}>
          Review, customize, and send onboarding emails to your vendors.
        </p>

        {/* NAVIGATION ROW */}
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

          {results && (
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
          )}
        </div>

        {/* EMAIL CARDS */}
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
            No profiles found. Make sure Step 2 completed and generated
            requirements.
          </div>
        )}

        {profiles.map((profile) => renderEmailCard(profile))}

        {/* SEND BUTTON */}
        {profiles.length > 0 && (
          <button
            onClick={sendEmails}
            disabled={sending}
            style={{
              marginTop: 20,
              padding: "12px 20px",
              borderRadius: 12,
              background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
              border: "1px solid rgba(56,189,248,0.8)",
              color: "white",
              cursor: sending ? "not-allowed" : "pointer",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {sending ? "Sending emails…" : "📨 Send All Onboarding Emails"}
          </button>
        )}

        {renderResultsDrawer()}

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
