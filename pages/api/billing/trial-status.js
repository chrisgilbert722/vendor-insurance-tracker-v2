// pages/api/billing/trial-status.js
// ============================================================
// TRIAL STATUS API — READ ONLY
// Returns current trial state from organizations table
// DOES NOT auto-create trials (that happens via Stripe webhook)
// ============================================================

import Stripe from "stripe";
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";

// Stripe for checking subscription status
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
} catch {
  console.warn("[trial-status] Stripe not available");
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      // No org = no trial
      return res.status(200).json({
        ok: true,
        hasStartedTrial: false,
        trial: {
          active: false,
          started_at: null,
          expires_at: null,
          days_left: 0,
          billing_status: "none",
        },
      });
    }

    // Get current org state (trial fields on organizations table)
    const [org] = await sql`
      SELECT
        id,
        name,
        onboarding_step,
        onboarding_completed,
        trial_started_at,
        trial_expires_at,
        stripe_customer_id,
        stripe_subscription_id
      FROM organizations
      WHERE id = ${orgId}
      LIMIT 1;
    `.catch(() => [{}]);

    if (!org?.id) {
      return res.status(200).json({
        ok: true,
        hasStartedTrial: false,
        trial: {
          active: false,
          started_at: null,
          expires_at: null,
          days_left: 0,
          billing_status: "none",
        },
      });
    }

    // NO TRIAL STARTED YET — return inactive status (do NOT auto-create)
    if (!org.trial_started_at) {
      return res.status(200).json({
        ok: true,
        hasStartedTrial: false,
        trial: {
          active: false,
          started_at: null,
          expires_at: null,
          days_left: 0,
          billing_status: "none",
          onboarding_completed: org.onboarding_completed || false,
        },
      });
    }

    // Trial exists - calculate status
    const now = new Date();
    const trialExpires = new Date(org.trial_expires_at);
    const daysLeft = Math.max(0, Math.ceil((trialExpires - now) / (24 * 60 * 60 * 1000)));
    const isExpired = now > trialExpires;

    // Check Stripe subscription status if available
    let isPaid = false;
    if (stripe && org.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        isPaid = subscription.status === "active" || subscription.status === "trialing";
      } catch {
        // Subscription check failed - assume not paid
      }
    }

    return res.status(200).json({
      ok: true,
      hasStartedTrial: true,
      trial: {
        active: !isExpired || isPaid,
        expired: isExpired && !isPaid,
        started_at: org.trial_started_at,
        expires_at: org.trial_expires_at,
        days_left: isExpired ? 0 : daysLeft,
        billing_status: isPaid ? "active" : isExpired ? "expired" : "trial",
        is_paid: isPaid,
        stripe_customer_id: org.stripe_customer_id || null,
        stripe_subscription_id: org.stripe_subscription_id || null,
        onboarding_completed: org.onboarding_completed || false,
      },
    });
  } catch (err) {
    console.error("[trial-status] error:", err);
    // Return no trial on error (fail closed for billing)
    return res.status(200).json({
      ok: true,
      hasStartedTrial: false,
      trial: {
        active: false,
        started_at: null,
        expires_at: null,
        days_left: 0,
        billing_status: "error",
        error: err.message,
      },
    });
  }
}
