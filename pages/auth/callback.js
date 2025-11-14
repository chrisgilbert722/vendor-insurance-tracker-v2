import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function finishLogin() {
      // 1️⃣ Create a session from the magic link
      await supabase.auth.exchangeCodeForSession(window.location.href);

      // 2️⃣ Now the session exists, fetch it
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      // 3️⃣ Store locally for UI
      localStorage.setItem("sb_session", JSON.stringify(session));

      // 4️⃣ Sync user to Neon DB
      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: session.user }),
      });

      // 5️⃣ Redirect to dashboard
      router.push("/dashboard");
    }

    finishLogin();
  }, [router]);

  return (
    <div style={{ padding: "40px" }}>
      <p>Signing you in...</p>
    </div>
  );
}
