/**
 * Produces .vercel/output for Build Output API v3 so the server bundle is never
 * served as a static file. Static assets and SPA fallback are explicit.
 */
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distPublic = path.join(root, "dist", "public");
const outDir = path.join(root, ".vercel", "output");
const staticDir = path.join(outDir, "static");
const funcDir = path.join(outDir, "functions", "render.func");

// Clean and create dirs
if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(funcDir, { recursive: true });

// 1. Build serverless handler from vercel-entry (same as api/handler.mjs)
await esbuild.build({
  entryPoints: [path.join(root, "server", "vercel-entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: path.join(funcDir, "index.mjs"),
  alias: { "@shared": path.join(root, "shared") },
});

// 2. Copy dist/public to static (for CDN) and into function (for SPA fallback)
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn("[build-vercel-output] Missing:", src);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(distPublic, staticDir);
copyDir(distPublic, path.join(funcDir, "public"));

// 3. Function config (handler = entry file for this serverless function)
fs.writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      maxDuration: 30,
    },
    null,
    2
  )
);

// 4. Build Output API v3 config: filesystem first, then catch-all to function
fs.writeFileSync(
  path.join(outDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/render" },
      ],
    },
    null,
    2
  )
);

console.log("Built .vercel/output (Build Output API v3)");
