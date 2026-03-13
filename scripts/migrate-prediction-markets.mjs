/**
 * Apply predictionMarkets unique constraint migration (0008).
 * Run with: DATABASE_URL=... node scripts/migrate-prediction-markets.mjs
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
try {
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "predictionMarkets_externalId_source_unique" ON "predictionMarkets" ("externalId", "source")`;
  console.log("✅ Migration 0008 complete: unique index on (externalId, source)");
} catch (err) {
  if (err.message?.includes("already exists")) {
    console.log("⏭️  Index already exists, skipping");
  } else {
    console.error("❌", err.message);
    process.exit(1);
  }
}
