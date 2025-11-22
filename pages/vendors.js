// pages/vendors.js
import { useState, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";

/* ===========================
   MOCK VENDORS (replace later)
=========================== */

const initialVendors = [
  {
    id: "summit-roofing",
    name: "Summit Roofing & Coatings",
    location: "Denver, CO",
    category: "Roofing / Exterior",
    tags: ["Onsite contractor", "High risk"],
    status: "At Risk",
    complianceScore: 72,
    lastEvaluated: "2025-11-20T09:15:00Z",
    alertsOpen: 2,
    requirementsPassing: 7,
    requirementsTotal: 10,
  },
  {
    id: "northline-mech",
    name: "Northline Mechanical Services",
    location: "Seattle, WA",
    category: "HVAC / Mechanical",
    tags: ["Interior contractor"],
    status: "Needs Review",
    complianceScore: 83,
    lastEvaluated: "2025-11-19T14:40:00Z",
    alertsOpen: 1,
    requirementsPassing: 9,
    requirementsTotal: 11,
  },
  {
    id: "brightline-janitorial",
    name: "Brightline Janitorial Group",
    location: "Austin, TX",
    category: "Janitorial / Cleaning",
    tags: ["Service vendor"],
    status: "Compliant",
    complianceScore: 91,
    lastEvaluated: "2025-11-18T11:05:00Z",
    alertsOpen: 0,
    requirementsPassing: 8,
    requirementsTotal: 8,
  },
];

/* ===========================
   HELPERS
=========================== */

function formatRelative(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = diffMs / 60000;
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  return `${Math.round(days)}d ago`;
}

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
   MAIN PAGE — VENDORS V2
=========================== */

export default function VendorsPage() {
  const { orgId } = useOrg();
  const { isAdmin, isManager } = useRole();
  const canCreate = isAdmin || isManager;

  const [vendors] = useState(initialVendors);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const metrics = useMemo(() => {
    const total = vendors.length;
    const compliant = vendors.filter((v) => v.status === "Compliant").length;
    const atRisk = vendors.filter((v) => v.status === "At Risk").length;
    const needsReview = vendors.filter((v) => v.status === "Needs Review").length;
    const avgScore =
      total === 0
        ? 0
        : Math.round(
            vendors.reduce((sum, v) => sum + (v.complianceScore || 0), 0) /
              total
          );

    return { total, compliant, atRisk, needsReview, avgScore };
  }, [vendors]);

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      if (statusFilter !== "All" && v.status !== statusFilter) return false;
      if (categoryFilter !== "All" && v.category !== categoryFilter)
        return false;
      if (!search) return true;
      const hay = (
        v.name +
        " " +
        v.location +
        " " +
        v.category +
        " " +
        v.tags.join(" ")
      ).toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [vendors, statusFilter, categoryFilter, search]);

  const categories = useMemo(
    () => Array.from(new Set(vendors.map((v) => v.category))).sort(),
    [vendors]
  );

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
          background:
            "radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)",
          filter: "blur(130px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#3b82f6,#6366f1,#0f172a)",
              boxShadow: "0 0 45px rgba(59,130,246,0.7)",
            }}
          >
            <span style={{ fontSize: 22 }}>📊</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
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
                Vendors V2 · Compliance Portfolio
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

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              Cinematic view of{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#3b82f6,#8b5cf6,#e5e7eb)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                every vendor
              </span>{" "}
              in your program.
            </h1>

            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                fontSize: 13,
                color: "#cbd5f5",
                maxWidth: 640,
              }}
            >
              Filter by status, category, or search. Drill into vendor profiles
              to see coverage, expirations, rules firing, and open alerts.
            </p>
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
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow:
              "0 24px 60px rgba(15,23,42,0.98), 0 0 28px rgba(59,130,246,0.22)",
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 12,
          }}
        >
          <MetricCard label="Total vendors" value={metrics.total} tone="neutral" />
          <MetricCard label="Compliant" value={metrics.compliant} tone="good" />
          <MetricCard label="At risk" value={metrics.atRisk} tone="bad" />
          <MetricCard
            label="Avg. score"
            value={`${metrics.avgScore}`}
            tone="info"
          />
        </div>

        {/* ACTIONS + ORG SNAPSHOT */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
            }}
          >
            Actions
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Link href="/upload-coi">
              <button
                style={{
                  borderRadius: 999,
                  padding: "8px 14px",
                  border: "1px solid rgba(59,130,246,0.9)",
                  background:
                    "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#020617)",
                  color: "#e5f2ff",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                + Upload new COI
              </button>
            </Link>

            <button
              disabled={!canCreate}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border: "1px solid rgba(34,197,94,0.9)",
                background:
                  "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
                color: "#dcfce7",
                fontSize: 12,
                fontWeight: 500,
                cursor: canCreate ? "pointer" : "not-allowed",
                opacity: canCreate ? 1 : 0.5,
              }}
            >
              + Add vendor (mock)
            </button>

            <div
              style={{
                fontSize: 10,
                color: "#6b7280",
                flex: 1,
                minWidth: 120,
              }}
            >
              When wired, these buttons will create vendors + COI jobs tied to
              your org {orgId ? `(${orgId})` : ""}.
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR + LIST */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          borderRadius: 24,
          padding: 16,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
          border: "1px solid rgba(148,163,184,0.6)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* FILTER BAR */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
            }}
          >
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
              minWidth: 200,
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

          <div
            style={{
              fontSize: 10,
              color: "#6b7280",
              minWidth: 120,
              textAlign: "right",
            }}
          >
            Showing {filtered.length} of {vendors.length}
          </div>
        </div>

        {/* LIST */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {filtered.map((v) => (
            <VendorRow key={v.id} vendor={v} />
          ))}

          {filtered.length === 0 && (
            <div
              style={{
                borderRadius: 18,
                border: "1px dashed rgba(75,85,99,0.9)",
                padding: "14px 12px",
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              No vendors match your filters. Try adjusting status, category, or
              search.
            </div>
          )}
        </div>
      </div>
    </div>
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
  }[tone];

  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 12px",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.text,
        boxShadow:
          "0 20px 55px rgba(15,23,42,0.95), 0 0 18px rgba(255,255,255,0.08) inset",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        minHeight: 80,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#cbd5f5",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: palette.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ===========================
   FILTER PILL GROUP
=========================== */

function FilterPillGroup({ options, active, onSelect }) {
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
      {options.map((opt) => {
        const isActive = active === opt;
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
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
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ===========================
   VENDOR ROW
=========================== */

function VendorRow({ vendor }) {
  const palette = statusPalette(vendor.status);

  const passPercent =
    vendor.requirementsTotal && vendor.requirementsTotal > 0
      ? Math.round(
          (vendor.requirementsPassing / vendor.requirementsTotal) * 100
        )
      : null;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        padding: 12,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.99),rgba(15,23,42,0.94))",
        border: `1px solid rgba(55,65,81,0.95)`,
        boxShadow: "0 18px 45px rgba(15,23,42,0.95)",
        display: "grid",
        gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr) auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* Left — Name & location */}
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#e5e7eb",
            marginBottom: 2,
          }}
        >
          {vendor.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginBottom: 4,
          }}
        >
          {vendor.location} · {vendor.category}
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {vendor.tags.map((tag) => (
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#e5e7eb",
            }}
          >
            Score:{" "}
            <span
              style={{
                fontWeight: 600,
                color:
                  vendor.complianceScore >= 85
                    ? "#4ade80"
                    : vendor.complianceScore >= 75
                    ? "#fde68a"
                    : "#fb7185",
              }}
            >
              {vendor.complianceScore}
            </span>
            /100
          </div>
          <StatusBadge status={vendor.status} />
        </div>

        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          {passPercent != null
            ? `${vendor.requirementsPassing}/${vendor.requirementsTotal} requirements passing (${passPercent}%)`
            : "Requirements summary not available yet."}
        </div>

        <div
          style={{
            fontSize: 10,
            color: "#6b7280",
          }}
        >
          Last evaluated {formatRelative(vendor.lastEvaluated)} ·{" "}
          {vendor.alertsOpen} open alerts
        </div>
      </div>

      {/* Right — Actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "flex-end",
        }}
      >
        <Link href={`/admin/vendor/${vendor.id}`}>
          <button
            style={{
              borderRadius: 999,
              padding: "6px 11px",
              border: "1px solid rgba(148,163,184,0.8)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            View profile
          </button>
        </Link>

        <Link href={`/admin/alerts?vendor=${encodeURIComponent(vendor.id)}`}>
          <button
            style={{
              borderRadius: 999,
              padding: "5px 10px",
              border: "1px solid rgba(248,113,113,0.6)",
              background: "rgba(127,29,29,0.95)",
              color: "#fecaca",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            View alerts
          </button>
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const palette = statusPalette(status);
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
        {status}
      </span>
    </div>
  );
}

/* ===========================
   END OF FILE — SAFE CLOSE
=========================== */

// VendorsPage is the default export above.
// All subcomponents live in this file.
//
// File ends here.
//
