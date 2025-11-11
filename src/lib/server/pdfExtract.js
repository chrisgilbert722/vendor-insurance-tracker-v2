// src/lib/server/pdfExtract.js
// Node-only helper for reading PDF text safely
const pdfParse = require("pdf-parse");

async function extractText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return (data.text || "").trim();
  } catch (err) {
    console.error("PDF parse failed:", err.message);
    return "";
  }
}

module.exports = { extractText };

