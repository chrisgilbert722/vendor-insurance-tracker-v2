import { NextResponse } from "next/server";

export function proxy(req) {
  return NextResponse.next();
}
