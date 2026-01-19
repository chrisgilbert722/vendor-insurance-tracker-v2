# Routing Architecture

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER SIGNUP FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   /signup    │────▶│  /auth/verify │────▶│  /onboarding │────▶│  /dashboard  │
│              │     │              │     │  /ai-wizard  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
  Creates user         Confirms email      Calls /api/orgs/      Shows either:
  in Supabase          Sets session        bootstrap (once)      - BillingGate (if no trial)
                                           Shows wizard UI        - Full dashboard (if trial active)
                                                 │
                                                 ▼
                                          On wizard complete:
                                          → /dashboard
                                                 │
                                                 ▼
                                          User clicks button
                                          → /billing/checkout
                                                 │
                                                 ▼
                                          API creates Stripe
                                          session, redirects
                                          → Stripe checkout
                                                 │
                                                 ▼
                                          Stripe redirects
                                          → /billing/success
                                                 │
                                                 ▼
                                          Webhook fires, sets
                                          trial_started_at
                                                 │
                                                 ▼
                                          → /dashboard
                                          (now shows full UI)
```

## Redirect Inventory

### Automatic Redirects (router.replace / window.location)

| File | Condition | Destination | Logging |
|------|-----------|-------------|---------|
| `pages/dashboard.js` | `!onboardingComplete && !redirectedRef.current` | `/onboarding/ai-wizard` | `[dashboard] REDIRECT: onboarding incomplete` |
| `pages/onboarding/ai-wizard.js` | `!session` | `/auth/login?redirect=/onboarding/ai-wizard` | `[ai-wizard] REDIRECT: no session` |
| `pages/onboarding/ai-wizard.js` | `json.action === "redirect_dashboard"` | `/dashboard` | `[ai-wizard] REDIRECT: onboarding complete` |
| `pages/onboarding/ai-wizard.js` | `event === "SIGNED_OUT"` | `/auth/login?redirect=/onboarding/ai-wizard` | `[ai-wizard] REDIRECT: signed out` |
| `pages/billing/checkout.js` | `!session` | `/auth/login?redirect=/billing/checkout` | `[billing/checkout] REDIRECT: no session` |
| `pages/billing/checkout.js` | Checkout session created | Stripe URL | `[billing/checkout] REDIRECT: checkout created` |
| `pages/billing/success.js` | Countdown complete | `/dashboard` | None (expected flow) |

### User-Triggered Redirects (button clicks - ALLOWED)

| File | Trigger | Destination |
|------|---------|-------------|
| `pages/dashboard.js` | BillingGate button click | `/billing/checkout` or `/billing/upgrade` |
| `pages/billing/checkout.js` | "Try Again" button | Page reload |

### FORBIDDEN Redirects (must NOT exist)

| Pattern | Status |
|---------|--------|
| Dashboard → /billing/* (automatic) | REMOVED |
| ai-wizard → /billing/* (automatic) | REMOVED |
| useTrialStatus hook → /billing/* | REMOVED |
| Any page → /billing/* on trial expiry | REMOVED |

## Hard Rules

### 1. Bootstrap Idempotency
- `/api/orgs/bootstrap` is the ONLY entry point for org resolution
- Returns existing org if found (no duplicates)
- Creates org only if none exists
- Returns clean 401 for missing/invalid tokens (no side effects)
- Race condition handling with re-check after conflict

### 2. Stripe Customer Idempotency
- `stripe_customer_id` is checked BEFORE creating customer
- Customer created ONLY if missing from DB
- Saved to DB IMMEDIATELY after creation
- Uses `customer:` (not `customer_email:`) for checkout sessions
- One customer per org, forever

### 3. Redirect Guards
- Every page with auto-redirects uses `redirectedRef.current` guard
- Maximum ONE redirect per component mount
- All redirects are logged with reason
- No redirect based on assumptions (only verified state)

### 4. Billing Access Rules
- Billing pages NEVER redirect on their own to /dashboard
- Billing pages NEVER redirect to /onboarding
- Only valid redirects: /auth/login (no session), Stripe (checkout)
- User must click to navigate to billing

### 5. Trial State Rules
- Trial state comes from DB via webhook (authoritative)
- Dashboard shows BillingGate UI when trial not active
- Dashboard NEVER redirects to billing
- useTrialStatus hook provides status only, no redirects

## Checklist: Loop Prevention Proof

- [x] Dashboard has `redirectedRef` - can only redirect once per mount
- [x] ai-wizard has `bootstrapCalledRef` - can only call bootstrap once per mount
- [x] ai-wizard has `aliveRef` - prevents stale closure redirects
- [x] billing/checkout has `redirectedRef` - can only redirect once per mount
- [x] billing/checkout NEVER redirects to /dashboard (verified)
- [x] billing/checkout NEVER redirects to /onboarding (verified)
- [x] useTrialStatus has NO auto-redirects (removed)
- [x] OnboardingGuard does NOT redirect to billing (verified)
- [x] All redirects logged with `[page] REDIRECT: reason` format
- [x] No localStorage token workflows required
- [x] DEV-ONLY test endpoint at `/api/_dev/test-flow` for validation

## Testing (DEV ONLY)

```bash
# Test flow validation (development only)
curl "http://localhost:3000/api/_dev/test-flow?email=test@example.com"

# Returns:
# - User lookup result
# - Org idempotency check (should be 0 or 1 org)
# - Stripe customer idempotency check
# - Trial state consistency check
```

## State Machine

```
[LOGGED_OUT] ──────────────────────────────────────────────────────────────────┐
     │                                                                          │
     ▼ (signup/login)                                                           │
[LOGGED_IN, NO_ORG] ───────────────────────────────────────────────────────────┤
     │                                                                          │
     ▼ (bootstrap)                                                              │
[HAS_ORG, ONBOARDING_INCOMPLETE] ──────────────────────────────────────────────┤
     │                                                                          │
     ▼ (wizard complete)                                                        │
[HAS_ORG, ONBOARDING_COMPLETE, NO_TRIAL] ──────────────────────────────────────┤
     │                                                                          │
     │ (user clicks "Start Trial" in BillingGate)                               │
     ▼                                                                          │
[STRIPE_CHECKOUT] ─────────────────────────────────────────────────────────────┤
     │                                                                          │
     ▼ (webhook: checkout.session.completed)                                    │
[HAS_ORG, ONBOARDING_COMPLETE, TRIAL_ACTIVE] ──────────────────────────────────┤
     │                                                                          │
     ▼ (14 days later)                                                          │
[HAS_ORG, ONBOARDING_COMPLETE, TRIAL_EXPIRED] ─────────────────────────────────┘
     │
     │ (user clicks "Upgrade" in BillingGate)
     ▼
[STRIPE_UPGRADE]
     │
     ▼ (webhook: checkout.session.completed)
[HAS_ORG, ONBOARDING_COMPLETE, PAID]
```

## Invariants

1. **No duplicate orgs**: A user can have at most 1 organization
2. **No duplicate customers**: An org can have at most 1 Stripe customer
3. **No redirect loops**: Each page can redirect at most once per mount
4. **No assumption-based redirects**: All redirects based on verified server state
5. **No auto-billing redirects**: User must click to access billing
