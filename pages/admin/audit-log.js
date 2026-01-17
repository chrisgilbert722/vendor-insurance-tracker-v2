// pages/admin/audit-log.js
// ============================================================
// Admin — Audit Log (Org-wide default + optional vendor filter)
// Clean, UUID-safe, aligned with resolveOrg()
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../context/OrgContext";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  soft: "#9ca3af",
  sky: "#38bdf8",
  green: "#22c55e",
  amber: "#fbbf24",
  rose: "#fb7185",
};

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts || "");
  }
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function AuditLogPage() {
  const { activeOrgExternalId } = useOrg();

  const [vendors, setVendors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [vendorId, setVendorId] = useState("");
  const [source, setSource] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // Paging
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;

  // Listen for visibility changes and custom events to trigger refetch
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setRefreshKey((k) => k + 1);
      }
    };

    const handleDataChanged = () => {
      setRefreshKey((k) => k + 1);
    };

    const handleStorage = (e) => {
      if (e?.key === "policies:changed" || e?.key === "vendors:changed" || e?.key === "alerts:changed") {
        handleDataChanged();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("policies:changed", handleDataChanged);
    window.addEventListener("vendors:changed", handleDataChanged);
    window.addEventListener("alerts:changed", handleDataChanged);
    window.addEventListener("onboarding:complete", handleDataChanged);
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("policies:changed", handleDataChanged);
      window.removeEventListener("vendors:changed", handleDataChanged);
      window.removeEventListener("alerts:changed", handleDataChanged);
      window.removeEventListener("onboarding:complete", handleDataChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // ---------------------------------------
  // Load vendors (no org param needed)
  // ---------------------------------------
  useEffect(() => {
    if (!activeOrgExternalId) return;

    fetch("/api/admin/vendors-lite")
      .then((r) => r.json())
      .then((j) => setVendors(j.vendors || []))
      .catch(() => {});
  }, [activeOrgExternalId, refreshKey]);

  // ---------------------------------------
  // Load audit events
  // ---------------------------------------
  async function load() {
    if (!activeOrgExternalId) return;
    setLoading(true);
    setErr("");

    try {
      const qs = new URLSearchParams();
      qs.set("orgExternalId", activeOrgExternalId);
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      if (vendorId) qs.set("vendorId", vendorId);
      if (source !== "all") qs.set("source", source);
      if (severity !== "all") qs.set("severity", severity);

      if (start) qs.set("start", new Date(`${start}T00:00:00`).toISOString());
      if (end) qs.set("end", new Date(`${end}T23:59:59`).toISOString());

      const res = await fetch(`/api/admin/audit-log?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load audit log");

      setEvents(json.results || []);
      setHasMore((json.results || []).length === pageSize);
    } catch (e) {
      setErr(e.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [activeOrgExternalId, vendorId, source, severity, start, end]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgExternalId, vendorId, source, severity, start, end, page, refreshKey]);

  const header = useMemo(
    () => ["timestamp", "source", "severity", "vendorId", "vendorName", "action", "message"],
    []
  );

  function exportCsv() {
    const lines = [];
    lines.push(header.join(","));
    for (const ev of events) {
      lines.push(
        [
          csvEscape(ev.created_at),
          csvEscape(ev.source),
          csvEscape(ev.severity),
          csvEscape(ev.vendor_id),
          csvEscape(ev.vendor_name),
          csvEscape(ev.action),
          csvEscape(ev.message),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_org_${activeOrgExternalId}_page_${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sevColor(sev) {
    const s = String(sev || "").toLowerCase();
    if (s === "critical") return GP.rose;
    if (s === "high" || s === "warning") return GP.amber;
    if (s === "medium") return GP.sky;
    return GP.soft;
  }

  return (
    <div style={{ minHeight: "100vh", background: GP.bg, color: GP.text, padding: 28 }}>
      <div
        style={{
          borderRadius: 22,
          background: GP.panel,
          border: `1px solid ${GP.border}`,
          padding: 18,
          boxShadow: "0 0 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: GP.soft }}>
              Enterprise Audit Trail
            </div>
            <h1 style={{ margin: "6px 0 0", fontSize: 26 }}>Audit Log</h1>
          </div>

          <button
            onClick={exportCsv}
            disabled={loading || events.length === 0}
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 999,
              border: `1px solid rgba(56,189,248,0.7)`,
              background: `linear-gradient(90deg, rgba(56,189,248,0.9), rgba(14,165,233,0.9))`,
              color: "#07121f",
              fontWeight: 700,
              cursor: loading || events.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Export CSV (page)
          </button>
        </div>

        {/* Table */}
        <div style={{ marginTop: 16 }}>
          {err && <div style={{ color: GP.rose, fontSize: 13 }}>{err}</div>}
          {loading ? (
            <div style={{ color: GP.soft, fontSize: 13 }}>Loading…</div>
          ) : events.length === 0 ? (
            <div style={{ color: GP.soft, fontSize: 13 }}>No events found.</div>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${GP.border}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "rgba(2,6,23,0.7)" }}>
                    <th style={th}>Time</th>
                    <th style={th}>Source</th>
                    <th style={th}>Severity</th>
                    <th style={th}>Vendor</th>
                    <th style={th}>Action</th>
                    <th style={th}>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, idx) => (
                    <tr key={idx} style={{ borderTop: `1px solid rgba(51,65,85,0.55)` }}>
                      <td style={td}>{fmt(e.created_at)}</td>
                      <td style={td}>{e.source}</td>
                      <td style={{ ...td, color: sevColor(e.severity), fontWeight: 700 }}>
                        {String(e.severity || "info")}
                      </td>
                      <td style={td}>
                        {e.vendor_name ? (
                          <>
                            <div style={{ fontWeight: 700 }}>{e.vendor_name}</div>
                            <div style={{ color: GP.soft, fontSize: 11 }}>#{e.vendor_id}</div>
                          </>
                        ) : (
                          <span style={{ color: GP.soft }}>—</span>
                        )}
                      </td>
                      <td style={td}>{e.action}</td>
                      <td style={{ ...td, whiteSpace: "pre-wrap" }}>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px 10px",
  fontSize: 11,
  color: "#9ca3af",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};
const td = { padding: "10px 10px", verticalAlign: "top" };
