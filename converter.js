/* ============================================================
   AI Tutor – AI Converter, Split-Screen Review & API Settings (converter.js)
   ============================================================ */
(function () {
  "use strict";

  /* Single reusable Master Prompt constant (V3.3 Section 2.4)
     Used identically for both LLM systemInstruction and Manual Fallback Modal. */
  const CONVERTER_MASTER_PROMPT = [
    "# ROLE",
    "",
    "You are a High-Precision Educational Content Digitizer. Convert 100% of the input document into structured Markdown (`.md`) for automated frontend parsing.",
    "",
    "# CORE RULES",
    "",
    "## 1. Accuracy & Completeness",
    "",
    "- Extract every question, instruction, table, and passage verbatim.",
    "- Never summarize, truncate with `...`, or fabricate content.",
    "- Follow multi-column order: left-to-right, top-to-bottom.",
    "- Merge split questions and passages across page breaks.",
    "- Remove OCR noise, watermarks, ads, page numbers, and repeating headers/footers without deleting real content.",
    "- Fix only obvious OCR errors; preserve intentional grammar/spelling errors in Error Identification exercises.",
    "- Mark illegible content as `[CHECK: uncertain_text]`.",
    "",
    "## 2. Instructions & Shared Context",
    "",
    "- Every question group starts with `:::instruction` containing its exact instruction.",
    "- If no explicit instruction exists, infer a concise `[Yêu cầu: ...]` only when unambiguous.",
    "- Put shared Reading passages, Cloze texts, Literature excerpts, tables, and transcripts in `:::context`.",
    "- Assign unique IDs such as `CTX_1` and correct question ranges.",
    "- Place context before its first question.",
    "- Tag every child question with `[context: CTX_1]`.",
    "- Format Cloze blanks as `**(1) _____**`.",
    "",
    "## 3. Multi-Subject Formatting",
    "",
    "- Math/Science: use LaTeX (`$...$` inline, `$$...$$` block).",
    "- Languages: preserve underlined text using `<u>text</u>` and bold using `**text**`.",
    "- Preserve Furigana/Pinyin when present.",
    "- Use Markdown tables and fenced code blocks (use `~~~~lang` for inner code blocks so the outer ` ```markdown ` fence never breaks).",
    "- Describe diagrams as `[IMAGE: concise visual description]`.",
    "",
    "Supported types:",
    "",
    "`MCQ`, `TF_GROUP`, `SHORT_ANSWER`, `ORDERING`, `ESSAY`.",
    "",
    "## 4. Answers & Document Modes",
    "",
    "- Map answer keys and explanations directly from the source.",
    "- If no answer key exists, leave it empty unless `[AUTO_SOLVE=TRUE]`.",
    "- Never invent answer keys.",
    "- Split multi-exam files using `# ĐỀ SỐ X`; reset numbering to `Câu 1`.",
    "- For notes without questions, use structured headings, bullets, and LaTeX; set `mode: \"STUDY_NOTE\"`.",
    "- For empty, corrupt, or non-educational input, output only:",
    "",
    "`ERROR_INVALID_CONTENT: <concise reason>`",
    "",
    "## 5. Output Packaging, `.md` File Export & Discipline",
    "",
    "- **Downloadable `.md` File First (If Supported):** If your environment supports creating or exporting downloadable files (e.g., Python/Code Interpreter file creation or Canvas/Artifact export), save the complete standardized output as a downloadable `.md` file named `<sanitized_title>.md` AND also provide the raw Markdown code block below.",
    "- **Mandatory Single Raw ` ```markdown ` Code Block Wrapper:** ALWAYS wrap the entire standardized output inside ONE single fenced code block starting with ` ```markdown ` and ending with ` ``` ` (escape any inner code blocks with `~~~~` so the outer block never breaks). NEVER output un-fenced Markdown directly into the chat stream, because chat interfaces visually render un-fenced Markdown and strip raw symbols (`###`, `>`, `**`) when copied.",
    "- No greeting, introduction, commentary, or conclusion.",
    "- Do not repeat the title unnecessarily.",
    "",
    "## 6. OUTPUT TEMPLATE – STRICT PARSER CONTRACT",
    "",
    "Replace all placeholders with actual extracted content. Never output the placeholders themselves.",
    "",
    "---",
    "title: \"<Document/Exam Title>\"",
    "subject: \"<Subject>\"",
    "mode: \"<EXAM | STUDY_NOTE>\"",
    "total_questions: <Number of questions, 0 if STUDY_NOTE>",
    "duration_minutes: <Estimated or stated duration>",
    "---",
    "",
    "## <Section Name if applicable>",
    "",
    ":::instruction",
    "**<Verbatim instruction for the question group>**",
    ":::",
    "",
    ":::context [id=\"CTX_1\" questions=\"1-5\"]",
    "<100% verbatim shared reading passage / data table / transcript>",
    ":::",
    "",
    "### Câu 1 `[type: MCQ]` `[context: CTX_1]` `[level: Nhận biết|Thông hiểu|Vận dụng|Vận dụng cao]` `[tag: #Topic]`",
    "",
    "<Question stem>",
    "",
    "- **A.** <Option A>",
    "- **B.** <Option B>",
    "- **C.** <Option C>",
    "- **D.** <Option D>",
    "",
    "> **Đáp án:** <Answer key if present in source>",
    "",
    "### Câu 2 `[type: TF_GROUP]` `[level: Thông hiểu]` `[tag: #Topic]`",
    "",
    "<Main question stem>",
    "",
    "- **a)** <Statement a>",
    "- **b)** <Statement b>",
    "- **c)** <Statement c>",
    "- **d)** <Statement d>",
    "",
    "> **Đáp án:** <a: Đ/S | b: Đ/S | c: Đ/S | d: Đ/S>",
    "",
    "### Câu 3 `[type: SHORT_ANSWER]` `[level: Vận dụng]` `[tag: #Topic]`",
    "",
    "<Short answer / sentence transformation prompt>",
    "",
    "> **Đáp án:** <Concise answer>",
    "",
    "### Câu 4 `[type: ORDERING]` `[level: Vận dụng]` `[tag: #Topic]`",
    "",
    "<Ordering prompt and items>",
    "",
    "> **Đáp án:** <Correct order if present in source>",
    "",
    "### Câu 5 `[type: ESSAY]` `[level: Vận dụng cao]` `[tag: #Topic]`",
    "",
    "<Essay prompt>",
    "",
    "> **Đáp án:** <Answer if present in source>"
  ].join("\n");

  if (typeof window !== "undefined" && window.AIDigitizer) {
    window.AIDigitizer.MASTER_SYSTEM_PROMPT = CONVERTER_MASTER_PROMPT;
  }

  const SAMPLE_ROWS = [
    ["T\u00ednh gi\u1edbi h\u1ea1n $L = \\lim_{x \\to 0} \\frac{\\sin 3x}{x}$:", "Multiple Choice", "1", "3", "$\\frac{1}{3}$", "0", "", "2", 30, "", "\u00c1p d\u1ee5ng $\\lim_{u \\to 0} \\frac{\\sin u}{u} = 1$, ta c\u00f3 $L = 3$."],
    ["Choose the word whose underlined part differs from the other three in pronunciation:", "Multiple Choice", "biom<u>a</u>ss", "a<u>c</u>tivity", "effi<u>c</u>ient", "<u>a</u>lthough", "", "1", 30, "", "Ph\u1ea7n g\u1ea1ch ch\u00e2n \u1edf <b>biomass</b> ph\u00e1t \u00e2m kh\u00e1c c\u00e1c ph\u01b0\u01a1ng \u00e1n c\u00f2n l\u1ea1i."],
    ["Nh\u1eefng s\u1ed1 n\u00e0o sau \u0111\u00e2y l\u00e0 s\u1ed1 nguy\u00ean t\u1ed1? (Ch\u1ecdn t\u1ea5t c\u1ea3 \u0111\u00e1p \u00e1n \u0111\u00fang)", "Checkbox", "2", "4", "5", "9", "", "1,3", 45, "", "2 v\u00e0 5 l\u00e0 s\u1ed1 nguy\u00ean t\u1ed1."]
  ];

  const cState = {
    viewMode: "digitizer",  // digitizer | table | split
    files: [],              // unified queue: { id, file, name, size, kind, ext, url, width, height }
    images: [],             // image items synced from files (used by Split-Screen Review)
    activeImgIdx: 0,
    imgZoom: 100,
    pasteText: "",          // optional quick-paste text/markdown
    questions: [],          // { id, number, qType, text, type, options[5], correct[], tfStatements[], tfAnswers{}, answerText, contextId, instruction, section, level, tag, time, image, explanation, verified, suspect, checkNote }
    docMeta: { title: "", subject: "", mode: "EXAM", total_questions: 0, duration_minutes: 45 },
    contexts: {},           // id -> { id, questions, content }
    pinnedContextId: "",
    studyNoteMarkdown: "",
    rawMarkdown: "",
    streamingTail: "",
    chunkStates: [],        // [{ index, label, status: 'pending'|'streaming'|'done'|'error', error, chunk, markdown, isVision, b64List }]
    userAnswers: {},        // q.id -> { mcq: idx, tf: {a:'T'|'F',...}, short: '', essay: '', showGuide: false }
    explainCache: {},       // hash -> explanation string (persisted in localStorage)
    explainingId: "",
    ttftMs: 0,
    filter: "all",          // all | unverified | suspect | missing
    search: "",
    page: 1,
    perPage: 20,
    subject: "auto",
    ansFormat: "number",
    defaultTime: 30,
    scope: "all",
    splitSize: 0,
    keepLatex: true,
    keepHtml: true,
    autoSolve: false,       // Default FALSE: extract only (~65% token savings, 3x faster)
    autoExport: false,
    appendMode: false,
    keepPrefix: false,
    busy: false,
    abortCtrl: null,
    progressLabel: "",
    progressPct: 0,
    steps: [],              // [{ id, label, status: 'pending'|'active'|'done'|'skip' }]
    lastSummary: "",
    apiStatus: "none",      // none | saved | ok | error
    apiStatusMsg: "",
    mounted: false,
    apiMounted: false,
    disclaimerDismissed: false,
    activeProvTab: "",
    testResults: null,
    fallbackToastShownFor: "",
    adminVerifyToken: "",
    adminVerifyState: "idle", // idle | loading | verified | denied
    adminSysKeys: [],
    adminSysEnvKeys: [],
    adminSysPreview: null,
    adminSysRawDraft: "",
    adminSysBusy: false,
    adminSysError: "",
    adminSysEncReady: false
  };

  const EXPLAIN_CACHE_KEY = "uet_master_ai_explain_cache_v1";
  function D() { return (typeof window !== "undefined" && window.AIDigitizer) ? window.AIDigitizer : null; }
  function loadExplainCache() {
    try {
      const raw = localStorage.getItem(EXPLAIN_CACHE_KEY);
      if (raw) cState.explainCache = JSON.parse(raw) || {};
    } catch (e) { cState.explainCache = {}; }
  }
  function saveExplainCache() {
    try { localStorage.setItem(EXPLAIN_CACHE_KEY, JSON.stringify(cState.explainCache)); } catch (e) { /* */ }
  }
  loadExplainCache();

  const API_POOL_KEY = "uet_master_api_pool";
  const PERSONAL_KEYS_V2 = "uet_master_personal_keys_v2";
  const LEGACY_USER_APIS_KEY = "uet_master_user_apis";
  const SYSTEM_PROXY_SENTINEL = "__SYSTEM_PROXY__";
  const PERSONAL_POOL_SENTINEL = "__PERSONAL_POOL__";
  const PROVIDER_ORDER = ["groq", "openrouter", "gemini", "openai", "deepseek"];

  function CFG() {
    return (typeof window !== "undefined" && window.AI_PROVIDERS_CONFIG) ? window.AI_PROVIDERS_CONFIG : null;
  }

  const FALLBACK_PROVIDER_INFO = {
    gemini: { name: "Google AI Studio (Gemini)", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/", testEndpoint: "https://generativelanguage.googleapis.com/v1beta/models", prefixHint: "AIza... / AQ....", keyUrl: "https://aistudio.google.com/apikey", models: [{ id: "gemini-3.5-flash-lite", rawModel: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", vision: true, pdf: true, free: true }] },
    groq: { name: "Groq Cloud", endpoint: "https://api.groq.com/openai/v1/chat/completions", testEndpoint: "https://api.groq.com/openai/v1/models", prefixHint: "gsk_...", keyUrl: "https://console.groq.com/keys", models: [{ id: "groq:qwen/qwen3.6-27b", rawModel: "qwen/qwen3.6-27b", label: "Groq Qwen 3.6 27B (Mi\u1ec5n ph\u00ed & Vision)", vision: true, pdf: false, free: true }] },
    openrouter: { name: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", testEndpoint: "https://openrouter.ai/api/v1/key", prefixHint: "sk-or-...", keyUrl: "https://openrouter.ai/keys", models: [{ id: "openrouter:openrouter/free", rawModel: "openrouter/free", label: "OpenRouter Auto Free Router (:free & Vision)", vision: true, pdf: false, free: true }] },
    openai: { name: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", testEndpoint: "https://api.openai.com/v1/models", prefixHint: "sk-...", keyUrl: "https://platform.openai.com/api-keys", models: [{ id: "openai:gpt-4.1-mini", rawModel: "gpt-4.1-mini", label: "OpenAI GPT-4.1 Mini (Vision)", vision: true, pdf: false, free: false }] },
    deepseek: { name: "DeepSeek", endpoint: "https://api.deepseek.com/chat/completions", testEndpoint: "https://api.deepseek.com/models", prefixHint: "sk-...", keyUrl: "https://platform.deepseek.com/api_keys", models: [{ id: "deepseek:deepseek-chat", rawModel: "deepseek-chat", label: "DeepSeek Chat V3", vision: false, pdf: false, free: false }] }
  };

  function getProviderMap() {
    const c = CFG();
    return (c && c.PROVIDER_MAP) ? c.PROVIDER_MAP : FALLBACK_PROVIDER_INFO;
  }

  function getProvidersList() {
    const c = CFG();
    if (c && Array.isArray(c.PROVIDERS)) return c.PROVIDERS;
    return PROVIDER_ORDER.map(function (id) { return Object.assign({ id: id }, FALLBACK_PROVIDER_INFO[id]); });
  }

  function detectProviderFromModel(modelId) {
    const m = String(modelId || "").trim().toLowerCase();
    if (m.indexOf("groq:") === 0) return "groq";
    if (m.indexOf("openai:") === 0) return "openai";
    if (m.indexOf("openrouter:") === 0) return "openrouter";
    if (m.indexOf("deepseek:") === 0) return "deepseek";
    return "gemini";
  }

  function detectProviderFromKey(rawKey, fallbackProvider) {
    const s = String(rawKey || "").trim();
    if (!s) return fallbackProvider || "gemini";
    const prefMatch = s.match(/^(gemini|groq|openai|openrouter|deepseek)\s*:\s*(.+)$/i);
    if (prefMatch) return prefMatch[1].toLowerCase();
    if (/^AIza/i.test(s)) return "gemini";
    if (/^gsk_/i.test(s)) return "groq";
    if (/^sk-or-/i.test(s)) return "openrouter";
    if (/^sk-proj-/i.test(s)) return "openai";
    if (/^sk-/i.test(s)) return fallbackProvider === "deepseek" ? "deepseek" : "openai";
    return fallbackProvider || "gemini";
  }

  function cleanRawKeyValue(rawKey) {
    const s = String(rawKey || "").trim();
    const prefMatch = s.match(/^(?:gemini|groq|openai|openrouter|deepseek)\s*:\s*(.+)$/i);
    return prefMatch ? prefMatch[1].trim() : s;
  }

  function validateProviderKeyFormat(provider, rawKey) {
    const c = CFG();
    if (c && typeof c.validateKeyFormat === "function") {
      return c.validateKeyFormat(provider, rawKey);
    }
    const k = String(rawKey || "").trim();
    if (!k) return { valid: false, reason: "Tr\u1ed1ng" };
    return { valid: true, reason: "S\u1eb5n s\u00e0ng (ki\u1ec3m tra tr\u1ef1c ti\u1ebfp qua API)" };
  }

  function maskKeyPreview(k) {
    const s = String(k || "").trim();
    if (!s) return "";
    if (s.length <= 10) return s.slice(0, 2) + "\u2022\u2022\u2022\u2022" + s.slice(-2);
    return s.slice(0, 6) + "\u2022\u2022\u2022\u2022\u2022\u2022" + s.slice(-4);
  }

  function U() { return window.UET; }

  function getUserIdToken() {
    try {
      const u = U() && U().state && U().state.user;
      return (u && u.credential) ? String(u.credential).trim() : "";
    } catch (e) { return ""; }
  }

  function emptyPersonalStore() {
    return {
      activeProvider: "groq",
      keysByProvider: { groq: [], openrouter: [], gemini: [], openai: [], deepseek: [] }
    };
  }

  function parseTextListToKeys(rawText) {
    const out = [];
    const seen = {};
    String(rawText || "").split(/[\r\n,;]+/).forEach(function (part) {
      const cleaned = cleanRawKeyValue(part);
      if (!cleaned || cleaned.startsWith("#")) return;
      if (seen[cleaned]) return;
      seen[cleaned] = true;
      out.push(cleaned);
    });
    return out;
  }

  function savePersonalKeyStore(store) {
    const clean = emptyPersonalStore();
    clean.activeProvider = PROVIDER_ORDER.indexOf(store && store.activeProvider) !== -1 ? store.activeProvider : "groq";
    PROVIDER_ORDER.forEach(function (p) {
      const arr = (store && store.keysByProvider && Array.isArray(store.keysByProvider[p])) ? store.keysByProvider[p] : [];
      const seen = {};
      arr.forEach(function (k) {
        const v = cleanRawKeyValue(k);
        if (v && !seen[v]) {
          seen[v] = true;
          clean.keysByProvider[p].push(v);
        }
      });
    });
    try {
      const hasAny = PROVIDER_ORDER.some(function (p) { return clean.keysByProvider[p].length > 0; });
      if (hasAny || clean.activeProvider !== "groq") {
        localStorage.setItem(PERSONAL_KEYS_V2, JSON.stringify(clean));
      } else {
        localStorage.removeItem(PERSONAL_KEYS_V2);
      }
      localStorage.removeItem(API_POOL_KEY);
      if (U() && U().KEYS && U().KEYS.apiKey) localStorage.removeItem(U().KEYS.apiKey);
      localStorage.removeItem(LEGACY_USER_APIS_KEY);
    } catch (e) { /* */ }
    if (U() && typeof U().updateChrome === "function") U().updateChrome();
    return clean;
  }

  function loadPersonalKeyStore() {
    // Scrub any legacy raw admin-assigned key cache on client (zero client exposure)
    try { localStorage.removeItem(LEGACY_USER_APIS_KEY); } catch (e) { /* */ }
    try {
      const raw = localStorage.getItem(PERSONAL_KEYS_V2);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.keysByProvider) {
          const out = emptyPersonalStore();
          out.activeProvider = PROVIDER_ORDER.indexOf(parsed.activeProvider) !== -1 ? parsed.activeProvider : "groq";
          PROVIDER_ORDER.forEach(function (p) {
            if (Array.isArray(parsed.keysByProvider[p])) {
              out.keysByProvider[p] = parsed.keysByProvider[p].map(cleanRawKeyValue).filter(Boolean);
            }
          });
          return out;
        }
      }
    } catch (e) { /* */ }

    // One-time migration from legacy browser-local single key & multi-key pool
    const migrated = emptyPersonalStore();
    let foundLegacy = false;
    try {
      const legacyPrimary = (U() && U().KEYS && U().KEYS.apiKey) ? (localStorage.getItem(U().KEYS.apiKey) || "").trim() : "";
      const legacyPool = (localStorage.getItem(API_POOL_KEY) || "").trim();
      const defProv = detectProviderFromModel(getApiModel());
      const pushTok = function (tok) {
        const p = detectProviderFromKey(tok, defProv);
        const k = cleanRawKeyValue(tok);
        if (!k || PROVIDER_ORDER.indexOf(p) === -1) return;
        if (migrated.keysByProvider[p].indexOf(k) === -1) {
          migrated.keysByProvider[p].push(k);
          migrated.activeProvider = p;
          foundLegacy = true;
        }
      };
      if (legacyPrimary) legacyPrimary.split(/[\r\n,;]+/).forEach(pushTok);
      if (legacyPool) legacyPool.split(/[\r\n,;]+/).forEach(pushTok);
      if (foundLegacy) savePersonalKeyStore(migrated);
    } catch (e) { /* */ }
    return migrated;
  }

  function hasPersonalKeys() {
    const store = loadPersonalKeyStore();
    return PROVIDER_ORDER.some(function (p) { return store.keysByProvider[p].length > 0; });
  }

  function countPersonalKeys() {
    const store = loadPersonalKeyStore();
    let total = 0;
    PROVIDER_ORDER.forEach(function (p) { total += store.keysByProvider[p].length; });
    return total;
  }

  function getPersonalApiKey() {
    const store = loadPersonalKeyStore();
    for (let i = 0; i < PROVIDER_ORDER.length; i++) {
      const p = PROVIDER_ORDER[i];
      if (store.keysByProvider[p].length > 0) return store.keysByProvider[p][0];
    }
    return "";
  }

  function getApiKey() {
    if (hasPersonalKeys()) return PERSONAL_POOL_SENTINEL;
    if (getUserIdToken()) return SYSTEM_PROXY_SENTINEL;
    return "";
  }

  function getApiModel() {
    const c = CFG();
    const defModel = (c && c.DEFAULT_MODEL_ID) ? c.DEFAULT_MODEL_ID : "gemini-3.5-flash-lite";
    try {
      const saved = localStorage.getItem(U().KEYS.apiModel);
      if (saved && (!c || !c.ALLOWED_MODELS || c.ALLOWED_MODELS[saved])) return saved;
    } catch (e) { /* */ }
    return defModel;
  }

  function setApiModel(m) {
    cState.activeFallbackModel = "";
    try { localStorage.setItem(U().KEYS.apiModel, m); } catch (e) { /* */ }
  }

  function parseKeyPoolItems(primaryKeyHint, preferredModelHint) {
    const defProvider = detectProviderFromModel(preferredModelHint || getApiModel());
    const store = loadPersonalKeyStore();
    const out = [];
    const seen = {};

    const addItem = function (prov, key) {
      const p = PROVIDER_ORDER.indexOf(prov) !== -1 ? prov : defProvider;
      const k = cleanRawKeyValue(key);
      if (!k || k === SYSTEM_PROXY_SENTINEL || k === PERSONAL_POOL_SENTINEL) return;
      const sig = p + ":" + k;
      if (seen[sig]) return;
      seen[sig] = true;
      out.push({ provider: p, apiKey: k });
    };

    if (primaryKeyHint && primaryKeyHint !== SYSTEM_PROXY_SENTINEL && primaryKeyHint !== PERSONAL_POOL_SENTINEL) {
      String(primaryKeyHint).split(/[\r\n,;]+/).forEach(function (tok) {
        const t = tok.trim();
        if (t && !t.startsWith("#")) addItem(detectProviderFromKey(t, defProvider), t);
      });
    }

    PROVIDER_ORDER.forEach(function (p) {
      (store.keysByProvider[p] || []).forEach(function (k) { addItem(p, k); });
    });
    return out;
  }

  function dateStamp() {
    const d = new Date();
    return String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear();
  }

  function requireApiKey() {
    if (hasPersonalKeys()) return PERSONAL_POOL_SENTINEL;
    if (getUserIdToken()) return SYSTEM_PROXY_SENTINEL;
    U().showToast("Vui l\u00f2ng \u0111\u0103ng nh\u1eadp Google (\u0111\u1ec3 d\u00f9ng System AI mi\u1ec5n ph\u00ed) ho\u1eb7c nh\u1eadp API Key c\u00e1 nh\u00e2n t\u1ea1i C\u00e0i \u0111\u1eb7t API.", "warning", {
      label: "\u0110i t\u1edbi C\u00e0i \u0111\u1eb7t API",
      onClick: function () { U().showTab("api"); }
    });
    return null;
  }

  /* ======================== API & LANGUAGE SETTINGS PAGE ======================== */
  function buildValidationChipsHtml(provider, rawText) {
    const keys = parseTextListToKeys(rawText);
    if (keys.length === 0) {
      return '<span class="muted" style="font-size:.76rem">Ch\u01b0a nh\u1eadp Key n\u00e0o cho h\u00e3ng n\u00e0y.</span>';
    }
    return keys.map(function (k, idx) {
      const check = validateProviderKeyFormat(provider, k);
      const cls = check.valid ? "key-val-chip ok" : "key-val-chip bad";
      const icon = check.valid ? "✅" : "⚠️";
      return '<span class="' + cls + '" title="' + U().esc(check.reason) + '">' +
        icon + ' #' + (idx + 1) + ' <code>' + U().esc(maskKeyPreview(k)) + '</code> — ' + U().esc(check.reason) +
      '</span>';
    }).join("");
  }

  function syncActiveTextareaToStore(store) {
    const ta = U().$("uetProvKeyTextarea");
    const prov = cState.activeProvTab || store.activeProvider || "groq";
    if (ta) {
      store.keysByProvider[prov] = parseTextListToKeys(ta.value);
    }
    return store;
  }

  async function converterAdminApiFetch(url, method, bodyObj) {
    const token = getUserIdToken();
    if (!token) return { _err: "Thi\u1ebfu ph\u00ean \u0111\u0103ng nh\u1eadp Google.", _status: 401 };
    try {
      const res = await fetch(url, {
        method: method || "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined
      });
      const ct = String((res.headers && res.headers.get && res.headers.get("content-type")) || "").toLowerCase();
      if (ct.indexOf("application/json") === -1) {
        return { _err: "M\u00e1y ch\u1ee7 API kh\u00f4ng kh\u1ea3 d\u1ee5ng (HTTP " + res.status + ").", _status: res.status };
      }
      const data = await res.json().catch(function () { return null; });
      if (!res.ok) {
        return { _err: (data && data.error) || ("HTTP " + res.status), _status: res.status, data: data };
      }
      return { ok: true, data: data };
    } catch (err) {
      return { _err: (err && err.message) || "L\u1ed7i k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7.", _status: 0 };
    }
  }

  async function refreshSectionBSystemKeys() {
    if (cState.adminVerifyState !== "verified") return;
    const resp = await converterAdminApiFetch("/api/admin/system-keys", "GET");
    if (resp && resp.ok && resp.data) {
      cState.adminSysKeys = Array.isArray(resp.data.keys) ? resp.data.keys : [];
      cState.adminSysEnvKeys = Array.isArray(resp.data.envKeys) ? resp.data.envKeys : [];
      cState.adminSysEncReady = !!resp.data.encryptionConfigured;
      cState.adminSysError = "";
    } else if (resp && resp._err) {
      cState.adminSysError = resp._err;
    }
    if (U().state && U().state.tab === "api") renderApiPage();
  }

  async function verifyServerAdminForApiPage() {
    const token = getUserIdToken();
    if (!token) {
      cState.adminVerifyToken = "";
      cState.adminVerifyState = "denied";
      cState.adminSysKeys = [];
      cState.adminSysEnvKeys = [];
      return;
    }
    if (cState.adminVerifyToken === token && (cState.adminVerifyState === "verified" || cState.adminVerifyState === "denied" || cState.adminVerifyState === "loading")) {
      return;
    }
    cState.adminVerifyToken = token;
    cState.adminVerifyState = "loading";
    cState.adminSysKeys = [];
    cState.adminSysEnvKeys = [];
    const check = await converterAdminApiFetch("/api/admin/me", "GET");
    if (getUserIdToken() !== token) return;
    if (check && check.ok && check.data && check.data.isAdmin === true) {
      cState.adminVerifyState = "verified";
      await refreshSectionBSystemKeys();
    } else {
      cState.adminVerifyState = "denied";
      cState.adminSysKeys = [];
      cState.adminSysEnvKeys = [];
    }
  }

  function openTypedDeleteAllModal(keyCount, onConfirm) {
    const host = U().$("extraModals");
    if (!host) return;
    const countLabel = String(Number(keyCount) || 0);
    host.innerHTML =
      '<div class="modal-overlay" id="typedDeleteAllOverlay" role="alertdialog" aria-modal="true" aria-labelledby="typedDeleteAllTitle">' +
        '<div class="modal modal-sm">' +
          '<h3 id="typedDeleteAllTitle" style="color:var(--rose)">⚠️ X\u00f3a to\u00e0n b\u1ed9 Key H\u1ec7 th\u1ed1ng</h3>' +
          '<p style="font-size:.86rem;line-height:1.55;margin:0 0 8px">B\u1ea1n s\u1eafp x\u00f3a v\u0129nh vi\u1ec5n to\u00e0n b\u1ed9 <strong>' + U().esc(countLabel) + ' API Key H\u1ec7 th\u1ed1ng</strong> \u0111ang l\u01b0u tr\u00ean m\u00e1y ch\u1ee7. Thao t\u00e1c n\u00e0y kh\u00f4ng th\u1ec3 ho\u00e0n t\u00e1c v\u00e0 s\u1ebd \u0111\u01b0\u1ee3c ghi v\u00e0o nh\u1eadt k\u00fd qu\u1ea3n tr\u1ecb.</p>' +
          '<label class="field" style="margin:8px 0 12px">Nh\u1eadp ch\u00ednh x\u00e1c <code>XOA</code> \u0111\u1ec3 b\u1eadt n\u00fat x\u00e1c nh\u1eadn:' +
            '<input type="text" id="typedDeleteAllInput" class="typed-confirm-input" autocomplete="off" spellcheck="false" placeholder="Nh\u1eadp XOA">' +
          '</label>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-outline" id="typedDeleteAllCancel">H\u1ee7y</button>' +
            '<button type="button" class="btn btn-danger" id="typedDeleteAllOk" disabled>X\u00e1c nh\u1eadn x\u00f3a to\u00e0n b\u1ed9 (' + U().esc(countLabel) + ' Key)</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    const inp = U().$("typedDeleteAllInput");
    const okBtn = U().$("typedDeleteAllOk");
    const cancelBtn = U().$("typedDeleteAllCancel");
    const closeModal = function () { host.innerHTML = ""; };
    if (inp) {
      inp.focus();
      inp.addEventListener("input", function () {
        if (okBtn) okBtn.disabled = inp.value.trim().toUpperCase() !== "XOA";
      });
    }
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (okBtn) {
      okBtn.addEventListener("click", function () {
        if (!inp || inp.value.trim().toUpperCase() !== "XOA") return;
        closeModal();
        if (typeof onConfirm === "function") onConfirm();
      });
    }
    if (typeof U().applyI18n === "function") U().applyI18n(host);
  }

  function renderSectionBAdminHtml() {
    // STRICT SECURITY UX RULE: Render NOTHING AT ALL for non-admins or while verifying with server!
    const token = getUserIdToken();
    if (!token || cState.adminVerifyToken !== token || cState.adminVerifyState !== "verified") {
      return "";
    }
    const dbKeys = cState.adminSysKeys || [];
    const envKeys = cState.adminSysEnvKeys || [];
    const allKeys = dbKeys.concat(envKeys);

    let previewHtml = "";
    if (cState.adminSysPreview) {
      const p = cState.adminSysPreview;
      const provSummary = Object.keys(p.summaryByProvider || {})
        .filter(function (k) { return p.summaryByProvider[k] > 0; })
        .map(function (k) { return k + ": " + p.summaryByProvider[k]; })
        .join(" \u2022 ") || "0";
      const accArr = Array.isArray(p.summaryByAccount)
        ? p.summaryByAccount
        : Object.keys(p.summaryByAccount || {}).map(function (k) { return { accountLabel: k, count: p.summaryByAccount[k] }; });
      const accSummary = accArr.map(function (a) { return U().esc(a.accountLabel) + " (" + a.count + ")"; }).join(" \u2022 ");
      const itemsHtml = (p.previewItems || []).map(function (it) {
        return '<li><strong>' + U().esc(it.accountLabel) + '</strong> \u2014 <code>' + U().esc(it.provider) + '</code>: <code>' + U().esc(it.maskedKey) + '</code></li>';
      }).join("");
      const dupHtml = (p.duplicates && p.duplicates.length)
        ? '<div class="muted" style="font-size:.76rem;margin-top:4px">🔁 Tr\u00f9ng l\u1eb7p b\u1ecf qua: ' + p.duplicates.length + '</div>'
        : "";
      const skipHtml = (p.skipped && p.skipped.length)
        ? '<div class="muted" style="font-size:.76rem;margin-top:4px">⏭️ D\u00f2ng tr\u1ed1ng b\u1ecf qua: ' + p.skipped.length + '</div>'
        : "";

      previewHtml =
        '<div class="syskey-preview-box" id="sysSecPreviewBox">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
            '<strong>📋 Xem tr\u01b0\u1edbc (Preview): ' + p.totalValid + ' Key h\u1ee3p l\u1ec7 s\u1eb5n s\u00e0ng m\u00e3 h\u00f3a &amp; l\u01b0u</strong>' +
            '<span class="muted" style="font-size:.78rem">' + U().esc(provSummary) + '</span>' +
          '</div>' +
          (accSummary ? '<div class="muted" style="font-size:.76rem;margin:4px 0">T\u00e0i kho\u1ea3n: ' + accSummary + '</div>' : '') +
          (itemsHtml ? '<ul style="margin:6px 0 8px 18px;font-size:.78rem;max-height:160px;overflow:auto">' + itemsHtml + '</ul>' : '') +
          dupHtml + skipHtml +
          '<div class="deck-actions" style="margin-top:10px">' +
            '<button type="button" class="btn btn-emerald btn-sm" id="sysSecConfirmImportBtn"' + ((cState.adminSysBusy || !p.totalValid) ? " disabled" : "") + '>X\u00e1c nh\u1eadn</button>' +
            '<button type="button" class="btn btn-outline btn-sm" id="sysSecCancelPreviewBtn"' + (cState.adminSysBusy ? " disabled" : "") + '>H\u1ee7y</button>' +
          '</div>' +
        '</div>';
    }

    const listRows = allKeys.length ? allKeys.map(function (k) {
      const isEnv = k.source === "env";
      const stCls = k.enabled === false ? "disabled" : (k.status || "healthy");
      const stLabel = k.enabled === false ? "Disabled" : (k.status === "invalid" ? "Invalid" : (k.status === "cooldown" ? "Cooldown" : "Healthy"));
      return '<tr>' +
        '<td><strong>' + U().esc(k.accountLabel) + '</strong> ' + (isEnv ? '<span class="badge" style="font-size:.66rem">ENV</span>' : '<span class="badge badge-ok" style="font-size:.66rem">DB</span>') + '</td>' +
        '<td><code>' + U().esc(k.provider) + '</code></td>' +
        '<td><code>' + U().esc(k.maskedKey) + '</code></td>' +
        '<td><span class="syskey-status ' + U().esc(stCls) + '">' + U().esc(stLabel) + '</span>' + (k.lastError ? '<div class="muted" style="font-size:.68rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + U().esc(k.lastError) + '">' + U().esc(k.lastError) + '</div>' : '') + '</td>' +
        '<td>' + (Number(k.usageCount) || 0) + ' OK / ' + (Number(k.errorCount) || 0) + ' Err</td>' +
        '<td>' + (isEnv
          ? '<span class="muted" style="font-size:.74rem">Qu\u1ea3n l\u00fd qua ENV</span>'
          : '<button type="button" class="btn btn-danger btn-sm" data-sys-del="' + U().esc(k.id) + '" data-sys-masked="' + U().esc(k.maskedKey) + '"' + (cState.adminSysBusy ? " disabled" : "") + '>X\u00f3a</button>') +
        '</td>' +
      '</tr>';
    }).join("") : '<tr><td colspan="6" class="muted">Ch\u01b0a c\u00f3 Key H\u1ec7 th\u1ed1ng n\u00e0o \u0111\u01b0\u1ee3c l\u01b0u tr\u00ean m\u00e1y ch\u1ee7.</td></tr>';

    return '<div class="api-section-box api-section-admin" id="apiSectionBAdmin">' +
      '<h3 class="api-section-title">🛡️ Kho API Key H\u1ec7 th\u1ed1ng (L\u01b0u l\u00ean Server \u2014 D\u00f9ng chung cho to\u00e0n b\u1ed9 ng\u01b0\u1eddi d\u00f9ng)</h3>' +
      '<p class="muted" style="margin:0 0 10px;font-size:.8rem">Ch\u1ec9 hi\u1ec3n th\u1ecb sau khi m\u00e1y ch\u1ee7 x\u00e1c th\u1ef1c quy\u1ec1n Qu\u1ea3n tr\u1ecb vi\u00ean (<code>/api/admin/me</code>). Nh\u1eadn m\u1ecdi \u0111\u1ecbnh d\u1ea1ng Key (k\u1ec3 c\u1ea3 <code>AQ.Ab8...</code>), x\u00e1c minh tr\u1ea1ng th\u00e1i b\u1eb1ng Live API Health Check v\u00e0 m\u00e3 h\u00f3a AES-256-GCM tr\u00ean server.</p>' +
      (cState.adminSysError ? '<div class="pending-banner" style="border-color:var(--rose);margin-bottom:10px"><span>❌ ' + U().esc(cState.adminSysError) + '</span></div>' : '') +
      '<textarea id="sysSecRawTextarea" class="multi-key-textarea" rows="5" spellcheck="false" autocomplete="off" placeholder="Account: user1@gmail.com\nGoogle AI Studio (Gemini): AQ.Ab8...\nGroq Cloud: gsk_...\nOpenRouter: sk-or-...\nOpenAI:\nDeepSeek:">' + U().esc(cState.adminSysRawDraft) + '</textarea>' +
      '<div class="deck-actions" style="margin:10px 0">' +
        '<button type="button" class="btn btn-primary" id="sysSecPreviewBtn"' + (cState.adminSysBusy ? " disabled" : "") + '>L\u01b0u v\u00e0o Kho H\u1ec7 th\u1ed1ng (D\u00f9ng chung)</button>' +
        '<button type="button" class="btn btn-danger" id="sysSecDeleteAllBtn"' + ((cState.adminSysBusy || dbKeys.length === 0) ? " disabled" : "") + '>X\u00f3a to\u00e0n b\u1ed9 Key H\u1ec7 th\u1ed1ng</button>' +
      '</div>' +
      previewHtml +
      '<div class="table-scroll" style="margin-top:10px"><table class="data-table"><thead><tr><th>T\u00e0i kho\u1ea3n</th><th>H\u00e3ng</th><th>Key (\u1ea8n)</th><th>Tr\u1ea1ng th\u00e1i</th><th>Th\u1ed1ng k\u00ea</th><th>H\u00e0nh \u0111\u1ed9ng</th></tr></thead><tbody>' + listRows + '</tbody></table></div>' +
    '</div>';
  }

  function renderApiPage() {
    const root = U().$("apiSettingsRoot");
    if (!root) return;
    const store = loadPersonalKeyStore();
    const model = getApiModel();
    const providersList = getProvidersList();
    const providerMap = getProviderMap();
    if (!cState.activeProvTab || !providerMap[cState.activeProvTab]) {
      const modelProv = detectProviderFromModel(model);
      cState.activeProvTab = store.activeProvider || (providerMap[modelProv] ? modelProv : "groq");
    }
    const activeProv = cState.activeProvTab;
    const activeProvObj = providersList.find(function (p) { return p.id === activeProv; }) || providersList[0];
    const personalCount = countPersonalKeys();
    const hasPersonal = personalCount > 0;
    const curLang = (U() && typeof U().getLang === "function") ? U().getLang() : "vi";

    // Trigger server-verified admin check for Section B (renders nothing while loading or non-admin)
    if (getUserIdToken() && cState.adminVerifyToken !== getUserIdToken()) {
      setTimeout(function () { verifyServerAdminForApiPage(); }, 0);
    } else if (!getUserIdToken() && cState.adminVerifyState !== "denied") {
      cState.adminVerifyToken = "";
      cState.adminVerifyState = "denied";
      cState.adminSysKeys = [];
      cState.adminSysEnvKeys = [];
    }

    // Status badge at top of card (exact Section 1B labels)
    const statusBadgeClass = hasPersonal ? "badge-ok" : "badge-sys";
    const statusBadgeText = hasPersonal
      ? "\u0110ang d\u00f9ng: API Key c\u00e1 nh\u00e2n (C\u1ee5c b\u1ed9)"
      : "\u0110ang d\u00f9ng: API Key H\u1ec7 th\u1ed1ng m\u1eb7c \u0111\u1ecbnh (D\u00f9ng chung)";
    cState.apiStatus = hasPersonal ? "ok" : "saved";
    cState.apiStatusMsg = statusBadgeText;

    const activeKeys = store.keysByProvider[activeProv] || [];
    const activeTextareaVal = activeKeys.join("\n");

    const modelOptsHtml = providersList.map(function (p) {
      const opts = (p.models || []).map(function (m) {
        const caps = [];
        if (m.free) caps.push("Free");
        if (m.vision) caps.push("Vision");
        if (m.pdf) caps.push("PDF");
        const suffix = caps.length ? " [" + caps.join(" \u2022 ") + "]" : "";
        return '<option value="' + U().esc(m.id) + '"' + (model === m.id ? " selected" : "") + '>' + U().esc(m.label + suffix) + '</option>';
      }).join("");
      return '<optgroup label="' + U().esc(p.name + " (" + (p.prefixHint || "") + ")") + '">' + opts + '</optgroup>';
    }).join("");

    const provTabsHtml = providersList.map(function (p) {
      const cnt = (store.keysByProvider[p.id] || []).length;
      const isAct = p.id === activeProv;
      return '<button type="button" class="provider-tab-btn' + (isAct ? " active" : "") + '" data-prov-tab="' + U().esc(p.id) + '">' +
        '<span>' + U().esc(p.name) + '</span>' +
        (p.recommended ? '<span>★</span>' : '') +
        (cnt > 0 ? '<span class="provider-tab-count">' + cnt + '</span>' : '') +
      '</button>';
    }).join("");

    const summaryChips = providersList.filter(function (p) { return (store.keysByProvider[p.id] || []).length > 0; }).map(function (p) {
      return p.name + " (" + store.keysByProvider[p.id].length + ")";
    }).join(" \u2022 ");

    let testResultsHtml = "";
    if (Array.isArray(cState.testResults) && cState.testResults.length > 0) {
      testResultsHtml = '<div class="test-results-box" id="uetTestResultsBox">' +
        '<strong>K\u1ebft qu\u1ea3 ki\u1ec3m tra t\u1eebng Key:</strong>' +
        '<ul>' + cState.testResults.map(function (r) {
          return '<li class="' + U().esc(r.status) + '"><code>' + U().esc(r.provider) + '</code> \u2022 <code>' + U().esc(r.masked) + '</code>: ' + U().esc(r.message) + '</li>';
        }).join("") + '</ul></div>';
    }

    root.innerHTML =
      '<div class="api-wrap">' +
        '<section class="panel">' +
          '<div class="panel-head">' +
            '<div>' +
              '<h2>C\u00e0i \u0111\u1eb7t API &amp; Ng\u00f4n ng\u1eef</h2>' +
              '<p class="muted" style="margin:0;font-size:.84rem">H\u1ed7 tr\u1ee3 \u0111a n\u1ec1n t\u1ea3ng AI (Groq Cloud, OpenRouter, Google Gemini, OpenAI, DeepSeek). Khi b\u1ea1n l\u01b0u Key c\u00e1 nh\u00e2n, m\u1ecdi y\u00eau c\u1ea7u g\u1ecdi tr\u1ef1c ti\u1ebfp t\u1edbi h\u00e3ng AI b\u1eb1ng Key c\u1ee7a b\u1ea1n.</p>' +
            '</div>' +
            '<span class="badge ' + statusBadgeClass + '" id="apiPageBadge">' + U().esc(statusBadgeText) + '</span>' +
          '</div>' +

          '<label class="field">Ch\u1ecdn N\u1ec1n t\u1ea3ng &amp; Model AI ch\u1ee7 \u0111\u1ea1o' +
            '<select id="uetApiModelSelect">' + modelOptsHtml + '</select>' +
          '</label>' +

          '<div class="free-api-callout" id="freeApiWarningCallout">' +
            '<span class="free-api-callout-icon" aria-hidden="true">⚠️</span>' +
            '<p class="free-api-callout-text"><strong>L\u01b0u \u00fd khi d\u00f9ng API Free / Flash:</strong> T\u1ed1c \u0111\u1ed9 nhanh &amp; mi\u1ec5n ph\u00ed, nh\u01b0ng b\u1ea1n n\u00ean m\u1edf <strong>Ch\u1ebf \u0111\u1ed9 Ki\u1ec3m duy\u1ec7t song song (Split-Screen Review)</strong> ho\u1eb7c ch\u1ea1y <strong>AI Double-Check</strong> sau khi \u0111\u1ecdc \u0111\u1ec1 \u0111\u1ec3 \u0111\u1ea3m b\u1ea3o \u0111\u00e1p \u00e1n chu\u1ea9n 100%.</p>' +
          '</div>' +

          '<div class="api-section-box" id="apiSectionAPersonal">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
              '<h3 class="api-section-title" style="margin:0">🔑 C\u00e0i \u0111\u1eb7t API Key C\u00e1 nh\u00e2n (Ch\u1ec9 l\u01b0u c\u1ee5c b\u1ed9 tr\u00ean tr\u00ecnh duy\u1ec7t n\u00e0y)</h3>' +
              '<button type="button" class="btn btn-outline btn-sm" id="uetApiGoGuideBtn">📖 Xem h\u01b0\u1edbng d\u1eabn l\u1ea5y Key →</button>' +
            '</div>' +
            (hasPersonal
              ? '<p class="muted" style="font-size:.8rem;margin:0 0 10px">✅ \u0110ang k\u00edch ho\u1ea1t <strong>' + personalCount + ' Key c\u00e1 nh\u00e2n</strong>: ' + U().esc(summaryChips) + '.</p>'
              : '<p class="muted" style="font-size:.8rem;margin:0 0 10px">Ch\u01b0a l\u01b0u Key c\u00e1 nh\u00e2n \u2014 h\u1ec7 th\u1ed1ng s\u1ebd d\u00f9ng <strong>API Key H\u1ec7 th\u1ed1ng m\u1eb7c \u0111\u1ecbnh</strong> qua <code>/api/ai/proxy</code> khi b\u1ea1n \u0111\u0103ng nh\u1eadp Google.</p>') +

            '<div class="field">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
                '<span>Ch\u1ecdn h\u00e3ng AI c\u1ee5 th\u1ec3 (tr\u00e1nh nh\u1ea7m ti\u1ec1n t\u1ed1 <code>sk-</code> gi\u1eefa OpenAI v\u00e0 DeepSeek):</span>' +
                '<a href="' + U().esc(activeProvObj.keyUrl) + '" target="_blank" rel="noopener noreferrer" class="muted" style="font-size:.78rem">L\u1ea5y Key ' + U().esc(activeProvObj.name) + ' ↗</a>' +
              '</div>' +
              '<div class="provider-tabs" id="uetProviderTabs" role="tablist">' + provTabsHtml + '</div>' +
              '<div class="prov-editor-card">' +
                '<div class="prov-editor-head" style="margin-bottom:6px">' +
                  '<strong>' + U().esc(activeProvObj.name) + '</strong> ' +
                  '<span class="pill-code">Ti\u1ec1n t\u1ed1: <code>' + U().esc(activeProvObj.prefixHint) + '</code></span> ' +
                  (activeProvObj.badgeText ? '<span class="muted" style="font-size:.78rem">' + U().esc(activeProvObj.badgeText) + '</span>' : '') +
                '</div>' +
                '<textarea id="uetProvKeyTextarea" class="multi-key-textarea" rows="5" spellcheck="false" autocomplete="off" placeholder="D\u00e1n 1 ho\u1eb7c nhi\u1ec1u API Key c\u1ee7a ' + U().esc(activeProvObj.name) + ' (' + U().esc(activeProvObj.prefixHint) + ')\nM\u1ed7i d\u00f2ng 1 Key ho\u1eb7c c\u00e1ch nhau b\u1eb1ng d\u1ea5u ph\u1ea9y...">' + U().esc(activeTextareaVal) + '</textarea>' +
                '<div class="key-validation-list" id="uetProvValidationChips">' + buildValidationChipsHtml(activeProv, activeTextareaVal) + '</div>' +
              '</div>' +
            '</div>' +

            '<div class="deck-actions" style="margin:14px 0 8px">' +
              '<button type="button" class="btn btn-primary" id="uetApiSaveBtn">L\u01b0u Key c\u00e1 nh\u00e2n (C\u1ee5c b\u1ed9)</button>' +
              '<button type="button" class="btn btn-emerald" id="uetApiTestBtn">Ki\u1ec3m tra k\u1ebft n\u1ed1i (Test API)</button>' +
              '<button type="button" class="btn btn-outline" id="uetApiDelBtn">X\u00f3a Key c\u00e1 nh\u00e2n</button>' +
              '<button type="button" class="btn btn-outline btn-sm" id="uetApiExportBtn">📤 Xu\u1ea5t JSON</button>' +
              '<button type="button" class="btn btn-outline btn-sm" id="uetApiImportBtn">📥 Nh\u1eadp JSON</button>' +
              '<input type="file" id="uetApiImportFile" accept=".json,application/json" style="display:none">' +
            '</div>' +
            testResultsHtml +
          '</div>' +

          renderSectionBAdminHtml() +

          '<div class="pro-tip-box" style="margin:14px 0 16px">' +
            '<strong>💡 ' + U().esc((CFG() && CFG().PRO_TIP && CFG().PRO_TIP.title) || "M\u1eb9o hay (Pro Tip)") + '</strong>' +
            '<p style="margin:6px 0 0;font-size:.82rem">' + U().esc((CFG() && CFG().PRO_TIP && CFG().PRO_TIP.body) || "") + '</p>' +
          '</div>' +

          '<div style="padding-top:14px;border-top:1px solid var(--border)">' +
            '<div class="panel-head" style="margin-bottom:8px"><div><h3 style="margin:0;font-size:1rem">Ng\u00f4n ng\u1eef giao di\u1ec7n</h3><p class="muted" style="margin:2px 0 0;font-size:.8rem">Chuy\u1ec3n \u0111\u1ed5i t\u1ee9c th\u00ec gi\u1eefa Ti\u1ebfng Vi\u1ec7t, Ti\u1ebfng Anh v\u00e0 Ti\u1ebfng Nh\u1eadt (gi\u1eef nguy\u00ean ph\u00f4ng ch\u1eef h\u1ec7 th\u1ed1ng).</p></div></div>' +
            '<div class="seg" role="group" aria-label="Ch\u1ecdn ng\u00f4n ng\u1eef">' +
              '<button type="button" class="seg-btn' + (curLang === "vi" ? " active" : "") + '" data-lang-set="vi">VI</button>' +
              '<button type="button" class="seg-btn' + (curLang === "en" ? " active" : "") + '" data-lang-set="en">EN</button>' +
              '<button type="button" class="seg-btn' + (curLang === "ja" ? " active" : "") + '" data-lang-set="ja">JA</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
      '</div>';

    if (!cState.apiMounted) {
      cState.apiMounted = true;
      root.addEventListener("click", onApiPageClick);
      root.addEventListener("change", onApiPageChange);
      root.addEventListener("input", onApiPageInput);
      root.addEventListener("paste", onApiPagePaste);
    }
    if (typeof U().applyI18n === "function") U().applyI18n(root);
  }

  function renderApiGuide() {
    const root = U().$("apiGuideRoot");
    if (!root) return;
    const providers = getProvidersList();
    const c = CFG();
    const proTip = (c && c.PRO_TIP) ? c.PRO_TIP : {
      title: "M\u1eb9o hay (Pro Tip): T\u1ef1 \u0111\u1ed9ng xoay v\u00f2ng kh\u00f4ng lo h\u1ebft Quota",
      body: "B\u1ea1n c\u00f3 th\u1ec3 d\u00e1n nhi\u1ec1u API Key t\u1eeb nhi\u1ec1u t\u00e0i kho\u1ea3n/d\u1ef1 \u00e1n \u0111\u1ed9c l\u1eadp thu\u1ed9c quy\u1ec1n s\u1edf h\u1eefu c\u1ee7a b\u1ea1n v\u00e0o C\u00e0i \u0111\u1eb7t API \u0111\u1ec3 t\u1ef1 \u0111\u1ed9ng xoay v\u00f2ng an to\u00e0n."
    };

    const cardsHtml = providers.map(function (p) {
      const stepsHtml = (p.guideSteps || []).map(function (st, i) {
        return '<li><span class="step-num">' + (i + 1) + '</span><span>' + U().esc(st) + '</span></li>';
      }).join("");
      const modelsHtml = (p.models || []).slice(0, 4).map(function (m) {
        const tags = (m.free ? '<span class="mini-tag free">Free</span>' : '') + (m.vision ? '<span class="mini-tag vis">Vision</span>' : '') + (m.pdf ? '<span class="mini-tag pdf">PDF</span>' : '');
        return '<li><code>' + U().esc(m.rawModel) + '</code> ' + tags + '</li>';
      }).join("");
      return '<article class="guide-provider-card' + (p.recommended ? " is-recommended" : "") + '">' +
        '<div class="panel-head" style="margin-bottom:8px">' +
          '<div>' +
            '<h3 style="margin:0;font-size:1.05rem">' + U().esc(p.name) + (p.recommended ? ' <span class="badge badge-ok" style="font-size:.7rem;vertical-align:middle">★ Khuy\u00ean d\u00f9ng</span>' : '') + '</h3>' +
            '<div class="muted" style="font-size:.76rem;margin-top:2px">Ti\u1ec1n t\u1ed1: <code>' + U().esc(p.prefixHint) + '</code> • ' + U().esc(p.badgeText || "") + '</div>' +
          '</div>' +
          '<a href="' + U().esc(p.keyUrl) + '" target="_blank" rel="noopener noreferrer" class="btn btn-sm ' + (p.recommended ? "btn-primary" : "btn-outline") + '">L\u1ea5y Key ↗</a>' +
        '</div>' +
        '<p class="muted" style="font-size:.82rem;margin:0 0 10px">' + U().esc(p.freeTierSummary || "") + '</p>' +
        '<ol class="guide-step-list">' + stepsHtml + '</ol>' +
        '<div class="guide-models"><strong>Model h\u1ed7 tr\u1ee3:</strong><ul>' + modelsHtml + '</ul></div>' +
      '</article>';
    }).join("");

    root.innerHTML =
      '<div class="api-wrap">' +
        '<section class="panel">' +
          '<div class="panel-head">' +
            '<div>' +
              '<h2>📖 H\u01b0\u1edbng d\u1eabn l\u1ea5y API Key Mi\u1ec5n ph\u00ed &amp; Tr\u1ea3 ph\u00ed</h2>' +
              '<p class="muted" style="margin:4px 0 0;font-size:.86rem">S\u1eed d\u1ee5ng API Key c\u00e1 nh\u00e2n gi\u00fap \u0111\u1ecdc \u1ea3nh/PDF si\u00eau nhanh, kh\u00f4ng b\u1ecb ngh\u1ebdn h\u1ea1n m\u1ee9c d\u00f9ng chung v\u00e0 b\u1ea3o m\u1eadt tuy\u1ec7t \u0111\u1ed1i tr\u00ean tr\u00ecnh duy\u1ec7t c\u1ee7a b\u1ea1n.</p>' +
            '</div>' +
            '<button type="button" class="btn btn-primary" data-guide-act="go-api">🔑 Nh\u1eadp API Key ngay →</button>' +
          '</div>' +
          '<div class="pro-tip-box">' +
            '<strong>💡 ' + U().esc(proTip.title) + '</strong>' +
            '<p style="margin:6px 0 0;font-size:.84rem">' + U().esc(proTip.body) + '</p>' +
          '</div>' +
        '</section>' +
        '<div class="guide-grid">' + cardsHtml + '</div>' +
        '<section class="guide-cta-bar">' +
          '<div>' +
            '<h3 style="margin:0 0 4px">S\u1eb5n s\u00e0ng b\u1eaft \u0111\u1ea7u?</h3>' +
            '<p class="muted" style="margin:0;font-size:.84rem">API Key c\u00e1 nh\u00e2n c\u1ee7a b\u1ea1n ch\u1ec9 l\u01b0u c\u1ee5c b\u1ed9 trong tr\u00ecnh duy\u1ec7t (localStorage) v\u00e0 g\u1eedi tr\u1ef1c ti\u1ebfp t\u1edbi m\u00e1y ch\u1ee7 h\u00e3ng AI.</p>' +
          '</div>' +
          '<button type="button" class="btn btn-primary" data-guide-act="go-api">\u0110\u00e3 c\u00f3 Key? Nh\u1eadp ngay t\u1ea1i C\u00e0i \u0111\u1eb7t API →</button>' +
        '</section>' +
      '</div>';

    if (!root.getAttribute("data-guide-bound")) {
      root.setAttribute("data-guide-bound", "1");
      root.addEventListener("click", function (ev) {
        const b = ev.target.closest ? ev.target.closest("[data-guide-act='go-api']") : null;
        if (b && U() && typeof U().showTab === "function") U().showTab("api");
      });
    }
    if (typeof U().applyI18n === "function") U().applyI18n(root);
  }

  async function testSingleProviderKey(provider, apiKey) {
    const pMap = getProviderMap();
    const info = pMap[provider] || FALLBACK_PROVIDER_INFO[provider];
    try {
      if (provider === "gemini") {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
          method: "GET",
          headers: { "x-goog-api-key": apiKey }
        });
        if (!res.ok) {
          const err = await res.json().catch(function () { return {}; });
          const msg = (err && err.error && err.error.message) || ("HTTP " + res.status);
          if (res.status === 429) return { status: "warn", message: "Key \u0111\u00fang nh\u01b0ng \u0111ang gi\u1edbi h\u1ea1n t\u1ed1c \u0111\u1ed9 (429): " + msg };
          return { status: "bad", message: msg };
        }
        return { status: "ok", message: "K\u1ebft n\u1ed1i h\u1ee3p l\u1ec7 (OK)" };
      }
      const url = info && info.testEndpoint ? info.testEndpoint : "https://api.openai.com/v1/models";
      const res = await fetch(url, {
        method: "GET",
        headers: { "Authorization": "Bearer " + apiKey }
      });
      if (!res.ok) {
        const err = await res.json().catch(function () { return {}; });
        const msg = (err && err.error && err.error.message) || ("HTTP " + res.status);
        if (res.status === 429) return { status: "warn", message: "Key \u0111\u00fang nh\u01b0ng \u0111ang gi\u1edbi h\u1ea1n t\u1ed1c \u0111\u1ed9 (429): " + msg };
        return { status: "bad", message: msg };
      }
      return { status: "ok", message: "K\u1ebft n\u1ed1i h\u1ee3p l\u1ec7 (OK)" };
    } catch (netErr) {
      // Browser CORS can block GET /models even for valid keys; treat TypeError cleanly
      return {
        status: "warn",
        message: "Tr\u00ecnh duy\u1ec7t ch\u1eb7n CORS khi test tr\u1ef1c ti\u1ebfp (Key v\u1eabn c\u00f3 th\u1ec3 ho\u1ea1t \u0111\u1ed9ng b\u00ecnh th\u01b0\u1eddng khi ch\u1ea1y Converter)."
      };
    }
  }

  async function testPersonalKeys() {
    const store = syncActiveTextareaToStore(loadPersonalKeyStore());
    savePersonalKeyStore(store);
    const items = [];
    PROVIDER_ORDER.forEach(function (p) {
      (store.keysByProvider[p] || []).forEach(function (k) {
        items.push({ provider: p, apiKey: k });
      });
    });
    if (items.length === 0) {
      U().showToast("Ch\u01b0a c\u00f3 API Key c\u00e1 nh\u00e2n n\u00e0o \u0111\u1ec3 ki\u1ec3m tra.", "warning");
      return;
    }
    const btn = U().$("uetApiTestBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>\u0110ang test...'; }
    const results = [];
    let okCount = 0;
    let warnCount = 0;
    let badCount = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const r = await testSingleProviderKey(it.provider, it.apiKey);
      if (r.status === "ok") okCount++;
      else if (r.status === "warn") warnCount++;
      else badCount++;
      results.push({ provider: it.provider, masked: maskKeyPreview(it.apiKey), status: r.status, message: r.message });
    }
    cState.testResults = results;
    if (okCount > 0 && badCount === 0) {
      cState.apiStatus = "ok";
      cState.apiStatusMsg = "✅ " + okCount + " Key OK";
      U().showToast("Ki\u1ec3m tra xong: " + okCount + " Key k\u1ebft n\u1ed1i th\u00e0nh c\u00f4ng!", "success");
    } else if (warnCount > 0 && badCount === 0) {
      cState.apiStatus = "saved";
      cState.apiStatusMsg = "⚠️ " + warnCount + " CORS";
      U().showToast("\u0110\u00e3 ki\u1ec3m tra " + items.length + " Key (tr\u00ecnh duy\u1ec7t ch\u1eb7n CORS \u1edf 1 s\u1ed1 h\u00e3ng, Key \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng v\u1eabn d\u00f9ng \u0111\u01b0\u1ee3c).", "info");
    } else {
      cState.apiStatus = badCount === items.length ? "error" : "saved";
      cState.apiStatusMsg = "❌ " + badCount + " Key l\u1ed7i";
      U().showToast("C\u00f3 " + badCount + " Key b\u1ecb l\u1ed7i (" + okCount + " OK). Xem chi ti\u1ebft b\u00ean d\u01b0\u1edbi.", "warning");
    }
    renderApiPage();
  }

  function exportPersonalKeysJson() {
    const store = syncActiveTextareaToStore(loadPersonalKeyStore());
    const total = PROVIDER_ORDER.reduce(function (s, p) { return s + (store.keysByProvider[p] || []).length; }, 0);
    if (total === 0) {
      U().showToast("Ch\u01b0a c\u00f3 API Key c\u00e1 nh\u00e2n n\u00e0o \u0111\u1ec3 xu\u1ea5t.", "warning");
      return;
    }
    U().showConfirm(
      "C\u1ea3nh b\u00e1o b\u1ea3o m\u1eadt khi Export JSON",
      "T\u1ec7p JSON t\u1ea3i v\u1ec1 s\u1ebd ch\u1ee9a API Key c\u00e1 nh\u00e2n c\u1ee7a b\u1ea1n d\u01b0\u1edbi d\u1ea1ng v\u0103n b\u1ea3n thu\u1ea7n (plain text). Tuy\u1ec7t \u0111\u1ed1i KH\u00d4NG chia s\u1ebb ho\u1eb7c t\u1ea3i t\u1ec7p n\u00e0y l\u00ean n\u01a1i c\u00f4ng c\u1ed9ng! Ti\u1ebfp t\u1ee5c t\u1ea3i xu\u1ed1ng?",
      function () {
        const payload = {
          app: "AI Tutor",
          exportedAt: new Date().toISOString(),
          keysByProvider: store.keysByProvider
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "ai-tutor-personal-keys-" + dateStamp() + ".json";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 200);
        U().showToast("\u0110\u00e3 xu\u1ea5t " + total + " API Key c\u00e1 nh\u00e2n ra file JSON.", "success");
      }
    );
  }

  function importPersonalKeysJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const parsed = JSON.parse(String((ev && ev.target && ev.target.result) || ""));
        const srcMap = (parsed && parsed.keysByProvider && typeof parsed.keysByProvider === "object") ? parsed.keysByProvider : parsed;
        if (!srcMap || typeof srcMap !== "object") throw new Error("\u0110\u1ecbnh d\u1ea1ng JSON kh\u00f4ng h\u1ee3p l\u1ec7.");
        const store = syncActiveTextareaToStore(loadPersonalKeyStore());
        let added = 0;
        PROVIDER_ORDER.forEach(function (p) {
          const list = Array.isArray(srcMap[p]) ? srcMap[p] : [];
          list.forEach(function (k) {
            const v = cleanRawKeyValue(k);
            if (v && store.keysByProvider[p].indexOf(v) === -1) {
              store.keysByProvider[p].push(v);
              added++;
            }
          });
        });
        savePersonalKeyStore(store);
        cState.testResults = null;
        cState.apiStatus = added > 0 ? "ok" : "saved";
        cState.apiStatusMsg = "\u0110\u00e3 nh\u1eadp +" + added + " Key";
        U().showToast("\u0110\u00e3 nh\u1eadp th\u00eam " + added + " API Key t\u1eeb file JSON.", "success");
        renderApiPage();
      } catch (err) {
        U().showToast("L\u1ed7i nh\u1eadp JSON: " + (err.message || "File kh\u00f4ng h\u1ee3p l\u1ec7"), "error");
      }
    };
    reader.readAsText(file);
  }

  async function onApiPageClick(e) {
    const langBtn = e.target.closest ? e.target.closest("[data-lang-set]") : null;
    if (langBtn && typeof U().setLang === "function") {
      U().setLang(langBtn.getAttribute("data-lang-set"));
      return;
    }
    const tabBtn = e.target.closest ? e.target.closest("[data-prov-tab]") : null;
    if (tabBtn) {
      const store = syncActiveTextareaToStore(loadPersonalKeyStore());
      const nextProv = tabBtn.getAttribute("data-prov-tab");
      if (PROVIDER_ORDER.indexOf(nextProv) !== -1) {
        cState.activeProvTab = nextProv;
        store.activeProvider = nextProv;
        savePersonalKeyStore(store);
        renderApiPage();
      }
      return;
    }
    const delOneBtn = e.target.closest ? e.target.closest("[data-sys-del]") : null;
    if (delOneBtn) {
      if (cState.adminVerifyState !== "verified") return;
      const kid = delOneBtn.getAttribute("data-sys-del");
      const kmask = delOneBtn.getAttribute("data-sys-masked") || kid;
      if (!kid) return;
      U().showConfirm("X\u00f3a Key H\u1ec7 th\u1ed1ng", "X\u00f3a v\u0129nh vi\u1ec5n Key H\u1ec7 th\u1ed1ng " + kmask + " kh\u1ecfi m\u00e1y ch\u1ee7?", async function () {
        cState.adminSysBusy = true;
        renderApiPage();
        const resp = await converterAdminApiFetch("/api/admin/system-keys/" + encodeURIComponent(kid), "DELETE");
        cState.adminSysBusy = false;
        if (resp._err) {
          cState.adminSysError = resp._err;
          U().showToast("L\u1ed7i x\u00f3a Key H\u1ec7 th\u1ed1ng: " + resp._err, "error");
        } else if (resp.data) {
          cState.adminSysError = "";
          cState.adminSysKeys = Array.isArray(resp.data.keys) ? resp.data.keys : [];
          U().showToast("\u0110\u00e3 x\u00f3a Key H\u1ec7 th\u1ed1ng " + kmask + ".", "info");
        }
        renderApiPage();
      });
      return;
    }
    const t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.id === "uetApiGoGuideBtn") {
      U().showTab("guide");
    } else if (t.id === "uetApiSaveBtn") {
      // STRICT SECTION A RULE: Writes ONLY to browser localStorage; NEVER calls any server/admin route
      const store = syncActiveTextareaToStore(loadPersonalKeyStore());
      savePersonalKeyStore(store);
      cState.testResults = null;
      const total = countPersonalKeys();
      if (total > 0) cState.disclaimerDismissed = false;
      U().showToast(total > 0
        ? ("\u0110\u00e3 l\u01b0u " + total + " API Key c\u00e1 nh\u00e2n (c\u1ee5c b\u1ed9 tr\u00ean tr\u00ecnh duy\u1ec7t n\u00e0y).")
        : "\u0110\u00e3 chuy\u1ec3n sang d\u00f9ng API Key H\u1ec7 th\u1ed1ng m\u1eb7c \u0111\u1ecbnh.", "success");
      renderApiPage();
    } else if (t.id === "uetApiTestBtn") {
      testPersonalKeys();
    } else if (t.id === "uetApiExportBtn") {
      exportPersonalKeysJson();
    } else if (t.id === "uetApiImportBtn") {
      const fi = U().$("uetApiImportFile");
      if (fi) { fi.value = ""; fi.click(); }
    } else if (t.id === "uetApiDelBtn") {
      U().showConfirm("X\u00f3a Key c\u00e1 nh\u00e2n", "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a to\u00e0n b\u1ed9 API Key c\u00e1 nh\u00e2n kh\u1ecfi tr\u00ecnh duy\u1ec7t n\u00e0y? Sau khi x\u00f3a, h\u1ec7 th\u1ed1ng s\u1ebd quay v\u1ec1 d\u00f9ng API Key H\u1ec7 th\u1ed1ng m\u1eb7c \u0111\u1ecbnh (D\u00f9ng chung).", function () {
        savePersonalKeyStore(emptyPersonalStore());
        cState.testResults = null;
        cState.disclaimerDismissed = false;
        U().showToast("\u0110\u00e3 x\u00f3a Key c\u00e1 nh\u00e2n v\u00e0 quay v\u1ec1 API Key H\u1ec7 th\u1ed1ng m\u1eb7c \u0111\u1ecbnh.", "info");
        renderApiPage();
      });
    } else if (t.id === "sysSecPreviewBtn") {
      if (cState.adminVerifyState !== "verified") return;
      const ta = U().$("sysSecRawTextarea");
      const rawText = ta ? ta.value : cState.adminSysRawDraft;
      cState.adminSysRawDraft = rawText;
      if (!String(rawText || "").trim()) {
        U().showToast("Vui l\u00f2ng d\u00e1n danh s\u00e1ch API Key H\u1ec7 th\u1ed1ng tr\u01b0\u1edbc khi xem tr\u01b0\u1edbc.", "warning");
        return;
      }
      cState.adminSysBusy = true;
      renderApiPage();
      const resp = await converterAdminApiFetch("/api/admin/system-keys/preview", "POST", { rawText: rawText });
      cState.adminSysBusy = false;
      if (resp._err) {
        cState.adminSysError = resp._err;
        U().showToast("L\u1ed7i ph\u00e2n t\u00edch: " + resp._err, "error");
      } else if (resp.data) {
        cState.adminSysError = "";
        cState.adminSysPreview = resp.data;
      }
      renderApiPage();
    } else if (t.id === "sysSecCancelPreviewBtn") {
      cState.adminSysPreview = null;
      renderApiPage();
    } else if (t.id === "sysSecConfirmImportBtn") {
      if (cState.adminVerifyState !== "verified") return;
      const ta = U().$("sysSecRawTextarea");
      const rawText = cState.adminSysRawDraft || (ta ? ta.value : "");
      if (!String(rawText || "").trim()) return;
      cState.adminSysBusy = true;
      renderApiPage();
      const resp = await converterAdminApiFetch("/api/admin/system-keys/import", "POST", { rawText: rawText });
      cState.adminSysBusy = false;
      if (resp._err) {
        cState.adminSysError = resp._err;
        U().showToast("L\u1ed7i l\u01b0u Kho H\u1ec7 th\u1ed1ng: " + resp._err, "error");
      } else if (resp.data) {
        cState.adminSysError = "";
        cState.adminSysRawDraft = "";
        cState.adminSysPreview = null;
        cState.adminSysKeys = Array.isArray(resp.data.keys) ? resp.data.keys : cState.adminSysKeys;
        const hs = resp.data.healthSummary;
        const hsTxt = hs ? (" (Live Check: " + (hs.healthy || 0) + " Healthy \u2022 " + (hs.cooldown || 0) + " Cooldown \u2022 " + (hs.invalid || 0) + " Invalid)") : "";
        U().showToast("\u0110\u00e3 m\u00e3 h\u00f3a & l\u01b0u " + (resp.data.importedCount || 0) + " Key v\u00e0o Kho H\u1ec7 th\u1ed1ng!" + hsTxt, (hs && hs.invalid > 0 && !hs.healthy) ? "warning" : "success");
      }
      renderApiPage();
    } else if (t.id === "sysSecDeleteAllBtn") {
      if (cState.adminVerifyState !== "verified") return;
      const cnt = (cState.adminSysKeys || []).length;
      if (cnt === 0) return;
      openTypedDeleteAllModal(cnt, async function () {
        cState.adminSysBusy = true;
        renderApiPage();
        const resp = await converterAdminApiFetch("/api/admin/system-keys", "DELETE", { confirm: "XOA" });
        cState.adminSysBusy = false;
        if (resp._err) {
          cState.adminSysError = resp._err;
          U().showToast("L\u1ed7i x\u00f3a to\u00e0n b\u1ed9 Key H\u1ec7 th\u1ed1ng: " + resp._err, "error");
        } else if (resp.data) {
          cState.adminSysError = "";
          cState.adminSysKeys = [];
          cState.adminSysPreview = null;
          U().showToast("\u0110\u00e3 x\u00f3a to\u00e0n b\u1ed9 " + (resp.data.deletedCount || cnt) + " Key H\u1ec7 th\u1ed1ng.", "info");
        }
        renderApiPage();
      });
    }
  }

  function onApiPageInput(e) {
    if (e.target && e.target.id === "uetProvKeyTextarea") {
      const chips = U().$("uetProvValidationChips");
      const prov = cState.activeProvTab || "groq";
      if (chips) chips.innerHTML = buildValidationChipsHtml(prov, e.target.value);
    } else if (e.target && e.target.id === "sysSecRawTextarea") {
      cState.adminSysRawDraft = e.target.value;
    }
  }

  function onApiPageChange(e) {
    if (e.target && e.target.id === "uetApiModelSelect") {
      const m = e.target.value;
      if (m.indexOf("pro") !== -1 && !U().can("proAi")) {
        U().showToast("Model Pro \u0111\u01b0\u1ee3c \u01b0u ti\u00ean cho g\u00f3i Diamond VIP (b\u1ea1n v\u1eabn c\u00f3 th\u1ec3 d\u00f9ng v\u1edbi API Key c\u00e1 nh\u00e2n).", "info");
      }
      setApiModel(m);
      const detP = detectProviderFromModel(m);
      if (PROVIDER_ORDER.indexOf(detP) !== -1) {
        const store = syncActiveTextareaToStore(loadPersonalKeyStore());
        cState.activeProvTab = detP;
        store.activeProvider = detP;
        savePersonalKeyStore(store);
      }
      renderApiPage();
    } else if (e.target && e.target.id === "uetApiImportFile") {
      const f = e.target.files && e.target.files[0];
      if (f) importPersonalKeysJsonFile(f);
    }
  }

  function onApiPagePaste(e) {
    if (e.target && e.target.id === "uetProvKeyTextarea") {
      setTimeout(function () {
        const chips = U().$("uetProvValidationChips");
        const prov = cState.activeProvTab || "groq";
        if (chips) chips.innerHTML = buildValidationChipsHtml(prov, e.target.value);
      }, 30);
    }
  }

  /* ======================== UNIFIED SMART FILE QUEUE & PARSERS ======================== */
  const _scriptCache = {};
  function loadScriptOnce(src, checkFn) {
    if (checkFn()) return Promise.resolve();
    if (_scriptCache[src]) return _scriptCache[src];
    _scriptCache[src] = new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () {
        if (checkFn()) resolve();
        else reject(new Error("Kh\u00f4ng th\u1ec3 kh\u1edfi t\u1ea1o th\u01b0 vi\u1ec7n \u0111\u1ecdc t\u00e0i li\u1ec7u."));
      };
      s.onerror = function () {
        delete _scriptCache[src];
        reject(new Error("Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c th\u01b0 vi\u1ec7n ph\u00e2n t\u00edch t\u1eeb CDN. Vui l\u00f2ng ki\u1ec3m tra k\u1ebft n\u1ed1i m\u1ea1ng."));
      };
      document.head.appendChild(s);
    });
    return _scriptCache[src];
  }

  function ensureMammoth() {
    return loadScriptOnce(
      "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js",
      function () { return typeof window.mammoth !== "undefined"; }
    );
  }

  function ensurePdfJs() {
    return loadScriptOnce(
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
      function () { return typeof window.pdfjsLib !== "undefined"; }
    ).then(function () {
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
      }
    });
  }

  function detectFileKind(file) {
    const name = String((file && file.name) || "").toLowerCase();
    const type = String((file && file.type) || "").toLowerCase();
    const m = name.match(/\.([a-z0-9]+)$/);
    const ext = m ? m[1] : "";
    if (type.indexOf("image/") === 0 || ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"].indexOf(ext) !== -1) {
      return { kind: "image", ext: ext || "png" };
    }
    if (type === "application/pdf" || ext === "pdf") return { kind: "pdf", ext: "pdf" };
    if (ext === "docx" || type.indexOf("wordprocessingml") !== -1) return { kind: "docx", ext: "docx" };
    if (ext === "doc" || type === "application/msword") return { kind: "doc", ext: "doc" };
    if (ext === "md" || ext === "txt" || type === "text/plain" || type === "text/markdown") return { kind: "text", ext: ext || "txt" };
    if (ext === "xlsx" || ext === "xls" || ext === "csv") return { kind: "excel", ext: ext };
    return null;
  }

  function fileKindMeta(kind) {
    if (kind === "image") return { icon: "🖼️", badge: "\u1ea2nh → AI Vision" };
    if (kind === "pdf") return { icon: "📕", badge: "PDF" };
    if (kind === "docx") return { icon: "📘", badge: "Word (.docx)" };
    if (kind === "doc") return { icon: "📘", badge: "Word (.doc)" };
    if (kind === "text") return { icon: "📄", badge: "Markdown / Text" };
    if (kind === "excel") return { icon: "📊", badge: "Excel" };
    return { icon: "📎", badge: "T\u00e0i li\u1ec7u" };
  }

  function syncImagesFromFiles() {
    cState.images = cState.files.filter(function (f) { return f.kind === "image"; });
    cState.activeImgIdx = U().clamp(cState.activeImgIdx, 0, Math.max(0, cState.images.length - 1));
  }

  function addUnifiedFiles(fileList) {
    const raw = Array.from(fileList || []);
    if (raw.length === 0) return;
    const valid = [];
    const rejected = [];
    const emptyFiles = [];
    raw.forEach(function (f) {
      if (f && typeof f.size === "number" && f.size === 0) {
        emptyFiles.push((f && f.name) || "file");
        return;
      }
      const info = detectFileKind(f);
      if (info) valid.push({ file: f, kind: info.kind, ext: info.ext });
      else rejected.push((f && f.name) || "file");
    });
    if (emptyFiles.length > 0 && valid.length === 0) {
      U().showToast("T\u1ec7p \"" + emptyFiles.join(", ") + "\" r\u1ed7ng (0 KB), kh\u00f4ng c\u00f3 n\u1ed9i dung \u0111\u1ec3 x\u1eed l\u00fd.", "warning");
      return;
    }
    if (valid.length === 0) {
      U().showToast("\u0110\u1ecbnh d\u1ea1ng kh\u00f4ng h\u1ed7 tr\u1ee3. H\u00e3y ch\u1ecdn \u1ea2nh (.png/.jpg/.webp), Markdown/Text (.md/.txt), PDF (.pdf), Word (.doc/.docx) ho\u1eb7c Excel (.xlsx).", "warning");
      return;
    }
    const existingImgCount = cState.files.filter(function (x) { return x.kind === "image"; }).length;
    const incomingImgCount = valid.filter(function (x) { return x.kind === "image"; }).length;
    const maxImgs = U().effectiveLimits().maxImages || 5;
    if (incomingImgCount > 0 && existingImgCount + incomingImgCount > maxImgs && !U().isAdmin()) {
      U().promptUpgrade("G\u00f3i " + U().effectiveLimits().name + " cho ph\u00e9p t\u1ed1i \u0111a " + maxImgs + " \u1ea3nh/l\u1ea7n trong AI Converter.");
      return;
    }
    valid.forEach(function (entry) {
      const file = entry.file;
      const item = {
        id: "uf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        file: file,
        name: file.name || ("tai_lieu_" + (cState.files.length + 1) + "." + entry.ext),
        size: file.size || 0,
        kind: entry.kind,
        ext: entry.ext,
        url: "",
        width: 0,
        height: 0
      };
      if (entry.kind === "image") {
        item.url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = function () { item.width = im.naturalWidth; item.height = im.naturalHeight; renderConverter(); };
        im.src = item.url;
      }
      cState.files.push(item);
    });
    syncImagesFromFiles();
    cState.lastSummary = "";
    renderConverter();
    if (rejected.length > 0) {
      U().showToast("\u0110\u00e3 th\u00eam " + valid.length + " t\u1ec7p (b\u1ecf qua " + rejected.length + " t\u1ec7p kh\u00f4ng h\u1ed7 tr\u1ee3).", "warning");
    } else {
      U().showToast("\u0110\u00e3 th\u00eam " + valid.length + " t\u1ec7p v\u00e0o h\u00e0ng \u0111\u1ee3i x\u1eed l\u00fd th\u00f4ng minh.", "info");
    }
  }

  function clearUnifiedFiles() {
    cState.files.forEach(function (f) { if (f.url) URL.revokeObjectURL(f.url); });
    cState.files = [];
    syncImagesFromFiles();
    cState.lastSummary = "";
    renderConverter();
  }

  function removeUnifiedFile(idx) {
    const item = cState.files[idx];
    if (!item) return;
    if (item.url) URL.revokeObjectURL(item.url);
    cState.files.splice(idx, 1);
    syncImagesFromFiles();
    renderConverter();
  }

  function setPipelineSteps(extractSt, validateSt, aiSt, aiLabel) {
    cState.steps = [
      { id: "extract", label: extractSt === "done" ? "\u0110\u00e3 tr\u00edch xu\u1ea5t n\u1ed9i dung" : "\u0110ang tr\u00edch xu\u1ea5t n\u1ed9i dung...", status: extractSt },
      { id: "validate", label: validateSt === "done" ? "\u0110\u00e3 ki\u1ec3m tra c\u1ea5u tr\u00fac & \u0111\u00e1p \u00e1n" : "\u0110ang ki\u1ec3m tra \u0111\u00e1p \u00e1n...", status: validateSt },
      { id: "ai", label: aiLabel || (aiSt === "done" ? "AI \u0111\u00e3 gi\u1ea3i & ki\u1ec3m tra ch\u00e9o xong" : (aiSt === "skip" ? "\u0110\u00e3 \u0111\u1ee7 \u0111\u00e1p \u00e1n – chuy\u1ec3n \u0111\u1ed5i tr\u1ef1c ti\u1ebfp (kh\u00f4ng c\u1ea7n g\u1ecdi AI)" : "AI \u0111ang gi\u1ea3i & ki\u1ec3m tra ch\u00e9o...")), status: aiSt }
    ];
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onerror = function () { reject(new Error("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc t\u1ec7p v\u0103n b\u1ea3n.")); };
      r.onload = function (ev) { resolve(String(ev.target.result || "")); };
      r.readAsText(file, "UTF-8");
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onerror = function () { reject(new Error("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc d\u1eef li\u1ec7u nh\u1ecb ph\u00e2n c\u1ee7a t\u1ec7p.")); };
      r.onload = function (ev) { resolve(ev.target.result); };
      r.readAsArrayBuffer(file);
    });
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onerror = function () { reject(new Error("Kh\u00f4ng th\u1ec3 m\u00e3 h\u00f3a t\u1ec7p.")); };
      r.onload = function (ev) { resolve(String(ev.target.result || "").split(",")[1] || ""); };
      r.readAsDataURL(file);
    });
  }

  function htmlFragmentToStructuredText(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
      .replace(/<u\b[^>]*>([\s\S]*?)<\/u>/gi, "__U_OPEN__$1__U_CLOSE__")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n");
    const raw = (tmp.textContent || tmp.innerText || "")
      .replace(/__U_OPEN__/g, "<u>")
      .replace(/__U_CLOSE__/g, "</u>")
      .replace(/\*\*\s*\*\*/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return raw;
  }

  async function extractDocxText(file) {
    await ensureMammoth();
    const buf = await readFileAsArrayBuffer(file);
    try {
      const htmlRes = await window.mammoth.convertToHtml({ arrayBuffer: buf });
      const structured = htmlFragmentToStructuredText(htmlRes && htmlRes.value);
      if (structured && structured.length > 10) return structured;
    } catch (e) { /* fallback below */ }
    const rawRes = await window.mammoth.extractRawText({ arrayBuffer: buf });
    return String((rawRes && rawRes.value) || "").trim();
  }

  async function extractLegacyDocText(file) {
    const buf = await readFileAsArrayBuffer(file);
    const bytes = new Uint8Array(buf);
    const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 512)).trim();
    if (/^<(!doctype|html|meta|head|body|div|p|table)/i.test(head)) {
      const fullHtml = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      return htmlFragmentToStructuredText(fullHtml);
    }
    if (head.indexOf("{\\rtf") === 0) {
      const rtf = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      return rtf
        .replace(/\\par[d]?/g, "\n")
        .replace(/\\line\b/g, "\n")
        .replace(/\\tab\b/g, " ")
        .replace(/\\'([0-9a-fA-F]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
        .replace(/\\u(-?\d+)\??/g, function (_, n) { const c = parseInt(n, 10); return String.fromCharCode(c < 0 ? c + 65536 : c); })
        .replace(/\\[a-z]+-?\d* ?/gi, "")
        .replace(/[{}]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    // Check if binary OLE Word 97-2003; extract printable Unicode/ASCII text runs as best effort
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/[^\x09\x0A\x0D\x20-\x7E\u00C0-\u1EF9]/g, " ").replace(/[ \t]{2,}/g, " ").trim();
    if (decoded.length >= 80 && /(?:C\u00e2u|Question|A\.\s|B\.\s)/i.test(decoded)) return decoded;
    throw new Error("T\u1ec7p .doc \u0111\u1ecbnh d\u1ea1ng nh\u1ecb ph\u00e2n c\u0169 (Word 97-2003) kh\u00f4ng th\u1ec3 \u0111\u1ecdc tr\u1ef1c ti\u1ebfp tr\u00ean tr\u00ecnh duy\u1ec7t. H\u00e3y l\u01b0u l\u1ea1i th\u00e0nh .docx ho\u1eb7c .pdf r\u1ed3i t\u1ea3i l\u00ean.");
  }

  async function extractPdfText(file) {
    await ensurePdfJs();
    const buf = await readFileAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    const rawPageLines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const lines = [];
      let curY = null;
      let curLine = "";
      (tc.items || []).forEach(function (it) {
        const str = String(it.str || "");
        if (!str && !it.hasEOL) return;
        const y = it.transform && typeof it.transform[5] === "number" ? Math.round(it.transform[5] / 3) : curY;
        if (curY !== null && y !== curY) {
          if (curLine.trim()) lines.push(curLine.trim());
          curLine = str;
        } else {
          curLine += (curLine && !curLine.endsWith(" ") && !str.startsWith(" ") ? " " : "") + str;
        }
        curY = y;
        if (it.hasEOL) {
          if (curLine.trim()) lines.push(curLine.trim());
          curLine = "";
          curY = null;
        }
      });
      if (curLine.trim()) lines.push(curLine.trim());
      rawPageLines.push(lines);
    }
    // Strip repeated Header / Footer / Watermark across pages via frequency analysis
    const cleanedPages = (D() && typeof D().stripRepeatedHeadersFooters === "function")
      ? D().stripRepeatedHeadersFooters(rawPageLines)
      : rawPageLines.map(function (ls) { return ls.join("\n"); });
    const text = cleanedPages.join("\n\n").trim();
    const isScanned = text.replace(/\s+/g, "").length < 40;
    // If scanned PDF, also render pages to optimized JPEG images for Vision streaming (up to 12 pages)
    let pageImages = [];
    if (isScanned) {
      const maxRenderPages = Math.min(pdf.numPages, 12);
      for (let p = 1; p <= maxRenderPages; p++) {
        try {
          const page = await pdf.getPage(p);
          const vp1 = page.getViewport({ scale: 1 });
          const targetScale = Math.min(2.0, 1500 / Math.max(vp1.width, vp1.height, 1));
          const vp = page.getViewport({ scale: Math.max(1.2, targetScale) });
          const cv = document.createElement("canvas");
          cv.width = Math.round(vp.width);
          cv.height = Math.round(vp.height);
          const ctx = cv.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, cv.width, cv.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          pageImages.push({ mimeType: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.84).split(",")[1] || "", page: p });
        } catch (e) { /* fallback to raw PDF */ }
      }
    }
    return { text: text, pages: cleanedPages, pageCount: pdf.numPages, isScanned: isScanned, pageImages: pageImages };
  }

  function prepareImageBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file \u1ea3nh.")); };
      reader.onload = function (ev) {
        const img = new Image();
        img.onerror = function () { reject(new Error("File \u1ea3nh kh\u00f4ng h\u1ee3p l\u1ec7.")); };
        img.onload = function () {
          const MAX = 1600;
          const w = img.naturalWidth, h = img.naturalHeight;
          const keepOrig = w <= MAX && h <= MAX && file.type === "image/jpeg" && file.size <= 450 * 1024;
          if (keepOrig) {
            return resolve({ mimeType: "image/jpeg", data: String(ev.target.result || "").split(",")[1] || "" });
          }
          const scale = Math.min(1, MAX / Math.max(w, h));
          const cw = Math.round(w * scale), ch = Math.round(h * scale);
          const cv = document.createElement("canvas");
          cv.width = cw; cv.height = ch;
          const ctx = cv.getContext("2d");
          ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          resolve({ mimeType: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.82).split(",")[1] || "" });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function inspectPayloadCapabilities(payload) {
    let hasImage = false;
    let hasPdf = false;
    const contents = (payload && payload.contents) || [];
    contents.forEach(function (c) {
      ((c && c.parts) || []).forEach(function (pt) {
        if (pt && pt.inlineData && pt.inlineData.mimeType) {
          const mt = String(pt.inlineData.mimeType).toLowerCase();
          if (mt.indexOf("image/") === 0) hasImage = true;
          else if (mt.indexOf("pdf") !== -1) hasPdf = true;
        }
      });
    });
    return { hasImage: hasImage, hasPdf: hasPdf };
  }

  function stripProviderPrefix(modelId) {
    return String(modelId || "").replace(/^(?:gemini|groq|openai|openrouter|deepseek):/i, "");
  }

  function buildExecutionPlan(primaryKey, preferredModel, payload) {
    const caps = inspectPayloadCapabilities(payload);
    const pool = parseKeyPoolItems(primaryKey, preferredModel);
    const providerMap = getProviderMap();
    const prefModel = cState.activeFallbackModel || preferredModel || "gemini-2.5-flash";
    const prefProv = detectProviderFromModel(prefModel);
    const candidates = [];
    const seen = {};

    const addCandidate = function (provider, apiKey, modelObj) {
      if (!provider || !apiKey || !modelObj) return;
      if (caps.hasPdf && !modelObj.pdf) return;
      if (caps.hasImage && !modelObj.vision) return;
      const rawM = modelObj.rawModel || stripProviderPrefix(modelObj.id);
      const sig = provider + "|" + apiKey + "|" + rawM;
      if (seen[sig]) return;
      seen[sig] = true;
      candidates.push({
        provider: provider,
        apiKey: apiKey,
        modelId: modelObj.id,
        rawModel: rawM,
        label: modelObj.label || rawM
      });
    };

    // 1. Prioritize personal keys matching the preferred model's provider first
    pool.forEach(function (item) {
      if (item.provider !== prefProv) return;
      const pInfo = providerMap[item.provider];
      if (!pInfo) return;
      const exact = (pInfo.models || []).find(function (m) { return m.id === prefModel || m.rawModel === stripProviderPrefix(prefModel); });
      if (exact) addCandidate(item.provider, item.apiKey, exact);
      (pInfo.models || []).forEach(function (m) { addCandidate(item.provider, item.apiKey, m); });
    });

    // 2. Then add user's other personal keys & capability-compatible models
    pool.forEach(function (item) {
      const pInfo = providerMap[item.provider];
      if (!pInfo) return;
      (pInfo.models || []).forEach(function (m) { addCandidate(item.provider, item.apiKey, m); });
    });

    return candidates;
  }

  function convertGeminiPayloadToOpenAI(rawModel, payload) {
    const sysText = (payload && payload.systemInstruction && payload.systemInstruction.parts && payload.systemInstruction.parts[0] && payload.systemInstruction.parts[0].text) || "";
    const schema = payload && payload.generationConfig && payload.generationConfig.responseSchema;
    let schemaHint = "\nIMPORTANT: Return ONLY valid JSON matching the requested schema (no markdown code blocks, no extra prose).";
    if (schema && schema.properties) {
      if (schema.properties.questions) {
        schemaHint += '\nRequired JSON format: {"questions":[{"question":"...","type":"Multiple Choice","options":["A","B","C","D"],"correct":[1],"explanation":"...","confidence":"high"}]} (Note: correct is 1-based index array e.g. [1] for A).';
      } else if (schema.properties.solutions) {
        schemaHint += '\nRequired JSON format: {"solutions":[{"index":0,"correct":[1],"explanation":"...","confidence":"high"}]} (Note: correct is 1-based index array).';
      } else if (schema.properties.checks) {
        schemaHint += '\nRequired JSON format: {"checks":[{"index":0,"independentCorrect":[1],"confidence":"high","note":"..."}]} (Note: independentCorrect is 1-based index array).';
      }
    }

    const messages = [];
    if (sysText || schemaHint) {
      messages.push({ role: "system", content: (sysText + schemaHint).trim() });
    }

    const userContent = [];
    const contents = (payload && payload.contents) || [];
    contents.forEach(function (c) {
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

    const temp = (payload && payload.generationConfig && typeof payload.generationConfig.temperature === "number")
      ? payload.generationConfig.temperature
      : 0.1;

    const body = {
      model: rawModel,
      messages: messages,
      temperature: temp
    };
    if (rawModel.indexOf("reasoner") === -1) {
      body.response_format = { type: "json_object" };
    }
    return body;
  }

  function parseJsonResponseText(rawTxt) {
    let s = String(rawTxt || "").trim();
    if (!s) throw new Error("Gemini kh\u00f4ng tr\u1ea3 v\u1ec1 JSON.");
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      return JSON.parse(s);
    } catch (e) {
      const firstBrace = s.indexOf("{");
      const lastBrace = s.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(s.slice(firstBrace, lastBrace + 1));
      }
      throw e;
    }
  }

  function isQuotaOrRateLimitError(status, msg) {
    if (status === 429) return true;
    const s = String(msg || "").toLowerCase();
    return s.indexOf("quota") !== -1 || s.indexOf("rate-limit") !== -1 || s.indexOf("rate limit") !== -1 || s.indexOf("resource_exhausted") !== -1 || s.indexOf("exceeded your current quota") !== -1;
  }

  function formatFriendlyGeminiError(errMessage) {
    const raw = String(errMessage || "").trim();
    if (isQuotaOrRateLimitError(0, raw)) {
      const retryMatch = raw.match(/retry in\s+([0-9hms.]+)/i);
      const retryHint = retryMatch ? (" (Th\u1eed l\u1ea1i sau " + retryMatch[1].replace(/\.\d+s$/, "s") + ")") : "";
      return "API Key hi\u1ec7n t\u1ea1i \u0111\u00e3 h\u1ebft h\u1ea1n m\u1ee9c mi\u1ec5n ph\u00ed (Free Tier Quota) tr\u00ean c\u00e1c model kh\u1ea3 d\u1ee5ng" + retryHint + ". H\u00e3y \u0111\u1ed5i sang Gemini API Key kh\u00e1c trong m\u1ee5c C\u00e0i \u0111\u1eb7t API ho\u1eb7c n\u00e2ng c\u1ea5p h\u1ea1n m\u1ee9c Google AI Studio.";
    }
    if (raw.length > 220) return raw.slice(0, 220) + "...";
    return raw || "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh";
  }

  async function callSystemProxy(model, payload, signal) {
    const idToken = getUserIdToken();
    if (!idToken) {
      throw new Error("Vui l\u00f2ng \u0111\u0103ng nh\u1eadp Google \u0111\u1ec3 s\u1eed d\u1ee5ng System AI mi\u1ec5n ph\u00ed ho\u1eb7c nh\u1eadp API Key c\u00e1 nh\u00e2n trong m\u1ee5c C\u00e0i \u0111\u1eb7t API.");
    }
    const reqBodyObj = {
      model: model || "gemini-2.5-flash",
      contents: payload && payload.contents,
      systemInstruction: payload && payload.systemInstruction,
      generationConfig: payload && payload.generationConfig,
      stream: false
    };
    const bodyStr = JSON.stringify(reqBodyObj);
    if (bodyStr.length > 3.6 * 1024 * 1024) {
      throw new Error("K\u00edch th\u01b0\u1edbc \u1ea3nh / d\u1eef li\u1ec7u qu\u00e1 l\u1edbn (> 3.6MB m\u1ed7i l\u01b0\u1ee3t). H\u00e3y gi\u1ea3m b\u1edbt s\u1ed1 t\u1ec7p \u0111\u1ed3ng th\u1eddi ho\u1eb7c ch\u1ecdn \u1ea3nh nh\u1eb9 h\u01a1n.");
    }

    const TIMEOUT_MS = 90000;
    const reqCtrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timedOut = false;
    const timer = reqCtrl ? setTimeout(function () { timedOut = true; reqCtrl.abort(); }, TIMEOUT_MS) : null;
    const onParentAbort = function () { if (reqCtrl) reqCtrl.abort(); };
    if (signal && typeof signal.addEventListener === "function") signal.addEventListener("abort", onParentAbort, { once: true });

    let res;
    try {
      res = await fetch("/api/ai/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + idToken
        },
        body: bodyStr,
        signal: reqCtrl ? reqCtrl.signal : signal
      });
    } catch (fetchErr) {
      if (timer) clearTimeout(timer);
      if (signal && typeof signal.removeEventListener === "function") signal.removeEventListener("abort", onParentAbort);
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (timedOut) throw new Error("Y\u00eau c\u1ea7u t\u1edbi AI Proxy qu\u00e1 th\u1eddi gian ch\u1edd (90s).");
      throw new Error(fetchErr.message || "L\u1ed7i k\u1ebft n\u1ed1i t\u1edbi m\u00e1y ch\u1ee7 AI Proxy.");
    }
    if (timer) clearTimeout(timer);
    if (signal && typeof signal.removeEventListener === "function") signal.removeEventListener("abort", onParentAbort);

    if (!res.ok) {
      const errBody = await res.json().catch(function () { return {}; });
      const msg = (errBody && errBody.error && errBody.error.message) || errBody.error || ("HTTP " + res.status);
      if (res.status === 401) {
        throw new Error("Phi\u00ean \u0111\u0103ng nh\u1eadp Google \u0111\u00e3 h\u1ebft h\u1ea1n ho\u1eb7c kh\u00f4ng h\u1ee3p l\u1ec7. H\u00e3y \u0111\u0103ng nh\u1eadp l\u1ea1i ho\u1eb7c d\u00f9ng API Key c\u00e1 nh\u00e2n. (" + msg + ")");
      }
      if (res.status === 429) {
        throw new Error("System Key Pool \u0111\u00e3 ch\u1ea1m gi\u1edbi h\u1ea1n d\u00f9ng chung ho\u1eb7c quota t\u1ea1m th\u1eddi. H\u00e3y th\u00eam API Key c\u00e1 nh\u00e2n mi\u1ec5n ph\u00ed \u0111\u1ec3 d\u00f9ng kh\u00f4ng gi\u1edbi h\u1ea1n! (" + msg + ")");
      }
      throw new Error(formatFriendlyGeminiError(msg));
    }

    const fbProvider = res.headers.get("X-AI-Fallback-Provider") || "";
    const fbModel = res.headers.get("X-AI-Fallback-Model") || "";
    const data = await res.json();
    const txt = (data && data.text) ||
      (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ||
      (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);

    if (fbModel && fbModel !== model && cState.fallbackToastShownFor !== (fbProvider + ":" + fbModel)) {
      cState.fallbackToastShownFor = fbProvider + ":" + fbModel;
      U().showToast("Model " + model + " \u0111ang b\u1eadn — h\u1ec7 th\u1ed1ng \u0111\u00e3 t\u1ef1 \u0111\u1ed9ng chuy\u1ec3n sang " + (fbProvider ? (fbProvider + " / ") : "") + fbModel + ".", "info");
    }
    return parseJsonResponseText(txt);
  }

  async function callGemini(apiKey, model, payload, signal) {
    // STRICT PRIORITY:
    // 1. Personal keys saved in browser -> direct calls to providers; NEVER silently fall back to System Pool on 401/429.
    // 2. Zero personal keys -> System Default Pool via /api/ai/proxy (requires Google Sign-In ID token).
    const personalItems = parseKeyPoolItems(apiKey, model);
    if (personalItems.length === 0) {
      return await callSystemProxy(model, payload, signal);
    }

    const plan = buildExecutionPlan(apiKey, model, payload);
    if (plan.length === 0) {
      throw new Error("Kh\u00f4ng t\u00ecm th\u1ea5y Model AI t\u01b0\u01a1ng th\u00edch trong danh s\u00e1ch Key c\u00e1 nh\u00e2n c\u1ee7a b\u1ea1n. N\u1ebfu \u0111\u1ecdc \u1ea3nh/PDF scan, h\u00e3y th\u00eam Key Gemini, Groq, OpenAI ho\u1eb7c OpenRouter.");
    }
    const providerMap = getProviderMap();
    const TIMEOUT_MS = 90000;
    let lastErrorMsg = "";
    let lastStatus = 0;

    for (let i = 0; i < plan.length; i++) {
      const cand = plan[i];
      const isGemini = cand.provider === "gemini";
      const pInfo = providerMap[cand.provider] || FALLBACK_PROVIDER_INFO[cand.provider];
      const url = isGemini
        ? ("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(cand.rawModel) + ":generateContent")
        : pInfo.endpoint;
      const headers = { "Content-Type": "application/json" };
      if (isGemini) {
        headers["x-goog-api-key"] = cand.apiKey;
      } else {
        headers["Authorization"] = "Bearer " + cand.apiKey;
        if (cand.provider === "openrouter" && typeof location !== "undefined") {
          headers["HTTP-Referer"] = location.origin;
          headers["X-Title"] = "AI Tutor";
        }
      }
      const reqBodyObj = isGemini ? payload : convertGeminiPayloadToOpenAI(cand.rawModel, payload);

      for (let attempt = 0; attempt < 2; attempt++) {
        if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
        const reqCtrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        let timedOut = false;
        const timer = reqCtrl ? setTimeout(function () { timedOut = true; reqCtrl.abort(); }, TIMEOUT_MS) : null;
        const onParentAbort = function () { if (reqCtrl) reqCtrl.abort(); };
        if (signal && typeof signal.addEventListener === "function") signal.addEventListener("abort", onParentAbort, { once: true });
        let res;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(reqBodyObj),
            signal: reqCtrl ? reqCtrl.signal : signal
          });
        } catch (fetchErr) {
          if (timer) clearTimeout(timer);
          if (signal && typeof signal.removeEventListener === "function") signal.removeEventListener("abort", onParentAbort);
          if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
          if (timedOut) {
            if (attempt < 1) continue;
            lastErrorMsg = "Y\u00eau c\u1ea7u t\u1edbi AI qu\u00e1 th\u1eddi gian ch\u1edd (Timeout 90s). Vui l\u00f2ng th\u1eed l\u1ea1i.";
            break;
          }
          lastErrorMsg = fetchErr.message || "Network error";
          break;
        }
        if (timer) clearTimeout(timer);
        if (signal && typeof signal.removeEventListener === "function") signal.removeEventListener("abort", onParentAbort);

        if (res.ok) {
          const data = await res.json();
          const txt = isGemini
            ? (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text)
            : (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);
          const parsed = parseJsonResponseText(txt);
          if (cand.modelId !== model && cState.activeFallbackModel !== cand.modelId) {
            cState.activeFallbackModel = cand.modelId;
            U().showToast("Model " + model + " (Key c\u00e1 nh\u00e2n) \u0111\u00e3 h\u1ebft l\u01b0\u1ee3t — t\u1ef1 \u0111\u1ed9ng chuy\u1ec3n sang Key c\u00e1 nh\u00e2n ti\u1ebfp theo: " + cand.rawModel, "info");
          }
          return parsed;
        }

        const errBody = await res.json().catch(function () { return {}; });
        const errMsg = (errBody && errBody.error && errBody.error.message) || ("HTTP " + res.status);
        lastStatus = res.status;
        lastErrorMsg = errMsg;

        // Rotate across the user's OWN personal keys on quota/auth/model errors (NEVER to System Pool)
        if (isQuotaOrRateLimitError(res.status, errMsg) || res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404 || res.status === 503) {
          break;
        }

        if (res.status >= 500 && attempt < 1) {
          await new Promise(function (r) { setTimeout(r, 1200); });
          continue;
        }
        break;
      }
    }
    const statusHint = (lastStatus === 401 || lastStatus === 403)
      ? "Key c\u00e1 nh\u00e2n kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c b\u1ecb thu h\u1ed3i (HTTP " + lastStatus + "). Ki\u1ec3m tra l\u1ea1i Key c\u00e1 nh\u00e2n trong C\u00e0i \u0111\u1eb7t API (h\u1ec7 th\u1ed1ng kh\u00f4ng t\u1ef1 chuy\u1ec3n sang System Pool)."
      : formatFriendlyGeminiError(lastErrorMsg || "T\u1ea5t c\u1ea3 Key c\u00e1 nh\u00e2n \u0111\u1ec1u th\u1ea5t b\u1ea1i ho\u1eb7c h\u1ebft h\u1ea1n m\u1ee9c.");
    throw new Error(statusHint);
  }

  /* ======================== STREAMING MARKDOWN DIGITIZER CALLER ======================== */
  async function readSseTextStream(res, providerHint, onDelta, signal) {
    if (!res.body || typeof res.body.getReader !== "function") {
      const fallbackText = await res.text().catch(function () { return ""; });
      if (fallbackText && onDelta) onDelta(fallbackText);
      return fallbackText;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let sseBuf = "";
    let fullText = "";
    try {
      while (true) {
        if (signal && signal.aborted) {
          try { await reader.cancel(); } catch (e) { /* */ }
          throw new DOMException("Aborted", "AbortError");
        }
        const chunk = await reader.read();
        if (chunk.done) break;
        sseBuf += decoder.decode(chunk.value, { stream: true });
        const lines = sseBuf.split(/\r?\n/);
        sseBuf = lines.pop() || "";
        for (let i = 0; i < lines.length; i++) {
          const delta = D() ? D().extractDeltaFromSseLine(lines[i], providerHint) : "";
          if (delta) {
            fullText += delta;
            if (onDelta) onDelta(delta);
          }
        }
      }
      if (sseBuf.trim()) {
        const lastDelta = D() ? D().extractDeltaFromSseLine(sseBuf, providerHint) : "";
        if (lastDelta) {
          fullText += lastDelta;
          if (onDelta) onDelta(lastDelta);
        }
      }
    } finally {
      try { reader.releaseLock(); } catch (e) { /* */ }
    }
    return fullText;
  }

  async function streamMarkdownAI(apiKey, model, payload, signal, onDelta) {
    const startTs = Date.now();
    let firstTokenRecorded = false;
    const wrappedOnDelta = function (delta) {
      if (!firstTokenRecorded && delta) {
        firstTokenRecorded = true;
        cState.ttftMs = Date.now() - startTs;
      }
      if (onDelta) onDelta(delta);
    };

    const personalItems = parseKeyPoolItems(apiKey, model);
    if (personalItems.length === 0) {
      const idToken = getUserIdToken();
      if (!idToken) {
        throw new Error("Vui l\u00f2ng \u0111\u0103ng nh\u1eadp Google \u0111\u1ec3 s\u1eed d\u1ee5ng System AI mi\u1ec5n ph\u00ed ho\u1eb7c nh\u1eadp API Key c\u00e1 nh\u00e2n.");
      }
      const reqBodyObj = {
        model: model || "gemini-3.5-flash-lite",
        contents: payload.contents,
        systemInstruction: payload.systemInstruction,
        generationConfig: Object.assign({ temperature: 0.1, maxOutputTokens: 8192 }, payload.generationConfig || {}),
        stream: true
      };
      const res = await fetch("/api/ai/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + idToken },
        body: JSON.stringify(reqBodyObj),
        signal: signal
      });
      if (!res.ok) {
        const errBody = await res.json().catch(function () { return {}; });
        const msg = (errBody && errBody.error && errBody.error.message) || errBody.error || ("HTTP " + res.status);
        throw new Error(formatFriendlyGeminiError(msg));
      }
      const provHint = res.headers.get("X-AI-Provider") || "";
      const ct = String(res.headers.get("content-type") || "").toLowerCase();
      if (ct.indexOf("text/event-stream") !== -1) {
        return await readSseTextStream(res, provHint, wrappedOnDelta, signal);
      }
      const data = await res.json();
      const txt = (data && data.text) || "";
      if (txt) wrappedOnDelta(txt);
      return txt;
    }

    const plan = buildExecutionPlan(apiKey, model, payload);
    if (plan.length === 0) {
      throw new Error("Kh\u00f4ng t\u00ecm th\u1ea5y Model AI t\u01b0\u01a1ng th\u00edch trong danh s\u00e1ch Key c\u00e1 nh\u00e2n.");
    }
    const providerMap = getProviderMap();
    let lastErrorMsg = "";
    for (let i = 0; i < plan.length; i++) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      const cand = plan[i];
      const isGemini = cand.provider === "gemini";
      const pInfo = providerMap[cand.provider] || FALLBACK_PROVIDER_INFO[cand.provider];
      const url = isGemini
        ? ("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(cand.rawModel) + ":streamGenerateContent?alt=sse")
        : pInfo.endpoint;
      const headers = { "Content-Type": "application/json" };
      if (isGemini) {
        headers["x-goog-api-key"] = cand.apiKey;
      } else {
        headers["Authorization"] = "Bearer " + cand.apiKey;
        if (cand.provider === "openrouter" && typeof location !== "undefined") {
          headers["HTTP-Referer"] = location.origin;
          headers["X-Title"] = "AI Tutor";
        }
      }
      let reqBodyObj;
      if (isGemini) {
        reqBodyObj = {
          systemInstruction: payload.systemInstruction,
          contents: payload.contents,
          generationConfig: Object.assign({ temperature: 0.1, maxOutputTokens: 8192 }, payload.generationConfig || {})
        };
      } else {
        reqBodyObj = convertGeminiPayloadToOpenAI(cand.rawModel, payload);
        delete reqBodyObj.response_format;
        // Strip JSON-only schema hint injected by convertGeminiPayloadToOpenAI when streaming Markdown
        if (reqBodyObj.messages && reqBodyObj.messages[0] && reqBodyObj.messages[0].role === "system") {
          reqBodyObj.messages[0].content = (payload.systemInstruction && payload.systemInstruction.parts && payload.systemInstruction.parts[0] && payload.systemInstruction.parts[0].text) || "";
        }
        reqBodyObj.stream = true;
      }
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(reqBodyObj),
          signal: signal
        });
        if (res.ok) {
          return await readSseTextStream(res, cand.provider, wrappedOnDelta, signal);
        }
        const errBody = await res.json().catch(function () { return {}; });
        lastErrorMsg = (errBody && errBody.error && errBody.error.message) || ("HTTP " + res.status);
      } catch (e) {
        if (e && e.name === "AbortError") throw e;
        lastErrorMsg = (e && e.message) || "Network error";
      }
    }
    throw new Error(formatFriendlyGeminiError(lastErrorMsg || "Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i AI."));
  }

  function mergeChunkDocsToState(baseQuestions, isComplete) {
    if (!D()) return;
    const parser = D().createIncrementalParser();
    const combinedMd = cState.chunkStates
      .map(function (st) { return st.markdown || ""; })
      .filter(Boolean)
      .join("\n\n");
    cState.rawMarkdown = combinedMd;
    const parsedDoc = isComplete ? parser.parseFull(combinedMd) : parser.append(combinedMd);
    if (parsedDoc.error) {
      U().showToast(parsedDoc.error, "error");
    }
    if (parsedDoc.meta && (parsedDoc.meta.title || parsedDoc.meta.mode === "STUDY_NOTE")) {
      cState.docMeta = parsedDoc.meta;
    }
    cState.contexts = parsedDoc.contexts || {};
    cState.studyNoteMarkdown = parsedDoc.studyNoteMarkdown || "";
    cState.streamingTail = isComplete ? "" : (parsedDoc.streamingTail || "");

    // Preserve cached explanations & user edits
    const nextQs = parsedDoc.questions.map(function (q) {
      const cacheKey = makeExplainCacheKey(q);
      if (!q.explanation && cState.explainCache[cacheKey]) {
        q.explanation = cState.explainCache[cacheKey];
      }
      return q;
    });
    if (nextQs.length > 0 || isComplete) {
      cState.questions = baseQuestions.concat(nextQs);
    }
    if (!cState.pinnedContextId) {
      const firstCtx = Object.keys(cState.contexts)[0];
      if (firstCtx) cState.pinnedContextId = firstCtx;
    }
  }

  function makeExplainCacheKey(q) {
    const raw = String((q && q.text) || "").trim().slice(0, 140) + "|" + ((q && q.options) || []).filter(Boolean).join("|").slice(0, 120);
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    return "exp_" + Math.abs(hash).toString(36);
  }

  async function explainSingleQuestionOnDemand(idx) {
    const q = cState.questions[idx];
    if (!q) return;
    const cacheKey = makeExplainCacheKey(q);
    if (cState.explainCache[cacheKey]) {
      q.explanation = cState.explainCache[cacheKey];
      renderConverter();
      U().showToast("\u0110\u00e3 t\u1ea3i l\u1eddi gi\u1ea3i t\u1eeb b\u1ed9 nh\u1edb \u0111\u1ec7m (0 token).", "info");
      return;
    }
    const apiKey = requireApiKey();
    if (!apiKey) return;
    cState.explainingId = q.id;
    renderConverter();
    try {
      const ctxObj = q.contextId && cState.contexts[q.contextId] ? cState.contexts[q.contextId] : null;
      let userPrompt = "Gi\u1ea3i th\u00edch chi ti\u1ebft, ch\u00ednh x\u00e1c v\u00e0 ng\u1eafn g\u1ecdn b\u1eb1ng ti\u1ebfng Vi\u1ec7t (d\u00f9ng LaTeX $...$ n\u1ebfu c\u00f3 c\u00f4ng th\u1ee9c) cho c\u00e2u h\u1ecfi sau:\n\n";
      if (q.instruction) userPrompt += "[Y\u00eau c\u1ea7u \u0111\u1ec1 b\u00e0i]: " + q.instruction + "\n\n";
      if (ctxObj) userPrompt += "[Ng\u1eef li\u1ec7u chung " + ctxObj.id + "]:\n" + ctxObj.content + "\n\n";
      userPrompt += "[C\u00e2u h\u1ecfi (" + (q.qType || "MCQ") + ")]: " + q.text + "\n";
      if ((q.qType || "MCQ") === "MCQ") {
        q.options.forEach(function (o, k) { if (o) userPrompt += U().LETTERS.charAt(k) + ". " + o + "\n"; });
      } else if (q.qType === "TF_GROUP") {
        (q.tfStatements || []).forEach(function (st) { userPrompt += st.key + ") " + st.text + "\n"; });
      }
      if (q.answerText) userPrompt += "[\u0110\u00e1p \u00e1n g\u1ed1c]: " + q.answerText + "\n";

      let streamedExp = "";
      let lastPaint = 0;
      await streamMarkdownAI(apiKey, getApiModel(), {
        systemInstruction: { parts: [{ text: "B\u1ea1n l\u00e0 gia s\u01b0 AI xu\u1ea5t s\u1eafc. Gi\u1ea3i th\u00edch r\u00f5 r\u00e0ng v\u00ec sao \u0111\u00e1p \u00e1n \u0111\u00fang (n\u00eau \u0111\u00e1p \u00e1n \u0111\u00fang \u1edf d\u00f2ng \u0111\u1ea7u), kh\u00f4ng ch\u00e0o h\u1ecfi d\u00e0i d\u00f2ng." }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 1200 }
      }, undefined, function (delta) {
        streamedExp += delta;
        q.explanation = streamedExp.trim();
        const now = Date.now();
        if (now - lastPaint > 120) {
          lastPaint = now;
          renderConverter();
        }
      });
      q.explanation = streamedExp.trim();
      if (q.explanation) {
        cState.explainCache[cacheKey] = q.explanation;
        saveExplainCache();
      }
      U().showToast("\u0110\u00e3 t\u1ea1o & l\u01b0u cache l\u1eddi gi\u1ea3i chi ti\u1ebft!", "success");
    } catch (err) {
      U().showToast("L\u1ed7i AI Gi\u1ea3i th\u00edch: " + formatFriendlyGeminiError(err && err.message), "error");
    } finally {
      cState.explainingId = "";
      renderConverter();
    }
  }

  async function retryFailedChunk(chunkIdx) {
    const st = cState.chunkStates[chunkIdx];
    if (!st || cState.busy) return;
    const apiKey = requireApiKey();
    if (!apiKey) return;
    cState.busy = true;
    cState.abortCtrl = new AbortController();
    const signal = cState.abortCtrl.signal;
    st.status = "streaming";
    st.error = "";
    st.markdown = "";
    renderConverter();
    try {
      const masterSys = D() ? D().MASTER_SYSTEM_PROMPT : ocrPrompt(cState.subject, cState.keepPrefix);
      const userParts = st.isVision
        ? [{ text: (cState.autoSolve ? "[AUTO_SOLVE=TRUE] " : "[AUTO_SOLVE=FALSE] ") + "S\u1ed1 h\u00f3a 100% n\u1ed9i dung t\u1eeb \u1ea3nh sau sang Markdown chu\u1ea9n c\u1ea5u tr\u00fac:" }].concat(
            (st.b64List || []).map(function (b64) { return { inlineData: { mimeType: b64.mimeType, data: b64.data } }; })
          )
        : [{ text: D().buildChunkUserPrompt(st.chunk, { autoSolve: cState.autoSolve, subject: cState.subject }) }];
      let lastRender = 0;
      await streamMarkdownAI(apiKey, getApiModel(), {
        systemInstruction: { parts: [{ text: masterSys }] },
        contents: [{ role: "user", parts: userParts }],
        generationConfig: { temperature: 0.05, maxOutputTokens: 8192 }
      }, signal, function (delta) {
        st.markdown += delta;
        const now = Date.now();
        if (now - lastRender > 150) {
          lastRender = now;
          mergeChunkDocsToState([], false);
          renderConverter();
        }
      });
      st.status = "done";
      mergeChunkDocsToState([], true);
      U().showToast("\u0110\u00e3 th\u1eed l\u1ea1i th\u00e0nh c\u00f4ng " + st.label + "!", "success");
    } catch (err) {
      st.status = "error";
      st.error = formatFriendlyGeminiError(err && err.message);
      U().showToast("Th\u1eed l\u1ea1i th\u1ea5t b\u1ea1i: " + st.error, "error");
    } finally {
      cState.busy = false;
      renderConverter();
    }
  }

  function ocrPrompt(subject, keepPrefix) {
    if (D() && D().MASTER_SYSTEM_PROMPT) return D().MASTER_SYSTEM_PROMPT;
    const guides = {
      math: "CHUY\u00caN TO\u00c1N/L\u00dd/H\u00d3A: B\u1ecdc m\u1ecdi c\u00f4ng th\u1ee9c trong LaTeX $...$ ho\u1eb7c $$...$$ (\\frac, \\sqrt[n]{}, x^{}, u_{}, \\int, \\lim, \\begin{cases}, \\vec, \\widehat, \\mathbb{R}). Kh\u00f4ng r\u00fat g\u1ecdn hay bi\u1ebfn ph\u00e2n s\u1ed1 th\u00e0nh x+1/x-2.",
      english: "CHUY\u00caN TI\u1ebeNG ANH: B\u1eaft bu\u1ed9c b\u1ecdc k\u00fd t\u1ef1/c\u1ee5m t\u1eeb b\u1ecb G\u1ea0CH CH\u00c2N b\u1eb1ng <u>...</u> (vd: biom<u>a</u>ss), in \u0111\u1eadm <b>...</b>, in nghi\u00eang <i>...</i>, gi\u1eef nguy\u00ean d\u1ea5u tr\u1ecdng \u00e2m (ˈ, ˌ), IPA v\u00e0 ch\u1ed7 tr\u1ed1ng ________.",
      theory: "M\u00d4N L\u00dd THUY\u1ebeT: Gi\u1eef ch\u00ednh x\u00e1c t\u1eebng t\u1eeb, b\u1ecdc <b>/<i>/<u> n\u1ebfu c\u00f3 nh\u1ea5n m\u1ea1nh, LaTeX $...$ n\u1ebfu c\u00f3 c\u00f4ng th\u1ee9c.",
      auto: "T\u1ef0 \u0110\u1ed8NG: C\u00f4ng th\u1ee9c To\u00e1n/L\u00fd/H\u00f3a b\u1ecdc LaTeX $...$ (\\frac, \\sqrt, ^{}, _{}, \\int, \\lim, \\mathbb{R}). Ti\u1ebfng Anh/Ng\u00f4n ng\u1eef b\u1ecdc ph\u1ea7n g\u1ea1ch ch\u00e2n b\u1eb1ng <u>...</u>, in \u0111\u1eadm <b>, in nghi\u00eang <i>, gi\u1eef tr\u1ecdng \u00e2m (ˈ, ˌ) v\u00e0 ch\u1ed7 tr\u1ed1ng ________."
    };
    const pref = keepPrefix ? "Gi\u1eef s\u1ed1 c\u00e2u \u1edf \u0111\u1ea7u question, b\u1ecf nh\u00e3n A./B./C./D. \u1edf \u0111\u1ea7u c\u00e1c ph\u01b0\u01a1ng \u00e1n." : "B\u1ecf ti\u1ec1n t\u1ed1 C\u00e2u 1., Question 1:, A., B., C., D. \u1edf \u0111\u1ea7u c\u00e2u h\u1ecfi v\u00e0 ph\u01b0\u01a1ng \u00e1n.";
    return "B\u1ea1n l\u00e0 chuy\u00ean gia s\u1ed1 h\u00f3a \u0111\u1ec1 thi chu\u1ea9n x\u00e1c 100%. " + (guides[subject] || guides.auto) + "\n" +
      "1. " + pref + "\n" +
      "2. S\u1eeda l\u1ed7i \u0111\u1ecbnh d\u1ea1ng l\u1ed9n x\u1ed9n / v\u1ee1 d\u00f2ng nh\u01b0ng gi\u1eef nguy\u00ean n\u1ed9i dung h\u1ecdc thu\u1eadt.\n" +
      "3. N\u1ebfu t\u00e0i li\u1ec7u c\u00f3 \u0111\u00e1nh d\u1ea5u \u0111\u00e1p \u00e1n \u0111\u00fang (khoanh, t\u00f4 m\u00e0u, g\u1ea1ch ch\u00e2n c\u1ea3 \u0111\u00e1p \u00e1n, in \u0111\u1eadm), tr\u1ea3 v\u1ec1 ch\u1ec9 s\u1ed1 1-based trong correct (vd [1] cho A, [1,3] cho Checkbox). N\u1ebfu ch\u01b0a c\u00f3 \u0111\u00e1p \u00e1n, h\u00e3y t\u1ef1 gi\u1ea3i ch\u00ednh x\u00e1c v\u00e0 tr\u1ea3 v\u1ec1 \u0111\u00e1p \u00e1n 1-based k\u00e8m gi\u1ea3i th\u00edch ng\u1eafn g\u1ecdn ti\u1ebfng Vi\u1ec7t.\n" +
      "4. T\u1ef1 ki\u1ec3m tra l\u1ea1i (self-check) ph\u00e2n s\u1ed1, s\u1ed1 m\u0169, ch\u1ec9 s\u1ed1 d\u01b0\u1edbi, th\u1ebb <u>...</u> v\u00e0 \u0111\u00e1p \u00e1n tr\u01b0\u1edbc khi tr\u1ea3 JSON.";
  }

  const QUESTION_LIST_SCHEMA = {
    type: "OBJECT",
    properties: {
      questions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING" },
            type: { type: "STRING", enum: ["Multiple Choice", "Checkbox"] },
            options: { type: "ARRAY", items: { type: "STRING" } },
            correct: { type: "ARRAY", items: { type: "INTEGER" } },
            explanation: { type: "STRING" },
            confidence: { type: "STRING", enum: ["high", "medium", "low"] }
          },
          required: ["question", "type", "options", "correct"]
        }
      }
    },
    required: ["questions"]
  };

  function toConvItem(raw) {
    const text = String((raw && (raw.question || raw.text)) || "").trim();
    if (!text) return null;
    const optsRaw = Array.isArray(raw && raw.options) ? raw.options.map(function (o) { return String(o == null ? "" : o).trim(); }).filter(Boolean) : [];
    if (optsRaw.length < 2) return null;
    const options = [0, 1, 2, 3, 4].map(function (i) { return optsRaw[i] || ""; });
    let correct = Array.isArray(raw && raw.correct) ? raw.correct.map(function (n) { return Number(n) - 1; }) : [];
    if (raw && raw._zeroBased && Array.isArray(raw.correct)) correct = raw.correct.map(Number);
    correct = Array.from(new Set(correct)).filter(function (i) { return Number.isInteger(i) && i >= 0 && i < optsRaw.length; }).sort(function (a, b) { return a - b; });
    const type = (String((raw && raw.type) || "").toLowerCase() === "checkbox" || String((raw && raw.type) || "") === "multiple" || correct.length > 1) ? "Checkbox" : "Multiple Choice";
    const conf = String((raw && raw.confidence) || "high").toLowerCase();
    const isLowConf = (conf === "low" || conf === "medium") && correct.length > 0;
    return {
      id: "cq_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      text: text, type: type, options: options, correct: correct,
      time: parseInt(raw && raw.time, 10) > 0 ? parseInt(raw.time, 10) : cState.defaultTime,
      image: String((raw && raw.image) || "").trim(),
      explanation: String((raw && raw.explanation) || "").trim(),
      verified: false,
      suspect: isLowConf,
      checkNote: isLowConf ? ("\u0110\u1ed9 t\u1ef1 tin " + conf + ".") : (correct.length > 0 && raw && raw.confidence ? "AI ki\u1ec3m tra ch\u00e9o kh\u1edbp \u0111\u00e1p \u00e1n (\u0110\u1ed9 t\u1ef1 tin cao)." : ""),
      _selfChecked: !!(raw && raw.confidence)
    };
  }

  function chunkLongText(text, maxLen) {
    const limit = maxLen || 11000;
    if (text.length <= limit) return [text];
    const parts = [];
    const paras = text.split(/\n{2,}/);
    let cur = "";
    paras.forEach(function (p) {
      if (cur && (cur.length + p.length + 2) > limit) {
        parts.push(cur);
        cur = p;
      } else {
        cur = cur ? (cur + "\n\n" + p) : p;
      }
    });
    if (cur) parts.push(cur);
    return parts;
  }

  /* Reusable AI Solver over an arbitrary question array */
  async function solveQuestionsArray(list, apiKey, model, signal, pctStart, pctEnd) {
    const missingIdx = list.map(function (q, i) { return q.correct.length === 0 ? i : -1; }).filter(function (i) { return i !== -1; });
    if (missingIdx.length === 0) return 0;
    const wantExplain = U().can("aiExplain") || true;
    const BATCH = 20;
    const schema = {
      type: "OBJECT",
      properties: {
        solutions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              index: { type: "INTEGER" },
              correct: { type: "ARRAY", items: { type: "INTEGER" } },
              explanation: { type: "STRING" },
              confidence: { type: "STRING", enum: ["high", "medium", "low"] }
            },
            required: ["index", "correct", "explanation"]
          }
        }
      },
      required: ["solutions"]
    };
    let solved = 0;
    const p0 = typeof pctStart === "number" ? pctStart : 0;
    const p1 = typeof pctEnd === "number" ? pctEnd : 100;
    for (let st = 0; st < missingIdx.length; st += BATCH) {
      if (signal && signal.aborted) break;
      const slice = missingIdx.slice(st, st + BATCH);
      cState.progressLabel = "AI \u0111ang gi\u1ea3i \u0111\u00e1p \u00e1n " + (st + 1) + "–" + Math.min(st + BATCH, missingIdx.length) + "/" + missingIdx.length + "...";
      cState.progressPct = Math.round(p0 + ((st / missingIdx.length) * (p1 - p0)));
      renderConverter();
      const items = slice.map(function (idx) {
        const q = list[idx];
        return { index: idx, question: q.text, type: q.type, options: q.options.filter(Boolean).map(function (o, k) { return (k + 1) + ". " + o; }) };
      });
      const res = await callGemini(apiKey, model, {
        systemInstruction: { parts: [{ text: "B\u1ea1n l\u00e0 gi\u1ea3ng vi\u00ean xu\u1ea5t s\u1eafc. Gi\u1ea3i ch\u00ednh x\u00e1c t\u1eebng c\u00e2u h\u1ecfi, t\u1ef1 ki\u1ec3m tra ch\u00e9o (self-check) m\u1ee9c \u0111\u1ed9 t\u1ef1 tin (high/medium/low), tr\u1ea3 v\u1ec1 ch\u1ec9 s\u1ed1 1-based trong correct v\u00e0 gi\u1ea3i th\u00edch ng\u1eafn g\u1ecdn ti\u1ebfng Vi\u1ec7t (d\u00f9ng LaTeX $...$ cho To\u00e1n/L\u00fd/H\u00f3a)." }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(items) }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: schema }
      }, signal);
      (res && Array.isArray(res.solutions) ? res.solutions : []).forEach(function (s) {
        const q = list[s.index];
        if (!q) return;
        const optLen = q.options.filter(Boolean).length;
        const corr = Array.from(new Set((s.correct || []).map(function (n) { return Number(n) - 1; }))).filter(function (n) { return n >= 0 && n < optLen; }).sort(function (a, b) { return a - b; });
        if (corr.length > 0) {
          q.correct = corr;
          if (corr.length > 1) q.type = "Checkbox";
          if (wantExplain && s.explanation && !q.explanation) q.explanation = String(s.explanation).trim();
          const conf = String(s.confidence || "high").toLowerCase();
          q.suspect = conf === "low" || conf === "medium";
          q.checkNote = q.suspect ? ("\u0110\u1ed9 t\u1ef1 tin " + conf + ".") : "AI ki\u1ec3m tra ch\u00e9o kh\u1edbp \u0111\u00e1p \u00e1n (\u0110\u1ed9 t\u1ef1 tin cao).";
          q._selfChecked = true;
          solved++;
        }
      });
      cState.progressPct = Math.round(p0 + ((Math.min(st + BATCH, missingIdx.length) / missingIdx.length) * (p1 - p0)));
    }
    return solved;
  }

  /* Reusable AI Double-Check over an arbitrary question array */
  async function doubleCheckQuestionsArray(list, apiKey, model, signal, pctStart, pctEnd) {
    if (!list || list.length === 0) return 0;
    const BATCH = 25;
    const schema = {
      type: "OBJECT",
      properties: {
        checks: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              index: { type: "INTEGER" },
              independentCorrect: { type: "ARRAY", items: { type: "INTEGER" } },
              confidence: { type: "STRING", enum: ["high", "medium", "low"] },
              note: { type: "STRING" }
            },
            required: ["index", "independentCorrect", "confidence", "note"]
          }
        }
      },
      required: ["checks"]
    };
    let flagged = 0;
    const p0 = typeof pctStart === "number" ? pctStart : 0;
    const p1 = typeof pctEnd === "number" ? pctEnd : 100;
    for (let st = 0; st < list.length; st += BATCH) {
      if (signal && signal.aborted) break;
      const slice = list.slice(st, st + BATCH);
      cState.progressLabel = "AI \u0111ang ki\u1ec3m tra ch\u00e9o \u0111\u00e1p \u00e1n " + (st + 1) + "–" + Math.min(st + BATCH, list.length) + "/" + list.length + "...";
      cState.progressPct = Math.round(p0 + ((st / list.length) * (p1 - p0)));
      renderConverter();
      const items = slice.map(function (q, offset) {
        return { index: st + offset, question: q.text, options: q.options.filter(Boolean).map(function (o, k) { return (k + 1) + ". " + o; }) };
      });
      const res = await callGemini(apiKey, model, {
        systemInstruction: { parts: [{ text: "Gi\u1ea3i \u0111\u1ed9c l\u1eadp t\u1eebng c\u00e2u h\u1ecfi t\u1eeb \u0111\u1ea7u (kh\u00f4ng ph\u1ecfng \u0111o\u00e1n). Tr\u1ea3 v\u1ec1 \u0111\u00e1p \u00e1n 1-based trong independentCorrect, m\u1ee9c \u0111\u1ed9 t\u1ef1 tin (high/medium/low), v\u00e0 nh\u1eadn x\u00e9t ng\u1eafn g\u1ecdn ti\u1ebfng Vi\u1ec7t." }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(items) }] }],
        generationConfig: { temperature: 0.0, responseMimeType: "application/json", responseSchema: schema }
      }, signal);
      (res && Array.isArray(res.checks) ? res.checks : []).forEach(function (chk) {
        const q = list[chk.index];
        if (!q) return;
        const optLen = q.options.filter(Boolean).length;
        const ind = Array.from(new Set((chk.independentCorrect || []).map(function (n) { return Number(n) - 1; }))).filter(function (n) { return n >= 0 && n < optLen; }).sort(function (a, b) { return a - b; });
        const same = ind.length === q.correct.length && ind.every(function (v, idx) { return v === q.correct[idx]; });
        if (q.correct.length === 0 && ind.length > 0) {
          q.correct = ind;
          if (ind.length > 1) q.type = "Checkbox";
        }
        if (!same || chk.confidence !== "high") {
          q.suspect = true;
          q.verified = false;
          const sug = ind.map(function (i) { return U().LETTERS.charAt(i); }).join(",") || "ch\u01b0a r\u00f5";
          q.checkNote = (!same ? ("AI ki\u1ec3m tra ch\u00e9o \u0111\u1ec1 xu\u1ea5t: " + sug + ". ") : ("\u0110\u1ed9 t\u1ef1 tin " + chk.confidence + ". ")) + (chk.note || "");
          flagged++;
        } else {
          q.suspect = false;
          q.checkNote = "AI ki\u1ec3m tra ch\u00e9o kh\u1edbp \u0111\u00e1p \u00e1n (\u0110\u1ed9 t\u1ef1 tin cao).";
        }
        q._selfChecked = true;
      });
      cState.progressPct = Math.round(p0 + ((Math.min(st + BATCH, list.length) / list.length) * (p1 - p0)));
    }
    return flagged;
  }

  /* Extract + Solve unstructured text via Gemini */
  async function extractAndSolveTextWithAI(rawText, apiKey, model, signal, pctStart, pctEnd) {
    const chunks = chunkLongText(rawText, 11000);
    const out = [];
    const p0 = typeof pctStart === "number" ? pctStart : 25;
    const p1 = typeof pctEnd === "number" ? pctEnd : 75;
    for (let i = 0; i < chunks.length; i++) {
      if (signal && signal.aborted) break;
      cState.progressLabel = "AI \u0111ang c\u1ea5u tr\u00fac & gi\u1ea3i \u0111\u1ec1 (ph\u1ea7n " + (i + 1) + "/" + chunks.length + ")...";
      cState.progressPct = Math.round(p0 + ((i / chunks.length) * (p1 - p0)));
      renderConverter();
      const res = await callGemini(apiKey, model, {
        systemInstruction: { parts: [{ text: ocrPrompt(cState.subject, cState.keepPrefix) }] },
        contents: [{ role: "user", parts: [{ text: "\u0110\u1ecdc \u0111o\u1ea1n \u0111\u1ec1 thi sau, chu\u1ea9n h\u00f3a to\u00e0n b\u1ed9 c\u00e2u h\u1ecfi tr\u1eafc nghi\u1ec7m v\u00e0 gi\u1ea3i ch\u00ednh x\u00e1c m\u1ecdi c\u00e2u h\u1ecfi (k\u00e8m gi\u1ea3i th\u00edch ng\u1eafn g\u1ecdn v\u00e0 m\u1ee9c \u0111\u1ed9 t\u1ef1 tin confidence):\n\n" + chunks[i] }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: QUESTION_LIST_SCHEMA }
      }, signal);
      const qs = Array.isArray(res && res.questions) ? res.questions.map(toConvItem).filter(Boolean) : [];
      out.push.apply(out, qs);
      cState.progressPct = Math.round(p0 + (((i + 1) / chunks.length) * (p1 - p0)));
    }
    return out;
  }

  /* ======================== UNIFIED SMART PROCESSING PIPELINE (STREAMING + PARALLEL CHUNKING) ======================== */
  async function runSmartUploadPipeline() {
    const pasted = (cState.pasteText || "").trim();
    if (cState.files.length === 0 && !pasted) {
      U().showToast("Vui l\u00f2ng ch\u1ecdn / k\u00e9o th\u1ea3 t\u1ec7p t\u00e0i li\u1ec7u (\u1ea2nh, PDF, Word, Markdown/Text) ho\u1eb7c d\u00e1n n\u1ed9i dung tr\u01b0\u1edbc.", "warning");
      return;
    }

    const imageItems = cState.files.filter(function (f) { return f.kind === "image"; });
    const docItems = cState.files.filter(function (f) { return f.kind === "pdf" || f.kind === "docx" || f.kind === "doc" || f.kind === "text"; });
    const excelItems = cState.files.filter(function (f) { return f.kind === "excel"; });

    cState.busy = true;
    cState.abortCtrl = new AbortController();
    const signal = cState.abortCtrl.signal;
    const model = getApiModel();
    const baseQuestions = cState.appendMode ? cState.questions.slice() : [];
    const summaries = [];
    let stopped = false;

    if (!cState.appendMode) {
      cState.contexts = {};
      cState.pinnedContextId = "";
      cState.studyNoteMarkdown = "";
      cState.rawMarkdown = "";
      cState.streamingTail = "";
      cState.userAnswers = {};
      cState.docMeta = { title: "", subject: "", mode: "EXAM", total_questions: 0, duration_minutes: 45 };
    }
    cState.chunkStates = [];
    cState.ttftMs = 0;
    cState.viewMode = "digitizer";

    try {
      setPipelineSteps("active", "pending", "pending");
      cState.progressLabel = "\u0110ang ti\u1ec1n x\u1eed l\u00fd & tr\u00edch xu\u1ea5t t\u00e0i li\u1ec7u...";
      cState.progressPct = 5;
      renderConverter();

      // ---------- 1. EXCEL (.xlsx/.xls/.csv) DIRECT IMPORT ----------
      const excelCollected = [];
      for (let ei = 0; ei < excelItems.length; ei++) {
        if (signal.aborted) { stopped = true; break; }
        try {
          const exQs = await parseExcelFileAsync(excelItems[ei].file);
          if (exQs.length > 0) {
            excelCollected.push.apply(excelCollected, exQs);
            summaries.push("Excel (" + excelItems[ei].name + "): " + exQs.length + " c\u00e2u");
          }
        } catch (exErr) {
          U().showToast("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc t\u1ec7p Excel \"" + excelItems[ei].name + "\": " + (exErr.message || "T\u1ec7p l\u1ed7i"), "error");
        }
      }
      if (excelCollected.length > 0) {
        cState.questions = baseQuestions.concat(excelCollected);
      }

      // ---------- 2. PREPARE STREAMING CHUNK QUEUE (VISION + DIGITAL DOCUMENTS) ----------
      const tasks = [];

      // 2A. Images -> Vision batches (2 images per chunk for high accuracy & low latency)
      if (!stopped && imageItems.length > 0) {
        const IMG_BATCH = 2;
        for (let i = 0; i < imageItems.length; i += IMG_BATCH) {
          if (signal.aborted) { stopped = true; break; }
          const slice = imageItems.slice(i, i + IMG_BATCH);
          const b64List = [];
          for (let bi = 0; bi < slice.length; bi++) {
            b64List.push(await prepareImageBase64(slice[bi].file));
          }
          tasks.push({
            index: tasks.length,
            label: "\u1ea2nh " + (i + 1) + (slice.length > 1 ? ("–" + (i + slice.length)) : "") + "/" + imageItems.length,
            isVision: true,
            b64List: b64List,
            chunk: null,
            status: "pending",
            error: "",
            markdown: ""
          });
        }
      }

      // 2B. Digital Documents (PDF with header/footer strip, DOCX, DOC, MD, TXT) & Pasted Text
      const allTextPages = [];
      for (let di = 0; di < docItems.length; di++) {
        if (signal.aborted) { stopped = true; break; }
        const item = docItems[di];
        cState.progressLabel = "\u0110ang \u0111\u1ecdc & l\u1ecdc header/footer t\u1eeb " + item.name + "...";
        cState.progressPct = Math.round(10 + (di / Math.max(1, docItems.length)) * 15);
        renderConverter();
        try {
          if (item.kind === "text") {
            const rawMd = await readFileAsText(item.file);
            const unwrappedMd = (D() && typeof D().unwrapMarkdownFence === "function") ? D().unwrapMarkdownFence(rawMd, true) : rawMd;
            // If user already uploaded a Digitizer-formatted Markdown file (fenced or unfenced), parse directly (0 token!)
            if (/^---\s*\n[\s\S]*?mode\s*:/i.test(unwrappedMd.trim()) && (/^###\s*C\u00e2u\s*\d+/m.test(unwrappedMd) || /mode\s*:\s*["']?STUDY_NOTE/i.test(unwrappedMd))) {
              tasks.push({
                index: tasks.length,
                label: item.name + " (Markdown chu\u1ea9n)",
                isPreDigitized: true,
                status: "done",
                error: "",
                markdown: unwrappedMd
              });
            } else {
              allTextPages.push(rawMd);
            }
          } else if (item.kind === "docx") {
            allTextPages.push(await extractDocxText(item.file));
          } else if (item.kind === "doc") {
            allTextPages.push(await extractLegacyDocText(item.file));
          } else if (item.kind === "pdf") {
            const pdfRes = await extractPdfText(item.file);
            if (pdfRes.isScanned && pdfRes.pageImages && pdfRes.pageImages.length > 0) {
              const IMG_BATCH = 2;
              for (let pi = 0; pi < pdfRes.pageImages.length; pi += IMG_BATCH) {
                const slice = pdfRes.pageImages.slice(pi, pi + IMG_BATCH);
                tasks.push({
                  index: tasks.length,
                  label: item.name + " (Trang scan " + (pi + 1) + (slice.length > 1 ? ("–" + (pi + slice.length)) : "") + ")",
                  isVision: true,
                  b64List: slice,
                  chunk: null,
                  status: "pending",
                  error: "",
                  markdown: ""
                });
              }
            } else if (pdfRes.isScanned) {
              const pdfB64 = await readFileAsBase64(item.file);
              tasks.push({
                index: tasks.length,
                label: item.name + " (PDF Vision)",
                isVision: true,
                b64List: [{ mimeType: "application/pdf", data: pdfB64 }],
                chunk: null,
                status: "pending",
                error: "",
                markdown: ""
              });
            } else if (Array.isArray(pdfRes.pages) && pdfRes.pages.length > 0) {
              pdfRes.pages.forEach(function (pg) { if (pg && pg.trim()) allTextPages.push(pg); });
            } else if (pdfRes.text) {
              allTextPages.push(pdfRes.text);
            }
          }
        } catch (docErr) {
          U().showToast("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc t\u1ec7p \"" + item.name + "\": " + (docErr.message || "T\u1ec7p l\u1ed7i"), "error");
        }
      }

      if (!stopped && pasted) {
        const unwrappedPasted = (D() && typeof D().unwrapMarkdownFence === "function") ? D().unwrapMarkdownFence(pasted, true) : pasted;
        if (/^---\s*\n[\s\S]*?mode\s*:/i.test(unwrappedPasted.trim()) && (/^###\s*C\u00e2u\s*\d+/m.test(unwrappedPasted) || /mode\s*:\s*["']?STUDY_NOTE/i.test(unwrappedPasted))) {
          tasks.push({
            index: tasks.length,
            label: "Markdown chu\u1ea9n \u0111\u00e3 d\u00e1n",
            isPreDigitized: true,
            status: "done",
            error: "",
            markdown: unwrappedPasted
          });
        } else {
          allTextPages.push(pasted);
        }
      }

      if (allTextPages.length > 0 && D()) {
        const smartChunks = D().buildSmartChunks(allTextPages, { maxSinglePages: 4, maxSingleWords: 3500, pagesPerChunk: 3, overlapChars: 150 });
        smartChunks.forEach(function (ch) {
          tasks.push({
            index: tasks.length,
            label: smartChunks.length > 1 ? ("Ph\u1ea7n " + (ch.index + 1) + "/" + ch.total + " (Trang " + ch.pageStart + "–" + ch.pageEnd + ")") : "To\u00e0n b\u1ed9 t\u00e0i li\u1ec7u",
            isVision: false,
            b64List: null,
            chunk: ch,
            status: "pending",
            error: "",
            markdown: ""
          });
        });
      }

      cState.chunkStates = tasks;

      // ---------- 3. EXECUTE STREAMING DIGITIZER WITH CONCURRENCY = 3 ----------
      const aiTasks = tasks.filter(function (t) { return !t.isPreDigitized; });
      if (tasks.some(function (t) { return t.isPreDigitized; })) {
        mergeChunkDocsToState(baseQuestions.concat(excelCollected), aiTasks.length === 0);
      }

      if (!stopped && aiTasks.length > 0) {
        const apiKey = requireApiKey();
        if (!apiKey) {
          cState.busy = false; cState.progressLabel = ""; cState.steps = []; renderConverter();
          return;
        }
        setPipelineSteps("done", "done", "active", "AI Digitizer \u0111ang streaming (song song t\u1ed1i \u0111a 3 lu\u1ed3ng)...");
        cState.progressLabel = "AI \u0111ang s\u1ed1 h\u00f3a & hi\u1ec3n th\u1ecb th\u1eddi gian th\u1ef1c (" + aiTasks.length + " ph\u1ea7n)...";
        cState.progressPct = 30;
        renderConverter();

        const masterSys = CONVERTER_MASTER_PROMPT;
        let doneCount = 0;
        let lastRenderTs = 0;

        await D().runWithConcurrency(aiTasks, 3, async function (task) {
          if (signal.aborted) return;
          task.status = "streaming";
          renderConverter();
          try {
            const userParts = task.isVision
              ? [{ text: (cState.autoSolve ? "[AUTO_SOLVE=TRUE] " : "[AUTO_SOLVE=FALSE] ") + (cState.subject !== "auto" ? ("[SUBJECT=" + cState.subject + "] ") : "") + "Chuy\u1ec3n \u0111\u1ed5i 100% n\u1ed9i dung t\u1eeb \u1ea3nh/\u0111\u1ec1 thi n\u00e0y sang Markdown chu\u1ea9n c\u1ea5u tr\u00fac:" }].concat(
                  (task.b64List || []).map(function (b64) { return { inlineData: { mimeType: b64.mimeType, data: b64.data } }; })
                )
              : [{ text: D().buildChunkUserPrompt(task.chunk, { autoSolve: cState.autoSolve, subject: cState.subject }) }];

            await streamMarkdownAI(apiKey, model, {
              systemInstruction: { parts: [{ text: masterSys }] },
              contents: [{ role: "user", parts: userParts }],
              generationConfig: { temperature: 0.05, maxOutputTokens: 8192 }
            }, signal, function (delta) {
              task.markdown += delta;
              const now = Date.now();
              if (now - lastRenderTs > 140) {
                lastRenderTs = now;
                mergeChunkDocsToState(baseQuestions.concat(excelCollected), false);
                renderConverter();
              }
            });
            task.status = "done";
          } catch (chunkErr) {
            if (chunkErr && chunkErr.name === "AbortError") {
              task.status = "error";
              task.error = "\u0110\u00e3 d\u1eebng b\u1edfi ng\u01b0\u1eddi d\u00f9ng";
              throw chunkErr;
            }
            task.status = "error";
            task.error = formatFriendlyGeminiError(chunkErr && chunkErr.message);
          } finally {
            doneCount++;
            cState.progressPct = Math.round(30 + (doneCount / Math.max(1, aiTasks.length)) * 68);
            mergeChunkDocsToState(baseQuestions.concat(excelCollected), false);
            renderConverter();
          }
        }, signal);
      }

      mergeChunkDocsToState(baseQuestions.concat(excelCollected), true);
      const errChunks = cState.chunkStates.filter(function (s) { return s.status === "error"; }).length;
      setPipelineSteps("done", "done", errChunks > 0 ? "active" : "done",
        errChunks > 0
          ? ("Ho\u00e0n t\u1ea5t m\u1ed9t ph\u1ea7n (" + errChunks + " ph\u1ea7n l\u1ed7i — b\u1ea5m Th\u1eed l\u1ea1i ph\u1ea7n n\u00e0y)")
          : ("S\u1ed1 h\u00f3a xong" + (cState.ttftMs ? (" • TTFT " + (cState.ttftMs / 1000).toFixed(2) + "s") : "")));
      cState.progressPct = 100;
      cState.lastSummary = (cState.docMeta.mode === "STUDY_NOTE" ? "T\u00e0i li\u1ec7u ghi ch\u00fa (STUDY_NOTE)" : (cState.questions.length + " c\u00e2u h\u1ecfi")) +
        (Object.keys(cState.contexts).length ? (" • " + Object.keys(cState.contexts).length + " ng\u1eef li\u1ec7u chung") : "") +
        (cState.ttftMs ? (" • TTFT " + (cState.ttftMs / 1000).toFixed(2) + "s") : "");

      if (cState.questions.length > 0 || cState.docMeta.mode === "STUDY_NOTE") {
        U().showToast(
          cState.docMeta.mode === "STUDY_NOTE"
            ? "Ho\u00e0n t\u1ea5t! \u0110\u00e3 s\u1ed1 h\u00f3a t\u00e0i li\u1ec7u h\u1ecdc t\u1eadp (STUDY_NOTE)."
            : ("Ho\u00e0n t\u1ea5t! \u0110\u00e3 s\u1ed1 h\u00f3a " + cState.questions.length + " c\u00e2u h\u1ecfi" + (errChunks ? (" (" + errChunks + " ph\u1ea7n b\u1ecb gi\u00e1n \u0111o\u1ea1n)") : "") + "."),
          errChunks > 0 ? "warning" : "success"
        );
        if (cState.autoExport && cState.questions.length > 0) doExport("xlsx", true);
      } else if (!stopped) {
        const firstErr = cState.chunkStates.find(function (s) { return s.status === "error"; });
        const reason = firstErr ? firstErr.error : "Kh\u00f4ng t\u00ecm th\u1ea5y n\u1ed9i dung h\u1ecdc li\u1ec7u h\u1ee3p l\u1ec7 ho\u1eb7c l\u1ed7i ph\u00e2n t\u00edch Markdown.";
        U().showToast(reason, "warning");
        if (firstErr) openManualFallbackModal(reason);
      }
    } catch (e) {
      mergeChunkDocsToState(baseQuestions.concat(excelCollected), true);
      if (e && e.name === "AbortError") U().showToast("\u0110\u00e3 d\u1eebng chuy\u1ec3n \u0111\u1ed5i. C\u00e1c c\u00e2u \u0111\u00e3 hi\u1ec3n th\u1ecb \u0111\u01b0\u1ee3c gi\u1eef nguy\u00ean.", "warning");
      else {
        const msg = formatFriendlyGeminiError(e && e.message);
        U().showToast("L\u1ed7i x\u1eed l\u00fd t\u1ec7p: " + msg, "error");
        openManualFallbackModal(msg);
      }
    } finally {
      cState.busy = false;
      cState.streamingTail = "";
      cState.progressLabel = "";
      renderConverter();
    }
  }

  async function runBatchSolve(fromOcr) {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    const missing = cState.questions.filter(function (q) { return q.correct.length === 0; });
    if (missing.length === 0) { U().showToast("T\u1ea5t c\u1ea3 c\u00e2u h\u1ecfi \u0111\u1ec1u \u0111\u00e3 c\u00f3 \u0111\u00e1p \u00e1n.", "info"); return; }
    if (!fromOcr) { cState.busy = true; cState.abortCtrl = new AbortController(); }
    const model = getApiModel();
    let solved = 0;
    try {
      solved = await solveQuestionsArray(cState.questions, apiKey, model, cState.abortCtrl ? cState.abortCtrl.signal : undefined, 0, 100);
      if (solved > 0) U().showToast("AI \u0111\u00e3 gi\u1ea3i xong " + solved + " c\u00e2u h\u1ecfi.", "success");
    } catch (e) {
      if (e.name === "AbortError") U().showToast("\u0110\u00e3 d\u1eebng gi\u1ea3i \u0111\u00e1p \u00e1n. Gi\u1eef l\u1ea1i " + solved + " c\u00e2u \u0111\u00e3 gi\u1ea3i.", "warning");
      else U().showToast("L\u1ed7i khi gi\u1ea3i \u0111\u00e1p \u00e1n: " + (e.message || "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh"), "error");
    } finally {
      if (!fromOcr) { cState.busy = false; cState.progressLabel = ""; }
      renderConverter();
    }
  }

  /* 2nd-Pass AI Cross-Check (Gold+) */
  async function runDoubleCheck() {
    if (!U().requireFeature("doubleCheck")) return;
    const apiKey = requireApiKey();
    if (!apiKey) return;
    if (cState.questions.length === 0) { U().showToast("Ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi n\u00e0o \u0111\u1ec3 ki\u1ec3m tra ch\u00e9o.", "warning"); return; }
    cState.busy = true;
    cState.abortCtrl = new AbortController();
    const model = getApiModel();
    try {
      const flagged = await doubleCheckQuestionsArray(cState.questions, apiKey, model, cState.abortCtrl.signal, 0, 100);
      cState.filter = flagged > 0 ? "suspect" : "all";
      cState.page = 1;
      U().showToast(flagged > 0 ? ("AI Double-Check ph\u00e1t hi\u1ec7n " + flagged + " c\u00e2u c\u1ea7n ki\u1ec3m tra k\u1ef9!") : "AI Double-Check ho\u00e0n t\u1ea5t: to\u00e0n b\u1ed9 \u0111\u00e1p \u00e1n \u0111\u1ec1u kh\u1edbp & t\u1ef1 tin cao!", flagged > 0 ? "warning" : "success");
    } catch (e) {
      if (e.name === "AbortError") U().showToast("\u0110\u00e3 d\u1eebng ki\u1ec3m tra ch\u00e9o.", "warning");
      else U().showToast("L\u1ed7i Double-Check: " + (e.message || "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh"), "error");
    } finally {
      cState.busy = false;
      cState.progressLabel = "";
      renderConverter();
    }
  }

  /* ======================== MARKDOWN / DOCUMENT PARSER & REVERSE EXCEL ======================== */
  function expandInlineOptions(line) {
    // Split lines like "A. 1   B. 2   C. 3   D. 4" into separate lines when >= 2 option labels appear
    const trimmed = line.trim();
    if (!/^(?:\*\*|__)?\*?\s*A\s*[.):]\s+/i.test(trimmed)) return [trimmed];
    if (!/\s+(?:\*\*|__)?\*?\s*B\s*[.):]\s+/i.test(trimmed)) return [trimmed];
    return trimmed
      .replace(/\s+(?=(?:\*\*|__)?\*?\s*[B-E]\s*[.):]\s+)/g, "\n")
      .split("\n")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function applyAnswerKeyBlock(results, rawBlock) {
    if (!rawBlock || results.length === 0) return 0;
    let applied = 0;
    let m;
    const re = /(\d{1,4})\s*[.:\-)\s]?\s*([A-Ea-e](?:\s*[,;/]\s*[A-Ea-e])*)\b/g;
    while ((m = re.exec(rawBlock)) !== null) {
      const idx = parseInt(m[1], 10) - 1;
      const q = results[idx];
      if (!q || q.correct.length > 0) continue;
      const maxO = q.options.filter(Boolean).length;
      const corr = Array.from(new Set(m[2].toUpperCase().split(/[,;\/\s]+/).filter(Boolean).map(function (t) {
        return U().LETTERS.indexOf(t);
      }))).filter(function (x) { return x >= 0 && x < maxO; }).sort(function (a, b) { return a - b; });
      if (corr.length > 0) {
        q.correct = corr;
        if (corr.length > 1) q.type = "Checkbox";
        applied++;
      }
    }
    return applied;
  }

  function parseMarkdown(raw) {
    const rawLines = String(raw || "").replace(/\r\n/g, "\n").split("\n");
    const lines = [];
    rawLines.forEach(function (rl) {
      expandInlineOptions(rl).forEach(function (x) { lines.push(x); });
    });
    const results = [];
    let cur = null;
    let inAnswerSection = false;
    let answerSectionBuf = "";

    const ansSectionHeader = /^\s*(?:#+\s*)?(?:\*\*|__)?(?:B\u1ea2NG\s+\u0110\u00c1P\s+\u00c1N|\u0110\u00c1P\s+\u00c1N\s*(?:CHI\s+TI\u1ebeT)?|ANSWER\s+KEY)\s*:?(?:\*\*|__)?\s*(.*)$/i;
    const qStart = /^\s*(?:#+\s*)?(?:\*\*|__)?(?:C\u00e2u|Question|B\u00e0i)\s*\d+\s*[:.)\-]?\s*(?:\*\*|__)?\s*(.*)$/i;
    const numStart = /^\s*(?:\*\*|__)?(\d{1,4})\s*[:.)]\s+(?:\*\*|__)?(.*)$/;
    const optRe = /^\s*(?:[-*+]\s+)?(\*\*|__|\*|\[x\]\s*)?\s*([A-Ea-e])\s*([.):])\s*(.+?)\s*(\*\*|__)?\s*$/;
    const ansRe = /^\s*(?:\*\*|__)?(?:\u0110\u00e1p \u00e1n|Answer|Key)\s*[:\-]\s*(.+?)(?:\*\*|__)?\s*$/i;
    const expRe = /^\s*(?:\*\*|__)?(?:Gi\u1ea3i th\u00edch|Explanation|L\u1eddi gi\u1ea3i)\s*[:\-]\s*(.+?)(?:\*\*|__)?\s*$/i;

    function flush() {
      if (!cur) return;
      const item = toConvItem({ question: cur.text, options: cur.options, correct: cur.correct, _zeroBased: true, explanation: cur.explanation });
      if (item) results.push(item);
      cur = null;
    }

    lines.forEach(function (rl) {
      const line = rl.trim();
      if (!line) return;
      if (inAnswerSection) {
        answerSectionBuf += " " + line;
        return;
      }
      const mSec = line.match(ansSectionHeader);
      if (mSec && results.length > 0 && (!cur || cur.options.length >= 2)) {
        flush();
        inAnswerSection = true;
        if (mSec[1]) answerSectionBuf += " " + mSec[1];
        return;
      }
      const mOpt = line.match(optRe);
      if (mOpt && cur) {
        const idx = U().LETTERS.indexOf(mOpt[2].toUpperCase());
        const marker = String(mOpt[1] || "").trim().toLowerCase();
        const isCorrectMarker = !!(mOpt[1] && mOpt[5]) || /^\*\*.+\*\*$/.test(line) || marker === "*" || marker === "[x]";
        cur.options[idx] = mOpt[4].replace(/(\*\*|__)\s*$/, "").trim();
        if (isCorrectMarker) cur.correct.push(idx);
        return;
      }
      const mAns = line.match(ansRe);
      if (mAns && cur) {
        mAns[1].toUpperCase().split(/[,;\/\s]+/).filter(Boolean).forEach(function (t) {
          if (/^[A-E]$/.test(t)) cur.correct.push(U().LETTERS.indexOf(t));
          else if (/^[1-5]$/.test(t)) cur.correct.push(Number(t) - 1);
        });
        return;
      }
      const mExp = line.match(expRe);
      if (mExp && cur) { cur.explanation += (cur.explanation ? "\n" : "") + mExp[1].trim(); return; }
      const mQ = line.match(qStart), mN = !mQ ? line.match(numStart) : null;
      if (mQ || mN) {
        flush();
        const body = cState.keepPrefix ? line.replace(/^(\*\*|__)|(\*\*|__)$/g, "").trim() : (mQ ? mQ[1] : mN[2]).replace(/^(\*\*|__)|(\*\*|__)$/g, "").trim();
        cur = { text: body, options: [], correct: [], explanation: "" };
        return;
      }
      if (cur) {
        if (cur.options.length === 0) cur.text += "\n" + line;
        else cur.explanation += (cur.explanation ? "\n" : "") + line;
      }
    });
    flush();
    if (answerSectionBuf) applyAnswerKeyBlock(results, answerSectionBuf);
    return results;
  }

  function parseExcelFileAsync(file) {
    return new Promise(function (resolve, reject) {
      if (!file || typeof XLSX === "undefined") {
        reject(new Error("Th\u01b0 vi\u1ec7n SheetJS ch\u01b0a t\u1ea3i xong."));
        return;
      }
      const r = new FileReader();
      r.onerror = function () { reject(new Error("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file Excel.")); };
      r.onload = function (ev) {
        try {
          const wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          const items = [];
          rows.forEach(function (row) {
            const text = String(row["Question Text"] || "").trim();
            if (!text) return;
            const opts = [];
            for (let n = 1; n <= 5; n++) { const v = String(row["Option " + n] == null ? "" : row["Option " + n]).trim(); if (v) opts.push(v); }
            if (opts.length < 2) return;
            const rawAns = String(row["Correct Answer"] == null ? "" : row["Correct Answer"]).trim();
            const corr = Array.from(new Set(rawAns.split(/[,;\/\s]+/).filter(Boolean).map(function (t) {
              if (/^[1-5]$/.test(t)) return Number(t) - 1;
              if (/^[A-Ea-e]$/.test(t)) return U().LETTERS.indexOf(t.toUpperCase());
              return -1;
            }))).filter(function (n) { return n >= 0 && n < opts.length; }).sort(function (a, b) { return a - b; });
            const item = toConvItem({ question: text, type: row["Question Type"], options: opts, correct: corr, _zeroBased: true, time: row["Time in seconds"], image: row["Image Link"], explanation: row["Answer explanation"] });
            if (item) items.push(item);
          });
          resolve(items);
        } catch (err) { reject(new Error("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file Excel.")); }
      };
      r.readAsArrayBuffer(file);
    });
  }

  /* ======================== VALIDATION, EXPORT & 1-CLICK IMPORT ======================== */
  function validateAll() {
    let valid = 0, missingAns = 0, errors = 0;
    const validItems = [];
    cState.questions.forEach(function (q) {
      const qt = q.qType || "MCQ";
      if (!q.text || !q.text.trim()) { errors++; return; }
      if (qt === "TF_GROUP") {
        const tfItems = Array.isArray(q.tfStatements) ? q.tfStatements : (Array.isArray(q.tfItems) ? q.tfItems : []);
        if (tfItems.length === 0) { errors++; return; }
        const hasAns = q.tfAnswers && Object.keys(q.tfAnswers).length > 0;
        if (!hasAns) { missingAns++; return; }
        valid++;
        validItems.push(Object.assign({}, q));
        return;
      }
      if (qt === "SHORT_ANSWER" || qt === "ORDERING") {
        if (!(q.answerText || "").trim()) { missingAns++; return; }
        valid++;
        validItems.push(Object.assign({}, q));
        return;
      }
      if (qt === "ESSAY") {
        valid++;
        validItems.push(Object.assign({}, q));
        return;
      }
      const nonEmptyOpts = (q.options || []).map(function (o) { return String(o || "").trim(); }).filter(Boolean);
      const cleanCorr = (q.correct || []).filter(function (c) { return c >= 0 && c < nonEmptyOpts.length; });
      if (nonEmptyOpts.length < 2) { errors++; return; }
      if (cleanCorr.length === 0) { missingAns++; return; }
      valid++;
      validItems.push(Object.assign({}, q, { options: nonEmptyOpts, correct: cleanCorr }));
    });
    return { total: cState.questions.length, valid: valid, missingAns: missingAns, errors: errors, validItems: validItems };
  }

  function doExportMarkdown() {
    let md = (cState.rawMarkdown || "").trim();
    if (!md && D()) {
      md = D().exportToMarkdown({
        meta: cState.docMeta,
        contexts: cState.contexts,
        questions: cState.questions,
        studyNoteMarkdown: cState.studyNoteMarkdown
      });
    }
    if (!md) {
      U().showToast("Ch\u01b0a c\u00f3 n\u1ed9i dung Markdown \u0111\u1ec3 t\u1ea3i xu\u1ed1ng.", "warning");
      return;
    }
    const fname = "AI_Tutor_Digitized_" + dateStamp() + ".md";
    U().downloadBlob(new Blob([md], { type: "text/markdown;charset=utf-8;" }), fname);
    U().showToast("\u0110\u00e3 t\u1ea3i xu\u1ed1ng " + fname + "!", "success");
  }

  async function doSaveToLibraryAndDrive() {
    if (cState.docMeta.mode === "STUDY_NOTE") {
      doExportMarkdown();
      if (window.UETCloud && typeof window.UETCloud.backupToGoogleDrive === "function") {
        try { await window.UETCloud.backupToGoogleDrive(); } catch (e) {}
      }
      return;
    }
    const v = validateAll();
    if (v.valid > 0) {
      const title = (U().$("convDeckTitle") ? U().$("convDeckTitle").value : "").trim() || cState.docMeta.title || ("B\u1ed9 \u0111\u1ec1 AI Converter " + dateStamp());
      const tag = (U().$("convDeckTag") ? U().$("convDeckTag").value : "").trim() || cState.docMeta.subject || "T\u1ed5ng h\u1ee3p";
      const mergeId = U().$("convMergeTarget") ? U().$("convMergeTarget").value : "";
      const normalized = v.validItems.filter(function (q) { return (q.qType || "MCQ") === "MCQ"; }).map(function (q, i) {
        return {
          id: "q_" + Date.now() + "_" + i,
          text: formatCell(q.text),
          type: q.correct.length > 1 || q.type === "Checkbox" ? "multiple" : "single",
          options: q.options.map(formatCell),
          correct: q.correct,
          time: parseInt(q.time, 10) > 0 ? parseInt(q.time, 10) : cState.defaultTime,
          image: q.image || "",
          explanation: formatCell(q.explanation)
        };
      });
      if (normalized.length > 0) {
        U().addOrMergeDeck({ mode: mergeId ? "merge" : "new", title: title, tag: tag, targetDeckId: mergeId, questions: normalized });
      }
    }
    if (window.UETCloud && typeof window.UETCloud.backupToGoogleDrive === "function") {
      try {
        await window.UETCloud.backupToGoogleDrive();
      } catch (e) {
        U().showToast("\u0110\u00e3 l\u01b0u v\u00e0o th\u01b0 vi\u1ec7n m\u00e1y. C\u00f3 th\u1ec3 k\u1ebft n\u1ed1i Google Drive trong m\u1ee5c Sao l\u01b0u.", "info");
      }
    } else {
      U().showToast("\u0110\u00e3 l\u01b0u v\u00e0o th\u01b0 vi\u1ec7n AI Tutor!", "success");
    }
  }

  function formatCell(s) {
    let out = String(s == null ? "" : s).trim();
    if (!cState.keepHtml) out = out.replace(/<\/?(u|b|i|strong|em|sup|sub|br)\s*\/?>/gi, "");
    if (!cState.keepLatex) out = out.replace(/\$\$([\s\S]+?)\$\$/g, "$1").replace(/\$([^$\n]+?)\$/g, "$1");
    return out;
  }

  function warnIfUnverified(cb) {
    const unv = cState.questions.filter(function (q) { return !q.verified; }).length;
    if (unv > 0) {
      U().showConfirm("C\u00f2n c\u00e2u ch\u01b0a duy\u1ec7t", "Hi\u1ec7n c\u00f2n " + unv + "/" + cState.questions.length + " c\u00e2u ch\u01b0a \u0111\u01b0\u1ee3c \u0111\u00e1nh d\u1ea5u ✓ \u0110\u00e3 duy\u1ec7t. B\u1ea1n v\u1eabn mu\u1ed1n ti\u1ebfp t\u1ee5c?", cb, "Ti\u1ebfp t\u1ee5c");
    } else cb();
  }

  function doExport(ext, skipWarn) {
    if (typeof XLSX === "undefined") { U().showToast("Th\u01b0 vi\u1ec7n SheetJS ch\u01b0a t\u1ea3i xong.", "error"); return; }
    const run = function () {
      const v = validateAll();
      const list = cState.scope === "answered" ? v.validItems : cState.questions.map(function (q) {
        const nonEmpty = q.options.map(function (o) { return String(o || "").trim(); }).filter(Boolean);
        return Object.assign({}, q, { options: nonEmpty, correct: q.correct.filter(function (c) { return c >= 0 && c < nonEmpty.length; }) });
      });
      if (list.length === 0) { U().showToast("Kh\u00f4ng c\u00f3 c\u00e2u h\u1ecfi h\u1ee3p l\u1ec7 \u0111\u1ec3 xu\u1ea5t.", "warning"); return; }
      const chunks = [];
      if (cState.splitSize > 0 && list.length > cState.splitSize) {
        for (let i = 0; i < list.length; i += cState.splitSize) chunks.push(list.slice(i, i + cState.splitSize));
      } else chunks.push(list);
      const stamp = dateStamp();
      chunks.forEach(function (ch, idx) {
        const rows = [U().XLSX_HEADERS];
        ch.forEach(function (q) {
          const opts = [0, 1, 2, 3, 4].map(function (k) { return formatCell(q.options[k] || ""); });
          const ansStr = q.correct.length
            ? (cState.ansFormat === "letter" ? q.correct.map(function (c) { return U().LETTERS.charAt(c); }).join(",") : q.correct.map(function (c) { return String(c + 1); }).join(","))
            : "";
          rows.push([
            formatCell(q.text),
            q.correct.length > 1 || q.type === "Checkbox" ? "Checkbox" : "Multiple Choice",
            opts[0], opts[1], opts[2], opts[3], opts[4],
            ansStr,
            parseInt(q.time, 10) > 0 ? parseInt(q.time, 10) : cState.defaultTime,
            q.image || "",
            formatCell(q.explanation)
          ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const fname = chunks.length > 1 ? ("AI_Tutor_" + stamp + "_phan_" + (idx + 1)) : ("AI_Tutor_" + stamp);
        if (ext === "xlsx") {
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Questions");
          XLSX.writeFile(wb, fname + ".xlsx");
        } else {
          const csv = "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
          U().downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), fname + ".csv");
        }
      });
      U().showToast("\u0110\u00e3 xu\u1ea5t " + chunks.length + " file " + ext.toUpperCase() + " chu\u1ea9n AI Tutor!", "success");
    };
    if (skipWarn) run(); else warnIfUnverified(run);
  }

  function doOneClickImport() {
    const v = validateAll();
    if (v.valid === 0) {
      U().showToast("Ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi h\u1ee3p l\u1ec7 c\u00f3 \u0111\u00e1p \u00e1n \u0111\u1ec3 nh\u1eadp. H\u00e3y ch\u1ea1y AI gi\u1ea3i \u0111\u00e1p \u00e1n ho\u1eb7c ch\u1ecdn \u0111\u00e1p \u00e1n tr\u01b0\u1edbc.", "warning");
      return;
    }
    const title = (U().$("convDeckTitle") ? U().$("convDeckTitle").value : "").trim() || ("B\u1ed9 \u0111\u1ec1 AI Converter " + dateStamp());
    const tag = (U().$("convDeckTag") ? U().$("convDeckTag").value : "").trim() || "T\u1ed5ng h\u1ee3p";
    const mergeId = U().$("convMergeTarget") ? U().$("convMergeTarget").value : "";
    warnIfUnverified(function () {
      const normalized = v.validItems.map(function (q, i) {
        return {
          id: "q_" + Date.now() + "_" + i,
          text: formatCell(q.text),
          type: q.correct.length > 1 || q.type === "Checkbox" ? "multiple" : "single",
          options: q.options.map(formatCell),
          correct: q.correct,
          time: parseInt(q.time, 10) > 0 ? parseInt(q.time, 10) : cState.defaultTime,
          image: q.image || "",
          explanation: formatCell(q.explanation)
        };
      });
      U().addOrMergeDeck({
        mode: mergeId ? "merge" : "new",
        title: title,
        tag: tag,
        targetDeckId: mergeId,
        questions: normalized
      });
    });
  }

  function showTemplateModal() {
    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="convTplModal" role="dialog" aria-modal="true">' +
        '<div class="modal modal-lg">' +
          '<h3>File m\u1eabu chu\u1ea9n 11 c\u1ed9t – AI_Tutor.xlsx</h3>' +
          '<div class="table-scroll"><table class="ref-table"><thead><tr>' +
            U().XLSX_HEADERS.map(function (h) { return "<th>" + U().esc(h) + "</th>"; }).join("") +
          '</tr></thead><tbody>' +
            SAMPLE_ROWS.map(function (row) {
              return "<tr>" + row.map(function (cell, ci) {
                return '<td class="rich-text">' + (ci === 0 || (ci >= 2 && ci <= 6) || ci === 10 ? U().renderRich(cell) : U().esc(cell)) + "</td>";
              }).join("") + "</tr>";
            }).join("") +
          '</tbody></table></div>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-outline" id="convTplClose">\u0110\u00f3ng</button>' +
            '<button type="button" class="btn btn-emerald" id="convTplDown">T\u1ea3i file m\u1eabu (.xlsx)</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    U().on("convTplClose", "click", function () { host.innerHTML = ""; });
    U().on("convTplDown", "click", function () { U().downloadTemplate(); });
  }

  /* ======================== RENDER CONVERTER VIEW ======================== */
  function renderConverter() {
    const root = U().$("converterRoot");
    if (!root) return;
    const v = validateAll();
    const verifiedCnt = cState.questions.filter(function (q) { return q.verified; }).length;
    const suspectCnt = cState.questions.filter(function (q) { return q.suspect; }).length;
    const userDecks = U().getUserDecks();
    const hasPersonal = hasPersonalKeys();
    const isSignedIn = !!getUserIdToken();
    const disclaimerTxt = (CFG() && CFG().DISCLAIMER_BANNER_TEXT) || "B\u1ea1n \u0111ang s\u1eed d\u1ee5ng API Key mi\u1ec5n ph\u00ed m\u1eb7c \u0111\u1ecbnh \u0111\u01b0\u1ee3c cung c\u1ea5p b\u1edfi h\u1ec7 th\u1ed1ng. Do d\u00f9ng chung n\u00ean h\u1ea1n m\u1ee9c (quota) th\u1ea5p v\u00e0 c\u00f3 th\u1ec3 b\u1ecb ch\u1eadm ho\u1eb7c gi\u00e1n \u0111o\u1ea1n. \u0110\u1ec3 c\u00f3 tr\u1ea3i nghi\u1ec7m m\u01b0\u1ee3t m\u00e0 v\u00e0 kh\u00f4ng gi\u1edbi h\u1ea1n, h\u00e3y c\u00e2n nh\u1eafc s\u1eed d\u1ee5ng API Key c\u00e1 nh\u00e2n c\u1ee7a b\u1ea1n.";

    let h = "";
    if (!hasPersonal && !cState.disclaimerDismissed) {
      h += '<div class="sys-disclaimer-banner" id="sysDisclaimerBanner">' +
        '<div class="sys-disclaimer-body" style="display:flex;align-items:flex-start;gap:10px">' +
          '<span style="font-size:1.1rem;line-height:1.3;flex-shrink:0" aria-hidden="true">💡</span>' +
          '<div>' +
            '<div style="line-height:1.55">' + U().esc(disclaimerTxt) + ' ' +
              '<button type="button" class="sys-disclaimer-link" data-cact="go-guide">Xem h\u01b0\u1edbng d\u1eabn l\u1ea5y API Key mi\u1ec5n ph\u00ed →</button>' +
            '</div>' +
            (!isSignedIn ? '<div class="muted" style="font-size:.78rem;margin-top:4px">💡 <em>G\u1ee3i \u00fd: \u0110\u0103ng nh\u1eadp Google \u1edf g\u00f3c tr\u00ean \u0111\u1ec3 k\u00edch ho\u1ea1t System Pool mi\u1ec5n ph\u00ed, ho\u1eb7c nh\u1eadp API Key c\u00e1 nh\u00e2n \u0111\u1ec3 d\u00f9ng ngay kh\u00f4ng c\u1ea7n ch\u1edd.</em></div>' : '') +
            '<div class="sys-disclaimer-actions" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
              '<button type="button" class="btn btn-primary btn-sm" data-cact="go-guide">Xem h\u01b0\u1edbng d\u1eabn l\u1ea5y API Key mi\u1ec5n ph\u00ed →</button>' +
              '<button type="button" class="btn btn-outline btn-sm" data-cact="go-api">Nh\u1eadp Key c\u00e1 nh\u00e2n</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="sys-disclaimer-close" data-cact="dismiss-disclaimer" title="\u1ea8n th\u00f4ng b\u00e1o n\u00e0y" aria-label="\u1ea8n th\u00f4ng b\u00e1o">✕</button>' +
      '</div>';
    }

    // 3 Top Cards
    h += '<div class="conv-grid">';

    // Card 1: Unified Smart File Uploader
    const canRunSmart = !cState.busy && (cState.files.length > 0 || (cState.pasteText || "").trim().length > 0);
    h += '<section class="panel"><div class="panel-head"><h2>1. T\u1ea3i \u0111\u1ec1 thi th\u00f4ng minh</h2>' +
      '<span class="badge">T\u1ef1 \u0111\u1ed9ng nh\u1eadn di\u1ec7n</span></div>' +
      '<label class="conv-drop" id="convDropUnified">' +
        '<strong>📂 Ch\u1ecdn, k\u00e9o th\u1ea3 ho\u1eb7c Ctrl+V t\u1ec7p \u0111\u1ec1 thi</strong>' +
        '<span class="muted" style="font-size:.76rem">\u1ea2nh → AI Vision • T\u00e0i li\u1ec7u \u0111\u1ee7 \u0110/A → Chuy\u1ec3n ngay • Thi\u1ebfu \u0110/A → AI gi\u1ea3i &amp; ki\u1ec3m tra ch\u00e9o</span>' +
        '<div class="conv-drop-formats">' +
          '<span class="conv-fmt-pill">PNG / JPG / WEBP</span>' +
          '<span class="conv-fmt-pill">PDF</span>' +
          '<span class="conv-fmt-pill">DOC / DOCX</span>' +
          '<span class="conv-fmt-pill">MD / TXT</span>' +
          '<span class="conv-fmt-pill">XLSX</span>' +
        '</div>' +
        '<input type="file" id="convUnifiedInput" accept=".png,.jpg,.jpeg,.webp,.gif,.md,.txt,.pdf,.doc,.docx,.xlsx,.xls,.csv,image/*" multiple hidden>' +
      '</label>';

    if (cState.files.length > 0) {
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:.8rem"><strong>' + cState.files.length + ' t\u1ec7p \u0111ang ch\u1edd x\u1eed l\u00fd</strong>' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="clear-files"' + (cState.busy ? " disabled" : "") + '>X\u00f3a h\u1ebft</button></div>' +
        '<div class="conv-queue">' + cState.files.map(function (item, idx) {
          const meta = fileKindMeta(item.kind);
          const thumb = item.kind === "image" && item.url
            ? '<img src="' + item.url + '" alt="">'
            : '<div class="conv-file-icon" aria-hidden="true">' + meta.icon + '</div>';
          return '<div class="conv-q-item">' + thumb +
            '<div style="flex:1;min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + U().esc(item.name) + '</div>' +
              '<span class="muted">' + Math.max(1, Math.round(item.size / 1024)) + ' KB' + (item.width ? (" • " + item.width + "×" + item.height) : "") + '</span>' +
              '<span class="conv-file-badge">' + meta.badge + '</span>' +
            '</div>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="del-file" data-idx="' + idx + '"' + (cState.busy ? " disabled" : "") + '>✕</button></div>';
        }).join("") + '</div>';
    }

    h += '<details class="conv-paste-details"' + ((cState.pasteText || "").trim() ? " open" : "") + '>' +
      '<summary>✍️ Ho\u1eb7c d\u00e1n nhanh v\u0103n b\u1ea3n / Markdown tr\u1ef1c ti\u1ebfp</summary>' +
      '<textarea id="convPasteText" rows="3" style="width:100%" placeholder="D\u00e1n c\u00e2u h\u1ecfi tr\u1eafc nghi\u1ec7m ho\u1eb7c Markdown t\u1ea1i \u0111\u00e2y (n\u1ebfu thi\u1ebfu \u0111\u00e1p \u00e1n AI s\u1ebd t\u1ef1 gi\u1ea3i)...">' + U().esc(cState.pasteText) + '</textarea>' +
    '</details>';

    h += '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cAutoSolve"' + (cState.autoSolve ? " checked" : "") + '> <strong>T\u1ef1 \u0111\u1ed9ng gi\u1ea3i chi ti\u1ebft</strong> <span class="muted">(T\u1eaft = nhanh g\u1ea5p 3x, ti\u1ebft ki\u1ec7m ~65% token)</span></label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cAutoExport"' + (cState.autoExport ? " checked" : "") + '> T\u1ef1 \u0111\u1ed9ng t\u1ea3i Excel sau khi xong</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cAppend"' + (cState.appendMode ? " checked" : "") + '> N\u1ed1i th\u00eam v\u00e0o danh s\u00e1ch hi\u1ec7n c\u00f3</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cKeepPref"' + (cState.keepPrefix ? " checked" : "") + '> Gi\u1eef ti\u1ec1n t\u1ed1 s\u1ed1 c\u00e2u (C\u00e2u 1.)</label>' +
      '<div class="deck-actions" style="margin-top:8px">' +
        '<button type="button" class="btn btn-primary" id="convSmartRunBtn" style="flex:1" data-cact="run-smart"' + (canRunSmart ? "" : " disabled") + '>' + (cState.busy ? '<span class="spinner"></span>\u0110ang s\u1ed1 h\u00f3a th\u1eddi gian th\u1ef1c...' : '✨ B\u1eaft \u0111\u1ea7u chuy\u1ec3n \u0111\u1ed5i th\u00f4ng minh') + '</button>' +
        (cState.busy ? '<button type="button" class="btn btn-danger btn-sm" data-cact="stop-ai">⏹ D\u1eebng chuy\u1ec3n \u0111\u1ed5i</button>' : "") +
      '</div>' +
      '<div class="deck-actions" style="margin-top:6px">' +
        '<button type="button" class="btn btn-outline btn-sm" style="flex:1" data-cact="open-fallback">🌐 Convert via External AI / Prompt</button>' +
        '<label class="btn btn-outline btn-sm file-btn" style="flex:1;justify-content:center">📄 Nh\u1eadp nhanh .md<input type="file" id="convDirectMdInput" accept=".md,.txt,text/markdown,text/plain" hidden></label>' +
      '</div>';

    if (cState.progressLabel || cState.steps.length > 0) {
      h += '<div class="conv-progress">' +
        (cState.progressLabel ? ('<div class="conv-progress-row"><span>' + U().esc(cState.progressLabel) + '</span><span>' + cState.progressPct + '%</span></div><div class="progress-bar"><div class="progress-fill" style="width:' + cState.progressPct + '%"></div></div>') : "") +
        (cState.steps.length > 0 ? ('<div class="conv-steps">' + cState.steps.map(function (st) {
          const icon = st.status === "done" ? "✅" : (st.status === "active" ? "⏳" : (st.status === "skip" ? "⏭️" : "○"));
          const cls = st.status === "done" ? "is-done" : (st.status === "active" ? "is-active" : (st.status === "skip" ? "is-skip" : ""));
          return '<div class="conv-step ' + cls + '"><span>' + icon + '</span><span>' + U().esc(st.label) + '</span></div>';
        }).join("") + '</div>') : "") +
        (cState.lastSummary && !cState.busy ? ('<div class="muted" style="font-size:.74rem;margin-top:6px;padding-top:6px;border-top:1px dashed var(--border)">📌 ' + U().esc(cState.lastSummary) + '</div>') : "") +
      '</div>';
    }
    h += '</section>';

    // Card 2: Template + Manual Answer Key + AI Tools
    h += '<section class="panel"><div class="panel-head"><h2>2. File m\u1eabu &amp; Ki\u1ec3m duy\u1ec7t AI</h2></div>' +
      '<div class="checkout-notice" style="margin-bottom:10px">\u0110\u00e3 t\u00edch h\u1ee3p s\u1eb5n c\u1ea5u tr\u00fac chu\u1ea9n 11 c\u1ed9t <strong>AI_Tutor.xlsx</strong> (kh\u00f4ng c\u1ea7n t\u1ea3i file m\u1eabu l\u00ean).</div>' +
      '<div class="deck-actions" style="margin-bottom:12px">' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="view-tpl">👁️ Xem file m\u1eabu</button>' +
        '<button type="button" class="btn btn-emerald btn-sm" data-cact="down-tpl">⬇ T\u1ea3i file m\u1eabu (.xlsx)</button>' +
      '</div>' +
      '<label class="field">N\u1ea1p nhanh b\u1ea3ng \u0111\u00e1p \u00e1n th\u1ee7 c\u00f4ng<textarea id="convManualAns" rows="2" placeholder="1.C 2.A 3.D 4.B ho\u1eb7c 1-c, 2-a,c"></textarea></label>' +
      '<div class="deck-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="apply-manual-ans">\u00c1p d\u1ee5ng \u0111\u00e1p \u00e1n</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-cact="solve-missing"' + (cState.busy || v.missingAns === 0 ? " disabled" : "") + '>🤖 AI gi\u1ea3i c\u00e2u thi\u1ebfu \u0110/A (' + v.missingAns + ')</button>' +
      '</div>' +
      '<div class="deck-actions" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">' +
        '<button type="button" class="btn btn-amber btn-sm" data-cact="double-check"' + (cState.busy || cState.questions.length === 0 ? " disabled" : "") + '>' + (U().can("doubleCheck") ? "" : "🔒 ") + '🔍 AI Ki\u1ec3m tra l\u1ea1i to\u00e0n b\u1ed9 \u0111\u00e1p \u00e1n (Double-Check)</button>' +
      '</div></section>';

    // Card 3: Options & Export
    h += '<section class="panel"><div class="panel-head"><h2>3. Chu\u1ea9n h\u00f3a &amp; Xu\u1ea5t file</h2></div>' +
      '<label class="field">Ch\u1ebf \u0111\u1ed9 m\u00f4n h\u1ecdc<select id="cSubject">' +
        '<option value="auto"' + (cState.subject === "auto" ? " selected" : "") + '>T\u1ef1 \u0111\u1ed9ng nh\u1eadn di\u1ec7n</option>' +
        '<option value="math"' + (cState.subject === "math" ? " selected" : "") + '>To\u00e1n - L\u00fd - H\u00f3a (Chuy\u00ean LaTeX)</option>' +
        '<option value="english"' + (cState.subject === "english" ? " selected" : "") + '>Ti\u1ebfng Anh (G\u1ea1ch ch\u00e2n &lt;u&gt;, tr\u1ecdng \u00e2m)</option>' +
        '<option value="theory"' + (cState.subject === "theory" ? " selected" : "") + '>M\u00f4n l\u00fd thuy\u1ebft kh\u00e1c</option>' +
      '</select></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<label class="field">\u0110\u1ecbnh d\u1ea1ng \u0110\u00e1p \u00e1n<select id="cAnsFmt"><option value="number"' + (cState.ansFormat === "number" ? " selected" : "") + '>S\u1ed1 (1–5)</option><option value="letter"' + (cState.ansFormat === "letter" ? " selected" : "") + '>Ch\u1eef (A–E)</option></select></label>' +
        '<label class="field">Th\u1eddi gian (gi\u00e2y)<input type="number" id="cDefTime" min="5" max="600" value="' + cState.defaultTime + '"></label>' +
        '<label class="field">Ph\u1ea1m vi xu\u1ea5t<select id="cScope"><option value="all"' + (cState.scope === "all" ? " selected" : "") + '>T\u1ea5t c\u1ea3</option><option value="answered"' + (cState.scope === "answered" ? " selected" : "") + '>Ch\u1ec9 c\u00e2u c\u00f3 \u0110/A</option></select></label>' +
        '<label class="field">Chia file<select id="cSplit"><option value="0"' + (cState.splitSize === 0 ? " selected" : "") + '>G\u1ed9p 1 file</option><option value="100"' + (cState.splitSize === 100 ? " selected" : "") + '>100 c\u00e2u</option><option value="200"' + (cState.splitSize === 200 ? " selected" : "") + '>200 c\u00e2u</option><option value="300"' + (cState.splitSize === 300 ? " selected" : "") + '>300 c\u00e2u</option></select></label>' +
      '</div>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cKeepLatex"' + (cState.keepLatex ? " checked" : "") + '> Gi\u1eef chu\u1ea9n LaTeX ($...$)</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cKeepHtml"' + (cState.keepHtml ? " checked" : "") + '> Gi\u1eef th\u1ebb HTML (&lt;u&gt;, &lt;b&gt;, &lt;i&gt;)</label>' +
      '<p class="muted" style="font-size:.75rem;margin:4px 0 8px">T\u00ean file: <code>AI_Tutor_' + dateStamp() + '.xlsx</code></p>' +
      '<div class="deck-actions">' +
        '<button type="button" class="btn btn-emerald btn-sm" style="flex:1" data-cact="exp-xlsx"' + (cState.questions.length === 0 ? " disabled" : "") + '>Xu\u1ea5t .xlsx</button>' +
        '<button type="button" class="btn btn-outline btn-sm" style="flex:1" data-cact="exp-csv"' + (cState.questions.length === 0 ? " disabled" : "") + '>Xu\u1ea5t CSV</button>' +
      '</div>' +
      '<div class="deck-actions" style="margin-top:6px">' +
        '<button type="button" class="btn btn-primary btn-sm" style="flex:1" data-cact="exp-md"' + (cState.questions.length === 0 && !cState.rawMarkdown && !cState.studyNoteMarkdown ? " disabled" : "") + '>⬇ T\u1ea3i xu\u1ed1ng file .md</button>' +
        '<button type="button" class="btn btn-outline btn-sm" style="flex:1" data-cact="save-drive"' + (cState.questions.length === 0 && !cState.studyNoteMarkdown ? " disabled" : "") + '>☁️ L\u01b0u th\u01b0 vi\u1ec7n / Drive</button>' +
      '</div></section></div>';

    // 1-Click Import into Kho \u0111\u1ec1 AI Tutor
    if (cState.questions.length > 0) {
      const mergeOpts = '<option value="">T\u1ea1o th\u00e0nh b\u1ed9 \u0111\u1ec1 m\u1edbi</option>' +
        (U().can("merge") ? userDecks.map(function (d) { return '<option value="' + U().esc(d.id) + '">G\u1ed9p v\u00e0o: ' + U().esc(d.title) + ' (' + d.questions.length + ' c\u00e2u)</option>'; }).join("") : "");
      h += '<div class="conv-import-box">' +
        '<label class="field" style="margin:0">T\u00ean b\u1ed9 \u0111\u1ec1 (1-Click Import)<input type="text" id="convDeckTitle" value="B\u1ed9 \u0111\u1ec1 ' + dateStamp() + '"></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<label class="field" style="margin:0">Th\u1ebb m\u00f4n h\u1ecdc / Tag<input type="text" id="convDeckTag" placeholder="VD: Gi\u1ea3i t\u00edch, Ti\u1ebfng Anh"></label>' +
          '<label class="field" style="margin:0">\u0110\u00edch l\u01b0u' + (U().can("merge") ? "" : " (G\u1ed9p c\u1ea7n Gold)") + '<select id="convMergeTarget">' + mergeOpts + '</select></label>' +
        '</div>' +
        '<div class="deck-actions">' +
          '<button type="button" class="btn btn-emerald" data-cact="one-click-import">⚡ Nh\u1eadp th\u1eb3ng v\u00e0o Kho \u0111\u1ec1 (' + v.valid + ' c\u00e2u h\u1ee3p l\u1ec7)</button>' +
          '<button type="button" class="btn btn-primary btn-sm" data-cact="send-studio">🎮 M\u1edf trong Creator Studio</button>' +
        '</div>' +
      '</div>';
    }

    // Validation & Review Toolbar
    h += '<section class="panel"><div class="panel-head">' +
      '<div><h2>Ki\u1ec3m duy\u1ec7t &amp; Ch\u1ec9nh s\u1eeda c\u00e2u h\u1ecfi</h2>' +
      '<div class="pills" style="margin:6px 0 0">' +
        '<span class="badge">T\u1ed5ng: ' + v.total + '</span>' +
        '<span class="badge badge-ok">H\u1ee3p l\u1ec7: ' + v.valid + '</span>' +
        '<span class="badge badge-warn">Thi\u1ebfu \u0110/A / L\u1ed7i: ' + (v.missingAns + v.errors) + '</span>' +
        '<span class="badge badge-ok">✓ \u0110\u00e3 ki\u1ec3m tra: ' + verifiedCnt + '/' + v.total + '</span>' +
        (suspectCnt > 0 ? '<span class="badge badge-bad">⚠️ Nghi ng\u1edd sai: ' + suspectCnt + '</span>' : "") +
      '</div></div>' +
      '<div class="deck-actions">' +
        '<div class="seg">' +
          '<button type="button" class="seg-btn' + (cState.viewMode === "digitizer" ? " active" : "") + '" data-cact="vmode" data-val="digitizer">⚡ Digitizer (Split-Screen)</button>' +
          '<button type="button" class="seg-btn' + (cState.viewMode === "table" ? " active" : "") + '" data-cact="vmode" data-val="table">B\u1ea3ng nhanh</button>' +
          '<button type="button" class="seg-btn' + (cState.viewMode === "split" ? " active" : "") + '" data-cact="vmode" data-val="split">' + (U().can("splitReview") ? "" : "🔒 ") + '\u0110\u1ed1i chi\u1ebfu \u1ea3nh g\u1ed1c</button>' +
        '</div>' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="verify-all"' + (v.total === 0 ? " disabled" : "") + '>✓ Duy\u1ec7t t\u1ea5t c\u1ea3</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="clear-all"' + (v.total === 0 && !cState.studyNoteMarkdown ? " disabled" : "") + '>X\u00f3a b\u1ea3ng</button>' +
      '</div></div>';

    h += '<div class="filter-bar">' +
      '<input type="search" id="convSearch" placeholder="T\u00ecm theo s\u1ed1 c\u00e2u ho\u1eb7c t\u1eeb kh\u00f3a..." value="' + U().esc(cState.search) + '" style="flex:1;min-width:200px">' +
      '<select id="convFilter">' +
        '<option value="all"' + (cState.filter === "all" ? " selected" : "") + '>T\u1ea5t c\u1ea3 (' + v.total + ')</option>' +
        '<option value="unverified"' + (cState.filter === "unverified" ? " selected" : "") + '>Ch\u01b0a duy\u1ec7t (' + (v.total - verifiedCnt) + ')</option>' +
        '<option value="suspect"' + (cState.filter === "suspect" ? " selected" : "") + '>⚠️ C\u1ea3nh b\u00e1o nghi ng\u1edd sai (' + suspectCnt + ')</option>' +
        '<option value="missing"' + (cState.filter === "missing" ? " selected" : "") + '>Thi\u1ebfu \u0111\u00e1p \u00e1n (' + v.missingAns + ')</option>' +
      '</select></div>';

    const filtered = cState.questions.map(function (q, idx) { return { q: q, idx: idx }; }).filter(function (item) {
      const q = item.q;
      if (cState.filter === "unverified" && q.verified) return false;
      if (cState.filter === "suspect" && !q.suspect) return false;
      if (cState.filter === "missing") {
        const qt = q.qType || "MCQ";
        if (qt === "MCQ" && q.correct.length > 0) return false;
        if (qt === "TF_GROUP" && q.tfAnswers && Object.keys(q.tfAnswers).length > 0) return false;
        if ((qt === "SHORT_ANSWER" || qt === "ORDERING") && (q.answerText || "").trim()) return false;
        if (qt === "ESSAY") return false;
      }
      const kw = cState.search.trim().toLowerCase();
      if (!kw) return true;
      return String(item.idx + 1) === kw || q.text.toLowerCase().indexOf(kw) !== -1 || q.options.some(function (o) { return o.toLowerCase().indexOf(kw) !== -1; });
    });

    if (cState.viewMode === "digitizer" && (filtered.length > 0 || cState.docMeta.mode === "STUDY_NOTE" || cState.chunkStates.length > 0 || (cState.busy && cState.streamingTail))) {
      h += renderDigitizerWorkspace(filtered);
    } else if (filtered.length === 0) {
      h += '<div class="empty-state">Ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi n\u00e0o. H\u00e3y t\u1ea3i t\u1ec7p \u1ea2nh, PDF, Word, Markdown/Text ho\u1eb7c Excel \u1edf Kh\u1ed1i 1 \u0111\u1ec3 b\u1eaft \u0111\u1ea7u.</div>';
    } else if (cState.viewMode === "split") {
      // Split-Screen Review Mode
      const curIm = cState.images[cState.activeImgIdx];
      h += '<div class="split-review">' +
        '<div class="split-img-pane">' +
          '<div class="panel-head" style="margin:0"><strong>\u1ea2nh \u0111\u1ec1 g\u1ed1c' + (cState.images.length ? (" (" + (cState.activeImgIdx + 1) + "/" + cState.images.length + ")") : "") + '</strong>' +
          '<div class="deck-actions">' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="zoom" data-val="-25">-</button>' +
            '<span class="muted" style="font-size:.78rem">' + cState.imgZoom + '%</span>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="zoom" data-val="25">+</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="img-prev"' + (cState.activeImgIdx <= 0 ? " disabled" : "") + '>←</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="img-next"' + (cState.activeImgIdx >= cState.images.length - 1 ? " disabled" : "") + '>→</button>' +
          '</div></div>' +
          '<div class="split-img-stage">' + (curIm ? '<img src="' + curIm.url + '" alt="\u1ea2nh \u0111\u1ec1 g\u1ed1c" style="width:' + cState.imgZoom + '%">' : '<p class="muted">Ch\u01b0a c\u00f3 \u1ea3nh \u0111\u1ec1 g\u1ed1c n\u00e0o trong h\u00e0ng \u0111\u1ee3i. B\u1ea1n c\u00f3 th\u1ec3 t\u1ea3i \u1ea3nh \u1edf Kh\u1ed1i 1 \u0111\u1ec3 \u0111\u1ed1i chi\u1ebfu song song.</p>') + '</div>' +
        '</div>' +
        '<div class="review-list">' + filtered.slice(0, 60).map(renderReviewCard).join("") + '</div>' +
      '</div>';
    } else {
      // Paginated Table View
      const totalPages = Math.max(1, Math.ceil(filtered.length / cState.perPage));
      cState.page = U().clamp(cState.page, 1, totalPages);
      const slice = filtered.slice((cState.page - 1) * cState.perPage, cState.page * cState.perPage);
      h += '<div class="table-scroll"><table class="data-table"><thead><tr><th>#</th><th>C\u00e2u h\u1ecfi (KaTeX + HTML)</th><th>Ph\u01b0\u01a1ng \u00e1n</th><th>\u0110\u00e1p \u00e1n</th><th>Gi\u1ea3i th\u00edch</th><th>Duy\u1ec7t</th><th></th></tr></thead><tbody>' +
        slice.map(function (item) {
          const q = item.q, i = item.idx;
          const opts = q.options.map(function (o, k) {
            if (!o) return "";
            const ok = q.correct.indexOf(k) !== -1;
            return '<div class="rich-text" style="' + (ok ? "color:var(--emerald);font-weight:700" : "") + '"><strong>' + U().LETTERS.charAt(k) + ".</strong> " + U().renderRich(o) + "</div>";
          }).join("");
          const ansBtns = q.options.map(function (o, k) {
            if (!o) return "";
            const ok = q.correct.indexOf(k) !== -1;
            return '<button type="button" class="btn ' + (ok ? "btn-emerald" : "btn-outline") + ' btn-sm" style="padding:3px 7px;border-radius:6px" data-cact="toggle-ans" data-idx="' + i + '" data-opt="' + k + '">' + U().LETTERS.charAt(k) + "</button>";
          }).join(" ");
          return '<tr style="' + (q.suspect ? "background:var(--amber-soft)" : "") + '"><td>' + (i + 1) + '</td>' +
            '<td style="min-width:220px"><div class="rich-text">' + U().renderRich(q.text) + '</div>' +
              (q.suspect ? '<div class="badge badge-warn" style="margin-top:4px">⚠️ C\u1ea7n ki\u1ec3m tra k\u1ef9</div>' : "") +
              (q.checkNote ? '<div class="muted" style="font-size:.74rem;margin-top:3px">' + U().esc(q.checkNote) + "</div>" : "") +
            '</td><td style="min-width:200px">' + opts + '</td>' +
            '<td style="white-space:nowrap">' + ansBtns + (q.correct.length === 0 ? '<div class="badge badge-warn" style="margin-top:4px">Thi\u1ebfu \u0110/A</div>' : "") + '</td>' +
            '<td class="rich-text" style="min-width:140px">' + (q.explanation ? U().renderRich(q.explanation) : '<span class="muted">—</span>') + '</td>' +
            '<td><label class="check-row" style="margin:0;font-size:.76rem"><input type="checkbox" data-cact="verify-q" data-idx="' + i + '"' + (q.verified ? " checked" : "") + '> ✓</label></td>' +
            '<td style="white-space:nowrap">' +
              '<button type="button" class="btn btn-outline btn-sm" title="Lưu nhanh từ vựng vào Vocab Studio" data-cact="quick-vocab" data-idx="' + i + '">📖 +Từ vựng</button> ' +
              '<button type="button" class="btn btn-outline btn-sm" data-cact="edit-inline" data-idx="' + i + '">S\u1eeda</button> ' +
              '<button type="button" class="btn btn-outline btn-sm" data-cact="del-q" data-idx="' + i + '">✕</button>' +
            '</td></tr>';
        }).join("") + '</tbody></table></div>';
      if (totalPages > 1) {
        h += '<div class="pager"><button type="button" data-cact="pg" data-val="' + (cState.page - 1) + '"' + (cState.page <= 1 ? " disabled" : "") + '>&lt;</button>' +
          '<span class="muted" style="padding:5px 10px;font-size:.82rem">Trang ' + cState.page + "/" + totalPages + '</span>' +
          '<button type="button" data-cact="pg" data-val="' + (cState.page + 1) + '"' + (cState.page >= totalPages ? " disabled" : "") + '>&gt;</button></div>';
      }
    }
    h += "</section>";
    root.innerHTML = h;

    if (!cState.mounted) {
      cState.mounted = true;
      root.addEventListener("click", onConverterClick);
      root.addEventListener("change", onConverterChange);
      root.addEventListener("input", onConverterInput);
      root.addEventListener("dragover", function (e) {
        const dz = e.target.closest ? e.target.closest("#convDropUnified") : null;
        if (!dz) return;
        e.preventDefault();
        dz.classList.add("drag-over");
      });
      root.addEventListener("dragleave", function (e) {
        const dz = e.target.closest ? e.target.closest("#convDropUnified") : null;
        if (dz && !dz.contains(e.relatedTarget)) dz.classList.remove("drag-over");
      });
      root.addEventListener("drop", function (e) {
        const dz = e.target.closest ? e.target.closest("#convDropUnified") : null;
        if (!dz) return;
        e.preventDefault();
        dz.classList.remove("drag-over");
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          addUnifiedFiles(e.dataTransfer.files);
        }
      });
      document.addEventListener("paste", function (e) {
        if (U().state.tab !== "converter") return;
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        const imgs = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.indexOf("image/") === 0) { const f = items[i].getAsFile(); if (f) imgs.push(f); }
        }
        if (imgs.length > 0) { e.preventDefault(); addUnifiedFiles(imgs); }
      });
    }
    if (typeof U().applyI18n === "function") U().applyI18n(root);
    setupContextScrollObserver(root);
  }

  /* ======================== RICH MARKDOWN + DIGITIZER SMART SPLIT-SCREEN ======================== */
  function renderMarkdownRich(raw) {
    const text = String(raw == null ? "" : raw).replace(/\r\n/g, "\n");
    if (!text.trim()) return "";
    // Split fenced code blocks first so we don't mangle code
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map(function (part) {
      if (part.indexOf("```") === 0 && part.slice(-3) === "```") {
        const inner = part.slice(3, -3);
        const nl = inner.indexOf("\n");
        const lang = nl > -1 ? inner.slice(0, nl).trim() : "";
        const code = nl > -1 ? inner.slice(nl + 1) : inner;
        return '<pre class="digitizer-code">' + (lang ? '<span class="digitizer-code-lang">' + U().esc(lang) + '</span>' : '') + '<code>' + U().esc(code) + '</code></pre>';
      }
      const lines = part.split("\n");
      let out = "", i = 0;
      while (i < lines.length) {
        const ln = lines[i];
        // Markdown table detection
        if (/^\s*\|.+\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|[\s:\-|]+\|\s*$/.test(lines[i + 1])) {
          const headCells = ln.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); });
          i += 2;
          const bodyRows = [];
          while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
            bodyRows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }));
            i++;
          }
          out += '<div class="table-scroll"><table class="digitizer-md-table"><thead><tr>' +
            headCells.map(function (c) { return '<th>' + U().renderRich(c) + '</th>'; }).join("") +
            '</tr></thead><tbody>' +
            bodyRows.map(function (r) {
              return '<tr>' + r.map(function (c) { return '<td>' + U().renderRich(c) + '</td>'; }).join("") + '</tr>';
            }).join("") +
            '</tbody></table></div>';
          continue;
        }
        // Headings (for STUDY_NOTE or context titles)
        const hMatch = ln.match(/^(#{1,4})\s+(.+)$/);
        if (hMatch) {
          const lvl = Math.min(4, Math.max(2, hMatch[1].length));
          const hid = "sn_" + hMatch[2].toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g, "_").slice(0, 40) + "_" + i;
          out += '<h' + lvl + ' id="' + hid + '" class="digitizer-md-h">' + U().renderRich(hMatch[2]) + '</h' + lvl + '>';
          i++;
          continue;
        }
        if (/^>\s*/.test(ln)) {
          out += '<blockquote class="digitizer-quote">' + U().renderRich(ln.replace(/^>\s*/, "")) + '</blockquote>';
          i++;
          continue;
        }
        if (ln.trim()) {
          out += '<p class="digitizer-p">' + U().renderRich(ln) + '</p>';
        }
        i++;
      }
      return out;
    }).join("");
  }

  function renderStudyNoteView() {
    const raw = (cState.studyNoteMarkdown || cState.rawMarkdown || "").replace(/^---[\s\S]*?---\s*/m, "");
    const toc = [];
    raw.split("\n").forEach(function (ln, idx) {
      const m = ln.match(/^(#{1,3})\s+(.+)$/);
      if (m) {
        const hid = "sn_" + m[2].toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g, "_").slice(0, 40) + "_" + idx;
        toc.push({ level: m[1].length, text: m[2].trim(), id: hid });
      }
    });
    return '<div class="study-note-view">' +
      (toc.length > 0 ? (
        '<aside class="study-toc"><h4>📑 M\u1ee5c l\u1ee5c t\u1ef1 \u0111\u1ed9ng</h4><ul>' +
        toc.map(function (t) {
          return '<li class="toc-l' + t.level + '"><a href="#' + U().esc(t.id) + '">' + U().esc(t.text) + '</a></li>';
        }).join("") + '</ul></aside>'
      ) : "") +
      '<article class="study-note-body rich-text">' + renderMarkdownRich(raw) + '</article>' +
    '</div>';
  }

  function renderDigitizerWorkspace(filtered) {
    let out = "";

    // 1. Chunk Status & Error Retry Bar
    if (cState.chunkStates && cState.chunkStates.length > 0) {
      const failedChunks = cState.chunkStates.filter(function (c) { return c.status === "error"; });
      out += '<div class="chunk-status-bar">' +
        cState.chunkStates.map(function (c) {
          const ico = c.status === "done" ? "✅" : (c.status === "streaming" ? "⚡" : (c.status === "error" ? "⚠️" : "○"));
          return '<span class="chunk-pill is-' + c.status + '">' + ico + ' ' + U().esc(c.label) + '</span>';
        }).join("") +
        (cState.ttftMs ? '<span class="chunk-pill is-done">⏱ TTFT ' + (cState.ttftMs / 1000).toFixed(2) + 's</span>' : '') +
      '</div>';
      if (failedChunks.length > 0) {
        out += '<div class="chunk-error-list">' + failedChunks.map(function (fc) {
          return '<div class="chunk-error-bar"><div><strong>⚠️ ' + U().esc(fc.label) + ':</strong> ' + U().esc(fc.error || "B\u1ecb gi\u00e1n \u0111o\u1ea1n k\u1ebft n\u1ed1i") + '</div>' +
            '<button type="button" class="btn btn-primary btn-sm" data-cact="retry-chunk" data-chunk-idx="' + fc.index + '"' + (cState.busy ? " disabled" : "") + '>🔄 Th\u1eed l\u1ea1i ph\u1ea7n n\u00e0y</button></div>';
        }).join("") + '</div>';
      }
    }

    // 1B. Deterministic QA Audit Banner (V3.3 Section 2.6)
    if (D() && typeof D().runDeterministicQA === "function" && (cState.questions.length > 0 || cState.docMeta.mode === "STUDY_NOTE") && !cState.busy) {
      const qa = D().runDeterministicQA({ meta: cState.docMeta, contexts: cState.contexts, questions: cState.questions }, cState.chunkStates);
      if (qa.issues.length > 0) {
        out += '<details class="digitizer-qa-box' + (qa.errors > 0 ? " has-errors" : "") + '" style="margin-bottom:12px;padding:10px 14px;border-radius:12px;border:1px solid ' + (qa.errors > 0 ? "#f87171" : "var(--border)") + ';background:var(--bg2)">' +
          '<summary style="cursor:pointer;font-weight:700;font-size:.84rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<span>' + (qa.errors > 0 ? "🛡️ QA Ki\u1ec3m \u0111\u1ecbnh: " + qa.errors + " l\u1ed7i, " + qa.warnings + " c\u1ea3nh b\u00e1o c\u1ea7n duy\u1ec7t" : "🛡️ QA Ki\u1ec3m \u0111\u1ecbnh: " + qa.warnings + " l\u01b0u \u00fd c\u1ea7n xem l\u1ea1i") + '</span>' +
            (qa.uncertainCount > 0 ? '<span class="badge badge-warn">[CHECK]: ' + qa.uncertainCount + '</span>' : '') +
          '</summary>' +
          '<ul style="margin:8px 0 0 18px;padding:0;font-size:.8rem;display:flex;flex-direction:column;gap:4px">' +
            qa.issues.slice(0, 25).map(function (iss) {
              return '<li style="color:' + (iss.severity === "error" ? "#dc2626" : "var(--text)") + '"><strong>[' + U().esc(iss.code) + ']</strong> ' + U().esc(iss.message) + '</li>';
            }).join("") +
          '</ul>' +
        '</details>';
      } else {
        out += '<div class="badge badge-ok" style="margin-bottom:10px;display:inline-flex">✅ QA Ki\u1ec3m \u0111\u1ecbnh t\u1ef1 \u0111\u1ed9ng: \u0110\u1ea1t chu\u1ea9n 100% (0 l\u1ed7i, 0 c\u1ea3nh b\u00e1o)</div>';
      }
    }

    // 2. STUDY_NOTE Mode
    if (cState.docMeta && cState.docMeta.mode === "STUDY_NOTE") {
      return out + renderStudyNoteView();
    }

    // 3. EXAM Mode: Smart Context Pinning Split-Screen
    const ctxIds = Object.keys(cState.contexts || {});
    const hasContexts = ctxIds.length > 0;
    const pinnedId = (cState.pinnedContextId && cState.contexts[cState.pinnedContextId]) ? cState.pinnedContextId : (ctxIds[0] || "");
    const pinnedCtx = pinnedId ? cState.contexts[pinnedId] : null;

    out += '<div class="digitizer-split' + (hasContexts ? " has-context" : "") + '">';

    if (hasContexts) {
      out += '<aside class="digitizer-context-pane" id="digitizerCtxPane">' +
        '<div class="digitizer-ctx-head"><strong>📌 Ng\u1eef li\u1ec7u chung (Smart Context Pinning)</strong>' +
          '<div class="digitizer-ctx-tabs">' +
          ctxIds.map(function (cid) {
            const cObj = cState.contexts[cid];
            const active = cid === pinnedId ? " active" : "";
            return '<button type="button" class="digitizer-ctx-tab' + active + '" data-cact="pin-ctx" data-ctx="' + U().esc(cid) + '">' +
              U().esc(cid) + (cObj && cObj.questions ? (' (' + U().esc(cObj.questions) + ')') : '') + '</button>';
          }).join("") +
          '</div>' +
        '</div>' +
        '<div class="digitizer-ctx-body rich-text" id="digitizerCtxBody">' +
          (pinnedCtx ? renderMarkdownRich(pinnedCtx.content) : '') +
        '</div>' +
      '</aside>';
    }

    out += '<div class="digitizer-questions-pane">';
    let lastInstr = "";
    filtered.forEach(function (item) {
      const q = item.q;
      const idx = item.idx;
      const qt = q.qType || "MCQ";

      // Instruction banner above question groups
      if (q.instruction && q.instruction !== lastInstr) {
        lastInstr = q.instruction;
        out += '<div class="digitizer-instr-banner"><span class="digitizer-instr-tag">📋 Y\u00eau c\u1ea7u nh\u00f3m c\u00e2u</span><div class="rich-text">' + renderMarkdownRich(q.instruction) + '</div></div>';
      }

      const typeLabel = qt === "TF_GROUP" ? "\u0110\u00fang / Sai (2025)" :
        (qt === "SHORT_ANSWER" ? "Tr\u1ea3 l\u1eddi ng\u1eafn" :
        (qt === "ORDERING" ? "S\u1eafp x\u1ebfp th\u1ee9 t\u1ef1" :
        (qt === "ESSAY" ? "T\u1ef1 lu\u1eadn" : "Tr\u1eafc nghi\u1ec7m (MCQ)")));

      const cacheKey = makeExplainCacheKey(q);
      const cachedExp = cState.explainCache && cState.explainCache[cacheKey];
      const shownExp = q.explanation || cachedExp || "";
      const isExplaining = cState.explainingId === idx;
      const ua = cState.userAnswers[idx] || {};

      out += '<article class="digitizer-q-card' + (q.contextId && q.contextId === pinnedId ? " ctx-linked" : "") + '" data-q-idx="' + idx + '"' + (q.contextId ? (' data-ctx="' + U().esc(q.contextId) + '"') : '') + '>' +
        '<div class="digitizer-q-head">' +
          '<div class="digitizer-q-meta">' +
            '<strong>C\u00e2u ' + (q.number || (idx + 1)) + '</strong>' +
            '<span class="badge">' + typeLabel + '</span>' +
            (q.contextId ? '<button type="button" class="badge badge-ok" style="cursor:pointer;border:none" data-cact="pin-ctx" data-ctx="' + U().esc(q.contextId) + '">📌 ' + U().esc(q.contextId) + '</button>' : '') +
            (q.level ? '<span class="badge">' + U().esc(q.level) + '</span>' : '') +
            (q.tag ? '<span class="badge">' + U().esc(q.tag) + '</span>' : '') +
          '</div>' +
          '<div class="digitizer-q-actions">' +
            '<button type="button" class="btn btn-primary btn-sm" data-cact="ai-explain" data-idx="' + idx + '"' + (isExplaining ? " disabled" : "") + '>' +
              (isExplaining ? '<span class="spinner"></span>\u0110ang gi\u1ea3i...' : (cachedExp ? '🤖 AI Gi\u1ea3i th\u00edch ✓' : '🤖 AI Gi\u1ea3i th\u00edch')) +
            '</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="quick-vocab" data-idx="' + idx + '" title="L\u01b0u t\u1eeb v\u1ef1ng v\u00e0o Vocab Studio">📖 +T\u1eeb v\u1ef1ng</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="edit-inline" data-idx="' + idx + '">S\u1eeda</button>' +
          '</div>' +
        '</div>' +
        '<div class="digitizer-q-text rich-text">' + renderMarkdownRich(q.text) + '</div>';

      // Interactive body by question type
      if (qt === "MCQ") {
        const chosen = typeof ua.mcq === "number" ? ua.mcq : -1;
        out += '<div class="digitizer-mcq-grid">' +
          (q.options || []).map(function (o, k) {
            if (!o) return "";
            const isKey = (q.correct || []).indexOf(k) !== -1;
            const isPicked = chosen === k;
            let cls = "digitizer-opt-btn";
            if (isPicked) cls += isKey || q.correct.length === 0 ? " is-correct" : " is-wrong";
            else if (chosen !== -1 && isKey) cls += " is-correct";
            else if (chosen === -1 && isKey) cls += " is-key";
            return '<button type="button" class="' + cls + '" data-cact="ans-mcq" data-idx="' + idx + '" data-opt="' + k + '">' +
              '<span class="opt-letter">' + U().LETTERS.charAt(k) + '</span>' +
              '<span class="rich-text">' + U().renderRich(o) + '</span>' +
            '</button>';
          }).join("") + '</div>';
      } else if (qt === "TF_GROUP") {
        const tfUser = ua.tf || {};
        const tfItems = Array.isArray(q.tfStatements) ? q.tfStatements : (Array.isArray(q.tfItems) ? q.tfItems : []);
        const hasKey = q.tfAnswers && Object.keys(q.tfAnswers).length > 0;
        const scoreInfo = (hasKey && Object.keys(tfUser).length > 0 && D()) ? D().scoreTfGroup2025(tfUser, q.tfAnswers) : null;
        out += '<div class="tf-grid-wrap"><table class="tf-grid"><thead><tr><th>M\u1ec7nh \u0111\u1ec1</th><th style="width:76px;text-align:center">\u0110\u00fang</th><th style="width:76px;text-align:center">Sai</th></tr></thead><tbody>' +
          tfItems.map(function (it) {
            const uVal = tfUser[it.key];
            const kVal = q.tfAnswers ? q.tfAnswers[it.key] : undefined;
            const tCls = uVal === true ? (kVal === undefined || kVal === true ? "btn-emerald" : "btn-danger") : (kVal === true ? "btn-outline tf-key-hint" : "btn-outline");
            const fCls = uVal === false ? (kVal === undefined || kVal === false ? "btn-emerald" : "btn-danger") : (kVal === false ? "btn-outline tf-key-hint" : "btn-outline");
            return '<tr><td class="rich-text"><strong>' + U().esc(it.key) + ')</strong> ' + U().renderRich(it.text) + '</td>' +
              '<td style="text-align:center"><button type="button" class="btn btn-sm ' + tCls + '" data-cact="ans-tf" data-idx="' + idx + '" data-tfkey="' + U().esc(it.key) + '" data-tfval="true">\u0110\u00fang</button></td>' +
              '<td style="text-align:center"><button type="button" class="btn btn-sm ' + fCls + '" data-cact="ans-tf" data-idx="' + idx + '" data-tfkey="' + U().esc(it.key) + '" data-tfval="false">Sai</button></td></tr>';
          }).join("") + '</tbody></table>' +
          (scoreInfo ? '<div class="tf-score-badge">📊 \u0110i\u1ec3m thi 2025: <strong>' + scoreInfo.score + ' / 1.0 \u0111i\u1ec3m</strong> (\u0110\u00fang ' + scoreInfo.correctCount + '/' + scoreInfo.total + ' \u00fd)</div>' : '') +
        '</div>';
      } else if (qt === "SHORT_ANSWER" || qt === "ORDERING") {
        const val = ua.short || "";
        const checked = !!ua.shortChecked;
        const ok = checked && D() ? D().compareShortAnswer(val, q.answerText) : false;
        out += '<div class="digitizer-short-box">' +
          '<input type="text" class="inline-edit-input" data-ans-short="' + idx + '" value="' + U().esc(val) + '" placeholder="' + (qt === "ORDERING" ? "Nh\u1eadp th\u1ee9 t\u1ef1 (VD: c-a-b-d)..." : "Nh\u1eadp \u0111\u00e1p \u00e1n ng\u1eafn...") + '">' +
          '<button type="button" class="btn btn-primary btn-sm" data-cact="ans-short-check" data-idx="' + idx + '">Ki\u1ec3m tra</button>' +
        '</div>' +
        (checked ? ('<div class="badge ' + (ok ? "badge-ok" : "badge-bad") + '" style="margin-top:6px">' + (ok ? "✅ Ch\u00ednh x\u00e1c!" : ("❌ Ch\u01b0a kh\u1edbp. \u0110\u00e1p \u00e1n chu\u1ea9n: " + U().esc(q.answerText || "Ch\u01b0a c\u00f3"))) + '</div>') : (q.answerText ? '<div class="muted" style="font-size:.78rem;margin-top:4px">\u0110\u00e1p \u00e1n g\u1ed1c: <strong>' + U().esc(q.answerText) + '</strong></div>' : ''));
      } else if (qt === "ESSAY") {
        const showGuide = !!ua.showGuide;
        out += '<div class="digitizer-essay-box">' +
          '<textarea class="inline-edit-input" rows="3" data-ans-essay="' + idx + '" placeholder="Nh\u1eadp b\u00e0i l\u00e0m t\u1ef1 lu\u1eadn c\u1ee7a b\u1ea1n...">' + U().esc(ua.essay || "") + '</textarea>' +
          '<div style="margin-top:6px"><button type="button" class="btn btn-outline btn-sm" data-cact="toggle-essay-guide" data-idx="' + idx + '">' + (showGuide ? "🙈 \u1ea8n h\u01b0\u1edbng d\u1eabn ch\u1ea5m" : "👁️ Xem h\u01b0\u1edbng d\u1eabn ch\u1ea5m") + '</button></div>' +
          (showGuide ? '<div class="digitizer-explain-box rich-text" style="margin-top:8px"><strong>H\u01b0\u1edbng d\u1eabn ch\u1ea5m / \u0110\u00e1p \u00e1n g\u1ee3i \u00fd:</strong><br>' + renderMarkdownRich(q.answerText || shownExp || "B\u1ea5m n\u00fat \ud83e\udd16 AI Gi\u1ea3i th\u00edch \u0111\u1ec3 AI t\u1ea1o \u0111\u00e1p \u00e1n chi ti\u1ebft.") + '</div>' : '') +
        '</div>';
      }

      if (shownExp && qt !== "ESSAY") {
        out += '<div class="digitizer-explain-box rich-text"><strong>💡 L\u1eddi gi\u1ea3i &amp; Ph\u00e2n t\u00edch:</strong> ' + renderMarkdownRich(shownExp) + '</div>';
      }
      out += '</article>';
    });

    // Live Streaming Skeleton / Typing Tail
    if (cState.busy && cState.streamingTail) {
      out += '<div class="streaming-skeleton">' +
        '<div class="streaming-skeleton-head"><span class="spinner"></span><strong>AI \u0111ang vi\u1ebft c\u00e2u ti\u1ebfp theo (Streaming)...</strong></div>' +
        '<pre class="streaming-tail-text">' + U().esc(cState.streamingTail.slice(-600)) + '</pre>' +
      '</div>';
    }

    out += '</div></div>';
    return out;
  }

  let _ctxObserver = null;
  function setupContextScrollObserver(root) {
    if (_ctxObserver) { try { _ctxObserver.disconnect(); } catch (e) {} _ctxObserver = null; }
    if (cState.viewMode !== "digitizer" || typeof IntersectionObserver === "undefined") return;
    const ctxPane = root.querySelector("#digitizerCtxBody");
    if (!ctxPane) return;
    const cards = root.querySelectorAll(".digitizer-q-card[data-ctx]");
    if (!cards.length) return;
    _ctxObserver = new IntersectionObserver(function (entries) {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          const cid = entries[i].target.getAttribute("data-ctx");
          if (cid && cid !== cState.pinnedContextId && cState.contexts[cid]) {
            cState.pinnedContextId = cid;
            ctxPane.innerHTML = renderMarkdownRich(cState.contexts[cid].content);
            root.querySelectorAll(".digitizer-ctx-tab").forEach(function (btn) {
              btn.classList.toggle("active", btn.getAttribute("data-ctx") === cid);
            });
          }
          break;
        }
      }
    }, { rootMargin: "-15% 0px -65% 0px", threshold: 0.05 });
    cards.forEach(function (card) { _ctxObserver.observe(card); });
  }

  /* ======================== LOCAL MARKDOWN IMPORT & MANUAL FALLBACK MODAL (V3.3 Section 2.7) ======================== */
  function importLocalMarkdown(rawMd, sourceLabel) {
    const unwrapped = (D() && typeof D().unwrapMarkdownFence === "function")
      ? D().unwrapMarkdownFence(rawMd, true)
      : String(rawMd || "").replace(/\r\n/g, "\n").replace(/^\s*```(?:markdown|md)?[ \t]*\n/i, "").replace(/\n```[ \t]*\s*$/, "").replace(/^~~~~([a-zA-Z0-9_+-]*)[ \t]*$/gm, "```$1");
    const clean = unwrapped.trim();
    if (!clean) {
      U().showToast("Ch\u01b0a c\u00f3 n\u1ed9i dung Markdown \u0111\u1ec3 nh\u1eadp.", "warning");
      return false;
    }
    if (/^ERROR_INVALID_CONTENT\s*:/i.test(clean)) {
      U().showToast(clean, "error");
      return false;
    }
    let loaded = false;
    if (D() && (/^---\s*\n[\s\S]*?mode\s*:/i.test(clean) || /^###\s*(?:C\u00e2u|Question|B\u00e0i)\s*\d+/m.test(clean) || /^:::context/m.test(clean))) {
      const parser = D().createIncrementalParser();
      parser.append(clean);
      const doc = parser.finish();
      cState.docMeta = doc.meta || { title: "", subject: "", mode: "EXAM", total_questions: 0, duration_minutes: 45 };
      cState.contexts = doc.contexts || {};
      const ctxIds = Object.keys(cState.contexts);
      cState.pinnedContextId = ctxIds[0] || "";
      cState.studyNoteMarkdown = doc.studyNoteMarkdown || "";
      cState.rawMarkdown = clean;
      const converted = (doc.questions || []).map(digitizerQToConvItem).filter(Boolean);
      cState.questions = cState.appendMode ? cState.questions.concat(converted) : converted;
      loaded = cState.questions.length > 0 || cState.docMeta.mode === "STUDY_NOTE";
    }
    if (!loaded) {
      const fallbackQs = parseMarkdown(clean);
      if (fallbackQs.length > 0) {
        cState.questions = cState.appendMode ? cState.questions.concat(fallbackQs) : fallbackQs;
        cState.rawMarkdown = clean;
        cState.docMeta = { title: sourceLabel || "Markdown \u0111\u00e3 nh\u1eadp", subject: "", mode: "EXAM", total_questions: cState.questions.length, duration_minutes: 45 };
        loaded = true;
      }
    }
    if (!loaded) {
      U().showToast("Kh\u00f4ng th\u1ec3 ph\u00e2n t\u00edch Markdown. H\u00e3y ki\u1ec3m tra \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng Master Prompt.", "error");
      return false;
    }
    cState.chunkStates = [{
      index: 0,
      label: (sourceLabel || "Markdown c\u1ee5c b\u1ed9") + " (0 LLM token)",
      status: "done",
      error: "",
      markdown: clean
    }];
    cState.viewMode = "digitizer";
    cState.lastSummary = "Nh\u1eadp c\u1ee5c b\u1ed9 (0 API call): " + (cState.docMeta.mode === "STUDY_NOTE" ? "STUDY_NOTE" : (cState.questions.length + " c\u00e2u h\u1ecfi"));
    renderConverter();
    U().showToast("\u0110\u00e3 nh\u1eadp Markdown c\u1ee5c b\u1ed9 th\u00e0nh c\u00f4ng (0 LLM token)!", "success");
    return true;
  }

  function openManualFallbackModal(errorReason) {
    const host = U().$("extraModals");
    if (!host) return;
    const lang = (U().state && U().state.lang) || "vi";
    const copy = {
      vi: {
        title: "🌐 Chuy\u1ec3n \u0111\u1ed5i qua AI ngo\u00e0i / Master Prompt (Fallback 0 Token)",
        s1: "B\u01b0\u1edbc 1: Sao ch\u00e9p ch\u00ednh x\u00e1c CONVERTER_MASTER_PROMPT b\u00ean d\u01b0\u1edbi.",
        s2: "B\u01b0\u1edbc 2: D\u00e1n prompt n\u00e0y c\u00f9ng file \u0111\u1ec1 thi g\u1ed1c v\u00e0o ChatGPT, Gemini ho\u1eb7c Claude.",
        s3: "B\u01b0\u1edbc 3: T\u1ea3i tr\u1ef1c ti\u1ebfp file .md do AI t\u1ea1o ho\u1eb7c b\u1ea5m bi\u1ec3u t\u01b0\u1ee3ng Copy \u1edf g\u00f3c kh\u1ed1i code ```markdown r\u1ed3i d\u00e1n / t\u1ea3i l\u00ean b\u00ean d\u01b0\u1edbi (nh\u1eadp c\u1ee5c b\u1ed9 0 API call).",
        copyBtn: "📋 Sao ch\u00e9p Master Prompt",
        copied: "✅ \u0110\u00e3 sao ch\u00e9p!",
        dropLabel: "📂 K\u00e9o th\u1ea3 ho\u1eb7c ch\u1ecdn file .md t\u1ea1i \u0111\u00e2y",
        pastePh: "Ho\u1eb7c d\u00e1n to\u00e0n b\u1ed9 n\u1ed9i dung Markdown (.md) t\u1eeb ChatGPT / Gemini / Claude v\u00e0o \u0111\u00e2y...",
        importBtn: "⚡ Nh\u1eadp Markdown c\u1ee5c b\u1ed9 (0 API call)",
        closeBtn: "\u0110\u00f3ng"
      },
      en: {
        title: "🌐 Convert via External AI / Master Prompt (Local Fallback)",
        s1: "Step 1: Copy the exact CONVERTER_MASTER_PROMPT below.",
        s2: "Step 2: Paste this prompt with your original file into ChatGPT, Gemini, or Claude.",
        s3: "Step 3: Download the generated .md file directly from the AI chat, or click the Copy icon on the ```markdown code block and paste/upload it below (0 LLM API calls).",
        copyBtn: "📋 Copy Master Prompt",
        copied: "✅ Copied!",
        dropLabel: "📂 Drag & drop or choose a .md file here",
        pastePh: "Or paste the generated Markdown (.md) from ChatGPT / Gemini / Claude here...",
        importBtn: "⚡ Import Markdown Locally (0 API calls)",
        closeBtn: "Close"
      },
      ja: {
        title: "🌐 \u5916\u90e8AI / Master Prompt \u3067\u5909\u63db (\u30ed\u30fc\u30ab\u30eb\u30d5\u30a9\u30fc\u30eb\u30d0\u30c3\u30af)",
        s1: "\u30b9\u30c6\u30c3\u30d71: \u4e0b\u8a18\u306e CONVERTER_MASTER_PROMPT \u3092\u30b3\u30d4\u30fc\u3057\u307e\u3059\u3002",
        s2: "\u30b9\u30c6\u30c3\u30d72: ChatGPT / Gemini / Claude \u306b\u5143\u30d5\u30a1\u30a4\u30eb\u3068\u4e00\u7dd2\u306b\u8cbc\u308a\u4ed8\u3051\u3066\u5909\u63db\u3057\u307e\u3059\u3002",
        s3: "\u30b9\u30c6\u30c3\u30d73: AI\u304c\u751f\u6210\u3057\u305f .md \u30d5\u30a1\u30a4\u30eb\u3092\u76f4\u63a5\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9\u3059\u308b\u304b\u3001```markdown \u30b3\u30fc\u30c9\u30d6\u30ed\u30c3\u30af\u306e\u30b3\u30d4\u30fc\u30a2\u30a4\u30b3\u30f3\u3092\u62bc\u3057\u3066\u4e0b\u8a18\u306b\u8cbc\u308a\u4ed8\u3051\u30fb\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u3057\u307e\u3059 (API\u547c\u51fa\u30570\u56de)\u3002",
        copyBtn: "📋 Master Prompt \u3092\u30b3\u30d4\u30fc",
        copied: "✅ \u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f!",
        dropLabel: "📂 .md \u30d5\u30a1\u30a4\u30eb\u3092\u30c9\u30e9\u30c3\u30b0&\u30c9\u30ed\u30c3\u30d7\u307e\u305f\u306f\u9078\u629e",
        pastePh: "ChatGPT / Gemini / Claude \u304c\u751f\u6210\u3057\u305f Markdown \u3092\u3053\u3053\u306b\u8cbc\u308a\u4ed8\u3051...",
        importBtn: "⚡ \u30ed\u30fc\u30ab\u30eb\u3067 Markdown \u3092\u30a4\u30f3\u30dd\u30fc\u30c8 (0 API)",
        closeBtn: "\u9589\u3058\u308b"
      }
    }[lang] || {};
    const t = copy.title ? copy : {
      title: "🌐 Convert via External AI / Master Prompt",
      s1: "Step 1: Copy Master Prompt.", s2: "Step 2: Use it with your original file in ChatGPT/Gemini/Claude.", s3: "Step 3: Import generated Markdown.",
      copyBtn: "📋 Copy Prompt", copied: "✅ Copied!", dropLabel: "📂 Drop or upload .md file", pastePh: "Paste Markdown...", importBtn: "⚡ Import Locally", closeBtn: "Close"
    };

    host.innerHTML =
      '<div class="modal-overlay" id="convFallbackModal" role="dialog" aria-modal="true"><div class="modal modal-lg">' +
        '<h3>' + U().esc(t.title) + '</h3>' +
        (errorReason ? '<div class="pending-banner" style="margin-bottom:10px;font-size:.82rem">⚠️ ' + U().esc(errorReason) + '</div>' : '') +
        '<ol style="margin:0 0 12px 18px;padding:0;font-size:.84rem;line-height:1.55">' +
          '<li>' + U().esc(t.s1) + '</li>' +
          '<li>' + U().esc(t.s2) + '</li>' +
          '<li>' + U().esc(t.s3) + '</li>' +
        '</ol>' +
        '<div class="field" style="margin-bottom:10px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-weight:700;font-size:.8rem">CONVERTER_MASTER_PROMPT (Read-Only)</span>' +
            '<button type="button" class="btn btn-primary btn-sm" id="fbCopyPromptBtn">' + U().esc(t.copyBtn) + '</button></div>' +
          '<textarea id="fbMasterPromptBox" rows="6" readonly style="width:100%;font-family:monospace;font-size:.76rem;background:var(--bg2)">' + U().esc(CONVERTER_MASTER_PROMPT) + '</textarea>' +
        '</div>' +
        '<label class="conv-drop" id="fbMdDropZone" style="padding:12px;margin-bottom:8px">' +
          '<strong>' + U().esc(t.dropLabel) + '</strong>' +
          '<input type="file" id="fbMdFileInput" accept=".md,.txt,text/markdown,text/plain" hidden>' +
        '</label>' +
        '<textarea id="fbMdPasteArea" rows="6" style="width:100%;font-family:monospace;font-size:.8rem" placeholder="' + U().esc(t.pastePh) + '"></textarea>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-outline" id="fbCloseBtn">' + U().esc(t.closeBtn) + '</button>' +
          '<button type="button" class="btn btn-emerald" id="fbImportBtn">' + U().esc(t.importBtn) + '</button>' +
        '</div>' +
      '</div></div>';

    U().on("fbCloseBtn", "click", function () { host.innerHTML = ""; });
    U().on("fbCopyPromptBtn", "click", function () {
      const btn = U().$("fbCopyPromptBtn");
      U().copyText(CONVERTER_MASTER_PROMPT, "CONVERTER_MASTER_PROMPT");
      if (btn) {
        btn.textContent = t.copied;
        setTimeout(function () { if (btn) btn.textContent = t.copyBtn; }, 2200);
      }
    });
    const loadMdFile = function (file) {
      if (!file) return;
      readFileAsText(file).then(function (txt) {
        const area = U().$("fbMdPasteArea");
        if (area) area.value = txt;
        if (importLocalMarkdown(txt, file.name)) host.innerHTML = "";
      }).catch(function () { U().showToast("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file .md.", "error"); });
    };
    U().on("fbMdFileInput", "change", function (ev) {
      const f = ev.target.files && ev.target.files[0];
      if (f) loadMdFile(f);
      ev.target.value = "";
    });
    const dz = U().$("fbMdDropZone");
    if (dz) {
      dz.addEventListener("dragover", function (ev) { ev.preventDefault(); dz.classList.add("drag-over"); });
      dz.addEventListener("dragleave", function () { dz.classList.remove("drag-over"); });
      dz.addEventListener("drop", function (ev) {
        ev.preventDefault();
        dz.classList.remove("drag-over");
        const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
        if (f) loadMdFile(f);
      });
    }
    U().on("fbImportBtn", "click", function () {
      const area = U().$("fbMdPasteArea");
      const val = area ? area.value : "";
      if (importLocalMarkdown(val, "External AI Markdown")) host.innerHTML = "";
    });
  }

  function loadLegacyExam(legacyInput) {
    if (!legacyInput) return false;
    if (typeof legacyInput === "string") {
      if (D() && /^---\s*\n[\s\S]*?mode\s*:/i.test(legacyInput.trim())) {
        const p = D().createIncrementalParser();
        p.append(legacyInput);
        const doc = p.finish();
        cState.docMeta = doc.meta;
        cState.contexts = doc.contexts || {};
        cState.questions = (doc.questions || []).map(digitizerQToConvItem).filter(Boolean);
        cState.studyNoteMarkdown = doc.studyNoteMarkdown || "";
        cState.rawMarkdown = legacyInput;
      } else {
        cState.questions = parseMarkdown(legacyInput);
      }
    } else {
      const arr = Array.isArray(legacyInput) ? legacyInput : (Array.isArray(legacyInput.questions) ? legacyInput.questions : []);
      const doc = D() ? D().fromLegacyQuestions(arr, { title: legacyInput.title || "", subject: legacyInput.tag || "" }) : null;
      if (doc) {
        cState.docMeta = doc.meta;
        cState.contexts = doc.contexts || {};
        cState.questions = (doc.questions || []).map(digitizerQToConvItem).filter(Boolean);
        cState.rawMarkdown = D().exportToMarkdown(doc);
      } else {
        cState.questions = arr.map(toConvItem).filter(Boolean);
      }
    }
    cState.viewMode = "digitizer";
    renderConverter();
    return true;
  }

  function renderReviewCard(item) {
    const q = item.q, i = item.idx;
    const ansBtns = q.options.map(function (o, k) {
      if (!o) return "";
      const ok = q.correct.indexOf(k) !== -1;
      return '<button type="button" class="btn ' + (ok ? "btn-emerald" : "btn-outline") + ' btn-sm" data-cact="toggle-ans" data-idx="' + i + '" data-opt="' + k + '">' + U().LETTERS.charAt(k) + "</button>";
    }).join(" ");
    return '<div class="review-card' + (q.verified ? " verified" : "") + (q.suspect ? " suspect" : "") + '">' +
      '<div class="review-card-head"><strong>C\u00e2u #' + (i + 1) + (q.suspect ? ' <span class="badge badge-warn">⚠️ C\u1ea7n ki\u1ec3m tra k\u1ef9</span>' : "") + '</strong>' +
      '<div class="deck-actions"><button type="button" class="btn btn-outline btn-sm" title="Lưu nhanh từ vựng vào Vocab Studio" data-cact="quick-vocab" data-idx="' + i + '">📖 +Từ vựng</button>' +
      '<label class="check-row" style="margin:0;font-size:.8rem"><input type="checkbox" data-cact="verify-q" data-idx="' + i + '"' + (q.verified ? " checked" : "") + '> ✓ \u0110\u00e3 duy\u1ec7t (Verified)</label></div></div>' +
      '<div class="rich-text" style="font-weight:700">' + U().renderRich(q.text) + '</div>' +
      '<textarea class="inline-edit-input" rows="2" data-cedit="text" data-idx="' + i + '" aria-label="S\u1eeda n\u1ed9i dung c\u00e2u h\u1ecfi">' + U().esc(q.text) + '</textarea>' +
      q.options.map(function (o, k) {
        if (!o && k >= 4) return "";
        return '<div style="display:flex;align-items:center;gap:6px"><strong style="width:18px">' + U().LETTERS.charAt(k) + '.</strong>' +
          '<input type="text" class="inline-edit-input" data-cedit="opt" data-idx="' + i + '" data-opt="' + k + '" value="' + U().esc(o) + '" placeholder="Ph\u01b0\u01a1ng \u00e1n ' + U().LETTERS.charAt(k) + '"></div>';
      }).join("") +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="muted" style="font-size:.78rem">\u0110\u00e1p \u00e1n \u0111\u00fang:</span>' + ansBtns + '</div>' +
      '<input type="text" class="inline-edit-input" data-cedit="exp" data-idx="' + i + '" value="' + U().esc(q.explanation) + '" placeholder="Gi\u1ea3i th\u00edch \u0111\u00e1p \u00e1n...">' +
      (q.checkNote ? '<div class="muted" style="font-size:.78rem">💡 ' + U().esc(q.checkNote) + "</div>" : "") +
    '</div>';
  }

  function openQuickEditModal(idx) {
    const q = cState.questions[idx];
    if (!q) return;
    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="convEditModal" role="dialog" aria-modal="true"><div class="modal modal-lg">' +
        '<h3>Ch\u1ec9nh s\u1eeda c\u00e2u #' + (idx + 1) + '</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field">N\u1ed9i dung (LaTeX &amp; HTML)<textarea id="ceText" rows="4">' + U().esc(q.text) + '</textarea></label>' +
          '<div class="field"><span>Xem tr\u01b0\u1edbc tr\u1ef1c quan</span><div id="cePrev" class="rich-text" style="padding:10px;border:1px solid var(--border);border-radius:10px;min-height:92px;background:var(--bg2)">' + U().renderRich(q.text) + '</div></div>' +
        '</div>' +
        [0, 1, 2, 3, 4].map(function (k) {
          return '<div style="display:flex;align-items:center;gap:8px;margin:6px 0">' +
            '<input type="checkbox" id="ceC_' + k + '"' + (q.correct.indexOf(k) !== -1 ? " checked" : "") + '>' +
            '<strong>' + U().LETTERS.charAt(k) + '</strong>' +
            '<input type="text" id="ceO_' + k + '" class="inline-edit-input" value="' + U().esc(q.options[k] || "") + '" placeholder="Ph\u01b0\u01a1ng \u00e1n ' + U().LETTERS.charAt(k) + '">' +
          '</div>';
        }).join("") +
        '<label class="field">Gi\u1ea3i th\u00edch<textarea id="ceExp" rows="2">' + U().esc(q.explanation) + '</textarea></label>' +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" id="ceCancel">H\u1ee7y</button><button type="button" class="btn btn-primary" id="ceSave">L\u01b0u</button></div>' +
      '</div></div>';
    U().on("ceText", "input", function (e) { U().setHTML("cePrev", U().renderRich(e.target.value)); });
    U().on("ceCancel", "click", function () { host.innerHTML = ""; });
    U().on("ceSave", "click", function () {
      const txt = U().$("ceText").value.trim();
      if (!txt) { U().showToast("Thi\u1ebfu n\u1ed9i dung c\u00e2u h\u1ecfi.", "warning"); return; }
      const rawOpts = [0, 1, 2, 3, 4].map(function (k) { return U().$("ceO_" + k).value.trim(); });
      const opts = ["", "", "", "", ""];
      const corr = [];
      let ni = 0;
      rawOpts.forEach(function (val, k) {
        if (val) { opts[ni] = val; if (U().$("ceC_" + k).checked) corr.push(ni); ni++; }
      });
      if (ni < 2) { U().showToast("C\u1ea7n \u00edt nh\u1ea5t 2 ph\u01b0\u01a1ng \u00e1n.", "warning"); return; }
      q.text = txt; q.options = opts; q.correct = corr; q.type = corr.length > 1 ? "Checkbox" : "Multiple Choice";
      q.explanation = U().$("ceExp").value.trim(); q.suspect = false; q.verified = true;
      host.innerHTML = "";
      renderConverter();
    });
  }

  function onConverterClick(e) {
    const b = e.target.closest ? e.target.closest("[data-cact]") : null;
    if (!b || b.disabled) return;
    const act = b.getAttribute("data-cact");
    if (act === "go-api") U().showTab("api");
    else if (act === "go-guide") U().showTab("guide");
    else if (act === "dismiss-disclaimer") { cState.disclaimerDismissed = true; renderConverter(); }
    else if (act === "vmode") {
      const m = b.getAttribute("data-val");
      if (m === "split" && !U().requireFeature("splitReview")) return;
      cState.viewMode = m;
      U().navigateTo(m === "split" ? "/converter/review" : "/converter");
    }
    else if (act === "clear-files") clearUnifiedFiles();
    else if (act === "del-file") removeUnifiedFile(Number(b.getAttribute("data-idx")));
    else if (act === "run-smart") runSmartUploadPipeline();
    else if (act === "open-fallback") openManualFallbackModal("");
    else if (act === "stop-ai") { if (cState.abortCtrl) cState.abortCtrl.abort(); }
    else if (act === "view-tpl") showTemplateModal();
    else if (act === "down-tpl") U().downloadTemplate();
    else if (act === "apply-manual-ans") {
      const raw = (U().$("convManualAns") ? U().$("convManualAns").value : "").trim();
      if (!raw || cState.questions.length === 0) { U().showToast("C\u1ea7n c\u00f3 c\u00e2u h\u1ecfi v\u00e0 danh s\u00e1ch \u0111\u00e1p \u00e1n.", "warning"); return; }
      let n = 0, m;
      const re = /(\d+)\s*[.:\-)\s]\s*([A-Ea-e1-5](?:\s*[,;/]\s*[A-Ea-e1-5])*)/g;
      while ((m = re.exec(raw)) !== null) {
        const q = cState.questions[parseInt(m[1], 10) - 1];
        if (!q) continue;
        const maxO = q.options.filter(Boolean).length;
        const corr = Array.from(new Set(m[2].toUpperCase().split(/[,;\/\s]+/).filter(Boolean).map(function (t) {
          return /^[A-E]$/.test(t) ? U().LETTERS.indexOf(t) : Number(t) - 1;
        }))).filter(function (x) { return x >= 0 && x < maxO; }).sort(function (a, b) { return a - b; });
        if (corr.length > 0) { q.correct = corr; q.type = corr.length > 1 ? "Checkbox" : "Multiple Choice"; n++; }
      }
      renderConverter();
      U().showToast(n > 0 ? ("\u0110\u00e3 \u00e1p d\u1ee5ng \u0111\u00e1p \u00e1n cho " + n + " c\u00e2u.") : "Kh\u00f4ng kh\u1edbp \u0111\u1ecbnh d\u1ea1ng \u0111\u00e1p \u00e1n.", n > 0 ? "success" : "warning");
    }
    else if (act === "solve-missing") runBatchSolve(false);
    else if (act === "double-check") runDoubleCheck();
    else if (act === "exp-xlsx") doExport("xlsx", false);
    else if (act === "exp-csv") doExport("csv", false);
    else if (act === "exp-md") doExportMarkdown();
    else if (act === "save-drive") doSaveToLibraryAndDrive();
    else if (act === "retry-chunk") retryFailedChunk(Number(b.getAttribute("data-chunk-idx")));
    else if (act === "ai-explain") explainSingleQuestionOnDemand(Number(b.getAttribute("data-idx")));
    else if (act === "pin-ctx") {
      const cid = b.getAttribute("data-ctx") || "";
      if (cid && cState.contexts[cid]) {
        cState.pinnedContextId = cid;
        renderConverter();
      }
    }
    else if (act === "ans-mcq") {
      const qIdx = Number(b.getAttribute("data-idx"));
      const opt = Number(b.getAttribute("data-opt"));
      if (!cState.userAnswers[qIdx]) cState.userAnswers[qIdx] = {};
      cState.userAnswers[qIdx].mcq = opt;
      const q = cState.questions[qIdx];
      if (q && q.contextId && cState.contexts[q.contextId]) cState.pinnedContextId = q.contextId;
      renderConverter();
    }
    else if (act === "ans-tf") {
      const qIdx = Number(b.getAttribute("data-idx"));
      const tfKey = b.getAttribute("data-tfkey");
      const tfVal = b.getAttribute("data-tfval") === "true";
      if (!cState.userAnswers[qIdx]) cState.userAnswers[qIdx] = {};
      if (!cState.userAnswers[qIdx].tf) cState.userAnswers[qIdx].tf = {};
      cState.userAnswers[qIdx].tf[tfKey] = tfVal;
      renderConverter();
    }
    else if (act === "ans-short-check") {
      const qIdx = Number(b.getAttribute("data-idx"));
      if (!cState.userAnswers[qIdx]) cState.userAnswers[qIdx] = {};
      cState.userAnswers[qIdx].shortChecked = true;
      renderConverter();
    }
    else if (act === "toggle-essay-guide") {
      const qIdx = Number(b.getAttribute("data-idx"));
      if (!cState.userAnswers[qIdx]) cState.userAnswers[qIdx] = {};
      cState.userAnswers[qIdx].showGuide = !cState.userAnswers[qIdx].showGuide;
      renderConverter();
    }
    else if (act === "one-click-import") doOneClickImport();
    else if (act === "send-studio") {
      const v = validateAll();
      if (v.valid === 0) { U().showToast("Ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi h\u1ee3p l\u1ec7 \u0111\u1ec3 m\u1edf trong Creator Studio.", "warning"); return; }
      if (window.UETStudio && typeof window.UETStudio.openFromQuestions === "function") {
        const title = (U().$("convDeckTitle") ? U().$("convDeckTitle").value : "").trim() || ("Quiz " + dateStamp());
        window.UETStudio.openFromQuestions(title, "AI Converter", v.validItems);
      }
    }
    else if (act === "toggle-ans") {
      const q = cState.questions[Number(b.getAttribute("data-idx"))];
      const opt = Number(b.getAttribute("data-opt"));
      if (!q) return;
      if (q.type === "Checkbox") {
        const p = q.correct.indexOf(opt);
        if (p === -1) q.correct.push(opt); else q.correct.splice(p, 1);
        q.correct.sort(function (a, b2) { return a - b2; });
      } else q.correct = q.correct.indexOf(opt) !== -1 ? [] : [opt];
      q.suspect = false;
      renderConverter();
    }
    else if (act === "edit-inline") openQuickEditModal(Number(b.getAttribute("data-idx")));
    else if (act === "quick-vocab") {
      const q = cState.questions[Number(b.getAttribute("data-idx"))];
      if (!q) return;
      const stripTags = function (s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); };
      const sel = (typeof window.getSelection === "function" ? String(window.getSelection() || "").trim() : "");
      const corOpt = (q.correct && q.correct.length > 0 && q.options[q.correct[0]]) ? stripTags(q.options[q.correct[0]]) : "";
      const wordCandidate = sel || corOpt || stripTags(q.text).slice(0, 80);
      const meaningCandidate = stripTags(q.explanation) || (corOpt && wordCandidate !== corOpt ? corOpt : "");
      const contextCandidate = stripTags(q.text);
      if (window.VocabStudioBridge && typeof window.VocabStudioBridge.quickAddWord === "function") {
        window.VocabStudioBridge.quickAddWord(wordCandidate, meaningCandidate, contextCandidate);
      }
    }
    else if (act === "del-q") { cState.questions.splice(Number(b.getAttribute("data-idx")), 1); renderConverter(); }
    else if (act === "verify-all") { cState.questions.forEach(function (q) { q.verified = true; q.suspect = false; }); renderConverter(); U().showToast("\u0110\u00e3 \u0111\u00e1nh d\u1ea5u duy\u1ec7t t\u1ea5t c\u1ea3 c\u00e2u h\u1ecfi.", "success"); }
    else if (act === "clear-all") { U().showConfirm("X\u00f3a b\u1ea3ng", "X\u00f3a to\u00e0n b\u1ed9 c\u00e2u h\u1ecfi trong AI Converter?", function () { cState.questions = []; cState.contexts = {}; cState.pinnedContextId = ""; cState.studyNoteMarkdown = ""; cState.rawMarkdown = ""; cState.chunkStates = []; cState.userAnswers = {}; cState.docMeta = { title: "", subject: "", mode: "EXAM", total_questions: 0, duration_minutes: 45 }; renderConverter(); }); }
    else if (act === "zoom") { cState.imgZoom = U().clamp(cState.imgZoom + Number(b.getAttribute("data-val")), 50, 250); renderConverter(); }
    else if (act === "img-prev") { cState.activeImgIdx = Math.max(0, cState.activeImgIdx - 1); renderConverter(); }
    else if (act === "img-next") { cState.activeImgIdx = Math.min(cState.images.length - 1, cState.activeImgIdx + 1); renderConverter(); }
    else if (act === "pg") { cState.page = Number(b.getAttribute("data-val")); renderConverter(); }
  }

  function onConverterChange(e) {
    const t = e.target;
    if (!t) return;
    if (t.id === "convUnifiedInput") { addUnifiedFiles(t.files); t.value = ""; }
    else if (t.id === "convDirectMdInput") {
      const f = t.files && t.files[0];
      if (f) {
        readFileAsText(f).then(function (txt) { importLocalMarkdown(txt, f.name); }).catch(function () { U().showToast("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file .md.", "error"); });
      }
      t.value = "";
    }
    else if (t.id === "cSubject") cState.subject = t.value;
    else if (t.id === "cAnsFmt") cState.ansFormat = t.value;
    else if (t.id === "cDefTime") cState.defaultTime = Math.max(5, parseInt(t.value, 10) || 30);
    else if (t.id === "cScope") cState.scope = t.value;
    else if (t.id === "cSplit") cState.splitSize = parseInt(t.value, 10) || 0;
    else if (t.id === "cKeepLatex") cState.keepLatex = t.checked;
    else if (t.id === "cKeepHtml") cState.keepHtml = t.checked;
    else if (t.id === "cAutoSolve") cState.autoSolve = t.checked;
    else if (t.id === "cAutoExport") cState.autoExport = t.checked;
    else if (t.id === "cAppend") cState.appendMode = t.checked;
    else if (t.id === "cKeepPref") cState.keepPrefix = t.checked;
    else if (t.id === "convFilter") { cState.filter = t.value; cState.page = 1; renderConverter(); }
    else if (t.getAttribute("data-cact") === "verify-q") {
      const q = cState.questions[Number(t.getAttribute("data-idx"))];
      if (q) { q.verified = t.checked; if (q.verified) q.suspect = false; renderConverter(); }
    }
  }

  function onConverterInput(e) {
    const t = e.target;
    if (!t) return;
    if (t.id === "convSearch") { cState.search = t.value; cState.page = 1; renderConverter(); }
    else if (t.id === "convPasteText") {
      cState.pasteText = t.value;
      const runBtn = U().$("convSmartRunBtn");
      if (runBtn) runBtn.disabled = cState.busy || (cState.files.length === 0 && !cState.pasteText.trim());
    }
    else if (t.hasAttribute("data-ans-short")) {
      const qIdx = Number(t.getAttribute("data-ans-short"));
      if (!cState.userAnswers[qIdx]) cState.userAnswers[qIdx] = {};
      cState.userAnswers[qIdx].short = t.value;
      cState.userAnswers[qIdx].shortChecked = false;
    }
    else if (t.hasAttribute("data-ans-essay")) {
      const qIdx = Number(t.getAttribute("data-ans-essay"));
      if (!cState.userAnswers[qIdx]) cState.userAnswers[qIdx] = {};
      cState.userAnswers[qIdx].essay = t.value;
    }
    else if (t.hasAttribute("data-cedit")) {
      const q = cState.questions[Number(t.getAttribute("data-idx"))];
      if (!q) return;
      const kind = t.getAttribute("data-cedit");
      if (kind === "text") q.text = t.value;
      else if (kind === "opt") q.options[Number(t.getAttribute("data-opt"))] = t.value;
      else if (kind === "exp") q.explanation = t.value;
    }
  }

  function applySubRoute(sub) {
    if (sub === "split") {
      if (U().can("splitReview")) cState.viewMode = "split";
    } else if (sub === "upload" || sub === "img" || sub === "md" || sub === "xlsx") {
      if (cState.viewMode === "split") cState.viewMode = "table";
    }
  }

  function resetAdminVerifyCache() {
    cState.adminVerifyToken = "";
    cState.adminVerifyState = "idle";
    cState.adminSysKeys = [];
    cState.adminSysEnvKeys = [];
    cState.adminSysPreview = null;
    cState.adminSysRawDraft = "";
    cState.adminSysError = "";
  }

  window.UETConverter = {
    CONVERTER_MASTER_PROMPT: CONVERTER_MASTER_PROMPT,
    renderConverter: renderConverter,
    renderApiPage: renderApiPage,
    renderApiGuide: renderApiGuide,
    hasPersonalKeys: hasPersonalKeys,
    openTypedDeleteAllModal: openTypedDeleteAllModal,
    openManualFallbackModal: openManualFallbackModal,
    importLocalMarkdown: importLocalMarkdown,
    resetAdminVerifyCache: resetAdminVerifyCache,
    applySubRoute: applySubRoute,
    loadLegacyExam: loadLegacyExam,
    exportMarkdown: doExportMarkdown,
    getValidQuestions: function () { return validateAll().validItems; }
  };
})();
