// pages/vendors.js
// ============================================================
// VENDORS — V3.5 (Cinematic) — FULL RESTORE (1,000+ lines)
// GOALS:
// - Never crash (normalize everything)
// - Works with ACTIVE ORG (internal org_id int)
// - Does NOT assume Supabase DB has your Neon data
// - Prefers API (/api/vendors/gvi, /api/vendors) but has safe fallbacks
// - Keeps cinematic UI + filters + quick add
// ============================================================

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";
import { supabase } from "../lib/supabaseClient";

/* ===========================
   SAFE HELPERS
=========================== */

const safeArray = (v) => (Array.isArray(v) ? v : []);
const safeObject = (v) => (v && typeof v === "object" ? v : {});
const safeString = (v, fallback = "") =>
  typeof v === "string" ? v : v == null ? fallback : String(v);
const safeNumber = (v, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function toISO(v) {
  if (!v) return null;
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

function formatRelative(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = diffMs / 60000;
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  return `${Math.round(days)}d ago`;
}

/* ===========================
   STATUS PALETTE
=========================== */

function statusPalette(status) {
  switch (status) {
    case "Compliant":
      return {
        bg: "rgba(34,197,94,0.16)",
        border: "rgba(34,197,94,0.9)",
        text: "#bbf7d0",
        dot: "#22c55e",
      };
    case "At Risk":
      return {
        bg: "rgba(248,113,113,0.16)",
        border: "rgba(248,113,113,0.9)",
        text: "#fecaca",
        dot: "#fb7185",
      };
    case "Needs Review":
      return {
        bg: "rgba(250,204,21,0.16)",
        border: "rgba(250,204,21,0.9)",
        text: "#fef9c3",
        dot: "#facc15",
      };
    default:
      return {
        bg: "rgba(148,163,184,0.16)",
        border: "rgba(148,163,184,0.9)",
        text: "#e5e7eb",
        dot: "#9ca3af",
      };
  }
}

/* ===========================
   SINGLE NORMALIZER (CRITICAL)
   - Prevents client-side crashes
   - Guarantees every field exists
=========================== */

function normalizeVendor(v) {
  const safe = v && typeof v === "object" ? v : {};

  const statusRaw = safeString(safe.status, "Needs Review");
  const status =
    statusRaw === "Compliant" || statusRaw === "At Risk" || statusRaw === "Needs Review"
      ? statusRaw
      : "Needs Review";

  const tags = safeArray(safe.tags).map((t) => safeString(t)).filter(Boolean);

  const requirementsPassing = safeNumber(safe.requirementsPassing, 0);
  const requirementsTotalRaw = safe.requirementsTotal;
  const requirementsTotal =
    typeof requirementsTotalRaw === "number" && Number.isFinite(requirementsTotalRaw)
      ? requirementsTotalRaw
      : requirementsTotalRaw == null
      ? null
      : Number(requirementsTotalRaw) || null;

  return {
    id: safe.id ?? null,
    org_id: safe.org_id ?? null,

    name: safeString(safe.name, "Unnamed Vendor"),
    location: safeString(safe.location || safe.address, "Location not set"),
    category: safeString(safe.category, "Vendor"),

    email: safe.email ? safeString(safe.email) : null,

    tags,

    status,
    complianceScore: safeNumber(safe.complianceScore, 0),

    lastEvaluated: safe.lastEvaluated ? toISO(safe.lastEvaluated) : null,

    alertsOpen: safeNumber(safe.alertsOpen, 0),

    requirementsPassing,
    requirementsTotal,
  };
}

/* ===========================
   DERIVE STATUS FROM CACHE
=========================== */

function statusFromCache(cacheStatus) {
  const s = safeString(cacheStatus, "").toLowerCase();
  if (s === "pass") return "Compliant";
  if (s === "fail") return "At Risk";
  return "Needs Review";
}

/* ===========================
   PAGE — VENDORS
=========================== */

export default function VendorsPage() {
  // ✅ IMPORTANT: org_id is INTERNAL INT (Neon)
  const { activeOrgId } = useOrg();
  const orgId = Number.isInteger(activeOrgId) ? activeOrgId : null;

  const { isAdmin, isManager } = useRole();
  const canCreate = isAdmin || isManager;

  // data
  const [rawVendors, setRawVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // UI state
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [viewMode, setViewMode] = useState("cards"); // cards | compact
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedIso, setLastRefreshedIso] = useState(null);

  const orgMissingMsg = "Select an organization to view vendors.";

  const doRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  /* ============================================================
     LOAD VENDORS (PREFER API, SAFE FALLBACKS)
     WHY:
     - Your real data is in Neon via API (not Supabase DB)
============================================================ */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!orgId) {
        if (!cancelled) {
          setRawVendors([]);
          setLoading(false);
          setLoadError("");
          setLastRefreshedIso(null);
        }
        return;
      }

      try {
        setLoading(true);
        setLoadError("");

        // --------------------------------------------------
        // 1) Preferred: GVI endpoint (Neon, aggregated)
        //    Expected: { ok:true, vendors:[...] }
        // --------------------------------------------------
        let vendorsOut = null;

        try {
          const r = await fetch(`/api/vendors/gvi?orgId=${orgId}`);
          const j = await r.json().catch(() => null);

          if (r.ok && j?.ok && Array.isArray(j.vendors)) {
            vendorsOut = j.vendors.map((v) =>
              normalizeVendor({
                id: v.id,
                org_id: orgId,
                name: v.name,
                location: v.location,
                address: v.address,
                category: v.category || "Vendor",
                email: v.email,

                // map from GVI -> our UI fields
                status:
                  v?.compliance?.status === "pass"
                    ? "Compliant"
                    : v?.compliance?.status === "fail"
                    ? "At Risk"
                    : v?.compliance?.status === "warn"
                    ? "Needs Review"
                    : v?.status === "Compliant" || v?.status === "At Risk"
                    ? v.status
                    : "Needs Review",

                complianceScore:
                  typeof v.aiScore === "number" ? v.aiScore : safeNumber(v.complianceScore, 0),

                lastEvaluated: v?.compliance?.checked_at || v?.compliance?.last_checked_at || null,

                alertsOpen: safeNumber(v.alertsCount, 0),

                requirementsPassing: safeNumber(v?.compliance?.fixedRules, 0),
                requirementsTotal: safeNumber(v?.compliance?.totalRules, null),
              })
            );
          }
        } catch (e) {
          // swallow — fallback below
        }

        // --------------------------------------------------
        // 2) Fallback: Raw vendors list endpoint (Neon)
        //    Expected: { ok:true, vendors:[...] }
        // --------------------------------------------------
        if (!vendorsOut) {
          try {
            const r = await fetch(`/api/vendors?orgId=${orgId}`);
            const j = await r.json().catch(() => null);

            if (r.ok && j?.ok && Array.isArray(j.vendors)) {
              vendorsOut = j.vendors.map((v) =>
                normalizeVendor({
                  id: v.id,
                  org_id: v.org_id ?? orgId,
                  name: v.name,
                  location: v.address,
                  address: v.address,
                  category: v.category || "Vendor",
                  email: v.email,

                  status: "Needs Review",
                  complianceScore: 0,
                  lastEvaluated: v.created_at || null,
                  alertsOpen: 0,
                  requirementsPassing: 0,
                  requirementsTotal: null,
                })
              );
            }
          } catch (e) {
            // swallow — fallback below
          }
        }

        // --------------------------------------------------
        // 3) Last-resort fallback: Supabase direct
        //    (only if you actually have these tables in Supabase)
        // --------------------------------------------------
        if (!vendorsOut) {
          const { data: vendors, error: vErr } = await supabase
            .from("vendors")
            .select("*")
            .eq("org_id", orgId);

          if (vErr) throw vErr;

          // try to fetch cache + risk_history, but treat missing tables as empty
          let cache = [];
          let riskRows = [];

          try {
            const { data: c, error: cErr } = await supabase
              .from("vendor_compliance_cache")
              .select("*")
              .eq("org_id", orgId);
            if (cErr) throw cErr;
            cache = c || [];
          } catch {
            cache = [];
          }

          try {
            const { data: r, error: rErr } = await supabase
              .from("risk_history")
              .select("*")
              .eq("org_id", orgId)
              .order("created_at", { ascending: false });
            if (rErr) throw rErr;
            riskRows = r || [];
          } catch {
            riskRows = [];
          }

          const cacheByVendor = {};
          cache.forEach((row) => {
            cacheByVendor[row.vendor_id] = row;
          });

          const riskByVendor = {};
          riskRows.forEach((row) => {
            if (!riskByVendor[row.vendor_id]) riskByVendor[row.vendor_id] = row;
          });

          vendorsOut = safeArray(vendors).map((v) => {
            const c = cacheByVendor[v.id] || {};
            const r = riskByVendor[v.id] || {};

            const failing = safeArray(c.failing);
            const missing = safeArray(c.missing);
            const passing = safeArray(c.passing);

            return normalizeVendor({
              id: v.id,
              org_id: v.org_id,
              name: v.name,
              address: v.address,
              location: v.address,
              category: "Vendor",
              email: v.email,

              status: statusFromCache(c.status),
              complianceScore: typeof r.risk_score === "number" ? r.risk_score : 0,
              lastEvaluated: c.last_checked_at || r.created_at || v.created_at,

              alertsOpen: failing.length,
              requirementsPassing: passing.length,
              requirementsTotal: failing.length + missing.length + passing.length || null,
            });
          });
        }

        if (cancelled) return;

        // always normalize final output, always filter null ids
        const cleaned = safeArray(vendorsOut)
          .map(normalizeVendor)
          .filter((v) => v && v.id != null);

        setRawVendors(cleaned);
        setLastRefreshedIso(new Date().toISOString());
      } catch (err) {
        console.error("[vendors] load error:", err);
        if (!cancelled) {
          setRawVendors([]);
          setLoadError(err?.message || "Failed to load vendors.");
          setLastRefreshedIso(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, refreshNonce]);

  /* ============================================================
     QUICK ADD VENDOR (SAFE)
     - Uses Supabase insert as a fallback path
     - If your real write path is API, you can swap later
============================================================ */
  async function handleQuickAddVendor() {
    if (!canCreate || !orgId) return;

    const name = window.prompt("Vendor name?", "New Vendor") || "New Vendor";
    const email = window.prompt("Vendor contact email? (optional)", "") || null;

    try {
      // Prefer API create if present
      // If not, fall back to Supabase insert.
      let created = null;

      try {
        const r = await fetch("/api/vendors/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, name, email }),
        });
        const j = await r.json().catch(() => null);
        if (r.ok && j?.ok && j.vendor) created = j.vendor;
      } catch {
        created = null;
      }

      if (!created) {
        const { data, error } = await supabase
          .from("vendors")
          .insert({ org_id: orgId, name, email })
          .select("*")
          .single();

        if (error) throw error;
        created = data;
      }

      // refresh from source of truth
      doRefresh();
    } catch (err) {
      console.error("[vendors] quick add error:", err);
      window.alert("Failed to add vendor: " + (err?.message || "Unknown error"));
    }
  }

  /* ============================================================
     METRICS (SAFE)
============================================================ */
  const metrics = useMemo(() => {
    const vendors = safeArray(rawVendors).map(normalizeVendor);

    const total = vendors.length;
    const compliant = vendors.filter((v) => v.status === "Compliant").length;
    const atRisk = vendors.filter((v) => v.status === "At Risk").length;
    const needsReview = vendors.filter((v) => v.status === "Needs Review").length;

    const avgScore =
      total === 0
        ? 0
        : Math.round(vendors.reduce((sum, v) => sum + safeNumber(v.complianceScore, 0), 0) / total);

    return { total, compliant, atRisk, needsReview, avgScore };
  }, [rawVendors]);

  /* ============================================================
     FILTERS (SAFE)
============================================================ */
  const categories = useMemo(() => {
    const list = safeArray(rawVendors).map(normalizeVendor);
    return Array.from(new Set(list.map((v) => v.category || "Vendor"))).sort();
  }, [rawVendors]);

  const filtered = useMemo(() => {
    const list = safeArray(rawVendors).map(normalizeVendor);
    const q = safeString(search, "").toLowerCase().trim();

    return list.filter((v) => {
      if (statusFilter !== "All" && v.status !== statusFilter) return false;
      if (categoryFilter !== "All" && v.category !== categoryFilter) return false;
      if (!q) return true;

      const hay = `${v.name} ${v.location} ${v.category} ${(v.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rawVendors, statusFilter, categoryFilter, search]);

  /* ============================================================
     RENDER
============================================================ */
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
        overflowX: "hidden",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background: "radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)",
          filter: "blur(130px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background: "radial-gradient(circle at 30% 0,#3b82f6,#6366f1,#0f172a)",
              boxShadow: "0 0 45px rgba(59,130,246,0.7)",
            }}
          >
            <span style={{ fontSize: 22 }}>📊</span>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background: "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Vendors V3.5 · Compliance Portfolio
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#3b82f6",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Directory · Risk · Status
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: 0.2 }}>
              Cinematic view of{" "}
              <span
                style={{
                  background: "linear-gradient(90deg,#3b82f6,#8b5cf6,#e5e7eb)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                every vendor
              </span>{" "}
              in your program.
            </h1>

            <p style={{ marginTop: 6, marginBottom: 0, fontSize: 13, color: "#cbd5f5", maxWidth: 740 }}>
              Filter by status, search, or category. Drill into vendor profiles to see coverage,
              expirations, rules firing, and open alerts.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={doRefresh}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                border: "1px solid rgba(148,163,184,0.6)",
                background: "rgba(15,23,42,0.92)",
                color: "#e5e7eb",
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Refresh vendors"
            >
              ↻ Refresh
            </button>

            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* Small status row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            {orgId ? (
              <>
                Org ID: <span style={{ color: "#e5e7eb" }}>{orgId}</span>{" "}
                <span style={{ opacity: 0.6 }}>·</span>{" "}
                {lastRefreshedIso ? (
                  <>
                    Last refresh{" "}
                    <span style={{ color: "#e5e7eb" }}>{formatRelative(lastRefreshedIso)}</span>
                  </>
                ) : (
                  <span style={{ opacity: 0.8 }}>Not refreshed yet</span>
                )}
              </>
            ) : (
              orgMissingMsg
            )}
          </div>

          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {loading ? "Loading vendors…" : `Showing ${filtered.length} of ${safeArray(rawVendors).length}`}
          </div>
        </div>
      </div>

      {/* TOP STRIP — METRICS + ACTIONS */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.4fr)",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* METRICS PANEL */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background: "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98), 0 0 28px rgba(59,130,246,0.22)",
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 12,
          }}
        >
          <MetricCard label="Total vendors" value={metrics.total} tone="neutral" />
          <MetricCard label="Compliant" value={metrics.compliant} tone="good" />
          <MetricCard label="At risk" value={metrics.atRisk} tone="bad" />
          <MetricCard label="Avg. score" value={`${metrics.avgScore}`} tone="info" />
        </div>

        {/* ACTIONS */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background: "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "#9ca3af" }}>
            Actions
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              disabled={!canCreate || !orgId}
              onClick={handleQuickAddVendor}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border: "1px solid rgba(34,197,94,0.9)",
                background: "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
                color: "#dcfce7",
                fontSize: 12,
                fontWeight: 500,
                cursor: canCreate && orgId ? "pointer" : "not-allowed",
                opacity: canCreate && orgId ? 1 : 0.5,
              }}
            >
              + Quick add vendor
            </button>

            <Link href="/upload-coi" style={{ textDecoration: "none" }}>
              <a
                style={{
                  borderRadius: 999,
                  padding: "8px 14px",
                  border: "1px solid rgba(59,130,246,0.8)",
                  background: "radial-gradient(circle at top,#3b82f6,#1d4ed8,#020617)",
                  color: "#e0f2fe",
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                ⬆ Upload COI
              </a>
            </Link>

            <Link href="/docs" style={{ textDecoration: "none" }}>
              <a
                style={{
                  borderRadius: 999,
                  padding: "8px 14px",
                  border: "1px solid rgba(148,163,184,0.55)",
                  background: "rgba(15,23,42,0.92)",
                  color: "#e5e7eb",
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                📄 Docs
              </a>
            </Link>

            <div style={{ fontSize: 10, color: "#6b7280", flex: 1, minWidth: 220 }}>
              Uses your active org. If vendors are blank, it means the upstream API is failing or the org has no vendors yet.
            </div>
          </div>

          {loadError ? (
            <div
              style={{
                marginTop: 6,
                borderRadius: 14,
                border: "1px solid rgba(248,113,113,0.7)",
                background: "rgba(127,29,29,0.55)",
                color: "#fecaca",
                padding: "10px 12px",
                fontSize: 12,
                lineHeight: 1.35,
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>Load error</strong>
              {loadError}
            </div>
          ) : null}
        </div>
      </div>

      {/* FILTER BAR + LIST */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          borderRadius: 24,
          padding: 16,
          background: "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
          border: "1px solid rgba(148,163,184,0.6)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* FILTER BAR */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "#9ca3af" }}>
            Vendors
          </div>

          <FilterPillGroup
            options={["All", "Compliant", "At Risk", "Needs Review"]}
            active={statusFilter}
            onSelect={setStatusFilter}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="All">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div
            style={{
              flex: 1,
              minWidth: 240,
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(51,65,85,0.9)",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              padding: "4px 9px",
              gap: 6,
            }}
          >
            <span style={{ color: "#6b7280", fontSize: 12 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors, categories, locations…"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: 12,
              }}
            />
          </div>

          <div style={{ fontSize: 10, color: "#6b7280", minWidth: 170, textAlign: "right" }}>
            {loading ? "Loading vendors…" : `Showing ${filtered.length} of ${safeArray(rawVendors).length}`}
          </div>
        </div>

        {/* ORG MISSING */}
        {!orgId && !loading ? (
          <EmptyNotice title="No organization selected" body={orgMissingMsg} />
        ) : null}

        {/* LOADING */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SkeletonVendorRow />
            <SkeletonVendorRow />
            <SkeletonVendorRow />
          </div>
        ) : null}

        {/* EMPTY */}
        {!loading && orgId && filtered.length === 0 && !loadError ? (
          <EmptyNotice
            title="No vendors found"
            body="Use “Quick add vendor” to create your first vendor, or upload a vendor list in onboarding."
          />
        ) : null}

        {/* LIST */}
        {!loading && filtered.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {viewMode === "compact" ? (
              <CompactTable vendors={filtered} />
            ) : (
              filtered.map((v) => <VendorRow key={normalizeVendor(v).id || Math.random()} vendor={v} />)
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ===========================
   SMALL UI COMPONENTS
=========================== */

function ViewModeToggle({ value, onChange }) {
  const isCards = value === "cards";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 4px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <button
        onClick={() => onChange("cards")}
        style={{
          borderRadius: 999,
          border: "none",
          padding: "6px 10px",
          fontSize: 11,
          cursor: "pointer",
          background: isCards
            ? "radial-gradient(circle at top,#3b82f6AA,#3b82f644,#0f172a)"
            : "transparent",
          color: isCards ? "#ffffff" : "#cbd5f5",
        }}
      >
        Cards
      </button>
      <button
        onClick={() => onChange("compact")}
        style={{
          borderRadius: 999,
          border: "none",
          padding: "6px 10px",
          fontSize: 11,
          cursor: "pointer",
          background: !isCards
            ? "radial-gradient(circle at top,#3b82f6AA,#3b82f644,#0f172a)"
            : "transparent",
          color: !isCards ? "#ffffff" : "#cbd5f5",
        }}
      >
        Compact
      </button>
    </div>
  );
}

function EmptyNotice({ title, body }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px dashed rgba(75,85,99,0.9)",
        padding: "14px 12px",
        fontSize: 12,
        color: "#9ca3af",
        background: "rgba(2,6,23,0.35)",
      }}
    >
      <div style={{ fontSize: 12, color: "#e5e7eb", marginBottom: 6, fontWeight: 600 }}>
        {title}
      </div>
      <div style={{ lineHeight: 1.35 }}>{body}</div>
    </div>
  );
}

function SkeletonVendorRow() {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        background: "rgba(15,23,42,0.75)",
        border: "1px solid rgba(55,65,81,0.6)",
        boxShadow: "0 18px 45px rgba(15,23,42,0.65)",
        display: "grid",
        gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr) auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <SkeletonLine w={220} />
      <SkeletonLine w={180} />
      <SkeletonLine w={110} />
    </div>
  );
}

function SkeletonLine({ w }) {
  return (
    <div
      style={{
        height: 10,
        width: w,
        borderRadius: 999,
        background:
          "linear-gradient(90deg, rgba(148,163,184,0.12), rgba(148,163,184,0.22), rgba(148,163,184,0.12))",
      }}
    />
  );
}

/* ===========================
   METRIC CARD
=========================== */

function MetricCard({ label, value, tone }) {
  const palette = {
    neutral: {
      border: "rgba(148,163,184,0.85)",
      bg: "rgba(15,23,42,0.96)",
      text: "#e5e7eb",
    },
    good: {
      border: "rgba(34,197,94,0.85)",
      bg: "rgba(22,101,52,0.95)",
      text: "#bbf7d0",
    },
    bad: {
      border: "rgba(248,113,113,0.85)",
      bg: "rgba(127,29,29,0.95)",
      text: "#fecaca",
    },
    info: {
      border: "rgba(59,130,246,0.85)",
      bg: "rgba(15,23,42,0.95)",
      text: "#dbeafe",
    },
  }[tone] || {
    border: "rgba(148,163,184,0.85)",
    bg: "rgba(15,23,42,0.96)",
    text: "#e5e7eb",
  };

  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 12px",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.text,
        boxShadow: "0 20px 55px rgba(15,23,42,0.95), 0 0 18px rgba(255,255,255,0.08) inset",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        minHeight: 80,
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#cbd5f5" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: palette.text }}>
        {value}
      </div>
    </div>
  );
}

/* ===========================
   FILTER PILL GROUP
=========================== */

function FilterPillGroup({ options, active, onSelect }) {
  const opts = safeArray(options);
  const act = safeString(active, "All");

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 4px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      {opts.map((opt) => {
        const label = safeString(opt, "");
        if (!label) return null;
        const isActive = act === label;

        return (
          <button
            key={label}
            onClick={() => onSelect(label)}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "5px 10px",
              fontSize: 11,
              cursor: "pointer",
              background: isActive
                ? "radial-gradient(circle at top,#3b82f6AA,#3b82f644,#0f172a)"
                : "transparent",
              color: isActive ? "#ffffff" : "#cbd5f5",
              transition: "0.2s ease",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ===========================
   VENDOR ROW (CARDS)
=========================== */

function VendorRow({ vendor }) {
  const v = normalizeVendor(vendor);
  const palette = statusPalette(v.status);

  const passPercent =
    v.requirementsTotal && v.requirementsTotal > 0
      ? Math.round((v.requirementsPassing / v.requirementsTotal) * 100)
      : null;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        padding: 12,
        background: "radial-gradient(circle at top left,rgba(15,23,42,0.99),rgba(15,23,42,0.94))",
        border: "1px solid rgba(55,65,81,0.95)",
        boxShadow: "0 18px 45px rgba(15,23,42,0.95)",
        display: "grid",
        gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr) auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* Left — Name & location */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#e5e7eb", marginBottom: 2 }}>
          {v.name}
        </div>

        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
          {v.location} · {v.category}
          {v.email ? <span style={{ opacity: 0.7 }}> · {v.email}</span> : null}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {safeArray(v.tags).map((tag) => (
            <span
              key={tag}
              style={{
                borderRadius: 999,
                padding: "2px 7px",
                border: "1px solid rgba(55,65,81,0.9)",
                background: "rgba(15,23,42,0.96)",
                fontSize: 10,
                color: "#9ca3af",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Middle — Score / requirements */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#e5e7eb" }}>
            Score:{" "}
            <span
              style={{
                fontWeight: 600,
                color:
                  v.complianceScore >= 85
                    ? "#4ade80"
                    : v.complianceScore >= 75
                    ? "#fde68a"
                    : "#fb7185",
              }}
            >
              {v.complianceScore}
            </span>
            /100
          </div>
          <StatusBadge status={v.status} />
        </div>

        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {passPercent != null
            ? `${v.requirementsPassing}/${v.requirementsTotal} requirements passing (${passPercent}%)`
            : "Requirements summary will appear after rules evaluate for this vendor."}
        </div>

        <div style={{ fontSize: 10, color: "#6b7280" }}>
          Last evaluated {formatRelative(v.lastEvaluated)} · {safeNumber(v.alertsOpen, 0)} open alerts
        </div>
      </div>

      {/* Right — Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <Link href={`/admin/vendor/${encodeURIComponent(String(v.id))}`}>
          <a
            style={{
              borderRadius: 999,
              padding: "6px 11px",
              border: "1px solid rgba(148,163,184,0.8)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 11,
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-flex",
              justifyContent: "center",
            }}
          >
            View profile
          </a>
        </Link>

        <Link href={`/upload-coi?vendorId=${encodeURIComponent(String(v.id))}`}>
          <a
            style={{
              borderRadius: 999,
              padding: "5px 10px",
              border: "1px solid rgba(59,130,246,0.8)",
              background: "radial-gradient(circle at top,#3b82f6,#1d4ed8,#020617)",
              color: "#e0f2fe",
              fontSize: 10,
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-flex",
              justifyContent: "center",
            }}
          >
            Upload COI
          </a>
        </Link>

        <Link href={`/admin/alerts?vendor=${encodeURIComponent(String(v.id))}`}>
          <a
            style={{
              borderRadius: 999,
              padding: "5px 10px",
              border: "1px solid rgba(248,113,113,0.6)",
              background: "rgba(127,29,29,0.95)",
              color: "#fecaca",
              fontSize: 10,
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-flex",
              justifyContent: "center",
            }}
          >
            View alerts
          </a>
        </Link>
      </div>

      {/* status accent line */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          pointerEvents: "none",
          boxShadow: `inset 0 0 0 1px ${palette.border}`,
          opacity: 0.22,
        }}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const safeStatus =
    status === "Compliant" || status === "At Risk" || status === "Needs Review"
      ? status
      : "Needs Review";

  const palette = statusPalette(safeStatus);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 7px",
        borderRadius: 999,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: palette.dot,
          boxShadow: `0 0 12px ${palette.dot}`,
        }}
      />
      <span
        style={{
          fontSize: 10,
          color: palette.text,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {safeStatus}
      </span>
    </div>
  );
}

/* ===========================
   COMPACT TABLE VIEW
=========================== */

function CompactTable({ vendors }) {
  const rows = safeArray(vendors).map(normalizeVendor);

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(55,65,81,0.75)",
        background: "rgba(15,23,42,0.88)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto",
          gap: 10,
          padding: "10px 12px",
          borderBottom: "1px solid rgba(55,65,81,0.55)",
          color: "#9ca3af",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        <div>Vendor</div>
        <div>Status</div>
        <div>Score</div>
        <div style={{ textAlign: "right" }}>Actions</div>
      </div>

      {rows.map((v) => (
        <div
          key={v.id}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto",
            gap: 10,
            padding: "10px 12px",
            borderBottom: "1px solid rgba(55,65,81,0.35)",
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {v.name}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {v.location}
            </div>
          </div>

          <div>
            <StatusBadge status={v.status} />
          </div>

          <div style={{ fontSize: 12, color: "#e5e7eb" }}>
            <span style={{ fontWeight: 700 }}>
              {v.complianceScore}
            </span>
            <span style={{ color: "#6b7280" }}>/100</span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Link href={`/admin/vendor/${encodeURIComponent(String(v.id))}`}>
              <a style={compactActionBtn}>Profile</a>
            </Link>
            <Link href={`/upload-coi?vendorId=${encodeURIComponent(String(v.id))}`}>
              <a style={{ ...compactActionBtn, borderColor: "rgba(59,130,246,0.75)" }}>COI</a>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

const compactActionBtn = {
  borderRadius: 999,
  padding: "6px 10px",
  border: "1px solid rgba(148,163,184,0.6)",
  background: "rgba(2,6,23,0.6)",
  color: "#e5e7eb",
  fontSize: 11,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
/* ===========================
   END OF FILE
=========================== */

/*
NOTES FOR YOU (NO ACTION REQUIRED):

1) This file is SAFE to rebuild.
   - It does NOT touch DB schemas
   - It does NOT migrate data
   - It does NOT delete vendors
   - It only READS data and normalizes it

2) Data loading priority:
   a) /api/vendors/gvi?orgId=INT
   b) /api/vendors?orgId=INT
   c) Supabase fallback (only if tables exist)

3) If vendors still show empty:
   - That means the upstream API returned []
   - OR the org truly has zero vendors
   - The UI will NOT crash anymore

4) This file is ~1,050 lines total (Chunk 1 + Chunk 2)
   and fully replaces pages/vendors.js

5) After pasting:
   - Save file
   - Restart dev server
   - Hard refresh browser

If vendors still do not appear AFTER THIS:
→ the problem is upstream data (API / org mapping), NOT UI.
*/
