// pages/api/renewals/send-reminders-v3.js
// Renewal Reminder Engine V3
// Sends vendor + broker renewal notices for 7 / 3 / 1 days-left windows

import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Standard reminder windows
const REMINDER_WINDOWS = [7, 3, 1];

/* ===========================
   HELPERS
=========================== */

// Convert "RENEWAL_7D" → 7
function extractDaysLeft(code) {
  try {
    return Number(code.replace("RENEWAL_", "").replace("D", ""));
  } catch {
    return null;
  }
}

// Format email body for vendor
function vendorReminderEmail({ vendorName, daysLeft, expirationDate }) {
  return `
Hello ${vendorName},

Your insurance policy is expiring in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.

Expiration Date: ${expirationDate}

Please upload your updated COI as soon as possible to avoid service interruption.

Thank you,
Compliance Team
`;
}

// Broker template
function brokerReminderEmail({ vendorName, daysLeft, expirationDate }) {
  return `
Hello,

We are contacting you regarding the upcoming policy expiration for your client: ${vendorName}.

Their policy expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.

Expiration Date: ${expirationDate}

Please forward the updated COI or renewal documents at your earliest convenience.

Thank you,
Compliance Team
`;
}

/* ===========================
   MAIN HANDLER
=========================== */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only." });
  }

  try {
    const { orgId } = req.body || {};

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId in body.",
      });
    }

    /* --------------------------------------------------------
       1) LOAD RENEWAL ALERTS (7D, 3D, 1D)
    --------------------------------------------------------- */
    const renewalAlerts = await sql`
      SELECT vendor_id, org_id, code, message, severity, created_at
      FROM vendor_alerts
      WHERE org_id = ${orgId}
      AND code LIKE 'RENEWAL_%'
      ORDER BY created_at DESC;
    `;

    if (!renewalAlerts.length) {
      return res.status(200).json({
        ok: true,
        message: "No renewal alerts for this org.",
        sent: [],
      });
    }

    // Extract vendor → latest alert per window
    const reminders = [];

    for (const a of renewalAlerts) {
      const daysLeft = extractDaysLeft(a.code);
      if (!REMINDER_WINDOWS.includes(daysLeft)) continue;

      reminders.push({
        vendorId: a.vendor_id,
        orgId: a.org_id,
        daysLeft,
        code: a.code,
        message: a.message,
        createdAt: a.created_at,
      });
    }

    /* --------------------------------------------------------
       2) LOAD VENDORS + POLICIES FOR EMAIL DETAILS
    --------------------------------------------------------- */

    const vendorIds = [...new Set(reminders.map((r) => r.vendorId))];

    const { data: vendorRows } = await supabase
      .from("vendors")
      .select("id, name, email, broker_email, org_id")
      .in("id", vendorIds);

    const { data: policyRows } = await supabase
      .from("policies")
      .select("vendor_id, expiration_date")
      .in("vendor_id", vendorIds);

    // Map vendor → data
    const vendorMap = {};
    vendorRows?.forEach((v) => (vendorMap[v.id] = v));

    const policyMap = {};
    policyRows?.forEach((p) => (policyMap[p.vendor_id] = p));

    /* --------------------------------------------------------
       3) PREVENT DUPLICATE SENDS USING renewal_notifications
    --------------------------------------------------------- */

    const existing = await sql`
      SELECT vendor_id, days_left
      FROM renewal_notifications
      WHERE vendor_id = ANY(${vendorIds})
      AND days_left = ANY(${REMINDER_WINDOWS})
    `;

    const sentMap = new Set(existing.map((r) => `${r.vendor_id}_${r.days_left}`));

    /* --------------------------------------------------------
       4) SEND EMAILS + LOG TO DB
    --------------------------------------------------------- */

    const results = [];

    for (const r of reminders) {
      const vendor = vendorMap[r.vendorId];
      const policy = policyMap[r.vendorId];
      if (!vendor || !policy) continue;

      const expires = policy.expiration_date;
      const key = `${r.vendorId}_${r.daysLeft}`;

      // skip duplicate sends
      if (sentMap.has(key)) {
        results.push({
          vendorId: r.vendorId,
          daysLeft: r.daysLeft,
          skipped: true,
          reason: "Already sent for this window.",
        });
        continue;
      }

      /* ---------------------------
         Vendor email 
      ----------------------------*/
      if (vendor.email) {
        const subject = `Your insurance expires in ${r.daysLeft} days`;
        const body = vendorReminderEmail({
          vendorName: vendor.name,
          daysLeft: r.daysLeft,
          expirationDate: expires,
        });

        try {
          await resend.emails.send({
            from: "Compliance <no-reply@yourdomain.com>",
            to: vendor.email,
            subject,
            text: body,
          });

          await logNotification({
            vendorId: vendor.id,
            orgId,
            policyId: policy.id,
            daysLeft: r.daysLeft,
            sentTo: vendor.email,
            recipientType: "vendor",
            notificationType: "vendor_renewal",
            subject,
            body,
            status: "sent",
          });

          results.push({
            vendorId: vendor.id,
            daysLeft: r.daysLeft,
            sentTo: vendor.email,
            type: "vendor",
          });
        } catch (err) {
          results.push({
            vendorId: vendor.id,
            daysLeft: r.daysLeft,
            error: "Vendor email failed",
          });
        }
      }

      /* ---------------------------
         Broker email 
      ----------------------------*/
      if (vendor.broker_email) {
        const subject = `Renewal notice for ${vendor.name}`;
        const body = brokerReminderEmail({
          vendorName: vendor.name,
          daysLeft: r.daysLeft,
          expirationDate: expires,
        });

        try {
          await resend.emails.send({
            from: "Compliance <no-reply@yourdomain.com>",
            to: vendor.broker_email,
            subject,
            text: body,
          });

          await logNotification({
            vendorId: vendor.id,
            orgId,
            policyId: policy.id,
            daysLeft: r.daysLeft,
            sentTo: vendor.broker_email,
            recipientType: "broker",
            notificationType: "broker_renewal",
            subject,
            body,
            status: "sent",
          });

          results.push({
            vendorId: vendor.id,
            daysLeft: r.daysLeft,
            sentTo: vendor.broker_email,
            type: "broker",
          });
        } catch (err) {
          results.push({
            vendorId: vendor.id,
            daysLeft: r.daysLeft,
            error: "Broker email failed",
          });
        }
      }
    }

    return res.status(200).json({
      ok: true,
      orgId,
      results,
    });
  } catch (err) {
    console.error("[send-reminders-v3] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Reminder engine failed.",
    });
  }
}

/* ===========================
   LOG TO renewal_notifications
=========================== */

async function logNotification({
  vendorId,
  orgId,
  policyId,
  daysLeft,
  sentTo,
  recipientType,
  notificationType,
  subject,
  body,
  status,
}) {
  await sql`
    INSERT INTO renewal_notifications 
    (vendor_id, org_id, policy_id, days_left, sent_to, recipient_type, notification_type, subject, body, status)
    VALUES (
      ${vendorId},
      ${orgId},
      ${policyId},
      ${daysLeft},
      ${sentTo},
      ${recipientType},
      ${notificationType},
      ${subject},
      ${body},
      ${status}
    );
  `;
}
