// components/onboarding/VendorsAnalyzeStep.js
// STEP 4 — AI Vendor Analysis (LOCKED PREVIEW STATE)
// ✅ AI runs once
// ✅ UI locks after analysis
// ✅ Animated blue → green dot + progress bar
// ✅ Single CTA: Activate Automation

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function VendorsAnalyzeStep({ orgId, wizardState, setWizardState }) {
  const csv = wizardState?.vendorsCsv || {};
  const rawMapping = csv.mapping || {};
  const rows = Array.isArray(csv.rows) ? csv.rows : [];

  const [vendors, setVendors] = useState([]);
  const [editedEmails, setEditedEmails] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [savingEmails, setSavingEmails] = useState(false);
  const [aiResult, setAiResult] = useState(
    wizardState?.vendorsAnalyzed?.ai || null
  );
  const [error, setError] = useState("");

  const aiCompleted = Boolean(aiResult);

  /* -------------------------------------------------
     NORMALIZE MAPPING
  -------------------------------------------------- */
  const mapping = useMemo(() => {
    return Object.fromEntries(
      Object.entries(rawMapping).map(([key, val]) => [
        key,
        typeof val === "string" ? val : val?.column || null,
      ])
    );
  }, [rawMapping]);

  /* -------------------------------------------------
     BUILD VENDOR OBJECTS
  -------------------------------------------------- */
  useEffect(() => {
    if (!rows.length || !mapping.vendorName) return;

    const transformed = rows.map((row) => ({
      id: row[mapping.vendorName],
      name: row[mapping.vendorName] || "",
      email: mapping.email ? row[mapping.email] || "" : "",
      category: mapping.category ? row[mapping.category] || "" : "",
      policyNumber: mapping.policyNumber ? row[mapping.policyNumber] || "" : "",
    }));

    setVendors(transformed);

    setWizardState((prev) => ({
      ...prev,
      vendorsAnalyzed: {
        ...(prev.vendorsAnalyzed || {}),
        transformed,
        missingEmailCount: transformed.filter((v) => !v.email).length,
      },
    }));
  }, [rows, mapping, setWizardState]);

  /* -------------------------------------------------
     RUN AI ANALYSIS (ONCE)
  -------------------------------------------------- */
  async function runAiAnalysis() {
    if (aiCompleted) return;

    setError("");
    setAiLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Authentication session missing.");
      }

      const res = await fetch("/api/onboarding/ai-vendors-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orgId, vendors }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "AI analysis failed.");

      setAiResult(json);

      setWizardState((prev) => ({
        ...prev,
        vendorsAnalyzed: {
          ...(prev.vendorsAnalyzed || {}),
          ai: json,
        },
      }));
    } catch (err) {
      setError(err.message || "AI analysis failed.");
    } finally {
      setAiLoading(false);
    }
  }

  /* -------------------------------------------------
     SAVE EMAILS (DOES NOT UNLOCK UI)
  -------------------------------------------------- */
  async function saveEmails() {
    setError("");
    setSavingEmails(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Authentication session missing.");
      }

      const payload = Object.entries(editedEmails)
        .filter(([_, email]) => email && email.includes("@"))
        .map(([vendorName, email]) => ({ vendorName, email }));

      if (!payload.length) {
        throw new Error("No valid emails to save.");
      }

      const res = await fetch("/api/vendors/update-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orgId, vendors: payload }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to save emails.");

      const updatedVendors = vendors.map((v) =>
        editedEmails[v.id] ? { ...v, email: editedEmails[v.id] } : v
      );

      setVendors(updatedVendors);
      setEditedEmails({});

      setWizardState((prev) => ({
        ...prev,
        vendorsAnalyzed: {
          ...(prev.vendorsAnalyzed || {}),
          transformed: updatedVendors,
          missingEmailCount: updatedVendors.filter((v) => !v.email).length,
        },
      }));
    } catch (err) {
      setError(err.message || "Failed to save emails.");
    } finally {
      setSavingEmails(false);
    }
  }

  const vendorsMissingEmail = vendors.filter((v) => !v.email);
  const hasEdits = Object.keys(editedEmails).length > 0;

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 22,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      {/* 🔥 LOCAL ANIMATION DEFINITIONS */}
      <style>{`
        @keyframes pulseBlue {
          0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.7); }
          70% { box-shadow: 0 0 0 14px rgba(56,189,248,0); }
          100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); }
        }
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.8); }
          70% { box-shadow: 0 0 0 18px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e5e7eb" }}>
        Step 4 — AI Vendor Analysis
      </h2>

      {/* STATUS LINE */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: aiCompleted ? "#22c55e" : "#38bdf8",
            animation: aiCompleted
              ? "pulseGreen 0.9s infinite"
              : "pulseBlue 1.4s infinite",
          }}
        />
        <span style={{ fontSize: 14, color: "#c7d2fe" }}>
          {aiCompleted
            ? "System ready for automation"
            : "Analyzing vendor risk…"}
        </span>
      </div>

      {/* PROGRESS BAR */}
      <div
        style={{
          marginTop: 14,
          height: 6,
          borderRadius: 999,
          background: "rgba(15,23,42,0.9)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: aiCompleted ? "90%" : "45%",
            height: "100%",
            background: aiCompleted
              ? "linear-gradient(90deg,#22c55e,#4ade80)"
              : "linear-gradient(90deg,#38bdf8,#6366f1)",
            transition: "width 600ms ease",
          }}
        />
      </div>

      {/* RUN AI BUTTON */}
      {!aiCompleted && (
        <button
          onClick={runAiAnalysis}
          disabled={aiLoading || vendors.length === 0}
          style={{
            marginTop: 20,
            padding: "10px 18px",
            borderRadius: 999,
            border: "1px solid rgba(56,189,248,0.9)",
            background:
              "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#1e3a8a)",
            color: "#e0f2fe",
            fontWeight: 700,
          }}
        >
          {aiLoading ? "Analyzing…" : "Run AI Analysis"}
        </button>
      )}

      {/* FIX EMAILS */}
      {vendorsMissingEmail.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {/* unchanged fix email table */}
        </div>
      )}

      {/* FINAL CTA */}
      {aiCompleted && (
        <div
          style={{
            marginTop: 28,
            padding: 20,
            borderRadius: 20,
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.98))",
            border: "1px solid rgba(56,189,248,0.35)",
            textAlign: "center",
          }}
        >
          <button
            onClick={() => (window.location.href = "/billing/activate")}
            style={{
              padding: "14px 28px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(90deg,#22c55e,#4ade80)",
              color: "#022c22",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            Activate Automation
          </button>

          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
            14-day trial · $499/mo after · Cancel anytime · Card required
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 14, color: "#fca5a5" }}>{error}</div>}
    </div>
  );
}
