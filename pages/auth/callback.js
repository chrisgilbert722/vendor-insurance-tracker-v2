// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const code = router.query.code;

      if (!code) {
        console.log("No code in URL");
        router.replace("/auth/login");
        return;
      }

      console.log("Exchanging code for session…");

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Exchange error:", error);
        router.replace("/auth/login");
        return;
      }

      console.log("Session created:", data);

      // redirect to dashboard or provided redirect param
      const redirectTo = router.query.redirect || "/dashboard";
      router.replace(redirectTo);
    }

    if (router.isReady) run();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#e5e7eb",
        background: "radial-gradient(circle at top left,#020617,#000)"
      }}
    >
      <div style={{ fontSize: 22 }}>Authenticating…</div>
    </div>
  );
}
