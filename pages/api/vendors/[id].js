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
        setOrg(data.organization);
        setPolicies(data.policies);

        // trigger compliance check
        if (data.complianceCheckUrl) {
          loadCompliance(data.complianceCheckUrl);
        }

      } catch (err) {
        console.error("VENDOR LOAD ERROR:", err);
        setError(err.message);
      } finally {
        setLoading(false);
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
  // 2️⃣ LOADING STATE
  // -----------------------------------------
  if (loading) {
    return (
      <div style={{ padding: "40px" }}>
        <h1>Loading vendor…</h1>
      </div>
    );
  }

  // -----------------------------------------
  // 3️⃣ ERROR STATE
  // -----------------------------------------
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
  // 4️⃣ UI — ELITE G-MODE VENDOR PAGE
  // -----------------------------------------

  return (
    <div style={{ padding: "30px 40px" }}>
      {/* HEADER */}
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          marginBottom: "8px",
        }}
      >
        {vendor.name}
      </h1>

      <p style={{ color: "#64748b", fontSize: 15, marginBottom: 25 }}>
        Full risk profile, policies, compliance status, alerts & AI insights.
      </p>

      {/* ========================================================
          COMPLIANCE PANEL
      ======================================================== */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          padding: 25,
          borderRadius: 16,
          marginBottom: 30,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 12,
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
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              {compliance.summary}
            </p>

            {/* Missing Coverage */}
            {compliance.missing?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ color: "#b91c1c", marginBottom: 6 }}>
                  Missing Coverage
                </h4>
                <ul>
                  {compliance.missing.map((m, idx) => (
                    <li key={idx}>{m.coverage_type}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Failing Coverage */}
            {compliance.failing?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ color: "#b45309", marginBottom: 6 }}>
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
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ color: "#15803d", marginBottom: 6 }}>
                  Passing
                </h4>
                <ul>
                  {compliance.passing.map((p, idx) => (
                    <li key={idx}>
                      {p.coverage_type}: Compliant
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================
          POLICIES LIST
      ======================================================== */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          padding: 25,
          borderRadius: 16,
          marginBottom: 30,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          Policies
        </h2>

        {policies.length === 0 && <p>No policies found.</p>}

        {policies.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              marginBottom: 12,
              background: "#f9fafb",
            }}
          >
            <p style={{ fontWeight: 600 }}>{p.coverage_type}</p>
            <p>Carrier: {p.carrier}</p>
            <p>Policy #: {p.policy_number}</p>
            <p>
              Effective: {p.effective_date || "—"} — Expires:{" "}
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
