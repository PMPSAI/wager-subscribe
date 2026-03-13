/**
 * Run all pending migrations (0005–0008).
 * Run with: DATABASE_URL=... node scripts/migrate-all-pending.mjs
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const migrations = [
  { name: "0005 merchantId on intents", run: () => sql`ALTER TABLE "intents" ADD COLUMN IF NOT EXISTS "merchantId" integer` },
  { name: "0006 stripePlanPriceIds on merchants", run: () => sql`ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "stripePlanPriceIds" json` },
  { name: "0007 stripePlanDisplay on merchants", run: () => sql`ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "stripePlanDisplay" json` },
  { name: "0008 unique index predictionMarkets", run: () => sql`CREATE UNIQUE INDEX IF NOT EXISTS "predictionMarkets_externalId_source_unique" ON "predictionMarkets" ("externalId", "source")` },
];

for (const { name, run } of migrations) {
  try {
    await run();
    console.log("✅", name);
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log("⏭️ ", name, "(already applied)");
    } else {
      console.error("❌", name, ":", err.message);
      process.exit(1);
    }
  }
}
console.log("✅ All migrations complete");
