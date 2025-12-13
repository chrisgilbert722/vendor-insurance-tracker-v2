// pages/api/alerts-v2/list.js
import { listAlertsV2 } from "../../../lib/alertsV2Engine";

/* ============================================================
   FIX RECOMMENDATION ENGINE (A1)
   Deterministic, safe, no side effects
============================================================ */
function getFixRecommendation(alert) {
  const type = alert.type;
  const meta = alert.metadata || {};

  switch (type) {
    case "policy_expired":
      return {
        title: "Request Updated COI",
        description:
          "This policy has expired. An updated certificate of insurance is required to restore compliance.",
        required_document: meta.coverage_type || "Certificate of Insurance",
        action: "request_coi",
        actor: "vendor",
      };

    case "policy_expiring_soon":
      return {
        title: "Request Renewal Confirmation",
        description:
          "This policy is expiring soon. Request a renewal confirmation or updated COI from the vendor.",
        required_document: meta.coverage_type || "Certificate of Insurance",
        action: "request_coi",
        actor: "vendor",
      };

    case "missing_coverage":
      return {
        title: "Request Missing Coverage",
        description:
          "Required insurance coverage is missing. Vendor must upload a policy meeting requirements.",
        required_document: meta.coverage_type || "Required Coverage",
        action: "request_coi",
        actor: "vendor",
      };

    case "insufficient_limits":
      return {
        title: "Request Higher Coverage Limits",
        description:
          "Coverage limits are below requirements. Vendor must provide proof of increased limits.",
        required_document: meta.coverage_type || "Policy Endorsement",
        action: "request_coi",
        actor: "vendor",
      };

    case "elite_engine_fail":
      return {
        title: "Review AI Compliance Failure",
        description:
          "AI compliance checks failed. Review policy details or request clarification from vendor.",
        required_document: meta.coverage_type || null,
        action: "review",
        actor: "admin",
      };

    default:
      return {
        title: "Review Alert",
        description: "This alert requires review to determine next steps.",
        required_document: null,
        action: "review",
        actor: "admin",
      };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, vendorId, limit, includeResolved } = req.query;

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId",
      });
    }

    const limitNum = limit ? Number(limit) : 100;
    const allowResolved =
      String(includeResolved || "").toLowerCase() === "true" ||
      String(includeResolved || "") === "1";

    const alerts = await listAlertsV2({
      orgId: Number(orgId),
      vendorId: vendorId ? Number(vendorId) : null,
      limit: limitNum,
    });

    // 🔒 DEFAULT BEHAVIOR:
    // Hide resolved alerts unless explicitly requested
    const visibleAlerts = allowResolved
      ? alerts
      : alerts.filter((a) => !a.resolved_at);

    // 🔑 Attach fix recommendations (A1)
    const enrichedAlerts = visibleAlerts.map((alert) => ({
      ...alert,
      fix: getFixRecommendation(alert),
    }));

    return res.status(200).json({
      ok: true,
      alerts: enrichedAlerts,
    });
  } catch (err) {
    console.error("[alerts-v2/list] error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal error",
    });
  }
}
