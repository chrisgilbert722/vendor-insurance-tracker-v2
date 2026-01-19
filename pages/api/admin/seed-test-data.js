// pages/api/admin/seed-test-data.js
// ============================================================
// SEED TEST DATA — Generate 60-80 realistic vendors with policies
// Creates vendors with mixed coverage, expiration dates, limits
// Designed to exercise the entire compliance engine
// ============================================================

import crypto from "crypto";
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";

// Insurance carriers
const CARRIERS = [
  "State Farm", "Allstate", "Liberty Mutual", "Travelers", "Hartford",
  "Chubb", "AIG", "Zurich", "CNA", "Nationwide", "Progressive",
  "Cincinnati Insurance", "Hanover", "Berkshire Hathaway", "AmTrust"
];

// Vendor company names by industry
const VENDOR_NAMES = {
  construction: [
    "Apex Construction LLC", "Summit Builders Inc", "Cornerstone Contractors",
    "Precision Framing Co", "Ironwood Construction", "Atlas Building Group",
    "Keystone Builders", "Titan Construction Services", "Heritage Contractors",
    "Foundation First LLC", "Steelwork Solutions", "Premier Drywall Inc"
  ],
  electrical: [
    "PowerLine Electric", "Volt Masters Inc", "Bright Spark Electrical",
    "Current Solutions LLC", "Wired Right Electric", "Lightning Electric Co",
    "ProWatt Services", "Circuit Pro Electric", "Amp Up Electrical"
  ],
  plumbing: [
    "FlowTech Plumbing", "AquaPro Services", "PipeMaster LLC",
    "ClearDrain Plumbing", "WaterWorks Inc", "DrainPro Solutions",
    "Premier Pipe Services", "Hydro Systems LLC", "BlueLine Plumbing"
  ],
  hvac: [
    "CoolBreeze HVAC", "TempControl Systems", "AirFlow Pros",
    "Climate Masters Inc", "Arctic Air Services", "Comfort Zone HVAC",
    "PureAir Solutions", "ThermoTech Services", "HeatingCooling Pro"
  ],
  landscaping: [
    "GreenScape Services", "Nature's Touch Landscaping", "Premier Lawn Care",
    "EcoGreen Landscapers", "Verdant Gardens LLC", "TurfMaster Pro",
    "Earthworks Landscaping", "Bloomfield Gardens", "LawnPerfect Inc"
  ],
  cleaning: [
    "SparkleClean Services", "PrimeClean Solutions", "Crystal Clear Janitorial",
    "ProShine Cleaning", "Spotless Commercial", "MasterClean Corp",
    "PureSpace Janitorial", "CleanSweep Services", "Pristine Pro Cleaning"
  ],
  security: [
    "Guardian Security Services", "Sentinel Protection", "ShieldForce Security",
    "Apex Guard Services", "Ironclad Security", "VigilantPro Security",
    "SafeWatch Services", "Fortress Security LLC", "SecureFirst Protection"
  ],
  roofing: [
    "SkyTop Roofing", "Pinnacle Roof Systems", "StormShield Roofing",
    "TopNotch Roofers", "WeatherGuard Roofing", "RoofMaster Pro",
    "Apex Roofing Solutions", "Highland Roofing Co", "ShinglePro Services"
  ],
  technology: [
    "TechForward Solutions", "DataPro IT Services", "CloudWave Tech",
    "CyberShield IT", "InnovateTech LLC", "DigitalFirst Services",
    "NetPro Solutions", "ByteWise Technologies", "SmartSys IT"
  ]
};

// Coverage types with typical limits
const COVERAGE_TYPES = [
  { type: "GL", name: "General Liability", minLimit: 1000000, goodLimit: 2000000 },
  { type: "WC", name: "Workers Compensation", minLimit: 500000, goodLimit: 1000000 },
  { type: "AUTO", name: "Commercial Auto", minLimit: 500000, goodLimit: 1000000 },
  { type: "UMBRELLA", name: "Umbrella/Excess", minLimit: 1000000, goodLimit: 5000000 },
  { type: "PROF", name: "Professional Liability", minLimit: 1000000, goodLimit: 2000000 }
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePolicyNumber() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const prefix = letters[randomInt(0, 25)] + letters[randomInt(0, 25)];
  const number = randomInt(1000000, 9999999);
  return `${prefix}-${number}`;
}

function generateExpirationDate(category) {
  const now = new Date();
  let daysOffset;

  switch (category) {
    case "expired":
      // Expired 1-90 days ago
      daysOffset = -randomInt(1, 90);
      break;
    case "critical":
      // Expires in 1-30 days
      daysOffset = randomInt(1, 30);
      break;
    case "warning":
      // Expires in 31-90 days
      daysOffset = randomInt(31, 90);
      break;
    case "good":
    default:
      // Expires in 91-365 days
      daysOffset = randomInt(91, 365);
      break;
  }

  const expDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  return expDate.toISOString().split("T")[0];
}

