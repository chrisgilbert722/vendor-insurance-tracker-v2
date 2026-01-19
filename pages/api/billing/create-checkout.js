// pages/api/billing/create-checkout.js
// ============================================================
// CREATE STRIPE CHECKOUT — ONE CUSTOMER PER ORG
// - Reuses existing stripe_customer_id if present
// - Creates customer ONLY if missing, then saves to DB
// - Uses customer ID (not email) for checkout session
// ============================================================

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // -------------------------------------------
    // 1. AUTH
    // -------------------------------------------
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing session" });
    }

    const { data } = await supabaseAdmin.auth.getUser(token);
    if (!data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const user = data.user;
    const email = user.email;

    // -------------------------------------------
    // 2. RESOLVE ORG — Get org record with stripe_customer_id
    // -------------------------------------------
    const { orgId: orgUuid } = req.body;
    if (!orgUuid) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // Look up org by external_uuid
    const orgs = await sql`
      SELECT id, external_uuid, name, stripe_customer_id
      FROM organizations
      WHERE external_uuid = ${orgUuid}
      LIMIT 1;
    `;

    if (!orgs || orgs.length === 0) {
      return res.status(400).json({ ok: false, error: "Organization not found" });
    }

    const org = orgs[0];
    const orgIntId = org.id;

    console.log("[create-checkout] Org:", orgIntId, "existing customer:", org.stripe_customer_id);

    // -------------------------------------------
    // 3. STRIPE ENV CHECK
    // -------------------------------------------
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!process.env.STRIPE_SECRET_KEY || !priceId) {
      return res.status(500).json({ ok: false, error: "Stripe env missing" });
    }

    const base = siteUrl();

    // -------------------------------------------
    // 4. GET OR CREATE STRIPE CUSTOMER
    // -------------------------------------------
    let stripeCustomerId = org.stripe_customer_id;

    if (!stripeCustomerId) {
      // Create new Stripe customer
      console.log("[create-checkout] Creating new Stripe customer for org:", orgIntId);

      const customer = await stripe.customers.create({
        email: email,
        name: org.name || undefined,
        metadata: {
          org_id: String(orgIntId),
          org_external_uuid: orgUuid,
          supabase_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Save customer ID to database IMMEDIATELY
      await sql`
        UPDATE organizations
        SET stripe_customer_id = ${stripeCustomerId}
        WHERE id = ${orgIntId};
      `;

      console.log("[create-checkout] Created and saved customer:", stripeCustomerId);
    } else {
      console.log("[create-checkout] Reusing existing customer:", stripeCustomerId);
    }

    // -------------------------------------------
    // 5. LOCK ONBOARDING STEP
    // -------------------------------------------
    await sql`
      UPDATE organizations
      SET onboarding_step = 4
      WHERE id = ${orgIntId}
        AND onboarding_step < 4;
    `;

    // -------------------------------------------
    // 6. CREATE CHECKOUT SESSION WITH CUSTOMER ID
    // -------------------------------------------
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId, // Use customer ID, NOT email
      line_items: [{ price: priceId, quantity: 1 }],

      // Metadata on SESSION — available immediately in webhook
      metadata: {
        org_id: String(orgIntId),
        org_external_uuid: orgUuid,
        supabase_user_id: user.id,
      },

      // Metadata on SUBSCRIPTION — persists with subscription
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          org_id: String(orgIntId),
          org_external_uuid: orgUuid,
          supabase_user_id: user.id,
        },
      },

      billing_address_collection: "auto",
      allow_promotion_codes: false,

      success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/billing/checkout`,
    });

    console.log("[create-checkout] Session created:", session.id);

    return res.status(200).json({
      ok: true,
      url: session.url,
      customerId: stripeCustomerId,
    });

  } catch (err) {
    console.error("[create-checkout] Error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Checkout failed",
    });
  }
}
