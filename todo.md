# WagerSubscribe TODO

## Phase 1: Backend & Database
- [x] Add Stripe via webdev_add_feature
- [x] Database schema: subscriptions, transactions, wagers tables
- [x] Push DB migrations
- [x] Stripe product + price creation (Starter, Pro, Elite plans)
- [x] tRPC routers: subscription, wager, dashboard
- [x] Stripe Checkout session creation endpoint
- [x] Stripe webhook handler (checkout.session.completed, subscription.updated/deleted)

## Phase 2: Subscription Plans UI
- [x] Landing page (Home.tsx) with hero, how-it-works, features, CTA
- [x] Plans page with Starter/Pro/Elite cards and wager incentive boxes
- [x] "Subscribe" CTA → Stripe Checkout redirect (opens in new tab)
- [x] Auth-gated flow (login required before checkout)

## Phase 3: Wager Selection (Post-Payment)
- [x] /wager-select?session_id=... page
- [x] Verify payment session server-side before showing wager options
- [x] Wager categories: Market, Sports, Economy (+ Custom for Elite)
- [x] Confirm wager → save to DB with transaction ID
- [x] Redirect to dashboard after selection

## Phase 4: Dashboard
- [x] /dashboard page (auth-protected)
- [x] Stats cards: Total, Pending, Won, Rewards Earned
- [x] Active wagers list with transaction ID, bet, status, potential reward
- [x] Wager history (resolved wagers with outcome badges)
- [x] Outcome badges: Pending / Won / Lost / Expired / Cancelled
- [x] Admin simulate outcome controls (Won/Lost buttons for admin role)
- [x] Active subscription status card

## Phase 5: Polish & Tests
- [x] Auth guards on wager-select and dashboard routes
- [x] Vitest tests for all routers (9 tests passing)
- [x] Responsive design across all pages
- [x] Loading/error/empty states on all pages
- [x] TypeScript clean (0 errors)
- [x] Fix Stripe price ID mismatch (re-seeded prices under correct app key)
- [x] Save checkpoint

## Phase 6: Compliance Rename (Wager → Incentiv)
- [x] Audit all files for wager/bet/gambling terminology
- [x] Rename DB schema: wagers table → incentives, wager columns → incentive columns
- [x] Push DB migration for renamed table/columns
- [x] Rename server/wagerConditions.ts → server/incentiveConditions.ts
- [x] Update server/db.ts: all wager references → incentive
- [x] Update server/routers.ts: wager router → incentiv router, all copy compliant
- [x] Update server/webhook.ts: wager references → incentive
- [x] Rename client/src/pages/WagerSelect.tsx → IncentivSelect.tsx
- [x] Rewrite Home.tsx: no wager/bet language
- [x] Rewrite Plans.tsx: no wager/bet language
- [x] Rewrite IncentivSelect.tsx: no wager/bet language
- [x] Rewrite Dashboard.tsx: no wager/bet language
- [x] Update App.tsx routes: /wager-select → /incentiv-select
- [x] Update tests for renamed procedures
- [x] TypeScript clean, all tests pass
- [x] Save checkpoint
