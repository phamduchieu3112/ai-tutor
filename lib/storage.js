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
  : path.join(__dirname, "..", "data", "system-keys-store.json");

const KV_POOL_KEY = "aitutor:syskeys:pool:v1";
const KV_ENV_STATE_KEY = "aitutor:syskeys:env_state:v1";
const KV_AUDIT_KEY = "aitutor:syskeys:audit:v1";
const KV_APP_DB_KEY = "aitutor:app_db:v1";
const KV_NOTIFIED_PREFIX = "aitutor:notified:";
const KV_SHARE_PREFIX = "aitutor:share:";
const KV_CLOUD_PREFIX = "aitutor:cloud_user:";
const KV_VOCAB_PREFIX = "aitutor:vocab_user:";

const LOCAL_APP_DB_PATH = IS_SERVERLESS
  ? path.join(os.tmpdir(), "ai-tutor-db.json")
  : path.join(__dirname, "..", "data", "db.json");

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

async function clearAllStoredKeys() {
  const existing = await listStoredKeys();
  const count = existing.length;
  await saveStoredKeys([]);
  return count;
}

async function getEnvKeyStates() {
  const info = getDriverInfo();
  if (info.driver === "kv") {
    const obj = await kvGetJson(KV_ENV_STATE_KEY, {});
    return obj && typeof obj === "object" ? obj : {};
  }
  if (info.driver === "supabase") {
    try {
      const rows = await sbFetch("/system_ai_env_state?select=*");
      const out = {};
      (Array.isArray(rows) ? rows : []).forEach(function (r) {
        if (r && r.id && r.id.indexOf("__") !== 0 && r.state_json) out[r.id] = r.state_json;
      });
      return out;
    } catch (e) {
      return {};
    }
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
  if (info.driver === "supabase") {
    const rows = Object.keys(clean).map(function (id) {
      return { id: id, state_json: clean[id], updated_at: new Date().toISOString() };
    });
    if (rows.length > 0) {
      await sbFetch("/system_ai_env_state?on_conflict=id", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows)
      });
    }
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

  if (info.driver === "supabase") {
    const existing = await sbFetch("/ai_proxy_rate_limits?bucket_key=eq." + encodeURIComponent(bucketKey));
    const cur = Array.isArray(existing) && existing[0] ? existing[0] : null;
    if (cur && Number(cur.expires_at) > now) {
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((Number(cur.expires_at) - now) / 1000)) };
    }
    await sbFetch("/ai_proxy_rate_limits?on_conflict=bucket_key", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ bucket_key: bucketKey, count: 1, expires_at: now + waitMs })
    });
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

/* ---------- Persistent App DB, Shares, Cloud Sync & Atomic Notification Dedup ---------- */
function readLocalAppDbFile() {
  try {
    if (fs.existsSync(LOCAL_APP_DB_PATH)) {
      const raw = JSON.parse(fs.readFileSync(LOCAL_APP_DB_PATH, "utf8"));
      if (raw && typeof raw === "object") {
        global.__AI_TUTOR_DB__ = raw;
        return raw;
      }
    }
  } catch (e) { /* fallback */ }
  if (global.__AI_TUTOR_DB__ && typeof global.__AI_TUTOR_DB__ === "object") {
    return global.__AI_TUTOR_DB__;
  }
  return null;
}

function writeLocalAppDbFile(dbObj) {
  global.__AI_TUTOR_DB__ = dbObj;
  try {
    fs.mkdirSync(path.dirname(LOCAL_APP_DB_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_APP_DB_PATH, JSON.stringify(dbObj, null, 2), "utf8");
  } catch (e) { /* ignore if read-only */ }
}

async function loadAppDb() {
  const info = getDriverInfo();
  if (info.driver === "kv") {
    try {
      const remote = await kvGetJson(KV_APP_DB_KEY, null);
      if (remote && typeof remote === "object") {
        global.__AI_TUTOR_DB__ = remote;
        return remote;
      }
    } catch (e) { /* fallback */ }
  } else if (info.driver === "supabase") {
    try {
      const rows = await sbFetch("/system_ai_env_state?id=eq.__app_db__&select=state_json");
      if (Array.isArray(rows) && rows[0] && rows[0].state_json && typeof rows[0].state_json === "object") {
        global.__AI_TUTOR_DB__ = rows[0].state_json;
        return rows[0].state_json;
      }
    } catch (e) { /* fallback */ }
  }
  return readLocalAppDbFile();
}

async function saveAppDb(dbObj) {
  if (!dbObj || typeof dbObj !== "object") return;
  writeLocalAppDbFile(dbObj);
  const info = getDriverInfo();
  if (info.driver === "kv" || info.driver === "supabase") {
    // Store compact core DB remotely (shares & cloudUsers are persisted per key so app_db stays fast)
    const compact = Object.assign({}, dbObj);
    delete compact.shares;
    delete compact.cloudUsers;
    if (info.driver === "kv") {
      try {
        await kvSetJson(KV_APP_DB_KEY, compact);
      } catch (e) { /* keep local cache */ }
    } else if (info.driver === "supabase") {
      try {
        await sbFetch("/system_ai_env_state?on_conflict=id", {
          method: "POST",
          headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ id: "__app_db__", state_json: compact, updated_at: new Date().toISOString() })
        });
      } catch (e) { /* keep local cache */ }
    }
  }
}

