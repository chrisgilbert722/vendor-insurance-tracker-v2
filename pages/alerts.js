// pages/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";
import VendorDrawer from "../components/VendorDrawer";

export default function AlertsPage() {
  const { activeOrgId, loadingOrgs } = useOrg();
  const { isAdmin, isManager, isViewer, loading: loadingRole } = useRole();

  const [alerts, setAlerts] = useState([]);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState({});

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [drawerPolicies, setDrawerPolicies] = useState([]);

  const [collapsed, setCollapsed] = useState({
    critical: false,
    warning: false,
    info: false,
  });

  // Load Alerts
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadAlerts() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/alerts?orgId=${activeOrgId}`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error);
        setAlerts(data.alerts || []);
        setAiSummary(data.aiSummary?.summaryText || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, [activeOrgId]);

  // Severity Badge
  function severityBadgeStyle(sev) {
    const base = {
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: 600,
      display: "inline-block",
    };
    if (sev === "critical") return { ...base, background: "#fee2e2", color: "#b91c1c" };
    if (sev === "warning") return { ...base, background: "#fef3c7", color: "#b45309" };
    return { ...base, background: "#dbeafe", color: "#1d4ed8" };
  }

  // Suggested Action
  function suggestedAction(alert) {
    switch (alert.type) {
      case "missing_coi": return "Request a current COI.";
      case "missing_required_coverage": return "Request missing coverage.";
      case "expired_policy": return "Suspend work until COI is updated.";
      case "expiring_30": return "Send renewal reminder.";
      case "limit_each_occurrence_too_low":
      case "limit_aggregate_too_low": return "Negotiate updated limits.";
      case "missing_additional_insured": return "Request Additional Insured endorsement.";
      case "missing_waiver": return "Request Waiver of Subrogation.";
      case "risk_score_below_min": return "Review vendor risk.";
      case "incomplete_policy_record": return "Request missing policy details.";
      case "missing_expiration": return "Request corrected COI.";
      default: return "Monitor this issue.";
    }
  }

  // Derived Counts
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0 };
    alerts.forEach((a) => {
      if (a.severity && counts[a.severity] !== undefined) {
        counts[a.severity]++;
      }
    });
    return counts;
  }, [alerts]);

  const uniqueVendors = useMemo(() => {
    const map = new Map();
    alerts.forEach((a) => {
      if (a.vendor_id && a.vendor_name) {
        map.set(a.vendor_id, a.vendor_name);
      }
    });
    return Array.from(map.entries());
  }, [alerts]);

  // Filter logic
  const filteredAlerts = alerts.filter((a, idx) => {
    if (acknowledged[idx]) return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (vendorFilter !== "all" && a.vendor_id !== vendorFilter) return false;

    if (!searchText) return true;
    const t = searchText.toLowerCase();
    return (
      (a.vendor_name || "").toLowerCase().includes(t) ||
      (a.coverage_type || "").toLowerCase().includes(t) ||
      (a.message || "").toLowerCase().includes(t) ||
      (a.type || "").toLowerCase().includes(t)
    );
  });

  const groupedAlerts = {
    critical: filteredAlerts.filter((a) => a.severity === "critical"),
    warning: filteredAlerts.filter((a) => a.severity === "warning"),
    info: filteredAlerts.filter((a) => a.severity === "info"),
  };

  const canView = isAdmin || isManager || isViewer;
  const canManage = isAdmin || isManager;

  // Drawer Functions
  async function openDrawer(vendorId) {
    if (!vendorId) return;
    try {
      const res = await fetch(`/api/vendors/${vendorId}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setDrawerVendor(data.vendor);
      setDrawerPolicies(data.policies);
      setDrawerOpen(true);
    } catch (err) {
      console.error(err);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerVendor(null);
    setDrawerPolicies([]);
  }

  function toggleCollapse(sev) {
    setCollapsed((prev) => ({ ...prev, [sev]: !prev[sev] }));
  }

  function markAcknowledged(idx) {
    setAcknowledged((prev) => ({ ...prev, [idx]: true }));
  }

  if (!canView) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Alerts</h1>
        <p>Access denied.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px 40px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Alerts</h1>

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KpiCard label="Critical" value={severityCounts.critical} color="#b91c1c" />
        <KpiCard label="Warning" value={severityCounts.warning} color="#b45309" />
        <KpiCard label="Info" value={severityCounts.info} color="#1d4ed8" />
        <KpiCard label="Total" value={alerts.length} color="#0f172a" />
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div
          style={{
            padding: 20,
            background: "white",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            AI Risk Summary
          </h2>
          <p style={{ whiteSpace: "pre-line" }}>{aiSummary}</p>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {["all", "critical", "warning", "info"].map((sev) => {
          const active = filterSeverity === sev;
          const count = sev === "all" ? alerts.length : severityCounts[sev];
          const label = sev === "all" ? "All" : sev[0].toUpperCase() + sev.slice(1);

          return (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                border: "1px solid #d1d5db",
                background: active ? "#0f172a" : "white",
                color: active ? "white" : "#374151",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {label} ({count})
            </button>
          );
        })}

        <input
          type="text"
          placeholder="Search…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 13,
            minWidth: 200,
          }}
        />

        <select
          value={vendorFilter}
          onChange={(e) =>
            setVendorFilter(e.target.value === "all" ? "all" : e.target.value)
          }
          style={{
            padding: "8px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 13,
          }}
        >
          <option value="all">All vendors</option>
          {uniqueVendors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* ALERT TABLES */}
      <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", background: "white" }}>
        {["critical", "warning", "info"].map((sev) => {
          const list = groupedAlerts[sev];
          const isCollapsed = collapsed[sev];
          const label = sev[0].toUpperCase() + sev.slice(1);

          return (
            <div key={sev}>
              {/* Group Header */}
              <div
                onClick={() => toggleCollapse(sev)}
                style={{
                  padding: "10px 16px",
                  background: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={severityBadgeStyle(sev)}>{label}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {list.length} alert{list.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {isCollapsed ? "Show" : "Hide"}
                </span>
              </div>

              {/* Table Body */}
              {!isCollapsed && list.length > 0 && (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr>
                      <Th>Vendor</Th>
                      <Th>Coverage</Th>
                      <Th>Message</Th>
                      <Th>Suggested Action</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {list.map((a, idx) => {
                      const globalIndex = alerts.indexOf(a);

                      return (
                        <tr key={idx}>
                          <td style={td}>
                            {a.vendor_id ? (
                              <button
                                onClick={() => openDrawer(a.vendor_id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#2563eb",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                }}
                              >
                                {a.vendor_name || "—"}
                              </button>
                            ) : (
                              a.vendor_name || "—"
                            )}
                          </td>

                          <td style={td}>{a.coverage_type || "—"}</td>
                          <td style={td}>{a.message}</td>

                          <td style={td}>
                            <span style={{ fontSize: 12 }}>{suggestedAction(a)}</span>
                          </td>

                          {/* FIX PLAN BUTTON */}
                          <td style={td}>
                            {canManage && (
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() =>
                                    (window.location.href = `/vendor/${a.vendor_id}?fixPlan=1`)
                                  }
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    background: "#0f172a",
                                    color: "white",
                                    fontSize: 11,
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  Fix Plan
                                </button>

                                <button
                                  onClick={() => markAcknowledged(globalIndex)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    background: "#e5e7eb",
                                    color: "#111827",
                                    fontSize: 11,
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  Mark reviewed
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {!isCollapsed && list.length === 0 && (
                <div style={{ padding: 12, fontSize: 13, color: "#9ca3af" }}>
                  No {label.toLowerCase()} alerts.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {drawerOpen && drawerVendor && (
        <VendorDrawer
          vendor={drawerVendor}
          policies={drawerPolicies}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}

/* ----------------- Helpers ----------------- */
function Th({ children }) {
  return (
    <th
      style={{
        padding: "10px 12px",
        fontSize: 11,
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
  fontSize: "13px",
  color: "#111827",
};

function KpiCard({ label, value, color }) {
  return (
    <div
      style={{
        minWidth: 120,
        padding: "10px 14px",
        borderRadius: 12,
        background: "white",
        border: "1px solid #e5e7eb",
      }}
    >
      <p style={{ fontSize: 11, textTransform: "uppercase", color: "#6b7280" }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}
