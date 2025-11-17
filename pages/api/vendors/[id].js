// pages/vendor/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function VendorPage() {
  const router = useRouter();
  const { id } = router.query;

  const [vendor, setVendor] = useState(null);
  const [org, setOrg] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [compliance, setCompliance] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [error, setError] = useState("");

  // Fix Plan Engine state
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixSubject, setFixSubject] = useState("");
  const [fixBody, setFixBody] = useState("");
  const [fixNotes, setFixNotes] = useState("");

  // -----------------------------------------
  // 1️⃣ LOAD VENDOR + POLICIES + ORG
  // -----------------------------------------
  useEffect(() => {
    if (!id) return;

    async function loadVendor() {
      try {
        setLoading(true);

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();

        if (!data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setOrg(data.organization || null);
        setPolicies(data.policies || []);

        // trigger compliance load
        if (data.vendor && data.vendor.org_id) {
          loadCompliance(data.vendor.id, data.vendor.org_id);
        }
      } catch (err) {
        console.error("VENDOR LOAD ERROR:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    async function loadCompliance(vendorId, orgId) {
      try {
        setLoadingCompliance(true);

        const url = `/api/requirements/check?vendorId=${vendorId}&orgId=${orgId}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setCompliance({ error: data.error || "Compliance engine error" });
          return;
        }

        setCompliance(data);
      } catch (err) {
        console.error("COMPLIANCE ERROR:", err);
        setCompliance({ error: err.message });
      } finally {
        setLoadingCompliance(false);
      }
    }

    loadVendor();
  }, [id]);

  // -----------------------------------------
  // 2️⃣ FIX PLAN HANDLER
  // -----------------------------------------
  async function generateFixPlan() {
    if (!vendor || !vendor.org_id) {
      setFixError("Missing vendor or org_id.");
      return;
    }

    setFixLoading(true);
    setFixError("");
    setFixSteps([]);
    setFixSubject("");
    setFixBody("");
    setFixNotes("");

    try {
      const url = `/api/vendor/fix-plan?vendorId=${vendor.id}&orgId=${vendor.org_id}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.ok) throw new Error(data.error);

      setFixSteps(data.steps || []);
      setFixSubject(data.vendorEmailSubject || "");
      setFixBody(data.vendorEmailBody || "");
      setFixNotes(data.internalNotes || "");
    } catch (err) {
      console.error("FIX PLAN ERROR:", err);
      setFixError(err.message || "Failed to generate fix plan.");
    } finally {
      setFixLoading(false);
    }
  }

  // -----------------------------------------
  // 3️⃣ LOADING/ERROR STATES
  // -----------------------------------------
  if (loading) {
    return (
      <div style={{ padding: "40px" }}>
        <h1>Loading vendor…</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px" }}>
        <h1>Error</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div style={{ padding: "40px" }}>
        <h1>Vendor not found</h1>
      </div>
    );
  }

  // -----------------------------------------
  // 4️⃣ UI — ELITE VENDOR PROFILE
  // -----------------------------------------
  return (
    <div style={{ padding: "30px 40px", maxWidth: 900, margin: "0 auto" }}>
      {/* HEADER */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {vendor.name}
      </h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
        Full risk profile, policies, compliance status & AI-driven remediation.
      </p>

      {/* ORG INFO */}
      {org && (
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          Organization: <strong>{org.name}</strong>
        </p>
      )}

      {/* ================= COMPLIANCE PANEL ================= */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          padding: 20,
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Compliance Summary
        </h2>

        {loadingCompliance && <p>Checking compliance…</p>}

        {compliance?.error && (
          <p style={{ color: "red", fontSize: 14 }}>
            ❌ {compliance.error}
          </p>
        )}

        {!loadingCompliance && compliance && !compliance.error && (
          <>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {compliance.summary}
            </p>

            {/* Missing Coverage */}
            {compliance.missing?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <h4 style={{ color: "#b91c1c", marginBottom: 4 }}>
                  Missing Coverage
                </h4>
                <ul>
                  {compliance.missing.map((m, idx) => (
                    <li key={idx}>{m.coverage_type}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Failing Requirements */}
            {compliance.failing?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <h4 style={{ color: "#b45309", marginBottom: 4 }}>
                  Failing Requirements
                </h4>
                <ul>
                  {compliance.failing.map((f, idx) => (
                    <li key={idx}>
                      {f.coverage_type}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Passing */}
            {compliance.passing?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <h4 style={{ color: "#15803d", marginBottom: 4 }}>
                  Passing
                </h4>
                <ul>
                  {compliance.passing.map((p, idx) => (
                    <li key={idx}>{p.coverage_type} (Compliant)</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= AI FIX PLAN PANEL ================= */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          padding: 20,
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 10,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              AI Fix Plan (Hybrid G + Legal)
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Generate a remediation plan, vendor email, and internal notes.
            </p>
          </div>

          <button
            onClick={generateFixPlan}
            disabled={fixLoading}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              background: fixLoading ? "#9ca3af" : "#0f172a",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: fixLoading ? "not-allowed" : "pointer",
            }}
          >
            {fixLoading ? "Thinking…" : "Generate Fix Plan"}
          </button>
        </div>

        {fixError && (
          <p style={{ color: "red", fontSize: 13, marginBottom: 8 }}>
            {fixError}
          </p>
        )}

        {fixSteps.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Action Steps
            </h3>
            <ol style={{ paddingLeft: 20, fontSize: 13, color: "#374151" }}>
              {fixSteps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {fixSubject && (
          <div style={{ marginBottom: 12 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Vendor Email — Subject
            </h3>
            <p
              style={{
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                fontSize: 13,
              }}
            >
              {fixSubject}
            </p>
          </div>
        )}

        {fixBody && (
          <div style={{ marginBottom: 12 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Vendor Email — Body
            </h3>
            <textarea
              readOnly
              value={fixBody}
              style={{
                width: "100%",
                minHeight: 140,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                fontFamily: "system-ui",
                whiteSpace: "pre-wrap",
              }}
            />
          </div>
        )}

        {fixNotes && (
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Internal Notes
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "#4b5563",
                whiteSpace: "pre-wrap",
              }}
            >
              {fixNotes}
            </p>
          </div>
        )}

        {!fixLoading &&
          !fixError &&
          fixSteps.length === 0 &&
          !fixBody &&
          !fixSubject &&
          !fixNotes && (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              No fix plan generated yet. Click{" "}
              <strong>Generate Fix Plan</strong> to get AI remediation.
            </p>
          )}
      </div>

      {/* ================= POLICIES ================= */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          padding: 20,
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Policies
        </h2>

        {policies.length === 0 && <p>No policies found.</p>}

        {policies.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
              background: "#f9fafb",
            }}
          >
            <p style={{ fontWeight: 600 }}>{p.coverage_type}</p>
            <p>Policy #: {p.policy_number || "—"}</p>
            <p>Carrier: {p.carrier || "—"}</p>
            <p>
              Effective: {p.effective_date || "—"} • Expires:{" "}
              {p.expiration_date || "—"}
            </p>
          </div>
        ))}
      </div>

      {/* BACK LINK */}
      <a href="/dashboard" style={{ color: "#2563eb", fontSize: 14 }}>
        ← Back to Dashboard
      </a>
    </div>
  );
}
