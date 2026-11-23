/* ============================================================
   AI Tutor - Server-Side AI Proxy, Key Rotation, Cooldown & Failover Engine
   ZERO CLIENT EXPOSURE: System Default Keys never leave the server.
   - Gemini keys are sent strictly in the "x-goog-api-key" header (NEVER in URL).
   - Verifies Google RS256 ID token + Fair-use Rate Limit (default 20 req/hr).
   - Supports SSE streaming and automatic capability-safe failover.
   ============================================================ */
const crypto = require("crypto");
const CONFIG = require("../../ai-providers-config.js");
const { decryptSecret, hmacKeyHash, maskApiKey, sanitizeErrorMessage, isEncryptionConfigured } = require("./crypto");
const { verifyUserRequest } = require("./auth");
const { getClientIp, isOriginAllowed, buildCorsHeaders, sendJsonWithCors, readBoundedJsonBody } = require("./http-utils");
const storage = require("./storage");

const MAX_BODY_BYTES = 4 * 1024 * 1024;

function getRateLimitPerHour() {
  const n = parseInt(process.env.AI_PROXY_RATE_LIMIT_PER_HOUR || "20", 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function getCooldownMs() {
  const sec = parseInt(process.env.AI_KEY_COOLDOWN_SECONDS || "60", 10);
  return (Number.isFinite(sec) && sec > 0 ? sec : 60) * 1000;
}

function getMaxTokensCap() {
  const n = parseInt(process.env.AI_PROXY_MAX_TOKENS || "8192", 10);
  return Number.isFinite(n) && n >= 256 ? n : 8192;
}

function getEnvDefaultKeys(envKeyStates) {
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
      const keyHash = isEncryptionConfigured()
        ? hmacKeyHash(spec.provider, val)
        : crypto.createHash("sha256").update(spec.provider + ":" + val).digest("hex");
      const stateId = "env_" + spec.provider + "_" + keyHash.slice(0, 12);
      const st = (envKeyStates && envKeyStates[stateId]) || {};
      out.push({
        id: stateId,
        source: "env",
        accountLabel: "Server Env (" + spec.provider + " #" + (idx + 1) + ")",
        provider: spec.provider,
        rawKey: val,
        maskedKey: maskApiKey(val),
        enabled: st.enabled !== false,
        status: st.status || "healthy",
        cooldownUntil: Number(st.cooldownUntil) || 0,
        usageCount: Number(st.usageCount) || 0,
        errorCount: Number(st.errorCount) || 0
      });
    });
  });
  return out;
}

async function loadSystemKeyPool() {
  const storedRecords = await storage.listStoredKeys();
  const envKeyStates = await storage.getEnvKeyStates();
  const pool = [];
  const secrets = [];
  const seenHashes = new Set();

  for (let i = 0; i < storedRecords.length; i++) {
    const rec = storedRecords[i];
    if (!rec || rec.enabled === false || rec.status === "invalid") continue;
    try {
      const rawKey = decryptSecret(rec);
      secrets.push(rawKey);
      const h = rec.keyHash || (isEncryptionConfigured()
        ? hmacKeyHash(rec.provider, rawKey)
        : crypto.createHash("sha256").update(rec.provider + ":" + rawKey).digest("hex"));
      if (seenHashes.has(h)) continue;
      seenHashes.add(h);
      pool.push({
        id: rec.id,
        source: "db",
        accountLabel: rec.accountLabel,
        provider: rec.provider,
        rawKey: rawKey,
        maskedKey: rec.maskedKey,
        keyHash: h,
        enabled: rec.enabled !== false,
        status: rec.status || "healthy",
        cooldownUntil: Number(rec.cooldownUntil) || 0,
        usageCount: Number(rec.usageCount) || 0,
        errorCount: Number(rec.errorCount) || 0
      });
    } catch (e) {
      // Skip unreadable record without leaking details
    }
  }

  const envKeys = getEnvDefaultKeys(envKeyStates);
  envKeys.forEach(function (ek) {
    secrets.push(ek.rawKey);
    const h = isEncryptionConfigured()
      ? hmacKeyHash(ek.provider, ek.rawKey)
      : crypto.createHash("sha256").update(ek.provider + ":" + ek.rawKey).digest("hex");
    if (seenHashes.has(h)) return;
    seenHashes.add(h);
    if (ek.enabled !== false && ek.status !== "invalid") {
      ek.keyHash = h;
      pool.push(ek);
    }
  });

  return { pool: pool, storedRecords: storedRecords, envKeyStates: envKeyStates, secrets: secrets };
}

