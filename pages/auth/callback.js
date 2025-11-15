import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function finalizeLogin() {

      console.log("CALLBACK: Checking Supabase session…");

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      console.log("CALLBACK SESSION:", session);
      console.log("CALLBACK ERROR:", error);

      if (!session) {
        console.log("No session → redirecting to login");
        router.replace("/auth/login");
        return;
      }

      console.log("Session found, syncing to Neon...");

      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: session.user }),
      });

      console.log("Sync complete → redirecting to dashboard");
      router.replace("/dashboard");
    }

    finalizeLogin();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2>Signing you in…</h2>
    </div>
  );
}
