// pages/api/renewals/predict-v1.js
// Renewal Prediction Engine V1 (AI-powered)
// Builds vendor-level renewal risk predictions using historical signals.

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, vendorId } = req.body || {};

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId in body.",
      });
    }

    /* --------------------------------------------------------
       1) Determine which vendors to score
    --------------------------------------------------------- */
    let vendorsToScore = [];

    if (vendorId) {
      vendorsToScore = [vendorId];
    } else {
      const vRows = await sql`
        SELECT id
        FROM vendors
        WHERE org_id = ${orgId};
      `;
      vendorsToScore = vRows.map((v) => v.id);
    }

    if (!vendorsToScore.length) {
      return res.status(200).json({
        ok: true,
        orgId,
        predictions: [],
        message: "No vendors to score for this org.",
      });
    }

    /* --------------------------------------------------------
       2) Load signals (notifications, alerts, rule results)
    --------------------------------------------------------- */

    const notifRows = await sql`
      SELECT vendor_id, days_left, recipient_type, notification_type, created_at
      FROM renewal_notifications
      WHERE vendor_id = ANY(${vendorsToScore});
    `;

    // vendor_alerts table does not exist - return empty array
    const alertRows = [];

    const rulesRows = await sql`
      SELECT vendor_id, COUNT(*) AS total_rules,
             COUNT(*) FILTER (WHERE passed = false) AS failed_rules
      FROM rule_results_v3
      WHERE vendor_id = ANY(${vendorsToScore})
      GROUP BY vendor_id;
    `;

    const vendorSignals = {};

    vendorsToScore.forEach((id) => {
      vendorSignals[id] = {
        vendorId: id,
        notifications: [],
        alerts: [],
        rules: { total_rules: 0, failed_rules: 0 },
      };
    });

    notifRows.forEach((n) => {
      if (!vendorSignals[n.vendor_id]) return;
      vendorSignals[n.vendor_id].notifications.push({
        days_left: n.days_left,
        recipient_type: n.recipient_type,
        notification_type: n.notification_type,
        created_at: n.created_at,
      });
    });

    alertRows.forEach((a) => {
      if (!vendorSignals[a.vendor_id]) return;
      vendorSignals[a.vendor_id].alerts.push({
        code: a.code,
        severity: a.severity,
        created_at: a.created_at,
      });
    });

    rulesRows.forEach((r) => {
      if (!vendorSignals[r.vendor_id]) return;
      vendorSignals[r.vendor_id].rules = {
        total_rules: Number(r.total_rules) || 0,
        failed_rules: Number(r.failed_rules) || 0,
      };
    });

    /* --------------------------------------------------------
       3) Call OpenAI to score each vendor
    --------------------------------------------------------- */

    const predictions = [];

    for (const vid of vendorsToScore) {
      const signals = vendorSignals[vid];

      // basic features we pass to the model
      const featureSummary = buildFeatureSummary(signals);

      const prompt = buildPrompt(featureSummary);

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an expert AI compliance assistant. You output strict JSON with renewal risk predictions.",
          },
          {
            role: "user",
            content: JSON.stringify(prompt),
          },
        ],
      });

      const content = completion.choices[0]?.message?.content || "{}";

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = {
          risk_score: 50,
          risk_tier: "Watch",
          likelihood_on_time: 50,
          likelihood_late: 30,
          likelihood_fail: 20,
          summary: "Default fallback prediction.",
          reasoning: { fallback: true, raw: content },
        };
      }

      const normalized = normalizePrediction(parsed);

      // upsert into renewal_predictions
      await sql`
        INSERT INTO renewal_predictions (
          vendor_id, org_id,
          risk_score, risk_tier,
          likelihood_on_time, likelihood_late, likelihood_fail,
          summary, reasoning, created_at, updated_at
        )
        VALUES (
          ${vid},
          ${orgId},
          ${normalized.risk_score},
          ${normalized.risk_tier},
          ${normalized.likelihood_on_time},
          ${normalized.likelihood_late},
          ${normalized.likelihood_fail},
          ${normalized.summary},
          ${JSON.stringify(normalized.reasoning)},
          NOW(),
          NOW()
        )
        ON CONFLICT (vendor_id)
        DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          risk_tier = EXCLUDED.risk_tier,
          likelihood_on_time = EXCLUDED.likelihood_on_time,
          likelihood_late = EXCLUDED.likelihood_late,
          likelihood_fail = EXCLUDED.likelihood_fail,
          summary = EXCLUDED.summary,
          reasoning = EXCLUDED.reasoning,
          updated_at = NOW();
      `;

      predictions.push({
        vendorId: vid,
        ...normalized,
      });
    }

    return res.status(200).json({
      ok: true,
      orgId,
      predictions,
    });
  } catch (err) {
    console.error("[renewals/predict-v1] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Prediction engine failed.",
    });
  }
}

