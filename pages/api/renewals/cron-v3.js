// pages/api/renewals/cron-v3.js
// Renewal Automation V3 — 7 / 3 / 1 day pre-expiration alerts

import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";

/*
  This endpoint is designed to be called by a CRON / scheduler.

  POST /api/renewals/cron-v3
  Content-Type: application/json

  {
    "orgId": "optional-org-id",              // if omitted, runs for ALL orgs found in policies
    "windows": [7, 3, 1]                     // optional override for reminder days
  }
*/

const DEFAULT_WINDOWS = [7, 3, 1];

/* ===========================
   DATE HELPERS
=========================== */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  const diffMs = d.getTime() - Date.now();
  return Math.floor(diffMs / 86400000);
}

/* ===========================
   MAIN HANDLER
=========================== */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, windows } = req.body || {};
    const reminderWindows = Array.isArray(windows) && windows.length
      ? windows.map((n) => Number(n)).filter((n) => !Number.isNaN(n))
      : DEFAULT_WINDOWS;

    // 1) Load policies from Supabase
    // You can add more fields here if your table supports them.
    const { data: policies, error: pErr } = await supabase
      .from("policies")
      .select("id, vendor_id, org_id, vendor_name, expiration_date");

    if (pErr) {
      console.error("[renewals/cron-v3] Supabase policies error:", pErr);
      return res
        .status(500)
        .json({ ok: false, error: "Failed to load policies from Supabase." });
    }

    if (!policies || policies.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "No policies found.",
        alertsInserted: 0,
      });
    }

    // 2) Filter by org if provided
    const filteredPolicies = orgId
      ? policies.filter((p) => String(p.org_id) === String(orgId))
      : policies;

    if (!filteredPolicies.length) {
      return res.status(200).json({
        ok: true,
        message: "No policies match the given orgId.",
        alertsInserted: 0,
      });
    }

    // 3) Compute days left and find those in reminder windows
    const candidates = [];
    const windowSet = new Set(reminderWindows);

    for (const p of filteredPolicies) {
      const daysLeft = computeDaysLeft(p.expiration_date);
      if (daysLeft == null) continue;
      if (daysLeft < 0) continue; // already expired
      if (!windowSet.has(daysLeft)) continue; // not in 7/3/1 (or custom)

      candidates.push({
        policyId: p.id,
        vendorId: p.vendor_id,
        orgId: p.org_id,
        vendorName: p.vendor_name || "Vendor",
        expirationDate: p.expiration_date,
        daysLeft,
      });
    }

    if (!candidates.length) {
      return res.status(200).json({
        ok: true,
        message: "No policies within reminder windows.",
        alertsInserted: 0,
      });
    }

    // vendor_alerts table does not exist - skip alert operations
    // Just return the candidates that would have been processed
    return res.status(200).json({
      ok: true,
      orgId: orgId || null,
      windows: reminderWindows,
      policiesConsidered: filteredPolicies.length,
      candidates: candidates.length,
      alertsInserted: 0,
      note: "vendor_alerts table not available - alerts skipped",
    });
  } catch (err) {
    console.error("[renewals/cron-v3] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Renewal cron failed.",
    });
  }
}

/* ===========================
   MESSAGE BUILDER
=========================== */
function buildRenewalMessage(vendorName, expirationDate, daysLeft) {
  if (daysLeft === 0) {
    return `Renewal due TODAY for ${vendorName} (expires ${expirationDate}).`;
  }
  return `Policy for ${vendorName} expires in ${daysLeft} day${
    daysLeft === 1 ? "" : "s"
  } (on ${expirationDate}).`;
}
