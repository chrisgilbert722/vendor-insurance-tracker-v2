// pages/property-management.js
// ============================================================
// PROPERTY MANAGEMENT FUNNEL — CLONED FROM /pages/index.js
// CRANK PASS A+B: Micro-motion polish + Owner/Ops toggle (still SEO + schema compliant)
// Additions:
// C) Trust authority band
// D) Owner report preview modal
// Fixes:
// - Gauge bug (ring now reflects score + stable across mode changes)
// - Owner/Ops toggle rendering (mobile-safe, accessible, non-janky)
// ============================================================

import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

export default function PropertyManagement() {
  const router = useRouter();

  function goToSignup() {
    router.push("/auth/signup?industry=property_management");
  }

  function goToPricing() {
    router.push("/pricing");
  }

  const title =
    "Vendor Insurance Compliance for Property Managers | COI Tracking — verivo";
  const description =
    "verivo gives property managers instant COI tracking and vendor insurance compliance visibility — expiring COIs, missing endorsements, and owner exposure. Preview-first automation. 14-day free trial.";


  const siteUrl = "https://vendor-insurance-tracker-v2.vercel.app"; // TODO: switch to https://verivo.io when DNS is live

  // --- SEO + Schema (kept)
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "verivo",
    url: siteUrl,
    description:
      "AI-powered certificate of insurance tracking and vendor compliance automation.",
    logo: `${siteUrl}/brand/verivo-dark.png`,
  };

  
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "verivo",
    url: siteUrl,
  };

