// pages/property-management.js
// ============================================================
// CATEGORY LEADER HOMEPAGE — PROPERTY MANAGEMENT (BLOCK 1)
// Focus: Hero + Authority + Visual System
// ============================================================

import Head from "next/head";
import Link from "next/link";

export default function PropertyManagementLanding() {
  return (
    <>
      <Head>
        <title>Real-Time Vendor Risk Intelligence for Property Portfolios</title>
        <meta
          name="description"
          content="Instantly see vendor insurance exposure, non-compliance, and owner risk across your property portfolio — before audits, claims, or automation."
        />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg,#ffffff 0%, #f8fafc 40%, #eef2ff 100%)",
          color: "#0f172a",
        }}
      >
        {/* =====================================================
            HERO — CATEGORY OWNERSHIP
        ===================================================== */}
        <section
          style={{
            padding: "120px 24px 96px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              maxWidth: 860,
              marginBottom: 48,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#4f46e5",
                marginBottom: 16,
              }}
            >
              Vendor Risk Intelligence Platform
            </div>

            <h1
              style={{
                fontSize: 56,
                lineHeight: 1.05,
                fontWeight: 800,
                marginBottom: 24,
                letterSpacing: "-0.02em",
              }}
            >
              Real-Time Vendor Risk Intelligence
              <br />
              for Property Portfolios
            </h1>

            <p
              style={{
                fontSize: 20,
                lineHeight: 1.6,
                color: "#334155",
                maxWidth: 720,
                marginBottom: 40,
              }}
            >
              Instantly see insurance exposure, non-compliance, and owner risk —
              before audits, claims, or automation.
            </p>

            <div
              style={{
                display: "flex",
                gap: 18,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/signup?industry=property_management"
                style={{
                  padding: "16px 34px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(135deg,#4f46e5,#6366f1)",
                  color: "#ffffff",
                  fontSize: 17,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow:
                    "0 20px 40px rgba(79,70,229,0.25)",
                }}
              >
                View My Portfolio Risk
              </Link>

              <Link
                href="#how-it-works"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#4f46e5",
                  textDecoration: "none",
                }}
              >
                See how it works →
              </Link>
            </div>
          </div>
        </section>

        {/* =====================================================
            AUTHORITY / SOCIAL PROOF
        ===================================================== */}
        <section
          style={{
            borderTop: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#64748b",
                marginBottom: 28,
              }}
            >
              Trusted by property teams responsible for thousands of units
            </p>

            {/* LOGO PLACEHOLDERS */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 48,
                flexWrap: "wrap",
                opacity: 0.55,
              }}
            >
              <div style={logoStub}>Property Group</div>
              <div style={logoStub}>Asset Management</div>
              <div style={logoStub}>Multifamily Ops</div>
              <div style={logoStub}>Portfolio Services</div>
            </div>

            <p
              style={{
                marginTop: 32,
                fontSize: 14,
                color: "#64748b",
              }}
            >
              Built for operators who can’t afford blind spots.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

/* ============================================================
   VISUAL PRIMITIVES (BLOCK 1)
============================================================ */

const logoStub = {
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: "12px 18px",
  borderRadius: 8,
  background: "#f1f5f9",
  color: "#334155",
};
