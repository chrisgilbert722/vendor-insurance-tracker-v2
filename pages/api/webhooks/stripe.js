// pages/api/webhooks/stripe.js
// ============================================================
// STRIPE WEBHOOK — AUTHORITATIVE TRIAL PERSISTENCE
// Handles checkout.session.completed to write trial state to DB
// This is the ONLY place trial_started_at gets written from Stripe
// ============================================================

import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

export const config = {
  api: {
    bodyParser: false, // Required for Stripe signature verification
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  // -------------------------------------------
  // 1. READ RAW BODY FOR SIGNATURE VERIFICATION
  // -------------------------------------------
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);

  // -------------------------------------------
  // 2. VERIFY STRIPE SIGNATURE
  // -------------------------------------------
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
  }

  console.log("[stripe-webhook] Received event:", event.type);

  // -------------------------------------------
  // 3. HANDLE EVENTS
  // -------------------------------------------
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      console.log("[stripe-webhook] checkout.session.completed:", {
        id: session.id,
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.metadata,
      });

      try {
        // Get org ID from session metadata first
        let orgExternalUuid = session.metadata?.org_external_uuid;

        // If not on session, check subscription metadata
        if (!orgExternalUuid && session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            orgExternalUuid = subscription.metadata?.org_external_uuid;
            console.log("[stripe-webhook] Got org from subscription metadata:", orgExternalUuid);
          } catch (subErr) {
            console.error("[stripe-webhook] Failed to retrieve subscription:", subErr.message);
          }
        }

        if (!orgExternalUuid) {
          console.error("[stripe-webhook] No org_external_uuid found in metadata");
          // Return 200 to acknowledge receipt (don't retry)
          return res.status(200).json({
            received: true,
            warning: "No org ID in metadata"
          });
        }

        // -------------------------------------------
        // 4. WRITE TRIAL STATE TO DATABASE
        // -------------------------------------------
        const sql = neon(process.env.DATABASE_URL);
        const now = new Date();
        const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        // SQL UPDATE — This is the authoritative write
        await sql`
          UPDATE organizations
          SET
            trial_started_at = ${now.toISOString()},
            trial_expires_at = ${trialEnds.toISOString()},
            onboarding_completed = true,
            onboarding_step = 999,
            stripe_customer_id = ${session.customer},
            stripe_subscription_id = ${session.subscription}
          WHERE external_uuid = ${orgExternalUuid};
        `;

        console.log("[stripe-webhook] Trial activated for org:", orgExternalUuid);

        // Verify write
        const verify = await sql`
          SELECT id, trial_started_at
          FROM organizations
          WHERE external_uuid = ${orgExternalUuid};
        `;

        if (verify[0]?.trial_started_at) {
          console.log("[stripe-webhook] Verified trial_started_at is set:", verify[0].trial_started_at);
        } else {
          console.error("[stripe-webhook] WARNING: trial_started_at not persisted!");
        }

        return res.status(200).json({
          received: true,
          success: true,
          orgId: orgExternalUuid,
        });

      } catch (err) {
        console.error("[stripe-webhook] Error processing checkout:", err);
        // Return 500 to trigger Stripe retry
        return res.status(500).json({ error: err.message });
      }
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const orgExternalUuid = subscription.metadata?.org_external_uuid;

      if (orgExternalUuid) {
        try {
          const sql = neon(process.env.DATABASE_URL);

          if (event.type === "customer.subscription.deleted") {
            await sql`
              UPDATE organizations
              SET stripe_subscription_id = NULL
              WHERE external_uuid = ${orgExternalUuid};
            `;
          } else {
            await sql`
              UPDATE organizations
              SET stripe_subscription_id = ${subscription.id}
              WHERE external_uuid = ${orgExternalUuid};
            `;
          }
        } catch (err) {
          console.error("[stripe-webhook] Subscription update error:", err);
        }
      }

      return res.status(200).json({ received: true });
    }

    default:
      console.log("[stripe-webhook] Unhandled event type:", event.type);
      return res.status(200).json({ received: true });
  }
}
