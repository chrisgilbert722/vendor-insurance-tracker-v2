import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function finalizeLogin() {
      // 1️⃣ Get existing session (OTP login already created it)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      // 2️⃣ Store user session locally (your original logic)
      localStorage.setItem("sb_session", JSON.stringify(session));

      // 3️⃣ Sync user with your Neon database (same as before)
      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: session.user }),
      });

      // 4️⃣ Redirect user to dashboard
      router.push("/dashboard");
    }

    finalizeLogin();
  }, [router]);

  return (
    <div style={{ padding: "40px" }}>
      <h2>Signing you in...</h2>
      <p>You may close this tab if nothing happens.</p>
    </div>
  );
}
