-- Unique constraint for upsert: (externalId, source)
CREATE UNIQUE INDEX IF NOT EXISTS "predictionMarkets_externalId_source_unique" ON "predictionMarkets" ("externalId", "source");
