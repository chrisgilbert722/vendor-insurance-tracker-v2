// lib/contracts/matchContractV3.js
// ============================================================
// CONTRACT INTELLIGENCE V3 — MATCHING ENGINE
//
// Compares:
//   - Contract-derived requirementsProfile (contract-v3)
//   - Actual coverage snapshot from COI + endorsements
//
// Returns:
//   {
//     ok: true,
//     status: "passed" | "partial" | "failed" | "missing" | "needs_review",
//     score: number (0–100),
//     issues: [
//       {
//         code,
//         severity,
//         message,
//         requirement,
//         actual
//       }
//     ]
//   }
//
// This file is PURE (no DB writes) so you can call it safely
// from any API route, cron job, or UI handler.
// ============================================================

/**
 * @typedef {Object} MatchIssue
 * @property {string} code
 * @property {"critical"|"high"|"medium"|"low"} severity
 * @property {string} message
 * @property {any} requirement
 * @property {any} actual
 */

/**
 * @typedef {Object} MatchResult
 * @property {boolean} ok
 * @property {"passed"|"partial"|"failed"|"missing"|"needs_review"} status
 * @property {number} score
 * @property {MatchIssue[]} issues
 */

/**
 * Main engine for contract → coverage matching.
 *
 * @param {Object} args
 * @param {Object} args.requirementsProfile   // output of synthesizeRequirementsV3()
 * @param {Object} args.coverageSnapshot      // actual coverage from COI (normalized)
 * @param {Object} args.endorsementsSnapshot  // actual endorsements from parsed endorsements
 * @returns {MatchResult}
 */
