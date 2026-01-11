// pages/api/billing/create-checkout.js
// LOCKED: Create Stripe Checkout Session (trial + card required)
// - Requires Bearer token (Supabase session)
// - Advances onboarding_step to 4 (locks activation wall)
// - Returns { ok: true, url } for redirect to Stripe Checkout

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Stripe client (server-only)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Supabase admin (server-only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // 1) Auth — Supabase session required
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing session" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const user = data.user;
    const email = user.email;

    // 2) Required env vars
    if (!process.env.STRIPE_SECRET_KEY) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing STRIPE_SECRET_KEY" });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing STRIPE_PRICE_ID" });
    }

    const base = siteUrl();

    // 3) Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: user.id,
        },
      },
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      success_url: `${base}/billing/success`,
      cancel_url: `${base}/onboarding/ai-wizard`,
    });

    // 4) 🔒 LOCK STEP 4 — prevent observer rewind
    await supabaseAdmin
      .from("organizations")
      .update({ onboarding_step: 4 })
      .eq("external_uuid", user.user_metadata?.org_external_uuid);

    return res.status(200).json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[billing/create-checkout]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Checkout failed",
    });
  }
}
