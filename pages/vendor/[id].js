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

  // Fix Plan State
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixSubject, setFixSubject] = useState("");
  const [fixBody, setFixBody] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  // ------------- LOAD VENDOR / POLICIES ---------------
  useEffect(() => {
    if (!id) return;

    async function loadVendor() {
      try {
        setLoadingVendor(true);

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();

        if (!res.ok || !data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies);

        if (data.vendor && data.vendor.org_id) {
          await loadCompliance(data.vendor.id, data.vendor.org_id);
        } else {
          setLoadingCompliance(false);
        }
      } catch (err) {
        setError(err.message);
        setLoadingCompliance(false);
      } finally {
        setLoadingVendor(false);
      }
    }

    async function loadCompliance(vendorId, orgId) {
      try {
        setLoadingCompliance(true);

        const res = await fetch(
          `/api/requirements/check?vendorId=${vendorId}&orgId=${orgId}`
        );
        const data = await res.json();

        if (!data.ok) throw new Error(data.error);

        setCompliance(data);
      } catch (err) {
        setCompliance({ error: err.message });
      } finally {
        setLoadingCompliance(false);
      }
    }

    loadVendor();
  }, [id]);

  // ------------- FIX PLAN LOADER ---------------
  async function loadFixPlan() {
    if (!vendor || !org) return;

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

      if (!data.ok) throw new Error(data.error);

      setFixSteps(data.steps || []);
      setFixSubject(data.vendorEmailSubject || "");
      setFixBody(data.vendorEmailBody || "");
      setFixInternalNotes(data.internalNotes || "");
    } catch (err) {
      setFixError(err.message || "Failed to generate fix plan.");
    } finally {
      setFixLoading(false);
    }
  }

  // AUTO RUN FIX PLAN WHEN OPENED VIA ALERTS
  useEffect(() => {
    if (router.query.fixPlan === "1" && vendor && org) {
      loadFixPlan();
    }
  }, [router.query, vendor, org]);


  // -------------- STATES ---------------
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

  // -------------- UI ---------------
  return (
    <div style={{ padding: "30px 40px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>
        {vendor.name}
      </h1>

      {org && (
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          Organization: <strong>{org.name}</strong>
        </p>
      )}

      {/* ================= COMPLIANCE ================= */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
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
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              {compliance.summary}
            </p>

            {compliance.missing?.length > 0 && (
              <>
                <h4 style={{ color: "#b91c1c" }}>Missing Coverage</h4>
                <ul>
                  {compliance.missing.map((m, idx) => (
                    <li key={idx}>{m.coverage_type}</li>
                  ))}
                </ul>
              </>
            )}

            {compliance.failing?.length > 0 && (
              <>
                <h4 style={{ color: "#b45309", marginTop: 12 }}>
                  Failing Requirements
                </h4>
                <ul>
                  {compliance.failing.map((f, idx) => (
                    <li key={idx}>
                      {f.coverage_type}: {f.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {compliance.passing?.length > 0 && (
              <>
                <h4 style={{ color: "#15803d", marginTop: 12 }}>Passing</h4>
                <ul>
                  {compliance.passing.map((p, idx) => (
                    <li key={idx}>{p.coverage_type}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {/* ============== FIX PLAN PANEL ============== */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>AI Fix Plan</h2>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Hybrid G+Legal remediation steps and vendor email.
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
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {fixLoading ? "Generating…" : "Generate Fix Plan"}
          </button>
        </div>

        {fixError && (
          <p style={{ color: "red", fontSize: 13 }}>{fixError}</p>
        )}

        {fixSteps.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Action Steps</h3>
            <ol style={{ paddingLeft: 20 }}>
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
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>
              Vendor Email Subject
            </h3>
            <p
              style={{
                border: "1px solid #e5e7eb",
                padding: 8,
                borderRadius: 8,
                background: "#f9fafb",
              }}
            >
              {fixSubject}
            </p>
          </div>
        )}

        {fixBody && (
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Vendor Email Body</h3>
            <textarea
              readOnly
              value={fixBody}
              style={{
                width: "100%",
                minHeight: 140,
                border: "1px solid #e5e7eb",
                padding: 10,
                borderRadius: 8,
                fontFamily: "system-ui",
                whiteSpace: "pre-wrap",
              }}
            />
          </div>
        )}

        {fixInternalNotes && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Internal Notes</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{fixInternalNotes}</p>
          </div>
        )}
      </div>

      {/* ================= POLICIES ================= */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          Policies
        </h2>

        {policies.length === 0 && <p>No policies on file.</p>}

        {policies.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 12,
              background: "#f9fafb",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              marginBottom: 10,
            }}
          >
            <p style={{ fontWeight: 600 }}>{p.coverage_type}</p>
            <p>Policy #: {p.policy_number || "—"}</p>
            <p>Carrier: {p.carrier || "—"}</p>
            <p>
              Effective: {p.effective_date || "—"} — Expires:{" "}
              {p.expiration_date || "—"}
            </p>
            <p>
              Limits: {p.limit_each_occurrence || "—"} /{" "}
              {p.limit_aggregate || "—"}
            </p>
          </div>
        ))}
      </div>

      <a href="/dashboard" style={{ color: "#2563eb", fontSize: 14 }}>
        ← Back to Dashboard
      </a>
    </div>
  );
}
