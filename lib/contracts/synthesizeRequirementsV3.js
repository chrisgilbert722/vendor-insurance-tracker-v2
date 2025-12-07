// lib/contracts/synthesizeRequirementsV3.js
// ============================================================
// CONTRACT INTELLIGENCE V3 — REQUIREMENT SYNTHESIZER
// Converts parsed contract clauses into a normalized
// insurance requirement profile compatible with:
//   vendors.requirements_json
//   Alert Intelligence V2
//   Rule Engine V5
// ============================================================

export function synthesizeRequirementsV3(parsed) {
  if (!parsed || !parsed.data) {
    return {
      ok: false,
      error: "Invalid contract input"
    };
  }

  const c = parsed.data;

  // -------------------------------
  // 1) REQUIRED COVERAGES
  // -------------------------------
  const required_coverages = [];

  if (c.insurance_requirements?.general_liability?.required) {
    required_coverages.push("GL");
  }
  if (c.insurance_requirements?.auto_liability?.required) {
    required_coverages.push("Auto");
  }
  if (c.insurance_requirements?.workers_comp?.required) {
    required_coverages.push("WC");
  }
  if (c.insurance_requirements?.umbrella?.required) {
    required_coverages.push("Umbrella");
  }

  // -------------------------------
  // 2) LIMITS NORMALIZATION
  // -------------------------------
  const limits = {
    gl_eachOccurrence:
      c.insurance_requirements?.general_liability?.limit_each_occurrence ??
      null,

    gl_aggregate:
      c.insurance_requirements?.general_liidity?.aggregate ??
      null,

    auto_csl:
      c.insurance_requirements?.auto_liability?.limit ??
      null,

    umbrella_limit:
      c.insurance_requirements?.umbrella?.limit ??
      null
  };

  // -------------------------------
  // 3) ENDORSEMENTS
  // -------------------------------
  const endorsements = [];

  if (c.endorsement_clauses?.additional_insured) {
    endorsements.push("Additional Insured");
  }
  if (c.endorsement_clauses?.primary_non_contributory) {
    endorsements.push("Primary & Non-Contributory");
  }
  if (c.endorsement_clauses?.waiver_of_subrogation) {
    endorsements.push("Waiver of Subrogation");
  }

  // -------------------------------
  // 4) NOTES
  // -------------------------------
  const notes =
    c.notes ||
    c.liability_limits ||
    c.indemnification_clause ||
    "AI contract summary — see parsed contract for details.";

  // -------------------------------
  // FINAL NORMALIZED OBJECT
  // -------------------------------
  const normalized = {
    ok: true,
    version: "contract-v3",
    required_coverages,
    limits,
    endorsements,
    notes,
    parties: c.parties || [],
    effective_date: c.effective_date || null,
    termination_date: c.termination_date || null,
    jurisdiction: c.jurisdiction || null
  };

  return normalized;
}
