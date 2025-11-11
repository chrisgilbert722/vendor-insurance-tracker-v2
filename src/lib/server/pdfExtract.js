const pdfParse = require("pdf-parse");

async function extractText(buffer) {
  const data = await pdfParse(buffer);
  return (data.text || "").trim();
}

module.exports = { extractText };
