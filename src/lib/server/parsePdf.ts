// src/lib/server/parsePdf.ts
// ✅ Guaranteed server-only helper for pdf-parse
import type { Buffer } from "node:buffer";

export async function parsePdfOnServer(buffer: Buffer) {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;
  return pdfParse(buffer);
}
