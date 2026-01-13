// lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

let _supabase = null;

export function getSupabase() {
  if (_supabase) return _supabase;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    window?.__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_URL;

  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    window?.__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error("[Supabase] Missing public env", { url: !!url, anon: !!anon });
    return null; // ⛔ DO NOT THROW
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

// ✅ backward-compatible named export
export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getSupabase();
      if (!client) {
        throw new Error("Supabase client unavailable");
      }
      return client[prop];
    },
  }
);