export function matchContractV3({
  requirementsProfile,
  coverageSnapshot,
  endorsementsSnapshot,
}) {
  if (!requirementsProfile || !requirementsProfile.required_coverages) {
    return {
      ok: false,
      status: "missing",
      score: 0,
      issues: [
        {
          code: "NO_CONTRACT_REQUIREMENTS",
          severity: "medium",
          message: "No contract-derived insurance requirements available.",
          requirement: null,
          actual: null,
        },
      ],
    };
  }

  const issues = [];

  const req = requirementsProfile;
  const actualCoverage = coverageSnapshot || {};
  const actualEndorsements = normalizeEndorsements(endorsementsSnapshot || {});

  // ----------------------------------------------------
  // 1) COVERAGE PRESENCE CHECKS (GL, Auto, WC, Umbrella)
  // ----------------------------------------------------
  function checkCoveragePresence(code, label) {
    const required = req.required_coverages.includes(code);
    const hasCoverage = !!actualCoverage[code];

    if (required && !hasCoverage) {
      issues.push({
        code: `MISSING_${code.toUpperCase()}`,
        severity: "critical",
        message: `${label} coverage is required by contract but not found on COI.`,
        requirement: { coverage: code },
        actual: actualCoverage[code] || null,
      });
    }
  }

  checkCoveragePresence("GL", "General Liability");
  checkCoveragePresence("Auto", "Auto Liability");
  checkCoveragePresence("WC", "Workers' Compensation");
  checkCoveragePresence("Umbrella", "Umbrella / Excess Liability");

  // ----------------------------------------------------
  // 2) LIMIT MATCHING
  // ----------------------------------------------------
  const limits = req.limits || {};

  function checkLimit({ code, label, requiredLimit, actualLimit, coverageKey }) {
    if (!requiredLimit || requiredLimit <= 0) return; // nothing to enforce

    if (actualLimit == null) {
      issues.push({
        code: `MISSING_LIMIT_${code}`,
        severity: "high",
        message: `${label} limit is required by contract ($${formatNumber(
          requiredLimit
        )}) but not found on COI.`,
        requirement: { minLimit: requiredLimit },
        actual: { limit: actualLimit, coverage: coverageKey },
      });
      return;
    }

    if (actualLimit + 1e-6 < requiredLimit) {
      issues.push({
        code: `LIMIT_TOO_LOW_${code}`,
        severity: "high",
        message: `${label} limit on COI ($${formatNumber(
          actualLimit
        )}) is below contract requirement ($${formatNumber(requiredLimit)}).`,
        requirement: { minLimit: requiredLimit },
        actual: { limit: actualLimit, coverage: coverageKey },
      });
    }
  }

  checkLimit({
    code: "GL_EACH",
    label: "GL Each Occurrence",
    requiredLimit: limits.gl_eachOccurrence,
    actualLimit: actualCoverage.GL?.eachOccurrenceLimit,
    coverageKey: "GL",
  });

  checkLimit({
    code: "GL_AGG",
    label: "GL General Aggregate",
    requiredLimit: limits.gl_aggregate,
    actualLimit: actualCoverage.GL?.aggregateLimit,
    coverageKey: "GL",
  });

  checkLimit({
    code: "AUTO_CSL",
    label: "Auto Combined Single Limit",
    requiredLimit: limits.auto_csl,
    actualLimit: actualCoverage.Auto?.combinedSingleLimit,
    coverageKey: "Auto",
  });

  checkLimit({
    code: "UMB_LIMIT",
    label: "Umbrella Limit",
    requiredLimit: limits.umbrella_limit,
    actualLimit: actualCoverage.Umbrella?.limit,
    coverageKey: "Umbrella",
  });

  // ----------------------------------------------------
  // 3) ENDORSEMENT CHECKS (AI, Waiver, P/NC)
  // ----------------------------------------------------
  const requiredEndorsements = req.endorsements || [];
  const missingRequiredEndorsements = [];

  function requireEndorsement(code, label, fieldKey) {
    const required = requiredEndorsements.some((e) =>
      e.toLowerCase().includes(code.toLowerCase())
    );
    if (!required) return;

    const hasIt = !!actualEndorsements[fieldKey];

    if (!hasIt) {
      issues.push({
        code: `MISSING_ENDORSEMENT_${code.toUpperCase().replace(/\W+/g, "")}`,
        severity: "high",
        message: `${label} endorsement is required by contract but not found in endorsement set.`,
        requirement: { endorsement: code },
        actual: actualEndorsements,
      });
      missingRequiredEndorsements.push(label);
    }
  }

  requireEndorsement(
    "Additional Insured",
    "Additional Insured",
    "additionalInsured"
  );
  requireEndorsement(
    "Primary & Non-Contributory",
    "Primary & Non-Contributory",
    "primaryNonContributory"
  );
  requireEndorsement(
    "Waiver of Subrogation",
    "Waiver of Subrogation",
    "waiverOfSubrogation"
  );

  // ----------------------------------------------------
  // 4) OVERALL STATUS + SCORE
  // ----------------------------------------------------
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 35;
    else if (issue.severity === "high") score -= 20;
    else if (issue.severity === "medium") score -= 10;
    else if (issue.severity === "low") score -= 5;
  }
  if (score < 0) score = 0;

  let status = "passed";

  const hasCritical = issues.some((i) => i.severity === "critical");
  const hasHigh = issues.some((i) => i.severity === "high");
  const hasMedium = issues.some((i) => i.severity === "medium");

  if (!coverageSnapshot || Object.keys(coverageSnapshot).length === 0) {
    status = "missing";
  } else if (hasCritical || hasHigh) {
    status = "failed";
  } else if (hasMedium) {
    status = "partial";
  }

  // If there are no issues but we had to infer a lot, you could set:
  // status = "needs_review";  // if you want human review anyway.

  return {
    ok: true,
    status,
    score,
    issues,
  };
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Normalize endorsements into simple boolean flags:
 * {
 *   additionalInsured: boolean,
 *   waiverOfSubrogation: boolean,
 *   primaryNonContributory: boolean
 * }
 */
function normalizeEndorsements(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      additionalInsured: false,
      waiverOfSubrogation: false,
      primaryNonContributory: false,
    };
  }

  // if the extractor already gives boolean flags, just pass them
  const out = {
    additionalInsured: !!raw.additionalInsured,
    waiverOfSubrogation: !!raw.waiverOfSubrogation,
    primaryNonContributory: !!raw.primaryNonContributory,
  };

  // if there's an `endorsements` array of strings, scan them too
  if (Array.isArray(raw.endorsements)) {
    const flat = raw.endorsements.map((e) => String(e).toLowerCase());
    if (flat.some((e) => e.includes("additional insured"))) {
      out.additionalInsured = true;
    }
    if (flat.some((e) => e.includes("waiver") && e.includes("subrogation"))) {
      out.waiverOfSubrogation = true;
    }
    if (
      flat.some(
        (e) => e.includes("primary") && e.includes("non") && e.includes("contrib")
      )
    ) {
      out.primaryNonContributory = true;
    }
  }

  return out;
}

function formatNumber(n) {
  if (n == null) return "—";
  try {
    return Number(n).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  } catch {
    return String(n);
  }
}
