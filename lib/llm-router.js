// LLM fallback router with per-attempt timeout and recoverable-only retry
const DEFAULT_TIMEOUT_MS = 18000;

function parseEnvList(val) {
  return String(val || "")
    .split(/[\r\n,;]+/)
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

function getProviderKeysFromEnv(provider) {
  const keys = [];
  const pushUnique = function (arr) {
    arr.forEach(function (k) {
      if (k && keys.indexOf(k) === -1) keys.push(k);
    });
  };
  if (provider === "gemini") {
    pushUnique(parseEnvList(process.env.GEMINI_API_KEY));
    pushUnique(parseEnvList(process.env.GEMINI_KEY_1));
    pushUnique(parseEnvList(process.env.GEMINI_KEY_2));
    pushUnique(parseEnvList(process.env.DEFAULT_GEMINI_KEYS));
  } else if (provider === "groq") {
    pushUnique(parseEnvList(process.env.GROQ_API_KEY));
    pushUnique(parseEnvList(process.env.DEFAULT_GROQ_KEYS));
  } else if (provider === "openrouter") {
    pushUnique(parseEnvList(process.env.OPENROUTER_API_KEY));
    pushUnique(parseEnvList(process.env.DEFAULT_OPENROUTER_KEYS));
  }
  return keys;
}

const MODEL_CHAIN = [
  { id: "gemini-pro-primary",   provider: "gemini",     model: "gemini-2.5-pro",          keyIndex: 0, supportsVision: true },
  { id: "gemini-flash-key1",    provider: "gemini",     model: "gemini-2.5-flash",        keyIndex: 0, supportsVision: true },
  { id: "gemini-flash-key2",    provider: "gemini",     model: "gemini-2.5-flash",        keyIndex: 1, supportsVision: true },
  { id: "gemini-20-flash-bak",  provider: "gemini",     model: "gemini-2.0-flash",        keyIndex: 0, supportsVision: true },
  { id: "groq-llama-fallback",  provider: "groq",       model: "llama-3.3-70b-versatile", keyIndex: 0, supportsVision: false },
  { id: "openrouter-fallback",  provider: "openrouter", model: "google/gemini-2.5-flash", keyIndex: 0, supportsVision: true }
];

const SAFETY_ERROR_RE = /(SAFETY|PROHIBITED_CONTENT|HARM_CATEGORY|content_policy_violation|BLOCKED_REASON|RECITATION)/i;

function isRecoverableLlmError(status, errorText, isAbortOrTimeout) {
  if (isAbortOrTimeout) return true;
  const txt = String(errorText || "");
  if (SAFETY_ERROR_RE.test(txt)) return false;
  if (status === 400 || status === 422) return false;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  return false;
}

function resolveActiveChain(opts) {
  const o = opts || {};
  const needsVision = !!o.needsVision;
  const customChain = Array.isArray(o.chain) && o.chain.length ? o.chain : MODEL_CHAIN;
  const active = [];
  for (let i = 0; i < customChain.length; i++) {
    const slot = customChain[i];
    if (needsVision && slot.supportsVision === false) continue;
    const apiKey = slot.apiKey || getProviderKeysFromEnv(slot.provider)[slot.keyIndex || 0];
    if (!apiKey) continue;
    active.push(Object.assign({}, slot, { apiKey: apiKey }));
  }
  return active;
}

function buildProviderRequest(slot, payload) {
  const stream = !!(payload && payload.stream);
  const messages = Array.isArray(payload && payload.messages) ? payload.messages : [];
  const systemText = String((payload && payload.system) || "").trim();
  const maxTokens = Number((payload && payload.maxTokens) || 4096);

  if (slot.provider === "gemini") {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(slot.model) + (stream ? ":streamGenerateContent?alt=sse" : ":generateContent");
    const contents = messages.map(function (m) {
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "") }]
      };
    });
    const body = {
      contents: contents,
      generationConfig: { maxOutputTokens: maxTokens }
    };
    if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };
    return {
      url: url,
      headers: { "Content-Type": "application/json", "x-goog-api-key": slot.apiKey },
      body: body
    };
  }

  const endpoint = slot.provider === "groq"
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const oaiMessages = [];
  if (systemText) oaiMessages.push({ role: "system", content: systemText });
  messages.forEach(function (m) {
    oaiMessages.push({ role: m.role === "model" ? "assistant" : (m.role || "user"), content: String(m.content || "") });
  });
  return {
    url: endpoint,
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + slot.apiKey },
    body: { model: slot.model, messages: oaiMessages, max_tokens: maxTokens, stream: stream }
  };
}

/**
 * Execute an LLM request with strict per-attempt AbortController timeout and
 * recoverable-only fallback across MODEL_CHAIN.
 * For streaming (payload.stream === true), verifies HTTP 200 + readable body
 * during the initial handshake before returning `{ ok, response, slot }` to pipe.
 */
async function callWithFallback(payload, opts) {
  const o = opts || {};
  const timeoutMs = Number(o.timeoutMs || process.env.LLM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const fetchImpl = o.fetchImpl || global.fetch;
  const activeChain = resolveActiveChain(o);
  if (!activeChain.length) {
    const err = new Error("No LLM API keys configured in MODEL_CHAIN.");
    err.status = 503;
    err.code = "NO_LLM_KEYS";
    throw err;
  }

  const errors = [];
  for (let i = 0; i < activeChain.length; i++) {
    const slot = activeChain[i];
    const reqSpec = buildProviderRequest(slot, payload);
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs) : null;

    try {
      const resp = await fetchImpl(reqSpec.url, {
        method: "POST",
        headers: reqSpec.headers,
        body: JSON.stringify(reqSpec.body),
        signal: ctrl ? ctrl.signal : undefined
      });
      if (timer) clearTimeout(timer);

      if (resp && resp.ok) {
        if (payload && payload.stream) {
          // Handshake verified before piping stream to client
          return { ok: true, stream: true, response: resp, slot: slot, attempts: i + 1 };
        }
        const data = await resp.json();
        return { ok: true, stream: false, data: data, slot: slot, attempts: i + 1 };
      }

      const status = resp ? resp.status : 502;
      const errTxt = resp && typeof resp.text === "function" ? (await resp.text().catch(function () { return ""; })) : "";
      if (!isRecoverableLlmError(status, errTxt, false)) {
        const fatal = new Error("Non-recoverable LLM error (HTTP " + status + "): " + errTxt.slice(0, 240));
        fatal.status = status;
        fatal.recoverable = false;
        fatal.slot = slot.id;
        throw fatal;
      }
      errors.push(slot.id + " -> HTTP " + status);
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err && err.recoverable === false) throw err;
      const isTimeout = Boolean(err && (err.name === "AbortError" || /abort|timeout/i.test(err.message || "")));
      if (!isRecoverableLlmError(err && err.status, err && err.message, isTimeout)) {
        throw err;
      }
      errors.push(slot.id + " -> " + (isTimeout ? ("Timeout(" + timeoutMs + "ms)") : ((err && err.message) || "Network error")));
    }
  }

  const exhausted = new Error("All MODEL_CHAIN providers failed: " + errors.join(" | "));
  exhausted.status = 503;
  exhausted.code = "ALL_PROVIDERS_FAILED";
  exhausted.attempts = errors;
  throw exhausted;
}

module.exports = {
  MODEL_CHAIN: MODEL_CHAIN,
  DEFAULT_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
  isRecoverableLlmError: isRecoverableLlmError,
  resolveActiveChain: resolveActiveChain,
  callWithFallback: callWithFallback
};
