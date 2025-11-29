// postinstall.js
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const assetsDir = path.join(process.cwd(), "visual-assets");

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Ensure .gitignore exists
const ignorePath = path.join(assetsDir, ".gitignore");
if (!fs.existsSync(ignorePath)) {
  fs.writeFileSync(ignorePath, "*\n!.gitignore\n", "utf-8");
}

// Run generator only on local machines (not in GitHub PR)
if (!process.env.CI && !process.env.GITHUB_ACTIONS) {
  console.log("Running asset generation...");
  exec("node generate-assets.js", (err) => {
    if (err) {
      console.error("Asset generation failed:", err);
    } else {
      console.log("Asset generation complete.");
    }
  });
} else {
  console.log("Skipping asset generation in CI/PR environments.");
}
