// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      try {
        // Exchange token in URL for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("[callback] exchange error:", error.message);
          router.replace("/auth/login");
          return;
        }

        // Redirect after successful login
        const redirect =
          typeof router.query.redirect === "string"
            ? router.query.redirect
            : "/dashboard";

        router.replace(redirect);
      } catch (err) {
        console.error("[callback] unexpected:", err);
        router.replace("/auth/login");
      }
    }

    run();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "#e5e7eb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)",
      }}
    >
      <div style={{ fontSize: 22 }}>Authenticating…</div>
    </div>
  );
}
