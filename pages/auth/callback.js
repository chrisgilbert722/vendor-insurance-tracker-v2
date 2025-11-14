import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function finishLogin() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      // Save session client-side
      localStorage.setItem("sb_session", JSON.stringify(session));

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
