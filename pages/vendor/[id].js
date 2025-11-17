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

  const canManage = isAdmin || isManager;

  // AI Vendor Fix Panel state
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixVendorEmail, setFixVendorEmail] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  // Load vendor + policies
  useEffect(() => {
    if (!vendorId || !activeOrgId) return;

    async function loadVendor() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/vendor/${vendorId}`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setPolicies(data.policies);
      } catch (err) {
        console.error("Vendor load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadVendor();
  }, [vendorId, activeOrgId]);

  // Load compliance (NOW using CACHE, not requirements/check)
  useEffect(() => {
    if (!vendorId || !activeOrgId) return;

    fetch(`/api/compliance/cache?vendorId=${vendorId}&orgId=${activeOrgId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setCompliance({
            summary: data.summary,
            status: data.status,
            missing: data.missing || [],
            failing: data.failing || [],
            passing: data.passing || [],
            last_checked_at: data.last_checked_at,
          });
        } else {
          setCompliance({ error: data.error });
        }
      })
      .catch((err) => setCompliance({ error: err.message }));
  }, [vendorId, activeOrgId]);

  // Load alerts for this vendor
  useEffect(() => {
    if (!activeOrgId) return;

    fetch(`/api/alerts?orgId=${activeOrgId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error);
        const vendorAlerts = (data.alerts || []).filter(
          (a) => a.vendor_id == vendorId
        );
        setAlerts(vendorAlerts);
        setAiSummary(data.aiSummary?.summaryText || "");
      })
      .catch((err) => {
        console.error("Alert load error:", err);
      });
  }, [vendorId, activeOrgId]);

  // AI fix actions loader
  async function loadFixPlan() {
    if (!vendorId || !activeOrgId) return;
    setFixLoading(true);
    setFixError("");

    try {
      const res = await fetch(
        `/api/vendor/fix-actions?vendorId=${vendorId}&orgId=${activeOrgId}`
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed");

      setFixSteps(data.steps || []);
      setFixVendorEmail(data.vendorEmail || "");
      setFixInternalNotes(data.internalNotes || "");
    } catch (err) {
      console.error("Fix actions error:", err);
      setFixError(err.message || "Failed to load fix actions");
    } finally {
      setFixLoading(false);
    }
  }
  if (!vendorId || loadingRole) {
    return (
      <div style={{ padding: "30px 40px" }}>
        <p>Loading vendor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "30px 40px" }}>
        <h1>Error loading vendor</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div style={{ padding: "30px 40px" }}>
        <h1>Vendor not found</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px 40px" }}>
      {/* HEADER */}
      <h1
        style={{
          fontSize: "32px",
          fontWeight: 700,
          marginBottom: 6,
          color: "#0f172a",
        }}
      >
        {vendor.name || vendor.vendor_name || "Vendor Profile"}
      </h1>

      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
        Full risk profile, policies, compliance status, alerts & AI insights.
      </p>

      {/* AI VENDOR RISK SUMMARY */}
      {aiSummary && (
        <div
          style={{
            marginBottom: 24,
            padding: "20px",
            borderRadius: "12px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 10,
              color: "#0f172a",
            }}
          >
            AI Vendor Risk Summary
          </h2>
          <p style={{ color: "#374151", fontSize: 14, whiteSpace: "pre-line" }}>
            {aiSummary}
          </p>
        </div>
      )}

      {/* COMPLIANCE SUMMARY */}
      <div
        style={{
          marginBottom: 32,
          padding: "20px",
          borderRadius: "12px",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 12,
            color: "#111827",
          }}
        >
          Compliance Summary
        </h2>

        {!compliance ? (
          <p>Checking compliance…</p>
        ) : compliance.error ? (
          <p style={{ color: "red" }}>{compliance.error}</p>
        ) : (
          <>
            <p
              style={{
                fontSize: 14,
                color: "#374151",
                marginBottom: 12,
                fontWeight: 600,
              }}
            >
              {compliance.summary}
            </p>

            {compliance.last_checked_at && (
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Last checked:{" "}
                {new Date(compliance.last_checked_at).toLocaleString()}
              </p>
            )}

            {compliance.missing?.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, marginTop: 14, color: "#b45309" }}>
                  Missing Coverage
                </h3>
                <ul>
                  {compliance.missing.map((m, i) => (
                    <li key={i}>{m.coverage_type}</li>
                  ))}
                </ul>
              </>
            )}

            {compliance.failing?.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, marginTop: 14, color: "#b91c1c" }}>
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
          </>
        )}
      </div>

      {/* AI FIX PANEL */}
      <div
        style={{
          marginBottom: 32,
          padding: "20px",
          borderRadius: "12px",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 4,
                color: "#111827",
              }}
            >
              AI Fix Plan
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "#6b7280",
                margin: 0,
              }}
            >
              Get actionable AI-generated steps, vendor email, and internal notes.
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
              fontSize: 13,
              fontWeight: 600,
              cursor: fixLoading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {fixLoading ? "Thinking…" : "Generate Fix Plan"}
          </button>
        </div>

        {fixError && (
          <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>
            {fixError}
          </p>
        )}

        {fixSteps.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
                color: "#111827",
              }}
            >
              Action Steps
            </h3>
            <ol
              style={{
                paddingLeft: 18,
                fontSize: 13,
                color: "#374151",
              }}
            >
              {fixSteps.map((step, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {fixVendorEmail && (
          <div style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
                color: "#111827",
              }}
            >
              Email to Vendor
            </h3>
            <textarea
              value={fixVendorEmail}
              readOnly
              style={{
                width: "100%",
                minHeight: 120,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 13,
                fontFamily: "system-ui, -apple-system, sans-serif",
                whiteSpace: "pre-wrap",
              }}
            />
          </div>
        )}

        {fixInternalNotes && (
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
                color: "#111827",
              }}
            >
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

        {!fixLoading &&
          !fixError &&
          fixSteps.length === 0 &&
          !fixVendorEmail &&
          !fixInternalNotes && (
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
              No fix plan generated yet. Click{" "}
              <strong>Generate Fix Plan</strong> to get AI recommendations.
            </p>
          )}
      </div>

      {/* VENDOR ALERTS */}
      <div
        style={{
          marginBottom: 32,
          padding: "20px",
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 12,
            color: "#111827",
          }}
        >
          Alerts
        </h2>

        {alerts.length === 0 && <p>No alerts for this vendor.</p>}

        {alerts.map((a, i) => (
          <div
            key={i}
            style={{
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              marginBottom: 10,
              background:
                a.severity === "critical"
                  ? "#fee2e2"
                  : a.severity === "warning"
                  ? "#fef3c7"
                  : "#eef6ff",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>{a.message}</p>
            <p style={{ margin: 0 }}>Coverage: {a.coverage_type || "—"}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#4b5563" }}>
              Severity: {a.severity}
            </p>
          </div>
        ))}
      </div>

      {/* POLICIES */}
      <div
        style={{
          marginBottom: 32,
          padding: "20px",
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 12,
            color: "#111827",
          }}
        >
          Policies
        </h2>

        {policies.length === 0 && <p>No policies found.</p>}

        {policies.map((p) => (
          <div
            key={p.id}
            style={{
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              marginBottom: 10,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>
              {p.coverage_type || "Coverage"}
            </p>
            <p style={{ margin: 0 }}>
              Carrier: {p.carrier || "—"} • Policy #: {p.policy_number}
            </p>
            <p style={{ margin: 0 }}>Exp: {p.expiration_date || "—"}</p>
            <p style={{ margin: 0 }}>
              Limits: {p.limit_each_occurrence || "—"} /{" "}
              {p.limit_aggregate || "—"}
            </p>
            <p style={{ margin: 0 }}>Risk Score: {p.risk_score ?? "—"}</p>
          </div>
        ))}
      </div>

      {/* UPLOAD NEW COI FOR THIS VENDOR */}
      {canManage && (
        <div>
          <a
            href={`/upload-coi?vendor=${vendorId}`}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              background: "#0f172a",
              color: "white",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            + Upload COI for this vendor
          </a>
        </div>
      )}
    </div>
  );
}

/* ===========================
   TABLE + UI HELPERS
   =========================== */

function Th({ children }) {
  return (
    <th
      style={{
        padding: "10px 12px",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#6b7280",
        borderBottom: "1px solid #e5e7eb",
        textAlign: "left",
      }}
    >
      {children}
    </th>
  );
}

const td = {
  padding: "8px 10px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
  color: "#111827",
  fontSize: "13px",
};

function KpiCard({ label, value, color }) {
  return (
    <div
      style={{
        flex: "0 0 auto",
        minWidth: 120,
        padding: "10px 14px",
        borderRadius: 12,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
      }}
    >
      <p
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 20,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </p>
    </div>
  );
}
