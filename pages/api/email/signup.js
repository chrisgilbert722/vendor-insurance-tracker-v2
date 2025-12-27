import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const { email, firstName } = req.body;

  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  try {
    await resend.emails.send({
      from: "verivo <noreply@verivo.io>",
      to: email,
      reply_to: "support@verivo.io",
      subject: "Welcome to verivo — your trial is live",
      html: signupEmailHtml({ firstName }),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Signup email error:", err);
    return res.status(500).json({ ok: false });
  }
}

function signupEmailHtml({ firstName }) {
  return `
    <div style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont; background:#020617; color:#e5e7eb; padding:40px;">
      <div style="max-width:520px; margin:0 auto; background:#020617;">
        
        <h1 style="font-size:24px; margin-bottom:12px;">
          Welcome${firstName ? `, ${firstName}` : ""} 👋
        </h1>

        <p style="font-size:15px; line-height:1.6; color:#cbd5f5;">
          Your <strong>verivo 14-day trial</strong> is now active.
        </p>

        <p style="font-size:15px; line-height:1.6; color:#cbd5f5;">
          You can now see vendor insurance risk across your portfolio — 
          non-compliant vendors, expiring COIs, and missing endorsements — 
          <strong>before</strong> anything is enforced.
        </p>

        <div style="margin:28px 0;">
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
            Open My Dashboard →
          </a>
        </div>

        <p style="font-size:13px; color:#9ca3af;">
          Nothing runs without your approval.  
          Automation stays preview-only until you activate it.
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
