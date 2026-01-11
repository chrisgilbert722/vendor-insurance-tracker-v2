// pages/api/billing/create-checkout.js
// FINAL FIX — Stripe checkout + Neon onboarding lock
// - Supabase used ONLY for auth
// - Neon used for org state
// - Prevents onboarding observer rewind

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const runtime = "nodejs";

// Stripe (server-only)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Supabase admin (AUTH ONLY — NO DB TABLES)
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
    // 1) Auth
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

    // 2) Org ID (external_uuid)
    const { orgId } = req.body;
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // 3) Stripe env
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!process.env.STRIPE_SECRET_KEY || !priceId) {
      return res.status(500).json({ ok: false, error: "Stripe env missing" });
    }

    const base = siteUrl();

    // 4) Create Stripe checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: user.id,
          org_external_uuid: orgId,
        },
      },
      billing_address_collection: "auto",
      allow_promotion_codes: false,
      success_url: `${base}/billing/success`,
      cancel_url: `${base}/onboarding/ai-wizard`,
    });

    // 5) 🔒 LOCK onboarding step IN NEON (correct DB)
    await sql`
      UPDATE organizations
      SET onboarding_step = 4
      WHERE external_uuid = ${orgId};
    `;

    return res.status(200).json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[billing/create-checkout]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Checkout failed",
    });
  }
}
