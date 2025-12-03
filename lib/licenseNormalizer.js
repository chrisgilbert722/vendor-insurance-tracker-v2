// lib/licenseNormalizer.js
//
// Normalizes business license extracted data.
//

export function normalizeLicense(ai = {}) {
  const N = {};

  N.doc_type = "license";

  N.license_number =
    ai.licenseNumber ||
    ai.licNumber ||
    ai.number ||
    null;

  N.license_type =
    ai.licenseType ||
    ai.type ||
    null;

  N.jurisdiction =
    ai.jurisdiction ||
    ai.state ||
    ai.city ||
    null;

  N.expiration_date =
    ai.expirationDate ||
    ai.expiry ||
    null;

  N.holder_name =
    ai.holderName ||
    ai.businessName ||
    ai.legalName ||
    null;

  return N;
}
