// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const hash = router.asPath.split("#")[1]; // everything after #
      const params = new URLSearchParams(hash);
      const token = params.get("access_token");
      const refresh = params.get("refresh_token");

      if (!token) {
        console.error("No access token in URL");
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refresh,
      });

      if (error) {
        console.error("Auth error:", error);
        router.replace("/auth/login");
        return;
      }

      // Redirect to dashboard
      router.replace("/dashboard");
    }

    // Run once router has hash
    if (router.asPath.includes("#")) {
      handleCallback();
    }
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
