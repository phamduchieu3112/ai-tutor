/* ============================================================
   AI Tutor (UET Master) – Unified Serverless & Local API Handler
   Handles /api/* on both Vercel Serverless Functions and local Node server
   ============================================================ */
const fs = require("fs");
const path = require("path");
const os = require("os");

const ADMIN_EMAIL = "phamduchieurobotics@gmail.com";
const DAY_MS = 86400000;
const PAID_PLANS = ["bronze", "silver", "gold", "diamond"];
const ALL_PLANS = ["unranked", "bronze", "silver", "gold", "diamond"];
const PLAN_RANK = { none: 0, unranked: 1, bronze: 2, silver: 3, gold: 4, diamond: 5 };

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_PATH = IS_SERVERLESS
  ? path.join(os.tmpdir(), "ai-tutor-db.json")
  : path.join(__dirname, "..", "data", "db.json");

function defaultDb() {
  return {
    subscriptions: {},
    revokedSubscriptions: {},
    userApis: {},
    revokedUserApis: {},
    payment_requests: [],
    paymentConfig: { bankName: "MBV Bank", bankId: "970414", accountNo: "31122007", accountName: "PHAM DUC HIEU" },
    vouchers: [],
    deletedVouchers: {},
    shares: {},
    cloudUsers: {}
  };
}

function loadDb() {
  const def = defaultDb();
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
      const merged = Object.assign(def, raw);
      global.__AI_TUTOR_DB__ = merged;
      return merged;
    }
  } catch (e) { /* fallback to memory */ }
  if (global.__AI_TUTOR_DB__ && typeof global.__AI_TUTOR_DB__ === "object") {
    return Object.assign(def, global.__AI_TUTOR_DB__);
  }
  global.__AI_TUTOR_DB__ = def;
  return def;
}

function saveDb(db) {
  global.__AI_TUTOR_DB__ = db;
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (e) { /* keep in memory on read-only fallback */ }
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
  const headers = (req && req.headers) || {};
  const jwtEmail = decodeJwtEmail(headers.authorization || headers.Authorization || "");
  if (jwtEmail) return jwtEmail;
  const hdr = String(headers["x-user-email"] || headers["X-User-Email"] || "").trim().toLowerCase();
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

function isCallerAdmin(req) {
  return normalizeGmail(getCallerEmail(req)) === ADMIN_EMAIL;
}

function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === "string") {
    try { return Promise.resolve(req.body ? JSON.parse(req.body) : {}); } catch (e) { return Promise.resolve({}); }
  }
  if (Buffer.isBuffer(req.body)) {
    try { return Promise.resolve(JSON.parse(req.body.toString("utf8") || "{}")); } catch (e) { return Promise.resolve({}); }
  }
  return new Promise(function (resolve) {
    let data = "";
    req.on("data", function (c) {
      data += c;
      if (data.length > 8 * 1024 * 1024) { try { req.destroy(); } catch (e) { /* */ } resolve({}); }
    });
    req.on("end", function () {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
    });
    req.on("error", function () { resolve({}); });
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  });
  res.end(JSON.stringify(obj));
}