const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this require sales calls or onboarding?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. It’s self-serve. Connect vendors, see risk, and activate automation when you’re ready—no demos or onboarding calls required.",
        },
      },
      {
        "@type": "Question",
        name: "What does the Property Management cockpit show?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A live portfolio snapshot including non-compliant vendors, expiring COIs, missing endorsements, and owner exposure—before audits, claims, or automation.",
        },
      },
      {
        "@type": "Question",
        name: "Does automation run automatically?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Nothing is sent until you approve. You preview reminders, renewals, and escalations before anything is sent.",
        },
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "verivo",
    applicationCategory: "RiskManagementApplication",
    applicationSubCategory: "Vendor Insurance & COI Compliance for Property Managers",
    operatingSystem: "Web",
    description:
      "Vendor insurance compliance and COI tracking software for property managers to monitor expirations, endorsements, and owner exposure with preview-first automation.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/OnlineOnly",
    },
    featureList: [
      "COI tracking",
      "Vendor compliance automation",
      "Expiring COI alerts",
      "Additional insured & endorsement checks",
      "Owner exposure visibility",
      "Vendor upload links",
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Property Management",
        item: `${siteUrl}/property-management`,
      },
    ],
  };

  const offerJsonLd = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: "verivo for Property Management — 14-Day Free Trial · Annual option available ($4,999)",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: `${siteUrl}/auth/signup?industry=property_management`,
    description:
      "Start a 14-day free trial. View portfolio risk and activate automation when ready.",
  };

  // --- (B) Owner/Ops Toggle
  const [viewMode, setViewMode] = useState("ops"); // "ops" | "owner"

  // --- (D) Owner Report Preview modal
  const [ownerReportOpen, setOwnerReportOpen] = useState(false);

  const cockpit = useMemo(() => {
    if (viewMode === "owner") {
      return {
        label: "Owner Exposure",
        scoreLabel: "Overall risk",
        scoreValue: 82,
        stat1: { label: "High exposure items", value: 14, color: "#fb7185" },
        stat2: { label: "Expiring ≤ 30 days", value: 9, color: "#facc15" },
        stat3: { label: "Open compliance gaps", value: 3, color: "#fb7185" },
        note:
          "Owner view summarizes exposure and audit posture. Actions are previewed before anything is sent.",
      };
    }
    return {
      label: "Portfolio Compliance",
      scoreLabel: "Overall score",
      scoreValue: 92,
      stat1: { label: "Compliant vendors", value: 82, color: "#22c55e" },
      stat2: { label: "Expiring in 30 days", value: 9, color: "#facc15" },
      stat3: { label: "Non-compliant", value: 3, color: "#fb7185" },
      note:
        "Ops view tracks COIs, expirations, and endorsements. Visibility first, automation after approval.",
    };
  }, [viewMode]);

  // --- (A) Micro-motion: one-time count-up on load
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 120);
    return () => clearTimeout(t);
  }, []);

  // Prevent “toggle feels broken” on tiny screens: keep scroll stable when toggling
  const cockpitRef = useRef(null);
  const lastModeRef = useRef(viewMode);
  useEffect(() => {
    if (lastModeRef.current === viewMode) return;
    lastModeRef.current = viewMode;
    const el = cockpitRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const topCut = r.top < 60;
    const bottomCut = r.bottom > window.innerHeight - 60;
    if (topCut || bottomCut) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        // no-op
      }
    }
  }, [viewMode]);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content="property management vendor compliance, COI tracking for property managers, vendor insurance compliance software, certificate of insurance tracking, owner exposure, vendor risk management, verivo"
        />
        <meta name="robots" content="index,follow" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${siteUrl}/property-management`} />
        <meta property="og:image" content={`${siteUrl}/og-image.png`} />
        <meta property="og:site_name" content="verivo" />
        <meta name="theme-color" content="#0F172A" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${siteUrl}/og-image.png`} />
        <link rel="canonical" href={`${siteUrl}/property-management`} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
        />

        <style>{`
          .pm-card {
            transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
          }
          .pm-card:hover{
            transform: translateY(-3px);
            border-color: rgba(56,189,248,0.45) !important;
            box-shadow: 0 28px 70px rgba(15,23,42,0.98), 0 0 55px rgba(56,189,248,0.22) !important;
          }
          .pm-cta {
            position: relative;
            overflow: hidden;
            transition: transform 160ms ease, filter 160ms ease;
          }
          .pm-cta:hover{ transform: translateY(-2px); filter: saturate(1.05); }
          .pm-cta::after{
            content:"";
            position:absolute;
            top:-60%;
            left:-60%;
            width:60%;
            height:220%;
            background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.25), rgba(255,255,255,0));
            transform: rotate(18deg) translateX(-140%);
            animation: pmShimmer 2.8s ease-in-out infinite;
            pointer-events:none;
          }
          @keyframes pmShimmer{
            0%{ transform: rotate(18deg) translateX(-140%); }
            100%{ transform: rotate(18deg) translateX(140%); }
          }

          /* Toggle polish: prevent layout shift + improves tap targets */
          .pm-toggle {
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            justify-content:flex-end;
          }
          .pm-toggle button{
            min-width: 98px;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }

          /* Modal */
          .pm-modalOverlay{
            position:fixed;
            inset:0;
            background: rgba(2,6,23,0.72);
            backdrop-filter: blur(10px);
            z-index: 80;
            display:flex;
            align-items:center;
            justify-content:center;
            padding: 18px;
          }
          .pm-modal{
            width: min(940px, 100%);
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.28);
            background: radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(2,6,23,0.92));
            box-shadow: 0 30px 90px rgba(0,0,0,0.6), 0 0 55px rgba(56,189,248,0.18);
            overflow:hidden;
          }
          .pm-modalHeader{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap: 12px;
            padding: 14px 16px;
            border-bottom: 1px solid rgba(148,163,184,0.16);
            background: linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.72));
          }
          .pm-modalBody{
            padding: 16px;
          }

          @media (prefers-reduced-motion: reduce){
            .pm-card, .pm-cta{ transition:none !important; }
            .pm-cta::after{ animation:none !important; }
          }
        `}</style>
      </Head>

      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.2), transparent 45%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.18), transparent 40%), linear-gradient(180deg,#020617,#000)",
          color: "#e5e7eb",
          position: "relative",
          padding: "40px 20px 90px",
          overflowX: "hidden",
        }}
      >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
            onClick={() => router.push("/")}
          >
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
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.4 }}>
              verivo
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
              className="pm-cta"
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
                  Property Management
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "#38bdf8",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}
                >
                  Owner-Safe Compliance Cockpit
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
                See vendor insurance risk{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(90deg,#38bdf8,#a5b4fc,#ffffff)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  before it becomes an owner problem.
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
                Live portfolio visibility: non-compliant vendors, expiring COIs,
                missing endorsements, and owner exposure — <b>before</b> audits,
                claims, or automation. Preview everything. Nothing sends until you
                approve.
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
                  className="pm-cta"
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
                    position: "relative",
                  }}
                >
                  View My Portfolio Risk →
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
                  View pricing (annual saves vs monthly)
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                <span>💡 Most teams choose the annual plan ($4,999) to simplify budgeting</span><br/>
                <span>✅ No demos</span> · <span>✅ No sales calls</span> ·{" "}
                <span>✅ Operational in minutes</span> ·{" "}
                <span>✅ Nothing runs without approval</span>
              </div>
            </div>

            <div
              ref={cockpitRef}
              className="pm-card"
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
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                  }}
                >
                  Live{" "}
                  {viewMode === "owner" ? "Owner Exposure" : "Compliance"} Snapshot
                </div>

                <div className="pm-toggle" role="tablist" aria-label="View mode">
                  <button
                    type="button"
                    onClick={() => setViewMode("ops")}
                    role="tab"
                    aria-selected={viewMode === "ops"}
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      border:
                        viewMode === "ops"
                          ? "1px solid rgba(56,189,248,0.75)"
                          : "1px solid rgba(148,163,184,0.35)",
                      background:
                        viewMode === "ops"
                          ? "rgba(56,189,248,0.10)"
                          : "rgba(15,23,42,0.80)",
                      color: viewMode === "ops" ? "#38bdf8" : "#cbd5f5",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Ops view
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("owner")}
                    role="tab"
                    aria-selected={viewMode === "owner"}
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      border:
                        viewMode === "owner"
                          ? "1px solid rgba(251,113,133,0.85)"
                          : "1px solid rgba(148,163,184,0.35)",
                      background:
                        viewMode === "owner"
                          ? "rgba(251,113,133,0.10)"
                          : "rgba(15,23,42,0.80)",
                      color: viewMode === "owner" ? "#fb7185" : "#cbd5f5",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Owner view
                  </button>
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.2fr",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ margin: "0 auto" }}>
                  <GaugeRing
                    score={cockpit.scoreValue}
                    mode={viewMode}
                    label={cockpit.label}
                    scoreLabel={cockpit.scoreLabel}
                    animate={animate}
                  />
                </div>

                <div>
                  <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    <SmallStat
                      label={cockpit.stat1.label}
                      value={<CountUp to={cockpit.stat1.value} play={animate} />}
                      color={cockpit.stat1.color}
                    />
                    <SmallStat
                      label={cockpit.stat2.label}
                      value={<CountUp to={cockpit.stat2.value} play={animate} />}
                      color={cockpit.stat2.color}
                    />
                    <SmallStat
                      label={cockpit.stat3.label}
                      value={<CountUp to={cockpit.stat3.value} play={animate} />}
                      color={cockpit.stat3.color}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>{cockpit.note}</p>

                  {viewMode === "owner" && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setOwnerReportOpen(true)}
                        style={{
                          width: "100%",
                          borderRadius: 14,
                          padding: "10px 12px",
                          border: "1px solid rgba(251,113,133,0.40)",
                          background:
                            "linear-gradient(180deg,rgba(251,113,133,0.12),rgba(15,23,42,0.85))",
                          color: "#ffe4e6",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Preview Owner Report
                      </button>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                        Shows what owners/auditors see—summary, exposures, and proof pack.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  borderRadius: 18,
                  border: "1px solid rgba(148,163,184,0.22)",
                  background: "rgba(2,6,23,0.55)",
                  padding: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#cbd5f5",
                    marginBottom: 8,
                  }}
                >
                  Resolve Flow (Preview-First)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 8,
                  }}
                >
                  <MiniStep title="Detect" body="Gap found" active />
                  <MiniStep title="Preview" body="Drafted" />
                  <MiniStep title="Escalate" body="Queued" />
                  <MiniStep title="Resolved" body="Cleared" />
                </div>
              </div>
            </div>
          </section>

          {/* (C) Trust authority band */}
          <TrustAuthorityBand />
          <TestimonialsBand />

          <section style={{ maxWidth: 1180, margin: "60px auto 30px auto" }}>
            <h2 style={{ fontSize: 26, marginBottom: 14 }}>
              Built for property teams drowning in vendors.
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#9ca3af",
                maxWidth: 720,
                marginBottom: 28,
              }}
            >
              Stop chasing COIs. Stop last-minute audit scrambles. Stop risking owner trust.
              This cockpit shows exposure first — then enforces quietly after approval.
            </p>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              }}
            >
              <FeatureCard
                title="Portfolio Risk Command View"
                body="Instantly see non-compliance, expirations, missing endorsements, and owner exposure across properties."
              />
              <FeatureCard
                title="Preview-First Automation"
                body="Reminder emails, renewal requests, and broker escalations are generated — nothing runs until you approve."
              />
              <FeatureCard
                title="Vendor Upload Links"
                body="Send magic links so vendors upload COIs without accounts. Zero login friction."
              />
              <FeatureCard
                title="Endorsement & AI Checks"
                body="Additional insured, waivers, and requirements are validated on upload — before coverage is accepted."
              />
              <FeatureCard
                title="Audit Trail & Exports"
                body="Generate an owner/auditor-ready audit pack of vendor status, uploads, and actions in minutes."
              />
              <FeatureCard
                title="Owner-Safe Operating Posture"
                body="Visibility first. Control always. Automation enforces quietly only after you decide."
              />
            </div>
          </section>

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
              <h2 style={{ fontSize: 24, marginBottom: 10 }}>How it works (no demos)</h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  marginBottom: 18,
                  maxWidth: 520,
                }}
              >
                Get portfolio visibility first. Preview enforcement. Activate automation when ready.
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
                <li>Start your trial and connect your organization.</li>
                <li>
                  Upload a vendor list or COIs — or invite vendors via secure upload links.
                </li>
                <li>
                  See exposure instantly. Preview reminders. Activate automation only when
                  comfortable.
                </li>
              </ol>
            </div>

            <div
              className="pm-card"
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
                Zero-pressure start
              </div>

              <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
                14-Day Free Trial · Annual option available ($4,999)
              </div>
              <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 14 }}>
                See your portfolio risk immediately. Many teams lock in the annual plan to avoid renewals.
              </p>

              <button
                onClick={goToSignup}
                className="pm-cta"
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
                  position: "relative",
                }}
              >
                View My Portfolio Risk →
              </button>

              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                No demos · No sales calls · Cancel anytime
              </div>
            </div>
          </section>

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
            <div>© {new Date().getFullYear()} verivo</div>
            <div style={{ display: "flex", gap: 16 }}>
              <button onClick={() => router.push("/terms")} style={linkBtn}>
                Terms
              </button>
              <button onClick={() => router.push("/privacy")} style={linkBtn}>
                Privacy
              </button>
              <button onClick={goToPricing} style={linkBtn}>
                Pricing
              </button>
            </div>
          </footer>
        </main>

        {/* (D) Owner report preview modal */}
        <OwnerReportPreviewModal
          open={ownerReportOpen}
          onClose={() => setOwnerReportOpen(false)}
          onStartTrial={goToSignup}
        />
      </div>
    </>
  );
}

