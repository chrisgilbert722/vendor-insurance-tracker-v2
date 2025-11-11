// src/lib/server/pdfProcessor.ts
// Pure Node helper isolated from any frontend bundle

const pdfParse = require("pdf-parse");

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text?.trim() || "";
  } catch (err) {
    console.error("PDF parse error:", err);
    return "";
  }
}
