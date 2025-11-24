// pages/billing/success.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function BillingSuccess() {
  const router = useRouter();
  const { email, name, company } = router.query;

  const [msg, setMsg] = useState("Activating your trial…");

  useEffect(() => {
    if (!email) return;

    async function activateTrial() {
      try {
        setMsg("Creating your account…");

        // 1️⃣ Create / update Supabase user record
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: true,
              data: {
                name,
                company,
                trial_active: true,
                subscription_status: "trialing",
                trial_ends_at: getTrialEndDate(14), // 14 days from now
              },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

        if (signInError) {
          console.error("[success] signInWithOtp error:", signInError);
          setMsg("Could not send login link.");
          return;
        }

        setMsg("Magic link sent — check your email!");

        // Smooth cinematic redirect
        setTimeout(() => {
          router.replace(`/auth/login?email=${encodeURIComponent(email)}`);
        }, 2000);
      } catch (err) {
        console.error("[billing/success] unexpected:", err);
        setMsg("Something went wrong.");
      }
    }

    activateTrial();
  }, [email, name, company, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#e5e7eb",
        fontSize: 18,
      }}
    >
      <div
        style={{
          padding: 24,
          borderRadius: 22,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow:
            "0 20px 45px rgba(15,23,42,0.96),0 0 26px rgba(56,189,248,0.25)",
          textAlign: "center",
          width: "90%",
          maxWidth: 420,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
        <div>{msg}</div>
      </div>
    </div>
  );
}

// Helper: compute trial end date
function getTrialEndDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