function validateInlineMediaSizes(body) {
  const MAX_SINGLE_B64 = 3.2 * 1024 * 1024;
  const MAX_TOTAL_B64 = 3.5 * 1024 * 1024;
  let total = 0;
  const contents = Array.isArray(body && body.contents) ? body.contents : [];
  for (let i = 0; i < contents.length; i++) {
    const parts = (contents[i] && contents[i].parts) || [];
    for (let j = 0; j < parts.length; j++) {
      const pt = parts[j];
      if (pt && pt.inlineData && typeof pt.inlineData.data === "string") {
        const len = pt.inlineData.data.length;
        if (len > MAX_SINGLE_B64) {
          return "T\u1ec7p \u1ea3nh / PDF v\u01b0\u1ee3t qu\u00e1 dung l\u01b0\u1ee3ng cho ph\u00e9p (t\u1ed1i \u0111a 2.4MB m\u1ed7i \u1ea3nh). H\u00e3y n\u00e9n nh\u1ecf \u1ea3nh tr\u01b0\u1edbc khi g\u1eedi.";
        }
        total += len;
        if (total > MAX_TOTAL_B64) {
          return "T\u1ed5ng dung l\u01b0\u1ee3ng \u1ea3nh / PDF trong m\u1ed9t l\u01b0\u1ee3t g\u1eedi qu\u00e1 l\u1edbn. H\u00e3y chia nh\u1ecf s\u1ed1 \u1ea3nh m\u1ed7i l\u1ea7n.";
        }
      }
    }
  }
  return "";
}

function detectRequestCapabilities(body) {
  let hasImage = false;
  let hasPdf = false;
  const contents = Array.isArray(body && body.contents) ? body.contents : [];
  contents.forEach(function (c) {
    ((c && c.parts) || []).forEach(function (pt) {
      if (pt && pt.inlineData && pt.inlineData.mimeType) {
        const mt = String(pt.inlineData.mimeType).toLowerCase();
        if (mt.indexOf("image/") === 0) hasImage = true;
        else if (mt.indexOf("pdf") !== -1) hasPdf = true;
      } else if (pt && pt.image_url) {
        hasImage = true;
      }
    });
  });
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  messages.forEach(function (m) {
    if (Array.isArray(m && m.content)) {
      m.content.forEach(function (part) {
        if (part && part.type === "image_url") hasImage = true;
      });
    }
  });
  return { hasImage: hasImage, hasPdf: hasPdf };
}

function isModelCompatible(modelId, caps) {
  const info = CONFIG.ALLOWED_MODELS[modelId];
  if (!info) return false;
  if (caps.hasPdf && !info.pdf) return false;
  if (caps.hasImage && !info.vision) return false;
  return true;
}

