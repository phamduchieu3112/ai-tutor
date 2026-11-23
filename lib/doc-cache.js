/* ============================================================
   AI Tutor - Document Content Cache Adapter (SHA-256)
   Key: doc_parsed:<fileHash> | TTL: 24 hours (86400s)
   Storage Priority:
     1) Upstash Redis / Vercel KV REST (UPSTASH_REDIS_REST_URL / KV_REST_API_URL)
     2) Graceful In-Memory LRU Cache fallback (max 120 entries, 24h TTL)
   ============================================================ */
const DOC_CACHE_TTL_SEC = 24 * 60 * 60; // 24 hours
const DOC_CACHE_TTL_MS = DOC_CACHE_TTL_SEC * 1000;
const LRU_MAX_ENTRIES = 120;

const lruMap = new Map();

function normalizeSha256(hash) {
  const h = String(hash || "").trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(h) ? h : "";
}

function getRedisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim().replace(/\/+$/, "");
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  return url && token ? { url: url, token: token } : null;
}

function getCacheDriver() {
  return getRedisConfig() ? "upstash_redis" : "memory_lru";
}

function lruGet(key) {
  const entry = lruMap.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    lruMap.delete(key);
    return null;
  }
  // Refresh LRU recency
  lruMap.delete(key);
  lruMap.set(key, entry);
  return entry.value;
}

function lruSet(key, value) {
  if (lruMap.has(key)) lruMap.delete(key);
  lruMap.set(key, { value: value, expiresAt: Date.now() + DOC_CACHE_TTL_MS });
  while (lruMap.size > LRU_MAX_ENTRIES) {
    const oldestKey = lruMap.keys().next().value;
    lruMap.delete(oldestKey);
  }
}

async function redisExec(args) {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  const resp = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + cfg.token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(args)
  });
  if (!resp.ok) throw new Error("Redis HTTP " + resp.status);
  const data = await resp.json();
  if (data && data.error) throw new Error("Redis error: " + data.error);
  return data ? data.result : null;
}

async function getCachedDoc(fileHash) {
  const h = normalizeSha256(fileHash);
  if (!h) return null;
  const key = "doc_parsed:" + h;
  if (getRedisConfig()) {
    try {
      const raw = await redisExec(["GET", key]);
      if (raw) {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        lruSet(key, parsed);
        return parsed;
      }
      return null;
    } catch (e) {
      // Fall back to in-memory LRU if Redis is transiently unreachable
    }
  }
  return lruGet(key);
}

async function setCachedDoc(fileHash, docData) {
  const h = normalizeSha256(fileHash);
  if (!h) return null;
  const key = "doc_parsed:" + h;
  const record = {
    docId: "doc_" + h.slice(0, 16),
    fileHash: h,
    fileName: String((docData && docData.fileName) || ""),
    mimeType: String((docData && docData.mimeType) || ""),
    parsedText: String((docData && docData.parsedText) || ""),
    parsedQuestions: Array.isArray(docData && docData.parsedQuestions) ? docData.parsedQuestions : null,
    cachedAt: new Date().toISOString(),
    ttlSeconds: DOC_CACHE_TTL_SEC
  };
  lruSet(key, record);
  if (getRedisConfig()) {
    try {
      await redisExec(["SET", key, JSON.stringify(record), "EX", String(DOC_CACHE_TTL_SEC)]);
    } catch (e) {
      // Keep LRU copy even if Redis write fails
    }
  }
  return record;
}

module.exports = {
  DOC_CACHE_TTL_SEC: DOC_CACHE_TTL_SEC,
  normalizeSha256: normalizeSha256,
  getCacheDriver: getCacheDriver,
  getCachedDoc: getCachedDoc,
  setCachedDoc: setCachedDoc
};
