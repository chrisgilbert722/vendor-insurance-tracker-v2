// pages/index.js
import Head from "next/head";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  function goToSignup() {
    router.push("/auth/signup");
  }

  function goToPricing() {
    router.push("/pricing");
  }

  const title = "AI-Powered COI Tracking & Vendor Compliance | Vendor Insurance Tracker";
  const description =
    "Automate certificates of insurance, vendor uploads, and compliance alerts with an AI-powered COI tracking cockpit. No vendor logins. 14-day free trial.";

  const siteUrl = "https://vendor-insurance-tracker-v2.vercel.app"; // update to your custom domain when ready

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vendor Insurance Tracker",
    url: siteUrl,
    description:
      "AI-powered certificate of insurance tracking and vendor compliance automation.",
    logo: `${siteUrl}/logo.png`,
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content="COI tracking, certificate of insurance, vendor compliance, insurance automation, AI COI, risk management software"
        />
        <meta name="robots" content="index,follow" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:image" content={`${siteUrl}/og-image.png`} />
        <link rel="canonical" href={siteUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </Head>

      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.2), transparent 45%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.18), transparent 40%), linear-gradient(180deg,#020617,#000)",
          color: "#e5e7eb",
          position: "relative",
          padding: "40px 20px 80px",
          overflowX: "hidden",
        }}
      >
        {/* Ambient aura */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 60% 20%, rgba(255,255,255,0.05), transparent 60%), radial-gradient(circle at 10% 80%, rgba(56,189,248,0.06), transparent 70%), radial-gradient(circle at 90% 60%, rgba(168,85,247,0.05), transparent 70%)",
            mixBlendMode: "screen",
            zIndex: 0,
          }}
        />

        {/* NAV (simple) */}
        <header
          style={{
            maxWidth: 1180,
            margin: "0 auto 40px auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "999px",
                background:
                  "radial-gradient(circle at 30% 0,#38bdf8,#6366f1,#0f172a)",
                boxShadow: "0 0 30px rgba(56,189,248,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 18 }}>⚡</span>
            </div>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: 0.4,
              }}
            >
              Vendor Insurance Tracker
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={goToPricing}
              style={{
                fontSize: 14,
                border: "none",
                background: "transparent",
                color: "#cbd5f5",
                cursor: "pointer",
              }}
            >
              Pricing
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              style={{
                fontSize: 14,
                borderRadius: 999,
                padding: "7px 14px",
                border: "1px solid rgba(148,163,184,0.7)",
                background: "rgba(15,23,42,0.85)",
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              Login
            </button>
            <button
              onClick={goToSignup}
              style={{
                fontSize: 14,
                borderRadius: 999,
                padding: "8px 16px",
                border: "1px solid rgba(59,130,246,0.9)",
                background:
                  "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                color: "#e0f2fe",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Start Free Trial
            </button>
          </div>
        </header>

        {/* HERO SECTION */}
        <main style={{ position: "relative", zIndex: 2 }}>
          <section
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.2fr)",
              gap: 30,
              alignItems: "center",
            }}
          >
            {/* Left side: Text */}
            <div>
              <div
                style={{
                  display: "inline-flex",
                  gap: 8,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.4)",
                  background:
                    "linear-gradient(120deg,rgba(15,23,42,0.95),rgba(15,23,42,0))",
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                  }}
                >
                  AI COI Tracking
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "#38bdf8",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}
                >
                  Vendor Compliance Automation
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 44,
                  lineHeight: 1.1,
                  marginBottom: 16,
                  fontWeight: 700,
                }}
              >
                Turn messy COIs into{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(90deg,#38bdf8,#a5b4fc,#ffffff)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  clean, automated compliance.
                </span>
              </h1>

              <p
                style={{
                  fontSize: 16,
                  color: "#cbd5f5",
                  maxWidth: 580,
                  marginBottom: 22,
                }}
              >
                Upload vendor certificates, let AI do the reading, and get
                instant alerts when coverage is missing, expired, or non-compliant.
                No vendor logins. No spreadsheets. No manual review.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                <button
                  onClick={goToSignup}
                  style={{
                    borderRadius: 999,
                    padding: "10px 18px",
                    border: "1px solid rgba(59,130,246,0.9)",
                    background:
                      "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                    color: "#e0f2fe",
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Start 14-Day Free Trial →
                </button>
                <button
                  onClick={goToPricing}
                  style={{
                    borderRadius: 999,
                    padding: "10px 16px",
                    border: "1px solid rgba(148,163,184,0.7)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#cbd5f5",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  View pricing
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                <span>✅ No long-term contracts</span> ·{" "}
                <span>✅ Cancel anytime</span> ·{" "}
                <span>✅ Built for COI-heavy industries</span>
              </div>
            </div>

            {/* Right side: Hero "cockpit" preview card */}
            <div
              style={{
                borderRadius: 24,
                padding: 18,
                background:
                  "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
                border: "1px solid rgba(148,163,184,0.5)",
                boxShadow:
                  "0 24px 60px rgba(15,23,42,0.98), 0 0 40px rgba(56,189,248,0.22)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                }}
              >
                Live Compliance Snapshot
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.2fr",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                {/* Gauge */}
                <div
                  style={{
                    position: "relative",
                    width: "160px",
                    height: "160px",
                    borderRadius: "999px",
                    background:
                      "conic-gradient(from 220deg,#22c55e,#facc15,#fb7185,#0f172a 70%)",
                    padding: 10,
                    boxShadow:
                      "0 0 40px rgba(34,197,94,0.4),0 0 40px rgba(248,113,113,0.25)",
                    margin: "0 auto",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 16,
                      borderRadius: "999px",
                      background:
                        "radial-gradient(circle at 30% 0,#0f172a,#020617 70%,#000)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        color: "#9ca3af",
                        letterSpacing: "0.16em",
                        marginBottom: 6,
                      }}
                    >
                      Compliance
                    </div>
                    <div
                      style={{
                        fontSize: 30,
                        fontWeight: 600,
                        background:
                          "linear-gradient(120deg,#22c55e,#a3e635)",
                        WebkitBackgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      92
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      Overall score
                    </div>
                  </div>
                </div>

                {/* Stats right */}
                <div>
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <SmallStat
                      label="Compliant vendors"
                      value="82"
                      color="#22c55e"
                    />
                    <SmallStat
                      label="Expiring in 30 days"
                      value="9"
                      color="#facc15"
                    />
                    <SmallStat
                      label="Non-compliant"
                      value="3"
                      color="#fb7185"
                    />
                  </div>
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>
                    All of this updates automatically as vendors upload COIs.
                    No spreadsheets, no chasing emails, no manual data entry.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FEATURE GRID */}
          <section
            style={{
              maxWidth: 1180,
              margin: "60px auto 30px auto",
            }}
          >
            <h2
              style={{
                fontSize: 26,
                marginBottom: 14,
              }}
            >
              Built for teams drowning in certificates of insurance.
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#9ca3af",
                maxWidth: 720,
                marginBottom: 28,
              }}
            >
              Vendor Insurance Tracker automates the ugly parts of COI
              management so your risk, operations, and property teams can focus
              on approvals — not paperwork.
            </p>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              }}
            >
              <FeatureCard
                title="AI COI Extraction"
                body="Upload any COI PDF and let AI extract carrier, limits, dates, endorsements, additional insured, and more — in seconds."
              />
              <FeatureCard
                title="Automated Alerts"
                body="Expiration tracking, missing endorsements, low limits, and high-risk vendors are surfaced automatically with severity tags."
              />
              <FeatureCard
                title="Vendor Upload Links"
                body="Send magic links to vendors so they can upload COIs without ever logging into a portal. Zero login friction."
              />
              <FeatureCard
                title="Rule Engine V2"
                body="Define coverage requirements by project, location, or vendor type — and let the engine flag what’s non-compliant."
              />
              <FeatureCard
                title="Audit Trail & Exports"
                body="Generate a complete audit pack of vendor status, uploads, and alerts in just a few clicks for insurers and auditors."
              />
              <FeatureCard
                title="Multi-Org Cockpit"
                body="Manage multiple entities, properties, or projects from a single sci-fi-grade cockpit view."
              />
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section
            style={{
              maxWidth: 1180,
              margin: "60px auto 40px auto",
              display: "grid",
              gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1.4fr)",
              gap: 24,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 24,
                  marginBottom: 10,
                }}
              >
                How it works
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  marginBottom: 18,
                  maxWidth: 520,
                }}
              >
                We built the onboarding flow to be as fast as your risk
                exposure demands. You can go from zero to automated COI
                tracking in under an hour.
              </p>

              <ol
                style={{
                  paddingLeft: 20,
                  margin: 0,
                  fontSize: 14,
                  color: "#cbd5f5",
                  lineHeight: 1.6,
                }}
              >
                <li>
                  Start your trial & connect your org — add your company and
                  locations.
                </li>
                <li>
                  Upload vendor list or invite vendors — they receive secure
                  upload links.
                </li>
                <li>
                  AI reads COIs, flags compliance issues, and alerts your team
                  automatically.
                </li>
              </ol>
            </div>

            {/* Mini pricing teaser */}
            <div
              style={{
                borderRadius: 22,
                padding: 20,
                background:
                  "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
                border: "1px solid rgba(148,163,184,0.4)",
                boxShadow:
                  "0 18px 40px rgba(15,23,42,0.8), 0 0 30px rgba(56,189,248,0.22)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                Simple pricing
              </div>

              <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
                Pro Plan — $399/mo
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  marginBottom: 14,
                }}
              >
                Unlimited vendors. Unlimited COIs. Full AI automation.
              </p>

              <button
                onClick={goToPricing}
                style={{
                  borderRadius: 999,
                  padding: "9px 14px",
                  border: "1px solid rgba(59,130,246,0.9)",
                  background:
                    "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                  color: "#e0f2fe",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  marginBottom: 10,
                }}
              >
                View full pricing →
              </button>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                14-day free trial · Card required · Cancel anytime
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer
            style={{
              maxWidth: 1180,
              margin: "40px auto 0 auto",
              borderTop: "1px solid rgba(30,64,175,0.5)",
              paddingTop: 18,
              fontSize: 12,
              color: "#6b7280",
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div>© {new Date().getFullYear()} Vendor Insurance Tracker</div>
            <div style={{ display: "flex", gap: 16 }}>
              <button
                onClick={() => router.push("/terms")}
                style={linkBtn}
              >
                Terms
              </button>
              <button
                onClick={() => router.push("/privacy")}
                style={linkBtn}
              >
                Privacy
              </button>
              <button
                onClick={() => router.push("/pricing")}
                style={linkBtn}
              >
                Pricing
              </button>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}

function SmallStat({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "8px 10px",
        border: `1px solid ${color}55`,
        background: "rgba(15,23,42,0.95)",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
      }}
    >
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

function FeatureCard({ title, body }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        border: "1px solid rgba(51,65,85,0.9)",
        background: "rgba(15,23,42,0.95)",
        boxShadow: "0 12px 35px rgba(15,23,42,0.85)",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{body}</p>
    </div>
  );
}

const linkBtn = {
  border: "none",
  background: "transparent",
  color: "#9ca3af",
  cursor: "pointer",
  fontSize: 12,
};
 
