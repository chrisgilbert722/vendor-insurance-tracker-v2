
// pages/pricing.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function PricingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);

  const monthlyPrice = 399;
  const annualPrice = 4999;
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
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1
          style={{
            fontSize: 52,
            marginBottom: 18,
            fontWeight: 700,
            background: "linear-gradient(90deg,#38bdf8,#a5b4fc,#ffffff)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Simple, Transparent Pricing
        </h1>
        <p style={{ fontSize: 18, maxWidth: 720, margin: "0 auto", color: "#cbd5f5" }}>
          Enterprise-grade vendor risk management — without enterprise friction.
        </p>
      </div>

      {/* TOGGLE */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 30 }}>
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
              background: !annual ? "linear-gradient(90deg,#3b82f6,#1d4ed8)" : "transparent",
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
              padding: "8px 16px",
              background: annual ? "linear-gradient(90deg,#3b82f6,#1d4ed8)" : "transparent",
              color: annual ? "#fff" : "#9ca3af",
              border: "none",
              cursor: "pointer",
            }}
          >
            Annual · Best Value
          </button>
        </div>
      </div>

      {/* PRICING */}
      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* PROFESSIONAL */}
        <div style={card}>
          <h2 style={title}>Professional</h2>
          <p style={subtitle}>For teams that need visibility, control, and audit safety.</p>
          <div style={price}>
            {annual ? `$${annualPrice}/yr` : `$${monthlyPrice}/mo`}
          </div>
          <ul style={list}>
            <li>Portfolio risk visibility</li>
            <li>COI & endorsement validation</li>
            <li>Preview-first enforcement</li>
            <li>Vendor upload links</li>
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
            Designed for complex, multi-property portfolios.
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

      <div style={{ marginTop: 60, textAlign: "center", color: "#9ca3af" }}>
        Competing platforms charge $10k–$15k/year · No demos · No contracts
      </div>
    </div>
  );
}

const card = {
  borderRadius: 24,
  padding: 28,
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(148,163,184,0.35)",
};

const title = { fontSize: 22, marginBottom: 6 };
const subtitle = { color: "#9ca3af", fontSize: 14, marginBottom: 14 };
const price = { fontSize: 40, fontWeight: 700, marginBottom: 20 };
const list = { listStyle: "none", padding: 0, marginBottom: 26, color: "#cbd5f5" };
const primary = {
  width: "100%",
  padding: "12px",
  borderRadius: 999,
  background: "linear-gradient(90deg,#3b82f6,#1d4ed8)",
  border: "none",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
const secondary = {
  ...primary,
  background: "linear-gradient(90deg,#a855f7,#6d28d9)",
};
