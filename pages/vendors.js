// ============================================================
// VENDORS — V4 HARD RESET (STABLE FOUNDATION)
// - Next.js pages router
// - Supabase client ONLY
// - org_id is INTEGER
// - useOrg() provides activeOrgId (int)
// - ZERO client-side crash vectors
// ============================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useOrg } from "../context/OrgContext";

/* ============================================================
   SAFE HELPERS (NEVER THROW)
============================================================ */

const safeArray = (v) => (Array.isArray(v) ? v : []);
const safeString = (v, fallback = "") =>
  typeof v === "string" ? v : v == null ? fallback : String(v);
const safeNumber = (v, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRelative(date) {
  if (!date) return "—";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ============================================================
   NORMALIZER — SINGLE SOURCE OF TRUTH
============================================================ */

function normalizeVendor(row) {
  if (!row || typeof row !== "object") return null;

  const expiration = parseDate(
    row.insurance_expiration ||
      row.policy_expiration ||
      row.expiration_date
  );

  let computedStatus = "unknown";
  if (expiration) {
    const days = Math.ceil(
      (expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0) computedStatus = "expired";
    else if (days <= 30) computedStatus = "expiring";
    else computedStatus = "active";
  }

  return {
    id: row.id ?? null,
    org_id: row.org_id ?? null,

    name: safeString(row.name, "Unnamed Vendor"),
    email: row.email ? safeString(row.email) : null,
    category: safeString(row.category, "Vendor"),

    status: safeString(row.status, computedStatus),
    computedStatus,

    expirationDate: expiration,
    createdAt: parseDate(row.created_at),
  };
}

/* ============================================================
   PAGE
============================================================ */

export default function VendorsPage() {
  console.log("🔥 VENDORS V4 IS LIVE");

  const { activeOrgId, loadingOrgs } = useOrg();
  const orgId = Number.isInteger(activeOrgId) ? activeOrgId : null;

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /* ============================================================
     LOAD VENDORS (SUPABASE ONLY)
  ============================================================ */

  useEffect(() => {
    if (loadingOrgs) return;

    let cancelled = false;

    async function load() {
      if (!orgId) {
        setVendors([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("[vendors] load error:", error);
        setError("Failed to load vendors.");
        setVendors([]);
      } else {
        const normalized = safeArray(data)
          .map(normalizeVendor)
          .filter(Boolean); // 🔒 HARD GUARANTEE

        setVendors(normalized);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, loadingOrgs]);

  /* ============================================================
     FILTERED + METRICS (SAFE)
  ============================================================ */

  const filteredVendors = useMemo(() => {
    let list = vendors;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        v.name.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter(
        (v) => v.computedStatus === statusFilter
      );
    }

    return list;
  }, [vendors, search, statusFilter]);

  const metrics = useMemo(() => {
    return {
      total: vendors.length,
      active: vendors.filter((v) => v.computedStatus === "active").length,
      expiring: vendors.filter((v) => v.computedStatus === "expiring").length,
      expired: vendors.filter((v) => v.computedStatus === "expired").length,
    };
  }, [vendors]);

  /* ============================================================
     RENDER
  ============================================================ */

  if (loading) {
    return <div style={{ padding: 24 }}>Loading vendors…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "crimson" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ marginBottom: 12 }}>Vendors</h1>

      {/* METRICS */}
      <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
        <Metric label="Total" value={metrics.total} />
        <Metric label="Active" value={metrics.active} />
        <Metric label="Expiring" value={metrics.expiring} />
        <Metric label="Expired" value={metrics.expired} />
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors…"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* TABLE */}
      {filteredVendors.length === 0 ? (
        <div>No vendors found.</div>
      ) : (
        <table width="100%" cellPadding={8}>
          <thead>
            <tr>
              <th align="left">Vendor</th>
              <th align="left">Status</th>
              <th align="left">Expires</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={`/vendors/${v.id}`}>
                    {v.name}
                  </Link>
                </td>
                <td>{v.computedStatus}</td>
                <td>
                  {v.expirationDate
                    ? formatRelative(v.expirationDate)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ============================================================
   METRIC
============================================================ */

function Metric({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: 90,
      }}
    >
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>
        {safeNumber(value)}
      </div>
    </div>
  );
}
