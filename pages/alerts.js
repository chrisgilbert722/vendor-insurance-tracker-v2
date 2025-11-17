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

    return { ...base, background: "#dbeafe", color: "#1d4ed8" }; 
  }

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
          return "Prioritize this alert for immediate attention.";
        if (alert.severity === "warning")
          return "Schedule a follow-up to address this issue this week.";
        return "Monitor this item.";
    }
  }

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

  // ⭐ UPDATED FETCH CALL HERE ⭐
  async function openDrawer(vendorId) {
    if (!vendorId) return;
    try {
      const res = await fetch(`/api/vendors/${vendorId}`);
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

  // (the rest of your file stays EXACTLY the same)
