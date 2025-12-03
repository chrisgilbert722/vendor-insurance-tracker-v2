// lib/docClassifier.js
//
// Multi-Document Classifier for Vendor Docs
// Attempts to classify docs as: "coi", "w9", "license", "contract", or "other".
//

export function classifyDocument({ filename = "", mimetype = "", textSample = "" }) {
  const name = (filename || "").toLowerCase();
  const mime = (mimetype || "").toLowerCase();
  const text = (textSample || "").toLowerCase();

  // If it's handled by the COI pipeline, mark as "coi"
  if (name.includes("coi") || name.includes("certificate") || text.includes("certificate of liability")) {
    return "coi";
  }

  // W9 detection
  if (
    name.includes("w9") ||
    text.includes("w-9") ||
    text.includes("form w-9") ||
    text.includes("request for taxpayer identification")
  ) {
    return "w9";
  }

  // License detection
  if (
    name.includes("license") ||
    name.includes("licence") ||
    text.includes("business license") ||
    text.includes("contractor license")
  ) {
    return "license";
  }

  // Contract detection
  if (
    name.includes("contract") ||
    name.includes("agreement") ||
    text.includes("indemnify") ||
    text.includes("hold harmless") ||
    text.includes("insurance requirements")
  ) {
    return "contract";
  }

  // Fallback
  return "other";
}
