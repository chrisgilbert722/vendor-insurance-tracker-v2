// pages/api/renewals/queue-email.js
import { sql } from "../../../lib/db";
import { logRenewalEvent } from "../../../lib/logRenewalEvent";

export default async function handler(req, res) {
  try {
    const { vendorId, orgId, expirationDate, type } = req.body;

    if (!vendorId || !orgId) {
      return res.status(400).json({ ok: false, error: "Missing vendorId or orgId" });
    }

    // Log timeline
    await logRenewalEvent(
      vendorId,
      "renewal_reminder_sent",
      `Sent ${type} renewal reminder (expires ${expirationDate}).`,
      "info"
    );

    // TODO: Wire in email sender
    return res.status(200).json({ ok: true, message: "Reminder queued" });
  } catch (err) {
    console.error("[QUEUE RENEWAL ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
