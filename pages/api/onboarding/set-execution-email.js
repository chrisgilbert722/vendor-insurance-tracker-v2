// pages/api/onboarding/set-execution-email.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, email } = req.body;

    if (!orgId || !email) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or email",
      });
    }

    // 🔐 Server-side Supabase (service role)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from("organizations")
      .update({ execution_email: email })
      .eq("uuid", orgId);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  }
}