/* ============================================================
   Gauge Ring (Fixes the “gauge bug”)
============================================================ */
/* ============================================================
   Gauge Ring (Fixes the “gauge bug” WITHOUT making it ugly)
   - Keeps the original “premium” look (soft neon ring + open gap)
   - The arc is now actually driven by the score (0–100)
   - Center number uses solid color (no more “gradient square” bug)
============================================================ */
function GaugeRing({ score, mode, label, scoreLabel, animate }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const target = clamp(score, 0, 100);
    let raf = 0;
    const start = performance.now();
    const dur = 720;

    const loop = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [score, animate]);

  // “Gauge” sweep with an open gap at the bottom-right
  const sweep = 260; // degrees
  const deg = Math.round((clamp(val, 0, 100) / 100) * sweep);

  // Track (always visible) + Fill (score-driven)
  const track = `conic-gradient(
    from 220deg,
    rgba(51,65,85,0.45) 0deg,
    rgba(51,65,85,0.45) ${sweep}deg,
    rgba(15,23,42,0) ${sweep}deg 360deg
  )`;

  // Premium fill gradients (mode-specific)
  const fillGradient =
    mode === "owner"
      ? "linear-gradient(90deg,#fb7185,#f97316)"
      : "linear-gradient(90deg,#22c55e,#a3e635)";

  // Conic fill uses two stops so it “cuts off” cleanly at `deg`
  const fill = `conic-gradient(
    from 220deg,
    ${mode === "owner" ? "#fb7185" : "#22c55e"} 0deg,
    ${mode === "owner" ? "#f97316" : "#a3e635"} ${Math.max(1, deg)}deg,
    rgba(0,0,0,0) ${Math.max(1, deg)}deg,
    rgba(0,0,0,0) 360deg
  )`;

  const numberColor = mode === "owner" ? "#fb7185" : "#22c55e";

  return (
    <div
      style={{
        position: "relative",
        width: 160,
        height: 160,
        borderRadius: 999,
        background: track,
        padding: 10,
        margin: "0 auto",
        boxShadow:
          mode === "owner"
            ? "0 0 40px rgba(251,113,133,0.22), 0 0 38px rgba(249,115,22,0.16)"
            : "0 0 40px rgba(34,197,94,0.22), 0 0 40px rgba(56,189,248,0.14)",
      }}
      aria-label={`${label} ${val} ${scoreLabel}`}
    >
      {/* Score-driven arc overlay */}
      <div
        style={{
          position: "absolute",
          inset: 10,
          borderRadius: 999,
          background: fill,
          filter: "drop-shadow(0 0 16px rgba(56,189,248,0.10))",
        }}
      />

      {/* Inner cutout */}
      <div
        style={{
          position: "absolute",
          inset: 16,
          borderRadius: 999,
          background:
            "radial-gradient(circle at 30% 0,#0f172a,#020617 70%,#000)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            color: "#9ca3af",
            letterSpacing: "0.16em",
            marginBottom: 6,
            maxWidth: 120,
          }}
        >
          {label}
        </div>

        {/* Solid color number to avoid the “gradient square” rendering bug */}
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: numberColor,
            lineHeight: 1,
            textShadow:
              mode === "owner"
                ? "0 0 14px rgba(251,113,133,0.25)"
                : "0 0 14px rgba(34,197,94,0.25)",
          }}
        >
          {val}
        </div>

        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
          {scoreLabel}
        </div>
      </div>
    </div>
  );
}