function generateLimit(coverage, quality) {
  const base = coverage.minLimit;

  switch (quality) {
    case "below":
      // 50-90% of minimum (fails compliance)
      return Math.round(base * (0.5 + Math.random() * 0.4));
    case "minimum":
      // Exactly at minimum
      return base;
    case "good":
    default:
      // 100-200% of minimum
      return Math.round(base * (1 + Math.random()));
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Org not resolved" });
    }

    const { vendorCount = 70, clearExisting = false } = req.body || {};

    // Optionally clear existing data first
    if (clearExisting) {
      // Get vendor IDs
      const vendorRows = await sql`SELECT id FROM vendors WHERE org_id = ${orgId}`;
      const vendorIds = vendorRows.map(v => v.id);

      if (vendorIds.length > 0) {
        try { await sql`DELETE FROM alerts_v2 WHERE org_id = ${orgId}`; } catch {}
        try { await sql`DELETE FROM policies WHERE org_id = ${orgId}`; } catch {}
        try { await sql`DELETE FROM vendors WHERE org_id = ${orgId}`; } catch {}
      }
    }

    const results = {
      vendorsCreated: 0,
      policiesCreated: 0,
      distribution: {
        expired: 0,
        critical: 0,
        warning: 0,
        good: 0,
        belowLimits: 0,
        missingCoverage: 0,
        missingEndorsements: 0
      }
    };

    // Flatten all vendor names
    const allVendorNames = Object.values(VENDOR_NAMES).flat();
    const selectedVendors = [];

    // Select random vendors
    const used = new Set();
    while (selectedVendors.length < Math.min(vendorCount, allVendorNames.length)) {
      const name = randomElement(allVendorNames);
      if (!used.has(name)) {
        used.add(name);
        selectedVendors.push(name);
      }
    }

    for (let i = 0; i < selectedVendors.length; i++) {
      const vendorName = selectedVendors[i];

      // Determine vendor profile
      // 20% expired, 30% critical (≤30d), 20% warning (31-90d), 30% good (>90d)
      const profileRand = Math.random();
      let expirationCategory;
      if (profileRand < 0.20) {
        expirationCategory = "expired";
        results.distribution.expired++;
      } else if (profileRand < 0.50) {
        expirationCategory = "critical";
        results.distribution.critical++;
      } else if (profileRand < 0.70) {
        expirationCategory = "warning";
        results.distribution.warning++;
      } else {
        expirationCategory = "good";
        results.distribution.good++;
      }

      // Create vendor
      const externalUuid = crypto.randomUUID();
      const vendorEmail = vendorName.toLowerCase().replace(/[^a-z0-9]/g, "") + "@vendor.com";

      const insertedVendor = await sql`
        INSERT INTO vendors (org_id, name, email, external_uuid, created_at)
        VALUES (${orgId}, ${vendorName}, ${vendorEmail}, ${externalUuid}, NOW())
        RETURNING id;
      `;
      const vendorId = insertedVendor[0].id;
      results.vendorsCreated++;

      // Decide which coverages this vendor has
      // 85% have GL, 70% have WC, 60% have Auto, 30% have Umbrella, 20% have Prof
      const coverages = [];
      if (Math.random() < 0.85) coverages.push(COVERAGE_TYPES[0]); // GL
      if (Math.random() < 0.70) coverages.push(COVERAGE_TYPES[1]); // WC
      if (Math.random() < 0.60) coverages.push(COVERAGE_TYPES[2]); // Auto
      if (Math.random() < 0.30) coverages.push(COVERAGE_TYPES[3]); // Umbrella
      if (Math.random() < 0.20) coverages.push(COVERAGE_TYPES[4]); // Prof

      // Track if vendor is missing expected coverage
      if (coverages.length < 2) {
        results.distribution.missingCoverage++;
      }

      // Create policies for each coverage
      for (const coverage of coverages) {
        const carrier = randomElement(CARRIERS);
        const policyNumber = generatePolicyNumber();
        const expDate = generateExpirationDate(expirationCategory);

        // Limit quality: 15% below, 25% minimum, 60% good
        const limitRand = Math.random();
        let limitQuality;
        if (limitRand < 0.15) {
          limitQuality = "below";
          results.distribution.belowLimits++;
        } else if (limitRand < 0.40) {
          limitQuality = "minimum";
        } else {
          limitQuality = "good";
        }

        const limit = generateLimit(coverage, limitQuality);

        // Endorsements: 75% have AI, 80% have WOS
        const hasAdditionalInsured = Math.random() < 0.75;
        const hasWaiverOfSubrogation = Math.random() < 0.80;

        if (!hasAdditionalInsured || !hasWaiverOfSubrogation) {
          results.distribution.missingEndorsements++;
        }

        // Build policy insert with correct column names
        await sql`
          INSERT INTO policies (
            org_id,
            vendor_id,
            coverage_type,
            carrier,
            policy_number,
            expiration_date,
            limit_each_occurrence,
            limit_general_aggregate,
            additional_insured,
            waiver_of_subrogation,
            created_at
          )
          VALUES (
            ${orgId},
            ${vendorId},
            ${coverage.type},
            ${carrier},
            ${policyNumber},
            ${expDate},
            ${limit},
            ${Math.round(limit * 2)},
            ${hasAdditionalInsured},
            ${hasWaiverOfSubrogation},
            NOW()
          );
        `;
        results.policiesCreated++;
      }
    }

    return res.status(200).json({
      ok: true,
      message: `Seeded ${results.vendorsCreated} vendors with ${results.policiesCreated} policies`,
      results,
      nextSteps: [
        "Run compliance engine: POST /api/cron/renewals",
        "View dashboard: /dashboard",
        "Check alerts: /admin/alerts"
      ]
    });
  } catch (err) {
    console.error("[seed-test-data] Error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
