/* ============================================================
   AI Tutor - Admin System Key Pool Controller
   Protected by cryptographic RS256 Google ID Token + Admin allowlist.
   NEVER returns full raw keys to any frontend client.
   ============================================================ */
const crypto = require("crypto");
const CONFIG = require("../ai-providers-config.js");
const {
  isEncryptionConfigured,
  encryptSecret,
  decryptSecret,
  hmacKeyHash,
  maskApiKey,
  sanitizeErrorMessage
} = require("./crypto");
const { verifyAdminRequest } = require("./auth");
const { parseAccountGroupedText } = require("./key-parser");
const { isOriginAllowed, buildCorsHeaders, sendJsonWithCors, readBoundedJsonBody } = require("./http-utils");
const storage = require("./storage");

function getEnvMaskedSummary(envKeyStates) {
  const envVars = [
    { envName: "DEFAULT_GEMINI_KEYS", provider: "gemini" },
    { envName: "DEFAULT_GROQ_KEYS", provider: "groq" },
    { envName: "DEFAULT_OPENROUTER_KEYS", provider: "openrouter" },
    { envName: "DEFAULT_OPENAI_KEYS", provider: "openai" },
    { envName: "DEFAULT_DEEPSEEK_KEYS", provider: "deepseek" }
  ];
  const out = [];
  envVars.forEach(function (spec) {
    const raw = String(process.env[spec.envName] || "").trim();
    if (!raw) return;
    raw.split(/[\r\n,;]+/).forEach(function (tok, idx) {
      const val = tok.trim();
      if (!val) return;
      const hash = isEncryptionConfigured()
        ? hmacKeyHash(spec.provider, val)
        : crypto.createHash("sha256").update(spec.provider + ":" + val).digest("hex");
      const id = "env_" + spec.provider + "_" + hash.slice(0, 12);
      const st = (envKeyStates && envKeyStates[id]) || {};
      const now = Date.now();
      const effectiveStatus = (st.status === "cooldown" && Number(st.cooldownUntil) <= now) ? "healthy" : (st.status || "healthy");
      out.push({
        id: id,
        source: "env",
        accountLabel: "ENV " + spec.envName + " #" + (idx + 1),
        provider: spec.provider,
        maskedKey: maskApiKey(val),
        keyVersion: "env",
        enabled: st.enabled !== false,
        status: effectiveStatus,
        cooldownUntil: Number(st.cooldownUntil) || 0,
        usageCount: Number(st.usageCount) || 0,
        errorCount: Number(st.errorCount) || 0,
        lastError: st.lastError || "",
        lastTestedAt: st.lastTestedAt || null,
        createdAt: null
      });
    });
  });
  return out;
}

function collectAllKnownHashes(storedRecords) {
  const set = new Set();
  (storedRecords || []).forEach(function (r) {
    if (r && r.keyHash) set.add(r.keyHash);
  });
  const envVars = [
    { envName: "DEFAULT_GEMINI_KEYS", provider: "gemini" },
    { envName: "DEFAULT_GROQ_KEYS", provider: "groq" },
    { envName: "DEFAULT_OPENROUTER_KEYS", provider: "openrouter" },
    { envName: "DEFAULT_OPENAI_KEYS", provider: "openai" },
    { envName: "DEFAULT_DEEPSEEK_KEYS", provider: "deepseek" }
  ];
  envVars.forEach(function (spec) {
    const raw = String(process.env[spec.envName] || "").trim();
    if (!raw) return;
    raw.split(/[\r\n,;]+/).forEach(function (tok) {
      const val = tok.trim();
      if (!val) return;
      const h = isEncryptionConfigured()
        ? hmacKeyHash(spec.provider, val)
        : crypto.createHash("sha256").update(spec.provider + ":" + val).digest("hex");
      set.add(h);
    });
  });
  return set;
}

function toPublicKeyRecord(rec) {
  const now = Date.now();
  const effectiveStatus = (rec.status === "cooldown" && Number(rec.cooldownUntil) <= now) ? "healthy" : (rec.status || "healthy");
  return {
    id: rec.id,
    source: "db",
    accountLabel: rec.accountLabel,
    provider: rec.provider,
    maskedKey: rec.maskedKey,
    keyVersion: rec.keyVersion || "v1",
    enabled: rec.enabled !== false,
    status: effectiveStatus,
    cooldownUntil: Number(rec.cooldownUntil) || 0,
    usageCount: Number(rec.usageCount) || 0,
    errorCount: Number(rec.errorCount) || 0,
    lastError: rec.lastError || "",
    lastTestedAt: rec.lastTestedAt || null,
    createdAt: rec.createdAt || null
  };
}

