import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(req) {
  const res = NextResponse.next();

  // Supabase stores the session in cookies
  const accessToken = req.cookies.get("sb-access-token")?.value;
  const refreshToken = req.cookies.get("sb-refresh-token")?.value;

  const supabase = createClient(
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

  // Refresh session if needed
  if (refreshToken) {
    await supabase.auth.getSession();
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
