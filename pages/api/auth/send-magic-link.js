// pages/api/auth/send-magic-link.js
// Server-side Magic Link Sender (used for auto-invites during onboarding)

import { supabaseServer } from "@/lib/supabaseServer";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST method." });
  }

  try {
    const { email, redirectTo } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "Invalid email." });
    }

    const supabase = supabaseServer();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          redirectTo ||
          `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirect=/dashboard`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("[send-magic-link] Error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      message: "Magic link sent.",
    });
  } catch (err) {
    console.error("[send-magic-link] Unexpected:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Unexpected server error.",
    });
  }
}
