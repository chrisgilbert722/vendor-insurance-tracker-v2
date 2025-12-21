// pages/property-management.js
// ============================================================
// Property Management Funnel — Self-Serve Entry Point
// Purpose: Qualify PMs and hand off to the product to close
// ============================================================

import Head from "next/head";
import Link from "next/link";

export default function PropertyManagementLanding() {
  return (
    <>
      <Head>
        <title>Vendor Insurance Compliance for Property Managers</title>
        <meta
          name="description"
          content="See vendor insurance risk across your properties in minutes. Automate reminders, renewals, and enforcement without chasing vendors."
        />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0,#020617 40%,#000 100%)",
          color: "#e5e7eb",
          padding: "80px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 96,
          }}
        >
          {/* SINGLE PORTFOLIO RISK HERO */}
          <section
            style={{
              padding: "60px 36px",
              borderRadius: 28,
              border: "1px solid rgba(148,163,184,0.35)",
              background:
                "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(2,6,23,1))",
              boxShadow:
                "0 0 70px rgba(56,189,248,0.28), inset 0 0 40px rgba(0,0,0,0.85)",
            }}
          >
            <div style={{ maxWidth: 760, marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#60a5fa",
                  marginBottom: 12,
                }}
              >
                Portfolio Risk Command View
              </div>

              <h1
                style={{
                  fontSize: 44,
                  lineHeight: 1.1,
                  fontWeight: 700,
                  marginBottom: 18,
                  background:
                    "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                See Hidden Vendor Insurance Risk
                <br />
                Before It Becomes an Owner Problem
              </h1>

              <p style={{ fontSize: 18, color: "#cbd5f5", maxWidth: 640 }}>
                Live insurance compliance visibility for a single property
                portfolio. No spreadsheets. No chasing vendors. No automation
                until you approve.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 3fr",
                gap: 28,
              }}
            >
              <div
                style={{
                  padding: 28,
                  borderRadius: 22,
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(148,163,184,0.25)",
                }}
              >
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
                  Example Property Portfolio
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  150-Unit Residential Property
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  <li>• 42 Active Vendors</li>
                  <li>• 7 Service Categories</li>
                  <li>• 1 Ownership Group</li>
                  <li>• Continuous COI Monitoring</li>
                </ul>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 18,
                }}
              >
                <RiskMetric
                  label="Non-Compliant Vendors"
                  value="12"
                  color="#fb7185"
                  note="Coverage gaps detected"
                />
                <RiskMetric
                  label="COIs Expiring ≤30 Days"
                  value="7"
                  color="#facc15"
                  note="Renewals approaching"
                />
                <RiskMetric
                  label="Missing Endorsements"
                  value="4"
                  color="#facc15"
                  note="AI / Waivers required"
                />
                <RiskMetric
                  label="Owner Exposure"
                  value="HIGH"
                  color="#fb7185"
                  note="Audit & claim risk"
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 40,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 14, color: "#9ca3af" }}>
                Nothing is sent automatically. You review everything before
                activation.
              </div>
              <Link
                href="/signup?industry=property_management"
                style={primaryCta}
              >
                View My Property’s Risk
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function RiskMetric({ label, value, color, note }) {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 18,
        border: `1px solid ${color}55`,
        background: "rgba(15,23,42,0.92)",
        boxShadow: `0 0 20px ${color}33`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#9ca3af",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: "#cbd5f5" }}>{note}</div>
    </div>
  );
}

const primaryCta = {
  display: "inline-block",
  padding: "14px 28px",
  borderRadius: 999,
  background: "linear-gradient(90deg,#38bdf8,#1d4ed8,#0f172a)",
  border: "1px solid rgba(56,189,248,0.9)",
  color: "#e5f2ff",
  fontSize: 16,
  fontWeight: 600,
  textDecoration: "none",
  boxShadow: "0 0 28px rgba(56,189,248,0.65)",
};
