// lib/w9Normalizer.js
//
// Normalizes W-9 extracted data into a consistent structure.
//

export function normalizeW9(ai = {}) {
  const N = {};

  N.form_type = "w9";

  // Business / individual name
  N.name = ai.name || ai.legalName || ai.businessName || null;

  // Taxpayer Identification Number
  N.tin = ai.tin || ai.taxId || ai.ein || ai.ssn || null;

  // Entity type (LLC, corporation, sole prop, etc.)
  N.entity_type =
    ai.entityType ||
    ai.businessType ||
    ai.classification ||
    null;

  // Address
  N.address = ai.address || null;
  N.city = ai.city || null;
  N.state = ai.state || null;
  N.postal_code = ai.postalCode || ai.zip || null;

  // Backup withholding yes/no
  N.backup_withholding = ai.backupWithholding || null;

  return N;
}
