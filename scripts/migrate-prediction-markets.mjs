/**
 * Apply predictionMarkets unique constraint migration (0008).
 * Run with: DATABASE_URL=... node scripts/migrate-prediction-markets.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const migration = readFileSync(
  join(__dirname, "../drizzle/0008_add_prediction_markets_unique.sql"),
  "utf8"
)
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of migration) {
  try {
    await sql(stmt + ";");
    console.log("✅ Applied:", stmt.slice(0, 60) + "...");
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log("⏭️  Index already exists, skipping");
    } else {
      console.error("❌", err.message);
      process.exit(1);
    }
  }
}
console.log("✅ Migration 0008 complete");
