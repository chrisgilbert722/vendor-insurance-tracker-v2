// src/lib/server/pdfExtract.js
// This file runs only in Node.  It will never be bundled for the browser.
const pdfParse = require("pdf-parse");

async function extractText(buffer) {
  const data = await pdfParse(buffer);
  return data.text?.trim() || "";
}

module.exports = { extractText };
