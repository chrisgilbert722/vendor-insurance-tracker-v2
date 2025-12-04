// lib/contractNormalizer.js
//
// Normalizes contract document AI output into key insurance requirement fields.
//

export function normalizeContract(ai = {}) {
  const N = {};

  N.doc_type = "contract";

  // Raw text or summary (useful for AI downstream)
  N.summary = ai.summary || null;

  // Insurance requirements section, if extracted
  N.insurance_clause = ai.insuranceClause || ai.insuranceSection || null;

  // Parsed requirement hints (these will later drive auto-rule generation)
  N.required_gl_limit = ai.requiredGlLimit || null;
  N.required_auto_limit = ai.requiredAutoLimit || null;
  N.required_wc_limit = ai.requiredWcLimit || null;
  N.required_umbrella_limit = ai.requiredUmbrellaLimit || null;

  N.requires_additional_insured = ai.requiresAdditionalInsured || false;
  N.requires_waiver_of_subrogation = ai.requiresWaiverOfSubrogation || false;
  N.requires_primary_noncontributory = ai.requiresPrimaryNoncontributory || false;

  return N;
}