function CountUp({ to, play }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!play) return;
    let raf = 0;
    const start = performance.now();
    const dur = 850;

    const loop = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [to, play]);

  return <>{val}</>;
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
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function MiniStep({ title, body, active }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "10px 10px",
        border: active
          ? "1px solid rgba(56,189,248,0.55)"
          : "1px solid rgba(148,163,184,0.22)",
        background: active ? "rgba(56,189,248,0.10)" : "rgba(15,23,42,0.65)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: active ? "#38bdf8" : "#9ca3af",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: "#cbd5f5", fontWeight: 600 }}>
        {body}
      </div>
    </div>
  );
}

function FeatureCard({ title, body }) {
  return (
    <div
      className="pm-card"
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

/* ============================================================
   (C) Trust Authority Band
============================================================ */
function TrustAuthorityBand() {
  return (
    <section
      style={{
        maxWidth: 1180,
        margin: "26px auto 0 auto",
        padding: "14px 14px",
        borderRadius: 22,
        border: "1px solid rgba(148,163,184,0.22)",
        background:
          "linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.55))",
        boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
      }}
      aria-label="Trust and authority"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1.3fr)",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#9ca3af",
              marginBottom: 8,
            }}
          >
            Trusted operating posture
          </div>

          <div style={{ fontSize: 18, fontWeight: 650, marginBottom: 6 }}>
            Built to survive owner audits and claims scrutiny.
          </div>

          <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
            Encryption in transit + at rest. Permissioned access. Downloadable proof packs.
            Preview-first enforcement so nothing goes out without your approval.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: 10,
          }}
        >
          <TrustBadge title="Secure" subtitle="Encryption" icon="🔒" />
          <TrustBadge title="Payments" subtitle="Stripe-ready" icon="💳" />
          <TrustBadge title="Infrastructure" subtitle="Cloud hardened" icon="☁️" />
          <TrustBadge title="Exports" subtitle="Owner pack" icon="📦" />
          <TrustBadge title="Controls" subtitle="Approval first" icon="✅" />
          <TrustBadge title="Support" subtitle="Fast response" icon="⚡" />
        </div>
      </div>
    </section>
  );
}

