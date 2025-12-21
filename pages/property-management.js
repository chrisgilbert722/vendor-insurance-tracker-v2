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
            maxWidth: 920,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 80,
          }}
        >
          {/* =====================================================
              HERO
          ===================================================== */}
          <section>
            <h1
              style={{
                fontSize: 48,
                lineHeight: 1.1,
                fontWeight: 700,
                marginBottom: 18,
                background:
                  "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Vendor Insurance Compliance for Property Managers
            </h1>

            <p
              style={{
                fontSize: 20,
                color: "#cbd5f5",
                maxWidth: 680,
                marginBottom: 28,
              }}
            >
              See vendor risk across your properties in minutes. Automate
              reminders, renewals, and enforcement — without chasing vendors or
              spreadsheets.
            </p>

            <Link
              href="/signup?industry=property_management"
              style={primaryCta}
            >
              Start 14-Day Free Trial
            </Link>

            <div style={ctaSubtext}>
              No sales calls · No setup headaches · Cancel anytime
            </div>
          </section>

          {/* =====================================================
              PAIN
          ===================================================== */}
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

          {/* =====================================================
              SYSTEM
          ===================================================== */}
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

          {/* =====================================================
              TRUST
          ===================================================== */}
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

          {/* =====================================================
              BEFORE vs AFTER AUTOMATION (NEW)
          ===================================================== */}
          <section>
            <h2 style={h2}>Before vs After Automation</h2>

            <p style={{ ...softText, maxWidth: 640, marginBottom: 36 }}>
              The difference between reacting to compliance issues — and never
              letting them happen.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              {/* BEFORE */}
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
                  Risk stays hidden until an audit, claim, or incident exposes
                  it.
                </p>
              </div>

              {/* AFTER */}
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
                  <li>Endorsements validated on upload</li>
                  <li>Renewals escalate before expiration</li>
                  <li>Owners protected proactively</li>
                </ul>

                <p style={panelFooter}>
                  You see the risk first. Automation enforces compliance quietly.
                </p>
              </div>
            </div>
          </section>

          {/* =====================================================
              HOW IT WORKS
          ===================================================== */}
          <section>
            <h2 style={h2}>How it works</h2>

            <div style={stepsGrid}>
              <Step
                title="Connect your vendors"
                text="Upload a vendor list or COIs. AI analyzes coverage and requirements."
              />
              <Step
                title="Review risk & exposure"
                text="See non-compliance, expiring COIs, and owner exposure instantly."
              />
              <Step
                title="Activate automation"
                text="Vendor reminders, renewals, and enforcement run automatically."
              />
            </div>
          </section>

          {/* =====================================================
              FINAL CTA
          ===================================================== */}
          <section style={{ textAlign: "center" }}>
            <Link
              href="/signup?industry=property_management"
              style={{ ...primaryCta, fontSize: 18, padding: "16px 32px" }}
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
   STYLES
============================================================ */

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
  marginBottom: 16,
};

const softText = {
  fontSize: 15,
  color: "#9ca3af",
};

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

const ctaSubtext = {
  marginTop: 12,
  fontSize: 13,
  color: "#9ca3af",
};

const comparePanel = {
  padding: 24,
  borderRadius: 20,
  border: "1px solid rgba(148,163,184,0.35)",
  background:
    "radial-gradient(circle at top left, rgba(15,23,42,0.92), rgba(2,6,23,0.96))",
  boxShadow: "0 0 28px rgba(0,0,0,0.6)",
};

const panelTitle = {
  fontSize: 20,
  fontWeight: 600,
  marginBottom: 6,
};

const panelStatus = {
  fontSize: 13,
  color: "#9ca3af",
  marginBottom: 16,
};

const compareList = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#cbd5f5",
  paddingLeft: 18,
  marginBottom: 16,
};

const panelFooter = {
  fontSize: 14,
  color: "#9ca3af",
};

const stepsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 24,
};

/* ============================================================
   STEP COMPONENT
============================================================ */

function Step({ title, text }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        border: "1px solid rgba(148,163,184,0.35)",
        background:
          "radial-gradient(circle at top left, rgba(15,23,42,0.9), rgba(2,6,23,0.95))",
        boxShadow: "0 0 24px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 15, color: "#cbd5f5" }}>{text}</div>
    </div>
  );
}
