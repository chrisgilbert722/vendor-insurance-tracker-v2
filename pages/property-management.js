// pages/property-management.js
// ============================================================
// PROPERTY MANAGEMENT FUNNEL — V7 IRON MAN (FULL VISUAL COCKPIT)
// Goal: Full blown “what the hell did I just click” product cockpit that sells.
// ============================================================

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function PropertyManagementLanding() {
  const [tick, setTick] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [ownerModal, setOwnerModal] = useState(false);

  const sim = useMemo(() => {
    const t = tick;

    const score = Math.max(0, Math.min(100, Math.round(88 + 7 * Math.sin(t / 7))));
    const nonCompliant = 10 + Math.round(4 * (0.5 + 0.5 * Math.sin(t / 5)));
    const exp30 = 6 + Math.round(3 * (0.5 + 0.5 * Math.cos(t / 6)));
    const missingEnd = 3 + Math.round(2 * (0.5 + 0.5 * Math.sin(t / 9)));
    const limitGaps = 2 + Math.round(2 * (0.5 + 0.5 * Math.cos(t / 8)));
    const exposure = score >= 92 ? "Moderate" : "High";

    const vendors = 82 + Math.round(10 * (0.5 + 0.5 * Math.sin(t / 13)));
    const properties = 14 + Math.round(4 * (0.5 + 0.5 * Math.cos(t / 17)));
    const units = 1800 + Math.round(380 * (0.5 + 0.5 * Math.sin(t / 11)));

    const riskBars = [
      { k: "Non-compliant", v: nonCompliant, tone: "danger" },
      { k: "Expiring < 30d", v: exp30, tone: "warn" },
      { k: "Missing endorsements", v: missingEnd, tone: "warn" },
      { k: "Limit gaps", v: limitGaps, tone: "danger" },
    ];

    const feed = [
      { type: "OWNER EXPOSURE", tone: "danger", msg: "High owner exposure detected across portfolio", sub: "Executive summary updated" },
      { type: "EXPIRING", tone: "warn", msg: "COI expires in 17 days (HVAC contractor)", sub: "Renewal request drafted (not sent)" },
      { type: "MISSING AI", tone: "warn", msg: "Additional Insured endorsement missing (Plumbing)", sub: "Endorsement request prepared" },
      { type: "LIMIT GAP", tone: "danger", msg: "Coverage below contract requirement (Roofing)", sub: "Broker escalation previewed" },
      { type: "RESOLVED", tone: "good", msg: "Vendor renewed coverage (Landscaping)", sub: "Compliance restored" },
    ];
    const rot = t % feed.length;
    const rotated = feed.slice(rot).concat(feed.slice(0, rot));

    // Sparkline points
    const points = Array.from({ length: 30 }).map((_, i) => {
      const x = i / 29;
      const base = 0.60 + 0.16 * Math.sin((t + i) / 6) + 0.07 * Math.cos((t + i) / 4);
      const y = Math.max(0.16, Math.min(0.94, base));
      return { x, y };
    });

    // Resolve flow state (cycles every ~6 ticks)
    const phase = t % 6;
    const resolve = {
      stage: phase,
      label:
        phase <= 1 ? "Detect" :
        phase <= 3 ? "Preview" :
        phase <= 4 ? "Escalate" : "Resolved",
    };

    return { score, nonCompliant, exp30, missingEnd, limitGaps, exposure, vendors, properties, units, feed: rotated, points, riskBars, resolve };
  }, [tick]);

  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 750);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.14 });
    els.forEach(el => io.observe(el));
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
          :root{
            --bg0:#020617;
            --bg1:#071124;
            --ink:#e5e7eb;
            --muted:rgba(226,232,240,0.78);
            --muted2:rgba(226,232,240,0.62);
            --line:rgba(148,163,184,0.18);
            --glass:rgba(255,255,255,0.06);
            --glass2:rgba(255,255,255,0.10);
            --cyan:#38bdf8;
            --blue:#60a5fa;
            --vio:#a855f7;
            --good:#22c55e;
            --warn:#f59e0b;
            --bad:#ef4444;
            --shadow:0 28px 120px rgba(0,0,0,0.60);
            --shadow2:0 14px 52px rgba(0,0,0,0.42);
            --r:26px;
          }
          html{scroll-behavior:smooth;}
          *{box-sizing:border-box;}
          body{margin:0;}

          .wrap{
            min-height:100vh;
            background:
              radial-gradient(950px 560px at 18% 12%, rgba(56,189,248,0.22), rgba(0,0,0,0) 58%),
              radial-gradient(900px 520px at 82% 16%, rgba(168,85,247,0.22), rgba(0,0,0,0) 60%),
              linear-gradient(180deg,var(--bg0) 0%, var(--bg1) 52%, #050816 100%);
            color:var(--ink);
            padding:34px 18px 160px;
          }
          .container{max-width:1200px;margin:0 auto;}

          .reveal{opacity:0;transform:translateY(14px);transition:opacity 720ms cubic-bezier(.2,.8,.2,1),transform 720ms cubic-bezier(.2,.8,.2,1);}
          .reveal.in{opacity:1;transform:translateY(0);}

          @keyframes shimmer{0%{transform:translateX(-140%);}100%{transform:translateX(140%);}}
          @keyframes pulse{0%{transform:scale(1);opacity:.55;}50%{transform:scale(1.04);opacity:.95;}100%{transform:scale(1);opacity:.55;}}
          @keyframes floaty{0%{transform:translateY(0);}50%{transform:translateY(-10px);}100%{transform:translateY(0);}}
          @keyframes scan{0%{transform:translateY(-120%);}100%{transform:translateY(120%);}}

          .stickyTop{
            position: sticky;
            top: 14px;
            z-index: 30;
            margin-bottom: 14px;
          }
          .topBar{
            display:flex;align-items:center;justify-content:space-between;gap:12px;
            padding:12px 14px;border-radius:999px;
            background:rgba(2,6,23,0.70);
            border:1px solid rgba(148,163,184,0.22);
            box-shadow:0 18px 60px rgba(0,0,0,0.48);
            backdrop-filter: blur(12px);
          }
          .topBar b{letter-spacing:.12em;text-transform:uppercase;font-size:12px;color:rgba(191,219,254,0.92);}
          .topBar span{color:rgba(226,232,240,0.62);font-size:12px;}
          .topBar .actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}

          .cta{
            position:relative;
            display:inline-flex;align-items:center;justify-content:center;gap:10px;
            padding:14px 22px;border-radius:999px;
            background:linear-gradient(135deg,var(--cyan),#2563eb,#0b1020);
            border:1px solid rgba(56,189,248,0.55);
            color:#ecfeff;font-size:15px;font-weight:950;letter-spacing:-0.01em;text-decoration:none;
            box-shadow:0 26px 70px rgba(56,189,248,0.22);
            transition:transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
            overflow:hidden;
            white-space:nowrap;
          }
          .cta:hover{transform:translateY(-2px);filter:saturate(1.08);box-shadow:0 30px 80px rgba(56,189,248,0.28);}
          .cta::after{
            content:"";
            position:absolute;top:-60%;left:-60%;
            width:60%;height:220%;
            background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.25),rgba(255,255,255,0));
            transform:rotate(18deg) translateX(-140%);
            animation:shimmer 2.0s ease-in-out infinite;
          }
          .ghostBtn{
            cursor:pointer;
            padding:12px 16px;border-radius:999px;
            background:rgba(255,255,255,0.06);
            border:1px solid rgba(148,163,184,0.18);
            color:rgba(226,232,240,0.88);
            font-weight:900;font-size:13px;
            transition:transform 180ms ease, border-color 180ms ease;
          }
          .ghostBtn:hover{transform:translateY(-1px);border-color:rgba(56,189,248,0.28);}
          .link{color:rgba(191,219,254,0.95);font-weight:800;text-decoration:none;}
          .link:hover{text-decoration:underline;}

          .hero{
            position:relative;overflow:hidden;
            border-radius:calc(var(--r) + 12px);
            border:1px solid rgba(148,163,184,0.20);
            background:
              radial-gradient(1200px 700px at 20% -5%, rgba(56,189,248,0.22), rgba(0,0,0,0) 60%),
              radial-gradient(1000px 620px at 90% 10%, rgba(168,85,247,0.22), rgba(0,0,0,0) 60%),
              linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.96));
            box-shadow:var(--shadow);
          }
          .blob{
            position:absolute;inset:-280px -280px auto auto;
            width:720px;height:720px;border-radius:999px;
            background:radial-gradient(circle at 30% 30%, rgba(56,189,248,0.40), rgba(168,85,247,0.22) 55%, rgba(255,255,255,0) 72%);
            filter:blur(7px);
            animation:pulse 5.0s ease-in-out infinite;
            pointer-events:none;
          }
          .gridFX{
            position:absolute;inset:0;
            background-image:
              linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px);
            background-size:86px 86px;
            mask-image: radial-gradient(circle at 30% 15%, rgba(0,0,0,0.30), rgba(0,0,0,0) 62%);
            pointer-events:none;
          }
          .heroGrid{display:grid;grid-template-columns:1.05fr 0.95fr;gap:26px;align-items:stretch;}
          @media (max-width:980px){.heroGrid{grid-template-columns:1fr;}}

          .pill{
            display:inline-flex;align-items:center;gap:10px;
            padding:10px 14px;border-radius:999px;
            background:rgba(255,255,255,0.06);
            border:1px solid rgba(56,189,248,0.22);
            box-shadow:0 12px 40px rgba(0,0,0,0.35);
            font-weight:900;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
            color:var(--cyan);backdrop-filter:blur(12px);
          }

          .h1{margin:18px 0 14px;font-size:64px;line-height:1.03;font-weight:950;letter-spacing:-0.03em;}
          @media (max-width:980px){.h1{font-size:48px;}}
          .grad{background:linear-gradient(90deg,var(--cyan),var(--blue),var(--vio));-webkit-background-clip:text;background-clip:text;color:transparent;}
          .sub{font-size:18px;line-height:1.75;color:var(--muted);max-width:760px;}
          .micro{margin-top:12px;font-size:13px;color:var(--muted2);}

          .cockpit{
            padding:18px;border-radius:28px;
            background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
            border:1px solid rgba(148,163,184,0.18);
            box-shadow:0 26px 90px rgba(0,0,0,0.50);
            position:relative;
          }
          .scanLine{
            position:absolute;left:12px;right:12px;top:-40%;
            height:36%;
            border-radius:999px;
            background:linear-gradient(180deg, rgba(56,189,248,0), rgba(56,189,248,0.10), rgba(56,189,248,0));
            filter: blur(2px);
            animation: scan 2.6s linear infinite;
            pointer-events:none;
          }
          .cockpitTop{display:grid;grid-template-columns:0.9fr 1.1fr;gap:14px;}
          @media (max-width:980px){.cockpitTop{grid-template-columns:1fr;}}

          .panel{
            border-radius:22px;border:1px solid rgba(148,163,184,0.18);
            background:rgba(2,6,23,0.60);
            padding:18px;overflow:hidden;
          }

          .ring{
            width:162px;height:162px;border-radius:999px;
            background: conic-gradient(var(--good) 0%, var(--warn) 35%, var(--bad) 72%, rgba(148,163,184,0.14) 100%);
            filter: drop-shadow(0 0 22px rgba(56,189,248,0.18));
            position:relative;
          }
          .ring::after{
            content:"";position:absolute;inset:14px;border-radius:999px;
            background:rgba(2,6,23,0.92);border:1px solid rgba(148,163,184,0.14);
          }
          .score{
            position:absolute;inset:0;display:grid;place-items:center;text-align:center;
          }
          .score b{font-size:40px;letter-spacing:-0.02em;}
          .score div{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(226,232,240,0.62);margin-top:2px;}

          .stat{
            border-radius:18px;border:1px solid rgba(148,163,184,0.16);
            background:rgba(2,6,23,0.60);
            padding:14px;display:grid;gap:10px;
          }
          .row{
            display:flex;justify-content:space-between;align-items:center;gap:14px;
            padding:10px 10px;border-radius:14px;
            background:rgba(255,255,255,0.04);
            border:1px solid rgba(148,163,184,0.10);
          }
          .row span{color:rgba(226,232,240,0.78);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
          .badge{
            min-width:52px;text-align:center;
            padding:6px 10px;border-radius:999px;
            font-weight:950;font-size:12px;letter-spacing:.10em;text-transform:uppercase;
            border:1px solid rgba(148,163,184,0.16);
          }
          .bad{background:rgba(239,68,68,0.14);color:rgba(254,202,202,0.95);border-color:rgba(239,68,68,0.26);}
          .warn{background:rgba(245,158,11,0.14);color:rgba(254,243,199,0.95);border-color:rgba(245,158,11,0.26);}
          .good{background:rgba(34,197,94,0.14);color:rgba(187,247,208,0.95);border-color:rgba(34,197,94,0.26);}

          .sparkWrap{margin-top:12px;padding-top:12px;border-top:1px solid rgba(148,163,184,0.12);}
          .sparkTop{display:flex;justify-content:space-between;align-items:center;gap:12px;}
          .sparkTop b{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(226,232,240,0.72);}
          .sparkTop span{font-size:12px;color:rgba(226,232,240,0.55);}
          .spark{width:100%;height:62px;}

          .bars{margin-top:12px;display:grid;gap:10px;}
          .barRow{display:grid;grid-template-columns:140px 1fr 54px;gap:10px;align-items:center;}
          .barRow b{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(226,232,240,0.62);}
          .barTrack{height:10px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(148,163,184,0.10);overflow:hidden;}
          .barFill{height:100%;border-radius:999px;transition:width 620ms cubic-bezier(.2,.8,.2,1);}

          .feed{margin-top:14px;display:grid;gap:10px;}
          .event{
            border-radius:16px;border:1px solid rgba(148,163,184,0.14);
            background:rgba(2,6,23,0.60);
            padding:12px;display:grid;gap:6px;
            box-shadow:0 12px 36px rgba(0,0,0,0.35);
            transition:transform 220ms ease,border-color 220ms ease;
          }
          .event:hover{transform:translateY(-2px);border-color:rgba(56,189,248,0.24);}
          .etype{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:950;}
          .emsg{color:rgba(226,232,240,0.90);font-size:14px;line-height:1.5;}
          .esub{color:rgba(226,232,240,0.62);font-size:12px;}

          .band{
            margin-top:20px;padding:22px;border-radius:calc(var(--r) + 10px);
            border:1px solid rgba(148,163,184,0.16);
            background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
            box-shadow:0 22px 70px rgba(0,0,0,0.42);
          }
          .proofGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px;}
          @media (max-width:980px){.proofGrid{grid-template-columns:1fr;}}
          .proofCard{border-radius:18px;border:1px solid rgba(148,163,184,0.14);background:rgba(2,6,23,0.60);padding:16px;box-shadow:0 14px 44px rgba(0,0,0,0.35);}
          .proofCard b{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(191,219,254,0.9);}
          .proofCard div{margin-top:10px;font-size:30px;font-weight:950;letter-spacing:-0.02em;}
          .proofCard small{display:block;margin-top:6px;color:var(--muted2);line-height:1.6;}

          .resolveBand{margin-top:14px;padding:18px;border-radius:20px;border:1px solid rgba(148,163,184,0.14);background:rgba(2,6,23,0.60);}
          .resolveSteps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;marginTop:12px;}
          @media (max-width:980px){.resolveSteps{grid-template-columns:1fr 1fr;}}
          .rStep{border-radius:16px;padding:12px;border:1px solid rgba(148,163,184,0.12);background:rgba(255,255,255,0.04);}
          .rStep strong{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(226,232,240,0.68);}
          .rStep span{display:block;margin-top:8px;font-weight:950;}
          .activeStep{border-color:rgba(56,189,248,0.30);box-shadow:0 0 0 2px rgba(56,189,248,0.10), 0 18px 70px rgba(56,189,248,0.12);}

          .sectionTitle{font-size:42px;font-weight:950;letter-spacing:-0.03em;margin:0 0 12px;}
          .sectionSub{color:var(--muted);line-height:1.8;font-size:16px;margin:0;max-width:940px;}

          .modalBack{
            position:fixed;inset:0;background:rgba(0,0,0,0.62);
            display:flex;align-items:center;justify-content:center;
            z-index:60;padding:18px;
          }
          .modal{
            width:min(980px, 100%);
            border-radius:28px;
            border:1px solid rgba(148,163,184,0.20);
            background:linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.98));
            box-shadow:var(--shadow);
            overflow:hidden;
          }
          .modalTop{
            display:flex;align-items:center;justify-content:space-between;gap:12px;
            padding:18px 18px;border-bottom:1px solid rgba(148,163,184,0.14);
          }
          .modalTop b{letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:rgba(191,219,254,0.9);}
          .closeX{cursor:pointer;background:rgba(255,255,255,0.06);border:1px solid rgba(148,163,184,0.18);color:rgba(226,232,240,0.9);border-radius:12px;padding:10px 12px;font-weight:950;}
          .modalBody{padding:18px;}
          .reportGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
          @media (max-width:980px){.reportGrid{grid-template-columns:1fr;}}
          .reportCard{border-radius:18px;border:1px solid rgba(148,163,184,0.14);background:rgba(255,255,255,0.04);padding:14px;}
          .reportCard strong{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(226,232,240,0.70);}
          .reportCard div{margin-top:8px;color:rgba(226,232,240,0.88);line-height:1.6;}

          @media (prefers-reduced-motion: reduce){
            .reveal{transition:none !important;opacity:1 !important;transform:none !important;}
            .cta::after{animation:none !important;}
            .blob{animation:none !important;}
            .scanLine{animation:none !important;}
          }
        `}</style>
      </Head>

      <main className="wrap">
        <div className="container">
          {/* Sticky top action bar */}
          <div className="stickyTop">
            <div className="topBar">
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <b>PROPERTY RISK COCKPIT</b>
                <span>Owner-safe compliance · preview-first automation</span>
              </div>
              <div className="actions">
                <button className="ghostBtn" onClick={() => setOwnerModal(true)}>Preview Owner Report</button>
                <Link href="/signup?industry=property_management" className="cta">Enter the Cockpit</Link>
              </div>
            </div>
          </div>

          {/* HERO */}
          <section
            id="vendor-risk-management"
            className="hero reveal in"
            data-reveal
            onMouseMove={onMouseMove}
            onMouseLeave={() => setParallax({ x: 0, y: 0 })}
            style={{ padding: "72px 54px" }}
          >
            <div className="blob" style={{ transform: `translate3d(${parallax.x * 26}px, ${parallax.y * -18}px, 0)` }} />
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
                  <div className="scanLine" />
                  <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(191,219,254,0.9)", marginBottom: 12 }}>
                    Live Compliance Snapshot
                  </div>

                  <div className="cockpitTop">
                    <div className="panel" style={{ position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ position: "relative" }}>
                          <div className="ring" />
                          <div className="score">
                            <div>
                              <b>{sim.score}</b>
                              <div>Overall score</div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 950, color: "rgba(226,232,240,0.72)" }}>
                            Owner exposure
                          </div>
                          <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: "-0.02em", marginTop: 8 }}>
                            {sim.exposure}
                          </div>
                          <div style={{ marginTop: 10, color: "rgba(226,232,240,0.62)", fontSize: 13, lineHeight: 1.5 }}>
                            Updates continuously as vendors upload COIs.
                          </div>
                        </div>
                      </div>

                      <div className="sparkWrap">
                        <div className="sparkTop">
                          <b>Risk trend</b>
                          <span>last 30 days (simulated)</span>
                        </div>
                        <Sparkline points={sim.points} />
                      </div>

                      <div className="bars">
                        {sim.riskBars.map((r, idx) => (
                          <div key={r.k} className="barRow">
                            <b>{r.k}</b>
                            <div className="barTrack">
                              <div
                                className="barFill"
                                style={{
                                  width: `${Math.min(100, 18 + r.v * 6)}%`,
                                  background:
                                    r.tone === "danger"
                                      ? "linear-gradient(90deg, rgba(239,68,68,0.55), rgba(239,68,68,0.12))"
                                      : "linear-gradient(90deg, rgba(245,158,11,0.55), rgba(245,158,11,0.12))",
                                }}
                              />
                            </div>
                            <div className={`badge ${r.tone === "danger" ? "bad" : "warn"}`}>{r.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="stat">
                      <div className="row">
                        <span>Non-compliant vendors</span>
                        <div className="badge bad">{sim.nonCompliant}</div>
                      </div>
                      <div className="row">
                        <span>Expiring in 30 days</span>
                        <div className="badge warn">{sim.exp30}</div>
                      </div>
                      <div className="row">
                        <span>Missing endorsements</span>
                        <div className="badge warn">{sim.missingEnd}</div>
                      </div>

                      <div style={{ marginTop: 2, fontSize: 12, color: "rgba(226,232,240,0.62)" }}>
                        Visibility first. Automation only when you approve.
                      </div>

                      <div className="resolveBand">
                        <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 950, color: "rgba(191,219,254,0.9)" }}>
                          Resolve flow (simulated)
                        </div>

                        <div className="resolveSteps" style={{ marginTop: 12 }}>
                          <div className={`rStep ${sim.resolve.stage <= 1 ? "activeStep" : ""}`}>
                            <strong>Detect</strong>
                            <span>Gap found</span>
                          </div>
                          <div className={`rStep ${sim.resolve.stage >= 2 && sim.resolve.stage <= 3 ? "activeStep" : ""}`}>
                            <strong>Preview</strong>
                            <span>Drafted</span>
                          </div>
                          <div className={`rStep ${sim.resolve.stage === 4 ? "activeStep" : ""}`}>
                            <strong>Escalate</strong>
                            <span>Queued</span>
                          </div>
                          <div className={`rStep ${sim.resolve.stage >= 5 ? "activeStep" : ""}`}>
                            <strong>Resolved</strong>
                            <span>Cleared</span>
                          </div>
                        </div>

                        <div style={{ marginTop: 10, color: "rgba(226,232,240,0.62)", fontSize: 12 }}>
                          Nothing runs without approval.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="feed">
                    {sim.feed.slice(0, 4).map((e, i) => (
                      <div key={e.type + i} className="event">
                        <div className="etype" style={{ color: e.tone === "danger" ? "rgba(254,202,202,0.95)" : e.tone === "warn" ? "rgba(254,243,199,0.95)" : "rgba(187,247,208,0.95)" }}>
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

          {/* Authority + proof */}
          <section className="reveal" data-reveal style={{ padding: "22px 8px 0" }}>
            <div className="band">
              <div style={{ fontSize: 14, fontWeight: 900, color: "rgba(226,232,240,0.82)" }}>
                Built for operators accountable to owners, boards, and audits.
              </div>
              <div style={{ marginTop: 8, color: "rgba(226,232,240,0.62)", lineHeight: 1.7 }}>
                This is not “COI tracking.” It’s owner-visible risk intelligence — with control-first automation.
              </div>

              <div className="proofGrid">
                <div className="proofCard">
                  <b>Portfolio coverage</b>
                  <div>{sim.properties} properties</div>
                  <small>Visibility across locations, vendors, and risk states.</small>
                </div>
                <div className="proofCard">
                  <b>Vendor surface</b>
                  <div>{sim.vendors} vendors</div>
                  <small>COIs, endorsements, limits, renewals — continuously.</small>
                </div>
                <div className="proofCard">
                  <b>Unit footprint</b>
                  <div>{sim.units.toLocaleString()} units</div>
                  <small>Designed for owner-safe operations at scale.</small>
                </div>
              </div>
            </div>
          </section>

          {/* Short, sharp problem + close */}
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

          {ownerModal && (
            <div className="modalBack" onClick={() => setOwnerModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modalTop">
                  <b>Owner Report Preview</b>
                  <button className="closeX" onClick={() => setOwnerModal(false)}>Close</button>
                </div>
                <div className="modalBody">
                  <div className="reportGrid">
                    <div className="reportCard">
                      <strong>Portfolio exposure</strong>
                      <div>Owner exposure is <b style={{ color: "rgba(254,202,202,0.95)" }}>{sim.exposure}</b>. Non-compliance and expirations increase audit risk.</div>
                    </div>
                    <div className="reportCard">
                      <strong>Non-compliant vendors</strong>
                      <div><b>{sim.nonCompliant}</b> vendors require action. All actions are previewed before being sent.</div>
                    </div>
                    <div className="reportCard">
                      <strong>Expiring coverage</strong>
                      <div><b>{sim.exp30}</b> COIs expiring in 30 days. Renewal drafts prepared (not sent).</div>
                    </div>
                    <div className="reportCard">
                      <strong>Control & governance</strong>
                      <div>Nothing runs automatically. You approve automation and escalations.</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Link href="/signup?industry=property_management" className="cta">Enter the Cockpit</Link>
                    <a className="link" href="#vendor-risk-management">Back to cockpit →</a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

/* Sparkline */
function Sparkline({ points }) {
  const w = 560;
  const h = 62;
  const pad = 6;

  const d = points
    .map((p, i) => {
      const x = pad + p.x * (w - pad * 2);
      const y = pad + (1 - p.y) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(56,189,248,0.90)" />
          <stop offset="0.5" stopColor="rgba(96,165,250,0.90)" />
          <stop offset="1" stopColor="rgba(168,85,247,0.90)" />
        </linearGradient>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(56,189,248,0.18)" />
          <stop offset="1" stopColor="rgba(56,189,248,0)" />
        </linearGradient>
      </defs>

      <path d={d} fill="none" stroke="url(#sparkGrad)" strokeWidth="3.2" strokeLinecap="round" />
      <path d={`${d} L ${w - 6} ${h - 6} L 6 ${h - 6} Z`} fill="url(#sparkFill)" stroke="none" />
    </svg>
  );
}
