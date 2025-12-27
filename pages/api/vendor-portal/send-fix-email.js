// pages/api/vendor/send-fix-email.js
import { Client } from "pg";
import { Resend } from "resend";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { vendorId, orgId, subject, body } = req.body;

  if (!vendorId || !orgId || !subject || !body) {
    return res.status(400).json({
      ok: false,
      error: "Missing vendorId, orgId, subject, or body",
    });
  }

  let db;

  try {
    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    // --------------------------------------------------
    // 1. ENFORCE TRIAL / AUTOMATION LOCK
    // --------------------------------------------------
    const onboardingRes = await db.query(
      `
      SELECT metadata
      FROM org_onboarding_state
      WHERE org_id = $1
      LIMIT 1
      `,
      [orgId]
    );

    if (!onboardingRes.rows.length) {
      return res.status(403).json({
        ok: false,
        error: "Organization onboarding state not found",
      });
    }

    const metadata = onboardingRes.rows[0].metadata || {};

    if (metadata.automation_locked === true || metadata.billing_status === "trial") {
      return res.status(403).json({
        ok: false,
        code: "TRIAL_LOCKED",
        error:
          "Email sending is disabled during the trial. Activate automation to send vendor emails.",
      });
    }

    // --------------------------------------------------
    // 2. LOAD VENDOR (SCOPED TO ORG)
    // --------------------------------------------------
    const vendorRes = await db.query(
      `
      SELECT email, name
      FROM public.vendors
      WHERE id = $1
        AND org_id = $2
      LIMIT 1
      `,
      [vendorId, orgId]
    );

    if (!vendorRes.rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found for this organization",
      });
    }

    const vendor = vendorRes.rows[0];

    if (!vendor.email) {
      return res.status(400).json({
        ok: false,
        error: "Vendor has no email on file",
      });
    }

    // --------------------------------------------------
    // 3. SEND EMAIL (RESEND)
    // --------------------------------------------------
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Compliance <no-reply@yourdomain.com>",
      to: vendor.email,
      subject,
      text: body,
    });

    return res.status(200).json({
      ok: true,
      sentTo: vendor.email,
    });
  } catch (err) {
    console.error("FIX EMAIL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to send fix email",
    });
  } finally {
    try {
      await db?.end();
    } catch {}
  }
}
