// components/billing/TrialBanner.js
// ============================================================
// TRIAL BANNER — Shows "Trial: X days left" ONLY when:
// 1. Active Stripe subscription exists
// 2. Subscription status is "trialing"
// NO fake trial badges without real Stripe subscription
// ============================================================

import { useTrialStatus } from "../../lib/useTrialStatus";
import { useRouter } from "next/router";

export default function TrialBanner() {
  const router = useRouter();
  const { trial, loading, isPaid, daysLeft } = useTrialStatus();

  // Don't show if loading
  if (loading) return null;

  // Don't show if no trial data or no subscription
  if (!trial) return null;

  // CRITICAL: Only show if subscription exists and is trialing
  // billing_status must be "trial" (not "none", "error", etc.)
  if (trial.billing_status !== "trial") return null;

  // Don't show if already paid (active subscription past trial)
  if (isPaid) return null;

  // Don't show on billing/onboarding/auth pages
  const pathname = router.pathname;
  if (
    pathname.startsWith("/billing") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth")
  ) {
    return null;
  }

  const urgentColor = daysLeft <= 3 ? "#fb7185" : daysLeft <= 7 ? "#facc15" : "#38bdf8";

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 1000,
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${urgentColor}55`,
        background: "rgba(15,23,42,0.95)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
        color: "#e5e7eb",
        boxShadow: `0 4px 20px ${urgentColor}22`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: urgentColor,
          boxShadow: `0 0 8px ${urgentColor}`,
          animation: daysLeft <= 3 ? "pulse 1.5s infinite" : "none",
        }}
      />
      <span>
        Trial:{" "}
        <strong style={{ color: urgentColor }}>
          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
        </strong>
      </span>
      <button
        onClick={() => router.push("/billing/upgrade")}
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(34,197,94,0.8)",
          background: "linear-gradient(90deg,#22c55e,#16a34a)",
          color: "#052e16",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Upgrade
      </button>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
