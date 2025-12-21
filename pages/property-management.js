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
        {/* =====================================================
            PRODUCT PROOF — EXECUTIVE RISK OVERVIEW
        ===================================================== */}
        <section
          style={{
            background: "#ffffff",
            padding: "120px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            <div style={{ maxWidth: 900, marginBottom: 64 }}>
              <h2
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  marginBottom: 24,
                }}
              >
                See your entire portfolio the way owners expect you to.
              </h2>

              <p
                style={{
                  fontSize: 20,
                  lineHeight: 1.65,
                  color: "#334155",
                  maxWidth: 760,
                }}
              >
                In one view, you can understand where real insurance risk exists
                today — not where you hope it doesn’t.
              </p>
            </div>

            {/* Executive Metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 28,
              }}
            >
              <MetricCard
                label="Non-Compliant Vendors"
                value="12"
                note="Coverage gaps detected"
              />
              <MetricCard
                label="Policies Expiring Soon"
                value="7"
                note="Renewals approaching"
              />
              <MetricCard
                label="Missing Endorsements"
                value="4"
                note="Additional insured / waivers"
              />
              <MetricCard
                label="Owner Exposure Level"
                value="High"
                note="Audit & claim risk"
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            BEFORE vs AFTER — OPERATING POSTURE
        ===================================================== */}
        <section
          style={{
            background:
              "linear-gradient(180deg,#f8fafc 0%, #eef2ff 100%)",
            padding: "120px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            <h2
              style={{
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginBottom: 56,
              }}
            >
              Before vs After visibility and controlled automation
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 40,
              }}
            >
              {/* BEFORE */}
              <div
                style={{
                  padding: 40,
                  borderRadius: 20,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                }}
              >
                <h3
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  Before
                </h3>

                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#ef4444",
                    marginBottom: 24,
                  }}
                >
                  Manual · Reactive · Risk-Prone
                </p>

                <ul
                  style={{
                    fontSize: 17,
                    lineHeight: 1.8,
                    color: "#475569",
                    paddingLeft: 22,
                  }}
                >
                  <li>COIs tracked manually</li>
                  <li>Expired coverage discovered too late</li>
                  <li>Missing endorsements overlooked</li>
                  <li>Spreadsheets drift out of date</li>
                  <li>Audits trigger last-minute panic</li>
                </ul>
              </div>

              {/* AFTER */}
              <div
                style={{
                  padding: 40,
                  borderRadius: 20,
                  background: "#ffffff",
                  border: "2px solid #4f46e5",
                }}
              >
                <h3
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  After
                </h3>

                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#22c55e",
                    marginBottom: 24,
                  }}
                >
                  Continuous · Calm · Owner-Safe
                </p>

                <ul
                  style={{
                    fontSize: 17,
                    lineHeight: 1.8,
                    color: "#475569",
                    paddingLeft: 22,
                  }}
                >
                  <li>Continuous vendor monitoring</li>
                  <li>Expiring coverage flagged early</li>
                  <li>Requirements validated on upload</li>
                  <li>Renewals escalated before deadlines</li>
                  <li>Owners protected proactively</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FIRST 48 HOURS — NO FRICTION
        ===================================================== */}
        <section
          style={{
            background: "#ffffff",
            padding: "120px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            <div style={{ maxWidth: 900, marginBottom: 56 }}>
              <h2
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  marginBottom: 20,
                }}
              >
                What happens in your first 48 hours
              </h2>

              <p
                style={{
                  fontSize: 20,
                  color: "#334155",
                }}
              >
                No meetings. No onboarding. No waiting.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 32,
              }}
            >
              <TimelineCard
                time="Hour 0–1"
                title="Connect vendors"
                text="Upload a vendor list or COIs. No vendor logins required."
              />
              <TimelineCard
                time="Hour 1–12"
                title="Risk becomes visible"
                text="Non-compliance, expiring policies, and owner exposure are surfaced."
              />
              <TimelineCard
                time="Hour 12–24"
                title="Automation previewed"
                text="Reminders and renewals are generated — nothing is sent."
              />
              <TimelineCard
                time="Hour 24–48"
                title="You decide"
                text="Activate automation when ready — or walk away with zero impact."
              />
            </div>
          </div>
        </section>
        {/* =====================================================
            CONTROL & GOVERNANCE — FINAL TRUST REINFORCEMENT
        ===================================================== */}
        <section
          style={{
            background:
              "linear-gradient(180deg,#f8fafc 0%, #ffffff 100%)",
            padding: "120px 24px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginBottom: 24,
              }}
            >
              Full visibility. Full control. Always.
            </h2>

            <p
              style={{
                fontSize: 20,
                lineHeight: 1.65,
                color: "#334155",
                maxWidth: 760,
                margin: "0 auto 40px",
              }}
            >
              Nothing is sent automatically. Every reminder, renewal, and
              escalation is visible before it runs.
            </p>

            <p
              style={{
                fontSize: 18,
                color: "#475569",
                marginBottom: 64,
              }}
            >
              You decide when automation starts — or if it starts at all.
            </p>

            <Link
              href="/signup?industry=property_management"
              style={{
                padding: "18px 42px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg,#4f46e5,#6366f1)",
                color: "#ffffff",
                fontSize: 18,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow:
                  "0 24px 48px rgba(79,70,229,0.35)",
              }}
            >
              View My Portfolio Risk
            </Link>

            <p
              style={{
                marginTop: 18,
                fontSize: 14,
                color: "#64748b",
              }}
            >
              See risk first. Activate automation when you’re ready.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

/* ============================================================
   HELPER COMPONENTS
============================================================ */

function MetricCard({ label, value, note }) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 20,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          color: "#64748b",
          marginBottom: 12,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 40,
          fontWeight: 800,
          color: "#0f172a",
          marginBottom: 8,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 15,
          color: "#475569",
        }}
      >
        {note}
      </div>
    </div>
  );
}

function TimelineCard({ time, title, text }) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 20,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#4f46e5",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {time}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 16,
          color: "#475569",
          lineHeight: 1.6,
        }}
      >
        {text}
      </div>
    </div>
  );
}