function resolveApiPath(req) {
  const rawUrl = String((req && req.url) || "/");
  const urlObj = new URL(rawUrl, "http://localhost");
  const rewritten = urlObj.searchParams.get("__path");
  let p = rewritten ? String(rewritten).trim() : urlObj.pathname;
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function mergeClientSnapshot(db, body, isAdminCaller, callerEmail) {
  if (!body || typeof body !== "object") return false;
  let changed = false;
  if (!db.revokedSubscriptions || typeof db.revokedSubscriptions !== "object") db.revokedSubscriptions = {};
  if (!db.deletedVouchers || typeof db.deletedVouchers !== "object") db.deletedVouchers = {};

  // 1. Merge subscriptions
  if (body.subscriptions && typeof body.subscriptions === "object") {
    Object.keys(body.subscriptions).forEach(function (rawEmail) {
      const em = String(rawEmail || "").trim().toLowerCase();
      if (!em || (!isAdminCaller && em !== callerEmail)) return;
      const incoming = body.subscriptions[rawEmail];
      if (!incoming || typeof incoming !== "object" || !ALL_PLANS.includes(incoming.tier)) return;
      const revokedAt = Number(db.revokedSubscriptions[em]) || 0;
      const inSince = Number(incoming.since) || 0;
      if (revokedAt && inSince <= revokedAt) return;
      const cur = db.subscriptions[em];
      if (!cur) {
        db.subscriptions[em] = {
          tier: incoming.tier,
          since: inSince || Date.now(),
          expires: Number(incoming.expires) || (Date.now() + 365 * DAY_MS)
        };
        changed = true;
      } else if (isAdminCaller) {
        const curRank = PLAN_RANK[cur.tier] || 0;
        const inRank = PLAN_RANK[incoming.tier] || 0;
        if (inSince > (Number(cur.since) || 0) || (inRank > curRank && Number(incoming.expires) > Date.now())) {
          db.subscriptions[em] = {
            tier: incoming.tier,
            since: inSince || cur.since || Date.now(),
            expires: Number(incoming.expires) || cur.expires || (Date.now() + 365 * DAY_MS)
          };
          changed = true;
        }
      }
    });
  }

  // 2. Merge payment_requests
  if (Array.isArray(body.payment_requests)) {
    const byId = {};
    db.payment_requests.forEach(function (r) { if (r && r.id) byId[r.id] = r; });
    body.payment_requests.forEach(function (r) {
      if (!r || typeof r !== "object" || !r.id || !PAID_PLANS.includes(r.plan)) return;
      const rEmail = String(r.userEmail || "").trim().toLowerCase();
      if (!rEmail || (!isAdminCaller && rEmail !== callerEmail)) return;
      const existing = byId[r.id];
      if (!existing) {
        const rec = {
          id: String(r.id),
          userId: String(r.userId || rEmail),
          userEmail: rEmail,
          userName: String(r.userName || rEmail),
          plan: r.plan,
          amount: Number(r.amount) || 0,
          voucher: String(r.voucher || ""),
          memo: String(r.memo || ""),
          transferNote: String(r.transferNote || ""),
          receiptImage: typeof r.receiptImage === "string" ? r.receiptImage.slice(0, 600000) : "",
          status: ["pending", "approved", "rejected"].includes(r.status) ? r.status : "pending",
          createdAt: r.createdAt || new Date().toISOString(),
          reviewedAt: r.reviewedAt || null,
          reviewedBy: r.reviewedBy || null,
          rejectReason: String(r.rejectReason || "")
        };
        db.payment_requests.push(rec);
        byId[rec.id] = rec;
        changed = true;
      } else if (isAdminCaller && existing.status === "pending" && (r.status === "approved" || r.status === "rejected")) {
        existing.status = r.status;
        existing.reviewedAt = r.reviewedAt || new Date().toISOString();
        existing.reviewedBy = r.reviewedBy || ADMIN_EMAIL;
        existing.rejectReason = String(r.rejectReason || "");
        changed = true;
      }
    });
  }

  // 3. Merge vouchers (Admin can seed vouchers from local storage if container cold-started)
  if (isAdminCaller && Array.isArray(body.vouchers)) {
    const existingCodes = {};
    db.vouchers.forEach(function (v) { if (v && v.code) existingCodes[String(v.code).toUpperCase()] = true; });
    body.vouchers.forEach(function (v) {
      if (!v || !v.code) return;
      const code = String(v.code).trim().toUpperCase();
      const pct = Number(v.discountPercent);
      if (!code || !(pct >= 1 && pct <= 100)) return;
      if (db.deletedVouchers[code]) return;
      if (!existingCodes[code]) {
        db.vouchers.push({ code: code, discountPercent: pct });
        existingCodes[code] = true;
        changed = true;
      }
    });
  }

  // 4. Merge paymentConfig if Admin
  if (isAdminCaller && body.paymentConfig && typeof body.paymentConfig === "object") {
    const pc = body.paymentConfig;
    if (pc.bankId && pc.accountNo && (!db.paymentConfig || !db.paymentConfig.accountNo)) {
      db.paymentConfig = {
        bankName: String(pc.bankName || "MBV Bank"),
        bankId: String(pc.bankId),
        accountNo: String(pc.accountNo),
        accountName: String(pc.accountName || "")
      };
      changed = true;
    }
  }

  // 5. Merge Admin-assigned user Gemini API keys
  if (!db.userApis || typeof db.userApis !== "object") db.userApis = {};
  if (!db.revokedUserApis || typeof db.revokedUserApis !== "object") db.revokedUserApis = {};
  if (isAdminCaller && body.userApis && typeof body.userApis === "object") {
    Object.keys(body.userApis).forEach(function (rawEm) {
      const em = String(rawEm || "").trim().toLowerCase();
      const item = body.userApis[rawEm];
      if (!em || !item || typeof item !== "object" || !item.apiKey) return;
      const revAt = Number(db.revokedUserApis[em]) || 0;
      const inTs = Number(item.ts) || 0;
      if (revAt && inTs <= revAt) return;
      const cur = db.userApis[em];
      if (!cur || inTs > (Number(cur.ts) || 0)) {
        db.userApis[em] = {
          email: em,
          apiKey: String(item.apiKey).trim(),
          model: String(item.model || "gemini-2.5-flash"),
          assignedBy: ADMIN_EMAIL,
          updatedAt: item.updatedAt || new Date().toISOString(),
          ts: inTs || Date.now()
        };
        changed = true;
      }
    });
  }

  return changed;
}

function buildBillingResponse(db, isAdminCaller, caller) {
  if (!db.userApis || typeof db.userApis !== "object") db.userApis = {};
  if (!db.revokedUserApis || typeof db.revokedUserApis !== "object") db.revokedUserApis = {};
  if (isAdminCaller) {
    return {
      subscriptions: db.subscriptions,
      revokedSubscriptions: db.revokedSubscriptions || {},
      userApis: db.userApis,
      revokedUserApis: db.revokedUserApis,
      payment_requests: db.payment_requests,
      paymentConfig: db.paymentConfig,
      vouchers: db.vouchers,
      deletedVouchers: db.deletedVouchers || {}
    };
  }
  const ownSubs = {};
  if (caller && db.subscriptions[caller]) ownSubs[caller] = db.subscriptions[caller];
  const ownApis = {};
  if (caller && db.userApis[caller]) ownApis[caller] = db.userApis[caller];
  const ownReqs = db.payment_requests.filter(function (r) {
    return r && String(r.userEmail || "").toLowerCase() === caller;
  });
  return {
    subscriptions: ownSubs,
    revokedSubscriptions: db.revokedSubscriptions || {},
    userApis: ownApis,
    revokedUserApis: db.revokedUserApis,
    payment_requests: ownReqs,
    paymentConfig: db.paymentConfig,
    vouchers: db.vouchers,
    deletedVouchers: db.deletedVouchers || {}
  };
}

module.exports = async function apiHandler(req, res) {
  const p = resolveApiPath(req);
  const method = String((req && req.method) || "GET").toUpperCase();

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Email"
    });
    return res.end();
  }

  try {
    if (p === "/api/health" && method === "GET") {
      return sendJson(res, 200, { ok: true, app: "AI Tutor" });
    }

    /* ---------- Public Share Link / Short Code API ---------- */
    if (p === "/api/shares" && method === "POST") {
      const body = await readBody(req);
      if (!body || !body.deck || !Array.isArray(body.deck.questions) || body.deck.questions.length === 0) {
        return sendJson(res, 400, { error: "B\u1ed9 \u0111\u1ec1 chia s\u1ebb kh\u00f4ng h\u1ee3p l\u1ec7." });
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
    if (shareGet && method === "GET") {
      const code = decodeURIComponent(shareGet[1]).trim().toUpperCase();
      const db = loadDb();
      const entry = db.shares[code];
      if (!entry) return sendJson(res, 404, { error: "Kh\u00f4ng t\u00ecm th\u1ea5y m\u00e3 \u0111\u1ec1 " + code });
      return sendJson(res, 200, { ok: true, share: entry });
    }

    /* ---------- Cloud User Data Sync API ---------- */
    if (p === "/api/cloud/sync" && method === "GET") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const db = loadDb();
      return sendJson(res, 200, { ok: true, data: db.cloudUsers[caller] || null });
    }
    if (p === "/api/cloud/sync" && method === "PUT") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const body = await readBody(req);
      const db = loadDb();
      db.cloudUsers[caller] = Object.assign({}, db.cloudUsers[caller] || {}, body, { updatedAt: new Date().toISOString() });
      saveDb(db);
      return sendJson(res, 200, { ok: true, updatedAt: db.cloudUsers[caller].updatedAt });
    }

    /* ---------- Billing State & Bidirectional Sync ---------- */
    if (p === "/api/billing/state" && method === "GET") {
      const caller = getCallerEmail(req);
      const db = loadDb();
      return sendJson(res, 200, buildBillingResponse(db, isCallerAdmin(req), caller));
    }

    if (p === "/api/billing/sync" && method === "POST") {
      const caller = getCallerEmail(req);
      const isAdminCaller = isCallerAdmin(req);
      const body = await readBody(req);
      const db = loadDb();
      if (mergeClientSnapshot(db, body, isAdminCaller, caller)) {
        saveDb(db);
      }
      return sendJson(res, 200, buildBillingResponse(db, isAdminCaller, caller));
    }

    if (p === "/api/subscriptions/unranked" && method === "POST") {
      const body = await readBody(req);
      const caller = getCallerEmail(req) || String((body && body.email) || "").trim().toLowerCase();
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const db = loadDb();
      const cur = db.subscriptions[caller];
      if (cur && PAID_PLANS.includes(cur.tier) && Number(cur.expires) > Date.now()) {
        return sendJson(res, 400, { error: "B\u1ea1n \u0111ang c\u00f3 g\u00f3i cao h\u01a1n Unranked." });
      }
      const now = Date.now();
      db.subscriptions[caller] = { tier: "unranked", since: now, expires: now + 365 * DAY_MS };
      if (db.revokedSubscriptions) delete db.revokedSubscriptions[caller];
      saveDb(db);
      return sendJson(res, 200, { ok: true, subscription: db.subscriptions[caller] });
    }

    if (p === "/api/payment-requests" && method === "POST") {
      const body = await readBody(req);
      const caller = getCallerEmail(req) || String((body && body.userEmail) || "").trim().toLowerCase();
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      if (!body || !PAID_PLANS.includes(body.plan)) return sendJson(res, 400, { error: "G\u00f3i thanh to\u00e1n kh\u00f4ng h\u1ee3p l\u1ec7." });
      const db = loadDb();
      const dup = db.payment_requests.some(function (r) {
        return r && String(r.userEmail || "").toLowerCase() === caller && r.plan === body.plan && r.status === "pending";
      });
      if (dup) return sendJson(res, 409, { error: "B\u1ea1n \u0111\u00e3 c\u00f3 y\u00eau c\u1ea7u \u0111ang ch\u1edd duy\u1ec7t cho g\u00f3i n\u00e0y." });
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
        createdAt: body.createdAt || new Date().toISOString(),
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
        return sendJson(res, 403, { error: "Forbidden: Ch\u1ec9 t\u00e0i kho\u1ea3n phamduchieurobotics@gmail.com c\u00f3 quy\u1ec1n qu\u1ea3n tr\u1ecb." });
      }
      const db = loadDb();
      if (!db.revokedSubscriptions) db.revokedSubscriptions = {};
      if (!db.deletedVouchers) db.deletedVouchers = {};

      const approveMatch = p.match(/^\/api\/admin\/payment-requests\/([^/]+)\/approve$/);
      if (approveMatch && method === "POST") {
        const id = decodeURIComponent(approveMatch[1]);
        const body = await readBody(req);
        let rec = db.payment_requests.find(function (r) { return r && r.id === id; });
        if (!rec && body && body.request && body.request.id === id) {
          rec = Object.assign({}, body.request, { status: "pending" });
          db.payment_requests.push(rec);
        }
        if (!rec || rec.status !== "pending") return sendJson(res, 404, { error: "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n ch\u1edd duy\u1ec7t." });
        rec.status = "approved";
        rec.reviewedAt = new Date().toISOString();
        rec.reviewedBy = ADMIN_EMAIL;
        rec.rejectReason = "";
        const userEmail = String(rec.userEmail || "").trim().toLowerCase();
        const old = db.subscriptions[userEmail];
        const now = Date.now();
        const start = old && old.tier === rec.plan && Number(old.expires) > now ? Number(old.expires) : now;
        db.subscriptions[userEmail] = { tier: rec.plan, since: now, expires: start + 365 * DAY_MS };
        delete db.revokedSubscriptions[userEmail];
        saveDb(db);
        return sendJson(res, 200, { ok: true, request: rec, subscription: db.subscriptions[userEmail] });
      }

      const rejectMatch = p.match(/^\/api\/admin\/payment-requests\/([^/]+)\/reject$/);
      if (rejectMatch && method === "POST") {
        const id = decodeURIComponent(rejectMatch[1]);
        const body = await readBody(req);
        let rec = db.payment_requests.find(function (r) { return r && r.id === id; });
        if (!rec && body && body.request && body.request.id === id) {
          rec = Object.assign({}, body.request, { status: "pending" });
          db.payment_requests.push(rec);
        }
        if (!rec || rec.status !== "pending") return sendJson(res, 404, { error: "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n ch\u1edd duy\u1ec7t." });
        rec.status = "rejected";
        rec.reviewedAt = new Date().toISOString();
        rec.reviewedBy = ADMIN_EMAIL;
        rec.rejectReason = String((body && body.rejectReason) || "Y\u00eau c\u1ea7u b\u1ecb t\u1eeb ch\u1ed1i").trim();
        saveDb(db);
        return sendJson(res, 200, { ok: true, request: rec });
      }

      if (p === "/api/admin/subscriptions" && method === "POST") {
        const body = await readBody(req);
        const em = String((body && body.email) || "").trim().toLowerCase();
        if (!em || !ALL_PLANS.includes(body && body.tier)) return sendJson(res, 400, { error: "D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7." });
        const now = Date.now();
        db.subscriptions[em] = { tier: body.tier, since: now, expires: now + 365 * DAY_MS };
        delete db.revokedSubscriptions[em];
        saveDb(db);
        return sendJson(res, 200, { ok: true, subscription: db.subscriptions[em] });
      }

      const delSubMatch = p.match(/^\/api\/admin\/subscriptions\/([^/]+)$/);
      if (delSubMatch && method === "DELETE") {
        const em = decodeURIComponent(delSubMatch[1]).trim().toLowerCase();
        delete db.subscriptions[em];
        db.revokedSubscriptions[em] = Date.now();
        saveDb(db);
        return sendJson(res, 200, { ok: true });
      }

      if (p === "/api/admin/payment-config" && method === "PUT") {
        const body = await readBody(req);
        db.paymentConfig = {
          bankName: String((body && body.bankName) || "MBV Bank").trim(),
          bankId: String((body && body.bankId) || "970414").trim().toUpperCase(),
          accountNo: String((body && body.accountNo) || "31122007").trim(),
          accountName: String((body && body.accountName) || "PHAM DUC HIEU").trim().toUpperCase()
        };
        saveDb(db);
        return sendJson(res, 200, { ok: true, paymentConfig: db.paymentConfig });
      }

      if (p === "/api/admin/vouchers" && method === "PUT") {
        const body = await readBody(req);
        if (Array.isArray(body && body.vouchers)) {
          const nextCodes = {};
          const clean = [];
          body.vouchers.forEach(function (v) {
            if (!v || !v.code) return;
            const code = String(v.code).trim().toUpperCase();
            const pct = Number(v.discountPercent);
            if (code && pct >= 1 && pct <= 100 && !nextCodes[code]) {
              nextCodes[code] = true;
              delete db.deletedVouchers[code];
              clean.push({ code: code, discountPercent: pct });
            }
          });
          (db.vouchers || []).forEach(function (oldV) {
            if (oldV && oldV.code) {
              const c = String(oldV.code).trim().toUpperCase();
              if (!nextCodes[c]) db.deletedVouchers[c] = Date.now();
            }
          });
          db.vouchers = clean;
        }
        saveDb(db);
        return sendJson(res, 200, { ok: true, vouchers: db.vouchers });
      }

      if (!db.userApis) db.userApis = {};
      if (!db.revokedUserApis) db.revokedUserApis = {};

      if (p === "/api/admin/user-apis" && method === "POST") {
        const body = await readBody(req);
        const em = String((body && body.email) || "").trim().toLowerCase();
        const apiKey = String((body && body.apiKey) || "").trim();
        const model = String((body && body.model) || "gemini-2.5-flash").trim();
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || !apiKey) {
          return sendJson(res, 400, { error: "Email ho\u1eb7c Gemini API Key kh\u00f4ng h\u1ee3p l\u1ec7." });
        }
        const now = Date.now();
        db.userApis[em] = {
          email: em,
          apiKey: apiKey,
          model: model,
          assignedBy: ADMIN_EMAIL,
          updatedAt: new Date(now).toISOString(),
          ts: now
        };
        delete db.revokedUserApis[em];
        saveDb(db);
        return sendJson(res, 200, { ok: true, entry: db.userApis[em], userApis: db.userApis });
      }

      const delApiMatch = p.match(/^\/api\/admin\/user-apis\/([^/]+)$/);
      if (delApiMatch && method === "DELETE") {
        const em = decodeURIComponent(delApiMatch[1]).trim().toLowerCase();
        delete db.userApis[em];
        db.revokedUserApis[em] = Date.now();
        saveDb(db);
        return sendJson(res, 200, { ok: true, userApis: db.userApis });
      }

      return sendJson(res, 404, { error: "API route not found" });
    }

    return sendJson(res, 404, { error: "API endpoint not found: " + p });
  } catch (e) {
    return sendJson(res, 500, { error: (e && e.message) || "Server error" });
  }
};
