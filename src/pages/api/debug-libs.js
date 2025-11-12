export default async function handler(req, res) {
  try {
    const versions = {
      openai: require("openai/package.json").version,
      pdfParse: require("pdf-parse/package.json").version,
      formidable: require("formidable/package.json").version,
    };
    return res.status(200).json({
      ok: true,
      message: "✅ Server libraries confirmed",
      versions,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
