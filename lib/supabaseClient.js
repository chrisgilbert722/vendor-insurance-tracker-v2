import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------
// 1. Browser/client-side Supabase instance (used everywhere)
// ---------------------------------------------------------
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------
// 2. Server-side Supabase instance with cookie support
// ---------------------------------------------------------
export function createServerClient(req, res) {
  // Extract the Supabase auth token from cookies
  const accessToken = req.cookies?.["sb-access-token"] || null;
  const refreshToken = req.cookies?.["sb-refresh-token"] || null;

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      },
    }
  );

  return client;
}
