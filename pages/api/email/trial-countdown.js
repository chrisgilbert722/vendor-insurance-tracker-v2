import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const {
    recipientEmail,
    day,
    portfolioSummary,
  } = req.body;

  if (!recipientEmail || !day) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }

  const isFinal = Number(day) >= 10;

  try {
    await resend.emails.send({
      from: "verivo <alerts@verivo.io>",
      to: recipientEmail,
      reply_to: "support@verivo.io",
      subject: isFinal
        ? "Trial ending soon — automation remains paused"
        : "Your trial is active — review exposure before automation",
      html: trialEmailHtml({
        day,
        portfolioSummary,
        isFinal,
      }),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Trial email error:", err);
    return res.status(500).json({ ok: false });
  }
}

function trialEmailHtml({ day, portfolioSummary, isFinal }) {
  return `
    <div style="font-family: Inter, system-ui; background:#020617; color:#e5e7eb; padding:40px;">
      <div style="max-width:560px; margin:0 auto;">

        <h2 style="margin-bottom:10px;">
          ${isFinal ? "Your trial is ending soon" : "Your verivo trial is active"}
        </h2>

        <p style="color:#cbd5f5; font-size:15px; line-height:1.6;">
          verivo is currently running in <strong>preview-only mode</strong>.
          You are seeing real exposure data — but no enforcement or outreach
          runs without approval.
        </p>

        ${
          portfolioSummary
            ? `
        <div style="
          margin:20px 0;
          padding:16px;
          border-radius:14px;
          background:rgba(15,23,42,0.95);
          border:1px solid rgba(56,189,248,0.4);
        ">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af;">
            Current portfolio snapshot
          </div>
          <div style="font-size:14px; margin-top:8px;">
            ${portfolioSummary}
          </div>
        </div>
        `
            : ""
        }

        <p style="font-size:14px; color:#cbd5f5;">
          ${
            isFinal
              ? "Your trial will end soon. Automation will remain paused unless you choose to activate it."
              : "Use the remaining trial time to review risk, preview fixes, and validate owner exposure."
          }
        </p>

        <div style="margin:24px 0;">
          <a
            href="https://verivo.io/dashboard"
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
          Trial day ${day} · Automation remains paused · No vendor outreach sent
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
