/* ============================================================
   AI Tutor - Cryptographic Google ID Token & Admin Verification
   Verifies RS256 signatures against Google's JWKS endpoint.
   NEVER trusts client-supplied isAdmin flags or unsigned X-User-Email headers.
   ============================================================ */
const crypto = require("crypto");

const DEFAULT_GOOGLE_CLIENT_ID = "480927164540-o3o4h9v5vmi8h93605ridg4eqvtf5rcf.apps.googleusercontent.com";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const DEFAULT_ADMIN_EMAIL = "phamduchieurobotics@gmail.com";

let jwksCache = { keys: {}, expiresAt: 0 };
let customTestVerifier = null;

function createAuthError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code || (status === 403 ? "FORBIDDEN" : "UNAUTHORIZED");
  return err;
}

function base64UrlToBuffer(str) {
  let b64 = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  return Buffer.from(b64, "base64");
}

function normalizeGmail(email) {
  const e = String(email || "").trim().toLowerCase();
  const parts = e.split("@");
  if (parts.length === 2 && (parts[1] === "gmail.com" || parts[1] === "googlemail.com")) {
    return parts[0].replace(/\./g, "") + "@gmail.com";
  }
  return e;
}

function getAllowedAdminEmails() {
  const raw = String(process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAIL).trim();
  const set = new Set();
  raw.split(",").forEach(function (item) {
    const n = normalizeGmail(item);
    if (n) set.add(n);
  });
  return set;
}

function getAllowedAdminUids() {
  const raw = String(process.env.ADMIN_UIDS || "").trim();
  const set = new Set();
  raw.split(",").forEach(function (item) {
    const u = String(item || "").trim();
    if (u) set.add(u);
  });
  return set;
}

async function fetchGoogleJwks(forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && jwksCache.expiresAt > now && Object.keys(jwksCache.keys).length > 0) {
    return jwksCache.keys;
  }
  if (typeof fetch !== "function") {
    throw createAuthError(500, "Server runtime lacks fetch() for JWKS verification.", "SERVER_CONFIG");
  }
  const resp = await fetch(GOOGLE_JWKS_URL);
  if (!resp.ok) {
    throw createAuthError(401, "Failed to fetch Google public certificates for token verification.", "JWKS_UNAVAILABLE");
  }
  const data = await resp.json();
  const map = {};
  (Array.isArray(data && data.keys) ? data.keys : []).forEach(function (jwk) {
    if (jwk && jwk.kid) map[jwk.kid] = jwk;
  });
  let maxAgeSec = 3600;
  const cc = String(resp.headers.get("cache-control") || "");
  const m = cc.match(/max-age=(\d+)/i);
  if (m) maxAgeSec = Math.max(300, parseInt(m[1], 10));
  jwksCache = { keys: map, expiresAt: now + maxAgeSec * 1000 };
  return map;
}

async function verifyGoogleIdToken(idToken) {
  if (process.env.NODE_ENV === "test" && typeof customTestVerifier === "function") {
    return customTestVerifier(idToken);
  }
  if (!idToken || typeof idToken !== "string") {
    throw createAuthError(401, "Missing Bearer ID token.", "MISSING_TOKEN");
  }
  const parts = idToken.trim().split(".");
  if (parts.length !== 3) {
    throw createAuthError(401, "Malformed ID token.", "INVALID_TOKEN");
  }

  let header, payload;
  try {
    header = JSON.parse(base64UrlToBuffer(parts[0]).toString("utf8"));
    payload = JSON.parse(base64UrlToBuffer(parts[1]).toString("utf8"));
  } catch (e) {
    throw createAuthError(401, "Invalid ID token encoding.", "INVALID_TOKEN");
  }

  if (!header || header.alg !== "RS256" || !header.kid) {
    throw createAuthError(401, "Unsupported ID token algorithm or missing key id.", "INVALID_TOKEN");
  }

  let keys = await fetchGoogleJwks(false);
  let jwk = keys[header.kid];
  if (!jwk) {
    keys = await fetchGoogleJwks(true);
    jwk = keys[header.kid];
  }
  if (!jwk) {
    throw createAuthError(401, "Signing key not found in Google JWKS.", "UNKNOWN_KID");
  }

  let verified = false;
  try {
    const pubKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(parts[0] + "." + parts[1]);
    verifier.end();
    verified = verifier.verify(pubKey, base64UrlToBuffer(parts[2]));
  } catch (e) {
    verified = false;
  }

  if (!verified) {
    throw createAuthError(401, "Invalid ID token cryptographic signature.", "INVALID_SIGNATURE");
  }

  const iss = String(payload.iss || "");
  if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") {
    throw createAuthError(401, "Invalid ID token issuer.", "INVALID_ISSUER");
  }

  const expectedAud = String(process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
  if (String(payload.aud || "") !== expectedAud) {
    throw createAuthError(401, "ID token audience mismatch.", "INVALID_AUDIENCE");
  }

  const expMs = Number(payload.exp || 0) * 1000;
  if (!expMs || expMs <= Date.now() - 30000) {
    throw createAuthError(401, "Phiên đăng nhập Google đã hết hạn. Vui lòng đăng xuất và đăng nhập lại.", "TOKEN_EXPIRED");
  }

  if (payload.email_verified !== true || !payload.email) {
    throw createAuthError(401, "Google account email is not verified.", "EMAIL_UNVERIFIED");
  }

  return {
    uid: String(payload.sub || payload.email).trim(),
    email: String(payload.email).trim().toLowerCase(),
    name: String(payload.name || payload.email).trim(),
    picture: String(payload.picture || ""),
    claims: payload
  };
}

function extractBearerToken(req) {
  const headers = (req && req.headers) || {};
  const auth = String(headers.authorization || headers.Authorization || "").trim();
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

async function verifyUserRequest(req) {
  const token = extractBearerToken(req);
  if (!token) {
    throw createAuthError(401, "Vui lòng đăng nhập tài khoản Google hợp lệ để sử dụng AI Hệ thống.", "MISSING_TOKEN");
  }
  return verifyGoogleIdToken(token);
}

async function verifyAdminRequest(req) {
  const user = await verifyUserRequest(req);
  const adminEmails = getAllowedAdminEmails();
  const adminUids = getAllowedAdminUids();
  const normEmail = normalizeGmail(user.email);
  const isAdminClaim = !!(user.claims && user.claims.admin === true);
  if (!adminEmails.has(normEmail) && !adminUids.has(user.uid) && !isAdminClaim) {
    throw createAuthError(403, "Forbidden: Chỉ tài khoản Quản trị viên được xác thực mới có quyền truy cập.", "NOT_ADMIN");
  }
  return user;
}

function _setTestVerifier(fn) {
  if (process.env.NODE_ENV === "test") {
    customTestVerifier = fn;
  }
}

module.exports = {
  verifyGoogleIdToken: verifyGoogleIdToken,
  verifyUserRequest: verifyUserRequest,
  verifyAdminRequest: verifyAdminRequest,
  normalizeGmail: normalizeGmail,
  extractBearerToken: extractBearerToken,
  _setTestVerifier: _setTestVerifier
};
