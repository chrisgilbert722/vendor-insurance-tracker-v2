import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { items, tone = "professional" } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "No items provided for batch send." });
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "alerts@example.com";

    let sent = 0;
    let skipped = 0;

    for (const item of items) {
      const {
        vendor_email,
        vendor_name,
        policy_number,
        carrier,
        coverage_type,
        expiration_date,
        daysLeft,
      } = item;

      if (!vendor_email) {
        skipped++;
        continue;
      }

      const subject = `COI Expiration Notice – ${vendor_name || "Vendor"}`;

      let text;

      if (tone === "gmode") {
        text = `
${vendor_name || "Vendor"},

We reviewed your insurance and one of your policies is out of compliance or about to be:

- Policy: ${policy_number || "Unknown"}
- Carrier: ${carrier || "Unknown"}
- Coverage: ${coverage_type || "Unknown"}
- Expiration: ${expiration_date || "Unknown"}
- Days past/remaining: ${
          typeof daysLeft === "number" ? daysLeft : "N/A"
        }

We need an updated certificate of insurance that clearly shows current coverage and required limits. Until we have that, your status with our team is at risk.

Reply to this email with a fresh COI or send it directly to our risk/compliance contact immediately.
        `.trim();
      } else {
        text = `
Hello ${vendor_name || ""},

We reviewed your insurance information and identified a policy that requires attention:

- Policy: ${policy_number || "Unknown"}
- Carrier: ${carrier || "Unknown"}
- Coverage: ${coverage_type || "Unknown"}
- Expiration: ${expiration_date || "Unknown"}
- Days past/remaining: ${
          typeof daysLeft === "number" ? daysLeft : "N/A"
        }

Please provide an updated certificate of insurance that reflects current and compliant coverage as soon as possible. You can reply to this email with the updated COI, or send it directly to our risk/compliance contact.

Thank you,
Risk & Compliance Team
        `.trim();
      }

      const { error } = await resend.emails.send({
        from: fromEmail,
        to: vendor_email,
        subject,
        text,
      });

      if (error) {
        console.error("Resend batch send error for", vendor_email, error);
        skipped++;
      } else {
        sent++;
      }
    }

    return res.status(200).json({ ok: true, sent, skipped });
  } catch (err) {
    console.error("alerts/send-batch error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to send batch emails" });
  }
}