async function pingSingleKey(provider, rawKey) {
  const pInfo = CONFIG.PROVIDER_MAP[provider];
  if (!pInfo) return { status: "invalid", httpStatus: 400, message: "Unsupported provider" };
  const url = pInfo.testEndpoint;
  const headers = provider === "gemini"
    ? { "x-goog-api-key": rawKey }
    : { "Authorization": "Bearer " + rawKey };
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;
  try {
    const resp = await fetch(url, { method: "GET", headers: headers, signal: ctrl ? ctrl.signal : undefined });
    if (timer) clearTimeout(timer);
    if (resp.ok) {
      return { status: "healthy", httpStatus: resp.status, message: "OK (HTTP " + resp.status + ")" };
    }
    let detail = "";
    if (typeof resp.json === "function") {
      const errBody = await resp.json().catch(function () { return null; });
      const rawDetail = (errBody && errBody.error && (errBody.error.message || errBody.error)) || (errBody && errBody.message) || "";
      if (rawDetail) detail = sanitizeErrorMessage(rawDetail, [rawKey]).slice(0, 140);
    }
    if (resp.status === 429) {
      return {
        status: "cooldown",
        httpStatus: 429,
        message: "HTTP 429 Quota / Rate Limit" + (detail ? (": " + detail) : ""),
        cooldownUntil: Date.now() + 60000
      };
    }
    if (resp.status === 401 || resp.status === 403 || (resp.status >= 400 && resp.status < 500)) {
      return {
        status: "invalid",
        httpStatus: resp.status,
        message: "HTTP " + resp.status + (detail ? (": " + detail) : " Invalid / Unauthorized Key")
      };
    }
    return {
      status: "cooldown",
      httpStatus: resp.status,
      message: "HTTP " + resp.status + (detail ? (": " + detail) : " Provider Temporary Error"),
      cooldownUntil: Date.now() + 30000
    };
  } catch (err) {
    if (timer) clearTimeout(timer);
    return {
      status: "cooldown",
      httpStatus: 0,
      message: sanitizeErrorMessage(err && err.message, [rawKey])
    };
  }
}

async function runLiveHealthCheckBatch(records, rawKeyById, includeDisabled) {
  const summary = { healthy: 0, cooldown: 0, invalid: 0 };
  const nowIso = new Date().toISOString();
  const CONCURRENCY = 5;

  for (let start = 0; start < records.length; start += CONCURRENCY) {
    const chunk = records.slice(start, start + CONCURRENCY);
    await Promise.all(chunk.map(async function (rec) {
      if (!rec || (!includeDisabled && rec.enabled === false)) return;
      let rawKey = rawKeyById ? rawKeyById[rec.id] : "";
      if (!rawKey) {
        try {
          rawKey = decryptSecret(rec);
        } catch (e) {
          rec.status = "invalid";
          rec.lastError = "Decrypt failed";
          rec.lastTestedAt = nowIso;
          rec.updatedAt = nowIso;
          summary.invalid++;
          return;
        }
      }
      const ping = await pingSingleKey(rec.provider, rawKey);
      rec.status = ping.status;
      rec.cooldownUntil = ping.cooldownUntil || 0;
      rec.lastError = ping.status === "healthy" ? "" : ping.message;
      rec.lastTestedAt = nowIso;
      rec.updatedAt = nowIso;
      if (ping.status === "healthy") summary.healthy++;
      else if (ping.status === "cooldown") summary.cooldown++;
      else summary.invalid++;
    }));
  }
  return summary;
}

async function handleAdminMe(req, res) {
  const corsCheck = isOriginAllowed(req);
  if (req.method === "OPTIONS") {
    res.writeHead(corsCheck.allowed ? 204 : 403, buildCorsHeaders(corsCheck));
    return res.end();
  }
  if (!corsCheck.allowed) {
    return sendJsonWithCors(res, 403, { ok: false, isAdmin: false, error: "Origin not allowed." }, corsCheck);
  }
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    return sendJsonWithCors(res, 405, { ok: false, isAdmin: false, error: "Method Not Allowed." }, corsCheck);
  }
  try {
    const admin = await verifyAdminRequest(req);
    return sendJsonWithCors(res, 200, {
      ok: true,
      isAdmin: true,
      email: admin.email,
      uid: admin.uid
    }, corsCheck);
  } catch (authErr) {
    return sendJsonWithCors(res, authErr.status || 403, {
      ok: false,
      isAdmin: false,
      error: authErr.message
    }, corsCheck);
  }
}

