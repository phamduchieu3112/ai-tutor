/* ============================================================
   AI Tutor - Shared HTTP, Bounded Body & CORS Security Utilities
   ============================================================ */

const EXPOSE_HEADERS = "X-AI-Fallback-Provider, X-AI-Fallback-Model, X-AI-RateLimit-Remaining, X-AI-RateLimit-Limit";

function getAllowedOrigins() {
  const raw = String(
    process.env.ALLOWED_ORIGINS ||
    "https://ai-tutor.phamduchieu.site,https://ai-tutor-two-zeta.vercel.app,http://localhost:5000,http://127.0.0.1:5000"
  );
  const set = new Set();
  raw.split(",").forEach(function (item) {
    const clean = String(item || "").trim().replace(/\/+$/, "").toLowerCase();
    if (clean) set.add(clean);
  });
  return set;
}

function isOriginAllowed(req) {
  const origin = String((req && req.headers && req.headers.origin) || "").trim().replace(/\/+$/, "").toLowerCase();
  if (!origin) return { allowed: true, allowOriginHeader: "" };

  const allowed = getAllowedOrigins();
  if (allowed.has("*") || allowed.has(origin)) {
    return { allowed: true, allowOriginHeader: req.headers.origin };
  }

  // Allow same-host deployment previews automatically (e.g. Vercel preview matching Host header)
  const host = String((req && req.headers && req.headers.host) || "").trim().toLowerCase();
  try {
    const parsed = new URL(origin);
    if (host && parsed.host.toLowerCase() === host) {
      return { allowed: true, allowOriginHeader: req.headers.origin };
    }
    if (parsed.hostname.endsWith(".vercel.app") && parsed.hostname.indexOf("ai-tutor") !== -1) {
      return { allowed: true, allowOriginHeader: req.headers.origin };
    }
  } catch (e) { /* invalid origin */ }

  return { allowed: false, allowOriginHeader: "" };
}

function buildCorsHeaders(corsCheck) {
  const h = {
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Email",
    "Access-Control-Expose-Headers": EXPOSE_HEADERS,
    "Vary": "Origin"
  };
  if (corsCheck && corsCheck.allowOriginHeader) {
    h["Access-Control-Allow-Origin"] = corsCheck.allowOriginHeader;
  }
  return h;
}

function sendJsonWithCors(res, status, obj, corsCheck) {
  const headers = Object.assign({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  }, buildCorsHeaders(corsCheck));
  res.writeHead(status, headers);
  res.end(JSON.stringify(obj));
}

function readBoundedJsonBody(req, maxBytes) {
  const limit = maxBytes || 4 * 1024 * 1024;
  if (req && req.body !== undefined) {
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      const approxLen = Buffer.byteLength(JSON.stringify(req.body), "utf8");
      if (approxLen > limit) {
        const err = new Error("Payload too large");
        err.status = 413;
        return Promise.reject(err);
      }
      return Promise.resolve(req.body);
    }
    const str = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");
    if (Buffer.byteLength(str, "utf8") > limit) {
      const err = new Error("Payload too large");
      err.status = 413;
      return Promise.reject(err);
    }
    try {
      return Promise.resolve(str ? JSON.parse(str) : {});
    } catch (e) {
      const err = new Error("Invalid JSON body");
      err.status = 400;
      return Promise.reject(err);
    }
  }

  return new Promise(function (resolve, reject) {
    const chunks = [];
    let total = 0;
    let aborted = false;
    req.on("data", function (chunk) {
      if (aborted) return;
      total += chunk.length;
      if (total > limit) {
        aborted = true;
        try { req.pause(); } catch (e) { /* */ }
        const err = new Error("Dung l\u01b0\u1ee3ng t\u1ec7p g\u1eedi l\u00ean AI qu\u00e1 l\u1edbn (t\u1ed1i \u0111a " + Math.round(limit / (1024 * 1024)) + " MB). H\u00e3y n\u00e9n \u1ea3nh ho\u1eb7c gi\u1ea3m s\u1ed1 l\u01b0\u1ee3ng \u1ea3nh m\u1ed7i l\u1ea7n.");
        err.status = 413;
        reject(err);
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", function () {
      if (aborted) return;
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        const err = new Error("Invalid JSON body");
        err.status = 400;
        reject(err);
      }
    });
    req.on("error", function (err) {
      if (!aborted) reject(err);
    });
  });
}

function getClientIp(req) {
  const headers = (req && req.headers) || {};
  // Prefer platform-set proxy headers (cannot be spoofed by end-user clients on Vercel/Cloudflare)
  const vercelIp = String(headers["x-vercel-forwarded-for"] || "").split(",")[0].trim();
  if (vercelIp) return vercelIp;
  const cfIp = String(headers["cf-connecting-ip"] || "").trim();
  if (cfIp) return cfIp;
  const realIp = String(headers["x-real-ip"] || "").trim();
  if (realIp) return realIp;
  const sock = (req && req.socket && req.socket.remoteAddress) || "";
  if (sock) return sock;
  // Last resort only: take the rightmost entry of x-forwarded-for (appended by edge proxy)
  const xffParts = String(headers["x-forwarded-for"] || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  return xffParts.length ? xffParts[xffParts.length - 1] : "unknown";
}

module.exports = {
  isOriginAllowed: isOriginAllowed,
  buildCorsHeaders: buildCorsHeaders,
  sendJsonWithCors: sendJsonWithCors,
  readBoundedJsonBody: readBoundedJsonBody,
  getClientIp: getClientIp
};
