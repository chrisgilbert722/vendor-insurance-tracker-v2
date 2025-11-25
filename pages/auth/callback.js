// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      // This reads the tokens from the URL fragment (#access_token=...)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        router.replace("/auth/login");
        return;
      }

      if (session) {
        // Logged in successfully → redirect to dashboard
        router.replace("/dashboard");
        return;
      }

      // If no session yet, wait for Supabase to process it
      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession) {
          router.replace("/dashboard");
        }
      });
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
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)"
      }}
    >
      <div style={{ fontSize: 22 }}>Authenticating…</div>
    </div>
  );
}