async function handleAdminSystemKeys(req, res, cleanPath) {
  const corsCheck = isOriginAllowed(req);
  if (req.method === "OPTIONS") {
    res.writeHead(corsCheck.allowed ? 204 : 403, buildCorsHeaders(corsCheck));
    return res.end();
  }
  if (!corsCheck.allowed) {
    return sendJsonWithCors(res, 403, { error: "Origin not allowed." }, corsCheck);
  }

  let admin;
  try {
    admin = await verifyAdminRequest(req);
  } catch (authErr) {
    return sendJsonWithCors(res, authErr.status || 403, { error: authErr.message }, corsCheck);
  }

  const method = String(req.method || "GET").toUpperCase();
  const sub = cleanPath.replace(/^\/api\/admin\/system-keys\/?/, "");

  // GET /api/admin/system-keys
  if (!sub && method === "GET") {
    const stored = await storage.listStoredKeys();
    const envStates = await storage.getEnvKeyStates();
    const audits = await storage.listAuditLogs(50);
    return sendJsonWithCors(res, 200, {
      ok: true,
      encryptionConfigured: isEncryptionConfigured(),
      driver: storage.getDriverInfo(),
      keys: stored.map(toPublicKeyRecord),
      envKeys: getEnvMaskedSummary(envStates),
      auditLogs: audits
    }, corsCheck);
  }

  // POST /api/admin/system-keys/preview (parse only, never save or log raw text)
  if (sub === "preview" && method === "POST") {
    const body = await readBoundedJsonBody(req, 512 * 1024);
    const rawText = String((body && body.rawText) || "");
    if (!rawText.trim()) {
      return sendJsonWithCors(res, 400, { error: "Vui l\u00f2ng d\u00e1n n\u1ed9i dung danh s\u00e1ch API Key tr\u01b0\u1edbc khi ph\u00e2n t\u00edch." }, corsCheck);
    }
    const stored = await storage.listStoredKeys();
    const knownHashes = collectAllKnownHashes(stored);
    const parsed = parseAccountGroupedText(rawText, knownHashes);
    return sendJsonWithCors(res, 200, {
      ok: true,
      encryptionConfigured: isEncryptionConfigured(),
      totalValid: parsed.totalValid,
      summaryByProvider: parsed.summaryByProvider,
      summaryByAccount: parsed.summaryByAccount,
      previewItems: parsed.previewItems,
      skipped: parsed.skipped,
      duplicates: parsed.duplicates,
      mismatches: parsed.mismatches
    }, corsCheck);
  }

  // POST /api/admin/system-keys/import (confirm & encrypt with AES-256-GCM + persist)
  if (sub === "import" && method === "POST") {
    if (!isEncryptionConfigured()) {
      return sendJsonWithCors(res, 500, {
        error: "Bi\u1ebfn m\u00f4i tr\u01b0\u1eddng ENCRYPTION_SECRET ch\u01b0a \u0111\u01b0\u1ee3c c\u1ea5u h\u00ecnh tr\u00ean m\u00e1y ch\u1ee7 (>= 16 k\u00fd t\u1ef1). H\u00e3y th\u00eam ENCRYPTION_SECRET trong Vercel Environment Variables tr\u01b0\u1edbc khi nh\u1eadp Key."
      }, corsCheck);
    }
    const body = await readBoundedJsonBody(req, 512 * 1024);
    const rawText = String((body && body.rawText) || "");
    const stored = await storage.listStoredKeys();
    const knownHashes = collectAllKnownHashes(stored);
    const parsed = parseAccountGroupedText(rawText, knownHashes);

    if (parsed.validEntries.length === 0) {
      return sendJsonWithCors(res, 400, {
        error: "Kh\u00f4ng c\u00f3 API Key m\u1edbi n\u00e0o \u0111\u1ec3 nh\u1eadp (t\u1ea5t c\u1ea3 d\u00f2ng \u0111\u1ec1u tr\u1ed1ng ho\u1eb7c \u0111\u00e3 tr\u00f9ng l\u1eb7p trong h\u1ec7 th\u1ed1ng).",
        duplicates: parsed.duplicates,
        mismatches: []
      }, corsCheck);
    }

    const nowIso = new Date().toISOString();
    const rawKeyById = {};
    const added = parsed.validEntries.map(function (entry) {
      const enc = encryptSecret(entry.rawKey);
      const id = "sysk_" + crypto.randomBytes(6).toString("hex");
      rawKeyById[id] = entry.rawKey;
      return {
        id: id,
        accountLabel: entry.accountLabel,
        provider: entry.provider,
        maskedKey: entry.maskedKey,
        keyHash: hmacKeyHash(entry.provider, entry.rawKey),
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        authTag: enc.authTag,
        keyVersion: enc.keyVersion,
        kdf: enc.kdf,
        enabled: true,
        status: "healthy",
        cooldownUntil: 0,
        usageCount: 0,
        errorCount: 0,
        lastError: "",
        lastTestedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso
      };
    });

    let healthSummary = null;
    if (body && body.verifyLive !== false) {
      healthSummary = await runLiveHealthCheckBatch(added, rawKeyById);
    }

    const updated = stored.concat(added);
    await storage.saveStoredKeys(updated);
    const summaryText = Object.keys(parsed.summaryByProvider)
      .filter(function (p) { return parsed.summaryByProvider[p] > 0; })
      .map(function (p) { return p + ":" + parsed.summaryByProvider[p]; })
      .join(", ");
    const healthNote = healthSummary
      ? ("; live check: healthy=" + healthSummary.healthy + ", cooldown=" + healthSummary.cooldown + ", invalid=" + healthSummary.invalid)
      : "";
    await storage.appendAuditLog({
      adminEmail: admin.email,
      action: "import",
      detail: "Imported " + added.length + " key(s) (" + summaryText + "); skipped " + parsed.skipped.length + ", duplicates " + parsed.duplicates.length + healthNote
    });

    return sendJsonWithCors(res, 200, {
      ok: true,
      importedCount: added.length,
      healthSummary: healthSummary,
      keys: updated.map(toPublicKeyRecord),
      auditLogs: await storage.listAuditLogs(50)
    }, corsCheck);
  }

  // POST /api/admin/system-keys/:id/test (single-key live API health check)
  const testOneMatch = sub.match(/^([^/]+)\/test$/);
  if (testOneMatch && method === "POST") {
    const id = decodeURIComponent(testOneMatch[1]);
    const stored = await storage.listStoredKeys();
    const rec = stored.find(function (k) { return k && k.id === id; });
    if (!rec) {
      return sendJsonWithCors(res, 404, { error: "Kh\u00f4ng t\u00ecm th\u1ea5y Key trong h\u1ec7 th\u1ed1ng." }, corsCheck);
    }
    const summary = await runLiveHealthCheckBatch([rec], null, true);
    await storage.saveStoredKeys(stored);
    await storage.appendAuditLog({
      adminEmail: admin.email,
      action: "test_one",
      detail: rec.provider + " " + rec.maskedKey + " -> " + rec.status + (rec.lastError ? (" (" + rec.lastError.slice(0, 80) + ")") : " (OK)")
    });
    return sendJsonWithCors(res, 200, {
      ok: true,
      summary: summary,
      key: toPublicKeyRecord(rec),
      keys: stored.map(toPublicKeyRecord),
      auditLogs: await storage.listAuditLogs(50)
    }, corsCheck);
  }

  // POST /api/admin/system-keys/test-all (rate-limited live API health check for all enabled DB keys)
  if (sub === "test-all" && method === "POST") {
    const cd = await storage.checkAdminActionCooldown("test_all:" + admin.email, 20);
    if (!cd.allowed) {
      return sendJsonWithCors(res, 429, { error: "Vui l\u00f2ng \u0111\u1ee3i " + cd.retryAfterSec + "s tr\u01b0\u1edbc khi Test All Keys l\u1ea1i." }, corsCheck);
    }
    const stored = await storage.listStoredKeys();
    const summary = await runLiveHealthCheckBatch(stored);
    await storage.saveStoredKeys(stored);
    await storage.appendAuditLog({
      adminEmail: admin.email,
      action: "test_all",
      detail: "Tested DB keys: healthy=" + summary.healthy + ", cooldown=" + summary.cooldown + ", invalid=" + summary.invalid
    });

    return sendJsonWithCors(res, 200, {
      ok: true,
      summary: summary,
      keys: stored.map(toPublicKeyRecord),
      auditLogs: await storage.listAuditLogs(50)
    }, corsCheck);
  }

  // POST /api/admin/system-keys/remove-invalid
  if (sub === "remove-invalid" && method === "POST") {
    const stored = await storage.listStoredKeys();
    const kept = stored.filter(function (k) { return k && k.status !== "invalid"; });
    const removedCount = stored.length - kept.length;
    await storage.saveStoredKeys(kept);
    await storage.appendAuditLog({
      adminEmail: admin.email,
      action: "remove_invalid",
      detail: "Removed " + removedCount + " invalid key(s)"
    });
    return sendJsonWithCors(res, 200, {
      ok: true,
      removedCount: removedCount,
      keys: kept.map(toPublicKeyRecord),
      auditLogs: await storage.listAuditLogs(50)
    }, corsCheck);
  }

  // PATCH /api/admin/system-keys/:id (Enable / Disable or reset status)
  if (sub && sub.indexOf("/") === -1 && method === "PATCH") {
    const id = decodeURIComponent(sub);
    const body = await readBoundedJsonBody(req, 64 * 1024);
    const stored = await storage.listStoredKeys();
    const rec = stored.find(function (k) { return k && k.id === id; });
    if (!rec) {
      return sendJsonWithCors(res, 404, { error: "Kh\u00f4ng t\u00ecm th\u1ea5y Key trong h\u1ec7 th\u1ed1ng." }, corsCheck);
    }
    let actName = "update";
    if (typeof body.enabled === "boolean") {
      rec.enabled = body.enabled;
      actName = rec.enabled ? "enable" : "disable";
    }
    if (body.resetStatus === true) {
      rec.status = "healthy";
      rec.cooldownUntil = 0;
      rec.lastError = "";
      actName = "reset_status";
    }
    rec.updatedAt = new Date().toISOString();
    await storage.saveStoredKeys(stored);
    await storage.appendAuditLog({
      adminEmail: admin.email,
      action: actName,
      detail: rec.provider + " " + rec.maskedKey + " (" + rec.accountLabel + ")"
    });
    return sendJsonWithCors(res, 200, {
      ok: true,
      key: toPublicKeyRecord(rec),
      keys: stored.map(toPublicKeyRecord),
      auditLogs: await storage.listAuditLogs(50)
    }, corsCheck);
  }

  // DELETE /api/admin/system-keys OR POST /api/admin/system-keys/delete-all (requires confirm: "XOA")
  if ((!sub && method === "DELETE") || (sub === "delete-all" && method === "POST")) {
    let body = {};
    try {
      body = await readBoundedJsonBody(req, 16 * 1024);
    } catch (e) {
      return sendJsonWithCors(res, e.status || 400, { error: e.message }, corsCheck);
    }
    const confWord = String((body && body.confirm) || "").trim().toUpperCase();
    if (confWord !== "XOA") {
      return sendJsonWithCors(res, 400, {
        error: "Vui l\u00f2ng x\u00e1c nh\u1eadn b\u1eb1ng c\u00e1ch nh\u1eadp ch\u00ednh x\u00e1c t\u1eeb kh\u00f3a XOA tr\u01b0\u1edbc khi x\u00f3a to\u00e0n b\u1ed9 Key H\u1ec7 th\u1ed1ng."
      }, corsCheck);
    }
    const deletedCount = await storage.clearAllStoredKeys();
    await storage.appendAuditLog({
      adminEmail: admin.email,
      action: "delete_all",
      detail: "Deleted all " + deletedCount + " DB system key(s)"
    });
    return sendJsonWithCors(res, 200, {
      ok: true,
      deletedCount: deletedCount,
      keys: [],
      auditLogs: await storage.listAuditLogs(50)
    }, corsCheck);
  }

  // DELETE /api/admin/system-keys/:id
  if (sub && sub.indexOf("/") === -1 && method === "DELETE") {
    const id = decodeURIComponent(sub);
    const stored = await storage.listStoredKeys();
    const target = stored.find(function (k) { return k && k.id === id; });
    if (!target) {
      return sendJsonWithCors(res, 404, { error: "Kh\u00f4ng t\u00ecm th\u1ea5y Key \u0111\u1ec3 x\u00f3a." }, corsCheck);
    }
    const kept = stored.filter(function (k) { return k && k.id !== id; });
    await storage.saveStoredKeys(kept);
    await storage.appendAuditLog({
      adminEmail: admin.email,
      action: "delete",
      detail: target.provider + " " + target.maskedKey + " (" + target.accountLabel + ")"
    });
    return sendJsonWithCors(res, 200, {
      ok: true,
      keys: kept.map(toPublicKeyRecord),
      auditLogs: await storage.listAuditLogs(50)
    }, corsCheck);
  }

  return sendJsonWithCors(res, 404, { error: "Admin system-keys route not found" }, corsCheck);
}

module.exports = {
  handleAdminMe: handleAdminMe,
  handleAdminSystemKeys: handleAdminSystemKeys,
  getEnvMaskedSummary: getEnvMaskedSummary,
  toPublicKeyRecord: toPublicKeyRecord
};
