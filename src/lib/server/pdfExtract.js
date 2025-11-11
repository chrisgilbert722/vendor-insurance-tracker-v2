// src/lib/server/pdfExtract.js
// Runs in Node only – never imported by client components.
const pdfParse = require("pdf-parse");

async function extractText(buffer) {
  const data = await pdfParse(buffer);
  return (data.text || "").trim();
}

module.exports = { extractText };
