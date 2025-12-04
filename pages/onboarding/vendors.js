// pages/onboarding/vendors.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingVendors() {
  const router = useRouter();

  /* ==========================================================
     MULTI-VENDOR LIST
     Each vendor = { name, email }
  ========================================================== */
  const [vendors, setVendors] = useState([
    { name: "", email: "" }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ==========================================================
     LOAD AI VENDOR SUGGESTIONS
     From onboarding_ai_intel stored during Company → Insurance steps
  ========================================================== */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding_ai_intel");
      if (!raw) return;

      const intel = JSON.parse(raw);

      // Expecting array of suggested vendors:
      // intel.vendorSuggestions = [
      //   { name: "Acme Roofing LLC", email: "owner@acme.com" },
      //   { name: "Fast Plumbing", email: "ops@plumbfast.com" }
      // ]

      if (Array.isArray(intel.vendorSuggestions) && intel.vendorSuggestions.length > 0) {
        setVendors(intel.vendorSuggestions);
        console.log("AI Multi-Vendor Suggestions Loaded:", intel.vendorSuggestions);
      }
    } catch (err) {
      console.warn("Could not load AI vendor suggestions:", err);
    }
  }, []);

  /* ==========================================================
     HANDLERS FOR MULTI-VENDOR INPUTS
  ========================================================== */
  function updateVendor(index, field, value) {
    setVendors((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  }

  function addVendorRow() {
    setVendors((prev) => [...prev, { name: "", email: "" }]);
  }

  function removeVendorRow(i) {
    setVendors((prev) => prev.filter((_, index) => index !== i));
  }

  /* ==========================================================
     SUBMIT — Send MULTIPLE vendors to backend
  ========================================================== */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate all vendors
    const cleaned = vendors.filter((v) => v.name.trim() || v.email.trim());

    if (cleaned.length === 0) {
      setError("You must enter at least one vendor.");
      setLoading(false);
      return;
    }

    for (const v of cleaned) {
      if (!v.name.trim()) {
        setError("Every vendor must have a name.");
        setLoading(false);
        return;
      }
      if (!v.email.includes("@")) {
        setError(`Vendor email "${v.email}" is not valid.`);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/onboarding/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("supabase_token") || ""
          }`,
        },
        body: JSON.stringify({ vendors: cleaned }), // 🔥 MULTI-VENDOR payload
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Could not create vendors.");

      router.push("/onboarding/complete");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
     UI
  ========================================================== */
  return (
    <OnboardingLayout
      currentKey="vendors"
      title="Invite Your First Vendors"
      subtitle="You can invite multiple vendors now or add more later from the dashboard."
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
            gap: 20,
          }}
        >
          {/* LEFT SIDE — MULTI-VENDOR LIST */}
          <div>
            {vendors.map((v, i) => (
              <div
                key={i}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  marginBottom: 12,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(75,85,99,0.9)",
                }}
              >
                <div style={{ display: "flex", gap: 12 }}>
                  {/* Vendor Name */}
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Vendor Name</label>
                    <input
                      style={inputStyle}
                      value={v.name}
                      onChange={(e) =>
                        updateVendor(i, "name", e.target.value)
                      }
                      placeholder="Acme Roofing LLC"
                    />
                  </div>

                  {/* Vendor Email */}
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Email</label>
                    <input
                      style={inputStyle}
                      value={v.email}
                      onChange={(e) =>
                        updateVendor(i, "email", e.target.value)
                      }
                      placeholder="owner@vendor.com"
                    />
                  </div>
                </div>

                {/* Remove row */}
                {vendors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVendorRow(i)}
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "#fb7185",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ✖ Remove
                  </button>
                )}
              </div>
            ))}

            {/* Add vendor button */}
            <button
              type="button"
              onClick={addVendorRow}
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.96)",
                border: "1px solid rgba(56,189,248,0.7)",
                color: "#e5f2ff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              + Add Vendor
            </button>

            {/* Error Box */}
            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(127,29,29,0.9)",
                  border: "1px solid rgba(248,113,113,0.8)",
                  color: "#fecaca",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 20,
                padding: "10px 22px",
                borderRadius: 999,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                border: "1px solid rgba(56,189,248,0.9)",
                background:
                  "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
                color: "#e5f2ff",
                fontSize: 15,
                fontWeight: 600,
                boxShadow:
                  "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(88,28,135,0.4)",
              }}
            >
              {loading ? "Inviting Vendors…" : "Send Invites & Continue →"}
            </button>
          </div>

          {/* RIGHT SIDE — INFO PANEL */}
          <div
            style={{
              borderRadius: 18,
              padding: 16,
              border: "1px solid rgba(148,163,184,0.55)",
              background:
                "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              fontSize: 13,
              color: "#9ca3af",
              lineHeight: 1.5,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 15,
                color: "#e5e7eb",
              }}
            >
              Why invite multiple vendors?
            </h3>

            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                AI pre-screens your vendor list and recommends the highest-risk
                ones to onboard first.
              </li>
              <li>Magic-link invitations allow vendors to upload COIs instantly.</li>
              <li>
                You can onboard dozens or hundreds of vendors in minutes instead of
                weeks.
              </li>
            </ul>

            <p style={{ marginTop: 14, fontSize: 12, color: "#a5b4fc" }}>
              Bulk vendor onboarding gives you a massive head start over myCOI,
              TrustLayer, and every competitor.
            </p>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
}

/* ========== Styles ========== */
const labelStyle = {
  display: "block",
  fontSize: 11,
  color: "#9ca3af",
  marginBottom: 4,
  marginTop: 12,
};

const inputStyle = {
  width: "100%",
  borderRadius: 999,
  padding: "8px 12px",
  border: "1px solid rgba(51,65,85,0.9)",
  background: "rgba(15,23,42,0.96)",
  color: "#e5e7eb",
  fontSize: 13,
  outline: "none",
};
