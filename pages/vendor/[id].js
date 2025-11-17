// pages/vendor/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useOrg } from "../../context/OrgContext";
import { useRole } from "../../lib/useRole";

export default function VendorProfile() {
  const router = useRouter();
  const { id: vendorId } = router.query;

  const { activeOrgId } = useOrg();
  const { isAdmin, isManager, isViewer, loading: loadingRole } = useRole();

  const [vendor, setVendor] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [aiSummary, setAiSummary] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixVendorEmail, setFixVendorEmail] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  const canManage = isAdmin || isManager;

  /* LOAD VENDOR + POLICIES (NEW API) */
  useEffect(() => {
    if (!vendorId || !activeOrgId) return;

    async function loadVendor() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/vendors/${vendorId}`);
        const data = await res.json();

        if (!res.ok || !data.ok) throw new Error(data.error);
        setVendor(data.vendor);
        setPolicies(data.policies);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadVendor();
  }, [vendorId, activeOrgId]);

  /* LOAD COMPLIANCE (REAL CACHED SYSTEM) */
  useEffect(() => {
    if (!vendorId || !activeOrgId) return;

    fetch(`/api/compliance/cache?vendorId=${vendorId}&orgId=${activeOrgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setCompliance({
            summary: data.summary,
            missing: data.missing || [],
            failing: data.failing || [],
            passing: data.passing || [],
            last_checked_at: data.last_checked_at,
          });
        } else {
          setCompliance({ error: data.error });
        }
      })
      .catch((err) => {
        setCompliance({ error: err.message });
      });
  }, [vendorId, activeOrgId]);

  /* LOAD ALERTS FOR THIS VENDOR */
  useEffect(() => {
    if (!activeOrgId) return;

    fetch(`/api/alerts?orgId=${activeOrgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        const vendorAlerts = (data.alerts || []).filter(
          (a) => String(a.vendor_id) === String(vendorId)
        );
        setAlerts(vendorAlerts);
        setAiSummary(data.aiSummary?.summaryText || "");
      })
      .catch((err) => console.error(err));
  }, [vendorId, activeOrgId]);

  /* AI FIX ACTION PLAN (NEW) */
  async function loadFixPlan() {
    if (!vendorId || !activeOrgId) return;
    setFixLoading(true);
    setFixError("");

    try {
      const res = await fetch(
        `/api/vendor/fix-actions?vendorId=${vendorId}&orgId=${activeOrgId}`
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setFixSteps(data.steps || []);
      setFixVendorEmail(data.vendorEmail || "");
      setFixInternalNotes(data.internalNotes || "");
    } catch (err) {
      setFixError(err.message || "Failed to load fix plan");
    } finally {
      setFixLoading(false);
    }
  }

  /* LOADING STATES */
  if (!vendorId || loadingRole) {
    return (
      <div style={{ padding: 40 }}>
        <p>Loading vendor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Error loading vendor</h1>
        <p>{error}</p>
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
        {vendor.name || vendor.vendor_name}
      </h1>

      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
        Full risk profile, policies, compliance status, alerts & AI insights.
      </p>

      {/* AI VENDOR RISK SUMMARY */}
      {aiSummary && (
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
            AI Vendor Risk Summary
          </h2>
          <p style={{ whiteSpace: "pre-line", color: "#374151" }}>
            {aiSummary}
          </p>
        </div>
      )}

      {/* COMPLIANCE SUMMARY */}
      <div
        style={{
          marginBottom: 32,
          padding: 20,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          Compliance Summary
        </h2>

        {!compliance ? (
          <p>Checking compliance…</p>
        ) : compliance.error ? (
          <p style={{ color: "red" }}>{compliance.error}</p>
        ) : (
          <>
            <p style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>
              {compliance.summary}
            </p>

            {compliance.missing.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, marginTop: 12, color: "#b45309" }}>
                  Missing Coverage
                </h3>
                <ul>
                  {compliance.missing.map((m, i) => (
                    <li key={i}>{m.coverage_type}</li>
                  ))}
                </ul>
              </>
            )}

            {compliance.failing.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, marginTop: 12, color: "#b91c1c" }}>
                  Failing Requirements
                </h3>
                <ul>
                  {compliance.failing.map((f, i) => (
                    <li key={i}>
                      {f.coverage_type}: {f.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {compliance.last_checked_at && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                Last checked:{" "}
                {new Date(compliance.last_checked_at).toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>

      {/* AI FIX PANEL */}
      <div
        style={{
          marginBottom: 32,
          padding: 20,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>AI Fix Plan</h2>
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
              fontWeight: 600,
            }}
          >
            {fixLoading ? "Thinking…" : "Generate Fix Plan"}
          </button>
        </div>

        {fixError && <p style={{ color: "red" }}>{fixError}</p>}

        {fixSteps.length > 0 && (
          <>
            <h3 style={{ marginTop: 12, fontSize: 14 }}>Action Steps</h3>
            <ol style={{ paddingLeft: 20 }}>
              {fixSteps.map((step, i) => (
                <li key={i} style={{ marginBottom: 5 }}>
                  {step}
                </li>
              ))}
            </ol>
          </>
        )}

        {fixVendorEmail && (
          <>
            <h3 style={{ marginTop: 12, fontSize: 14 }}>Email to Vendor</h3>
            <textarea
              value={fixVendorEmail}
              readOnly
              style={{
                width: "100%",
                padding: 10,
                minHeight: 120,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontFamily: "system-ui",
                whiteSpace: "pre-wrap",
              }}
            />
          </>
        )}

        {fixInternalNotes && (
          <>
            <h3 style={{ marginTop: 12, fontSize: 14 }}>Internal Notes</h3>
            <p style={{ whiteSpace: "pre-line", color: "#374151" }}>
              {fixInternalNotes}
            </p>
          </>
        )}
      </div>

      {/* ALERTS */}
      <div
        style={{
          marginBottom: 32,
          padding: 20,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          Alerts
        </h2>

        {alerts.length === 0 && <p>No alerts for this vendor.</p>}

        {alerts.map((a, i) => (
          <div
            key={i}
            style={{
              marginBottom: 10,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              background:
                a.severity === "critical"
                  ? "#fee2e2"
                  : a.severity === "warning"
                  ? "#fef3c7"
                  : "#eef6ff",
            }}
          >
            <p style={{ fontWeight: 600 }}>{a.message}</p>
            <p>Coverage: {a.coverage_type}</p>
          </div>
        ))}
      </div>

      {/* POLICIES */}
      <div
        style={{
          marginBottom: 32,
          padding: 20,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          Policies
        </h2>

        {policies.length === 0 && <p>No policies found.</p>}

        {policies.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 10,
            }}
          >
            <p style={{ fontWeight: 600 }}>{p.coverage_type}</p>
            <p>
              Carrier: {p.carrier} — Policy #{p.policy_number}
            </p>
            <p>
              Effective: {p.effective_date} | Expires: {p.expiration_date}
            </p>
            <p>Risk Score: {p.risk_score ?? "—"}</p>
          </div>
        ))}
      </div>

      {/* UPLOAD NEW COI */}
      {canManage && (
        <a
          href={`/upload-coi?vendor=${vendorId}`}
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            background: "#0f172a",
            color: "white",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Upload COI for this vendor
        </a>
      )}
    </div>
  );
}
