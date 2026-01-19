// pages/api/billing/webhook.js
// ============================================================
// STRIPE WEBHOOK — AUTHORITATIVE TRIAL PERSISTENCE
// This is the ONLY place trial_started_at gets written from Stripe
//
// Required env vars:
// - STRIPE_SECRET_KEY
// - STRIPE_WEBHOOK_SECRET
// - DATABASE_URL
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
  // 1. READ RAW BODY
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
    console.error("[billing/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[billing/webhook] Signature failed:", err.message);
    return res.status(400).json({ error: `Signature failed: ${err.message}` });
  }

  console.log("[billing/webhook] Event received:", event.type);

  // -------------------------------------------
  // 3. HANDLE EVENTS
  // -------------------------------------------
  const sql = neon(process.env.DATABASE_URL);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      console.log("[billing/webhook] checkout.session.completed:", {
        id: session.id,
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.metadata,
      });

      try {
        // Get org ID from session metadata (set in create-checkout.js)
        let orgExternalUuid = session.metadata?.org_external_uuid;
        let orgIntId = session.metadata?.org_id;

        // Fallback: check subscription metadata
        if (!orgExternalUuid && session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            orgExternalUuid = sub.metadata?.org_external_uuid;
            orgIntId = sub.metadata?.org_id;
            console.log("[billing/webhook] Got org from subscription:", orgExternalUuid);
          } catch (subErr) {
            console.error("[billing/webhook] Subscription retrieve failed:", subErr.message);
          }
        }

        if (!orgExternalUuid && !orgIntId) {
          console.error("[billing/webhook] No org identifier in metadata");
          return res.status(200).json({ received: true, warning: "No org ID" });
        }

        // -------------------------------------------
        // 4. WRITE TRIAL STATE TO DATABASE
        // -------------------------------------------
        const now = new Date();
        const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        console.log("[billing/webhook] Writing trial state:", {
          orgExternalUuid,
          orgIntId,
          customer: session.customer,
          subscription: session.subscription,
        });

        // Update by external_uuid (preferred) or id
        if (orgExternalUuid) {
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
        } else if (orgIntId) {
          await sql`
            UPDATE organizations
            SET
              trial_started_at = ${now.toISOString()},
              trial_expires_at = ${trialEnds.toISOString()},
              onboarding_completed = true,
              onboarding_step = 999,
              stripe_customer_id = ${session.customer},
              stripe_subscription_id = ${session.subscription}
            WHERE id = ${parseInt(orgIntId, 10)};
          `;
        }

        // Verify write
        const verify = orgExternalUuid
          ? await sql`SELECT id, trial_started_at FROM organizations WHERE external_uuid = ${orgExternalUuid}`
          : await sql`SELECT id, trial_started_at FROM organizations WHERE id = ${parseInt(orgIntId, 10)}`;

        if (verify[0]?.trial_started_at) {
          console.log("[billing/webhook] SUCCESS - trial_started_at:", verify[0].trial_started_at);
        } else {
          console.error("[billing/webhook] FAILED - trial_started_at not persisted");
        }

        return res.status(200).json({
          received: true,
          success: true,
          orgId: orgExternalUuid || orgIntId,
        });

      } catch (err) {
        console.error("[billing/webhook] DB error:", err);
        // Return 500 to trigger Stripe retry
        return res.status(500).json({ error: err.message });
      }
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const orgUuid = subscription.metadata?.org_external_uuid;

      if (orgUuid) {
        try {
          await sql`
            UPDATE organizations
            SET stripe_subscription_id = ${subscription.id}
            WHERE external_uuid = ${orgUuid};
          `;
          console.log("[billing/webhook] Subscription updated for org:", orgUuid);
        } catch (err) {
          console.error("[billing/webhook] Subscription update error:", err);
        }
      }

      return res.status(200).json({ received: true });
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const orgUuid = subscription.metadata?.org_external_uuid;

      if (orgUuid) {
        try {
          await sql`
            UPDATE organizations
            SET stripe_subscription_id = NULL
            WHERE external_uuid = ${orgUuid};
          `;
          console.log("[billing/webhook] Subscription deleted for org:", orgUuid);
        } catch (err) {
          console.error("[billing/webhook] Subscription delete error:", err);
        }
      }

      return res.status(200).json({ received: true });
    }

    default:
      console.log("[billing/webhook] Unhandled event:", event.type);
      return res.status(200).json({ received: true });
  }
}
