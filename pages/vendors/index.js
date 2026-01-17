// pages/vendors/index.js
import { useOrg } from "../../context/OrgContext";
import GlobalVendorTable from "../../components/vendors/GlobalVendorTable";

export default function VendorsIndexPage() {
  const { activeOrgId: orgId, loading } = useOrg();

  if (loading || !orgId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
          fontSize: 14,
          background:
            "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        }}
      >
        Loading organization…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px 40px",
        color: "#e5e7eb",

        // outer shell should NOT receive clicks
        pointerEvents: "none",
      }}
    >
      {/* AURA (visual only) */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1200,
          height: 1200,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.32), transparent 65%)",
          filter: "blur(140px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* COCKPIT FRAME — ONLY CLICKABLE LAYER */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          pointerEvents: "auto",
          borderRadius: 32,
          padding: 22,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: `
            0 0 60px rgba(15,23,42,0.95),
            0 0 80px rgba(15,23,42,0.9),
            inset 0 0 22px rgba(15,23,42,0.9)
          `,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 20% 0,#38bdf8,#6366f1,#0f172a)",
              boxShadow: "0 0 38px rgba(56,189,248,0.7)",
            }}
          >
            <span style={{ fontSize: 22 }}>🛰️</span>
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
                  "linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.7))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Global Vendor Index
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                AI Risk & Compliance Map
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>
              One cockpit for{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                every vendor
              </span>
              .
            </h1>

            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#cbd5f5",
                maxWidth: 700,
              }}
            >
              Visualize AI risk scores, compliance progress, alerts, and
              renewals across your entire portfolio. Drill into any vendor
              with one click.
            </p>
          </div>
        </div>

        {/* GVI TABLE */}
        <GlobalVendorTable orgId={orgId} />
      </div>
    </div>
  );
}
