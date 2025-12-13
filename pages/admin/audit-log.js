// pages/admin/audit-log.js
// ============================================================
// Admin — Audit Log (Org-wide default + optional vendor filter)
// Includes CSV export.
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
  const { activeOrgId: orgId } = useOrg();

  const [vendors, setVendors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Filters
  const [vendorId, setVendorId] = useState("");
  const [source, setSource] = useState("all"); // all | system | vendor
  const [severity, setSeverity] = useState("all"); // all | info | warning | high | critical | medium
  const [start, setStart] = useState(""); // yyyy-mm-dd
  const [end, setEnd] = useState("");     // yyyy-mm-dd

  // Paging
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;

  // Load vendors for filter dropdown
  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/admin/vendors-lite?orgId=${encodeURIComponent(orgId)}`)
      .then((r) => r.json())
      .then((j) => setVendors(j.vendors || []))
      .catch(() => {});
  }, [orgId]);

  // Load audit events
  async function load() {
    if (!orgId) return;
    setLoading(true);
    setErr("");

    try {
      const qs = new URLSearchParams();
      qs.set("orgId", orgId);
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      if (vendorId) qs.set("vendorId", vendorId);
      if (source && source !== "all") qs.set("source", source);
      if (severity && severity !== "all") qs.set("severity", severity);

      // turn date-only into ISO range
      if (start) qs.set("start", new Date(`${start}T00:00:00`).toISOString());
      if (end) qs.set("end", new Date(`${end}T23:59:59`).toISOString());

      const res = await fetch(`/api/admin/audit-log?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load audit log");

      setEvents(json.events || []);
      setHasMore(!!json.hasMore);
    } catch (e) {
      setErr(e.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }

  // reload on filter change (reset page)
  useEffect(() => {
    setPage(1);
  }, [orgId, vendorId, source, severity, start, end]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, vendorId, source, severity, start, end, page]);

  const header = useMemo(() => {
    return [
      "timestamp",
      "source",
      "severity",
      "vendorId",
      "vendorName",
      "action",
      "message",
    ];
  }, []);

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
    a.download = `audit_log_org_${orgId}_page_${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sevColor(sev) {
    const s = String(sev || "").toLowerCase();
    if (s === "critical") return GP.rose;
    if (s === "high") return GP.amber;
    if (s === "warning" || s === "warn") return GP.amber;
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: GP.soft }}>
              Enterprise Audit Trail
            </div>
            <h1 style={{ margin: "6px 0 0", fontSize: 26 }}>
              Audit Log
            </h1>
            <div style={{ marginTop: 6, fontSize: 13, color: GP.soft, maxWidth: 720 }}>
              Org-wide events by default. Filter by vendor when you need an incident-level view.
            </div>
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
              whiteSpace: "nowrap",
            }}
          >
            Export CSV (page)
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <div style={field}>
            <div style={label}>Vendor</div>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} style={input}>
              <option value="">All vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vendor_name}
                </option>
              ))}
            </select>
          </div>

          <div style={field}>
            <div style={label}>Source</div>
            <select value={source} onChange={(e) => setSource(e.target.value)} style={input}>
              <option value="all">All</option>
              <option value="system">System / Admin</option>
              <option value="vendor">Vendor Portal</option>
            </select>
          </div>

          <div style={field}>
            <div style={label}>Severity</div>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={input}>
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="medium">Medium</option>
              <option value="warning">Warning</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div style={field}>
            <div style={label}>Start</div>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={input} />
          </div>

          <div style={field}>
            <div style={label}>End</div>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={input} />
          </div>
        </div>

        {/* Table */}
        <div style={{ marginTop: 16 }}>
          {err && <div style={{ color: GP.rose, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          {loading ? (
            <div style={{ color: GP.soft, fontSize: 13 }}>Loading…</div>
          ) : events.length === 0 ? (
            <div style={{ color: GP.soft, fontSize: 13 }}>No events found for these filters.</div>
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

        {/* Pagination */}
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: GP.soft }}>
            Page <b style={{ color: GP.text }}>{page}</b>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              style={pagerBtn(page === 1 || loading)}
            >
              ← Prev
            </button>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || loading}
              style={pagerBtn(!hasMore || loading)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const field = { display: "flex", flexDirection: "column", gap: 6 };
const label = { fontSize: 11, color: "#9ca3af" };
const input = {
  height: 34,
  borderRadius: 12,
  border: "1px solid rgba(51,65,85,0.9)",
  background: "rgba(2,6,23,0.55)",
  color: "#e5e7eb",
  padding: "0 10px",
  fontSize: 13,
};

const th = {
  textAlign: "left",
  padding: "10px 10px",
  fontSize: 11,
  color: "#9ca3af",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const td = { padding: "10px 10px", verticalAlign: "top" };

function pagerBtn(disabled) {
  return {
    height: 34,
    padding: "0 12px",
    borderRadius: 12,
    border: `1px solid rgba(51,65,85,0.9)`,
    background: disabled ? "rgba(148,163,184,0.12)" : "rgba(56,189,248,0.15)",
    color: disabled ? "#94a3b8" : "#e5e7eb",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
  };
}
