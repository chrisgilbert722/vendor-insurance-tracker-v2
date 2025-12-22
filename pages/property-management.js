// pages/property-management.js
// ============================================================
// PROPERTY MANAGEMENT FUNNEL — SHOWSTOPPER EDITION (Light + Premium)
// Goal: Stripe-level polish (motion + hierarchy) while keeping ALL sales logic
// ============================================================

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function PropertyManagementLanding() {
  const [heroTab, setHeroTab] = useState("risk");
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const tabs = useMemo(() => ([
    { key: "risk", label: "Risk", rows: [
      { label: "Non-compliant vendors", value: "12", tone: "danger" },
      { label: "Policies expiring soon", value: "7", tone: "warn" },
      { label: "Owner exposure", value: "High", tone: "danger" },
    ] },
    { key: "expiring", label: "Expiring", rows: [
      { label: "≤ 30 days", value: "7", tone: "warn" },
      { label: "≤ 60 days", value: "13", tone: "warn" },
      { label: "Missing renewals", value: "4", tone: "danger" },
    ] },
    { key: "coverage", label: "Coverage", rows: [
      { label: "Missing endorsements", value: "4", tone: "warn" },
      { label: "Limit gaps", value: "3", tone: "danger" },
      { label: "Pending broker items", value: "6", tone: "ok" },
    ] },
  ]), []);
  const activeTab = tabs.find((t) => t.key === heroTab) || tabs[0];
  const [activeStep, setActiveStep] = useState("scan");
  const narrative = useMemo(
    () => ({
      scan: {
        kicker: "Step 1 · Ingest",
        title: "Scan COIs + vendor list",
        rows: [
          { k: "COIs scanned", v: "42" },
          { k: "Requirements matched", v: "117" },
          { k: "Exceptions flagged", v: "9" },
        ],
      },
      expose: {
        kicker: "Step 2 · Expose",
        title: "Surface owner exposure",
        rows: [
          { k: "Non-compliant vendors", v: "12" },
          { k: "Expiring ≤ 30 days", v: "7" },
          { k: "Exposure level", v: "High" },
        ],
      },
      preview: {
        kicker: "Step 3 · Preview",
        title: "Preview enforcement actions",
        rows: [
          { k: "Reminder drafts", v: "19" },
          { k: "Escalations queued", v: "6" },
          { k: "Nothing sent", v: "0" },
        ],
      },
      activate: {
        kicker: "Step 4 · Activate",
        title: "Turn on automation when ready",
        rows: [
          { k: "Approval required", v: "Yes" },
          { k: "Run cadence", v: "Daily" },
          { k: "Audit-ready state", v: "On" },
        ],
      },
    }),
    []
  );
  const activeNarrative = narrative[activeStep] || narrative.scan;


  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 }
    );
    els.forEach((el) => io.observe(el));
        // Sticky narrative step tracker
    const stepEls = Array.from(document.querySelectorAll('[data-step]'));
    const io2 = new IntersectionObserver(
      (entries) => {
        // pick the most visible intersecting step
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));
        if (vis[0]) setActiveStep(vis[0].target.getAttribute('data-step'));
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.12, 0.25, 0.5, 0.75] }
    );
    stepEls.forEach((el) => io2.observe(el));
    return () => {
      io.disconnect();
      io2.disconnect();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Vendor Risk Management & Insurance Compliance for Property Managers</title>
        <meta
          name="description"
          content="Vendor risk management and insurance compliance for property managers. Instantly see COI gaps, expiring coverage, and owner exposure across your portfolio — before audits, claims, or automation."
        />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"Organization\", \"name\": \"Vendor Risk Intelligence Platform\", \"url\": \"https://vendor-insurance-tracker-v2.vercel.app/property-management\", \"description\": \"Vendor risk management and insurance compliance platform for property managers.\", \"industry\": \"Property Management Software\"}" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"FAQPage\", \"mainEntity\": [{\"@type\": \"Question\", \"name\": \"What is vendor risk management for property managers?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Vendor risk management helps property managers identify insurance gaps, expired COIs, missing endorsements, and owner exposure across their vendor portfolio.\"}}, {\"@type\": \"Question\", \"name\": \"Does this platform require sales calls or onboarding?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"No. The platform is fully self-serve. Property managers can connect vendors and see risk in minutes without demos, sales calls, or onboarding.\"}}, {\"@type\": \"Question\", \"name\": \"How does COI tracking work?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"The system continuously monitors certificates of insurance, expiration dates, limits, and endorsements, alerting teams before compliance issues occur.\"}}]}" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"SoftwareApplication\", \"name\": \"Vendor Risk Intelligence Platform\", \"applicationCategory\": \"BusinessApplication\", \"applicationSubCategory\": \"Vendor Risk Management Software\", \"operatingSystem\": \"Web\", \"description\": \"Vendor risk management and insurance compliance software for property managers to track COIs, monitor expiring coverage, and reduce owner exposure.\", \"offers\": {\"@type\": \"Offer\", \"price\": \"0\", \"priceCurrency\": \"USD\", \"availability\": \"https://schema.org/OnlineOnly\"}, \"featureList\": [\"Vendor risk management\", \"COI tracking\", \"Insurance compliance monitoring\", \"Expiration alerts\", \"Owner exposure visibility\", \"Control-first automation\"]}" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"BreadcrumbList\", \"itemListElement\": [{\"@type\": \"ListItem\", \"position\": 1, \"name\": \"Home\", \"item\": \"https://vendor-insurance-tracker-v2.vercel.app/\"}, {\"@type\": \"ListItem\", \"position\": 2, \"name\": \"Property Management\", \"item\": \"https://vendor-insurance-tracker-v2.vercel.app/property-management\"}]}" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"Offer\", \"name\": \"Vendor Risk Intelligence Platform \\u2013 Free Trial\", \"price\": \"0\", \"priceCurrency\": \"USD\", \"availability\": \"https://schema.org/InStock\", \"url\": \"https://vendor-insurance-tracker-v2.vercel.app/signup?industry=property_management\", \"description\": \"Start with a free trial. View vendor risk and activate automation when ready.\"}" }} />

        <style>{`
          :root {
            --ink: #0b1220;
            --muted: #334155;
            --muted2: #475569;
            --line: rgba(15, 23, 42, 0.10);
            --card2: rgba(255,255,255,0.92);
            --blue: #4f46e5;
            --blue2: #6366f1;
            --shadow: 0 22px 70px rgba(15, 23, 42, 0.12);
            --shadow2: 0 12px 32px rgba(15, 23, 42, 0.10);
            --r: 22px;
          }

          html { scroll-behavior: smooth; }
          * { box-sizing: border-box; }

          .reveal {
            opacity: 0;
            transform: translateY(14px);
            transition: opacity 700ms cubic-bezier(.2,.8,.2,1), transform 700ms cubic-bezier(.2,.8,.2,1);
            will-change: opacity, transform;
          }
          .reveal.in { opacity: 1; transform: translateY(0); }

          @keyframes floaty {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-140%); }
            100% { transform: translateX(140%); }
          }
          @keyframes blob {
            0% { transform: translate3d(0,0,0) scale(1); }
            50% { transform: translate3d(18px,-16px,0) scale(1.08); }
            100% { transform: translate3d(0,0,0) scale(1); }
          }

          .heroWrap {
            position: relative;
            overflow: hidden;
            border-radius: calc(var(--r) + 10px);
            background:
              radial-gradient(1200px 600px at 15% -5%, rgba(79,70,229,0.14), rgba(255,255,255,0) 60%),
              radial-gradient(900px 520px at 90% 10%, rgba(56,189,248,0.10), rgba(255,255,255,0) 55%),
              linear-gradient(180deg, #ffffff 0%, #fbfcff 40%, #f7f9ff 100%);
            border: 1px solid var(--line);
            box-shadow: var(--shadow);
          }

          .blob {
            position: absolute;
            inset: -220px -220px auto auto;
            width: 560px;
            height: 560px;
            border-radius: 999px;
            background: radial-gradient(circle at 30% 30%, rgba(79,70,229,0.25), rgba(99,102,241,0.10) 45%, rgba(56,189,248,0.08) 70%, rgba(255,255,255,0) 72%);
            animation: blob 8.5s ease-in-out infinite;
            pointer-events: none;
          }

          .pill {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(255,255,255,0.70);
            border: 1px solid rgba(79,70,229,0.22);
            box-shadow: 0 10px 30px rgba(15,23,42,0.06);
            font-weight: 800;
            font-size: 12px;
            letter-spacing: .12em;
            text-transform: uppercase;
            color: var(--blue);
            backdrop-filter: blur(10px);
          }

          .cta {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 16px 34px;
            border-radius: 999px;
            background: linear-gradient(135deg, var(--blue), var(--blue2));
            color: #fff;
            font-size: 17px;
            font-weight: 900;
            letter-spacing: -0.01em;
            text-decoration: none;
            box-shadow: 0 24px 60px rgba(79,70,229,0.35);
            transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
            overflow: hidden;
          }
          .cta:hover {
            transform: translateY(-2px);
            filter: saturate(1.05);
            box-shadow: 0 28px 70px rgba(79,70,229,0.42);
          }
          .cta::after {
            content: "";
            position: absolute;
            top: -60%;
            left: -60%;
            width: 60%;
            height: 220%;
            background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.35), rgba(255,255,255,0));
            transform: rotate(18deg) translateX(-140%);
            animation: shimmer 2.9s ease-in-out infinite;
          }

          .link { color: var(--blue); font-weight: 800; text-decoration: none; }
          .link:hover { text-decoration: underline; }

          .card {
            background: var(--card2);
            border: 1px solid rgba(15,23,42,0.10);
            border-radius: var(--r);
            box-shadow: var(--shadow2);
            backdrop-filter: blur(10px);
          }
          .lift { transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease; }
          .lift:hover { transform: translateY(-4px); box-shadow: 0 22px 70px rgba(15,23,42,0.14); border-color: rgba(79,70,229,0.22); }

          .grid2 { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 48px; align-items: center; }
          @media (max-width: 980px) { .grid2 { grid-template-columns: 1fr; gap: 28px; } }

          .softBand {
            background: linear-gradient(180deg, rgba(79,70,229,0.06) 0%, rgba(99,102,241,0.04) 45%, rgba(255,255,255,0) 100%);
            border-top: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
          }

          .logos { display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; opacity: 0.85; }
          .logoStub {
            padding: 12px 18px; border-radius: 999px;
            background: rgba(15,23,42,0.04); border: 1px solid rgba(15,23,42,0.08);
            font-weight: 900; letter-spacing: .06em; text-transform: uppercase; font-size: 12px;
            color: rgba(15,23,42,0.55);
          }

          .gradText {
            background: linear-gradient(90deg, rgba(79,70,229,1), rgba(99,102,241,1), rgba(56,189,248,1));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .bgGrid {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(15,23,42,0.05) 1px, transparent 1px);
            background-size: 80px 80px;
            mask-image: radial-gradient(circle at 30% 20%, rgba(0,0,0,0.25), rgba(0,0,0,0) 60%);
            pointer-events: none;
          }
          @media (prefers-reduced-motion: reduce) {
            .reveal { transition: none !important; transform: none !important; opacity: 1 !important; }
            .cta::after { animation: none !important; }
            .blob { animation: none !important; }
          }

        
          /* Nuclear pass: power band + sticky narrative + comparison slice */
          .powerBand{
            margin-top: 34px;
            border-radius: calc(var(--r) + 10px);
            border: 1px solid rgba(15,23,42,0.10);
            background:
              radial-gradient(900px 520px at 15% 10%, rgba(79,70,229,0.18), rgba(255,255,255,0) 62%),
              radial-gradient(700px 420px at 85% 25%, rgba(56,189,248,0.16), rgba(255,255,255,0) 58%),
              linear-gradient(180deg, rgba(11,18,32,0.98) 0%, rgba(15,23,42,0.98) 100%);
            box-shadow: 0 30px 90px rgba(15,23,42,0.35);
            overflow: hidden;
            position: relative;
          }
          .powerGlow{
            position:absolute; inset:-240px auto auto -240px;
            width:520px; height:520px; border-radius:999px;
            background: radial-gradient(circle at 30% 30%, rgba(99,102,241,0.42), rgba(56,189,248,0.18) 52%, rgba(255,255,255,0) 70%);
            filter: blur(6px);
            pointer-events:none;
          }
          .powerKicker{
            font-size:12px; font-weight:900; letter-spacing:.14em; text-transform:uppercase;
            color: rgba(191,219,254,0.9);
          }
          .powerTitle{
            font-size:46px; font-weight:950; letter-spacing:-0.03em;
            margin: 10px 0 12px;
            color: #fff;
          }
          .powerSub{
            color: rgba(226,232,240,0.86);
            font-size:16px; line-height:1.75; max-width: 920px;
          }
          .ticker{
            display:grid; gap:12px;
            margin-top: 22px;
          }
          .tick{
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 16px;
            padding: 14px 14px;
            display:flex; align-items:center; justify-content:space-between; gap:14px;
            box-shadow: 0 12px 30px rgba(0,0,0,0.25);
            transform: translateY(0);
          }
          .tick b{ color:#fff; }
          .tick span{ color: rgba(226,232,240,0.78); font-size: 13px; }
          @keyframes popIn{
            0%{ opacity:0; transform: translateY(10px); }
            100%{ opacity:1; transform: translateY(0px); }
          }
          .tick{ opacity:0; animation: popIn 700ms cubic-bezier(.2,.8,.2,1) forwards; }
          .tick:nth-child(1){ animation-delay: 60ms; }
          .tick:nth-child(2){ animation-delay: 180ms; }
          .tick:nth-child(3){ animation-delay: 300ms; }
          .tick:nth-child(4){ animation-delay: 420ms; }

          .stickyGrid{
            display:grid;
            grid-template-columns: 0.95fr 1.05fr;
            gap: 22px;
            align-items:start;
          }
          @media (max-width: 980px){
            .stickyGrid{ grid-template-columns: 1fr; }
          }
          .stickyCard{
            position: sticky;
            top: 88px;
          }
          .stepItem{
            border-radius: 22px;
            border: 1px solid rgba(15,23,42,0.10);
            background: rgba(255,255,255,0.92);
            box-shadow: var(--shadow2);
            padding: 22px;
          }
          .stepItem + .stepItem{ margin-top: 14px; }
          .stepPill{
            display:inline-flex;
            align-items:center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid rgba(79,70,229,0.18);
            background: rgba(79,70,229,0.08);
            color: rgba(79,70,229,1);
            font-weight: 900;
            font-size: 12px;
            letter-spacing: .10em;
            text-transform: uppercase;
          }
          .compTable{
            border-radius: calc(var(--r) + 6px);
            border: 1px solid rgba(15,23,42,0.10);
            background: rgba(255,255,255,0.92);
            box-shadow: var(--shadow2);
            overflow: hidden;
          }
          .compRow{
            display:grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 12px;
            padding: 14px 18px;
            border-top: 1px solid rgba(15,23,42,0.08);
            align-items:center;
          }
          .compRow:first-child{ border-top:none; }
          .compL{ color: rgba(15,23,42,0.70); font-weight: 700; }
          .compR{
            justify-self:end;
            padding: 8px 12px;
            border-radius: 999px;
            font-weight: 900;
            font-size: 12px;
            letter-spacing: .10em;
            text-transform: uppercase;
          }
          .yes{ background: rgba(34,197,94,0.12); color: rgba(21,128,61,1); border: 1px solid rgba(34,197,94,0.22); }
          .no{ background: rgba(239,68,68,0.10); color: rgba(185,28,28,1); border: 1px solid rgba(239,68,68,0.20); }

          @media (prefers-reduced-motion: reduce){
            .tick{ animation: none !important; opacity:1 !important; }
          }

        `}</style>
      </Head>

      <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#ffffff 0%, #f8fafc 38%, #eef2ff 100%)", color: "var(--ink)", padding: "28px 18px 120px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <section
            id="vendor-risk-management"
            className="heroWrap"
            style={{ padding: "78px 54px" }}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - r.left) / r.width - 0.5;
              const y = (e.clientY - r.top) / r.height - 0.5;
              setParallax({ x, y });
            }}
            onMouseLeave={() => setParallax({ x: 0, y: 0 })}
          >
            <div className="blob" style={{ transform: `translate3d(${parallax.x * 18}px, ${parallax.y * -14}px, 0)` }} />
            <div className="bgGrid" />
            <div className="grid2">
              <div className="reveal in" data-reveal>
                <div className="pill">Vendor Risk Intelligence Platform</div>
                <h1 style={{ marginTop: 18, fontSize: 62, lineHeight: 1.04, fontWeight: 950, letterSpacing: "-0.03em", color: "var(--ink)", marginBottom: 18 }}>
                  <span className="gradText">Real-Time Vendor Risk</span><br/>Intelligence for Property<br/>Portfolios
                </h1>
                <p style={{ fontSize: 20, lineHeight: 1.7, color: "var(--muted)", maxWidth: 640, marginBottom: 26 }}>
                  Instantly see insurance exposure, non-compliance, and owner risk — before audits, claims, or automation.
                </p>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                  <Link href="/signup?industry=property_management" className="cta">View My Portfolio Risk</Link>
                  <Link href="#how-it-works" className="link">See how it works →</Link>
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted2)" }}>
                  No demos. No sales calls. Operational in minutes.
                </div>
              </div>

              <div className="reveal in" data-reveal style={{ animation: "floaty 5.2s ease-in-out infinite" }}>
                <div className="card lift" style={{ padding: 26, borderRadius: 26 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--blue)", marginBottom: 16 }}>
                    Portfolio Risk Snapshot
                  </div>
                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    {tabs.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setHeroTab(t.key)}
                        style={{
                          cursor: "pointer",
                          border: "1px solid rgba(15,23,42,0.10)",
                          background: heroTab === t.key ? "rgba(79,70,229,0.10)" : "rgba(255,255,255,0.70)",
                          color: heroTab === t.key ? "rgba(79,70,229,1)" : "rgba(15,23,42,0.70)",
                          padding: "8px 12px",
                          borderRadius: 999,
                          fontWeight: 900,
                          fontSize: 12,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          boxShadow: heroTab === t.key ? "0 10px 30px rgba(79,70,229,0.10)" : "none",
                          transition: "transform 180ms ease, box-shadow 180ms ease",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                    </div>
                    <div style={{ display: "grid", gap: 14 }}>
                      {activeTab.rows.map((r) => (
                        <MiniRow key={r.label} label={r.label} value={r.value} tone={r.tone} />
                      ))}
                    </div>
                    <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                      {activeTab.rows.map((r, idx) => (
                        <div key={r.label + idx} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, alignItems: "center" }}>
                          <div style={{ fontSize: 12, color: "rgba(15,23,42,0.55)", fontWeight: 800 }}>
                            {r.label.length > 14 ? r.label.slice(0, 14) + "…" : r.label}
                          </div>
                          <div style={{ height: 10, borderRadius: 999, background: "rgba(15,23,42,0.06)", overflow: "hidden", border: "1px solid rgba(15,23,42,0.06)" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, 18 + idx * 22 + (heroTab === "risk" ? 8 : 0))}%`,
                                borderRadius: 999,
                                background:
                                  r.tone === "danger"
                                    ? "linear-gradient(90deg, rgba(239,68,68,0.55), rgba(239,68,68,0.20))"
                                    : r.tone === "warn"
                                    ? "linear-gradient(90deg, rgba(245,158,11,0.55), rgba(245,158,11,0.18))"
                                    : "linear-gradient(90deg, rgba(34,197,94,0.55), rgba(34,197,94,0.18))",
                                transition: "width 520ms cubic-bezier(.2,.8,.2,1)",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(15,23,42,0.08)", fontSize: 13, color: "rgba(15,23,42,0.60)", lineHeight: 1.5 }}>
                    Visibility first. Automation only when you approve.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="reveal" data-reveal style={{ padding: "56px 8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "rgba(15,23,42,0.55)" }}>
              Trusted by property teams responsible for thousands of units
            </div>
            <div className="logos" style={{ marginTop: 18, marginBottom: 14 }}>
              <div className="logoStub">Property Group</div>
              <div className="logoStub">Asset Management</div>
              <div className="logoStub">Multifamily Ops</div>
              <div className="logoStub">Portfolio Services</div>
            </div>
            <div style={{ fontSize: 13, color: "rgba(15,23,42,0.55)" }}>Built for operators who can’t afford blind spots.</div>
          </section>

          <section className="reveal" data-reveal style={{ padding: "22px 8px 44px" }}>
            <div className="card" style={{ padding: 26, borderRadius: 22 }}>
              <p style={{ margin: 0, fontSize: 16, color: "var(--muted2)", lineHeight: 1.75 }}>
                This platform is built for vendor risk management and insurance compliance in property management.
                It helps property managers track certificates of insurance (COIs), monitor expiring policies,
                validate additional insured and waiver requirements, and reduce owner exposure across multi-property portfolios.
              </p>
            </div>
          </section>

          <section className="reveal" data-reveal style={{ padding: "18px 8px 54px" }}>
            <div className="card" style={{ padding: 30 }}>
              <h3 style={{ fontSize: 22, fontWeight: 950, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
                Built for teams that can’t afford blind spots
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted2)", lineHeight: 1.95, fontSize: 16 }}>
                <li>Property managers overseeing multiple vendors</li>
                <li>Operations teams responsible for owner risk</li>
                <li>Firms preparing for audits, claims, or portfolio growth</li>
              </ul>
            </div>
          </section>

          <section id="vendor-insurance-risk" className="reveal" data-reveal style={{ padding: "24px 8px 44px" }}>
            <h2 style={{ fontSize: 44, fontWeight: 950, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
              Vendor insurance risk doesn’t fail loudly.
            </h2>
            <p style={{ fontSize: 18, color: "var(--muted2)", lineHeight: 1.8, margin: "0 0 18px", maxWidth: 820 }}>
              It fails quietly — accumulating in the background until an audit, a claim, or an owner question exposes it all at once.
            </p>
            <div className="card" style={{ padding: 26, borderRadius: 22 }}>
              <p style={{ margin: 0, fontSize: 16, color: "var(--muted2)", lineHeight: 1.75 }}>
                COIs expire without notice. Vendors delay renewals. Endorsements get missed. Spreadsheets drift out of date.
              </p>
              <ul style={{ marginTop: 14, paddingLeft: 18, color: "var(--muted2)", lineHeight: 1.9, fontSize: 16 }}>
                <li>Coverage gaps go unnoticed</li>
                <li>Non-compliance compounds silently</li>
                <li>Risk only becomes visible when it’s already a problem</li>
              </ul>
              <p style={{ marginTop: 14, marginBottom: 0, fontSize: 14, color: "rgba(15,23,42,0.55)", lineHeight: 1.6 }}>
                Most property managers don’t discover insurance issues because they weren’t diligent — they discover them because the systems they rely on never showed the full truth.
              </p>
            </div>
          </section>

          <section id="control-first-automation" className="softBand" style={{ marginTop: 34, padding: "72px 8px" }}>
            <div className="reveal" data-reveal>
              <h2 style={{ fontSize: 46, fontWeight: 950, letterSpacing: "-0.03em", margin: "0 0 14px" }}>
                Most platforms automate first.<br/>We show you the truth first.
              </h2>
              <p style={{ fontSize: 18, color: "var(--muted2)", lineHeight: 1.8, maxWidth: 900, marginTop: 0 }}>
                Instead of immediately sending emails, chasing vendors, or enforcing rules blindly, this platform gives you something no other system leads with: <strong>real visibility.</strong>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16, marginTop: 18 }}>
                <FeatureCard title="Exposure, instantly" text="See actual insurance exposure across your vendor portfolio in one view." />
                <FeatureCard title="Know exactly why" text="Understand which vendors are non-compliant — and the specific gap." />
                <FeatureCard title="Prevent urgency" text="Identify expiring coverage before it becomes a scramble." />
                <FeatureCard title="Preview before action" text="Review every reminder and escalation before anything runs." />
              </div>
              <div style={{ marginTop: 22, fontSize: 16, color: "var(--muted2)" }}>
                You stay in control. Automation only starts when <strong>you</strong> decide.
              </div>
              <div style={{ marginTop: 22 }}>
                <Link href="/signup?industry=property_management" className="cta">View My Portfolio Risk</Link>
                <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted2)" }}>
                  No demos. No sales calls. Operational in minutes.
                </div>
              </div>
            </div>
          </section>


          {/* ================= POWER MOMENT ================= */}
          <section className="powerBand" style={{ padding: "56px 34px", marginTop: 26 }}>
            <div className="powerGlow" />
            <div style={{ position: "relative" }}>
              <div className="powerKicker">Owner-safe compliance · live exposure</div>
              <div className="powerTitle">You don’t discover risk during an audit.</div>
              <div className="powerSub">
                You see it in advance — with the exact vendor, the exact gap, and the exact exposure — before anything is sent, enforced, or escalated.
              </div>

              <div className="ticker">
                <div className="tick">
                  <div><b>ALERT</b> · Vendor missing Additional Insured endorsement</div>
                  <span>Action previewed · not sent</span>
                </div>
                <div className="tick">
                  <div><b>EXPIRING</b> · COI expires in 17 days (HVAC contractor)</div>
                  <span>Renewal request ready</span>
                </div>
                <div className="tick">
                  <div><b>LIMIT GAP</b> · Coverage below contract requirement</div>
                  <span>Broker escalation drafted</span>
                </div>
                <div className="tick">
                  <div><b>OWNER EXPOSURE</b> · High exposure detected across portfolio</div>
                  <span>Executive summary updated</span>
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <Link href="/signup?industry=property_management" className="cta">
                  View My Portfolio Risk
                </Link>
                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(226,232,240,0.80)" }}>
                  No demos. No sales calls. Operational in minutes.
                </div>
              </div>
            </div>
          </section>

          {/* ================= STICKY PRODUCT NARRATIVE ================= */}
          <section className="reveal" data-reveal style={{ padding: "78px 8px 54px" }}>
            <div style={{ marginBottom: 14, fontSize: 13, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(79,70,229,1)" }}>
              How it works (feels like the product)
            </div>
            <div style={{ fontSize: 42, fontWeight: 950, letterSpacing: "-0.03em", marginBottom: 14 }}>
              A risk command view — without a sales cycle
            </div>
            <div style={{ color: "var(--muted2)", lineHeight: 1.75, maxWidth: 920, marginBottom: 22 }}>
              As you scroll, the system progresses from ingest → exposure → preview → activation. It’s fully self-serve, and nothing runs without approval.
            </div>

            <div className="stickyGrid">
              <div className="stickyCard">
                <div className="card lift" style={{ padding: 26, borderRadius: 24 }}>
                  <div className="stepPill">{activeNarrative.kicker}</div>
                  <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: "-0.02em", marginTop: 12 }}>
                    {activeNarrative.title}
                  </div>

                  <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                    {activeNarrative.rows.map((r) => (
                      <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 12px", borderRadius: 14, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.06)" }}>
                        <div style={{ color: "rgba(15,23,42,0.70)", fontWeight: 700 }}>{r.k}</div>
                        <div style={{ fontWeight: 950, letterSpacing: "-0.01em" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(15,23,42,0.08)", color: "rgba(15,23,42,0.60)", fontSize: 13, lineHeight: 1.6 }}>
                    No meetings. No onboarding. Preview everything. Activate when ready.
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <Link href="/signup?industry=property_management" className="cta">
                    View My Portfolio Risk
                  </Link>
                </div>
              </div>

              <div>
                <div className="stepItem" data-step="scan">
                  <div className="stepPill">Step 1 · Ingest</div>
                  <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: "-0.02em", marginTop: 10 }}>
                    Connect vendors or upload COIs
                  </div>
                  <div style={{ color: "var(--muted2)", lineHeight: 1.75, marginTop: 10 }}>
                    Upload a vendor list or COIs. The system extracts limits, endorsements, and requirements mapping — without vendor logins.
                  </div>
                </div>

                <div className="stepItem" data-step="expose">
                  <div className="stepPill">Step 2 · Expose</div>
                  <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: "-0.02em", marginTop: 10 }}>
                    See risk the way owners see it
                  </div>
                  <div style={{ color: "var(--muted2)", lineHeight: 1.75, marginTop: 10 }}>
                    Non-compliance, expirations, and exposure become visible across your portfolio in one executive view.
                  </div>
                </div>

                <div className="stepItem" data-step="preview">
                  <div className="stepPill">Step 3 · Preview</div>
                  <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: "-0.02em", marginTop: 10 }}>
                    Preview enforcement before anything runs
                  </div>
                  <div style={{ color: "var(--muted2)", lineHeight: 1.75, marginTop: 10 }}>
                    Reminder drafts, broker escalations, and renewal workflows are generated — but nothing is sent automatically.
                  </div>
                </div>

                <div className="stepItem" data-step="activate">
                  <div className="stepPill">Step 4 · Activate</div>
                  <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: "-0.02em", marginTop: 10 }}>
                    Activate automation when you’re comfortable
                  </div>
                  <div style={{ color: "var(--muted2)", lineHeight: 1.75, marginTop: 10 }}>
                    You decide when automation starts — or if it starts at all. Your portfolio stays owner-safe by default.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ================= COMPARISON SLICE ================= */}
          <section className="reveal" data-reveal style={{ padding: "10px 8px 64px" }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(79,70,229,1)" }}>
              Why this wins
            </div>
            <div style={{ fontSize: 40, fontWeight: 950, letterSpacing: "-0.03em", margin: "10px 0 14px" }}>
              Built for property managers — not demo cycles
            </div>
            <div style={{ color: "var(--muted2)", lineHeight: 1.75, maxWidth: 920, marginBottom: 18 }}>
              Traditional platforms automate first and explain later. This platform shows the truth first — then enforces quietly after approval.
            </div>

            <div className="compTable">
              <div className="compRow" style={{ background: "rgba(15,23,42,0.03)" }}>
                <div style={{ fontWeight: 950, color: "rgba(15,23,42,0.75)" }}>Decision criteria</div>
                <div style={{ justifySelf: "end", fontWeight: 950, color: "rgba(15,23,42,0.75)" }}>This platform</div>
              </div>

              <div className="compRow">
                <div className="compL">See owner exposure before enforcement</div>
                <div className="compR yes">Yes</div>
              </div>
              <div className="compRow">
                <div className="compL">Preview reminders / escalations before sending</div>
                <div className="compR yes">Yes</div>
              </div>
              <div className="compRow">
                <div className="compL">Requires demos / sales-assisted onboarding</div>
                <div className="compR no">No</div>
              </div>
              <div className="compRow">
                <div className="compL">Automation runs without approval</div>
                <div className="compR no">No</div>
              </div>
            </div>
          </section>

          <section className="reveal" data-reveal style={{ padding: "78px 8px 24px" }}>
            <div className="card" style={{ padding: 34 }}>
              <h2 style={{ fontSize: 40, fontWeight: 950, letterSpacing: "-0.03em", margin: "0 0 10px" }}>
                Built for autonomous setup — not sales cycles
              </h2>
              <p style={{ fontSize: 16, color: "var(--muted2)", lineHeight: 1.8, margin: "0 0 12px", maxWidth: 920 }}>
                This platform doesn’t require demos, onboarding calls, or implementation projects.
              </p>
              <p style={{ fontSize: 16, color: "var(--muted2)", lineHeight: 1.8, margin: "0 0 12px", maxWidth: 920 }}>
                You connect your vendors, see real risk, and decide what happens next — all on your own timeline.
              </p>
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 900, color: "var(--blue)" }}>
                Most teams are operational in minutes — not weeks.
              </div>
            </div>
          </section>

          <section className="reveal" data-reveal style={{ padding: "18px 8px 54px" }}>
            <div className="card" style={{ padding: 26 }}>
              <p style={{ margin: 0, fontSize: 16, color: "var(--muted2)", lineHeight: 1.75 }}>
                Property management teams use this system for COI tracking, vendor insurance monitoring,
                and proactive compliance enforcement. By continuously evaluating coverage limits,
                endorsements, and renewal timelines, teams can identify compliance gaps before audits,
                claims, or owner reviews occur.
              </p>
            </div>
          </section>

          <section id="how-it-works" className="reveal" data-reveal style={{ padding: "18px 8px 64px" }}>
            <h2 style={{ fontSize: 44, fontWeight: 950, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
              See your entire portfolio the way owners expect you to.
            </h2>
            <p style={{ fontSize: 18, color: "var(--muted2)", lineHeight: 1.8, maxWidth: 900, marginTop: 0 }}>
              In one view, you can understand where real insurance risk exists today — not where you hope it doesn’t.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginTop: 20 }}>
              <Metric title="Non-compliant vendors" value="12" sub="Coverage gaps detected" />
              <Metric title="Policies expiring soon" value="7" sub="Renewals approaching" />
              <Metric title="Missing endorsements" value="4" sub="Additional insured / waivers" />
              <Metric title="Owner exposure level" value="High" sub="Audit & claim risk" />
            </div>
          </section>

          <section className="softBand" style={{ padding: "78px 8px" }}>
            <div className="reveal" data-reveal>
              <h2 style={{ fontSize: 42, fontWeight: 950, letterSpacing: "-0.03em", margin: "0 0 18px" }}>
                Before vs After visibility and controlled automation
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <CompareCard title="Before" subtitle="Manual · Reactive · Risk-Prone" tone="bad" items={[
                  "COIs tracked manually",
                  "Expired coverage discovered too late",
                  "Missing endorsements overlooked",
                  "Spreadsheets drift out of date",
                  "Audits trigger last-minute panic",
                ]} />
                <CompareCard title="After" subtitle="Continuous · Calm · Owner-Safe" tone="good" items={[
                  "Continuous vendor monitoring",
                  "Expiring coverage flagged early",
                  "Requirements validated on upload",
                  "Renewals escalated before deadlines",
                  "Owners protected proactively",
                ]} />
              </div>
            </div>
          </section>

          <section id="implementation-timeline" className="reveal" data-reveal style={{ padding: "78px 8px 64px" }}>
            <h2 style={{ fontSize: 42, fontWeight: 950, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
              What happens in your first 48 hours
            </h2>
            <div style={{ color: "var(--muted2)", marginBottom: 20 }}>
              No meetings. No onboarding. No waiting.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16 }}>
              <StepCard time="Hour 0–1" title="Connect vendors" text="Upload a vendor list or COIs. No vendor logins required." />
              <StepCard time="Hour 1–12" title="Risk becomes visible" text="Non-compliance, expiring policies, and owner exposure are surfaced." />
              <StepCard time="Hour 12–24" title="Automation previewed" text="Reminders and renewals are generated — nothing is sent." />
              <StepCard time="Hour 24–48" title="You decide" text="Activate automation when ready — or walk away with zero impact." />
            </div>
          </section>

          <section className="reveal" data-reveal style={{ padding: "10px 8px 52px" }}>
            <div className="card" style={{ padding: 30 }}>
              <h3 style={{ fontSize: 26, fontWeight: 950, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
                Learn how property managers reduce vendor insurance risk
              </h3>

              <p style={{ fontSize: 16, color: "var(--muted2)", lineHeight: 1.75, marginTop: 0 }}>
                These guides walk through the most common compliance failures we see across property portfolios —
                and how teams prevent them before audits, claims, or owner reviews.
              </p>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <a className="link" href="/blog/coi-tracking-property-management">COI tracking for property managers: what breaks and how to fix it →</a>
                <a className="link" href="/blog/vendor-insurance-expirations">How expired vendor insurance creates owner exposure →</a>
                <a className="link" href="/blog/vendor-risk-management-best-practices">Vendor risk management best practices for multi-property portfolios →</a>
              </div>
            </div>
          </section>

          <section id="insurance-compliance-governance" className="reveal" data-reveal style={{ padding: "78px 8px 0" }}>
            <div className="card" style={{ padding: "56px 34px", textAlign: "center" }}>
              <h2 style={{ fontSize: 42, fontWeight: 950, letterSpacing: "-0.03em", margin: "0 0 10px" }}>
                Full visibility. Full control. Always.
              </h2>

              <p style={{ fontSize: 16, color: "var(--muted2)", lineHeight: 1.75, margin: "0 auto 16px", maxWidth: 820 }}>
                Nothing is sent automatically. Every reminder, renewal, and escalation is visible before it runs.
              </p>

              <p style={{ fontSize: 16, color: "var(--muted2)", margin: "0 0 26px" }}>
                You decide when automation starts — or if it starts at all.
              </p>

              <Link href="/signup?industry=property_management" className="cta">View My Portfolio Risk</Link>

              <div style={{ marginTop: 12, fontSize: 13, color: "rgba(15,23,42,0.55)" }}>
                See risk first. Activate automation when you’re ready.
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function MiniRow({ label, value, tone }) {
  const toneColor =
    tone === "danger" ? "rgba(239,68,68,1)" : tone === "warn" ? "rgba(245,158,11,1)" : "rgba(34,197,94,1)";
  const toneBg =
    tone === "danger" ? "rgba(239,68,68,0.08)" : tone === "warn" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 14, padding: "14px 14px", borderRadius: 16, border: "1px solid rgba(15,23,42,0.10)", background: "rgba(255,255,255,0.85)" }}>
      <div style={{ fontSize: 15, color: "rgba(15,23,42,0.72)" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: toneColor, padding: "6px 10px", borderRadius: 999, background: toneBg, border: "1px solid rgba(15,23,42,0.06)" }}>
        {value}
      </div>
    </div>
  );
}

function FeatureCard({ title, text }) {
  return (
    <div className="card lift" style={{ padding: 18 }}>
      <div style={{ fontWeight: 950, letterSpacing: "-0.01em", marginBottom: 6 }}>{title}</div>
      <div style={{ color: "var(--muted2)", lineHeight: 1.6, fontSize: 15 }}>{text}</div>
    </div>
  );
}

function Metric({ title, value, sub }) {
  return (
    <div className="card lift" style={{ padding: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(15,23,42,0.55)" }}>
        {title}
      </div>
      <div style={{ fontSize: 44, fontWeight: 950, letterSpacing: "-0.02em", marginTop: 10 }}>{value}</div>
      <div style={{ color: "rgba(15,23,42,0.60)", marginTop: 4, fontSize: 14 }}>{sub}</div>
    </div>
  );
}

function CompareCard({ title, subtitle, items, tone }) {
  const border = tone === "good" ? "2px solid rgba(79,70,229,0.55)" : "1px solid rgba(15,23,42,0.12)";
  const badge = tone === "good" ? "rgba(34,197,94,1)" : "rgba(239,68,68,1)";
  return (
    <div className="card" style={{ padding: 26, border, borderRadius: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: "-0.02em" }}>{title}</div>
        <div style={{ color: badge, fontWeight: 950, fontSize: 13 }}>{subtitle}</div>
      </div>
      <ul style={{ marginTop: 14, paddingLeft: 18, color: "var(--muted2)", lineHeight: 1.95, fontSize: 15 }}>
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function StepCard({ time, title, text }) {
  return (
    <div className="card lift" style={{ padding: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--blue)" }}>
        {time}
      </div>
      <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: "-0.01em", marginTop: 8 }}>{title}</div>
      <div style={{ color: "var(--muted2)", lineHeight: 1.6, marginTop: 8, fontSize: 15 }}>{text}</div>
    </div>
  );
}
