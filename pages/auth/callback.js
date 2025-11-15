import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function finalize() {
      console.log("🔄 Running callback flow...");

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log("❌ No session — redirecting to login");
        router.replace("/auth/login");
        return;
      }

      console.log("✅ Session found in callback:", session);

      // Sync user to Neon  
      try {
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: session.user }),
        });
        console.log("✅ User synced from callback");
      } catch (err) {
        console.error("❌ sync-user failed in callback:", err);
      }

      router.replace("/dashboard");
    }

    finalize();
  }, [router]);

  return (
    <div style={{ padding: "40px" }}>
      <p>Signing you in...</p>
    </div>
  );
}
