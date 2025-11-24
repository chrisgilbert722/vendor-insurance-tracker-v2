// pages/pricing.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function PricingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);

  const monthlyPrice = 399;
  const annualPrice = 3999;
  const savings = (12 * monthlyPrice) - annualPrice;

  function startSignup() {
    router.push("/auth/signup");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.15), transparent 35%), linear-gradient(180deg,#020617,#000)",
        color: "#e5e7eb",
        padding: "60px 18px",
        position: "relative",
      }}
    >
      {/* AMBIENT AURAS */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1100px",
          height: "1100px",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)",
          filter: "blur(160px)",
          zIndex: 0,
        }}
      />

      {/* HEADER */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 40,
          position: "relative",
          zIndex: 2,
        }}
      >
        <h1
          style={{
            fontSize: 52,
            marginBottom: 18,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            background: "linear-gradient(90deg,#38bdf8,#a5b4fc,#ffffff)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Simple, Transparent Pricing
        </h1>
        <p
          style={{
            fontSize: 18,
            maxWidth: 720,
            margin: "0 auto",
            color: "#cbd5f5",
          }}
        >
          No contracts. No onboarding fees. No hidden charges.  
          Just powerful AI-driven COI compliance automation.
        </p>
      </div>

      {/* ANNUAL TOGGLE */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 30,
        }}
      >
        <div
          style={{
            display: "flex",
            padding: 4,
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "rgba(15,23,42,0.7)",
          }}
        >
          <button
            onClick={() => setAnnual(false)}
            style={{
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
              background: !annual
                ? "linear-gradient(90deg,#3b82f6,#1d4ed8)"
                : "transparent",
              color: !annual ? "#fff" : "#9ca3af",
              border: "none",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            style={{
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
              background: annual
                ? "linear-gradient(90deg,#3b82f6,#1d4ed8)"
                : "transparent",
              color: annual ? "#fff" : "#9ca3af",
              border: "none",
            }}
          >
            Annual (Save ${savings})
          </button>
        </div>
      </div>

      {/* PRICING GRID */}
      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
          maxWidth: 1100,
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* PRO PLAN */}
        <div
          style={{
            borderRadius: 24,
            padding: 28,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.35)",
            boxShadow:
              "0 18px 50px rgba(15,23,42,0.8), 0 0 40px rgba(56,189,248,0.25)",
          }}
        >
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>Pro</h2>
          <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 14 }}>
            Perfect for property managers, GCs, and compliance teams.
          </p>

          <div style={{ marginBottom: 26 }}>
            <span style={{ fontSize: 40, fontWeight: 700 }}>
              {annual ? `$${annualPrice}` : `$${monthlyPrice}`}
            </span>
            <span style={{ fontSize: 16, marginLeft: 6, color: "#94a3b8" }}>
              {annual ? "/yr" : "/mo"}
            </span>
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              marginBottom: 26,
              fontSize: 14,
              color: "#cbd5f5",
              lineHeight: 1.6,
            }}
          >
            <li>✔ Unlimited COI uploads</li>
            <li>✔ Full AI COI & endorsement scanning</li>
            <li>✔ Automated alerts & expiring policy detection</li>
            <li>✔ Rule Engine V2</li>
            <li>✔ Vendor upload links</li>
            <li>✔ Multi-organization support</li>
            <li>✔ Priority support</li>
          </ul>

          <button
            onClick={startSignup}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 999,
              border: "1px solid rgba(59,130,246,0.9)",
              background:
                "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e0f2fe",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Start Free Trial →
          </button>
        </div>

        {/* ENTERPRISE PLAN */}
        <div
          style={{
            borderRadius: 24,
            padding: 28,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.35)",
            boxShadow:
              "0 18px 50px rgba(15,23,42,0.8), 0 0 40px rgba(168,85,247,0.25)",
          }}
        >
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>Enterprise</h2>
          <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 14 }}>
            For high-volume orgs needing deeper automation.
          </p>

          <div style={{ marginBottom: 26 }}>
            <span style={{ fontSize: 40, fontWeight: 700 }}>$699+</span>
            <span style={{ fontSize: 16, marginLeft: 6, color: "#94a3b8" }}>
              /mo
            </span>
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              marginBottom: 26,
              fontSize: 14,
              color: "#cbd5f5",
              lineHeight: 1.6,
            }}
          >
            <li>✔ Everything in Pro</li>
            <li>✔ Priority SLA</li>
            <li>✔ Dedicated account manager</li>
            <li>✔ Advanced rule engine (custom)</li>
            <li>✔ SSO / SCIM integration</li>
            <li>✔ API & webhooks</li>
            <li>✔ Yardi / Procore / AppFolio Integration</li>
          </ul>

          <button
            onClick={() => router.push("/auth/signup")}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 999,
              border: "1px solid rgba(168,85,247,0.9)",
              background:
                "radial-gradient(circle at top left,#a855f7,#6d28d9,#0f172a)",
              color: "#f3e8ff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Contact Sales →
          </button>
        </div>
      </div>

      {/* TRUST BADGES */}
      <div
        style={{
          marginTop: 60,
          textAlign: "center",
          color: "#9ca3af",
        }}
      >
        <p style={{ fontSize: 14, marginBottom: 6 }}>
          Trusted By Compliance Teams & Property Managers
        </p>
        <div
          style={{
            display: "flex",
            gap: 18,
            justifyContent: "center",
            flexWrap: "wrap",
            opacity: 0.75,
          }}
        >
          <span>🔒 Bank-Level Security</span>
          <span>⚡ AI-Powered Automation</span>
          <span>📄 Unlimited COIs</span>
          <span>💬 Fast Support</span>
        </div>
      </div>
    </div>
  );
}
