import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSupabaseServerClient } from "@supabase/auth-helpers-nextjs";

// -----------------------------
// 1. Normal Supabase Client
// -----------------------------
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// -----------------------------
// 2. Server-Side Supabase Client
//    (handles cookies + session)
// -----------------------------
export function createServerClient(req, res) {
  return createSupabaseServerClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  );
}
