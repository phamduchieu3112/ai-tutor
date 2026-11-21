/* ============================================================
   AI Tutor (UET Master) – Local Server, Cloud Sync, Share & Admin API (port 5000)
   Run: node scripts/local-server.js
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const apiHandler = require("../api/index.js");

const PORT = Number(process.env.PORT) || 5000;
const ROOT = path.resolve(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, "http://localhost:" + PORT);
  const p = urlObj.pathname;

  if (p.startsWith("/api/")) {
    return apiHandler(req, res);
  }

  let rel = p === "/" ? "/index.html" : p;
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  if (fs.existsSync(full) && fs.statSync(full).isFile()) {
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    return fs.createReadStream(full).pipe(res);
  }
  const idx = path.join(ROOT, "index.html");
  if (fs.existsSync(idx)) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(idx).pipe(res);
  }
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("AI Tutor running at http://localhost:" + PORT);
});
