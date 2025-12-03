// lib/endorsementMatrix.js
//
// Endorsement requirement engine for Rule Engine V3
//

export const ENDORSEMENT_MATRIX = {
  minimal: [],

  standard_construction: [
    "CG2010", // Additional Insured
    "CG2037", // Completed ops
    "WOS",    // Waiver of Subrogation
    "PNC",    // Primary & Noncontributory (abbreviated)
  ],

  heavy_construction: [
    "CG2010",
    "CG2037",
    "CG2026",
    "CG2404",
    "CG2012",
    "WOS",
    "PNC",
  ],

  vendor_standard: [
    "CG2010",
    "CG2037",
    "WOS",
  ],
};

export function checkMissingEndorsements(normalized, profileType = "standard_construction") {
  const required = ENDORSEMENT_MATRIX[profileType] || [];
  const existing = normalized.endorsements || [];

  const missing = required.filter((r) => !existing.includes(r));

  return missing;
}
