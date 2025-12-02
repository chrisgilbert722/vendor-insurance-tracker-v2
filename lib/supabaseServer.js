// lib/supabaseServer.js
import { createClient } from "@supabase/supabase-js";

// IMPORTANT:
// This MUST use the **SERVICE ROLE KEY**
// NOT the anon key.

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
