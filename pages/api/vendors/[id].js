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
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [error, setError] = useState("");

  // Fix Plan state
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixSubject, setFixSubject] = useState("");
  const [fixBody, setFixBody] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  // -----------------------------------------
  // 1️⃣ LOAD VENDOR + POLICIES + ORG
  // -----------------------------------------
  useEffect(() => {
    if (!id) return;

    async function loadVendor() {
      try {
        setLoadingVendor(true);
        setError("");

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();

        if (!data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies);

        if (data.complianceCheckUrl) {
          await loadCompliance(data.complianceCheckUrl);
        } else {
          setLoadingCompliance(false);
        }
      } catch (err) {
        console.error("VENDOR LOAD ERROR:", err);
        setError(err.message);
        setLoadingCompliance(false);
      } finally {
        setLoadingVendor(false);
      }
    }

    async function loadCompliance(url) {
      try {
        setLoadingCompliance(true);

        const res = await fetch(url);
        const data = await res.json();

        if (!data.ok) throw new Error(data.error);

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
  // 2️⃣ FIX PLAN LOADER
  // -----------------------------------------
  async function loadFixPlan() {
    if (!id || !vendor || !org) return;

    try {
      setFixLoading(true);
      setFixError("");
      setFixSteps([]);
      setFixSubject("");
      setFixBody("");
      setFixInternalNotes("");

      const res = await fetch(
        `/api/vendor/fix-plan?vendorId=${vendor.id}&orgId=${org.id}`
      );
      const data = await res.json();

      if (!res.ok || !data.ok) throw new Error(data.error);

      setFixSteps(data.steps || []);
      setFixSubject(data.vendorEmailSubject || "");
      setFixBody(data.vendorEmailBody || "");
      setFixInternalNotes(data.internalNotes || "");
    } catch (err) {
      console.error("FIX PLAN ERROR:", err);
      setFixError(err.message || "Failed to generate fix plan.");
    } finally {
      setFixLoading(false);
    }
  }

  // -----------------------------------------
  // 3️⃣ LOADING / ERROR STATES
  // -----------------------------------------
  if (loadingVendor) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Loading vendor…</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Error</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Vendor not found</h1>
      </div>
    );
  }

  // -----------------------------------------
  // 4️⃣ UI
  // -----------------------------------------
  return (
    <div style={{ padding: "30px 40px" }}>
      {/* HEADER */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 6,
          color: "#0f172a",
        }}
      >
        {vendor.name}
      </h1>

      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
        {org ? `Organization: ${org.name}` : "No organization assigned"}
      </p>

      {/* COMPLIANCE SUMMARY */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Compliance Summary
        </h2>

        {loadingCompliance && <p>Checking compliance…</p>}

        {compliance?.error && (
          <p style={{ color: "red" }}>❌ {compliance.error}</p>
        )}

        {!loadingCompliance && compliance && !compliance.error && (
          <>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 10,
              }}
            >
              {compliance.summary}
            </p>

            {compliance.missing?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
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

            {compliance.failing?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
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

            {compliance.passing?.length > 0 && (
              <div>
                <h4 style={{ color: "#16a34a", marginBottom: 4 }}>Passing</h4>
                <ul>
                  {compliance.passing.map((p, idx) => (
                    <li key={idx}>{p.coverage_type}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI FIX PLAN PANEL */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
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
              AI Fix Plan
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Hybrid G+Legal plan to remediate coverage issues with this vendor.
            </p>
          </div>

          <button
            onClick={loadFixPlan}
            disabled={fixLoading}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              background: "#0f172a",
              color: "white",
              cursor: fixLoading ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {fixLoading ? "Generating..." : "Generate Fix Plan"}
          </button>
        </div>

        {fixError && (
          <p style={{ color: "red", fontSize: 13 }}>{fixError}</p>
        )}

        {!fixLoading &&
          !fixError &&
          fixSteps.length === 0 &&
          !fixBody &&
          !fixInternalNotes && (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              No fix plan generated yet. Click{" "}
              <strong>Generate Fix Plan</strong> to see recommendations.
            </p>
          )}

        {fixSteps.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Action Steps
            </h3>
            <ol style={{ paddingLeft: 20, fontSize: 13 }}>
              {fixSteps.map((s, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {fixSubject && (
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              Vendor Email Subject
            </h3>
            <p
              style={{
                fontSize: 13,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              {fixSubject}
            </p>
          </div>
        )}

        {fixBody && (
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              Vendor Email Body
            </h3>
            <textarea
              readOnly
              value={fixBody}
              style={{
                width: "100%",
                minHeight: 120,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                fontFamily: "system-ui, -apple-system, sans-serif",
                whiteSpace: "pre-wrap",
              }}
            />
          </div>
        )}

        {fixInternalNotes && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              Internal Notes
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "#4b5563",
                whiteSpace: "pre-line",
              }}
            >
              {fixInternalNotes}
            </p>
          </div>
        )}
      </div>

      {/* POLICIES */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Policies
        </h2>

        {policies.length === 0 && <p>No policies on file.</p>}

        {policies.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              marginBottom: 10,
              background: "#f9fafb",
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 4 }}>
              {p.coverage_type || "Coverage"}
            </p>
            <p style={{ marginBottom: 2 }}>Carrier: {p.carrier || "—"}</p>
            <p style={{ marginBottom: 2 }}>
              Policy #: {p.policy_number || "—"}
            </p>
            <p style={{ marginBottom: 2 }}>
              Effective: {p.effective_date || "—"} — Expires:{" "}
              {p.expiration_date || "—"}
            </p>
            <p style={{ marginBottom: 0 }}>
              Limits: {p.limit_each_occurrence || "—"} /{" "}
              {p.limit_aggregate || "—"}
            </p>
          </div>
        ))}
      </div>

      {/* BACK */}
      <a href="/dashboard" style={{ fontSize: 13, color: "#2563eb" }}>
        ← Back to Dashboard
      </a>
    </div>
  );
}
