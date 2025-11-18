// pages/api/vendor/fix-plan-pdf.js
import chromium from "chrome-aws-lambda"; // Works on Vercel
import { Client } from "pg";
import OpenAI from "openai";

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const vendorId = url.searchParams.get("vendorId");
    const orgId = url.searchParams.get("orgId");

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or orgId"
      });
    }

    let db = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await db.connect();

    // 1️⃣ Load vendor + org + policies
    const vendorRes = await db.query(
      `SELECT * FROM public.vendors WHERE id = $1`,
      [vendorId]
    );
    const vendor = vendorRes.rows[0];

    const orgRes = await db.query(
      `SELECT * FROM public.orgs WHERE id = $1`,
      [orgId]
    );
    const org = orgRes.rows[0];

    const policiesRes = await db.query(
      `SELECT * FROM public.policies WHERE vendor_id = $1 ORDER BY created_at DESC`,
      [vendorId]
    );
    const policies = policiesRes.rows;

    // 2️⃣ Load compliance result
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const compRes = await fetch(
      `${baseUrl}/api/requirements/check?vendorId=${vendorId}&orgId=${orgId}`
    );
    const compliance = await compRes.json();

    if (!compliance.ok) {
      throw new Error(compliance.error || "Compliance engine failed");
    }

    // 3️⃣ Generate Fix Plan using your Fix-Plan Engine
    const fixRes = await fetch(
      `${baseUrl}/api/vendor/fix-plan?vendorId=${vendorId}&orgId=${orgId}`
    );
    const fix = await fixRes.json();

    if (!fix.ok) throw new Error("Fix Plan generation failed");

    // 4️⃣ Build PDF HTML
    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              font-size: 13px;
              color: #111;
            }
            h1 { font-size: 26px; margin-bottom: 6px; }
            h2 { font-size: 20px; margin-top: 30px; }
            h3 { font-size: 16px; margin-top: 20px; }
            .section {
              margin-bottom: 25px;
              padding-bottom: 15px;
              border-bottom: 1px solid #ddd;
            }
            ul { margin: 0; padding-left: 20px; }
            .policy-box {
              margin: 10px 0; padding: 10px;
              background: #f8f8f8;
              border-radius: 6px;
              border: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <h1>Vendor Fix Plan Report</h1>
          <p><strong>Vendor:</strong> ${vendor.name}</p>
          <p><strong>Organization:</strong> ${org.name}</p>
          <hr />

          <div class="section">
            <h2>Compliance Summary</h2>
            <p>${compliance.summary}</p>

            <h3>Missing Coverage</h3>
            <ul>
              ${compliance.missing
                .map((m) => `<li>${m.coverage_type}</li>`)
                .join("")}
            </ul>

            <h3>Failing Coverage</h3>
            <ul>
              ${compliance.failing
                .map((f) => `<li>${f.coverage_type}: ${f.reason}</li>`)
                .join("")}
            </ul>

            <h3>Passing Coverage</h3>
            <ul>
              ${compliance.passing
                .map((p) => `<li>${p.coverage_type}</li>`)
                .join("")}
            </ul>
          </div>

          <div class="section">
            <h2>Fix Plan Steps</h2>
            <ol>
              ${fix.steps.map((s) => `<li>${s}</li>`).join("")}
            </ol>
          </div>

          <div class="section">
            <h2>Vendor Email Template</h2>
            <p><strong>Subject:</strong> ${fix.vendorEmailSubject}</p>
            <pre>${fix.vendorEmailBody}</pre>
          </div>

          <div class="section">
            <h2>Internal Notes</h2>
            <p>${fix.internalNotes}</p>
          </div>

          <div class="section">
            <h2>Policies on File</h2>
            ${policies
              .map(
                (p) => `
                <div class="policy-box">
                  <strong>${p.coverage_type}</strong><br/>
                  Carrier: ${p.carrier}<br/>
                  Policy #: ${p.policy_number}<br/>
                  Effective: ${p.effective_date}<br/>
                  Expires: ${p.expiration_date}<br/>
                  Limits: ${p.limit_each_occurrence || "—"} / ${
                  p.limit_aggregate || "—"
                }
                </div>
              `
              )
              .join("")}
          </div>
        </body>
      </html>
    `;

    // 5️⃣ Generate PDF via Chromium/Puppeteer
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // 6️⃣ Send PDF to browser
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Vendor-Fix-Plan-${vendorId}.pdf"`
    );

    return res.send(pdf);
  } catch (err) {
    console.error("PDF ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to generate PDF",
    });
  }
}
