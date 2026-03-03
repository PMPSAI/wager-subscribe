import * as esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const apiDir = path.join(root, "api");
if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, "server", "vercel-entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: path.join(root, "api", "handler.mjs"),
  alias: {
    "@shared": path.join(root, "shared"),
  },
});
console.log("Built api/handler.mjs for Vercel");
