// pages/api/_dev/test-flow.js
// ============================================================
// DEV-ONLY: Flow Validation Endpoint
// - Only runs in development (NODE_ENV === "development")
// - Tests bootstrap, trial-status, and create-checkout idempotency
// - Uses Supabase admin client to resolve test user
// - Returns validation results, NOT production data
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  // -------------------------------------------
  // 1. BLOCK IN PRODUCTION
  // -------------------------------------------
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({
      ok: false,
      error: "DEV-ONLY endpoint blocked in production",
    });
  }

  // -------------------------------------------
  // 2. GET TEST USER EMAIL FROM ENV OR QUERY
  // -------------------------------------------
  const testEmail = req.query.email || process.env.DEV_TEST_EMAIL;
  if (!testEmail) {
    return res.status(400).json({
      ok: false,
      error: "No test email. Set DEV_TEST_EMAIL env or pass ?email=",
    });
  }

  const results = {
    timestamp: new Date().toISOString(),
    testEmail,
    tests: {},
  };

  try {
    const sql = neon(process.env.DATABASE_URL);
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // -------------------------------------------
    // 3. FIND TEST USER IN SUPABASE
    // -------------------------------------------
    const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      results.tests.findUser = { pass: false, error: listErr.message };
      return res.status(200).json({ ok: true, results });
    }

    const testUser = users.users.find((u) => u.email === testEmail);
    if (!testUser) {
      results.tests.findUser = { pass: false, error: `User ${testEmail} not found in Supabase` };
      return res.status(200).json({ ok: true, results });
    }

    results.tests.findUser = { pass: true, userId: testUser.id };

    // -------------------------------------------
    // 4. TEST: User's org exists (idempotency check)
    // -------------------------------------------
    const orgs = await sql`
      SELECT o.id, o.external_uuid, o.name, o.trial_started_at, o.stripe_customer_id,
             o.onboarding_step, o.onboarding_completed
      FROM organizations o
      JOIN organization_members om ON om.org_id = o.id
      WHERE om.user_id = ${testUser.id}
      ORDER BY o.id ASC;
    `;

    const orgCount = orgs?.length || 0;
    results.tests.orgIdempotency = {
      pass: orgCount <= 1,
      orgCount,
      message: orgCount === 0
        ? "No org (user not bootstrapped yet)"
        : orgCount === 1
          ? "Single org (correct)"
          : `DUPLICATE ORGS DETECTED: ${orgCount}`,
    };

    if (orgCount > 0) {
      const org = orgs[0];
      results.org = {
        id: org.id,
        external_uuid: org.external_uuid,
        name: org.name,
        onboarding_step: org.onboarding_step,
        onboarding_completed: org.onboarding_completed,
        trial_started_at: org.trial_started_at,
        stripe_customer_id: org.stripe_customer_id,
      };

      // -------------------------------------------
      // 5. TEST: Stripe customer idempotency
      // -------------------------------------------
      if (org.stripe_customer_id) {
        // Check if multiple orgs share this customer (should not happen)
        const sharedCustomer = await sql`
          SELECT COUNT(*) as count FROM organizations
          WHERE stripe_customer_id = ${org.stripe_customer_id};
        `;
        const shareCount = parseInt(sharedCustomer[0]?.count || 0, 10);

        results.tests.stripeCustomerIdempotency = {
          pass: shareCount === 1,
          customerId: org.stripe_customer_id,
          sharedByOrgs: shareCount,
          message: shareCount === 1
            ? "Single org owns this customer (correct)"
            : `CUSTOMER SHARED BY ${shareCount} ORGS`,
        };
      } else {
        results.tests.stripeCustomerIdempotency = {
          pass: true,
          message: "No Stripe customer yet (pre-checkout)",
        };
      }

      // -------------------------------------------
      // 6. TEST: Trial state consistency
      // -------------------------------------------
      const hasTrialStarted = !!org.trial_started_at;
      const hasStripeCustomer = !!org.stripe_customer_id;

      results.tests.trialConsistency = {
        pass: true, // Will be set to false if inconsistent
        hasTrialStarted,
        hasStripeCustomer,
        onboardingCompleted: org.onboarding_completed,
      };

      // If trial started, should have Stripe customer
      if (hasTrialStarted && !hasStripeCustomer) {
        results.tests.trialConsistency.pass = false;
        results.tests.trialConsistency.message = "Trial started but no Stripe customer";
      } else if (hasTrialStarted && !org.onboarding_completed) {
        results.tests.trialConsistency.pass = false;
        results.tests.trialConsistency.message = "Trial started but onboarding not marked complete";
      } else {
        results.tests.trialConsistency.message = "Consistent state";
      }
    }

    // -------------------------------------------
    // 7. SUMMARY
    // -------------------------------------------
    const allTests = Object.values(results.tests);
    const passCount = allTests.filter((t) => t.pass).length;
    const failCount = allTests.filter((t) => !t.pass).length;

    results.summary = {
      total: allTests.length,
      passed: passCount,
      failed: failCount,
      allPassed: failCount === 0,
    };

    return res.status(200).json({ ok: true, results });

  } catch (err) {
    console.error("[_dev/test-flow] Error:", err);
    results.error = err.message;
    return res.status(200).json({ ok: false, results });
  }
}