function TrustBadge({ title, subtitle, icon }) {
  return (
    <div
      className="pm-card"
      style={{
        borderRadius: 16,
        padding: 12,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(15,23,42,0.82)",
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, rgba(56,189,248,0.16), rgba(15,23,42,0.9))",
          border: "1px solid rgba(56,189,248,0.22)",
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e5e7eb" }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{subtitle}</div>
      </div>
    </div>
  );
}

/* ============================================================
   (D) Owner Report Preview Modal
============================================================ */
function OwnerReportPreviewModal({ open, onClose, onStartTrial }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="pm-modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Owner Report Preview"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="pm-modal">
        <div className="pm-modalHeader">
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#9ca3af",
              }}
            >
              Owner Report Preview
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Portfolio Exposure Summary (sample)
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={onStartTrial}
              className="pm-cta"
              style={{
                borderRadius: 999,
                padding: "9px 14px",
                border: "1px solid rgba(59,130,246,0.9)",
                background:
                  "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                color: "#e0f2fe",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                position: "relative",
              }}
            >
              Start Free Trial
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                borderRadius: 999,
                padding: "9px 12px",
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(15,23,42,0.65)",
                color: "#cbd5f5",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div className="pm-modalBody">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 14,
              alignItems: "start",
            }}
          >
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(251,113,133,0.22)",
                background:
                  "linear-gradient(180deg, rgba(251,113,133,0.10), rgba(2,6,23,0.55))",
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#fecdd3",
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Owner Exposure Summary
              </div>

              <KVRow k="Exposure level" v="Moderate — trending down" />
              <KVRow k="High exposure items" v="14" />
              <KVRow k="Expiring in ≤ 30 days" v="9" />
              <KVRow k="Open compliance gaps" v="3" />
              <KVRow k="Audit posture" v="Owner-ready (proof pack available)" />

              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 10 }}>
                This is what owners care about: clear exposure counts, proof, and a defensible
                audit trail.
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(15,23,42,0.72)",
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#cbd5f5",
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Proof Pack (Preview)
              </div>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  color: "#cbd5f5",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                <li>Vendor roster + compliance status</li>
                <li>COI uploads (latest versions)</li>
                <li>Expirations + endorsements checks</li>
                <li>Action log (previewed + approved)</li>
                <li>Exportable audit trail</li>
              </ul>

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  border: "1px dashed rgba(56,189,248,0.35)",
                  background: "rgba(2,6,23,0.45)",
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                <span>💡 Most teams choose the annual plan ($4,999) to simplify budgeting</span><br/>
                  Nothing sends automatically. Approvals are recorded so owners see control and
                  governance.
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
                <span>💡 Most teams choose the annual plan ($4,999) to simplify budgeting</span><br/>
              Tip: In-product, this becomes a downloadable PDF for owners, auditors, and insurers.
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                border: "1px solid rgba(148,163,184,0.22)",
                background: "rgba(15,23,42,0.65)",
                color: "#cbd5f5",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Back to funnel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KVRow({ k, v }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.14)",
        background: "rgba(2,6,23,0.35)",
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                <span>💡 Most teams choose the annual plan ($4,999) to simplify budgeting</span><br/>{k}</div>
      <div style={{ fontSize: 12, color: "#e5e7eb", fontWeight: 700 }}>{v}</div>
    </div>
  );
}

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, x));
}

