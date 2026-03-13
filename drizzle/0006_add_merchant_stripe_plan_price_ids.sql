-- Merchant plan-specific Stripe price IDs for checkout
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "stripePlanPriceIds" json;
