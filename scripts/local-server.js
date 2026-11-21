/* ============================================================
   AI Tutor (UET Master) – Local Server, Cloud Sync, Share & Admin API (port 5000)
   Run: node scripts/local-server.js
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 5000;
const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "data", "db.json");
const ADMIN_EMAIL = "phamduchieurobotics@gmail.com";
const DAY_MS = 86400000;
const PAID_PLANS = ["bronze", "silver", "gold", "diamond"];

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

function loadDb() {
  const def = {
    subscriptions: {},
    payment_requests: [],
    paymentConfig: { bankName: "MBV Bank", bankId: "970414", accountNo: "31122007", accountName: "PHAM DUC HIEU" },
    vouchers: [],
    shares: {},
    cloudUsers: {}
  };
  try {
    if (!fs.existsSync(DB_PATH)) return def;
    const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    return Object.assign(def, raw);
  } catch (e) { return def; }
}

function saveDb(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function decodeJwtEmail(authHeader) {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return "";
    const parts = authHeader.slice(7).split(".");
    if (parts.length < 2) return "";
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const payload = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    if (payload && payload.email_verified === true && typeof payload.email === "string") {
      return payload.email.trim().toLowerCase();
    }
    return "";
  } catch (e) { return ""; }
}

function getCallerEmail(req) {
  const jwtEmail = decodeJwtEmail(req.headers.authorization || "");
  if (jwtEmail) return jwtEmail;
  const hdr = String(req.headers["x-user-email"] || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hdr) ? hdr : "";
}

function normalizeGmail(email) {
  const e = String(email || "").trim().toLowerCase();
  const parts = e.split("@");
  if (parts.length === 2 && (parts[1] === "gmail.com" || parts[1] === "googlemail.com")) {
    return parts[0].replace(/\./g, "") + "@gmail.com";
  }
  return e;
}

function isCallerAdmin(req) { return normalizeGmail(getCallerEmail(req)) === ADMIN_EMAIL; }

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 10 * 1024 * 1024) { req.destroy(); reject(new Error("Payload too large")); }
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(new Error("Invalid JSON")); }
    });
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, "http://localhost:" + PORT);
  const p = urlObj.pathname;

  try {
    if (p === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, { ok: true, app: "AI Tutor" });
    }

    /* ---------- Public Share Link / Short Code API ---------- */
    if (p === "/api/shares" && req.method === "POST") {
      const body = await readBody(req);
      if (!body || !body.deck || !Array.isArray(body.deck.questions) || body.deck.questions.length === 0) {
        return sendJson(res, 400, { error: "Bộ đề chia sẻ không hợp lệ." });
      }
      const db = loadDb();
      let code = String(body.code || "").trim().toUpperCase();
      if (!/^AIT-\d{4,6}$/.test(code)) {
        code = "AIT-" + Math.floor(1000 + Math.random() * 9000);
        while (db.shares[code]) code = "AIT-" + Math.floor(1000 + Math.random() * 9000);
      }
      db.shares[code] = {
        code: code,
        deck: body.deck,
        createdBy: getCallerEmail(req) || "guest",
        createdAt: new Date().toISOString()
      };
      saveDb(db);
      return sendJson(res, 201, { ok: true, code: code });
    }
    const shareGet = p.match(/^\/api\/shares\/([^/]+)$/);
    if (shareGet && req.method === "GET") {
      const code = decodeURIComponent(shareGet[1]).trim().toUpperCase();
      const db = loadDb();
      const entry = db.shares[code];
      if (!entry) return sendJson(res, 404, { error: "Không tìm thấy mã đề " + code });
      return sendJson(res, 200, { ok: true, share: entry });
    }

    /* ---------- Cloud User Data Sync API ---------- */
    if (p === "/api/cloud/sync" && req.method === "GET") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Chưa đăng nhập." });
      const db = loadDb();
      return sendJson(res, 200, { ok: true, data: db.cloudUsers[caller] || null });
    }
    if (p === "/api/cloud/sync" && req.method === "PUT") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Chưa đăng nhập." });
      const body = await readBody(req);
      const db = loadDb();
      db.cloudUsers[caller] = Object.assign({}, db.cloudUsers[caller] || {}, body, { updatedAt: new Date().toISOString() });
      saveDb(db);
      return sendJson(res, 200, { ok: true, updatedAt: db.cloudUsers[caller].updatedAt });
    }

    /* ---------- Billing State ---------- */
    if (p === "/api/billing/state" && req.method === "GET") {
      const caller = getCallerEmail(req);
      const db = loadDb();
      if (isCallerAdmin(req)) return sendJson(res, 200, db);
      const ownSubs = {};
      if (caller && db.subscriptions[caller]) ownSubs[caller] = db.subscriptions[caller];
      const ownReqs = db.payment_requests.filter((r) => r && String(r.userEmail || "").toLowerCase() === caller);
      return sendJson(res, 200, { subscriptions: ownSubs, payment_requests: ownReqs, paymentConfig: db.paymentConfig, vouchers: db.vouchers });
    }

    if (p === "/api/subscriptions/unranked" && req.method === "POST") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Chưa đăng nhập." });
      const db = loadDb();
      const cur = db.subscriptions[caller];
      if (cur && PAID_PLANS.includes(cur.tier) && Number(cur.expires) > Date.now()) {
        return sendJson(res, 400, { error: "Bạn đang có gói cao hơn Unranked." });
      }
      db.subscriptions[caller] = { tier: "unranked", since: Date.now(), expires: Date.now() + 365 * DAY_MS };
      saveDb(db);
      return sendJson(res, 200, { ok: true, subscription: db.subscriptions[caller] });
    }

    if (p === "/api/payment-requests" && req.method === "POST") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Chưa đăng nhập." });
      const body = await readBody(req);
      if (!PAID_PLANS.includes(body.plan)) return sendJson(res, 400, { error: "Gói thanh toán không hợp lệ." });
      const db = loadDb();
      const dup = db.payment_requests.some((r) => r && r.userEmail === caller && r.plan === body.plan && r.status === "pending");
      if (dup) return sendJson(res, 409, { error: "Bạn đã có yêu cầu đang chờ duyệt cho gói này." });
      const rec = {
        id: String(body.id || ("req_" + Date.now())),
        userId: String(body.userId || caller),
        userEmail: caller,
        userName: String(body.userName || caller),
        plan: body.plan,
        amount: Number(body.amount) || 0,
        voucher: String(body.voucher || ""),
        memo: String(body.memo || ""),
        transferNote: String(body.transferNote || ""),
        receiptImage: typeof body.receiptImage === "string" ? body.receiptImage.slice(0, 600000) : "",
        status: "pending",
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        rejectReason: ""
      };
      db.payment_requests.push(rec);
      saveDb(db);
      return sendJson(res, 201, { ok: true, request: rec });
    }

    /* ---------- Strict Admin Routes ---------- */
    if (p.startsWith("/api/admin/")) {
      if (!isCallerAdmin(req)) {
        return sendJson(res, 403, { error: "Forbidden: Chỉ tài khoản phamduchieurobotics@gmail.com có quyền quản trị." });
      }
      const db = loadDb();
      const approveMatch = p.match(/^\/api\/admin\/payment-requests\/([^/]+)\/approve$/);
      if (approveMatch && req.method === "POST") {
        const id = decodeURIComponent(approveMatch[1]);
        const rec = db.payment_requests.find((r) => r && r.id === id);
        if (!rec || rec.status !== "pending") return sendJson(res, 404, { error: "Không tìm thấy đơn chờ duyệt." });
        rec.status = "approved";
        rec.reviewedAt = new Date().toISOString();
        rec.reviewedBy = ADMIN_EMAIL;
        rec.rejectReason = "";
        const old = db.subscriptions[rec.userEmail];
        const start = old && old.tier === rec.plan && Number(old.expires) > Date.now() ? Number(old.expires) : Date.now();
        db.subscriptions[rec.userEmail] = { tier: rec.plan, since: (old && old.since) || Date.now(), expires: start + 365 * DAY_MS };
        saveDb(db);
        return sendJson(res, 200, { ok: true, request: rec, subscription: db.subscriptions[rec.userEmail] });
      }
      const rejectMatch = p.match(/^\/api\/admin\/payment-requests\/([^/]+)\/reject$/);
      if (rejectMatch && req.method === "POST") {
        const id = decodeURIComponent(rejectMatch[1]);
        const body = await readBody(req);
        const rec = db.payment_requests.find((r) => r && r.id === id);
        if (!rec || rec.status !== "pending") return sendJson(res, 404, { error: "Không tìm thấy đơn chờ duyệt." });
        rec.status = "rejected";
        rec.reviewedAt = new Date().toISOString();
        rec.reviewedBy = ADMIN_EMAIL;
        rec.rejectReason = String(body.rejectReason || "Yêu cầu bị từ chối").trim();
        saveDb(db);
        return sendJson(res, 200, { ok: true, request: rec });
      }
      if (p === "/api/admin/subscriptions" && req.method === "POST") {
        const body = await readBody(req);
        const em = String(body.email || "").trim().toLowerCase();
        if (!em || !["unranked"].concat(PAID_PLANS).includes(body.tier)) return sendJson(res, 400, { error: "Dữ liệu không hợp lệ." });
        db.subscriptions[em] = { tier: body.tier, since: Date.now(), expires: Date.now() + 365 * DAY_MS };
        saveDb(db);
        return sendJson(res, 200, { ok: true });
      }
      const delSubMatch = p.match(/^\/api\/admin\/subscriptions\/([^/]+)$/);
      if (delSubMatch && req.method === "DELETE") {
        const em = decodeURIComponent(delSubMatch[1]).toLowerCase();
        delete db.subscriptions[em];
        saveDb(db);
        return sendJson(res, 200, { ok: true });
      }
      if (p === "/api/admin/payment-config" && req.method === "PUT") {
        db.paymentConfig = await readBody(req);
        saveDb(db);
        return sendJson(res, 200, { ok: true });
      }
      if (p === "/api/admin/vouchers" && req.method === "PUT") {
        const body = await readBody(req);
        if (Array.isArray(body.vouchers)) db.vouchers = body.vouchers;
        saveDb(db);
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 404, { error: "API route not found" });
    }

    // Static files + SPA fallback to index.html (mirrors vercel.json)
    const rel = p === "/" ? "index.html" : p.replace(/^\/+/, "");
    const safePath = path.normalize(path.join(ROOT, rel));
    if (safePath.startsWith(ROOT) && fs.existsSync(safePath) && !fs.statSync(safePath).isDirectory()) {
      const ext = path.extname(safePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      return fs.createReadStream(safePath).pipe(res);
    }
    if (path.extname(rel)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 Not Found");
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(path.join(ROOT, "index.html")).pipe(res);
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Internal Server Error" });
  }
});

server.listen(PORT, () => {
  console.log("AI Tutor running at http://localhost:" + PORT);
});
