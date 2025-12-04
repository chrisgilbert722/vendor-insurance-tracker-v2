// lib/normalizeCOI.js
//
// Coverage Normalization Engine for Rule Engine V3
// Converts raw AI extraction (ai_json) into a clean, predictable
// dataset for rules_v3 and endorsement matrix logic.
//

export function normalizeCOI(ai = {}) {
  const N = {};

  // -------------------------------------------
  // Named Insured
  // -------------------------------------------
  N.named_insured = ai?.namedInsured || ai?.insuredName || null;

  // -------------------------------------------
  // Policy Expiration
  // -------------------------------------------
  N.expiration_date =
    ai?.policyExpiration ||
    ai?.expirationDate ||
    ai?.expDate ||
    null;

  // -------------------------------------------
  // Coverage: General Liability
  // -------------------------------------------
  N.gl_limit =
    ai?.limits?.general_liability ||
    ai?.limits?.generalLiability ||
    ai?.generalLiabilityLimit ||
    null;

  N.gl_each_occurrence =
    ai?.limits?.glEachOccurrence ||
    ai?.generalLiabilityEachOccurrence ||
    null;

  N.gl_aggregate =
    ai?.limits?.glAggregate ||
    ai?.generalLiabilityAggregate ||
    null;

  // -------------------------------------------
  // Coverage: Auto Liability
  // -------------------------------------------
  N.auto_limit =
    ai?.limits?.auto_liability ||
    ai?.limits?.autoLiability ||
    ai?.autoLiabilityLimit ||
    null;

  // -------------------------------------------
  // Coverage: Umbrella / Excess
  // -------------------------------------------
  N.umbrella_limit =
    ai?.limits?.umbrella ||
    ai?.limits?.umbrellaLiability ||
    ai?.umbrellaLimit ||
    null;

  // -------------------------------------------
  // Coverage: Workers Comp
  // -------------------------------------------
  N.wc_employer_liability =
    ai?.limits?.employers_liability ||
    ai?.limits?.employersLiability ||
    ai?.employersLiabilityLimit ||
    null;

  // -------------------------------------------
  // Endorsements
  // -------------------------------------------
  N.endorsements = ai?.endorsements || [];

  // Clean endorsement codes
  N.endorsements = N.endorsements.map((e) =>
    String(e)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
  );

  // -------------------------------------------
  // Coverage existence flags
  // -------------------------------------------
  N.has_gl = !!N.gl_limit;
  N.has_auto = !!N.auto_limit;
  N.has_umbrella = !!N.umbrella_limit;
  N.has_wc = !!N.wc_employer_liability;

  return N;
}
