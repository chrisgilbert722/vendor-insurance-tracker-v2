// pages/api/vendor/fix-plan-pdf.js
import chromium from "@sparticuz/chromium";
import playwright from "playwright-core";

export const config = {
  api: { bodyParser: true }
};

export default async function handler(req, res) {
  try {
    const { vendorName, steps, subject, body, internalNotes } = req.body;

    if (!vendorName || !steps || !subject || !body) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorName, steps, subject, or body"
      });
    }

    // Launch serverless Chromium
    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    const html = `
      <html>
      <body style="font-family: Arial; padding: 24px;">
        <h1>Fix Plan — ${vendorName}</h1>

        <h2>Action Steps</h2>
        <ol>
          ${steps.map(s => `<li>${s}</li>`).join("")}
        </ol>

        <h2>Vendor Email Subject</h2>
        <p>${subject}</p>

        <h2>Vendor Email Body</h2>
        <pre>${body}</pre>

        ${
          internalNotes
            ? `<h2>Internal Notes</h2><pre>${internalNotes}</pre>`
            : ""
        }
      </body>
      </html>
    `;

    await page.setContent(html);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${vendorName}-Fix-Plan.pdf"`
    );

    return res.send(pdf);

  } catch (err) {
    console.error("PDF ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "PDF generation failed"
    });
  }
}
