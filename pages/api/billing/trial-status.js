// pages/api/billing/trial-status.js
// ============================================================
// TRIAL STATUS API — Single source of truth for trial state
// Returns trial status and starts trial on first call if needed
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Organization not resolved" });
    }

    // Get current onboarding state
    const rows = await sql`
      SELECT metadata
      FROM org_onboarding_state
      WHERE org_id = ${orgId}
      LIMIT 1;
    `;

    if (!rows.length) {
      // No onboarding state - create one with trial
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const newMetadata = {
        trial_started_at: now.toISOString(),
        trial_expires_at: trialEnds.toISOString(),
        billing_status: "trial",
      };

      await sql`
        INSERT INTO org_onboarding_state (org_id, metadata, updated_at)
        VALUES (${orgId}, ${JSON.stringify(newMetadata)}, NOW())
        ON CONFLICT (org_id) DO UPDATE
        SET metadata = ${JSON.stringify(newMetadata)}, updated_at = NOW();
      `;

      return res.status(200).json({
        ok: true,
        trial: {
          active: true,
          started_at: now.toISOString(),
          expires_at: trialEnds.toISOString(),
          days_left: 14,
          billing_status: "trial",
        },
      });
    }

    const metadata = rows[0].metadata || {};

    // Check if trial needs to be started
    if (!metadata.trial_started_at) {
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const updatedMetadata = {
        ...metadata,
        trial_started_at: now.toISOString(),
        trial_expires_at: trialEnds.toISOString(),
        billing_status: metadata.billing_status || "trial",
      };

      await sql`
        UPDATE org_onboarding_state
        SET metadata = ${JSON.stringify(updatedMetadata)}, updated_at = NOW()
        WHERE org_id = ${orgId};
      `;

      return res.status(200).json({
        ok: true,
        trial: {
          active: true,
          started_at: now.toISOString(),
          expires_at: trialEnds.toISOString(),
          days_left: 14,
          billing_status: "trial",
        },
      });
    }

    // Trial already started - calculate status
    const now = new Date();
    const trialExpires = new Date(metadata.trial_expires_at);
    const daysLeft = Math.max(0, Math.ceil((trialExpires - now) / (24 * 60 * 60 * 1000)));
    const isExpired = now > trialExpires;
    const isPaid = metadata.billing_status === "active";

    return res.status(200).json({
      ok: true,
      trial: {
        active: !isExpired || isPaid,
        expired: isExpired && !isPaid,
        started_at: metadata.trial_started_at,
        expires_at: metadata.trial_expires_at,
        days_left: isExpired ? 0 : daysLeft,
        billing_status: metadata.billing_status || "trial",
        is_paid: isPaid,
      },
    });
  } catch (err) {
    console.error("[trial-status] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
