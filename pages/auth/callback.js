// pages/auth/callback.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Authenticating…");

  useEffect(() => {
    async function finishLogin() {
      try {
        // Let Supabase finish the magic-link session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[callback] session error:", error);
          setMessage("Login link expired or invalid.");
          return;
        }

        if (!data.session) {
          setMessage("Verifying login link…");
        } else {
          setMessage("Login complete. Redirecting…");
        }

        // Pull redirect target (default → /dashboard)
        const redirectTo =
          typeof router.query.redirect === "string"
            ? router.query.redirect
            : "/dashboard";

        // short delay for cinematic feel + session propagation
        setTimeout(() => {
          router.replace(redirectTo);
        }, 700);
      } catch (err) {
        console.error("[callback] unexpected:", err);
        setMessage("Something went wrong.");
      }
    }

    finishLogin();
  }, [router]);

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
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
        <div>{message}</div>
      </div>
    </div>
  );
}
