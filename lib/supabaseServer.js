// lib/supabaseServer.js
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export function supabaseServer(req, res) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies[name];
        },
        set(name, value, options) {
          res.cookie(name, value, options);
        },
        remove(name, options) {
          res.cookie(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );
}
