// pages/property-management.js
// ============================================================
// PROPERTY MANAGEMENT FUNNEL — SHOWSTOPPER EDITION (Light + Premium)
// Goal: Stripe-level polish (motion + hierarchy) while keeping ALL sales logic
// ============================================================

import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";

export default function PropertyManagementLanding() {
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
    return () => io.disconnect();
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
        `}</style>
      </Head>

      <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#ffffff 0%, #f8fafc 38%, #eef2ff 100%)", color: "var(--ink)", padding: "28px 18px 120px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <section id="vendor-risk-management" className="heroWrap" style={{ padding: "78px 54px" }}>
            <div className="blob" />
            <div className="grid2">
              <div className="reveal in" data-reveal>
                <div className="pill">Vendor Risk Intelligence Platform</div>
                <h1 style={{ marginTop: 18, fontSize: 62, lineHeight: 1.04, fontWeight: 950, letterSpacing: "-0.03em", color: "var(--ink)", marginBottom: 18 }}>
                  Real-Time Vendor Risk<br/>Intelligence for Property<br/>Portfolios
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
                    <MiniRow label="Non-compliant vendors" value="12" tone="danger" />
                    <MiniRow label="Policies expiring soon" value="7" tone="warn" />
                    <MiniRow label="Owner exposure" value="High" tone="danger" />
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
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 14, padding: "14px 14px", borderRadius: 16, border: "1px solid rgba(15,23,42,0.10)", background: "rgba(255,255,255,0.85)" }}>
      <div style={{ fontSize: 15, color: "rgba(15,23,42,0.72)" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: toneColor, padding: "6px 10px", borderRadius: 999, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.06)" }}>
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
