import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // convert file → text for quick mock extraction
  const buffer = Buffer.from(await file.arrayBuffer());
  const text = buffer.toString("utf-8");

  // very basic mock "AI" extraction
  const carrierMatch = /COMPANY[:\\s]+([A-Z0-9 &.-]+)/i.exec(text);
  const policyNumberMatch = /POLICY[:#\\s]+([A-Z0-9-]+)/i.exec(text);
  const expMatch = /EXPIRATION[:\\s]+([0-9/.-]+)/i.exec(text);

  return NextResponse.json({
    extracted: {
      carrier: carrierMatch?.[1] || "Unknown",
      policyNumber: policyNumberMatch?.[1] || "N/A",
      expirationDate: expMatch?.[1] || "N/A",
    },
    status: "mock-validated",
  });
}
