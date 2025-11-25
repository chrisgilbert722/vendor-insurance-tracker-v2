import { createBrowserClient, createServerClient } from '@supabase/auth-helpers-nextjs';

// -------------------------------
// 1. Browser client (magic links)
// -------------------------------
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookieOptions: {
      name: "sb-auth-token",
      lifetime: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "Lax",
      secure: true,
    },
    detectSessionInUrl: true,  // ⭐ important for magic links
  }
);

// -------------------------------
// 2. Server-side client (optional)
// -------------------------------
export function getSupabaseServerClient(req, res) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { req, res }
  );
}
