// src/lib/parsePdf.ts
// ✅ Node-only PDF parser helper for Next.js API routes

import type { Buffer } from "node:buffer";

export async function parsePdf(buffer: Buffer) {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse: any =
    (pdfParseModule as any).default || pdfParseModule; // handle ESM/CJS mix

  return pdfParse(buffer);
}
