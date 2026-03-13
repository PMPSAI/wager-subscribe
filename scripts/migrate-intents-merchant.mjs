/**
 * Add merchantId column to intents (migration 0005).
 * Run with: DATABASE_URL=... node scripts/migrate-intents-merchant.mjs
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
try {
  await sql`ALTER TABLE "intents" ADD COLUMN IF NOT EXISTS "merchantId" integer`;
  console.log("✅ Migration 0005 complete: merchantId column added to intents");
} catch (err) {
  console.error("❌", err.message);
  process.exit(1);
}
