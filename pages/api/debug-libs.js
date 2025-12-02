// pages/api/debug-libs.js
import formidablePkg from "formidable/package.json" assert { type: "json" };
import pdfParsePkg from "pdf-parse/package.json" assert { type: "json" };
import playPkg from "playwright-core/package.json" assert { type: "json" };

export default async function handler(req, res) {
  try {
    const versions = {
      formidable: formidablePkg.version,
      pdfParse: pdfParsePkg.version,
      playwright: playPkg.version,
      // openai intentionally removed — package.json not exposed
      openai: "4.x installed (no direct version export)",
    };

    res.status(200).json({ ok: true, versions });
  } catch (err) {
    console.error("[debug-libs error]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
