import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function finalizeLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: session.user }),
      });

      router.replace("/dashboard");
    }

    finalizeLogin();
  }, []);

  return (
    <div style={{ padding: "40px" }}>
      <h2>Signing you in...</h2>
    </div>
  );
}
