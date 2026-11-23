/* ============================================================
   AI Tutor - Server-Side AES-256-GCM Encryption, HMAC & Redaction
   ZERO-EXPOSURE ARCHITECTURE: Server-only module. Never import in client code.
   ============================================================ */
const crypto = require("crypto");

function loadPreviousSecretsMap() {
  const map = {};
  const raw = String(process.env.ENCRYPTION_SECRET_PREVIOUS || "").trim();
  if (!raw) return map;
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        Object.keys(parsed).forEach(function (ver) {
          if (parsed[ver] && String(parsed[ver]).length >= 16) {
            map[ver] = String(parsed[ver]);
          }
        });
      }
      return map;
    } catch (e) { /* fall through */ }
  }
  raw.split(",").forEach(function (part) {
    const idx = part.indexOf(":");
    if (idx > 0) {
      const ver = part.slice(0, idx).trim();
      const sec = part.slice(idx + 1).trim();
      if (ver && sec.length >= 16) map[ver] = sec;
    }
  });
  return map;
}

function getCurrentSecret() {
  return String(process.env.ENCRYPTION_SECRET || "").trim();
}

function getCurrentKeyVersion() {
  return String(process.env.ENCRYPTION_KEY_VERSION || "v1").trim() || "v1";
}

function isEncryptionConfigured() {
  return getCurrentSecret().length >= 16;
}

const HKDF_SALT = Buffer.from("ai-tutor:zero-exposure:kdf-salt:v1", "utf8");

function deriveAesKey(secret) {
  return Buffer.from(crypto.hkdfSync("sha256", Buffer.from(secret, "utf8"), HKDF_SALT, Buffer.from("aes-256-gcm", "utf8"), 32));
}

function deriveLegacySha256AesKey(secret) {
  return crypto.createHash("sha256").update("ai-tutor:aes-256-gcm:" + secret, "utf8").digest();
}

function deriveHmacKey(secret) {
  return Buffer.from(crypto.hkdfSync("sha256", Buffer.from(secret, "utf8"), HKDF_SALT, Buffer.from("hmac-sha256-dedup", "utf8"), 32));
}

function resolveSecretForVersion(keyVersion) {
  const curVer = getCurrentKeyVersion();
  const curSec = getCurrentSecret();
  if ((!keyVersion || keyVersion === curVer) && curSec.length >= 16) {
    return curSec;
  }
  const prevMap = loadPreviousSecretsMap();
  if (keyVersion && prevMap[keyVersion]) {
    return prevMap[keyVersion];
  }
  if (curSec.length >= 16) {
    return curSec;
  }
  return "";
}

function encryptSecret(plaintext) {
  const secret = getCurrentSecret();
  if (secret.length < 16) {
    throw new Error("ENCRYPTION_SECRET is not configured (minimum 16 characters required on server).");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveAesKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext || ""), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion: getCurrentKeyVersion(),
    kdf: "hkdf-sha256"
  };
}

function decryptWithKeyBuffer(record, keyBuf) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyBuf,
    Buffer.from(record.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

function decryptSecret(record) {
  if (!record || !record.ciphertext || !record.iv || !record.authTag) {
    throw new Error("Encrypted key record is incomplete.");
  }
  const secret = resolveSecretForVersion(record.keyVersion);
  if (!secret || secret.length < 16) {
    throw new Error("ENCRYPTION_SECRET for keyVersion '" + String(record.keyVersion || "unknown") + "' is not configured.");
  }
  try {
    return decryptWithKeyBuffer(record, deriveAesKey(secret));
  } catch (hkdfErr) {
    // Allow seamless decryption of pre-HKDF records only if kdf is not explicitly hkdf-sha256
    if (record.kdf !== "hkdf-sha256") {
      return decryptWithKeyBuffer(record, deriveLegacySha256AesKey(secret));
    }
    throw hkdfErr;
  }
}

function hmacKeyHash(provider, rawKey) {
  const secret = getCurrentSecret();
  if (secret.length < 16) {
    throw new Error("ENCRYPTION_SECRET is required to compute HMAC hash.");
  }
  const normalized = String(provider || "").trim().toLowerCase() + ":" + String(rawKey || "").trim();
  return crypto.createHmac("sha256", deriveHmacKey(secret)).update(normalized, "utf8").digest("hex");
}

function maskApiKey(rawKey) {
  const s = String(rawKey || "").trim();
  if (!s) return "";
  if (s.length <= 10) {
    return s.slice(0, 3) + "\u2022\u2022\u2022\u2022" + s.slice(-2);
  }
  const prefixLen = s.startsWith("sk-or-") ? 7 : (s.startsWith("sk-proj-") ? 8 : 6);
  return s.slice(0, prefixLen) + "\u2022\u2022\u2022\u2022\u2022\u2022" + s.slice(-4);
}

function sanitizeErrorMessage(message, secretsToScrub) {
  let out = String(message || "Unknown error");
  if (Array.isArray(secretsToScrub)) {
    secretsToScrub.forEach(function (sec) {
      const s = String(sec || "").trim();
      if (s.length >= 6) {
        out = out.split(s).join("[REDACTED]");
      }
    });
  }
  out = out
    .replace(/([?&]key=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1[REDACTED]")
    .replace(/\bAIza[0-9A-Za-z_-]{16,}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/\bAQ\.[0-9A-Za-z._-]{16,}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/\bgsk_[0-9A-Za-z_-]{16,}/g, "[REDACTED_GROQ_KEY]")
    .replace(/\bsk-or-[0-9A-Za-z_-]{16,}/g, "[REDACTED_OPENROUTER_KEY]")
    .replace(/\bsk-(?:proj-)?[0-9A-Za-z_-]{16,}/g, "[REDACTED_API_KEY]");
  return out;
}

module.exports = {
  isEncryptionConfigured: isEncryptionConfigured,
  getCurrentKeyVersion: getCurrentKeyVersion,
  encryptSecret: encryptSecret,
  decryptSecret: decryptSecret,
  hmacKeyHash: hmacKeyHash,
  maskApiKey: maskApiKey,
  sanitizeErrorMessage: sanitizeErrorMessage
};
