# Widget Implementation Roadmap

This document tracks the six requirements for making the WagerSubscribe widget fully functional.

## Current State

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Merchant dashboard: customize packages, pricing, descriptions | Partial | PLANS are platform-wide (`server/products.ts`). Merchants exist but have no custom packages. |
| 2 | Configure Stripe in merchant widget | Partial | MerchantSettings has Stripe Connect (OAuth), webhook config. Checkout uses platform Stripe. |
| 3 | Widget functional: token-based, merchant info, Polymarket/Kalshi predictions | Partial | Widget exists, uses slug. Embed token verify exists. `markets.listEnabled` returns Polymarket/Kalshi. Need token→merchant config. |
| 4 | Record prediction choice in DB | Missing | Widget has prediction step but no API to save market + yes/no. `intent.userChoice` exists in schema. |
| 5 | Merchant list of predictions | Partial | MerchantIntents / intent.list shows intents. Need merchant scoping (intent→campaign→merchantId). |
| 6 | Auto-resolve when Kalshi/Polymarket outcome known | Exists | `markets.autoResolveIntents` + resolver. Need cron/job + link intents to prediction markets. |

---

## Phase 1: Core Widget Flow (Record + Display Predictions)

### 1.1 Record prediction choice in DB
- Add `intent.recordPrediction` (or extend `intent.create`) for widget flow.
- Input: `predictionMarketId`, `userChoice` ("yes"|"no"), `memberId` or `sessionToken`, optional `transactionId`.
- Create/use user from member when needed.
- Create intent with `userChoice`, `predictionMarketId` in termsSnapshot.
- Require: incentiveOption linked to prediction market (create option when market enabled).

### 1.2 Widget: save prediction when user selects market + yes/no
- In Widget prediction step, on submit call `intent.recordPrediction` or equivalent.
- Show success, move to tracking step.

### 1.3 Merchant list of predictions
- Ensure `intent.list` filtered by merchant (intents → campaign → merchantId).
- Add `intent.listByMerchant` if needed for MerchantIntents page.

---

## Phase 2: Merchant Customization & Token-Based Widget

### 2.1 Merchant packages (custom pricing & descriptions)
- New table: `merchantPackages` (merchantId, name, priceCents, priceId, description, features, tier, isActive).
- CRUD in merchant dashboard.
- Widget: when embed token provided, fetch `merchant.packages` instead of platform PLANS.

### 2.2 Widget token support
- Widget reads `?token=xxx` from URL.
- Call `merchant.verifyEmbedToken`, store merchantId.
- Fetch merchant config (packages, name) by merchantId.
- Display merchant branding in widget.

### 2.3 Stripe in merchant widget
- Use merchant's Stripe Connect account for checkout when available.
- Fallback to platform Stripe when merchant has no Connect.
- MerchantSettings: finish Stripe Connect OAuth flow + webhook setup.

---

## Phase 3: Auto-Resolve & Polish

### 3.1 Link intents to prediction markets
- incentiveOption.predictionMarketId already exists.
- When creating intent from prediction market, use/create incentiveOption with predictionMarketId.

### 3.2 Auto-resolve job
- `markets.autoResolveIntents` exists.
- Add Vercel cron or external job: call `/api/cron/resolve-predictions` daily.
- Job: for each resolved market, find intents with matching incentiveOption, resolve WIN/LOSS based on userChoice vs outcome.

### 3.3 Enable markets for widget
- Admin syncs Polymarket/Kalshi in AdminPortal.
- Admin toggles markets enabled for widget.
- Widget fetches `markets.listEnabled` and displays them in prediction step.

---

## Database Changes (if needed)

- `merchantPackages`: custom plans per merchant (optional Phase 2).
- Ensure `intents.campaignId` can reference a "prediction" campaign; `incentiveOptions` created per enabled market.

## API Additions

| Endpoint | Purpose |
|----------|---------|
| `intent.recordPrediction` | Widget: save market + yes/no choice (creates intent, links member→user if needed) |
| `merchant.packages` | List custom packages for merchant (Phase 2) |
| `merchant.config` | Public: get merchant config by token (branding, packages) |
