// pages/api/billing/webhook.js
// ============================================================
// STRIPE WEBHOOK HANDLER (Native Next.js - no micro dependency)
// Handles checkout.session.completed to atomically set:
// - trial_started_at
// - trial_expires_at
// - onboarding_completed = true
// - stripe_customer_id
// - stripe_subscription_id
// ============================================================

import Stripe from "stripe";
import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: false, // Required for Stripe webhook signature verification
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  // Native Next.js raw body handling (no micro dependency)
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  const sig = req.headers["stripe-signature"];

  let event;
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[webhook] Stripe webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle Stripe events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      console.log("[webhook] checkout.session.completed:", {
        session_id: session.id,
        customer: session.customer,
        subscription: session.subscription,
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

    case "customer.subscription.created":
    case "customer.subscription.updated": {
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

    case "customer.subscription.deleted": {
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

    default:
      console.log("[webhook] Unhandled event:", event.type);
  }

  return res.json({ received: true });
}
