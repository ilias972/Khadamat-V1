/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
// Detect any hardcoded localhost/127.0.0.1 with any port
const RE = /(?:localhost|127\.0\.0\.1):\d+/;

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(filePath);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (RE.test(line)) {
        console.error(`ERROR: Hardcoded host:port found in ${filePath}:${i + 1}`);
        console.error(`Line: ${line.trim()}`);
        process.exit(1);
      }
    }
  }
}

scanDirectory(SRC_DIR);
console.log("OK: No hardcoded localhost ports found.");
process.exit(0);