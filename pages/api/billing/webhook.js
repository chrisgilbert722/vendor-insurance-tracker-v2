// pages/api/billing/webhook.js
// ============================================================
// STRIPE WEBHOOK HANDLER
// Handles checkout.session.completed to atomically set:
// - trial_started_at
// - trial_expires_at
// - onboarding_completed = true
// - stripe_customer_id
// - stripe_subscription_id
// ============================================================

import Stripe from "stripe";
import { sql } from "../../../lib/db";
import { buffer } from "micro";

export const config = {
  api: {
    bodyParser: false, // Required for Stripe webhook signature verification
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let event;

  try {
    // Get raw body for signature verification
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"];

    if (!webhookSecret) {
      console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Verify webhook signature
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    console.log("[webhook] checkout.session.completed:", {
      session_id: session.id,
      customer: session.customer,
      subscription: session.subscription,
      metadata: session.metadata,
    });

    try {
      // Extract org ID from subscription metadata (set in create-checkout.js)
      const subscriptionId = session.subscription;
      let orgExternalUuid = null;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        orgExternalUuid = subscription.metadata?.org_external_uuid;
      }

      if (!orgExternalUuid) {
        console.error("[webhook] No org_external_uuid in subscription metadata");
        return res.status(200).json({ received: true, warning: "No org ID found" });
      }

      // Calculate trial dates
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      // ATOMIC UPDATE: Set all trial + onboarding fields in one transaction
      await sql`
        UPDATE organizations
        SET
          trial_started_at = ${now.toISOString()},
          trial_expires_at = ${trialEnds.toISOString()},
          onboarding_completed = true,
          stripe_customer_id = ${session.customer},
          stripe_subscription_id = ${subscriptionId},
          onboarding_step = 10
        WHERE external_uuid = ${orgExternalUuid};
      `;

      console.log("[webhook] Trial activated for org:", orgExternalUuid);

      return res.status(200).json({
        received: true,
        success: true,
        orgId: orgExternalUuid,
      });
    } catch (err) {
      console.error("[webhook] Error processing checkout:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // Handle subscription updates (for future use)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    const orgExternalUuid = subscription.metadata?.org_external_uuid;

    if (orgExternalUuid) {
      try {
        await sql`
          UPDATE organizations
          SET stripe_subscription_id = ${subscription.id}
          WHERE external_uuid = ${orgExternalUuid};
        `;
      } catch (err) {
        console.error("[webhook] Error updating subscription:", err);
      }
    }

    return res.status(200).json({ received: true });
  }

  // Handle subscription cancellation
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const orgExternalUuid = subscription.metadata?.org_external_uuid;

    if (orgExternalUuid) {
      try {
        await sql`
          UPDATE organizations
          SET stripe_subscription_id = NULL
          WHERE external_uuid = ${orgExternalUuid};
        `;
      } catch (err) {
        console.error("[webhook] Error handling cancellation:", err);
      }
    }

    return res.status(200).json({ received: true });
  }

  // Default: acknowledge receipt
  return res.status(200).json({ received: true });
}