function buildServerFailoverPlan(requestedModelId, pool, caps) {
  const now = Date.now();
  const reqModelInfo = CONFIG.ALLOWED_MODELS[requestedModelId];
  const reqProvider = reqModelInfo ? reqModelInfo.provider : "gemini";
  const capBucket = caps.hasPdf ? "pdf" : (caps.hasImage ? "vision" : "text");

  const activeByProvider = {};
  pool.forEach(function (k) {
    if (!k.enabled || k.status === "invalid") return;
    if (k.cooldownUntil > now) return;
    if (!activeByProvider[k.provider]) activeByProvider[k.provider] = [];
    activeByProvider[k.provider].push(k);
  });

  // Sort keys inside each provider by least recently errored / lowest usageCount for fair load spreading
  Object.keys(activeByProvider).forEach(function (prov) {
    activeByProvider[prov].sort(function (a, b) {
      return (a.usageCount || 0) - (b.usageCount || 0);
    });
  });

  const plan = [];
  const seen = new Set();
  const addAttempt = function (keyEntry, modelId, isFallback) {
    if (!keyEntry || !isModelCompatible(modelId, caps)) return;
    const sig = keyEntry.id + "|" + modelId;
    if (seen.has(sig)) return;
    seen.add(sig);
    plan.push({
      keyEntry: keyEntry,
      modelInfo: CONFIG.ALLOWED_MODELS[modelId],
      isFallback: isFallback
    });
  };

  // 1. Primary requested provider keys with requested model
  if (isModelCompatible(requestedModelId, caps)) {
    (activeByProvider[reqProvider] || []).forEach(function (k) {
      addAttempt(k, requestedModelId, false);
    });
  }

  // 2. Fallback models inside the same provider if multiple models share independent quotas (e.g. Gemini)
  const sameProvFallbacks = (CONFIG.FALLBACK_MODEL_MAP[capBucket] && CONFIG.FALLBACK_MODEL_MAP[capBucket][reqProvider]) || [];
  (activeByProvider[reqProvider] || []).forEach(function (k) {
    sameProvFallbacks.forEach(function (mId) {
      addAttempt(k, mId, mId !== requestedModelId);
    });
  });

  // 3. Cross-provider failover along configurable FALLBACK_ORDER (gemini -> groq -> openrouter -> ...)
  const providerOrder = CONFIG.FALLBACK_ORDER.slice();
  if (providerOrder.indexOf("openai") === -1) providerOrder.push("openai");
  if (providerOrder.indexOf("deepseek") === -1) providerOrder.push("deepseek");

  providerOrder.forEach(function (prov) {
    if (prov === reqProvider) return;
    const keys = activeByProvider[prov] || [];
    if (keys.length === 0) return;
    const fbModels = (CONFIG.FALLBACK_MODEL_MAP[capBucket] && CONFIG.FALLBACK_MODEL_MAP[capBucket][prov]) || [];
    keys.forEach(function (k) {
      fbModels.forEach(function (mId) {
        addAttempt(k, mId, true);
      });
    });
  });

  return plan;
}

function buildGeminiUpstreamBody(reqBody, maxTokensCap) {
  const genCfg = Object.assign({}, (reqBody && reqBody.generationConfig) || {});
  const reqMax = Number(genCfg.maxOutputTokens || reqBody.max_tokens || maxTokensCap);
  genCfg.maxOutputTokens = Math.min(maxTokensCap, Math.max(1, Number.isFinite(reqMax) ? reqMax : maxTokensCap));

  const out = {
    contents: Array.isArray(reqBody.contents) ? reqBody.contents : [],
    generationConfig: genCfg
  };
  if (reqBody.systemInstruction) {
    out.systemInstruction = reqBody.systemInstruction;
  }
  return out;
}

