// lib/onboardingPresets.js
// ============================================================
// Onboarding Presets
// - Horizontal engine, vertical-specific defaults
// - Presets are applied once at onboarding start
// ============================================================

export const ONBOARDING_PRESETS = {
  property_management_v1: {
    id: "property_management_v1",
    label: "Property Management",
    version: 1,

    // ----------------------------------------------------------
    // Default insurance requirements for PMs
    // ----------------------------------------------------------
    requirements: {
      general_liability: {
        required: true,
        min_limit: 1_000_000,
      },
      auto_liability: {
        required: true,
        min_limit: 1_000_000,
      },
      workers_comp: {
        required: true,
        required_if_applicable: true,
      },
      umbrella: {
        required: false,
        min_limit: 1_000_000,
      },
    },

    // ----------------------------------------------------------
    // Default endorsement expectations
    // ----------------------------------------------------------
    endorsements: {
      additional_insured: true,
      primary_non_contributory: true,
      waiver_of_subrogation: true,
    },

    // ----------------------------------------------------------
    // PM-specific language framing
    // (used by UI, emails, risk preview, reports)
    // ----------------------------------------------------------
    language: {
      vendorPlural: "Vendors servicing your properties",
      vendorSingular: "Vendor servicing your property",
      portfolioLabel: "Property portfolio",
      ownerLabel: "Property owners",
      riskLabel: "Owner liability exposure",
    },

    // ----------------------------------------------------------
    // PM context flags (used later for behavior toggles)
    // ----------------------------------------------------------
    context: {
      vertical: "property_management",
      supportsOwners: true,
      supportsMultipleProperties: true,
    },
  },
};
