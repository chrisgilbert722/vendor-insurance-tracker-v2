// pages/api/alerts/index.js
import OpenAI from "openai";
import { supabase } from "../../../lib/supabaseClient";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Basic date helpers */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split("/");
  if (!mm || !dd || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
}

/** Helper to safely lower-case compare coverage type */
function normalizeCoverageType(str) {
  return (str || "").toLowerCase().trim();
}
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId for alerts query." });
    }

    // 1️⃣ Load org, requirements, vendors, policies in parallel
    const [{ data: orgs, error: orgErr }, { data: reqs, error: reqErr }, { data: vendors, error: vendErr }, { data: policies, error: polErr }] =
      await Promise.all([
        supabase.from("orgs").select("*").eq("id", orgId),
        supabase.from("requirements").select("*").eq("org_id", orgId),
        supabase.from("vendors").select("*").eq("org_id", orgId),
        supabase.from("policies").select("*").eq("org_id", orgId),
      ]);

    if (orgErr) {
      console.error("Org fetch error", orgErr);
      throw new Error(orgErr.message);
    }
    if (reqErr) {
      console.error("Requirements fetch error", reqErr);
      throw new Error(reqErr.message);
    }
    if (vendErr) {
      console.error("Vendors fetch error", vendErr);
      throw new Error(vendErr.message);
    }
    if (polErr) {
      console.error("Policies fetch error", polErr);
      throw new Error(polErr.message);
    }

    const org = orgs?.[0] || null;
    const requirements = reqs || [];
    const vendorList = vendors || [];
    const policyList = policies || [];

    const alerts = [];

    // Group policies by vendor
    const policiesByVendor = {};
    for (const p of policyList) {
      if (!p.vendor_id) continue;
      if (!policiesByVendor[p.vendor_id]) policiesByVendor[p.vendor_id] = [];
      policiesByVendor[p.vendor_id].push(p);
    }

    // 2️⃣ Generate raw alerts per vendor
    for (const vendor of vendorList) {
      const vId = vendor.id;
      const vName = vendor.name || vendor.vendor_name || "Unknown vendor";
      const vPolicies = policiesByVendor[vId] || [];

      // 2.1 Missing COIs entirely
      if (vPolicies.length === 0) {
        alerts.push({
          type: "missing_coi",
          severity: "warning",
          vendor_id: vId,
          vendor_name: vName,
          message: `Vendor has no policies on file.`,
          details: {},
        });
      }

      // 2.2 Expiration / date-based alerts
      for (const p of vPolicies) {
        const daysLeft = computeDaysLeft(p.expiration_date);
        if (daysLeft === null) {
          alerts.push({
            type: "missing_expiration",
            severity: "info",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: p.id,
            coverage_type: p.coverage_type,
            message: `Policy is missing an expiration date.`,
            details: {},
          });
          continue;
        }

        if (daysLeft < 0) {
          alerts.push({
            type: "expired_policy",
            severity: "critical",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: p.id,
            coverage_type: p.coverage_type,
            message: `Policy is expired (${daysLeft} days past expiration).`,
            details: { daysLeft },
          });
        } else if (daysLeft <= 30) {
          alerts.push({
            type: "expiring_30",
            severity: "critical",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: p.id,
            coverage_type: p.coverage_type,
            message: `Policy expires within 30 days (${daysLeft} days left).`,
            details: { daysLeft },
          });
        } else if (daysLeft <= 60) {
          alerts.push({
            type: "expiring_60",
            severity: "warning",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: p.id,
            coverage_type: p.coverage_type,
            message: `Policy expires within 60 days (${daysLeft} days left).`,
            details: { daysLeft },
          });
        } else if (daysLeft <= 90) {
          alerts.push({
            type: "expiring_90",
            severity: "info",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: p.id,
            coverage_type: p.coverage_type,
            message: `Policy expires within 90 days (${daysLeft} days left).`,
            details: { daysLeft },
          });
        }
      }

      // 2.3 Requirement-based alerts (coverage, limits, endorsements, risk score)
      for (const rule of requirements) {
        const coverageType = normalizeCoverageType(rule.coverage_type);
        const match = vPolicies.find(
          (p) =>
            normalizeCoverageType(p.coverage_type) === coverageType
        );

        if (!match) {
          alerts.push({
            type: "missing_required_coverage",
            severity: "critical",
            vendor_id: vId,
            vendor_name: vName,
            coverage_type: rule.coverage_type,
            message: `Missing required coverage: ${rule.coverage_type}.`,
            details: { ruleId: rule.id },
          });
          continue;
        }

        // limits
        if (
          rule.min_limit_each_occurrence &&
          (!match.limit_each_occurrence ||
            match.limit_each_occurrence < rule.min_limit_each_occurrence)
        ) {
          alerts.push({
            type: "limit_each_occurrence_too_low",
            severity: "critical",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: match.id,
            coverage_type: match.coverage_type,
            message: `Each occurrence limit for ${match.coverage_type} is below requirement.`,
            details: {
              actual: match.limit_each_occurrence || null,
              required: rule.min_limit_each_occurrence,
            },
          });
        }

        if (
          rule.min_limit_aggregate &&
          (!match.limit_aggregate ||
            match.limit_aggregate < rule.min_limit_aggregate)
        ) {
          alerts.push({
            type: "limit_aggregate_too_low",
            severity: "warning",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: match.id,
            coverage_type: match.coverage_type,
            message: `Aggregate limit for ${match.coverage_type} is below requirement.`,
            details: {
              actual: match.limit_aggregate || null,
              required: rule.min_limit_aggregate,
            },
          });
        }

        // endorsements
        if (rule.require_additional_insured && !match.additional_insured) {
          alerts.push({
            type: "missing_additional_insured",
            severity: "warning",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: match.id,
            coverage_type: match.coverage_type,
            message: `Missing Additional Insured endorsement for ${match.coverage_type}.`,
            details: { ruleId: rule.id },
          });
        }

        if (rule.require_waiver && !match.waiver_of_subrogation) {
          alerts.push({
            type: "missing_waiver",
            severity: "warning",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: match.id,
            coverage_type: match.coverage_type,
            message: `Missing Waiver of Subrogation for ${match.coverage_type}.`,
            details: { ruleId: rule.id },
          });
        }

        // risk score
        if (
          rule.min_risk_score &&
          match.risk_score !== null &&
          match.risk_score !== undefined &&
          match.risk_score < rule.min_risk_score
        ) {
          alerts.push({
            type: "risk_score_below_min",
            severity: "warning",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: match.id,
            coverage_type: match.coverage_type,
            message: `Risk score for ${match.coverage_type} is below required minimum.`,
            details: {
              actual: match.risk_score,
              required: rule.min_risk_score,
            },
          });
        }
      }

      // 2.4 Data quality / AI extraction anomalies
      for (const p of vPolicies) {
        const missingFields = [];
        if (!p.carrier) missingFields.push("carrier");
        if (!p.policy_number) missingFields.push("policy_number");
        if (!p.coverage_type) missingFields.push("coverage_type");
        if (!p.expiration_date) missingFields.push("expiration_date");

        if (missingFields.length > 0) {
          alerts.push({
            type: "incomplete_policy_record",
            severity: "info",
            vendor_id: vId,
            vendor_name: vName,
            policy_id: p.id,
            coverage_type: p.coverage_type,
            message: `Policy record is missing fields: ${missingFields.join(
              ", "
            )}.`,
            details: { missingFields },
          });
        }
      }
    }
    // 3️⃣ Build AI summary (nuclear mode)
    const topAlerts = alerts.slice(0, 80); // cap so prompt doesn't explode

    const aiSummary = await buildAiAlertSummary({
      org,
      alerts: topAlerts,
      vendors: vendorList,
    });

    return res.status(200).json({
      ok: true,
      alerts,
      aiSummary,
    });
  } catch (err) {
    console.error("ALERTS ENGINE ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Alerts engine failed" });
  }
}
async function buildAiAlertSummary({ org, alerts, vendors }) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      summaryText:
        "AI summary unavailable (OPENAI_API_KEY not configured).",
      perVendor: [],
    };
  }

  if (!alerts || alerts.length === 0) {
    return {
      summaryText: "No active alerts. All vendors appear compliant.",
      perVendor: [],
    };
  }

  // Shape data for AI
  const condensed = alerts.map((a) => ({
    type: a.type,
    severity: a.severity,
    vendor: a.vendor_name,
    coverage_type: a.coverage_type || null,
    message: a.message,
  }));

  const orgName = org?.name || "Your organization";

  const prompt = `
You are an AI compliance and risk assistant for a vendor COI monitoring platform.

Organization: ${orgName}

You are given a list of structured alerts about vendor insurance compliance.
Each alert has:
- type
- severity (critical, warning, info)
- vendor
- coverage_type (optional)
- message

Your tasks:
1. Give a concise overall summary (2–3 sentences) of the current risk posture.
2. Highlight the top 3–5 most urgent issues (especially "critical" and missing coverage / expired policies).
3. Group concerns by vendor, and for each vendor, briefly say what's wrong and what action is needed.
4. Keep it non-legal, actionable, and easy to read (for operations/compliance staff).

Here are the alerts:

${JSON.stringify(condensed, null, 2)}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content || "";

    return {
      summaryText: text,
      perVendor: [], // you can later parse sections if you want structured per-vendor insight
    };
  } catch (err) {
    console.error("AI summary error:", err);
    return {
      summaryText:
        "Failed to generate AI summary. Check OpenAI configuration.",
      perVendor: [],
    };
  }
}
