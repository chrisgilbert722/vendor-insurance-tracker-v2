// pages/api/vendors/[id].js

// TEMP MOCK IMPLEMENTATION
// Later: replace with real Postgres query using vendorId + orgId, etc.

const mockVendors = {
  "summit-roofing": {
    id: "summit-roofing",
    name: "Summit Roofing & Coatings",
    category: "Roofing / Exterior Work",
    location: "Denver, CO",
    tags: ["Onsite contractor", "High risk", "Exterior work"],
    contactEmail: "risk@summitroofing.example",
    complianceScore: 72,
    status: "At Risk",
    riskLevel: "High",
    alertsOpen: 3,
    criticalIssues: 1,
    lastUpdated: "2025-11-20T14:23:00Z",
    aiSummary:
      "Vendor is 72% compliant. GL limits are below blueprint, Workers Comp is missing for onsite crew, and the primary COI expires in 23 days. Treat as high risk until limits and coverage are corrected.",

    coverage: [
      {
        id: "gl-each-occurrence",
        label: "General Liability — Each Occurrence",
        required: 1000000,
        actual: 500000,
        unit: "per occurrence",
        status: "Fail",
        severity: "High",
        field: "Certificate.glEachOccurrence",
      },
      {
        id: "gl-aggregate",
        label: "General Liability — General Aggregate",
        required: 2000000,
        actual: 2000000,
        unit: "aggregate",
        status: "Pass",
        severity: "Medium",
        field: "Certificate.glGeneralAggregate",
      },
      {
        id: "auto-liab",
        label: "Auto Liability — Combined Single Limit",
        required: 1000000,
        actual: 1000000,
        unit: "combined single limit",
        status: "Pass",
        severity: "High",
        field: "Certificate.autoLiability",
      },
      {
        id: "umbrella",
        label: "Umbrella / Excess",
        required: 5000000,
        actual: 3000000,
        unit: "limit",
        status: "Fail",
        severity: "High",
        field: "Certificate.umbrellaLimit",
      },
    ],

    endorsements: [
      {
        id: "ai",
        label: "Additional Insured – Ongoing Operations",
        required: true,
        present: false,
        severity: "Critical",
        expectation: "AI wording (CG 20 10 or equivalent) naming your org.",
        finding: "No AI wording detected on COI or endorsements.",
      },
      {
        id: "waiver",
        label: "Waiver of Subrogation",
        required: true,
        present: true,
        severity: "Medium",
        expectation:
          "Named waiver of subrogation in favor of your organization.",
        finding: "Generic waiver wording present; does not name your org.",
      },
    ],

    documents: [
      {
        id: "coi",
        label: "Certificate of Insurance",
        type: "COI",
        status: "Expires in 23 days",
        severity: "Medium",
        present: true,
      },
      {
        id: "contract",
        label: "Signed Contract / MSA",
        type: "Contract",
        status: "On file",
        severity: "Low",
        present: true,
      },
      {
        id: "safety",
        label: "Safety Program / OSHA Docs",
        type: "Safety",
        status: "Missing",
        severity: "Low",
        present: false,
      },
    ],

    rulesFired: [
      {
        id: "r1",
        severity: "Critical",
        label: "General Liability Below Required",
        description:
          "GL each occurrence limit is below blueprint requirement while vendor is active.",
        dsl: "Certificate.glEachOccurrence < Org.requiredGLEachOccurrence AND Vendor.isActive = true",
        timestamp: "2025-11-20T14:23:00Z",
      },
      {
        id: "r2",
        severity: "High",
        label: "Onsite Contractor Requires Workers Comp",
        description:
          "Vendor flagged as onsite contractor but no Workers Compensation coverage found.",
        dsl: "Vendor.category IN ('Onsite Contractor','Construction') AND Certificate.workersComp IS NULL",
        timestamp: "2025-11-18T13:40:00Z",
      },
      {
        id: "r3",
        severity: "Medium",
        label: "Expires Within 30 Days",
        description:
          "Primary GL policy expiration within next 30 days for active vendor.",
        dsl: "Certificate.glExpirationDate <= today + 30 days AND Vendor.isActive = true",
        timestamp: "2025-11-17T10:30:00Z",
      },
    ],

    requirementsSummary: {
      total: 14,
      passed: 10,
      failed: 4,
      byType: {
        coverage: { passed: 2, failed: 2 },
        endorsements: { passed: 1, failed: 1 },
        documents: { passed: 2, failed: 1 },
        logical: { passed: 5, failed: 0 },
      },
    },

    timeline: [
      {
        id: "t1",
        type: "Rule",
        label: "GL limit below required",
        severity: "Critical",
        timestamp: "2025-11-20T14:23:00Z",
        detail:
          "GL each occurrence $500,000. Blueprint requires $1,000,000 per occurrence.",
      },
      {
        id: "t2",
        type: "Rule",
        label: "Onsite contractor missing Workers Comp",
        severity: "High",
        timestamp: "2025-11-18T13:40:00Z",
        detail:
          "Vendor category = Onsite contractor; Workers Comp coverage not detected on any policy.",
      },
      {
        id: "t3",
        type: "Rule",
        label: "GL policy expires in 23 days",
        severity: "Medium",
        timestamp: "2025-11-17T10:30:00Z",
        detail:
          "Primary GL expiration in 23 days. Email notification sent to vendor contact.",
      },
      {
        id: "t4",
        type: "Document",
        label: "Contract uploaded",
        severity: "Low",
        timestamp: "2025-11-12T09:10:00Z",
        detail: "Signed MSA (3-year term) uploaded and linked to vendor.",
      },
    ],
  },
};

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    // Later: fetch from Postgres instead of mock
    const vendor = mockVendors[id] || mockVendors["summit-roofing"];

    if (!vendor) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found" });
    }

    // For compatibility with older code that expects org + policies:
    const organization = {
      id: "demo-org",
      name: "Demo Organization",
    };

    const policies = (vendor.coverage || []).map((c, idx) => ({
      id: `policy-${idx}`,
      coverage_type: c.label,
      policy_number: "DEMO-123",
      carrier: "Demo Carrier",
      effective_date: "2025-01-01",
      expiration_date: "2025-12-31",
      limit_each_occurrence: c.required,
      limit_aggregate: c.required * 2,
    }));

    return res.status(200).json({
      ok: true,
      vendor,
      organization,
      policies,
    });
  } catch (err) {
    console.error("Vendor API error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Server error" });
  }
}
