// pages/admin/onboarding-wizard/step3.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 3
// Email Preview → Edit → Send → Proceed to Step 4
// ==========================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ToastV2 from "../../../components/ToastV2";

export default function OnboardingWizardStep3() {
  const router = useRouter();

  const [profiles, setProfiles] = useState([]);     // loaded from Step 2
  const [emails, setEmails] = useState({});         // editable email bodies
  const [subjects, setSubjects] = useState({});     // editable subjects
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Results drawer
  const [results, setResults] = useState(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  const [toast, setToast] = useState({ open: false, type: "success", message: "" });

  // -----------------------------------------------------------
  // LOAD VENDOR PROFILES FROM STEP 2
  // -----------------------------------------------------------
  useEffect(() => {
    const raw = localStorage.getItem("onboardingProfiles");
    if (!raw) {
      console.warn("⚠ No profiles found for Step 3.");
      return;
    }

    const parsed = JSON.parse(raw);
    setProfiles(parsed);

    // Prefill email subjects/bodies
    const subj = {};
    const body = {};

    parsed.forEach((p) => {
      const name = p.vendor.vendor_name || "Vendor";

      subj[p.vendor.vendor_name] = `Insurance Requirements & COI Upload Instructions`;
      body[p.vendor.vendor_name] = `
Hi ${name},

Welcome! Below are your insurance requirements for onboarding:

${JSON.stringify(p.requirements, null, 2)}

Please upload your Certificate of Insurance and required documents using your secure link:

https://yourdomain.com/vendor/upload?vid=${p.vendor.vendor_name}

If you have questions, reply directly to this email.

Thank you!
Compliance Team
      `.trim();
    });

    setSubjects(subj);
    setEmails(body);
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
  // SEND EMAILS THROUGH STEP 3 API
  // -----------------------------------------------------------
  async function sendEmails() {
    if (!profiles.length) {
      return setToast({ open: true, type: "error", message: "No vendors to send." });
    }

    setSending(true);

    try {
      // Build vendor list for API
      const vendorIds = profiles.map((p) => p.vendor.id);

      const res = await fetch("/api/onboarding/send-vendor-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: 1,
          vendorIds: vendorIds,
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
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSending(false);
    }
  }

  // -----------------------------------------------------------
  // EMAIL PREVIEW UI
  // -----------------------------------------------------------
  function renderEmailCard(profile) {
    const name = profile.vendor.vendor_name;

    return (
      <div
        key={name}
        style={{
          padding: 20,
          marginBottom: 20,
          borderRadius: 16,
          background: "rgba(15,23,42,0.85)",
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <h3 style={{ marginBottom: 5 }}>{name}</h3>

        {/* SUBJECT INPUT */}
        <input
          value={subjects[name] || ""}
          onChange={(e) =>
            setSubjects((p) => ({ ...p, [name]: e.target.value }))
          }
          style={{
            width: "100%",
            padding: 10,
            fontSize: 14,
            borderRadius: 10,
            marginBottom: 10,
            background: "rgba(31,41,55,0.9)",
            color: "white",
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        />

        {/* BODY INPUT */}
        <textarea
          rows={10}
          value={emails[name] || ""}
          onChange={(e) =>
            setEmails((p) => ({ ...p, [name]: e.target.value }))
          }
          style={{
            width: "100%",
            padding: 12,
            fontSize: 13,
            borderRadius: 12,
            background: "rgba(30,41,59,0.9)",
            color: "white",
            border: "1px solid rgba(148,163,184,0.4)",
            resize: "vertical",
            whiteSpace: "pre-wrap",
          }}
        />

        {/* REQUIREMENTS PREVIEW */}
        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 12,
            fontSize: 12,
            color: "#e5e7eb",
          }}
        >
          <b>Requirements JSON:</b>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
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
          borderLeft: "1px solid rgba(148,163,184,0.5)",
          padding: 20,
          overflowY: "auto",
          zIndex: 1000,
        }}
      >
        <h2>Email Sending Results</h2>

        <p>
          <strong>Sent:</strong> {results.sentCount}
          <br />
          <strong>Failed:</strong> {results.failedCount}
        </p>

        <h3>Sent:</h3>
        <pre style={{ fontSize: 12 }}>
{JSON.stringify(results.sent, null, 2)}
        </pre>

        <h3>Failed:</h3>
        <pre style={{ fontSize: 12, color: "#fca5a5" }}>
{JSON.stringify(results.failed, null, 2)}
        </pre>

        <button
          onClick={() => setResultsOpen(false)}
          style={{
            marginTop: 20,
            padding: "10px 16px",
            background: "rgba(31,41,55,0.8)",
            color: "white",
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.5)",
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
      <h1 style={{ fontSize: 28 }}>AI Onboarding Wizard — Step 3</h1>
      <p style={{ color: "#9ca3af", marginBottom: 20 }}>
        Review and send onboarding emails to your vendors.
      </p>

      {/* BACK BUTTON */}
      <button
        onClick={goBack}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          background: "rgba(31,41,55,0.7)",
          border: "1px solid rgba(148,163,184,0.4)",
          color: "white",
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        ← Back to Step 2
      </button>

      {/* EMAIL PREVIEWS */}
      {profiles.map((p) => renderEmailCard(p))}

      {/* SEND EMAILS BUTTON */}
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
            cursor: sending ? "not-allowed" : "pointer",
            fontSize: 16,
            color: "white",
          }}
        >
          {sending ? "Sending…" : "📨 Send All Onboarding Emails"}
        </button>
      )}

      {/* NEXT BUTTON */}
      {results && (
        <button
          onClick={goNext}
          style={{
            marginTop: 20,
            marginLeft: 10,
            padding: "12px 20px",
            borderRadius: 12,
            background: "linear-gradient(90deg,#10b981,#059669)",
            border: "1px solid #10b981",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Continue → Step 4
        </button>
      )}

      {renderResultsDrawer()}

      <ToastV2
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() =>
          setToast((p) => ({ ...p, open: false }))
        }
      />
    </div>
  );
}
