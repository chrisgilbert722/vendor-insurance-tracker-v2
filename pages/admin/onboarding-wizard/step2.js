// pages/admin/onboarding-wizard/step2.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 2 (AI REQUIREMENTS GENERATOR)
// Takes parsed vendor rows → AI generates requirements profile
// ==========================================================

import { useState, useEffect } from "react";
import { openai } from "../../../lib/openaiClient";
import ToastV2 from "../../../components/ToastV2";

export default function OnboardingWizardStep2({ vendors = [] }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // If this page loads without vendors (direct nav), redirect back
  useEffect(() => {
    if (!vendors || vendors.length === 0) {
      console.warn("No vendors passed to step2.");
    }
  }, [vendors]);
{
  "version": "v5",
  "work_type": "Electrician",
  "required_coverages": ["General Liability", "Auto", "Workers Comp"],
  "limits": {
    "gl_eachOccurrence": 1000000,
    "gl_aggregate": 2000000
  },
  "endorsements": ["Additional Insured", "Waiver of Subrogation"],
  "risk_category": "medium"
}
  // ============================================================
  // AI GENERATE REQUIREMENTS FOR ALL VENDORS
  // ============================================================
  async function generateRequirements() {
    if (!vendors.length) {
      return setToast({
        open: true,
        type: "error",
        message: "Upload vendor list in Step 1 first.",
      });
    }

    setLoading(true);

    try {
      const newProfiles = [];

      for (const vendor of vendors) {
        const prompt = `
You are an insurance compliance AI.
Based on this vendor information:

${JSON.stringify(vendor, null, 2)}

Generate a requirements profile for liability compliance.
Return ONLY JSON in this format:

{
  "version": "v5",
  "work_type": string,
  "required_coverages": [ "GL", "Auto", "WC", "Umbrella", ... ],
  "limits": {
    "gl_eachOccurrence": number,
    "gl_aggregate": number,
    "auto_csl": number,
    "umbrella_limit": number
  },
  "endorsements": [ "Additional Insured", "Waiver of Subrogation", ... ],
  "risk_category": "low" | "medium" | "high",
  "notes": string
}

RULES:
- If the vendor is a contractor, require GL 1M/2M + WC + Auto 1M CSL.
- If vendor works with vehicles, require Auto 1M CSL.
- If vendor is high-risk (roofing, tree trimming, electrical, HVAC), add Umbrella 1M.
- Include endorsements whenever GL is required.
- Always output JSON only.
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
          vendor,
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
        message: "AI failed to generate requirements.",
      });
    } finally {
      setLoading(false);
    }
  }
  // ============================================================
  // RENDER GENERATED PROFILES
  // ============================================================
  function renderProfiles() {
    if (!profiles.length) return null;

    return (
      <div style={{ marginTop: 30 }}>
        <h3 style={{ fontSize: 20, marginBottom: 10 }}>
          Generated Vendor Profiles
        </h3>

        {profiles.map((item, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 30,
              padding: 20,
              borderRadius: 16,
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(148,163,184,0.3)",
            }}
          >
            <h4 style={{ margin: 0, marginBottom: 10 }}>
              {item.vendor.vendor_name || "Unknown Vendor"}
            </h4>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                color: "#e5e7eb",
              }}
            >
{JSON.stringify(item.profile, null, 2)}
            </pre>

            <button
              style={{
                marginTop: 10,
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(56,189,248,0.9)",
                background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                color: "white",
                cursor: "pointer",
              }}
              onClick={() => setSelectedVendor(item)}
            >
              Review & Continue →
            </button>
          </div>
        ))}
      </div>
    );
  }
  function renderSelectedVendor() {
    if (!selectedVendor) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 420,
          height: "100vh",
          background: "rgba(15,23,42,0.96)",
          padding: 20,
          overflowY: "auto",
          borderLeft: "1px solid rgba(148,163,184,0.4)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.6)",
        }}
      >
        <h3 style={{ fontSize: 20, marginBottom: 10 }}>
          Vendor Profile Review
        </h3>

        <pre style={{ color: "#e5e7eb", fontSize: 12 }}>
{JSON.stringify(selectedVendor.profile, null, 2)}
        </pre>

        <button
          onClick={() => {
            // In Step 3 we will push these into DB and send onboarding emails
            console.log("Proceed to Step 3 with:", selectedVendor);
          }}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid rgba(56,189,248,0.9)",
            background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            color: "white",
            cursor: "pointer",
          }}
        >
          Proceed to Step 3 →
        </button>
      </div>
    );
  }
  return (
    <div style={{ padding: 40, color: "white" }}>
      <h1 style={{ fontSize: 30, marginBottom: 20 }}>
        AI Onboarding Wizard — Step 2  
      </h1>

      <p style={{ fontSize: 14, color: "#9ca3af", maxWidth: 600 }}>
        AI will automatically generate compliance requirement profiles
        for every vendor based on CSV data from Step 1.
      </p>

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
        {loading ? "Analyzing Vendors…" : "⚡ Generate Requirements for All Vendors"}
      </button>

      {renderProfiles()}
      {renderSelectedVendor()}

      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