const linkBtn = {
  border: "none",
  background: "transparent",
  color: "#9ca3af",
  cursor: "pointer",
  fontSize: 12,
};




/* ============================================================
   Testimonials — Enterprise Authority (Anonymized)
============================================================ */
function TestimonialsBand() {
  const items = [
    {
      heading: "Regional Property Manager — 38-Property Portfolio",
      quote:
        "We surfaced expiring and missing COIs across 38 properties in under an hour — before our owner review.",
      footer: "Multi-property portfolio · Owner reporting enabled",
    },
    {
      heading: "Compliance Lead — Multi-State Operations",
      quote:
        "Audit prep went from last-minute panic to a repeatable, defensible process.",
      footer: "Audit-ready posture · Exportable proof packs",
    },
    {
      heading: "Director of Operations — Institutional Portfolio",
      quote:
        "First time we’ve been able to see owner exposure before enforcement — without automation running ahead of us.",
      footer: "Preview-first enforcement · Governance controls",
    },
  ];

  return (
    <section style={{ maxWidth: 1180, margin: "26px auto 0 auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: 18,
        }}
      >
        {items.map((t, i) => (
          <div
            key={i}
            className="pm-card"
            style={{
              borderRadius: 22,
              padding: 18,
              border: "1px solid rgba(148,163,184,0.28)",
              background:
                "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(2,6,23,0.85))",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#e5e7eb",
                marginBottom: 10,
              }}
            >
              {t.heading}
            </div>

            <p
              style={{
                fontSize: 15,
                color: "#cbd5f5",
                lineHeight: 1.6,
                marginBottom: 12,
              }}
            >
              “{t.quote}”
            </p>

            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                borderTop: "1px solid rgba(148,163,184,0.16)",
                paddingTop: 10,
              }}
            >
              {t.footer}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
