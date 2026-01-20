-- ============================================================
-- HARD RESET SCRIPT
-- Run this in Neon SQL Editor to completely reset the database
-- ============================================================

-- STEP 1: Verify current state (run this first)
SELECT
  (SELECT COUNT(*) FROM organizations)            AS organizations,
  (SELECT COUNT(*) FROM organization_members)     AS organization_members,
  (SELECT COUNT(*) FROM vendors)                  AS vendors,
  (SELECT COUNT(*) FROM policies)                 AS policies,
  (SELECT COUNT(*) FROM vendor_compliance_cache)  AS compliance_cache,
  (SELECT COUNT(*) FROM dashboard_metrics)        AS dashboard_metrics,
  (SELECT COUNT(*) FROM system_timeline)          AS system_timeline,
  (SELECT COUNT(*) FROM cron_renewals_heartbeat)  AS cron_renewals_heartbeat;

-- STEP 2: Truncate all tables in FK-safe order
TRUNCATE TABLE
  cron_renewals_heartbeat,
  system_timeline,
  dashboard_metrics,
  vendor_compliance_cache,
  policies,
  vendors,
  organization_members,
  organizations
RESTART IDENTITY CASCADE;

-- STEP 3: Verify all counts are 0 (run this after truncate)
SELECT
  (SELECT COUNT(*) FROM organizations)            AS organizations,
  (SELECT COUNT(*) FROM organization_members)     AS organization_members,
  (SELECT COUNT(*) FROM vendors)                  AS vendors,
  (SELECT COUNT(*) FROM policies)                 AS policies,
  (SELECT COUNT(*) FROM vendor_compliance_cache)  AS compliance_cache,
  (SELECT COUNT(*) FROM dashboard_metrics)        AS dashboard_metrics,
  (SELECT COUNT(*) FROM system_timeline)          AS system_timeline,
  (SELECT COUNT(*) FROM cron_renewals_heartbeat)  AS cron_renewals_heartbeat;

-- ============================================================
-- MANUAL STEPS REQUIRED:
-- ============================================================
--
-- A. SUPABASE AUTH:
--    1. Go to Supabase Dashboard → Authentication → Users
--    2. Select ALL users
--    3. Delete ALL users
--    4. Verify: 0 users remaining
--
-- B. STRIPE (SANDBOX):
--    1. Go to Stripe Dashboard (Test Mode)
--    2. Delete all Customers
--    3. Delete all Subscriptions
--    4. Delete all Checkout Sessions
--    5. Verify: 0 customers, 0 subscriptions
--
-- ============================================================
