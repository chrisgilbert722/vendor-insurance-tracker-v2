// pages/api/org/create.js
// ============================================================
// ORG CREATE — SELF SERVE SIGNUP (TRIAL ENABLED)
// - Creates or finds user
// - Creates organization (only if none exists)
// - Links owner
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

  const { name, company, email } = req.body;

  if (!name || !company || !email) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields",
    });
  }

  try {
    const result = await sql.begin(async (tx) => {
      // ----------------------------------------
      // 1. FIND OR CREATE USER
      // ----------------------------------------
      const existingUser = await tx`
        SELECT id FROM users WHERE email = ${email} LIMIT 1;
      `;

      let userId;

      if (existingUser.length) {
        userId = existingUser[0].id;
      } else {
        const inserted = await tx`
          INSERT INTO users (email, created_at)
          VALUES (${email}, NOW())
          RETURNING id;
        `;
        userId = inserted[0].id;
      }

      // ----------------------------------------
      // 2. CHECK FOR EXISTING ORG OWNERSHIP
      // ----------------------------------------
      const existingOrg = await tx`
        SELECT o.id
        FROM organizations o
        JOIN organization_members m ON m.org_id = o.id
        WHERE m.user_id = ${userId}
          AND m.role = 'owner'
        LIMIT 1;
      `;

      if (existingOrg.length) {
        return {
          orgId: existingOrg[0].id,
          reused: true,
          trialEnd: null,
        };
      }

      // ----------------------------------------
      // 3. CREATE ORGANIZATION
      // ----------------------------------------
      const org = await tx`
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

      const orgId = org[0].id;

      // ----------------------------------------
      // 4. LINK USER → ORG (OWNER)
      // ----------------------------------------
      await tx`
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
      // 5. INIT TRIAL STATE
      // ----------------------------------------
      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

      await tx`
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

      return { orgId, reused: false, trialEnd };
    });

    // ----------------------------------------
    // 6. SEND EMAIL
    // ----------------------------------------
    await resend.emails.send({
      from: "Verivo <noreply@verivo.io>",
      to: [email],
      subject: "Verify your email to access Verivo",
      html: `
        <div style="font-family: system-ui; max-width: 520px;">
          <h2>Welcome to Verivo</h2>

          <p>Your trial is ready.</p>

          <p>
            Click below to verify your email and enter your dashboard.
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
            "
          >
            Enter Dashboard →
          </a>

          <p style="margin-top:24px;font-size:12px;color:#6b7280">
            Automation is locked during trial. Nothing runs without approval.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      ok: true,
      orgId: result.orgId,
      reused: result.reused,
    });
  } catch (err) {
    console.error("ORG CREATE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to create organization",
    });
  }
}
