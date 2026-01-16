// pages/api/email/send.js
import { sql } from "../../../lib/db";
import { Resend } from "resend";

// Email templates
import UploadRequest from "../../../emails/vendor/UploadRequest";
import FixIssues from "../../../emails/vendor/FixIssues";
import RenewalReminder from "../../../emails/vendor/RenewalReminder";
import UploadSuccess from "../../../emails/vendor/UploadSuccess";

import ReactDOMServer from "react-dom/server";

// Initialize Resend with your secret key
const resend = new Resend(process.env.RESEND_API_KEY);

/*
  Expected POST body:
  {
    "vendorId": 123,
    "template": "upload-request" | "fix-issues" | "renewal-reminder" | "upload-success",
    "issues": [],
    "expirationDate": "2025-04-01"
  }
*/

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { vendorId, template, issues = [], expirationDate = null } = req.body;

    if (!vendorId || !template) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or template.",
      });
    }

    // ---------------------------------------------
    // 1) Load vendor details + portal token + org
    // ---------------------------------------------
    const rows = await sql`
      SELECT 
        v.id AS vendor_id,
        v.name AS vendor_name,
        v.email AS vendor_email,
        o.id AS org_id,
        o.name AS org_name,
        t.token AS portal_token
      FROM vendors v
      JOIN vendor_portal_tokens t ON t.vendor_id = v.id
      JOIN orgs o ON o.id = t.org_id
      WHERE v.id = ${vendorId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "Vendor not found." });
    }

    const vendor = {
      id: rows[0].vendor_id,
      name: rows[0].vendor_name,
      email: rows[0].vendor_email,
    };

    const org = {
      id: rows[0].org_id,
      name: rows[0].org_name,
    };

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/vendor-pages/portal/${rows[0].portal_token}`;

    // ---------------------------------------------
    // 2) Choose template + render to HTML
    // ---------------------------------------------
    let emailHtml = "";
    let subject = "";

    switch (template) {
      case "upload-request":
        subject = `Action Required: COI Upload Needed for ${org.name}`;
        emailHtml = ReactDOMServer.renderToStaticMarkup(
          UploadRequest({ vendor, org, portalUrl })
        );
        break;

      case "fix-issues":
        subject = `Issues Found in Your COI – Please Review`;
        emailHtml = ReactDOMServer.renderToStaticMarkup(
          FixIssues({ vendor, org, issues, portalUrl })
        );
        break;

      case "renewal-reminder":
        subject = `COI Renewal Reminder – Action Required`;
        emailHtml = ReactDOMServer.renderToStaticMarkup(
          RenewalReminder({ vendor, org, expirationDate, portalUrl })
        );
        break;

      case "upload-success":
        subject = `COI Received – Thank You`;
        emailHtml = ReactDOMServer.renderToStaticMarkup(
          UploadSuccess({ vendor, org })
        );
        break;

      default:
        return res.status(400).json({ ok: false, error: "Invalid template." });
    }

    // ---------------------------------------------
    // 3) SEND EMAIL
    // ---------------------------------------------
    const sendResult = await resend.emails.send({
      from: `${org.name} Compliance <noreply@${process.env.EMAIL_DOMAIN}>`,
      to: vendor.email,
      subject,
      html: emailHtml,
    });

    if (!sendResult || sendResult.error) {
      console.error(sendResult.error);
      throw new Error("Email send failed.");
    }

    // ---------------------------------------------
    // 4) Log to timeline
    // ---------------------------------------------
    await sql`
      INSERT INTO vendor_timeline (vendor_id, action, message, severity)
      VALUES (
        ${vendor.id},
        ${template},
        ${subject},
        'info'
      );
    `;

    return res.status(200).json({
      ok: true,
      message: "Email sent successfully.",
    });
  } catch (err) {
    console.error("[email/send.js ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error.",
    });
  }
}
