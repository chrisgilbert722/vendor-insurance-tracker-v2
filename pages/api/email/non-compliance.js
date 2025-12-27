import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const {
    recipientEmail,
    vendorName,
    issueSummary,
    severity = "medium",
  } = req.body;

  if (!recipientEmail || !vendorName || !issueSummary) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }

  try {
    await resend.emails.send({
      from: "verivo <alerts@verivo.io>",
      to: recipientEmail,
      reply_to: "support@verivo.io",
      subject: "Action required: Vendor insurance issue detected",
      html: alertEmailHtml({
        vendorName,
        issueSummary,
        severity,
      }),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Non-compliance email error:", err);
    return res.status(500).json({ ok: false });
  }
}

function alertEmailHtml({ vendorName, issueSummary, severity }) {
  const severityColor =
    severity === "critical"
      ? "#ef4444"
      : severity === "high"
      ? "#f59e0b"
      : "#38bdf8";

  return `
    <div style="font-family: Inter, system-ui; background:#020617; color:#e5e7eb; padding:40px;">
      <div style="max-width:560px; margin:0 auto;">

        <h2 style="margin-bottom:8px;">
          Vendor insurance issue detected
        </h2>

        <p style="color:#cbd5f5; font-size:15px; line-height:1.6;">
          verivo detected a compliance issue that may affect owner exposure.
        </p>

        <div style="
          margin:20px 0;
          padding:16px;
          border-radius:14px;
          background:rgba(15,23,42,0.95);
          border:1px solid ${severityColor};
        ">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af;">
            Vendor
          </div>
          <div style="font-size:16px; font-weight:600; margin-bottom:10px;">
            ${vendorName}
          </div>

          <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af;">
            Issue detected
          </div>
          <div style="font-size:14px; color:#e5e7eb;">
            ${issueSummary}
          </div>
        </div>

        <p style="font-size:14px; color:#cbd5f5;">
          <strong>No action has been taken.</strong><br />
          This is a preview-only alert so you can review exposure before enforcement.
        </p>

        <div style="margin:24px 0;">
          <a
            href="https://verivo.io/admin/alerts"
            style="
              display:inline-block;
              padding:12px 18px;
              border-radius:999px;
              background:linear-gradient(90deg,#3b82f6,#1d4ed8);
              color:#fff;
              text-decoration:none;
              font-weight:600;
            "
          >
            Review in Dashboard →
          </a>
        </div>

        <p style="font-size:13px; color:#9ca3af;">
          Automation remains paused until you explicitly activate it.
        </p>

        <hr style="border:none; border-top:1px solid #1e293b; margin:28px 0;" />

        <p style="font-size:12px; color:#64748b;">
          Questions? Reply to this email or contact  
          <a href="mailto:support@verivo.io" style="color:#38bdf8;">support@verivo.io</a>
        </p>

      </div>
    </div>
  `;
}
