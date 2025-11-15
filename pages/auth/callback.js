import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function finalizeLogin() {
      // 1️⃣ Fetch existing session (OTP login creates this BEFORE callback)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If user somehow hits callback without a session, send back to login
      if (!session) {
        router.push("/auth/login");
        return;
      }

      // 2️⃣ Store user session locally (for frontend checks / convenience)
      localStorage.setItem("sb_session", JSON.stringify(session));

      // 3️⃣ Sync Supabase user → Neon users table
      try {
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: session.user }),
        });
      } catch (err) {
        console.error("sync-user failed:", err);
      }

      // 4️⃣ Redirect to dashboard
      router.push("/dashboard");
    }

    finalizeLogin();
  }, [router]);

  return (
    <div style={{ padding: "40px" }}>
      <h2>Signing you in...</h2>
      <p>You may close this tab if nothing happens.</p>
      <p>
        Or go to the <a href="/dashboard">Dashboard</a>.
      </p>
    </div>
  );
}
