// lib/onboardingPresets.js

export const ONBOARDING_PRESETS = {
  property_management_v1: {
    id: "property_management_v1",
    label: "Property Management",

    // Default insurance requirements
    requirements: {
      general_liability: {
        required: true,
        min_limit: 1000000,
      },
      auto_liability: {
        required: true,
        min_limit: 1000000,
      },
      workers_comp: {
        required: true,
        required_if_applicable: true,
      },
      umbrella: {
        required: false,
        min_limit: 1000000,
      },
    },

    // Default endorsements
    endorsements: {
      additional_insured: true,
      primary_non_contributory: true,
      waiver_of_subrogation: true,
    },

    // Copy framing (used later in UI / emails)
    language: {
      vendorsLabel: "Vendors servicing your properties",
      portfolioLabel: "Property portfolio",
      ownerLabel: "Property owners",
    },
  },
};
