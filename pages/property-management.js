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
        {/* =====================================================
            THE PROBLEM — MARKET TRUTH
        ===================================================== */}
        <section
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "120px 24px 96px",
          }}
        >
          <div style={{ maxWidth: 820 }}>
            <h2
              style={{
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginBottom: 24,
              }}
            >
              Vendor insurance risk doesn’t fail loudly.
            </h2>

            <p
              style={{
                fontSize: 20,
                lineHeight: 1.65,
                color: "#334155",
                marginBottom: 32,
                maxWidth: 720,
              }}
            >
              It fails quietly — accumulating in the background until an audit,
              a claim, or an owner question exposes it all at once.
            </p>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.65,
                color: "#475569",
                maxWidth: 720,
                marginBottom: 32,
              }}
            >
              COIs expire without notice. Vendors delay renewals. Endorsements
              get missed. Spreadsheets drift out of date.
            </p>

            <ul
              style={{
                fontSize: 18,
                lineHeight: 1.8,
                color: "#475569",
                paddingLeft: 22,
              }}
            >
              <li>Coverage gaps go unnoticed</li>
              <li>Non-compliance compounds silently</li>
              <li>Risk only becomes visible when it’s already a problem</li>
            </ul>

            <p
              style={{
                marginTop: 28,
                fontSize: 17,
                color: "#64748b",
                maxWidth: 700,
              }}
            >
              Most property managers don’t discover insurance issues because
              they weren’t diligent — they discover them because the systems
              they rely on never showed the full truth.
            </p>
          </div>
        </section>

        {/* =====================================================
            DIFFERENTIATION — CATEGORY KILL SHOT
        ===================================================== */}
        <section
          style={{
            background:
              "linear-gradient(180deg,#f8fafc 0%, #eef2ff 100%)",
            borderTop: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "120px 24px",
            }}
          >
            <div style={{ maxWidth: 880 }}>
              <h2
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  marginBottom: 28,
                }}
              >
                Most platforms automate first.
                <br />
                We show you the truth first.
              </h2>

              <p
                style={{
                  fontSize: 20,
                  lineHeight: 1.65,
                  color: "#334155",
                  maxWidth: 760,
                  marginBottom: 40,
                }}
              >
                Instead of immediately sending emails, chasing vendors, or
                enforcing rules blindly, this platform gives you something
                no other system leads with:
                <strong> real visibility.</strong>
              </p>

              <ul
                style={{
                  fontSize: 18,
                  lineHeight: 1.9,
                  color: "#475569",
                  paddingLeft: 22,
                  maxWidth: 760,
                }}
              >
                <li>See actual insurance exposure instantly</li>
                <li>Understand exactly which vendors are non-compliant — and why</li>
                <li>Identify expiring coverage before it becomes urgent</li>
                <li>Preview every action before anything runs</li>
              </ul>

              <p
                style={{
                  marginTop: 36,
                  fontSize: 18,
                  color: "#475569",
                  maxWidth: 720,
                }}
              >
                You stay in control.
                <br />
                Automation only starts when <strong>you</strong> decide.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            AUTONOMOUS SETUP — NO SALES / NO ONBOARDING
        ===================================================== */}
        <section
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "120px 24px",
          }}
        >
          <div style={{ maxWidth: 860 }}>
            <h3
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginBottom: 20,
              }}
            >
              Built for autonomous setup — not sales cycles
            </h3>

            <p
              style={{
                fontSize: 20,
                lineHeight: 1.65,
                color: "#334155",
                maxWidth: 760,
                marginBottom: 28,
              }}
            >
              This platform doesn’t require demos, onboarding calls, or
              implementation projects.
            </p>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.65,
                color: "#475569",
                maxWidth: 760,
                marginBottom: 28,
              }}
            >
              You connect your vendors, see real risk, and decide what happens
              next — all on your own timeline.
            </p>

            <p
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#4f46e5",
              }}
            >
              Most teams are operational in minutes — not weeks.
            </p>
          </div>
        </section>
