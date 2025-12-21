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
          {/* HERO */}
          <section style={heroCard}>
            <div style={{ maxWidth: 760, marginBottom: 40 }}>
              <div style={eyebrow}>Portfolio Risk Command View</div>

              <h1 style={heroTitle}>
                See Hidden Vendor Insurance Risk
                <br />
                Before It Becomes an Owner Problem
              </h1>

              <p style={heroSub}>
                Live insurance compliance visibility for a single property
                portfolio. No spreadsheets. No chasing vendors. No automation
                until you approve.
              </p>
            </div>

            <div style={heroGrid}>
              <div style={propertyCard}>
                <div style={smallLabel}>Example Property Portfolio</div>
                <div style={propertyTitle}>150-Unit Residential Property</div>

                <ul style={propertyList}>
                  <li>• 42 Active Vendors</li>
                  <li>• 7 Service Categories</li>
                  <li>• 1 Ownership Group</li>
                  <li>• Continuous COI Monitoring</li>
                </ul>

                <div style={propertyNote}>
                  Risk updates automatically as vendor documents change.
                </div>
              </div>

              <div style={metricsGrid}>
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

            <div style={ctaStrip}>
              <div style={ctaNote}>
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

          {/* PAIN */}
          <section>
            <h2 style={h2}>
              Vendor insurance is silently putting owners at risk.
            </h2>

            <ul style={bullets}>
              <li>Vendors ignore COI requests</li>
              <li>Expired coverage goes unnoticed</li>
              <li>Owner audits trigger last-minute panic</li>
              <li>Renewals slip through the cracks</li>
            </ul>

            <p style={softText}>
              Most property managers don’t realize the risk until an audit,
              claim, or vendor incident happens.
            </p>
          </section>

          {/* SYSTEM */}
          <section>
            <h2 style={h2}>
              A system that monitors vendor compliance for you.
            </h2>

            <ul style={bullets}>
              <li>Instantly see non-compliant vendors</li>
              <li>Automatically prepare vendor reminders</li>
              <li>Track renewals continuously in the background</li>
              <li>Enforce insurance requirements without follow-ups</li>
            </ul>

            <p style={softText}>
              You see the risk first. Automation handles the rest.
            </p>
          </section>

          {/* TRUST */}
          <section>
            <h2 style={h2}>
              See exactly what will happen — before anything is sent.
            </h2>

            <ul style={bullets}>
              <li>Risk Intelligence dashboard shows real exposure</li>
              <li>Preview all reminder emails and renewals</li>
              <li>Nothing runs until you activate automation</li>
            </ul>

            <p style={softText}>Full control. No surprises.</p>
          </section>

          {/* BEFORE / AFTER */}
          <section>
            <h2 style={h2}>Before vs After Automation</h2>

            <div style={compareGrid}>
              <div style={comparePanel}>
                <h3 style={panelTitle}>Before Automation</h3>
                <p style={panelStatus}>Manual · Reactive · Risk-Prone</p>
                <ul style={compareList}>
                  <li>Vendors ignore COI requests</li>
                  <li>Expired policies go unnoticed</li>
                  <li>Missing endorsements found too late</li>
                  <li>Renewals tracked in spreadsheets</li>
                  <li>Owner audits trigger panic</li>
                </ul>
                <p style={panelFooter}>
                  Risk stays hidden until an incident exposes it.
                </p>
              </div>

              <div
                style={{
                  ...comparePanel,
                  borderColor: "rgba(34,197,94,0.45)",
                }}
              >
                <h3 style={panelTitle}>After Automation</h3>
                <p style={panelStatus}>Automated · Continuous · Owner-Safe</p>
                <ul style={compareList}>
                  <li>Automatic vendor reminders</li>
                  <li>Continuous COI monitoring</li>
                  <li>Endorsements validated instantly</li>
                  <li>Renewals escalated before expiry</li>
                  <li>Owners protected proactively</li>
                </ul>
                <p style={panelFooter}>
                  You see risk first. Automation enforces quietly.
                </p>
              </div>
            </div>
          </section>

          {/* FIRST 48 HOURS */}
          <section>
            <h2 style={h2}>What happens in your first 48 hours</h2>

            <div style={timelineGrid}>
              <TimelineStep
                time="Hour 0–1"
                title="Connect vendors"
                text="Upload vendors or COIs. AI scans coverage instantly."
              />
              <TimelineStep
                time="Hour 1–12"
                title="Risk becomes visible"
                text="Non-compliance and owner exposure are flagged."
              />
              <TimelineStep
                time="Hour 12–24"
                title="Automation previewed"
                text="Reminders and renewals generated — nothing sent."
              />
              <TimelineStep
                time="Hour 24–48"
                title="You decide"
                text="Activate automation or walk away."
              />
            </div>
          </section>

          {/* FINAL CTA */}
          <section style={{ textAlign: "center" }}>
            <Link
              href="/signup?industry=property_management"
              style={{ ...primaryCta, fontSize: 18, padding: "16px 32px" }}
            >
              Start 14-Day Free Trial
            </Link>
            <div style={ctaSubtext}>
              See risk first. Activate automation when ready.
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
    <div style={{ ...metricCard, borderColor: `${color}55` }}>
      <div style={metricLabel}>{label}</div>
      <div style={{ ...metricValue, color }}>{value}</div>
      <div style={metricNote}>{note}</div>
    </div>
  );
}

