import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const token = req.cookies.get("sb-access-token")?.value;

  const protectedRoutes = [
    "/dashboard",
    "/vendors",
    "/upload-coi",
    "/vendor-upload",
    "/api",
  ];

  if (protectedRoutes.some((r) => url.pathname.startsWith(r))) {
    if (!token) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
