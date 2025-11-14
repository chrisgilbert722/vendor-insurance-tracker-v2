import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function finishLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      localStorage.setItem("sb_session", JSON.stringify(session));

      // Sync Supabase user → Neon DB
      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: session.user }),
      });

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
