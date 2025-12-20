// proxy.js
// ============================================================
// Onboarding Route Guard (Edge-safe, Vercel-safe)
// - Prevents access to /onboarding/* once onboarding completes
// - Backend-driven via /api/onboarding/status
// - Safe on refresh, deep links, bookmarks
// ============================================================

import { NextResponse } from "next/server";

export function proxy(req) {
  const { pathname } = req.nextUrl;

  // Only guard onboarding routes
  if (!pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

  try {
    // Build URL to onboarding status API
    const url = req.nextUrl.clone();
    url.pathname = "/api/onboarding/status";

    // Call API with cookies/session forwarded
    return fetch(url.toString(), {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    })
      .then((res) => res.json())
      .then((json) => {
        // If onboarding complete → redirect to dashboard
        if (json?.ok && json.onboardingComplete === true) {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = "/dashboard";
          return NextResponse.redirect(redirectUrl);
        }

        // Otherwise allow onboarding
        return NextResponse.next();
      })
      .catch((err) => {
        console.error("[proxy] onboarding guard error:", err);
        // Fail open — never block user
        return NextResponse.next();
      });
  } catch (err) {
    console.error("[proxy] onboarding guard fatal error:", err);
    return NextResponse.next();
  }
}
