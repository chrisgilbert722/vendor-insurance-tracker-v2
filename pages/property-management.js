// pages/property-management.js
// ============================================================
// Property Management Funnel — Executive Self-Serve Entry
// Goal: Convert PMs & owners WITHOUT demos or sales calls
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
          content="See hidden vendor insurance risk across your property portfolio. Identify non-compliance, expiring COIs, and owner exposure before it becomes a problem."
        />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, #020617 0%, #020617 45%, #000 100%)",
          color: "#e5e7eb",
          padding: "96px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1140,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 120,
          }}
        >

          {/* =====================================================
              EXECUTIVE HERO — SINGLE PORTFOLIO RISK VIEW
          ===================================================== */}
          <section
            style={{
              padding: "72px 48px",
              borderRadius: 32,
              border: "1px solid rgba(148,163,184,0.35)",
              background:
                "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(2,6,23,1))",
              boxShadow:
                "0 0 90px rgba(56,189,248,0.28), inset 0 0 48px rgba(0,0,0,0.85)",
            }}
          >
            {/* Header */}
            <div style={{ maxWidth: 820, marginBottom: 48 }}>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#60a5fa",
                  marginBottom: 14,
                }}
              >
                Portfolio Risk Command View
              </div>

              <h1
                style={{
                  fontSize: 52,
                  lineHeight: 1.1,
                  fontWeight: 700,
                  marginBottom: 22,
                  background:
                    "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                See Hidden Vendor Insurance Risk
                <br />
                <span style={{ opacity: 0.9 }}>
                  Before It Becomes an Owner Problem
                </span>
              </h1>

              <p
                style={{
                  fontSize: 19,
                  color: "#cbd5f5",
                  maxWidth: 700,
                }}
              >
                Live insurance compliance visibility for a single property
                portfolio. No spreadsheets. No chasing vendors. No automation
                until <strong>you</strong> approve.
              </p>
            </div>

            {/* Main Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 3fr",
                gap: 32,
                alignItems: "stretch",
              }}
            >
              {/* Portfolio Context */}
              <div
                style={{
                  padding: 32,
                  borderRadius: 24,
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  boxShadow: "0 0 40px rgba(0,0,0,0.75)",
                }}
              >
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>
                  Example Property Portfolio
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    marginBottom: 16,
                  }}
                >
                  150-Unit Residential Property
                </div>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: "#cbd5f5",
                  }}
                >
                  <li>• 42 Active Vendors</li>
                  <li>• 7 Service Categories</li>
                  <li>• 1 Ownership Group</li>
                  <li>• Continuous COI Monitoring</li>
                </ul>

                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 14,
                    borderTop: "1px solid rgba(148,163,184,0.18)",
                    fontSize: 13,
                    color: "#93c5fd",
                  }}
                >
                  Risk updates automatically as vendor documents change.
                </div>
              </div>

              {/* Risk Metrics */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 20,
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

            {/* CTA */}
            <div
              style={{
                marginTop: 48,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 18,
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

          {/* =====================================================
              PAIN — OWNER RISK
          ===================================================== */}
          <Section
            title="Vendor insurance is silently putting owners at risk."
            bullets={[
              "Vendors ignore COI requests",
              "Expired coverage goes unnoticed",
              "Missing endorsements surface too late",
              "Owner audits trigger last-minute panic",
              "Renewals slip through the cracks",
            ]}
            footer="Most property managers don’t realize the exposure until an audit, claim, or vendor incident happens."
          />

          {/* =====================================================
              SYSTEM — WHY THIS IS DIFFERENT
          ===================================================== */}
          <Section
            title="A system that monitors vendor compliance for you."
            bullets={[
              "Instantly see non-compliant vendors across properties",
              "Continuous COI and endorsement validation",
              "Renewals tracked automatically in the background",
              "No chasing vendors or brokers manually",
            ]}
            footer="You see the risk first. Automation handles the enforcement."
          />

          {/* =====================================================
              TRUST — CONTROL
          ===================================================== */}
          <Section
            title="See exactly what will happen — before anything is sent."
            bullets={[
              "Preview reminder emails and renewal schedules",
              "Understand enforcement rules before activation",
              "Nothing runs until you explicitly approve automation",
            ]}
            footer="Full control. No surprises. Ever."
          />

          {/* =====================================================
              BEFORE / AFTER
          ===================================================== */}
          <CompareSection />

          {/* =====================================================
              FIRST 48 HOURS
          ===================================================== */}
          <TimelineSection />

          {/* =====================================================
              FINAL CTA
          ===================================================== */}
          <section style={{ textAlign: "center" }}>
            <Link
              href="/signup?industry=property_management"
              style={{ ...primaryCta, fontSize: 20, padding: "18px 36px" }}
            >
              Start 14-Day Free Trial
            </Link>

            <div style={ctaSubtext}>
              See your risk first. Activate automation when you’re ready.
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function RiskMetric({ label, value, color, note }) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 20,
        border: `1px solid ${color}55`,
        background: "rgba(15,23,42,0.92)",
        boxShadow: `0 0 24px ${color}33`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#9ca3af",
          marginBottom: 10,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 38,
          fontWeight: 700,
          color,
          marginBottom: 6,
        }}
      >
        {value}
      </div>

      <div style={{ fontSize: 14, color: "#cbd5f5" }}>{note}</div>
    </div>
  );
}

