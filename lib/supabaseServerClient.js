import { createServerClient } from "@supabase/auth-helpers-nextjs";

export function supabaseServerClient(req, res) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      req,
      res,
    }
  );
}
