import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function finalizeLogin() {
      try {
        // 1️⃣ Finish the OTP login by exchanging the code
        await supabase.auth.exchangeCodeForSession(window.location.href);

        // 2️⃣ Now get the active session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/auth/login");
          return;
        }

        // 3️⃣ Sync user to your database
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: session.user }),
        });

        // 4️⃣ Redirect to dashboard
        router.replace("/dashboard");
      } catch (err) {
        console.error("Callback error:", err);
        router.replace("/auth/login");
      }
    }

    finalizeLogin();
  }, [router]);

  return (
    <div style={{ padding: "40px" }}>
      <h2>Finishing sign in...</h2>
      <p>Please wait.</p>
    </div>
  );
}
