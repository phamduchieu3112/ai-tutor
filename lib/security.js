"use strict";

const crypto = require("crypto");

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function sanitizeInput(val, depth) {
  const d = typeof depth === "number" ? depth : 0;
  if (d > 16 || val === null || val === undefined) return val;
  if (typeof val !== "object") return val;
  if (Array.isArray(val)) {
    return val.map(function (item) { return sanitizeInput(item, d + 1); });
  }
  const clean = Object.create(null);
  const keys = Object.keys(val);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (DANGEROUS_KEYS.has(k)) continue;
    if (k.charCodeAt(0) === 36) continue; // Strip $ne, $gt, $where, $regex, etc.
    clean[k] = sanitizeInput(val[k], d + 1);
  }
  return Object.assign({}, clean);
}

// Constant-time string comparison via SHA-256 digest
function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (!a || !b) return false;
  const ha = crypto.createHash("sha256").update(a, "utf8").digest();
  const hb = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(ha, hb);
}

// In-memory sliding-window rate limiter
const _rateBuckets = new Map();
const MAX_RATE_BUCKETS = 4000;

function checkSlidingWindowRateLimit(scope, identifier, maxRequests, windowMs) {
  const now = Date.now();
  const key = String(scope || "api") + ":" + String(identifier || "anon").toLowerCase();
  let timestamps = _rateBuckets.get(key) || [];
  const cutoff = now - windowMs;
  if (timestamps.length > 0) {
    timestamps = timestamps.filter(function (ts) { return ts > cutoff; });
  }
  if (timestamps.length >= maxRequests) {
    _rateBuckets.set(key, timestamps);
    const retryAfterSec = Math.max(1, Math.ceil((timestamps[0] + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, limit: maxRequests, retryAfterSec: retryAfterSec };
  }
  timestamps.push(now);
  _rateBuckets.set(key, timestamps);

  if (_rateBuckets.size > MAX_RATE_BUCKETS) {
    const iter = _rateBuckets.keys();
    for (let i = 0; i < 500; i++) {
      const next = iter.next();
      if (next.done) break;
      _rateBuckets.delete(next.value);
    }
  }
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - timestamps.length),
    limit: maxRequests,
    retryAfterSec: 0
  };
}

function getClientIp(req) {
  const xff = req && req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"]);
  if (xff) return String(xff).split(",")[0].trim();
  return (req && req.socket && req.socket.remoteAddress) || "127.0.0.1";
}

/**
 * Strict CORS & HTTP Security Headers
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://ai-tutor.phamduchieu.site",
  "https://ai-tutor-two-zeta.vercel.app"
];

function isAllowedOrigin(origin) {
  if (!origin) return true; // Same-origin or server-to-server (e.g. SePay webhook)
  const o = String(origin).trim().replace(/\/+$/, "");
  const envRaw = String(process.env.ALLOWED_ORIGINS || "").trim();
  const allowList = envRaw
    ? envRaw.split(",").map(function (s) { return s.trim().replace(/\/+$/, ""); }).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS.slice();
  if (allowList.indexOf(o) !== -1) return true;
  if (process.env.NODE_ENV !== "production") {
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o)) return true;
  }
  return false;
}

function buildApiSecurityHeaders(req) {
  const origin = req && req.headers && req.headers.origin ? String(req.headers.origin).trim() : "";
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Vary": "Origin"
  };
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-User-Email";
    headers["Access-Control-Expose-Headers"] = "X-AI-Fallback-Provider, X-AI-Fallback-Model, X-AI-RateLimit-Remaining, X-AI-RateLimit-Limit";
  }
  return headers;
}

// Upload MIME allowlist & magic-byte checks
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const FORBIDDEN_EXTENSIONS = /\.(html?|svg|jsx?|mjs|cjs|php\d*|phtml|exe|dll|bat|cmd|sh|ps1|vbs|jar|scr|msi|com)$/i;

function sanitizeFilename(name) {
  return String(name || "file")
    .replace(/[\x00-\x1f\\/:*?"<>|]/g, "_")
    .replace(/\.\.+/g, ".")
    .trim()
    .slice(0, 140) || "file";
}

function validateUploadMeta(meta) {
  const filename = sanitizeFilename(meta && meta.filename);
  const mimeType = String((meta && meta.mimeType) || "").trim().toLowerCase();
  const sizeBytes = Number((meta && meta.sizeBytes) || 0);
  const maxBytes = Number((meta && meta.maxBytes) || 20 * 1024 * 1024);

  if (FORBIDDEN_EXTENSIONS.test(filename)) {
    return { ok: false, error: "Định dạng tệp bị chặn vì lý do bảo mật." };
  }
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: "Loại tệp (MIME) không được phép tải lên." };
  }
  if (sizeBytes < 0 || sizeBytes > maxBytes) {
    return { ok: false, error: "Kích thước tệp vượt quá giới hạn cho phép." };
  }
  return { ok: true, filename: filename };
}

function validateReceiptDataUrl(dataUrl) {
  if (!dataUrl) return { ok: true, value: "" };
  const s = String(dataUrl).trim();
  if (s.length > 600000) return { ok: false, error: "Ảnh biên lai quá lớn." };
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) {
    return { ok: false, error: "Ảnh biên lai phải là PNG, JPEG hoặc WebP hợp lệ." };
  }
  const b64 = s.slice(s.indexOf(",") + 1, s.indexOf(",") + 24);
  const head = Buffer.from(b64, "base64");
  const isPng = head.length >= 4 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
  const isJpg = head.length >= 3 && head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
  const isWebp = head.length >= 12 && head.slice(0, 4).toString("ascii") === "RIFF" && head.slice(8, 12).toString("ascii") === "WEBP";
  if (!isPng && !isJpg && !isWebp) {
    return { ok: false, error: "Nội dung ảnh biên lai không khớp chữ ký tệp ảnh (magic bytes)." };
  }
  return { ok: true, value: s };
}

module.exports = {
  sanitizeInput,
  timingSafeEqualStr,
  checkSlidingWindowRateLimit,
  getClientIp,
  isAllowedOrigin,
  buildApiSecurityHeaders,
  sanitizeFilename,
  validateUploadMeta,
  validateReceiptDataUrl
};