function TimelineStep({ time, title, text }) {
  return (
    <div style={timelineCard}>
      <div style={timelineTime}>{time}</div>
      <div style={timelineTitle}>{title}</div>
      <div style={timelineText}>{text}</div>
    </div>
  );
}
/* ============================================================
   STYLES
============================================================ */

const heroCard = {
  padding: "60px 36px",
  borderRadius: 28,
  border: "1px solid rgba(148,163,184,0.35)",
  background:
    "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(2,6,23,1))",
};

const eyebrow = {
  fontSize: 12,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#60a5fa",
  marginBottom: 12,
};

const heroTitle = {
  fontSize: 44,
  fontWeight: 700,
  lineHeight: 1.1,
  background: "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const heroSub = {
  fontSize: 18,
  color: "#cbd5f5",
};

const heroGrid = {
  display: "grid",
  gridTemplateColumns: "2fr 3fr",
  gap: 28,
};

const propertyCard = {
  padding: 28,
  borderRadius: 22,
  background: "rgba(15,23,42,0.92)",
};

const propertyTitle = {
  fontSize: 26,
  fontWeight: 700,
  marginBottom: 14,
};

const propertyList = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  fontSize: 15,
  color: "#cbd5f5",
  lineHeight: 1.7,
};

const propertyNote = {
  marginTop: 18,
  fontSize: 13,
  color: "#93c5fd",
};

const metricsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
  gap: 18,
};

const metricCard = {
  padding: 22,
  borderRadius: 18,
  border: "1px solid",
  background: "rgba(15,23,42,0.92)",
};

const metricLabel = {
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#9ca3af",
};

const metricValue = {
  fontSize: 36,
  fontWeight: 700,
};

const metricNote = {
  fontSize: 13,
  color: "#cbd5f5",
};

const ctaStrip = {
  marginTop: 40,
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const ctaNote = {
  fontSize: 14,
  color: "#9ca3af",
};

const h2 = {
  fontSize: 30,
  fontWeight: 600,
  marginBottom: 16,
};

const bullets = {
  fontSize: 18,
  color: "#cbd5f5",
  lineHeight: 1.6,
  paddingLeft: 20,
};

const softText = {
  fontSize: 15,
  color: "#9ca3af",
};

const compareGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
};

const comparePanel = {
  padding: 24,
  borderRadius: 20,
  border: "1px solid rgba(148,163,184,0.35)",
};

const panelTitle = {
  fontSize: 20,
  fontWeight: 600,
};

const panelStatus = {
  fontSize: 13,
  color: "#93c5fd",
};

const compareList = {
  fontSize: 15,
  color: "#cbd5f5",
  paddingLeft: 18,
};

const panelFooter = {
  fontSize: 13,
  color: "#9ca3af",
};

const timelineGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))",
  gap: 24,
};

const timelineCard = {
  padding: 22,
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.35)",
};

const timelineTime = {
  fontSize: 12,
  color: "#60a5fa",
};

const timelineTitle = {
  fontSize: 18,
  fontWeight: 600,
};

const timelineText = {
  fontSize: 15,
  color: "#cbd5f5",
};

const primaryCta = {
  padding: "14px 28px",
  borderRadius: 999,
  background: "linear-gradient(90deg,#38bdf8,#1d4ed8)",
  color: "#e5f2ff",
  fontWeight: 600,
  textDecoration: "none",
};

const ctaSubtext = {
  marginTop: 12,
  fontSize: 13,
  color: "#9ca3af",
};

const smallLabel = {
  fontSize: 13,
  color: "#9ca3af",
};
