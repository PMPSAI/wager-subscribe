// Stub so Vercel matches the "api/handler.mjs" functions pattern at clone time.
// Overwritten by: pnpm run build -> node scripts/build-vercel-api.mjs
export default async function handler(_req, res) {
  res.status(503).setHeader("Content-Type", "text/plain").end("Build placeholder; run pnpm run build.");
}
