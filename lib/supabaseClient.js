// lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

let supabaseClient = null;

export function getSupabaseClient() {
  // ✅ Never run on server
  if (typeof window === "undefined") {
    return null;
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error("Supabase env missing in browser", { url, anon });
    throw new Error("Supabase client env missing");
  }

  supabaseClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

// 🔁 Backward compatibility (DON’T remove yet)
export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getSupabaseClient();
      if (!client) return undefined;
      return client[prop];
    },
  }
);
