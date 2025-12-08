// pages/api/vendor/fix-plan-pdf.js
import chromium from "@sparticuz/chromium";
import playwright from "playwright-core";

export const config = {
  api: { bodyParser: true }
};

export default async function handler(req, res) {
  let browser = null;

  try {
    const { vendorName, steps, subject, body, internalNotes } = req.body;

    if (!vendorName || !steps || !subject || !body) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorName, steps, subject, or body"
      });
    }

    // -------------------------------
    // 1️⃣ LAUNCH CHROMIUM (Vercel-safe)
    // -------------------------------
    const executablePath =
      process.env.NODE_ENV === "development"
        ? // Local Mac/Windows/Linux
          (await import("playwright")).chromium.executablePath()
        : // Vercel Serverless
          await chromium.executablePath;

    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // -------------------------------
    // 2️⃣ HTML TEMPLATE
    // -------------------------------
    const html = `
      <html>
      <body style="font-family: Arial, sans-serif; padding: 32px;">
        <h1 style="margin-bottom: 10px;">Fix Plan — ${vendorName}</h1>

        <h2>Action Steps</h2>
        <ol>
          ${steps.map(s => `<li style="margin-bottom: 6px;">${s}</li>`).join("")}
        </ol>

        <h2>Vendor Email Subject</h2>
        <p>${subject}</p>

        <h2>Vendor Email Body</h2>
        <pre style="white-space: pre-wrap; border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
${body}
        </pre>

        ${
          internalNotes
            ? `
              <h2>Internal Notes</h2>
              <pre style="white-space: pre-wrap; border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
${internalNotes}
              </pre>
            `
            : ""
        }
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle" });

    // -------------------------------
    // 3️⃣ GENERATE PDF
    // -------------------------------
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
    });

    // -------------------------------
    // 4️⃣ RETURN PDF
    // -------------------------------
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${vendorName.replace(/\s+/g, "_")}_Fix_Plan.pdf"`
    );

    return res.send(pdfBuffer);

  } catch (err) {
    console.error("PDF ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "PDF generation failed"
    });

  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
  }
}