function buildOpenAICompatibleBody(rawModel, reqBody, maxTokensCap, streamFlag) {
  const reqMax = Number(
    (reqBody && reqBody.max_tokens) ||
    (reqBody && reqBody.generationConfig && reqBody.generationConfig.maxOutputTokens) ||
    maxTokensCap
  );
  const cappedMaxTokens = Math.min(maxTokensCap, Math.max(1, Number.isFinite(reqMax) ? reqMax : maxTokensCap));

  if (Array.isArray(reqBody && reqBody.messages)) {
    const out = {
      model: rawModel,
      messages: reqBody.messages,
      temperature: typeof reqBody.temperature === "number" ? reqBody.temperature : 0.1,
      max_tokens: cappedMaxTokens
    };
    if (reqBody.response_format && rawModel.indexOf("reasoner") === -1) {
      out.response_format = reqBody.response_format;
    }
    if (streamFlag) out.stream = true;
    return out;
  }

  const sysText = (
    reqBody &&
    reqBody.systemInstruction &&
    reqBody.systemInstruction.parts &&
    reqBody.systemInstruction.parts[0] &&
    reqBody.systemInstruction.parts[0].text
  ) || "";
  const schema = reqBody && reqBody.generationConfig && reqBody.generationConfig.responseSchema;
  let schemaHint = "";
  if (schema && schema.properties) {
    schemaHint = "\nIMPORTANT: Return ONLY valid JSON matching the requested schema (no markdown code blocks, no extra prose).";
    if (schema.properties.questions) {
      schemaHint += '\nRequired JSON format: {"questions":[{"question":"...","type":"Multiple Choice","options":["A","B","C","D"],"correct":[1],"explanation":"...","confidence":"high"}]}';
    } else if (schema.properties.solutions) {
      schemaHint += '\nRequired JSON format: {"solutions":[{"index":0,"correct":[1],"explanation":"...","confidence":"high"}]}';
    } else if (schema.properties.checks) {
      schemaHint += '\nRequired JSON format: {"checks":[{"index":0,"independentCorrect":[1],"confidence":"high","note":"..."}]}';
    }
  }

  const messages = [];
  if (sysText || schemaHint) {
    messages.push({ role: "system", content: (sysText + schemaHint).trim() });
  }

  const userContent = [];
  (Array.isArray(reqBody && reqBody.contents) ? reqBody.contents : []).forEach(function (c) {
    ((c && c.parts) || []).forEach(function (pt) {
      if (pt && typeof pt.text === "string" && pt.text.trim()) {
        userContent.push({ type: "text", text: pt.text });
      } else if (pt && pt.inlineData && pt.inlineData.mimeType && pt.inlineData.data) {
        userContent.push({
          type: "image_url",
          image_url: { url: "data:" + pt.inlineData.mimeType + ";base64," + pt.inlineData.data }
        });
      }
    });
  });

  if (userContent.length === 1 && userContent[0].type === "text") {
    messages.push({ role: "user", content: userContent[0].text });
  } else {
    messages.push({ role: "user", content: userContent });
  }

  const temp = (reqBody && reqBody.generationConfig && typeof reqBody.generationConfig.temperature === "number")
    ? reqBody.generationConfig.temperature
    : (typeof reqBody.temperature === "number" ? reqBody.temperature : 0.1);

  const body = {
    model: rawModel,
    messages: messages,
    temperature: temp,
    max_tokens: cappedMaxTokens
  };
  const wantsJson = !!(schema || (reqBody && reqBody.generationConfig && reqBody.generationConfig.responseMimeType === "application/json"));
  if (wantsJson && rawModel.indexOf("reasoner") === -1) {
    body.response_format = { type: "json_object" };
  }
  if (streamFlag) body.stream = true;
  return body;
}

function normalizeUpstreamJson(provider, data) {
  if (provider === "gemini") {
    const txt = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    return { provider: "gemini", text: txt || "", raw: data };
  }
  const txt = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return { provider: provider, text: txt || "", raw: data };
}

async function persistKeyStateUpdates(mutations) {
  if (!mutations || mutations.size === 0) return;
  let dbDirty = false;
  let envDirty = false;
  const nowIso = new Date().toISOString();

  // Re-read fresh storage snapshot before applying deltas to reduce concurrent-overwrite windows
  const freshStored = await storage.listStoredKeys();
  const freshEnvStates = await storage.getEnvKeyStates();

  mutations.forEach(function (delta, keyId) {
    if (delta.source === "env") {
      const cur = freshEnvStates[keyId] || {};
      freshEnvStates[keyId] = {
        enabled: cur.enabled !== false,
        status: delta.status || cur.status || "healthy",
        cooldownUntil: typeof delta.cooldownUntil === "number" ? delta.cooldownUntil : (cur.cooldownUntil || 0),
        usageCount: (Number(cur.usageCount) || 0) + (delta.usageDelta || 0),
        errorCount: (Number(cur.errorCount) || 0) + (delta.errorDelta || 0),
        lastError: delta.lastError !== undefined ? delta.lastError : (cur.lastError || ""),
        updatedAt: nowIso
      };
      envDirty = true;
    } else {
      const rec = freshStored.find(function (r) { return r && r.id === keyId; });
      if (rec) {
        if (delta.status) rec.status = delta.status;
        if (typeof delta.cooldownUntil === "number") rec.cooldownUntil = delta.cooldownUntil;
        if (delta.usageDelta) rec.usageCount = (Number(rec.usageCount) || 0) + delta.usageDelta;
        if (delta.errorDelta) rec.errorCount = (Number(rec.errorCount) || 0) + delta.errorDelta;
        if (delta.lastError !== undefined) rec.lastError = delta.lastError;
        rec.updatedAt = nowIso;
        dbDirty = true;
      }
    }
  });

  if (dbDirty) await storage.saveStoredKeys(freshStored);
  if (envDirty) await storage.saveEnvKeyStates(freshEnvStates);
}

