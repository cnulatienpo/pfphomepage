/**
 * indexAssets.js
 *
 * Scans the whole repo for image assets and writes:
 *   assets-index.json
 *
 * Supports: png, jpg, jpeg, webp, svg
 *
 * Run:
 *   node scripts/indexAssets.js
 */

import fs from "fs";
import path from "path";

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
const ROOT = process.cwd();

let collected = [];

function scan(dir) {
  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of list) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Ignore node_modules, .git, dist, build
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === "env"
      ) {
        continue;
      }
      scan(full);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXT.includes(ext)) {
        collected.push(full.replace(ROOT, "").replace(/\\/g, "/"));
      }
    }
  }
}

console.log("🔍 Scanning for assets...");
scan(ROOT);

const output = {
  generated: new Date().toISOString(),
  count: collected.length,
  assets: collected
};

const outPath = path.join(ROOT, "assets-index.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`📦 Indexed ${output.count} assets.`);
console.log(`📄 Wrote: assets-index.json`);