async function claimNotificationOnce(eventKey) {
  const cleanKey = String(eventKey || "").trim().toLowerCase().slice(0, 180);
  if (!cleanKey) return false;
  const nowIso = new Date().toISOString();
  const info = getDriverInfo();

  if (info.driver === "kv") {
    try {
      const res = await kvExec(["SET", KV_NOTIFIED_PREFIX + cleanKey, nowIso, "NX"]);
      return res === "OK";
    } catch (e) { /* fall through to local */ }
  } else if (info.driver === "supabase") {
    const cfg = getSupabaseConfig();
    if (cfg) {
      try {
        const resp = await fetch(cfg.url + "/rest/v1/system_ai_env_state", {
          method: "POST",
          headers: {
            "apikey": cfg.key,
            "Authorization": "Bearer " + cfg.key,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            id: "__notified__:" + cleanKey,
            state_json: { claimedAt: nowIso },
            updated_at: nowIso
          })
        });
        if (resp.ok) return true;
        if (resp.status === 409) return false;
      } catch (e) { /* fall through to local */ }
    }
  }

  // Local file / memory fallback
  if (!global.__AI_TUTOR_NOTIFIED__) global.__AI_TUTOR_NOTIFIED__ = {};
  const dbLocal = readLocalAppDbFile() || {};
  if (!dbLocal.notifiedEvents || typeof dbLocal.notifiedEvents !== "object") dbLocal.notifiedEvents = {};
  if (global.__AI_TUTOR_NOTIFIED__[cleanKey] || dbLocal.notifiedEvents[cleanKey]) {
    return false;
  }
  global.__AI_TUTOR_NOTIFIED__[cleanKey] = nowIso;
  dbLocal.notifiedEvents[cleanKey] = nowIso;
  writeLocalAppDbFile(dbLocal);
  return true;
}

async function getShareByCode(code) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return null;
  const info = getDriverInfo();
  if (info.driver === "kv") {
    try {
      const v = await kvGetJson(KV_SHARE_PREFIX + clean, null);
      if (v) return v;
    } catch (e) { /* fallback */ }
  } else if (info.driver === "supabase") {
    try {
      const rows = await sbFetch("/creator_quizzes?share_code=eq." + encodeURIComponent(clean) + "&select=*");
      if (Array.isArray(rows) && rows[0]) {
        const r = rows[0];
        const extra = (r.extra_fields && typeof r.extra_fields === "object") ? r.extra_fields : {};
        return {
          code: r.share_code || clean,
          isPublic: r.is_public !== false,
          createdBy: r.owner_email || "guest",
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || r.created_at || new Date().toISOString(),
          deck: Object.assign({}, extra, {
            id: r.id,
            title: r.title,
            tag: r.tag || "T\u1ed5ng h\u1ee3p",
            isPublic: r.is_public !== false,
            shareCode: r.share_code || clean,
            questions: Array.isArray(r.questions) ? r.questions : []
          })
        };
      }
    } catch (e) { /* table may not be migrated yet; fall through */ }
    try {
      const rows = await sbFetch("/system_ai_env_state?id=eq." + encodeURIComponent("__share__:" + clean) + "&select=state_json");
      if (Array.isArray(rows) && rows[0] && rows[0].state_json) return rows[0].state_json;
    } catch (e) { /* fallback */ }
  }
  const local = readLocalAppDbFile();
  return (local && local.shares && local.shares[clean]) || null;
}

async function saveShareByCode(code, entry) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean || !entry) throw new Error("Invalid share payload");
  const nowIso = new Date().toISOString();
  const normalized = Object.assign({}, entry, {
    code: clean,
    isPublic: entry.isPublic !== false,
    updatedAt: entry.updatedAt || nowIso
  });
  const info = getDriverInfo();
  let persistedRemote = false;

  if (info.driver === "kv") {
    await kvSetJson(KV_SHARE_PREFIX + clean, normalized);
    persistedRemote = true;
  } else if (info.driver === "supabase") {
    const deck = normalized.deck || {};
    const extraFields = {};
    Object.keys(deck).forEach(function (k) {
      if (["id", "title", "tag", "questions", "isPublic", "shareCode"].indexOf(k) === -1) {
        extraFields[k] = deck[k];
      }
    });
    let savedToTable = false;
    try {
      await sbFetch("/creator_quizzes?on_conflict=id", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          id: String(deck.id || ("qz_" + clean)),
          owner_email: String(normalized.createdBy || "guest").toLowerCase(),
          title: String(deck.title || "Untitled Quiz").slice(0, 300),
          tag: String(deck.tag || "T\u1ed5ng h\u1ee3p").slice(0, 120),
          share_code: clean,
          is_public: normalized.isPublic !== false,
          questions: Array.isArray(deck.questions) ? deck.questions : [],
          extra_fields: extraFields,
          updated_at: nowIso
        })
      });
      savedToTable = true;
      persistedRemote = true;
    } catch (e) { /* fall back to system_ai_env_state if table not yet created */ }

    if (!savedToTable) {
      await sbFetch("/system_ai_env_state?on_conflict=id", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: "__share__:" + clean, state_json: normalized, updated_at: nowIso })
      });
      persistedRemote = true;
    }
  }

  const local = readLocalAppDbFile() || {};
  if (!local.shares || typeof local.shares !== "object") local.shares = {};
  local.shares[clean] = normalized;
  writeLocalAppDbFile(local);
  return { persisted: true, remote: persistedRemote, driver: info.driver, entry: normalized };
}

