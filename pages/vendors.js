// ============================================================
// VENDORS PAGE — STABLE, DEFENSIVE, CLIENT-ONLY
// - Next.js pages router
// - Supabase client ONLY (no API routes)
// - org_id is INTEGER
// - useOrg() provides activeOrgId (int)
// - Metrics & filters NEVER crash
// ============================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useOrg } from "../context/OrgContext";

/* ============================================================
   SAFE HELPERS (NEVER THROW)
============================================================ */

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value, fallback = 0) {
  return typeof value === "number" && !Number.isNaN(value)
    ? value
    : fallback;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(date) {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ============================================================
   PAGE
============================================================ */

export default function VendorsPage() {
  const { activeOrgId, loadingOrgs } = useOrg();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /* ============================================================
     DATA LOAD (CLIENT ONLY)
  ============================================================ */

  useEffect(() => {
    if (loadingOrgs) return;
    if (!activeOrgId) {
      setVendors([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadVendors() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("org_id", activeOrgId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("[vendors] load error", error);
        setError("Failed to load vendors.");
        setVendors([]);
      } else {
        setVendors(safeArray(data));
      }

      setLoading(false);
    }

    loadVendors();

    return () => {
      cancelled = true;
    };
  }, [activeOrgId, loadingOrgs]);

  /* ============================================================
     NORMALIZED VENDORS (SAFE SHAPE)
  ============================================================ */

  const normalizedVendors = useMemo(() => {
    return safeArray(vendors).map((v) => {
      const expirationDate = parseDate(
        v?.insurance_expiration ||
          v?.expiration_date ||
          v?.policy_expiration
      );

      const days = daysUntil(expirationDate);

      let computedStatus = "unknown";
      if (days !== null) {
        if (days < 0) computedStatus = "expired";
        else if (days <= 30) computedStatus = "expiring";
        else computedStatus = "active";
      }

      return {
        id: v?.id ?? null,
        name: safeString(v?.name, "Unnamed Vendor"),
        email: safeString(v?.email),
        status: safeString(v?.status, computedStatus),
        computedStatus,
        expirationDate,
        daysRemaining: days,
        createdAt: parseDate(v?.created_at),
      };
    });
  }, [vendors]);

  /* ============================================================
     FILTERED VENDORS (NEVER CRASH)
  ============================================================ */

  const filteredVendors = useMemo(() => {
    let list = safeArray(normalizedVendors);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        safeString(v.name).toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter(
        (v) => v.computedStatus === statusFilter
      );
    }

    return list;
  }, [normalizedVendors, search, statusFilter]);

  /* ============================================================
     METRICS (100% SAFE)
  ============================================================ */

  const metrics = useMemo(() => {
    const list = safeArray(normalizedVendors);

    return {
      total: list.length,
      active: list.filter((v) => v.computedStatus === "active").length,
      expiring: list.filter((v) => v.computedStatus === "expiring").length,
      expired: list.filter((v) => v.computedStatus === "expired").length,
    };
  }, [normalizedVendors]);

  /* ============================================================
     RENDER
  ============================================================ */

  if (loading) {
    return <div style={{ padding: 24 }}>Loading vendors…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "red" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Vendors</h1>

      {/* =======================
          METRICS
      ======================= */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <Metric label="Total" value={metrics.total} />
        <Metric label="Active" value={metrics.active} />
        <Metric label="Expiring" value={metrics.expiring} />
        <Metric label="Expired" value={metrics.expired} />
      </div>

      {/* =======================
          FILTERS
      ======================= */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Search vendors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

      {/* =======================
          TABLE
      ======================= */}
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
              <tr key={v.id ?? Math.random()}>
                <td>
                  <Link href={`/vendors/${v.id ?? ""}`}>
                    {v.name}
                  </Link>
                </td>
                <td>{v.computedStatus}</td>
                <td>
                  {v.expirationDate
                    ? `${v.daysRemaining} days`
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
   METRIC COMPONENT
============================================================ */

function Metric({ label, value }) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #ddd",
        borderRadius: 6,
        minWidth: 80,
      }}
    >
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>
        {safeNumber(value)}
      </div>
    </div>
  );
}
