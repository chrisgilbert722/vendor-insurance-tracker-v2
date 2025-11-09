export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ Notify route is active",
    time: new Date().toISOString(),
  });
}
