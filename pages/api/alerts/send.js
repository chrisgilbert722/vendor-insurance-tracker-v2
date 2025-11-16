import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      vendorEmail,
      vendorName,
      policyNumber,
      carrier,
      coverageType,
      expirationDate,
      daysLeft,
      tone = "professional", // "gmode" or "professional"
    } = req.body;

    if (!vendorEmail) {
      return res
        .status(400)
        .json({ ok: false, error: "No vendor email available for this alert." });
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "alerts@example.com";

    const subject = `COI Expiration Notice – ${vendorName || "Vendor"}`;

    let text;

    if (tone === "gmode") {
      // internal flavor, but still respectful
      text = `
${vendorName || "Vendor"},

We reviewed your insurance information and one of your policies is out of compliance:

- Policy: ${policyNumber || "Unknown"}
- Carrier: ${carrier || "Unknown"}
- Coverage: ${coverageType || "Unknown"}
- Expiration: ${expirationDate || "Unknown"}
- Days past/left: ${typeof daysLeft === "number" ? daysLeft : "N/A"}

This isn't optional. We need an updated certificate of insurance that brings this policy current and clearly shows the required coverage. Until we have that in hand, your status with our team is at risk.

Reply to this email with a new COI, or send it directly to our risk/compliance contact as soon as possible.
      `.trim();
    } else {
      // professional default
      text = `
Hello ${vendorName || ""},

We reviewed your insurance information and identified a policy that requires attention:

- Policy: ${policyNumber || "Unknown"}
- Carrier: ${carrier || "Unknown"}
- Coverage: ${coverageType || "Unknown"}
- Expiration: ${expirationDate || "Unknown"}
- Days past/remaining: ${typeof daysLeft === "number" ? daysLeft : "N/A"}

Please provide an updated certificate of insurance that reflects current and compliant coverage as soon as possible. You can reply to this email with the updated COI, or send it directly to our risk/compliance contact.

Thank you,
Risk & Compliance Team
      `.trim();
    }

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: vendorEmail,
      subject,
      text,
    });

    if (error) {
      console.error("Resend send error:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to send email through Resend.",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("alerts/send error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to send alert email." });
  }
}
