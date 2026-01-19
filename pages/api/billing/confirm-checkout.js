// pages/api/billing/confirm-checkout.js
// ============================================================
// CONFIRM STRIPE CHECKOUT — AUTHORITATIVE TRIAL ACTIVATION
// Called from /billing/success with session_id from Stripe redirect
// Retrieves session from Stripe API and persists trial state
// ============================================================

import Stripe from "stripe";
import { sql } from "../../../lib/db";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // -------------------------------------------
    // 1. AUTH
    // -------------------------------------------
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing auth token" });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const userId = data.user.id;

    // -------------------------------------------
    // 2. GET USER'S ORG
    // -------------------------------------------
    const orgs = await sql`
      SELECT o.id, o.external_uuid, o.trial_started_at
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC
      LIMIT 1;
    `;

    if (!orgs.length) {
      return res.status(400).json({ ok: false, error: "No organization found" });
    }

    const org = orgs[0];

    // -------------------------------------------
    // 3. CHECK IF ALREADY ACTIVATED
    // -------------------------------------------
    if (org.trial_started_at) {
      console.log("[confirm-checkout] Trial already active for org:", org.id);
      return res.status(200).json({
        ok: true,
        alreadyActive: true,
        orgId: org.id,
      });
    }

    // -------------------------------------------
    // 4. GET SESSION ID FROM REQUEST
    // -------------------------------------------
    const { sessionId } = req.body;

    let stripeCustomerId = null;
    let stripeSubscriptionId = null;

    // If session ID provided, retrieve from Stripe for extra data
    if (sessionId) {
      try {
        const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
        stripeCustomerId = stripeSession.customer;
        stripeSubscriptionId = stripeSession.subscription;
        console.log("[confirm-checkout] Retrieved Stripe session:", {
          sessionId,
          customer: stripeCustomerId,
          subscription: stripeSubscriptionId,
        });
      } catch (stripeErr) {
        console.warn("[confirm-checkout] Could not retrieve Stripe session:", stripeErr.message);
        // Continue without Stripe data - trial will still activate
      }
    }

    // -------------------------------------------
    // 5. ACTIVATE TRIAL
    // -------------------------------------------
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    await sql`
      UPDATE organizations
      SET
        trial_started_at = ${now.toISOString()},
        trial_expires_at = ${trialEnds.toISOString()},
        onboarding_completed = true,
        onboarding_step = 999,
        stripe_customer_id = COALESCE(${stripeCustomerId}, stripe_customer_id),
        stripe_subscription_id = COALESCE(${stripeSubscriptionId}, stripe_subscription_id)
      WHERE id = ${org.id};
    `;

    console.log("[confirm-checkout] Trial activated for org:", org.id);

    // -------------------------------------------
    // 6. VERIFY WRITE
    // -------------------------------------------
    const verify = await sql`
      SELECT trial_started_at FROM organizations WHERE id = ${org.id};
    `;

    if (!verify[0]?.trial_started_at) {
      console.error("[confirm-checkout] Trial activation failed - not persisted");
      return res.status(500).json({ ok: false, error: "Trial activation failed" });
    }

    return res.status(200).json({
      ok: true,
      activated: true,
      orgId: org.id,
      trialStartedAt: verify[0].trial_started_at,
    });

  } catch (err) {
    console.error("[confirm-checkout] Error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
