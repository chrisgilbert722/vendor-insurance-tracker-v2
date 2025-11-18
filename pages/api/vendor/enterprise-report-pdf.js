// pages/api/vendor/enterprise-report-pdf.js
import chromium from "@sparticuz/chromium";
import playwright from "playwright-core";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  let browser = null;

  try {
    const {
      vendor,
      org,
      compliance,
      fixSteps,
      fixSubject,
      fixBody,
      fixInternalNotes,
      policies,
    } = req.body;

    if (!vendor || !org || !compliance || !policies) {
      return res.status(400).json({
        ok: false,
        error:
          "Missing vendor, org, compliance, or policies in request body.",
      });
    }

    // Local vs Vercel executablePath handling
    const executablePath =
      process.env.NODE_ENV === "development"
        ? (await import("playwright")).chromium.executablePath()
        : await chromium.executablePath;

    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              font-size: 13px;
              color: #111827;
            }
            h1 { font-size: 26px; margin-bottom: 6px; }
            h2 { font-size: 20px; margin-top: 24px; margin-bottom: 8px; }
            h3 { font-size: 16px; margin-top: 16px; margin-bottom: 6px; }
            .section {
              margin-bottom: 24px;
              padding-bottom: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .meta {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 6px;
            }
            ul, ol {
              margin-top: 4px;
              padding-left: 20px;
            }
            .policy-box {
              margin: 8px 0;
              padding: 10px;
              background: #f9fafb;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            }
            pre {
              background: #f3f4f6;
              padding: 10px;
              border-radius: 6px;
              white-space: pre-wrap;
              border: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <h1>Vendor Compliance Report</h1>
          <div class="meta">
            Generated for <strong>${org.name}</strong><br/>
            Vendor: <strong>${vendor.name}</strong>${vendor.email ? ` &lt;${vendor.email}&gt;` : ""}<br/>
          </div>

          <div class="section">
            <h2>Compliance Summary</h2>
            <p>${compliance.summary}</p>

            <h3>Missing Coverage</h3>
            ${
              compliance.missing?.length
                ? `<ul>${compliance.missing
                    .map((m) => `<li>${m.coverage_type}</li>`)
                    .join("")}</ul>`
                : "<p>None</p>"
            }

            <h3>Failing Requirements</h3>
            ${
              compliance.failing?.length
                ? `<ul>${compliance.failing
                    .map(
                      (f) =>
                        `<li>${f.coverage_type}: ${f.reason}</li>`
                    )
                    .join("")}</ul>`
                : "<p>None</p>"
            }

            <h3>Passing</h3>
            ${
              compliance.passing?.length
                ? `<ul>${compliance.passing
                    .map((p) => `<li>${p.coverage_type}</li>`)
                    .join("")}</ul>`
                : "<p>None</p>"
            }
          </div>

          ${
            fixSteps?.length || fixSubject || fixBody || fixInternalNotes
              ? `
          <div class="section">
            <h2>AI Fix Plan (Remediation)</h2>
            ${
              fixSteps?.length
                ? `
                  <h3>Action Steps</h3>
                  <ol>
                    ${fixSteps.map((s) => `<li>${s}</li>`).join("")}
                  </ol>
                `
                : "<p>No fix steps generated.</p>"
            }

            ${
              fixSubject
                ? `<h3>Vendor Email Subject</h3><p>${fixSubject}</p>`
                : ""
            }

            ${
              fixBody
                ? `<h3>Vendor Email Body</h3><pre>${fixBody}</pre>`
                : ""
            }

            ${
              fixInternalNotes
                ? `<h3>Internal Notes</h3><pre>${fixInternalNotes}</pre>`
                : ""
            }
          </div>
          `
              : ""
          }

          <div class="section">
            <h2>Policies on File</h2>
            ${
              policies.length
                ? policies
                    .map(
                      (p) => `
                <div class="policy-box">
                  <strong>${p.coverage_type || "Coverage"}</strong><br/>
                  Carrier: ${p.carrier || "—"}<br/>
                  Policy #: ${p.policy_number || "—"}<br/>
                  Effective: ${p.effective_date || "—"}<br/>
                  Expires: ${p.expiration_date || "—"}<br/>
                  Limits: ${p.limit_each_occurrence || "—"} / ${
                        p.limit_aggregate || "—"
                      }
                </div>
              `
                    )
                    .join("")
                : "<p>No policies found.</p>"
            }
          </div>
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${vendor.name.replace(
        /\s+/g,
        "_"
      )}_Compliance_Report.pdf"`
    );

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("ENTERPRISE PDF ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Enterprise PDF generation failed",
    });
  }
}
