// pages/api/org/create.js
// ============================================================
// ORG CREATE — SELF SERVE SIGNUP (TRIAL ENABLED)
// - Creates user + organization
// - Starts 14-day trial
// - Locks automation
// - Sends signup email via Resend
// ============================================================

import { sql } from "../../../lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const TRIAL_DAYS = 14;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { name, company, email } = req.body;

    if (!name || !company || !email) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields",
      });
    }

    // ----------------------------------------
    // 1. CREATE OR FIND USER
    // ----------------------------------------
    const userResult = await sql`
      INSERT INTO users (email)
      VALUES (${email})
      ON CONFLICT (email)
      DO UPDATE SET email = EXCLUDED.email
      RETURNING id;
    `;

    const userId = userResult[0].id;

    // ----------------------------------------
    // 2. CREATE ORGANIZATION
    // ----------------------------------------
    const orgResult = await sql`
      INSERT INTO organizations (
        name,
        industry,
        onboarding_step,
        created_at
      )
      VALUES (
        ${company},
        'property_management',
        1,
        NOW()
      )
      RETURNING id;
    `;

    const orgId = orgResult[0].id;

    // ----------------------------------------
    // 3. LINK USER → ORG (OWNER)
    // ----------------------------------------
    await sql`
      INSERT INTO organization_members (
        org_id,
        user_id,
        role,
        created_at
      )
      VALUES (
        ${orgId},
        ${userId},
        'owner',
        NOW()
      );
    `;

    // ----------------------------------------
    // 4. INIT TRIAL STATE
    // ----------------------------------------
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    await sql`
      INSERT INTO org_onboarding_state (
        org_id,
        current_step,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        ${orgId},
        1,
        ${JSON.stringify({
          trial_started_at: trialStart.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
          trial_days_total: TRIAL_DAYS,
          automation_locked: true,
          billing_status: "trial",
        })},
        NOW(),
        NOW()
      );
    `;

    // ----------------------------------------
    // 5. SEND SIGNUP EMAIL (RESEND)
    // ----------------------------------------
    await resend.emails.send({
      from: "Verivo <noreply@verivo.io>",
      to: [email],
      subject: "Your Verivo trial is live",
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
          <h2>Welcome to Verivo</h2>

          <p>Your <strong>14-day trial</strong> is now active.</p>

          <ul>
            <li>✔ Portfolio risk visibility enabled</li>
            <li>✔ Fix Preview unlocked</li>
            <li>🔒 Automation locked until billing</li>
          </ul>

          <p>
            Trial ends on <strong>${trialEnd.toDateString()}</strong>.
          </p>

          <a
            href="https://verivo.io/dashboard"
            style="
              display:inline-block;
              margin-top:16px;
              padding:10px 16px;
              background:#2563eb;
              color:#ffffff;
              border-radius:999px;
              text-decoration:none;
              font-weight:500;
            "
          >
            View Portfolio Risk →
          </a>

          <p style="margin-top:24px;font-size:12px;color:#6b7280">
            Nothing will run automatically without your approval.
          </p>
        </div>
      `,
    });

    // ----------------------------------------
    // DONE
    // ----------------------------------------
    return res.status(200).json({
      ok: true,
      orgId,
      trialEndsAt: trialEnd.toISOString(),
    });
  } catch (err) {
    console.error("ORG CREATE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to create organization",
    });
  }
}
