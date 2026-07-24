import { copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Copy the built bundle into every framework's public assets so
// `tina4 serve` picks up the fresh UI on next start. Each framework
// serves the same JS — the file tree API + MCP shim + session proxy
// handle the per-language details.
//
// Vite's `minify: true` (see vite.config.ts) produces a single minified
// IIFE, deployed under ONE name: tina4-dev-admin.min.js. That is the
// only name anything references -- the SPA shell, the static route and
// the DevAdmin loader in all four frameworks hard-code `.min.js`
// (verified: zero references to the unminified name). This script used
// to ALSO write an identical `tina4-dev-admin.js`, ~940K of byte-for-byte
// dead weight in every install that nothing loaded; task #348 deleted it
// and each framework gained a gate test forbidding it, but this script
// kept re-creating it on every deploy, so the gates went red again. One
// name, no duplicate. If a dev path ever genuinely needs the unminified
// bundle, give it a distinct build output — do not shadow-copy the min.

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../dist/tina4-dev-admin.js");

// Destinations are the .min.js the frameworks actually load.
const targets = [
  "../../tina4-python/tina4_python/public/js/tina4-dev-admin.min.js",
  "../../tina4-php/src/public/js/tina4-dev-admin.min.js",
  "../../tina4-ruby/lib/tina4/public/js/tina4-dev-admin.min.js",
  "../../tina4-nodejs/packages/core/public/js/tina4-dev-admin.min.js",
];

if (!existsSync(src)) {
  console.error("Build first: npm run build");
  process.exit(1);
}

let ok = 0;
for (const target of targets) {
  const dest = resolve(__dirname, target);
  try {
    copyFileSync(src, dest);
    console.log(`Deployed → ${target}`);
    ok++;
  } catch (e) {
    console.warn(`Skip ${target}: ${e.message}`);
  }
}

console.log(`\n${ok}/${targets.length} frameworks updated.`);
