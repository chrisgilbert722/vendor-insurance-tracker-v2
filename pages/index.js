// pages/index.js
import Head from "next/head";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  const title = "verivo — AI-Powered COI Tracking & Vendor Compliance";
  const description =
    "Automate certificates of insurance, vendor uploads, and compliance alerts with an AI-powered COI tracking cockpit. No vendor logins. 14-day free trial.";

  const siteUrl = "https://vendor-insurance-tracker-v2.vercel.app"; // update later

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "verivo",
    url: siteUrl,
    description:
      "AI-powered certificate of insurance tracking and vendor compliance automation.",
    logo: `${siteUrl}/brand/verivo-dark.png`,
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

        {/* MARKETING HEADER (FIXED CTA) */}
        <header
          style={{
            maxWidth: 1180,
            margin: "0 auto 40px auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <img
            src="/brand/verivo-light.png"
            alt="verivo"
            style={{ height: 36 }}
          />

          <div style={{ display: "flex", gap: 14 }}>
            <button
              onClick={() => router.push("/pricing")}
              style={linkBtn}
            >
              Pricing
            </button>

            {/* 🔥 FIXED: Login → Start Free Trial */}
            <button
              onClick={() => router.push("/auth/signup")}
              style={primaryCta}
            >
              Start Free Trial →
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

              {/* Hero CTAs (UNCHANGED) */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                <button
                  onClick={() => router.push("/auth/signup")}
                  style={primaryCta}
                >
                  Start Free Trial →
                </button>
                <button
                  onClick={() => router.push("/property-management")}
                  style={secondaryCta}
                >
                  See How It Works →
                </button>
              </div>

              <p style={{ fontSize: 13, color: "#9ca3af" }}>
                Built specifically for{" "}
                <a
                  href="/property-management"
                  style={{ color: "#38bdf8", textDecoration: "none" }}
                >
                  property management vendor compliance
                </a>
                .
              </p>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

const primaryCta = {
  borderRadius: 999,
  padding: "10px 18px",
  border: "1px solid rgba(59,130,246,0.9)",
  background:
    "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
  color: "#e0f2fe",
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
};

const secondaryCta = {
  borderRadius: 999,
  padding: "10px 18px",
  border: "1px solid rgba(148,163,184,0.7)",
  background: "rgba(15,23,42,0.9)",
  color: "#cbd5f5",
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
};

const linkBtn = {
  border: "none",
  background: "transparent",
  color: "#9ca3af",
  cursor: "pointer",
  fontSize: 12,
};

