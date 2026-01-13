import { createClient } from "@supabase/supabase-js";

let _supabase = null;

export function getSupabase() {
  // Already created
  if (_supabase) return _supabase;

  // Browser-safe access
  const url =
    typeof window !== "undefined"
      ? window.__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anon =
    typeof window !== "undefined"
      ? window.__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 🚨 FAIL OPEN — never crash UI
  if (!url || !anon) {
    console.warn("[supabaseClient] Missing public envs — returning stub");
    return {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: null } }),
      },
    };
  }

  _supabase = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _supabase;
}

// Backwards compatibility
export const supabase = getSupabase();
