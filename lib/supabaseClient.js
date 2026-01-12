'use client';

import { createClient } from '@supabase/supabase-js';

// These MUST be available at build-time for client bundles
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Hard guard — prevents cryptic runtime crashes
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase client init failed: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. ' +
    'This file must only be imported from client-side code.'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // magic links
    },
  }
);
