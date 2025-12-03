// lib/limitEngine.js
//
// Rule Engine V3.L2 — Coverage Matrix + Limit Engine
// Uses normalized COI fields produced by normalizeCOI().
//
// Normalized fields expected:
//  - normalized.gl_limit
//  - normalized.auto_limit
//  - normalized.umbrella_limit
//  - normalized.wc_employer_liability
//

// Default profiles (you can tune these numbers per market)
export const COVERAGE_LIMIT_PROFILES = {
  // Generic construction vendor
  standard_construction: {
    gl_min: 1000000,           // GL each occurrence minimum
    auto_min: 1000000,         // Auto combined single limit minimum
    wc_min: 500000,            // Employers liability minimum
    combined_liability_min: 2000000, // GL + Umbrella combined target
  },

  // Slightly stricter profile
  heavy_construction: {
    gl_min: 2000000,
    auto_min: 1000000,
    wc_min: 1000000,
    combined_liability_min: 4000000,
  },
};

// Safely parse numeric value
function toNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^0-9.]/g, "");
  const n = Number(cleaned || "0");
  return Number.isNaN(n) ? 0 : n;
}

// Main limit check
export function checkCoverageLimits(normalized, profileKey = "standard_construction") {
  const cfg = COVERAGE_LIMIT_PROFILES[profileKey] || COVERAGE_LIMIT_PROFILES.standard_construction;

  const alerts = [];

  const gl = toNumber(normalized.gl_limit);
  const auto = toNumber(normalized.auto_limit);
  const umb = toNumber(normalized.umbrella_limit);
  const wc = toNumber(normalized.wc_employer_liability);

  // GL limit too low
  if (cfg.gl_min && gl > 0 && gl < cfg.gl_min) {
    alerts.push({
      code: "GL_LIMIT_TOO_LOW",
      message: `General Liability limit (${gl.toLocaleString()}) is below required minimum (${cfg.gl_min.toLocaleString()}).`,
      severity: "high",
    });
  }

  // Auto limit too low
  if (cfg.auto_min && auto > 0 && auto < cfg.auto_min) {
    alerts.push({
      code: "AUTO_LIMIT_TOO_LOW",
      message: `Automobile Liability limit (${auto.toLocaleString()}) is below required minimum (${cfg.auto_min.toLocaleString()}).`,
      severity: "high",
    });
  }

  // WC Employers Liability too low
  if (cfg.wc_min && wc > 0 && wc < cfg.wc_min) {
    alerts.push({
      code: "WC_LIMIT_TOO_LOW",
      message: `Workers Compensation Employers Liability limit (${wc.toLocaleString()}) is below required minimum (${cfg.wc_min.toLocaleString()}).`,
      severity: "high",
    });
  }

  // Combined GL + Umbrella check
  if (cfg.combined_liability_min) {
    const combined = gl + umb;
    if (combined > 0 && combined < cfg.combined_liability_min) {
      alerts.push({
        code: "COMBINED_LIMIT_TOO_LOW",
        message: `Combined GL + Umbrella limit (${combined.toLocaleString()}) is below required minimum (${cfg.combined_liability_min.toLocaleString()}).`,
        severity: "high",
      });
    }
  }

  return alerts;
}
