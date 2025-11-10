// src/lib/server/pdfParser.ts
import type { Buffer } from "node:buffer";

// 👇 Explicitly mark as server-only
export const runtime = "nodejs";

export async function parsePdf(buffer: Buffer) {
  const mod = await import("pdf-parse");
  const pdfParse: any = (mod as any).default || mod;
  return pdfParse(buffer);
}
