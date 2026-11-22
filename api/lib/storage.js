/* ============================================================
   AI Tutor - Persistent Key Pool, Health State, Audit Log & Rate Limit Store
   Supports:
     1) Upstash Redis / Vercel KV REST (KV_REST_API_URL + KV_REST_API_TOKEN)
     2) Supabase Service Role REST (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
     3) Local File Store fallback (for local dev / tests)
   Cooldowns, statuses, and rate limits ALWAYS persist across invocations.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const os = require("os");

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const LOCAL_STORE_PATH = IS_SERVERLESS
  ? path.join(os.tmpdir(), "ai-tutor-system-keys.json")
  : path.join(__dirname, "..", "..", "data", "system-keys-store.json");

const KV_POOL_KEY = "aitutor:syskeys:pool:v1";
const KV_ENV_STATE_KEY = "aitutor:syskeys:env_state:v1";
const KV_AUDIT_KEY = "aitutor:syskeys:audit:v1";

function getKvConfig() {
  const url = String(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/+$/, "");
  const token = String(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  return url && token ? { url: url, token: token } : null;
}

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return url && key ? { url: url, key: key } : null;
}

function getDriverInfo() {
  if (getKvConfig()) {
    return { driver: "kv", label: "Vercel KV / Upstash Redis", persistentAcrossDeploys: true };
  }
  if (getSupabaseConfig()) {
    return { driver: "supabase", label: "Supabase (Service Role + RLS)", persistentAcrossDeploys: true };
  }
  return {
    driver: "file",
    label: IS_SERVERLESS ? "Ephemeral /tmp JSON (Warning: configure KV or Supabase for multi-instance persistence)" : "Local JSON File (data/system-keys-store.json)",
    persistentAcrossDeploys: !IS_SERVERLESS
  };
}

/* ---------- Redis / Vercel KV Helpers ---------- */
async function kvExec(args) {
  const cfg = getKvConfig();
  if (!cfg) throw new Error("KV not configured");
  const resp = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + cfg.token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(args)
  });
  if (!resp.ok) {
    throw new Error("KV request failed with HTTP " + resp.status);
  }
  const data = await resp.json();
  if (data && data.error) throw new Error("KV error: " + data.error);
  return data ? data.result : null;
}

async function kvGetJson(key, fallback) {
  const raw = await kvExec(["GET", key]);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

async function kvSetJson(key, val) {
  await kvExec(["SET", key, JSON.stringify(val)]);
}

/* ---------- Supabase Service Role Helpers ---------- */
async function sbFetch(relPath, opts) {
  const cfg = getSupabaseConfig();
  if (!cfg) throw new Error("Supabase not configured");
  const o = opts || {};
  const headers = Object.assign({
    "apikey": cfg.key,
    "Authorization": "Bearer " + cfg.key,
    "Content-Type": "application/json"
  }, o.headers || {});
  const resp = await fetch(cfg.url + "/rest/v1" + relPath, {
    method: o.method || "GET",
    headers: headers,
    body: o.body
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(function () { return ""; });
    throw new Error("Supabase HTTP " + resp.status + ": " + txt.slice(0, 180));
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

/* ---------- Local File Store Helpers ---------- */
function readFileStore() {
  const def = { keys: [], envState: {}, auditLogs: [], rateLimits: {}, adminActions: {} };
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, "utf8"));
      return Object.assign(def, parsed);
    }
  } catch (e) { /* fallback */ }
  if (global.__AI_TUTOR_SYSKEY_STORE__ && typeof global.__AI_TUTOR_SYSKEY_STORE__ === "object") {
    return Object.assign(def, global.__AI_TUTOR_SYSKEY_STORE__);
  }
  return def;
}