function Section({ title, bullets, footer }) {
  return (
    <section>
      <h2 style={h2}>{title}</h2>
      <ul style={bulletsStyle}>
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p style={softText}>{footer}</p>
    </section>
  );
}

function CompareSection() {
  return (
    <section>
      <h2 style={h2}>Before vs After Automation</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
        }}
      >
        <CompareCard
          title="Before Automation"
          status="Manual · Reactive · Risk-Prone"
          items={[
            "Vendors ignore requests",
            "Expired policies unnoticed",
            "Endorsements missed",
            "Spreadsheets & email chasing",
            "Owner panic during audits",
          ]}
          footer="Risk stays hidden until something breaks."
        />

        <CompareCard
          title="After Automation"
          status="Automated · Continuous · Owner-Safe"
          items={[
            "Automatic vendor reminders",
            "Continuous COI monitoring",
            "Endorsements validated instantly",
            "Renewals escalated early",
            "Owners protected proactively",
          ]}
          footer="You see the risk first. Automation enforces compliance quietly."
          positive
        />
      </div>
    </section>
  );
}

function CompareCard({ title, status, items, footer, positive }) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 24,
        border: `1px solid ${
          positive ? "rgba(34,197,94,0.45)" : "rgba(148,163,184,0.35)"
        }`,
        background:
          "radial-gradient(circle at top left, rgba(15,23,42,0.92), rgba(2,6,23,0.96))",
      }}
    >
      <h3 style={{ fontSize: 22, marginBottom: 6 }}>{title}</h3>
      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
        {status}
      </div>
      <ul style={compareList}>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <div style={{ fontSize: 14, color: "#9ca3af" }}>{footer}</div>
    </div>
  );
}

function TimelineSection() {
  return (
    <section>
      <h2 style={h2}>What happens in your first 48 hours</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
        }}
      >
        <TimelineStep
          time="Hour 0–1"
          title="Connect vendors"
          text="Upload a vendor list or COIs. AI analyzes coverage automatically."
        />
        <TimelineStep
          time="Hour 1–12"
          title="Risk becomes visible"
          text="Non-compliance and owner exposure are surfaced."
        />
        <TimelineStep
          time="Hour 12–24"
          title="Automation previewed"
          text="Emails and renewals generated — nothing sent."
        />
        <TimelineStep
          time="Hour 24–48"
          title="You decide"
          text="Activate automation or walk away with zero impact."
        />
      </div>

      <div style={{ marginTop: 20, fontSize: 14, color: "#93c5fd" }}>
        Automation never runs without your approval.
      </div>
    </section>
  );
}

function TimelineStep({ time, title, text }) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 20,
        border: "1px solid rgba(148,163,184,0.35)",
        background:
          "radial-gradient(circle at top left, rgba(15,23,42,0.9), rgba(2,6,23,0.95))",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#60a5fa",
          marginBottom: 6,
        }}
      >
        {time}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 15, color: "#cbd5f5" }}>{text}</div>
    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */

const h2 = {
  fontSize: 34,
  fontWeight: 600,
  marginBottom: 18,
};

const bulletsStyle = {
  fontSize: 18,
  lineHeight: 1.7,
  paddingLeft: 22,
  color: "#cbd5f5",
  marginBottom: 14,
};

const softText = {
  fontSize: 15,
  color: "#9ca3af",
};

const primaryCta = {
  display: "inline-block",
  padding: "16px 34px",
  borderRadius: 999,
  background: "linear-gradient(90deg,#38bdf8,#1d4ed8,#0f172a)",
  border: "1px solid rgba(56,189,248,0.9)",
  color: "#e5f2ff",
  fontSize: 18,
  fontWeight: 600,
  textDecoration: "none",
  boxShadow: "0 0 36px rgba(56,189,248,0.7)",
};

const ctaSubtext = {
  marginTop: 14,
  fontSize: 13,
  color: "#9ca3af",
};

const compareList = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#cbd5f5",
  paddingLeft: 18,
};
