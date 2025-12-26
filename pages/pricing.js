// pages/pricing.js
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function PricingPage() {
  const router = useRouter();

  // Default annual for PM traffic only
  const isPM = router.query?.industry === "property_management";
  const [annual, setAnnual] = useState(true);

  useEffect(() => {
    if (isPM) setAnnual(true);
  }, [isPM]);

  const monthlyPrice = 399;
  const annualPrice = 4999;
  const savings = (12 * monthlyPrice) - annualPrice;

  function startSignup() {
    router.push(`/auth/signup${isPM ? "?industry=property_management" : ""}`);
  }

  return (
    <>
      <Head>
        <title>
          Vendor Insurance Compliance Pricing | COI Tracking Software — verivo
        </title>
        <meta
          name="description"
          content="Transparent pricing for verivo’s vendor insurance compliance and COI tracking software. Built for property managers, risk teams, and owner-safe operations. Start your 14-day free trial."
        />
        <meta name="robots" content="index,follow" />

        <meta
          property="og:title"
          content="Vendor Insurance Compliance Pricing — verivo"
        />
        <meta
          property="og:description"
          content="See verivo pricing for vendor insurance compliance and COI tracking. No demos. No contracts. Annual plans available for property managers."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content="https://vendor-insurance-tracker-v2.vercel.app/pricing"
        />
        <meta
          property="og:image"
          content="https://vendor-insurance-tracker-v2.vercel.app/og-image.png"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "verivo",
              applicationCategory: "RiskManagementApplication",
              offers: {
                "@type": "Offer",
                price: "4999",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
              },
            }),
          }}
        />
      </Head>

      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.15), transparent 35%), linear-gradient(180deg,#020617,#000)",
          color: "#e5e7eb",
          padding: "70px 20px",
        }}
      >
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 46 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#9ca3af",
              marginBottom: 10,
            }}
          >
            Pricing
          </div>
          <h1
            style={{
              fontSize: 52,
              marginBottom: 16,
              fontWeight: 700,
              background: "linear-gradient(90deg,#38bdf8,#a5b4fc,#ffffff)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Enterprise outcomes, modern delivery.
          </h1>
          <p
            style={{
              fontSize: 18,
              maxWidth: 760,
              margin: "0 auto",
              color: "#cbd5f5",
            }}
          >
            Competing platforms charge $10k–$15k per year. We deliver the same
            owner-safe compliance outcomes without contracts, demos, or friction.
          </p>
        </div>

        {/* TOGGLE */}
        <div
          style={{ display: "flex", justifyContent: "center", marginBottom: 34 }}
        >
          <div
            style={{
              display: "flex",
              padding: 4,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.75)",
            }}
          >
            <button
              onClick={() => setAnnual(false)}
              style={{
                borderRadius: 999,
                padding: "8px 18px",
                fontSize: 14,
                background: !annual
                  ? "linear-gradient(90deg,#3b82f6,#1d4ed8)"
                  : "transparent",
                color: !annual ? "#fff" : "#9ca3af",
                border: "none",
                cursor: "pointer",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                borderRadius: 999,
                padding: "8px 18px",
                fontSize: 14,
                background: annual
                  ? "linear-gradient(90deg,#3b82f6,#1d4ed8)"
                  : "transparent",
                color: annual ? "#fff" : "#9ca3af",
                border: "none",
                cursor: "pointer",
              }}
            >
              Annual · Recommended
            </button>
          </div>
        </div>

        {/* PRICING GRID */}
        <div
          style={{
            display: "grid",
            gap: 28,
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            maxWidth: 1120,
            margin: "0 auto",
          }}
        >
          {/* PROFESSIONAL */}
          <div
            style={{
              ...card,
              borderColor: annual
                ? "rgba(56,189,248,0.75)"
                : "rgba(148,163,184,0.35)",
              boxShadow: annual
                ? "0 0 0 1px rgba(56,189,248,0.35), 0 28px 70px rgba(15,23,42,0.9)"
                : card.boxShadow,
            }}
          >
            {annual && (
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#38bdf8",
                  marginBottom: 10,
                  fontWeight: 700,
                }}
              >
                Recommended for PM teams
              </div>
            )}

            <h2 style={title}>Professional</h2>
            <p style={subtitle}>
              Owner-safe compliance visibility and control for active portfolios.
            </p>

            <div style={price}>
              {annual ? `$${annualPrice}/yr` : `$${monthlyPrice}/mo`}
            </div>

            {annual && (
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
                Save ${savings} vs monthly · Simplify annual budgeting
              </div>
            )}

            <ul style={list}>
              <li>Portfolio risk & exposure visibility</li>
              <li>COI & endorsement validation</li>
              <li>Preview-first enforcement</li>
              <li>Vendor upload links (no logins)</li>
              <li>Audit-ready exports</li>
              <li>Email support</li>
            </ul>

            <button style={primary} onClick={startSignup}>
              Start Free Trial →
            </button>
          </div>

          {/* PORTFOLIO+ */}
          <div style={{ ...card, borderColor: "rgba(168,85,247,0.6)" }}>
            <h2 style={title}>Portfolio+</h2>
            <p style={subtitle}>
              Designed for complex, multi-property portfolios and ownership
              groups.
            </p>

            <div style={price}>$899+/mo</div>

            <ul style={list}>
              <li>Everything in Professional</li>
              <li>Advanced owner reporting</li>
              <li>Higher vendor & property limits</li>
              <li>Priority support</li>
              <li>Early access to compliance intelligence</li>
            </ul>

            <button style={secondary} onClick={startSignup}>
              Start Free Trial →
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 64,
            textAlign: "center",
            fontSize: 14,
            color: "#9ca3af",
          }}
        >
          No demos · No contracts · Cancel anytime
        </div>
      </div>
    </>
  );
}

const card = {
  borderRadius: 26,
  padding: 32,
  background:
    "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(2,6,23,0.92))",
  border: "1px solid rgba(148,163,184,0.35)",
  boxShadow: "0 24px 60px rgba(15,23,42,0.85)",
};

const title = { fontSize: 22, marginBottom: 6 };
const subtitle = { color: "#9ca3af", fontSize: 14, marginBottom: 18 };
const price = { fontSize: 42, fontWeight: 700, marginBottom: 10 };
const list = {
  listStyle: "none",
  padding: 0,
  marginBottom: 28,
  color: "#cbd5f5",
  lineHeight: 1.7,
};

const primary = {
  width: "100%",
  padding: "14px",
  borderRadius: 999,
  background: "linear-gradient(90deg,#3b82f6,#1d4ed8)",
  border: "none",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondary = {
  ...primary,
  background: "linear-gradient(90deg,#a855f7,#6d28d9)",
};