async function getCloudUser(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return null;
  const info = getDriverInfo();
  if (info.driver === "kv") {
    try {
      const v = await kvGetJson(KV_CLOUD_PREFIX + clean, null);
      if (v) return v;
    } catch (e) { /* fallback */ }
  } else if (info.driver === "supabase") {
    try {
      const rows = await sbFetch("/system_ai_env_state?id=eq." + encodeURIComponent("__cloud_user__:" + clean) + "&select=state_json");
      if (Array.isArray(rows) && rows[0] && rows[0].state_json) return rows[0].state_json;
    } catch (e) { /* fallback */ }
  }
  const local = readLocalAppDbFile();
  return (local && local.cloudUsers && local.cloudUsers[clean]) || null;
}

async function saveCloudUser(email, data) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean || !data) return;
  const info = getDriverInfo();
  if (info.driver === "kv") {
    try { await kvSetJson(KV_CLOUD_PREFIX + clean, data); } catch (e) { /* fallback */ }
  } else if (info.driver === "supabase") {
    try {
      await sbFetch("/system_ai_env_state?on_conflict=id", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: "__cloud_user__:" + clean, state_json: data, updated_at: new Date().toISOString() })
      });
    } catch (e) { /* fallback */ }
  }
  const local = readLocalAppDbFile() || {};
  if (!local.cloudUsers || typeof local.cloudUsers !== "object") local.cloudUsers = {};
  local.cloudUsers[clean] = data;
  writeLocalAppDbFile(local);
}

async function getVocabUser(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return null;
  const info = getDriverInfo();
  if (info.driver === "kv") {
    try {
      const v = await kvGetJson(KV_VOCAB_PREFIX + clean, null);
      if (v) return v;
    } catch (e) { /* fallback */ }
  } else if (info.driver === "supabase") {
    try {
      const rows = await sbFetch("/user_vocab_data?user_email=eq." + encodeURIComponent(clean) + "&select=*");
      if (Array.isArray(rows) && rows[0]) {
        return {
          decks: Array.isArray(rows[0].decks) ? rows[0].decks : [],
          words: Array.isArray(rows[0].words) ? rows[0].words : [],
          stats: rows[0].stats || {},
          settings: rows[0].settings || {},
          updatedAt: Number(rows[0].updated_at) || 0
        };
      }
    } catch (e) { /* fallback to system_ai_env_state if table not yet migrated */ }
    try {
      const rows = await sbFetch("/system_ai_env_state?id=eq." + encodeURIComponent("__vocab_user__:" + clean) + "&select=state_json");
      if (Array.isArray(rows) && rows[0] && rows[0].state_json) return rows[0].state_json;
    } catch (e) { /* fallback */ }
  }
  const local = readLocalAppDbFile();
  return (local && local.vocabUsers && local.vocabUsers[clean]) || null;
}

async function saveVocabUser(email, data) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean || !data) return;
  const info = getDriverInfo();
  if (info.driver === "kv") {
    try { await kvSetJson(KV_VOCAB_PREFIX + clean, data); } catch (e) { /* fallback */ }
  } else if (info.driver === "supabase") {
    try {
      await sbFetch("/system_ai_env_state?on_conflict=id", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: "__vocab_user__:" + clean, state_json: data, updated_at: new Date().toISOString() })
      });
    } catch (e) { /* fallback */ }
  }
  const local = readLocalAppDbFile() || {};
  if (!local.vocabUsers || typeof local.vocabUsers !== "object") local.vocabUsers = {};
  local.vocabUsers[clean] = data;
  writeLocalAppDbFile(local);
}

module.exports = {
  getDriverInfo: getDriverInfo,
  listStoredKeys: listStoredKeys,
  saveStoredKeys: saveStoredKeys,
  clearAllStoredKeys: clearAllStoredKeys,
  getEnvKeyStates: getEnvKeyStates,
  saveEnvKeyStates: saveEnvKeyStates,
  appendAuditLog: appendAuditLog,
  listAuditLogs: listAuditLogs,
  consumeRateLimit: consumeRateLimit,
  checkAdminActionCooldown: checkAdminActionCooldown,
  loadAppDb: loadAppDb,
  saveAppDb: saveAppDb,
  claimNotificationOnce: claimNotificationOnce,
  getShareByCode: getShareByCode,
  saveShareByCode: saveShareByCode,
  getCloudUser: getCloudUser,
  saveCloudUser: saveCloudUser,
  getVocabUser: getVocabUser,
  saveVocabUser: saveVocabUser
};
