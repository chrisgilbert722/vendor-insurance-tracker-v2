// pages/api/docs/validate-w9.js
// =============================================================
// MULTI-DOCUMENT INTELLIGENCE V2 — STEP 3
// W-9 VALIDATOR
//
// Takes extracted W-9 JSON (from extract-w9 endpoint) and:
//  - Validates required fields
//  - Checks SSN/EIN format
//  - Compares to vendor record (optional)
//  - Flags missing signature / date
//  - Computes a validation score
//  - Optionally logs timeline + alerts for serious issues
//
// Expects JSON body:
// {
//   "vendorId": number | string | null,
//   "orgId":    number | string | null,
//   "data": {
//     "name": string|null,
//     "businessName": string|null,
//     "tinType": "SSN" | "EIN" | null,
//     "ssn": string|null,
//     "ein": string|null,
//     "address": string|null,
//     "cityStateZip": string|null,
//     "signature": string|null,
//     "signedDate": string|null
//   }
// }
// =============================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ ok: false, error: "Use POST." });
    }

    const { vendorId, orgId, data } = req.body || {};

    if (!data || typeof data !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid W-9 data payload.",
      });
    }

    const vendorIdNum =
      vendorId != null && vendorId !== ""
        ? Number(vendorId)
        : null;
    const orgIdNum =
      orgId != null && orgId !== ""
        ? Number(orgId)
        : null;

    // Normalize fields
    const {
      name,
      businessName,
      tinType,
      ssn,
      ein,
      address,
      cityStateZip,
      signature,
      signedDate,
    } = data;

    const issues = [];

    // =========================================================
    // BASIC REQUIRED FIELD CHECKS
    // =========================================================
    if (!name) {
      issues.push({
        code: "MISSING_NAME",
        severity: "high",
        field: "name",
        message: "Legal name (Line 1) is missing.",
        suggestion:
          "Ensure the legal name (individual or business) is filled in on Line 1 of the W-9.",
      });
    }

    if (!tinType || (tinType !== "SSN" && tinType !== "EIN")) {
      issues.push({
        code: "MISSING_TIN_TYPE",
        severity: "high",
        field: "tinType",
        message: "TIN type (SSN or EIN) could not be determined.",
        suggestion:
          "Confirm whether the W-9 is using an SSN (individual/sole prop) or EIN (entity) and mark the correct checkbox.",
      });
    }

    if (!address || !cityStateZip) {
      issues.push({
        code: "MISSING_ADDRESS",
        severity: "medium",
        field: "address",
        message: "Mailing address is incomplete or missing.",
        suggestion:
          "Ensure the W-9 shows complete mailing address including street, city, state, and ZIP.",
      });
    }

    // =========================================================
    // TIN FORMAT VALIDATION
    // =========================================================
    const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
    const einRegex = /^\d{2}-\d{7}$/;

    if (tinType === "SSN") {
      if (!ssn) {
        issues.push({
          code: "MISSING_SSN",
          severity: "high",
          field: "ssn",
          message: "TIN type is SSN but SSN value is missing.",
          suggestion:
            "Ensure the SSN is present and legible on the W-9 in the SSN field.",
        });
      } else if (!ssnRegex.test(ssn)) {
        issues.push({
          code: "INVALID_SSN_FORMAT",
          severity: "high",
          field: "ssn",
          message: "SSN format is invalid (expected XXX-XX-XXXX).",
          suggestion:
            "Format the SSN as 9 digits in the pattern XXX-XX-XXXX. Confirm digits are correct.",
        });
      }
    }

    if (tinType === "EIN") {
      if (!ein) {
        issues.push({
          code: "MISSING_EIN",
          severity: "high",
          field: "ein",
          message: "TIN type is EIN but EIN value is missing.",
          suggestion:
            "Ensure the EIN is present and legible on the W-9 in the EIN field.",
        });
      } else if (!einRegex.test(ein)) {
        issues.push({
          code: "INVALID_EIN_FORMAT",
          severity: "high",
          field: "ein",
          message: "EIN format is invalid (expected XX-XXXXXXX).",
          suggestion:
            "Format the EIN as 9 digits in the pattern XX-XXXXXXX. Confirm digits are correct.",
        });
      }
    }

    // =========================================================
    // SIGNATURE + DATE VALIDATION
    // =========================================================
    if (!signature) {
      issues.push({
        code: "MISSING_SIGNATURE",
        severity: "high",
        field: "signature",
        message: "Signature is missing from the W-9.",
        suggestion:
          "Ensure the W-9 is signed by an authorized individual before submission.",
    });
    }

    let parsedSignedDate = null;
    if (!signedDate) {
      issues.push({
        code: "MISSING_SIGNED_DATE",
        severity: "medium",
        field: "signedDate",
        message: "Signed date is missing from the W-9.",
        suggestion:
          "Ensure the date of signature is filled in on the W-9 form.",
      });
    } else {
      const d = new Date(signedDate);
      if (isNaN(d.getTime())) {
        issues.push({
          code: "INVALID_SIGNED_DATE",
          severity: "medium",
          field: "signedDate",
          message: "Signed date could not be parsed.",
          suggestion:
            "Ensure the signed date is clearly legible and in a standard date format (e.g., MM/DD/YYYY).",
        });
      } else {
        parsedSignedDate = d;
        // Optional: consider W-9 "stale" if older than 4 years
        const now = new Date();
        const ageYears =
          (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (ageYears > 4) {
          issues.push({
            code: "STALE_W9",
            severity: "low",
            field: "signedDate",
            message: "W-9 appears to be older than 4 years.",
            suggestion:
              "Consider requesting an updated W-9 to ensure current information.",
          });
        }
      }
    }

    // =========================================================
    // OPTIONAL: COMPARE VENDOR RECORD NAME
    // =========================================================
    let vendorRecord = null;

    if (vendorIdNum && !isNaN(vendorIdNum)) {
      const rows = await sql`
        SELECT id, vendor_name, email, org_id
        FROM vendors
        WHERE id = ${vendorIdNum}
        LIMIT 1;
      `;
      if (rows.length > 0) vendorRecord = rows[0];
    }

    if (vendorRecord && name) {
      const w9Name = (name || "").trim().toLowerCase();
      const vendorName = (vendorRecord.vendor_name || "").trim().toLowerCase();

      if (w9Name && vendorName && w9Name !== vendorName) {
        issues.push({
          code: "NAME_MISMATCH",
          severity: "high",
          field: "name",
          message: `W-9 name "${name}" does not match vendor record "${vendorRecord.vendor_name}".`,
          suggestion:
            "Confirm that the W-9 is for the same legal entity as the vendor in the system, or update the vendor record / W-9 as appropriate.",
        });
      }
    }

    // =========================================================
    // SCORE & VALID FLAG
    // =========================================================
    let score = 100;

    for (const issue of issues) {
      if (issue.severity === "critical") score -= 40;
      if (issue.severity === "high") score -= 25;
      if (issue.severity === "medium") score -= 10;
      if (issue.severity === "low") score -= 5;
    }

    if (score < 0) score = 0;

    const hasBlockingIssues = issues.some(
      (i) => i.severity === "critical" || i.severity === "high"
    );

    const valid = !hasBlockingIssues;

    // =========================================================
    // OPTIONAL: LOG TIMELINE + ALERTS FOR BLOCKING ISSUES
    // =========================================================
    if (vendorRecord && orgIdNum && hasBlockingIssues) {
      const summaryMsg = `W-9 validation found critical/high issues (score ${score}).`;

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgIdNum}, ${vendorRecord.id}, 'w9_validation_issue', ${summaryMsg}, 'warning');
      `;

      await sql`
        INSERT INTO alerts (
          created_at, is_read, org_id, vendor_id, type,
          message, severity, title, rule_label, status
        )
        VALUES (
          NOW(), false, ${orgIdNum}, ${vendorRecord.id}, 'W9',
          ${summaryMsg}, ${hasBlockingIssues ? "High" : "Medium"},
          'W-9 validation issues',
          'W9 Validation',
          'Open'
        );
      `;
    }

    // =========================================================
    // RETURN RESULT
    // =========================================================
    return res.status(200).json({
      ok: true,
      vendorId: vendorIdNum,
      orgId: orgIdNum,
      valid,
      score,
      issues,
    });
  } catch (err) {
    console.error("[W9 VALIDATION ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal W-9 validation error.",
    });
  }
}
