// pages/api/onboarding/create-vendors.js
// ===========================================================
// STEP 6 — Vendor Auto-Creation Engine
// Creates vendor records, portal tokens, timeline entries
// Emits webhook: vendor.created
// ===========================================================

import { sql } from "../../../lib/db";
import crypto from "crypto";
import { emitWebhook } from "../../../lib/webhooks";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ ok: false, error: "Use POST method" });
    }

    const { orgId, vendors } = req.body || {};

    if (!orgId || !Array.isArray(vendors) || vendors.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "orgId and vendors[] required.",
      });
    }

    const created = [];

    for (const v of vendors) {
      const vendorName = v.vendor_name || v.name || "Unnamed Vendor";

      // 1️⃣ Insert vendor
      const rows = await sql`
        INSERT INTO vendors (
          org_id,
          name,
          email,
          created_at
        )
        VALUES (
          ${orgId},
          ${vendorName},
          ${v.email || null},
          NOW()
        )
        RETURNING id, name, email, created_at;
      `;

      const vendor = rows[0];
      const vendorId = vendor.id;

      // -------------------------------------------------------
      // WEBHOOK: vendor.created
      // -------------------------------------------------------
      try {
        await emitWebhook(orgId, "vendor.created", {
          vendorId: vendorId,
          vendorName: vendor.name,
          email: vendor.email,
          createdAt: vendor.created_at,
        });
      } catch (err) {
        // Never block vendor creation if webhook fails
        console.error("[webhook vendor.created]", err);
      }

      // 2️⃣ Create vendor portal upload token
      const token = crypto.randomBytes(24).toString("hex");

      await sql`
        INSERT INTO vendor_portal_tokens (
          vendor_id,
          org_id,
          token,
          created_at,
          expires_at
        ) VALUES (
          ${vendorId},
          ${orgId},
          ${token},
          NOW(),
          NOW() + INTERVAL '30 days'
        );
      `;

      // 3️⃣ Create initial timeline entry
      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (
          ${orgId},
          ${vendorId},
          'vendor_created',
          ${"Vendor created via onboarding wizard: " + vendorName},
          'info'
        );
      `;

      created.push({
        id: vendorId,
        vendor_name: vendorName,
        token,
      });
    }

    return res.status(200).json({
      ok: true,
      count: created.length,
      created,
    });
  } catch (err) {
    console.error("[CREATE VENDORS ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