function writeFileStore(store) {
  global.__AI_TUTOR_SYSKEY_STORE__ = store;
  try {
    fs.mkdirSync(path.dirname(LOCAL_STORE_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (e) { /* ignore if read-only */ }
}

/* ---------- Public Store API ---------- */
function mapRowToKeyObj(row) {
  return {
    id: row.id,
    accountLabel: row.account_label,
    provider: row.provider,
    maskedKey: row.masked_key,
    keyHash: row.key_hash,
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.auth_tag,
    keyVersion: row.key_version || "v1",
    enabled: row.enabled !== false,
    status: row.status || "healthy",
    cooldownUntil: Number(row.cooldown_until) || 0,
    usageCount: Number(row.usage_count) || 0,
    errorCount: Number(row.error_count) || 0,
    lastError: row.last_error || "",
    lastTestedAt: row.last_tested_at || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

function mapKeyObjToRow(k) {
  return {
    id: k.id,
    account_label: k.accountLabel,
    provider: k.provider,
    masked_key: k.maskedKey,
    key_hash: k.keyHash,
    ciphertext: k.ciphertext,
    iv: k.iv,
    auth_tag: k.authTag,
    key_version: k.keyVersion || "v1",
    enabled: k.enabled !== false,
    status: k.status || "healthy",
    cooldown_until: Number(k.cooldownUntil) || 0,
    usage_count: Number(k.usageCount) || 0,
    error_count: Number(k.errorCount) || 0,
    last_error: String(k.lastError || "").slice(0, 300),
    last_tested_at: k.lastTestedAt || null,
    created_at: k.createdAt || new Date().toISOString(),
    updated_at: k.updatedAt || new Date().toISOString()
  };
}

async function listStoredKeys() {
  const info = getDriverInfo();
  if (info.driver === "kv") {
    const arr = await kvGetJson(KV_POOL_KEY, []);
    return Array.isArray(arr) ? arr : [];
  }
  if (info.driver === "supabase") {
    const rows = await sbFetch("/system_ai_keys?select=*&order=created_at.asc");
    return (Array.isArray(rows) ? rows : []).map(mapRowToKeyObj);
  }
  return readFileStore().keys || [];
}

async function saveStoredKeys(keys) {
  const clean = Array.isArray(keys) ? keys : [];
  const info = getDriverInfo();
  if (info.driver === "kv") {
    await kvSetJson(KV_POOL_KEY, clean);
    return;
  }
  if (info.driver === "supabase") {
    const existing = await sbFetch("/system_ai_keys?select=id");
    const keepIds = new Set(clean.map(function (k) { return k.id; }));
    const toDelete = (Array.isArray(existing) ? existing : []).filter(function (r) { return !keepIds.has(r.id); });
    for (let i = 0; i < toDelete.length; i++) {
      await sbFetch("/system_ai_keys?id=eq." + encodeURIComponent(toDelete[i].id), { method: "DELETE" });
    }
    if (clean.length > 0) {
      await sbFetch("/system_ai_keys?on_conflict=id", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(clean.map(mapKeyObjToRow))
      });
    }
    return;
  }
  const st = readFileStore();
  st.keys = clean;
  writeFileStore(st);
}

async function getEnvKeyStates() {
  const info = getDriverInfo();
  if (info.driver === "kv") {
    const obj = await kvGetJson(KV_ENV_STATE_KEY, {});
    return obj && typeof obj === "object" ? obj : {};
  }
  const st = readFileStore();
  return st.envState && typeof st.envState === "object" ? st.envState : {};
}

async function saveEnvKeyStates(envState) {
  const clean = envState && typeof envState === "object" ? envState : {};
  const info = getDriverInfo();
  if (info.driver === "kv") {
    await kvSetJson(KV_ENV_STATE_KEY, clean);
    return;
  }
  const st = readFileStore();
  st.envState = clean;
  writeFileStore(st);
}

async function appendAuditLog(entry) {
  const item = {
    id: "aud_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    adminEmail: String((entry && entry.adminEmail) || "admin"),
    action: String((entry && entry.action) || "update"),
    detail: String((entry && entry.detail) || ""),
    createdAt: new Date().toISOString()
  };
  const info = getDriverInfo();
  if (info.driver === "kv") {
    const cur = await kvGetJson(KV_AUDIT_KEY, []);
    const next = [item].concat(Array.isArray(cur) ? cur : []).slice(0, 150);
    await kvSetJson(KV_AUDIT_KEY, next);
    return item;
  }
  if (info.driver === "supabase") {
    await sbFetch("/system_ai_audit_logs", {
      method: "POST",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify({
        id: item.id,
        admin_email: item.adminEmail,
        action: item.action,
        detail: item.detail,
        created_at: item.createdAt
      })
    });
    return item;
  }
  const st = readFileStore();
  st.auditLogs = [item].concat(Array.isArray(st.auditLogs) ? st.auditLogs : []).slice(0, 150);
  writeFileStore(st);
  return item;
}

async function listAuditLogs(limit) {
  const cap = Math.max(1, Math.min(200, Number(limit) || 50));
  const info = getDriverInfo();
  if (info.driver === "kv") {
    const cur = await kvGetJson(KV_AUDIT_KEY, []);
    return (Array.isArray(cur) ? cur : []).slice(0, cap);
  }
  if (info.driver === "supabase") {
    const rows = await sbFetch("/system_ai_audit_logs?select=*&order=created_at.desc&limit=" + cap);
    return (Array.isArray(rows) ? rows : []).map(function (r) {
      return {
        id: r.id,
        adminEmail: r.admin_email,
        action: r.action,
        detail: r.detail,
        createdAt: r.created_at
      };
    });
  }
  return (readFileStore().auditLogs || []).slice(0, cap);
}

async function consumeRateLimit(bucketKey, limit, windowSec) {
  const max = Math.max(1, Number(limit) || 20);
  const winSec = Math.max(10, Number(windowSec) || 3600);
  const now = Date.now();
  const info = getDriverInfo();

  if (info.driver === "kv") {
    const count = Number(await kvExec(["INCR", bucketKey]));
    const ttl = Number(await kvExec(["TTL", bucketKey]));
    if (count === 1 || ttl < 0) {
      await kvExec(["EXPIRE", bucketKey, String(winSec)]);
    }
    return {
      allowed: count <= max,
      count: count,
      limit: max,
      remaining: Math.max(0, max - count),
      resetAt: now + (ttl > 0 ? ttl : winSec) * 1000
    };
  }

  if (info.driver === "supabase") {
    const existing = await sbFetch("/ai_proxy_rate_limits?bucket_key=eq." + encodeURIComponent(bucketKey));
    const cur = Array.isArray(existing) && existing[0] ? existing[0] : null;
    let count = 1;
    let expiresAt = now + winSec * 1000;
    if (cur && Number(cur.expires_at) > now) {
      count = (Number(cur.count) || 0) + 1;
      expiresAt = Number(cur.expires_at);
    }
    await sbFetch("/ai_proxy_rate_limits?on_conflict=bucket_key", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ bucket_key: bucketKey, count: count, expires_at: expiresAt })
    });
    return {
      allowed: count <= max,
      count: count,
      limit: max,
      remaining: Math.max(0, max - count),
      resetAt: expiresAt
    };
  }

  const st = readFileStore();
  if (!st.rateLimits || typeof st.rateLimits !== "object") st.rateLimits = {};
  // Prune expired buckets
  Object.keys(st.rateLimits).forEach(function (k) {
    if (!st.rateLimits[k] || Number(st.rateLimits[k].expiresAt) <= now) delete st.rateLimits[k];
  });
  const entry = st.rateLimits[bucketKey] || { count: 0, expiresAt: now + winSec * 1000 };
  entry.count += 1;
  st.rateLimits[bucketKey] = entry;
  writeFileStore(st);
  return {
    allowed: entry.count <= max,
    count: entry.count,
    limit: max,
    remaining: Math.max(0, max - entry.count),
    resetAt: entry.expiresAt
  };
}

async function checkAdminActionCooldown(actionKey, cooldownSec) {
  const bucketKey = "aitutor:admin_cd:" + actionKey;
  const info = getDriverInfo();
  const now = Date.now();
  const waitMs = Math.max(5, Number(cooldownSec) || 30) * 1000;

  if (info.driver === "kv") {
    const prev = await kvExec(["GET", bucketKey]);
    if (prev) return { allowed: false, retryAfterSec: Math.ceil((Number(prev) - now) / 1000) || cooldownSec };
    await kvExec(["SET", bucketKey, String(now + waitMs), "EX", String(cooldownSec)]);
    return { allowed: true, retryAfterSec: 0 };
  }

  const st = readFileStore();
  if (!st.adminActions || typeof st.adminActions !== "object") st.adminActions = {};
  const exp = Number(st.adminActions[bucketKey]) || 0;
  if (exp > now) {
    return { allowed: false, retryAfterSec: Math.ceil((exp - now) / 1000) };
  }
  st.adminActions[bucketKey] = now + waitMs;
  writeFileStore(st);
  return { allowed: true, retryAfterSec: 0 };
}

module.exports = {
  getDriverInfo: getDriverInfo,
  listStoredKeys: listStoredKeys,
  saveStoredKeys: saveStoredKeys,
  getEnvKeyStates: getEnvKeyStates,
  saveEnvKeyStates: saveEnvKeyStates,
  appendAuditLog: appendAuditLog,
  listAuditLogs: listAuditLogs,
  consumeRateLimit: consumeRateLimit,
  checkAdminActionCooldown: checkAdminActionCooldown
};