/* ===========================
   FEATURE SUMMARY BUILDER
=========================== */

function buildFeatureSummary(signals) {
  const notifications = signals.notifications || [];
  const alerts = signals.alerts || [];
  const rules = signals.rules || { total_rules: 0, failed_rules: 0 };

  const now = Date.now();

  // average days_left windows that have been notified
  const windows = notifications.map((n) => n.days_left);
  const avgWindow =
    windows.length > 0
      ? windows.reduce((a, b) => a + b, 0) / windows.length
      : null;

  // count how many reminders
  const totalReminders = notifications.length;
  const vendorReminders = notifications.filter(
    (n) => n.recipient_type === "vendor"
  ).length;
  const brokerReminders = notifications.filter(
    (n) => n.recipient_type === "broker"
  ).length;

  // how recent was last reminder
  const lastReminderAt = notifications[0]?.created_at || null;
  const daysSinceLastReminder =
    lastReminderAt != null
      ? Math.floor(
          (now - new Date(lastReminderAt).getTime()) / 86400000
        )
      : null;

  // alerts by severity
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, other: 0 };
  alerts.forEach((a) => {
    const s = (a.severity || "").toLowerCase();
    if (severityCounts[s] !== undefined) severityCounts[s]++;
    else severityCounts.other++;
  });

  // expired / renewal alerts
  const hasExpiredAlerts = alerts.some((a) =>
    (a.code || "").toLowerCase().includes("expired")
  );
  const renewalAlertCount = alerts.filter((a) =>
    (a.code || "").toUpperCase().startsWith("RENEWAL_")
  ).length;

  return {
    vendorId: signals.vendorId,
    rules,
    notification_stats: {
      totalReminders,
      vendorReminders,
      brokerReminders,
      avgWindow,
      daysSinceLastReminder,
    },
    alert_stats: {
      totalAlerts: alerts.length,
      severityCounts,
      hasExpiredAlerts,
      renewalAlertCount,
    },
  };
}

/* ===========================
   PROMPT BUILDER
=========================== */

function buildPrompt(features) {
  return {
    instructions:
      "Given the vendor's renewal signals, predict renewal risk. Output JSON with the exact keys specified.",
    schema: {
      risk_score: "0-100 integer (higher = more risk)",
      risk_tier:
        "One of: Elite Safe, Preferred, Watch, High Risk, Severe",
      likelihood_on_time: "0-100 integer",
      likelihood_late: "0-100 integer",
      likelihood_fail: "0-100 integer",
      summary: "1-2 sentence explanation",
      reasoning: "object with deeper explanation and key signals",
    },
    features,
  };
}

/* ===========================
   NORMALIZE MODEL OUTPUT
=========================== */

function normalizePrediction(raw) {
  const clamp = (n) =>
    Math.max(0, Math.min(100, Number.isFinite(n) ? Math.round(n) : 50));

  const risk_score = clamp(raw.risk_score);
  let risk_tier = raw.risk_tier || "Watch";

  if (!risk_tier || typeof risk_tier !== "string") {
    if (risk_score >= 85) risk_tier = "Severe";
    else if (risk_score >= 70) risk_tier = "High Risk";
    else if (risk_score >= 55) risk_tier = "Watch";
    else if (risk_score >= 35) risk_tier = "Preferred";
    else risk_tier = "Elite Safe";
  }

  return {
    risk_score,
    risk_tier,
    likelihood_on_time: clamp(raw.likelihood_on_time),
    likelihood_late: clamp(raw.likelihood_late),
    likelihood_fail: clamp(raw.likelihood_fail),
    summary:
      typeof raw.summary === "string"
        ? raw.summary
        : "No summary provided.",
    reasoning:
      typeof raw.reasoning === "object"
        ? raw.reasoning
        : { note: "No reasoning object provided." },
  };
}
