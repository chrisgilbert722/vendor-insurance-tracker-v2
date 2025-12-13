// components/panels/CriticalVendorWatchlist.js
import { useEffect, useState } from "react";

export default function CriticalVendorWatchlist({ orgId }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      setLoading(true);
      const res = await fetch(
        `/api/alerts-v2/critical-vendors?orgId=${orgId}`
      );
      const json = await res.json();
      if (json.ok) setVendors(json.vendors || []);
      setLoading(false);
    }

    load();
  }, [orgId]);

  return (
    <div
      style={{
        marginTop: 20,
        padding: 18,
        borderRadius: 22,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(248,113,113,0.35)",
        boxShadow: "0 0 25px rgba(248,113,113,0.15)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          marginBottom: 10,
          color: "#fb7185",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Critical Vendor Watchlist
      </div>

      {loading ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>Loading…</div>
      ) : vendors.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>
          No vendors with active critical alerts.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {vendors.map((v) => (
            <VendorRow key={v.vendorId} vendor={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function VendorRow({ vendor }) {
  const severityColor =
    vendor.maxSeverity === "critical"
      ? "#fb7185"
      : vendor.maxSeverity === "high"
      ? "#facc15"
      : vendor.maxSeverity === "medium"
      ? "#38bdf8"
      : "#a1a1aa";

  function handleClick() {
    if (!vendor.vendorId) return;
    window.location.href = `/admin/vendor/${vendor.vendorId}/fix`;
  }

  return (
    <div
      onClick={handleClick}
      style={{
        padding: 10,
        borderRadius: 14,
        border: "1px solid rgba(55,65,81,0.9)",
        background: "rgba(15,23,42,0.98)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        justifyContent: "space-between",
        cursor: "pointer",
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 0 18px rgba(248,113,113,0.35)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 500 }}>
          {vendor.name}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {vendor.alertCount} active alerts · Last{" "}
          {vendor.lastAlertAgeDays} days ago
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 999,
            border: `1px solid ${severityColor}80`,
            color: severityColor,
            background: "rgba(15,23,42,0.9)",
          }}
        >
          {String(vendor.maxSeverity || "unknown").toUpperCase()}
        </span>
      </div>
    </div>
  );
}
