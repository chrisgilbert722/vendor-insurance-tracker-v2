// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const url = window.location.href;

      // Exchange the code from the URL for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(url);

      if (error) {
        console.error("Callback exchange error:", error);
        router.replace("/auth/login");
        return;
      }

      // Success — user is logged in
      router.replace("/dashboard");
    }

    run();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top left,#020617 0%, #000)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#e5e7eb",
        fontSize: 20,
      }}
    >
      Authenticating…
    </div>
  );
}
