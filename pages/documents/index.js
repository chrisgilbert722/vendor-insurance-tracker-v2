// pages/documents/index.js
import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../context/OrgContext";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  borderSoft: "rgba(51,65,85,0.9)",
  neonBlue: "#38bdf8",
  neonPurple: "#a855f7",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",
};

const TYPE_META = {
  coi: { label: "COI", icon: "🛡️", color: GP.neonBlue },
  w9: { label: "W-9", icon: "🧾", color: GP.neonGold },
  license: { label: "Licenses", icon: "📛", color: GP.neonGreen },
  contract: { label: "Contracts", icon: "📄", color: GP.neonPurple },
  endorsement: { label: "Endorsements", icon: "🧷", color: GP.neonBlue },
  safety: { label: "Safety Plans", icon: "🦺", color: GP.neonGold },
  waiver: { label: "Waivers", icon: "✍️", color: GP.neonGreen },
  other: { label: "Other", icon: "📎", color: GP.textSoft },
};

function fmtRelative(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = diff / 60000;
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  return `${Math.round(days)}d ago`;
}

export default function DocumentsHub() {
  const { activeOrgId } = useOrg();
  const [loading, setLoading] = useState(true);
  const [vendorCount, setVendorCount] = useState(0);
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("coi");

  useEffect(() => {
    if (!activeOrgId) return;
    setLoading(true);

    fetch(`/api/documents/hub-summary?orgId=${activeOrgId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setVendorCount(j.vendorCount || 0);
          setTypes(j.types || []);
        }
      })
      .finally(() => setLoading(false));
  }, [activeOrgId]);

  const selected = useMemo(
    () => types.find((t) => t.type === selectedType) || null,
    [types, selectedType]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px 60px",
        color: GP.text,
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.7)",
            marginBottom: 8,
          }}
        >
          DOCUMENTS • MULTI-DOC COMPLIANCE HUB
        </div>

        <h1
          style={{
            fontSize: 30,
            fontWeight: 600,
            margin: 0,
            background: "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e,#facc15)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Compliance Documents
        </h1>

        <p style={{ marginTop: 8, fontSize: 13, color: GP.textSoft, maxWidth: 760 }}>
          One system for all vendor compliance documents — COIs, W-9s, licenses, contracts,
          endorsements, waivers, and safety plans. AI extracts fields, rules fire, alerts enforce,
          and evidence exports prove it.
        </p>
      </div>

      {/* TILE GRID */}
      <div
        style={{
          borderRadius: 24,
          padding: 16,
          background: GP.panel,
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: "0 18px 45px rgba(15,23,42,0.95)",
          marginBottom: 18,
        }}
      >
        {loading ? (
          <div style={{ color: GP.textSoft, fontSize: 13 }}>Loading document intelligence…</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 12,
            }}
          >
            {types.map((t) => {
              const meta = TYPE_META[t.type] || TYPE_META.other;
              const active = selectedType === t.type;

              const status =
                t.missingVendorCount === 0
                  ? { label: "Healthy", color: GP.neonGreen }
                  : t.missingVendorCount > Math.max(1, Math.floor(vendorCount * 0.5))
                  ? { label: "Needs Attention", color: GP.neonRed }
                  : { label: "In Progress", color: GP.neonGold };

              return (
                <div
                  key={t.type}
                  onClick={() => setSelectedType(t.type)}
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    cursor: "pointer",
                    border: `1px solid ${active ? meta.color : "rgba(51,65,85,0.9)"}`,
                    background: active
                      ? "radial-gradient(circle at top left,rgba(56,189,248,0.10),rgba(15,23,42,0.98))"
                      : "rgba(15,23,42,0.9)",
                    boxShadow: active ? `0 0 22px ${meta.color}33` : "none",
                    transition: "transform .15s ease, box-shadow .15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ fontSize: 18 }}>{meta.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                        {meta.label}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 999,
                        border: `1px solid ${status.color}55`,
                        color: status.color,
                        background: "rgba(2,6,23,0.6)",
                        fontWeight: 700,
                      }}
                    >
                      {status.label}
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Stat label="Docs" value={t.docCount} />
                    <Stat label="Vendors" value={`${t.vendorCount}/${vendorCount}`} />
                    <Stat label="Missing" value={t.missingVendorCount} accent={t.missingVendorCount > 0 ? GP.neonRed : GP.neonGreen} />
                    <Stat label="Last" value={fmtRelative(t.lastUploadedAt)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SELECTED TYPE DETAILS (simple and safe) */}
      <div
        style={{
          borderRadius: 24,
          padding: 16,
          background: GP.panel,
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: "0 18px 45px rgba(15,23,42,0.95)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: GP.textSoft, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Selected Type
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
              {(TYPE_META[selectedType] || TYPE_META.other).label}
            </div>
            <div style={{ fontSize: 12, color: GP.textSoft, marginTop: 6, maxWidth: 760 }}>
              Next: we’ll wire the filtered list view (vendor-by-vendor) + upload CTAs for this type.
              This hub already shifts perception immediately.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a
              href="/admin/alerts"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(250,204,21,0.7)",
                background: "rgba(250,204,21,0.12)",
                color: GP.neonGold,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View Enforcement →
            </a>

            <a
              href="/vendors"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.7)",
                background: "rgba(56,189,248,0.12)",
                color: GP.neonBlue,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View Vendors →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ borderRadius: 14, padding: 10, border: "1px solid rgba(51,65,85,0.9)", background: "rgba(2,6,23,0.55)" }}>
      <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: accent || "#e5e7eb" }}>
        {value}
      </div>
    </div>
  );
}
