// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      // Wait for router to hydrate
      if (!router.isReady) return;

      // Extract hash fragment
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token) {
        console.error("NO ACCESS TOKEN FOUND");
        router.replace("/auth/login");
        return;
      }

      // Set the session
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (error) {
        console.error("Auth setSession error:", error);
        router.replace("/auth/login");
        return;
      }

      // DONE — go to dashboard
      router.replace("/dashboard");
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
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)"
      }}
    >
      <div style={{ fontSize: 22 }}>Authenticating…</div>
    </div>
  );
}
