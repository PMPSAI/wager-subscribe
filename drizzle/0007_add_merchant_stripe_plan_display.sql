-- Merchant display prices (amountCents per tier) for widget/plans UI
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "stripePlanDisplay" json;
