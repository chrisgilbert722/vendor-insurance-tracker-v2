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
  const [acknowledged, setAcknowledged] = useState({}); // local "resolved" map

  // Vendor drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [drawerPolicies, setDrawerPolicies] = useState([]);

  // Collapsed state per severity block
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

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to load alerts");
        }

        setAlerts(data.alerts || []);
        setAiSummary(data.aiSummary?.summaryText || "");
      } catch (err) {
        console.error("ALERT LOAD ERROR:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, [activeOrgId]);
  // Severity badge styles
  function severityBadgeStyle(sev) {
    const base = {
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: 600,
      display: "inline-block",
    };

    if (sev === "critical")
      return { ...base, background: "#fee2e2", color: "#b91c1c" };

    if (sev === "warning")
      return { ...base, background: "#fef3c7", color: "#b45309" };

    return { ...base, background: "#dbeafe", color: "#1d4ed8" }; // info
  }

  // Suggested action based on type/severity
  function suggestedAction(alert) {
    switch (alert.type) {
      case "missing_coi":
        return "Request a current COI from this vendor and set a reminder if not received.";
      case "missing_required_coverage":
        return "Contact the vendor and request an updated COI that includes the missing coverage.";
      case "expired_policy":
        return "Suspend new work with this vendor until an active COI is provided.";
      case "expiring_30":
        return "Send renewal reminder to vendor and internal stakeholder.";
      case "limit_each_occurrence_too_low":
      case "limit_aggregate_too_low":
        return "Review contract requirements and negotiate updated limits with the vendor or broker.";
      case "missing_additional_insured":
        return "Request endorsement naming your organization as Additional Insured.";
      case "missing_waiver":
        return "Request Waiver of Subrogation endorsement according to your requirements.";
      case "risk_score_below_min":
        return "Review this vendor’s risk profile and consider additional controls or backup vendors.";
      case "incomplete_policy_record":
        return "Have your team or the vendor provide missing policy details.";
      case "missing_expiration":
        return "Request a corrected COI with clear effective and expiration dates.";
      default:
        if (alert.severity === "critical")
          return "Prioritize this alert for immediate attention from compliance/operations.";
        if (alert.severity === "warning")
          return "Schedule a follow-up to address this issue this week.";
        return "Monitor this item and ensure it is addressed in the normal review cycle.";
    }
  }

  // Derived info
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0 };
    alerts.forEach((a) => {
      if (a.severity && counts[a.severity] !== undefined) {
        counts[a.severity] += 1;
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

  // Filter + search + vendor filter + exclude acknowledged
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

  // Group alerts by severity for collapsible sections
  const groupedAlerts = {
    critical: filteredAlerts.filter((a) => a.severity === "critical"),
    warning: filteredAlerts.filter((a) => a.severity === "warning"),
    info: filteredAlerts.filter((a) => a.severity === "info"),
  };

  // Role-gating: viewers can see, admins/managers manage
  const canView = isAdmin || isManager || isViewer;
  const canManage = isAdmin || isManager;

  // Vendor drawer handling
  async function openDrawer(vendorId) {
    if (!vendorId) return;
    try {
      const res = await fetch(`/api/vendor/${vendorId}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);
      setDrawerVendor(data.vendor);
      setDrawerPolicies(data.policies);
      setDrawerOpen(true);
    } catch (err) {
      console.error("Drawer Load Error (Alerts):", err);
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
      <div style={{ padding: "30px 40px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Alerts</h1>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Access denied.</p>
      </div>
    );
  }
  return (
    <div style={{ padding: "30px 40px" }}>
      <h1
        style={{
          fontSize: "32px",
          fontWeight: 700,
          marginBottom: 6,
          color: "#0f172a",
        }}
      >
        Alerts
      </h1>

      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
        All vendor, policy, and requirement alerts for this organization.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {(loading || loadingOrgs || loadingRole) && (
        <p style={{ marginBottom: 20, color: "#6b7280", fontSize: 14 }}>
          Loading alerts…
        </p>
      )}

      {/* KPIs */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <KpiCard
          label="Critical"
          value={severityCounts.critical}
          color="#b91c1c"
        />
        <KpiCard
          label="Warning"
          value={severityCounts.warning}
          color="#b45309"
        />
        <KpiCard label="Info" value={severityCounts.info} color="#1d4ed8" />
        <KpiCard
          label="Total"
          value={alerts.length}
          color="#0f172a"
        />
      </div>

      {/* AI SUMMARY */}
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
            AI Risk Summary
          </h2>
          <p style={{ color: "#374151", fontSize: 14, whiteSpace: "pre-line" }}>
            {aiSummary}
          </p>
        </div>
      )}

      {/* FILTERS BAR */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Severity chips */}
        {["all", "critical", "warning", "info"].map((sev) => {
          const label =
            sev === "all"
              ? "All"
              : sev.charAt(0).toUpperCase() + sev.slice(1);
          const count =
            sev === "all"
              ? alerts.length
              : severityCounts[sev] ?? 0;
          const active = filterSeverity === sev;

          return (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                border: "1px solid #d1d5db",
                background: active ? "#0f172a" : "#ffffff",
                color: active ? "#ffffff" : "#374151",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: active ? "#111827" : "#f3f4f6",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Search */}
        <input
          type="text"
          placeholder="Search vendor, coverage, message…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 13,
            minWidth: "220px",
          }}
        />

        {/* Vendor filter */}
        <select
          value={vendorFilter}
          onChange={(e) =>
            setVendorFilter(
              e.target.value === "all" ? "all" : e.target.value
            )
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

      {/* GROUPED ALERTS BY SEVERITY */}
      <div
        style={{
          marginTop: 10,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
        }}
      >
        {["critical", "warning", "info"].map((sev) => {
          const list = groupedAlerts[sev];
          const label =
            sev.charAt(0).toUpperCase() + sev.slice(1).toLowerCase();
          const isCollapsed = collapsed[sev];

          return (
            <div key={sev}>
              {/* Section header */}
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
                onClick={() => toggleCollapse(sev)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={severityBadgeStyle(sev)}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    {list.length} alert{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  {isCollapsed ? "Show" : "Hide"}
                </span>
              </div>

              {/* Rows */}
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
                      const globalIndex = alerts.indexOf(a); // for ack map
                      return (
                        <tr key={idx}>
                          <td style={td}>
                            {a.vendor_id ? (
                              <button
                                onClick={() => openDrawer(a.vendor_id)}
                                style={{
                                  border: "none",
                                  background: "none",
                                  padding: 0,
                                  margin: 0,
                                  cursor: "pointer",
                                  color: "#2563eb",
                                  textDecoration: "underline",
                                  fontSize: 13,
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
                            <span style={{ fontSize: 12, color: "#4b5563" }}>
                              {suggestedAction(a)}
                            </span>
                          </td>
                          <td style={td}>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              {canManage && (
                                <button
                                  onClick={() => markAcknowledged(globalIndex)}
                                  style={{
                                    fontSize: 11,
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    border: "none",
                                    cursor: "pointer",
                                    background: "#e5e7eb",
                                    color: "#111827",
                                  }}
                                >
                                  Mark reviewed
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {!isCollapsed && list.length === 0 && (
                <div
                  style={{
                    padding: 12,
                    fontSize: 13,
                    color: "#9ca3af",
                  }}
                >
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
