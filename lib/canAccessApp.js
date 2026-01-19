// lib/canAccessApp.js
// ============================================================
// SINGLE SOURCE OF TRUTH FOR APP ACCESS
// Returns access status based on onboarding + subscription
// ============================================================

import Stripe from "stripe";
import { sql } from "./db";

// Access status codes
export const ACCESS_STATUS = {
  ALLOW: "ALLOW",
  BLOCK_ONBOARDING: "BLOCK_ONBOARDING",
  BLOCK_PAYWALL: "BLOCK_PAYWALL",
  BLOCK_NO_ORG: "BLOCK_NO_ORG",
};

let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
} catch {
  console.warn("[canAccessApp] Stripe not available");
}

/**
 * Check if user can access the app
 * @param {number} orgId - Internal org ID (integer)
 * @returns {Promise<{status: string, reason?: string, subscription?: object, org?: object}>}
 */
export async function canAccessApp(orgId) {
  if (!orgId) {
    return {
      status: ACCESS_STATUS.BLOCK_NO_ORG,
      reason: "No organization found",
    };
  }

  try {
    // Get org with subscription info
    const [org] = await sql`
      SELECT
        id,
        name,
        external_uuid,
        onboarding_completed,
        onboarding_step,
        trial_started_at,
        trial_expires_at,
        stripe_customer_id,
        stripe_subscription_id
      FROM organizations
      WHERE id = ${orgId}
      LIMIT 1;
    `;

    if (!org) {
      return {
        status: ACCESS_STATUS.BLOCK_NO_ORG,
        reason: "Organization not found",
      };
    }

    // Check 1: Onboarding complete?
    if (!org.onboarding_completed) {
      return {
        status: ACCESS_STATUS.BLOCK_ONBOARDING,
        reason: "Onboarding not complete",
        org,
      };
    }

    // Check 2: Active Stripe subscription?
    let subscriptionActive = false;
    let subscriptionStatus = null;
    let trialDaysLeft = 0;

    if (stripe && org.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          org.stripe_subscription_id
        );
        subscriptionStatus = subscription.status;

        // Active subscription = status is "active" or "trialing"
        subscriptionActive =
          subscription.status === "active" ||
          subscription.status === "trialing";

        // Calculate trial days left if trialing
        if (subscription.status === "trialing" && subscription.trial_end) {
          const trialEnd = new Date(subscription.trial_end * 1000);
          const now = new Date();
          trialDaysLeft = Math.max(
            0,
            Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000))
          );
        }
      } catch (err) {
        console.error("[canAccessApp] Stripe subscription check failed:", err.message);
        // If Stripe check fails, fall back to DB check
        subscriptionActive = false;
      }
    }

    // Check if trial is active (fallback for when Stripe check fails)
    let trialActive = false;
    if (org.trial_started_at && org.trial_expires_at) {
      const now = new Date();
      const trialExpires = new Date(org.trial_expires_at);
      trialActive = now < trialExpires;
      if (trialActive && !trialDaysLeft) {
        trialDaysLeft = Math.max(
          0,
          Math.ceil((trialExpires - now) / (24 * 60 * 60 * 1000))
        );
      }
    }

    // ALLOW if: Stripe subscription active OR trial active (from DB)
    if (subscriptionActive || trialActive) {
      return {
        status: ACCESS_STATUS.ALLOW,
        org,
        subscription: {
          exists: !!org.stripe_subscription_id,
          status: subscriptionStatus || (trialActive ? "trialing" : null),
          active: true,
          trialing: subscriptionStatus === "trialing" || trialActive,
          trialDaysLeft,
        },
      };
    }

    // No active subscription and no active trial
    return {
      status: ACCESS_STATUS.BLOCK_PAYWALL,
      reason: "No active subscription or trial",
      org,
      subscription: {
        exists: !!org.stripe_subscription_id,
        status: subscriptionStatus,
        active: false,
      },
    };
  } catch (err) {
    console.error("[canAccessApp] Error:", err);
    // Fail closed - block access on error
    return {
      status: ACCESS_STATUS.BLOCK_PAYWALL,
      reason: "Access check failed",
      error: err.message,
    };
  }
}

export default canAccessApp;
