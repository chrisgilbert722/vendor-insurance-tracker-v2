// pages/property-management.js
// ============================================================
// PROPERTY MANAGEMENT FUNNEL — V5 IRON MAN (Dashboard-first simulated cockpit)
// Goal: Close immediately. Cinematic, animated, product-led, still a funnel.
// ============================================================

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function PropertyManagementLanding() {
  const [tick, setTick] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const cockpit = useMemo(() => {
    const t = tick;

    const score = Math.max(0, Math.min(100, Math.round(86 + 6 * Math.sin(t / 7))));
    const nonCompliant = 10 + Math.round(3 * (0.5 + 0.5 * Math.sin(t / 5)));
    const exp30 = 6 + Math.round(2 * (0.5 + 0.5 * Math.cos(t / 6)));
    const missingEnd = 3 + Math.round(2 * (0.5 + 0.5 * Math.sin(t / 9)));
    const exposure = score >= 90 ? "Moderate" : "High";

    const feed = [
      {
        type: "OWNER EXPOSURE",
        tone: "danger",
        msg: "High owner exposure detected across portfolio",
        sub: "Executive summary updated",
      },
      {
        type: "EXPIRING",
        tone: "warn",
        msg: "COI expires in 17 days (HVAC contractor)",
        sub: "Renewal request drafted (not sent)",
      },
      {
        type: "MISSING AI",
        tone: "warn",
        msg: "Additional Insured endorsement missing (Plumbing)",
        sub: "Endorsement request prepared",
      },
      {
        type: "LIMIT GAP",
        tone: "danger",
        msg: "Coverage below contract requirement (Roofing)",
        sub: "Broker escalation previewed",
      },
    ];

    const rot = t % feed.length;
    const rotated = feed.slice(rot).concat(feed.slice(0, rot));

    return {
      score,
      nonCompliant,
      exp30,
      missingEnd,
      exposure,
      feed: rotated,
    };
  }, [tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 900);
    return () => clearInterval(id);
  }, []);

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
      { threshold: 0.14 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const onMouseMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setParallax({ x, y });
  };

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
            --bg0: #030712;
            --bg1: #071124;
            --ink: #e5e7eb;
            --muted: rgba(226,232,240,0.78);
            --muted2: rgba(226,232,240,0.62);
            --line: rgba(148,163,184,0.18);
            --cyan: #38bdf8;
            --vio: #a855f7;
            --good: #22c55e;
            --warn: #f59e0b;
            --bad: #ef4444;
            --shadow: 0 28px 110px rgba(0,0,0,0.55);
            --shadow2: 0 14px 50px rgba(0,0,0,0.40);
            --r: 24px;
          }

          html { scroll-behavior: smooth; }
          * { box-sizing: border-box; }

          .reveal {
            opacity: 0;
            transform: translateY(14px);
            transition: opacity 720ms cubic-bezier(.2,.8,.2,1), transform 720ms cubic-bezier(.2,.8,.2,1);
          }
          .reveal.in { opacity: 1; transform: translateY(0); }

          @keyframes shimmer { 0% { transform: translateX(-140%); } 100% { transform: translateX(140%); } }
          @keyframes pulse { 0% { transform: scale(1); opacity: .65; } 50% { transform: scale(1.03); opacity: .9; } 100% { transform: scale(1); opacity: .65; } }
          @keyframes floaty { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }

          .wrap {
            min-height: 100vh;
            background:
              radial-gradient(900px 540px at 15% 10%, rgba(56,189,248,0.18), rgba(0,0,0,0) 55%),
              radial-gradient(760px 460px at 85% 15%, rgba(168,85,247,0.16), rgba(0,0,0,0) 55%),
              linear-gradient(180deg, var(--bg0) 0%, var(--bg1) 45%, #050816 100%);
            color: var(--ink);
            padding: 36px 18px 140px;
          }
          .container { max-width: 1180px; margin: 0 auto; }

          .pill {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(56,189,248,0.22);
            box-shadow: 0 12px 40px rgba(0,0,0,0.35);
            font-weight: 900;
            font-size: 12px;
            letter-spacing: .14em;
            text-transform: uppercase;
            color: var(--cyan);
            backdrop-filter: blur(12px);
          }

          .cta {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 16px 34px;
            border-radius: 999px;
            background: linear-gradient(135deg, var(--cyan), #2563eb, #0b1020);
            border: 1px solid rgba(56,189,248,0.55);
            color: #ecfeff;
            font-size: 17px;
            font-weight: 950;
            letter-spacing: -0.01em;
            text-decoration: none;
            box-shadow: 0 26px 70px rgba(56,189,248,0.22);
            transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
            overflow: hidden;
          }
          .cta:hover { transform: translateY(-2px); filter: saturate(1.08); box-shadow: 0 30px 80px rgba(56,189,248,0.28); }
          .cta::after {
            content: "";
            position: absolute;
            top: -60%;
            left: -60%;
            width: 60%;
            height: 220%;
            background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.25), rgba(255,255,255,0));
            transform: rotate(18deg) translateX(-140%);
            animation: shimmer 2.6s ease-in-out infinite;
          }

          .link { color: rgba(191,219,254,0.95); font-weight: 800; text-decoration: none; }
          .link:hover { text-decoration: underline; }

          .hero {
            position: relative;
            overflow: hidden;
            border-radius: calc(var(--r) + 10px);
            border: 1px solid rgba(148,163,184,0.20);
            background:
              radial-gradient(1200px 700px at 20% -5%, rgba(56,189,248,0.22), rgba(0,0,0,0) 60%),
              radial-gradient(1000px 620px at 90% 10%, rgba(168,85,247,0.20), rgba(0,0,0,0) 58%),
              linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.96));
            box-shadow: var(--shadow);
          }

          .heroGrid { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 26px; align-items: center; }
          @media (max-width: 980px) { .heroGrid { grid-template-columns: 1fr; } }

          .blob {
            position: absolute;
            inset: -260px -260px auto auto;
            width: 640px;
            height: 640px;
            border-radius: 999px;
            background: radial-gradient(circle at 30% 30%, rgba(56,189,248,0.36), rgba(168,85,247,0.20) 55%, rgba(255,255,255,0) 72%);
            filter: blur(6px);
            animation: pulse 5.8s ease-in-out infinite;
            pointer-events: none;
          }
          .gridFX {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px);
            background-size: 86px 86px;
            mask-image: radial-gradient(circle at 30% 15%, rgba(0,0,0,0.30), rgba(0,0,0,0) 62%);
            pointer-events: none;
          }

          .h1 { margin: 18px 0 14px; font-size: 62px; line-height: 1.03; font-weight: 950; letter-spacing: -0.03em; }
          @media (max-width: 980px) { .h1 { font-size: 46px; } }
          .grad { background: linear-gradient(90deg, var(--cyan), #60a5fa, var(--vio)); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .sub { font-size: 18px; line-height: 1.75; color: var(--muted); max-width: 720px; }
          .micro { margin-top: 12px; font-size: 13px; color: var(--muted2); }

          .cockpit {
            padding: 18px;
            border-radius: 26px;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04));
            border: 1px solid rgba(148,163,184,0.18);
            box-shadow: 0 26px 80px rgba(0,0,0,0.45);
          }
          .cockpitTop { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 14px; }
          @media (max-width: 980px) { .cockpitTop { grid-template-columns: 1fr; } }

          .dial {
            position: relative;
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.18);
            background: rgba(2,6,23,0.55);
            padding: 18px;
            overflow: hidden;
          }
          .ring {
            width: 160px;
            height: 160px;
            border-radius: 999px;
            background: conic-gradient(var(--good) 0%, var(--warn) 35%, var(--bad) 72%, rgba(148,163,184,0.14) 100%);
            filter: drop-shadow(0 0 22px rgba(56,189,248,0.18));
            position: relative;
          }
          .ring::after {
            content: "";
            position: absolute;
            inset: 14px;
            border-radius: 999px;
            background: rgba(2,6,23,0.92);
            border: 1px solid rgba(148,163,184,0.14);
          }
          .score { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
          .score b { font-size: 38px; letter-spacing: -0.02em; }
          .score div { font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: rgba(226,232,240,0.62); margin-top: 2px; }

          .stat { border-radius: 16px; border: 1px solid rgba(148,163,184,0.16); background: rgba(2,6,23,0.55); padding: 14px; display: grid; gap: 10px; }
          .row { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 10px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(148,163,184,0.10); }
          .row span { color: rgba(226,232,240,0.78); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .badge { min-width: 48px; text-align: center; padding: 6px 10px; border-radius: 999px; font-weight: 950; font-size: 12px; letter-spacing: .10em; text-transform: uppercase; border: 1px solid rgba(148,163,184,0.16); }
          .bad { background: rgba(239,68,68,0.14); color: rgba(254,202,202,0.95); border-color: rgba(239,68,68,0.26); }
          .warn { background: rgba(245,158,11,0.14); color: rgba(254,243,199,0.95); border-color: rgba(245,158,11,0.26); }

          .feed { margin-top: 14px; display: grid; gap: 10px; }
          .event { border-radius: 16px; border: 1px solid rgba(148,163,184,0.14); background: rgba(2,6,23,0.55); padding: 12px; display: grid; gap: 6px; box-shadow: 0 12px 36px rgba(0,0,0,0.35); transition: transform 220ms ease, border-color 220ms ease; }
          .event:hover { transform: translateY(-2px); border-color: rgba(56,189,248,0.22); }
          .etype { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 950; }
          .emsg { color: rgba(226,232,240,0.90); font-size: 14px; line-height: 1.5; }
          .esub { color: rgba(226,232,240,0.62); font-size: 12px; }

          .band { margin-top: 26px; padding: 26px; border-radius: calc(var(--r) + 10px); border: 1px solid rgba(148,163,184,0.16); background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03)); box-shadow: 0 22px 70px rgba(0,0,0,0.42); }

          .sectionTitle { font-size: 42px; font-weight: 950; letter-spacing: -0.03em; margin: 0 0 12px; }
          .sectionSub { color: var(--muted); line-height: 1.8; font-size: 16px; margin: 0; max-width: 940px; }
        `}</style>
      </Head>

      <main className="wrap">
        <div className="container">
          <section
            id="vendor-risk-management"
            className="hero reveal in"
            data-reveal
            onMouseMove={onMouseMove}
            onMouseLeave={() => setParallax({ x: 0, y: 0 })}
            style={{ padding: "72px 54px" }}
          >
            <div className="blob" style={{ transform: `translate3d(${parallax.x * 22}px, ${parallax.y * -16}px, 0)` }} />
            <div className="gridFX" />

            <div className="heroGrid">
              <div>
                <div className="pill">Property Management · Owner-Safe Compliance</div>

                <h1 className="h1">
                  <span className="grad">Vendor Risk Cockpit</span>
                  <br />
                  built for property portfolios.
                </h1>

                <p className="sub">
                  Instantly see insurance exposure, non-compliance, and owner risk — before audits, claims, or automation.
                  Nothing runs until you approve.
                </p>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", marginTop: 22 }}>
                  <Link href="/signup?industry=property_management" className="cta">
                    Enter the Risk Cockpit
                  </Link>
                  <Link href="#how-it-works" className="link">
                    See how it works →
                  </Link>
                </div>

                <div className="micro">
                  No demos. No sales calls. Operational in minutes. Preview everything before it runs.
                </div>
              </div>

              <div style={{ animation: "floaty 5.1s ease-in-out infinite" }}>
                <div className="cockpit">
                  <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(191,219,254,0.9)", marginBottom: 12 }}>
                    Live Compliance Snapshot
                  </div>

                  <div className="cockpitTop">
                    <div className="dial">
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ position: "relative" }}>
                          <div className="ring" />
                          <div className="score">
                            <div>
                              <b>{cockpit.score}</b>
                              <div>Overall score</div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 950, color: "rgba(226,232,240,0.72)" }}>
                            Owner exposure
                          </div>
                          <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: "-0.02em", marginTop: 8 }}>
                            {cockpit.exposure}
                          </div>
                          <div style={{ marginTop: 10, color: "rgba(226,232,240,0.62)", fontSize: 13, lineHeight: 1.5 }}>
                            Updates continuously as vendors upload COIs.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="stat">
                      <div className="row">
                        <span>Non-compliant vendors</span>
                        <div className="badge bad">{cockpit.nonCompliant}</div>
                      </div>
                      <div className="row">
                        <span>Expiring in 30 days</span>
                        <div className="badge warn">{cockpit.exp30}</div>
                      </div>
                      <div className="row">
                        <span>Missing endorsements</span>
                        <div className="badge warn">{cockpit.missingEnd}</div>
                      </div>

                      <div style={{ marginTop: 2, fontSize: 12, color: "rgba(226,232,240,0.62)" }}>
                        Visibility first. Automation only when you approve.
                      </div>
                    </div>
                  </div>

                  <div className="feed">
                    {cockpit.feed.map((e, i) => (
                      <div key={e.type + i} className="event">
                        <div className="etype" style={{ color: e.tone === "danger" ? "rgba(254,202,202,0.95)" : "rgba(254,243,199,0.95)" }}>
                          {e.type}
                        </div>
                        <div className="emsg">{e.msg}</div>
                        <div className="esub">{e.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="reveal" data-reveal style={{ padding: "26px 8px 0" }}>
            <div className="band">
              <div style={{ fontSize: 14, fontWeight: 900, color: "rgba(226,232,240,0.82)" }}>
                Built for operators accountable to owners, boards, and audits.
              </div>
              <div style={{ marginTop: 8, color: "rgba(226,232,240,0.62)", lineHeight: 1.7 }}>
                This is not “COI tracking.” It’s owner-visible risk intelligence — with control-first automation.
              </div>
            </div>
          </section>

          <section id="vendor-insurance-risk" className="reveal" data-reveal style={{ padding: "58px 8px 0" }}>
            <h2 className="sectionTitle">Vendor insurance risk doesn’t fail loudly.</h2>
            <p className="sectionSub">
              It fails quietly — until an audit, a claim, or an owner question exposes it all at once.
              COIs expire. Vendors delay renewals. Endorsements get missed. Spreadsheets drift.
            </p>
          </section>

          <section id="control-first-automation" className="reveal" data-reveal style={{ padding: "22px 8px 0" }}>
            <div className="band">
              <div style={{ fontSize: 46, fontWeight: 950, letterSpacing: "-0.03em", marginBottom: 10 }}>
                Most platforms automate first.<br/>We show you the truth first.
              </div>

              <p style={{ color: "rgba(226,232,240,0.72)", lineHeight: 1.8, margin: 0, maxWidth: 980 }}>
                Instead of blind enforcement, you get instant exposure, exact gaps, and previewed actions — then you decide when automation starts.
              </p>

              <div style={{ marginTop: 18 }}>
                <Link href="/signup?industry=property_management" className="cta">
                  View My Portfolio Risk
                </Link>
                <div className="micro">
                  No demos. No sales calls. Nothing runs without approval.
                </div>
              </div>
            </div>
          </section>

          <section id="how-it-works" className="reveal" data-reveal style={{ padding: "64px 8px 0" }}>
            <h2 className="sectionTitle">A cockpit, not a spreadsheet.</h2>
            <p className="sectionSub">
              Upload vendors or COIs → see exposure across the portfolio → preview reminders and escalations → activate automation when comfortable.
            </p>
          </section>

          <section id="insurance-compliance-governance" className="reveal" data-reveal style={{ padding: "78px 8px 0" }}>
            <div className="band" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 950, letterSpacing: "-0.03em", marginBottom: 10 }}>
                Full visibility. Full control. Always.
              </div>

              <p style={{ margin: "0 auto 16px", maxWidth: 860, color: "rgba(226,232,240,0.72)", lineHeight: 1.75 }}>
                Nothing is sent automatically. Every reminder, renewal, and escalation is visible before it runs.
              </p>

              <p style={{ margin: "0 0 26px", color: "rgba(226,232,240,0.72)" }}>
                You decide when automation starts — or if it starts at all.
              </p>

              <Link href="/signup?industry=property_management" className="cta">
                Enter the Risk Cockpit
              </Link>

              <div className="micro" style={{ marginTop: 12 }}>
                See risk first. Activate automation when you’re ready.
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
