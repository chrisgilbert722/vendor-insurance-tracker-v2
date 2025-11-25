// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Exchange the code in the URL for a real session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("[auth/callback] exchange error:", error);
          router.replace("/auth/login");
          return;
        }

        // Optional: read redirect target from query (?redirect=/something)
        const redirect =
          typeof router.query.redirect === "string"
            ? router.query.redirect
            : "/dashboard";

        // If we have a valid session now, go to redirect target
        if (data?.session) {
          router.replace(redirect);
          return;
        }

        // Fallback: if session not immediately available, listen once more
        supabase.auth.onAuthStateChange((_event, newSession) => {
          if (newSession) {
            router.replace(redirect);
          }
        });
      } catch (err) {
        console.error("[auth/callback] unexpected error:", err);
        router.replace("/auth/login");
      }
    }

    handleCallback();
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
