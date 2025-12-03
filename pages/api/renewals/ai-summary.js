// pages/api/renewals/ai-summary.js

import { predictRenewalRisk } from "../../../lib/predictRenewalRisk";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const { renewals } = req.body;
    if (!Array.isArray(renewals)) {
      return res.status(400).json({ ok: false, error: "Missing renewals array" });
    }

    // Lightweight heuristic summary — you can wire OpenAI here later.
    let overdue = 0;
    let critical = 0;
    let dueSoon = 0;

    renewals.forEach((r) => {
      const risk = predictRenewalRisk({
        expirationDate: r.expiration_date,
        alertsCount: r.alerts_count || 0,
      });
      if (risk.label === "Critical") overdue++;
      else if (risk.label === "High Risk") critical++;
      else if (risk.label === "At Risk") dueSoon++;
    });

    const summary = [
      `Renewal Risk Summary:`,
      ``,
      `• Critical vendors (likely to fail renewal): ${overdue}`,
      `• High risk vendors: ${critical}`,
      `• At risk but still recoverable: ${dueSoon}`,
      ``,
      `Focus first on critical vendors, then high risk, then at risk.`,
    ].join("\n");

    return res.status(200).json({ ok: true, summary });
  } catch (err) {
    console.error("[renewals/ai-summary] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
