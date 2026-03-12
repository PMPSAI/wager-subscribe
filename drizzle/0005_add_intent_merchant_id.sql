-- Add merchantId to intents for widget prediction scoping
ALTER TABLE "intents" ADD COLUMN IF NOT EXISTS "merchantId" integer;
