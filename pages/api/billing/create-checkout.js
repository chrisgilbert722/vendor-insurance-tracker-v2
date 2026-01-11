// pages/api/billing/create-checkout.js

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
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

    const { orgId } = req.body;
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!process.env.STRIPE_SECRET_KEY || !priceId) {
      return res.status(500).json({ ok: false, error: "Stripe env missing" });
    }

    const base = siteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: user.id,
          org_id: orgId,
        },
      },
      billing_address_collection: "auto",
      success_url: `${base}/billing/success`,
      cancel_url: `${base}/onboarding/ai-wizard`,
    });

    // 🔒 HARD LOCK STEP 4
    const { error: stepErr } = await supabaseAdmin
      .from("organizations")
      .update({ onboarding_step: 4 })
      .eq("external_uuid", orgId);

    if (stepErr) {
      throw stepErr;
    }

    return res.status(200).json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[billing/create-checkout]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
