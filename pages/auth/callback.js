// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      // 1️⃣ Extract URL fragment (#access_token=....)
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        console.error("⚠️ exchangeCodeForSession error:", error);
        router.replace("/auth/login");
        return;
      }

      // 2️⃣ If session exists → redirect
      if (data?.session) {
        router.replace("/dashboard");
        return;
      }

      // 3️⃣ Fallback listener
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session) router.replace("/dashboard");
      });
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