async function handleAiProxy(req, res) {
  const corsCheck = isOriginAllowed(req);
  if (req.method === "OPTIONS") {
    res.writeHead(corsCheck.allowed ? 204 : 403, buildCorsHeaders(corsCheck));
    return res.end();
  }
  if (!corsCheck.allowed) {
    return sendJsonWithCors(res, 403, { error: "Origin kh\u00f4ng n\u1eb1m trong danh s\u00e1ch cho ph\u00e9p (CORS)." }, corsCheck);
  }
  if (String(req.method || "").toUpperCase() !== "POST") {
    return sendJsonWithCors(res, 405, { error: "Method Not Allowed. Use POST." }, corsCheck);
  }

  let user;
  try {
    user = await verifyUserRequest(req);
  } catch (authErr) {
    return sendJsonWithCors(res, authErr.status || 401, { error: authErr.message, code: authErr.code }, corsCheck);
  }

  let body;
  try {
    body = await readBoundedJsonBody(req, MAX_BODY_BYTES);
    // Defensive normalization: unwrap nested payload if a client sends { model, payload: { contents, ... } }
    if (body && body.payload && typeof body.payload === "object" && !body.contents && !body.messages) {
      body = Object.assign({}, body.payload, {
        model: body.model || body.payload.model,
        stream: body.stream === true || body.payload.stream === true
      });
    }
  } catch (bodyErr) {
    return sendJsonWithCors(res, bodyErr.status || 400, { error: bodyErr.message }, corsCheck);
  }

  // SSRF & Header-Injection Defense: never accept client-chosen upstream URL or custom headers
  if (body && (body.upstreamUrl || body.baseUrl || body.endpoint || body.url || body.headers || body.customHeaders)) {
    return sendJsonWithCors(res, 400, { error: "Y\u00eau c\u1ea7u ch\u1ee9a tr\u01b0\u1eddng \u0111\u1ecbnh tuy\u1ebfn / header kh\u00f4ng h\u1ee3p l\u1ec7." }, corsCheck);
  }

  const mediaSizeErr = validateInlineMediaSizes(body);
  if (mediaSizeErr) {
    return sendJsonWithCors(res, 413, { error: mediaSizeErr }, corsCheck);
  }

  const requestedModelId = String((body && body.model) || CONFIG.DEFAULT_MODEL_ID || "gemini-3.5-flash-lite").trim();
  if (!CONFIG.ALLOWED_MODELS[requestedModelId]) {
    return sendJsonWithCors(res, 400, { error: "Model AI \"" + requestedModelId + "\" kh\u00f4ng n\u1eb1m trong danh s\u00e1ch \u0111\u01b0\u1ee3c ph\u00e9p." }, corsCheck);
  }

  // Dual Fair-Use Rate Limit (System Pool ONLY):
  // 1) Per verified UID (prevents X-Forwarded-For spoofing completely)
  // 2) Per trusted client IP (prevents multi-account spam from one IP)
  const ipHash = crypto.createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 16);
  const hourBucket = Math.floor(Date.now() / 3600000);
  const rateLimitPerHour = getRateLimitPerHour();
  const uidBucketKey = "aitutor:rl:uid:" + user.uid + ":" + hourBucket;
  const ipBucketKey = "aitutor:rl:ip:" + ipHash + ":" + hourBucket;

  const rlUid = await storage.consumeRateLimit(uidBucketKey, rateLimitPerHour, 3600);
  if (!rlUid.allowed) {
    const minsLeft = Math.max(1, Math.ceil((rlUid.resetAt - Date.now()) / 60000));
    return sendJsonWithCors(res, 429, {
      error: "B\u1ea1n \u0111\u00e3 d\u00f9ng h\u1ebft gi\u1edbi h\u1ea1n c\u00f4ng b\u1eb1ng (" + rlUid.limit + " l\u01b0\u1ee3t/gi\u1edd) cho API H\u1ec7 th\u1ed1ng mi\u1ec5n ph\u00ed. Vui l\u00f2ng th\u1eed l\u1ea1i sau ~" + minsLeft + " ph\u00fat ho\u1eb7c nh\u1eadp API Key c\u00e1 nh\u00e2n t\u1ea1i C\u00e0i \u0111\u1eb7t API \u0111\u1ec3 kh\u00f4ng b\u1ecb gi\u1edbi h\u1ea1n."
    }, corsCheck);
  }
  const ipCap = Math.max(rateLimitPerHour * 2, 40);
  const rlIp = await storage.consumeRateLimit(ipBucketKey, ipCap, 3600);
  if (!rlIp.allowed) {
    const minsLeft = Math.max(1, Math.ceil((rlIp.resetAt - Date.now()) / 60000));
    return sendJsonWithCors(res, 429, {
      error: "\u0110\u1ecba ch\u1ec9 m\u1ea1ng c\u1ee7a b\u1ea1n \u0111\u00e3 ch\u1ea1m gi\u1edbi h\u1ea1n l\u01b0\u1ee3t d\u00f9ng chung trong gi\u1edd n\u00e0y. Vui l\u00f2ng th\u1eed l\u1ea1i sau ~" + minsLeft + " ph\u00fat ho\u1eb7c d\u00f9ng API Key c\u00e1 nh\u00e2n."
    }, corsCheck);
  }
  const rl = rlUid;

  const caps = detectRequestCapabilities(body);
  const loaded = await loadSystemKeyPool();
  const plan = buildServerFailoverPlan(requestedModelId, loaded.pool, caps);

  if (plan.length === 0) {
    const errText = caps.hasPdf
      ? "Hi\u1ec7n kh\u00f4ng c\u00f3 Google Gemini Key h\u1ec7 th\u1ed1ng kh\u1ea3 d\u1ee5ng \u0111\u1ec3 \u0111\u1ecdc PDF scan. Vui l\u00f2ng th\u1eed l\u1ea1i sau ho\u1eb7c nh\u1eadp Gemini API Key c\u00e1 nh\u00e2n."
      : (caps.hasImage
          ? "To\u00e0n b\u1ed9 API Key h\u1ec7 th\u1ed1ng h\u1ed7 tr\u1ee3 \u0111\u1ecdc \u1ea3nh (Vision) \u0111ang b\u1eadn ho\u1eb7c kh\u00f4ng c\u00f3 model Vision kh\u1ea3 d\u1ee5ng. Vui l\u00f2ng th\u1eed l\u1ea1i sau 1 ph\u00fat ho\u1eb7c nh\u1eadp API Key c\u00e1 nh\u00e2n mi\u1ec5n ph\u00ed (Groq / Gemini / OpenRouter)."
          : "H\u1ec7 th\u1ed1ng t\u1ea1m th\u1eddi ch\u01b0a c\u00f3 API Key m\u1eb7c \u0111\u1ecbnh kh\u1ea3 d\u1ee5ng ho\u1eb7c t\u1ea5t c\u1ea3 \u0111ang ngh\u1ec9 ch\u1edd h\u1ed3i quota. Vui l\u00f2ng th\u1eed l\u1ea1i sau \u00edt ph\u00fat ho\u1eb7c nh\u1eadp API Key c\u00e1 nh\u00e2n.");
    return sendJsonWithCors(res, 503, { error: errText }, corsCheck);
  }

  const maxTokensCap = getMaxTokensCap();
  const cooldownMs = getCooldownMs();
  const wantStream = !!(body && body.stream === true);
  const mutations = new Map();
  let lastSanitizedErr = "";

  // Wire client disconnect abort signal cleanly so aborted requests stop upstream immediately
  let clientAborted = false;
  const reqAbortCtrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const onClientClose = function () {
    clientAborted = true;
    if (reqAbortCtrl) {
      try { reqAbortCtrl.abort(); } catch (e) { /* */ }
    }
  };
  if (req && typeof req.on === "function") {
    req.on("close", onClientClose);
    req.on("aborted", onClientClose);
  }

  const cleanupReqListeners = function () {
    if (req && typeof req.removeListener === "function") {
      req.removeListener("close", onClientClose);
      req.removeListener("aborted", onClientClose);
    }
  };

  const bumpMutation = function (entry, fields) {
    const prev = mutations.get(entry.id) || { source: entry.source, usageDelta: 0, errorDelta: 0 };
    if (fields.status) prev.status = fields.status;
    if (typeof fields.cooldownUntil === "number") prev.cooldownUntil = fields.cooldownUntil;
    if (fields.usageDelta) prev.usageDelta += fields.usageDelta;
    if (fields.errorDelta) prev.errorDelta += fields.errorDelta;
    if (fields.lastError !== undefined) prev.lastError = fields.lastError;
    mutations.set(entry.id, prev);
  };

  try {
    for (let i = 0; i < plan.length; i++) {
      if (clientAborted) break;
      const attempt = plan[i];
      const entry = attempt.keyEntry;
      const mInfo = attempt.modelInfo;
      const provInfo = CONFIG.PROVIDER_MAP[mInfo.provider];
      const isGemini = mInfo.provider === "gemini";

      // SECURITY RULE: Never put Gemini key in URL; always send via x-goog-api-key header.
      const upstreamUrl = isGemini
        ? (provInfo.endpoint + encodeURIComponent(mInfo.rawModel) + (wantStream ? ":streamGenerateContent?alt=sse" : ":generateContent"))
        : provInfo.endpoint;

      const upstreamHeaders = { "Content-Type": "application/json" };
      if (isGemini) {
        upstreamHeaders["x-goog-api-key"] = entry.rawKey;
      } else {
        upstreamHeaders["Authorization"] = "Bearer " + entry.rawKey;
      }

      const upstreamBody = isGemini
        ? buildGeminiUpstreamBody(body, maxTokensCap)
        : buildOpenAICompatibleBody(mInfo.rawModel, body, maxTokensCap, wantStream);

      let upRes = null;
      let netFailed = false;
      for (let retry = 0; retry < 2; retry++) {
        if (clientAborted) break;
        const stepCtrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const stepTimer = stepCtrl ? setTimeout(function () { stepCtrl.abort(); }, 52000) : null;
        const forwardAbort = function () { if (stepCtrl) stepCtrl.abort(); };
        if (reqAbortCtrl && reqAbortCtrl.signal) {
          reqAbortCtrl.signal.addEventListener("abort", forwardAbort, { once: true });
        }
        try {
          upRes = await fetch(upstreamUrl, {
            method: "POST",
            headers: upstreamHeaders,
            body: JSON.stringify(upstreamBody),
            signal: stepCtrl ? stepCtrl.signal : undefined
          });
          netFailed = false;
        } catch (netErr) {
          netFailed = true;
          lastSanitizedErr = sanitizeErrorMessage(netErr && netErr.message, loaded.secrets);
        } finally {
          if (stepTimer) clearTimeout(stepTimer);
          if (reqAbortCtrl && reqAbortCtrl.signal) {
            reqAbortCtrl.signal.removeEventListener("abort", forwardAbort);
          }
        }
        if (clientAborted) break;
        if (!netFailed && upRes && upRes.status !== 502 && upRes.status !== 503 && upRes.status !== 504) {
          break;
        }
        if (retry === 0 && !clientAborted) {
          await new Promise(function (r) { setTimeout(r, 400); });
        }
      }

      if (clientAborted) break;
      if (netFailed || !upRes) {
        bumpMutation(entry, { errorDelta: 1, lastError: lastSanitizedErr.slice(0, 140) });
        continue;
      }

      if (upRes.ok) {
        bumpMutation(entry, { status: "healthy", cooldownUntil: 0, usageDelta: 1, lastError: "" });
        await persistKeyStateUpdates(mutations);

        const respHeaders = Object.assign({
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-AI-RateLimit-Remaining": String(rl.remaining),
          "X-AI-RateLimit-Limit": String(rl.limit)
        }, buildCorsHeaders(corsCheck));

        if (attempt.isFallback || mInfo.id !== requestedModelId) {
          respHeaders["X-AI-Fallback-Provider"] = mInfo.provider;
          respHeaders["X-AI-Fallback-Model"] = mInfo.rawModel;
        }

        if (wantStream && upRes.body) {
          respHeaders["Content-Type"] = "text/event-stream; charset=utf-8";
          respHeaders["Connection"] = "keep-alive";
          respHeaders["X-Accel-Buffering"] = "no";
          respHeaders["X-AI-Provider"] = mInfo.provider;
          respHeaders["X-AI-Model"] = mInfo.id;
          res.writeHead(200, respHeaders);
          let reader = null;
          try {
            reader = upRes.body.getReader();
            while (!clientAborted) {
              const chunk = await reader.read();
              if (chunk.done) break;
              if (chunk.value && !clientAborted) res.write(Buffer.from(chunk.value));
            }
          } catch (streamErr) {
            if (!clientAborted) {
              try {
                res.write("event: error\ndata: " + JSON.stringify({ error: sanitizeErrorMessage(streamErr && streamErr.message, loaded.secrets) }) + "\n\n");
              } catch (e) { /* */ }
            }
          } finally {
            if (reader && typeof reader.cancel === "function") {
              try { await reader.cancel(); } catch (e) { /* */ }
            }
            cleanupReqListeners();
          }
          return res.end();
        }

        const data = (typeof upRes.json === "function")
          ? await upRes.json().catch(function () { return {}; })
          : {};
        const normalized = normalizeUpstreamJson(mInfo.provider, data);
        respHeaders["Content-Type"] = "application/json; charset=utf-8";
        res.writeHead(200, respHeaders);
        cleanupReqListeners();
        return res.end(JSON.stringify({
          ok: true,
          provider: normalized.provider,
          model: mInfo.id,
          rawModel: mInfo.rawModel,
          fallbackUsed: attempt.isFallback || mInfo.id !== requestedModelId,
          text: normalized.text,
          candidates: isGemini ? data.candidates : undefined,
          choices: !isGemini ? data.choices : undefined
        }));
      }

      const errJson = (typeof upRes.json === "function")
        ? await upRes.json().catch(function () { return {}; })
        : {};
      const rawMsg = (errJson && errJson.error && errJson.error.message) || ("HTTP " + upRes.status);
      lastSanitizedErr = sanitizeErrorMessage(rawMsg, loaded.secrets);

      if (upRes.status === 429) {
        bumpMutation(entry, {
          status: "cooldown",
          cooldownUntil: Date.now() + cooldownMs,
          errorDelta: 1,
          lastError: "429: " + lastSanitizedErr.slice(0, 140)
        });
        continue;
      }

      const lowerErr = String(lastSanitizedErr || "").toLowerCase();
      const isBadKey400 = upRes.status === 400 && (
        lowerErr.indexOf("api key not valid") !== -1 ||
        lowerErr.indexOf("api_key_invalid") !== -1 ||
        lowerErr.indexOf("invalid api key") !== -1
      );
      if (upRes.status === 401 || upRes.status === 403 || isBadKey400) {
        bumpMutation(entry, {
          status: "invalid",
          cooldownUntil: 0,
          errorDelta: 1,
          lastError: upRes.status + ": Invalid API Key"
        });
        continue;
      }

      bumpMutation(entry, { errorDelta: 1, lastError: lastSanitizedErr.slice(0, 140) });
    }

    await persistKeyStateUpdates(mutations);
    if (clientAborted) {
      return res.end();
    }
    return sendJsonWithCors(res, 503, {
      error: "To\u00e0n b\u1ed9 API Key h\u1ec7 th\u1ed1ng hi\u1ec7n \u0111ang b\u1eadn ho\u1eb7c h\u1ebft h\u1ea1n m\u1ee9c t\u1ea1m th\u1eddi. Vui l\u00f2ng th\u1eed l\u1ea1i sau 1 ph\u00fat ho\u1eb7c nh\u1eadp API Key c\u00e1 nh\u00e2n trong C\u00e0i \u0111\u1eb7t API. (" + sanitizeErrorMessage(lastSanitizedErr, loaded.secrets) + ")"
    }, corsCheck);
  } finally {
    cleanupReqListeners();
  }
}

module.exports = {
  handleAiProxy: handleAiProxy,
  loadSystemKeyPool: loadSystemKeyPool,
  buildServerFailoverPlan: buildServerFailoverPlan
};
