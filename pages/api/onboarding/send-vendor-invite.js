// pages/api/onboarding/send-vendor-invite.js
// Sends COI upload invite emails to vendors (Resend-ready)

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Use POST" });

  try {
    const { email, vendorName, uploadUrl } = req.body;

    if (!email || !email.includes("@"))
      return res.status(400).json({ ok: false, error: "Invalid email" });

    await resend.emails.send({
      from: "Compliance AI System <no-reply@resend.dev>",
      to: email,
      subject: `Action Required: Upload COI for ${vendorName}`,
      html: `
        <div style="font-family:system-ui;padding:20px;background:#0f172a;color:#e2e8f0">
          <h2 style="color:#38bdf8;font-size:20px;margin-bottom:10px">
            Upload Your COI
          </h2>

          <p style="font-size:15px;line-height:1.5;margin-bottom:20px">
            Hello ${vendorName},<br/><br/>
            Please upload your current Certificate of Insurance (COI) for compliance review.
          </p>

          <a href="${uploadUrl}"
            style="
              display:inline-block;
              padding:12px 20px;
              font-size:14px;
              border-radius:8px;
              background:#38bdf8;
              color:#0f172a;
              text-decoration:none;
              font-weight:600;
            ">
            Upload COI
          </a>

          <p style="margin-top:20px;font-size:13px;color:#94a3b8;">
            This secure link expires in 30 days.
          </p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[send-vendor-invite] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
