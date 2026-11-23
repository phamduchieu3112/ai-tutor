/* Zero-dependency static site builder for Vercel / static hosting */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const STATIC_FILES = [
  "index.html",
  "converter.html",
  "vocab.html",
  "style.css",
  "vocab.css",
  "ai-providers-config.js",
  "app.js",
  "converter.js",
  "studio.js",
  "vocab.js",
  "cloud-share-pdf.js",
  "data/manifest.json",
  "data/vocab/default-vocab.json"
];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const rel of STATIC_FILES) {
  const src = path.join(ROOT, rel);
  const dst = path.join(DIST, rel);
  if (!fs.existsSync(src)) {
    throw new Error("Missing static asset: " + rel);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

console.log("Built static bundle to dist/ (" + STATIC_FILES.length + " files)");
