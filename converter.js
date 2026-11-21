/* ============================================================
   AI Tutor – AI Converter, Split-Screen Review & API Settings (converter.js)
   ============================================================ */
(function () {
  "use strict";

  const SAMPLE_ROWS = [
    ["T\u00ednh gi\u1edbi h\u1ea1n $L = \\lim_{x \\to 0} \\frac{\\sin 3x}{x}$:", "Multiple Choice", "1", "3", "$\\frac{1}{3}$", "0", "", "2", 30, "", "\u00c1p d\u1ee5ng $\\lim_{u \\to 0} \\frac{\\sin u}{u} = 1$, ta c\u00f3 $L = 3$."],
    ["Choose the word whose underlined part differs from the other three in pronunciation:", "Multiple Choice", "biom<u>a</u>ss", "a<u>c</u>tivity", "effi<u>c</u>ient", "<u>a</u>lthough", "", "1", 30, "", "Ph\u1ea7n g\u1ea1ch ch\u00e2n \u1edf <b>biomass</b> ph\u00e1t \u00e2m kh\u00e1c c\u00e1c ph\u01b0\u01a1ng \u00e1n c\u00f2n l\u1ea1i."],
    ["Nh\u1eefng s\u1ed1 n\u00e0o sau \u0111\u00e2y l\u00e0 s\u1ed1 nguy\u00ean t\u1ed1? (Ch\u1ecdn t\u1ea5t c\u1ea3 \u0111\u00e1p \u00e1n \u0111\u00fang)", "Checkbox", "2", "4", "5", "9", "", "1,3", 45, "", "2 v\u00e0 5 l\u00e0 s\u1ed1 nguy\u00ean t\u1ed1."]
  ];

  const cState = {
    viewMode: "table",      // table | split
    files: [],              // unified queue: { id, file, name, size, kind, ext, url, width, height }
    images: [],             // image items synced from files (used by Split-Screen Review)
    activeImgIdx: 0,
    imgZoom: 100,
    pasteText: "",          // optional quick-paste text/markdown
    questions: [],          // { id, text, type, options[5], correct[], time, image, explanation, verified, suspect, checkNote }
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
    autoSolve: true,
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
    apiStatusMsg: "Ch\u01b0a c\u1ea5u h\u00ecnh",
    mounted: false,
    apiMounted: false
  };

  function U() { return window.UET; }
  function getAssignedApi() {
    return (U() && typeof U().getAssignedApiForUser === "function") ? U().getAssignedApiForUser() : null;
  }
  function getPersonalApiKey() {
    try { return (localStorage.getItem(U().KEYS.apiKey) || "").trim(); } catch (e) { return ""; }
  }
  function getApiKey() {
    const personal = getPersonalApiKey();
    if (personal) return personal;
    const assigned = getAssignedApi();
    return (assigned && assigned.apiKey) ? String(assigned.apiKey).trim() : "";
  }
  function setApiKey(v) {
    try { if (v) localStorage.setItem(U().KEYS.apiKey, v.trim()); else localStorage.removeItem(U().KEYS.apiKey); } catch (e) { /* */ }
    U().updateChrome();
  }
  function getApiModel() {
    try {
      const saved = localStorage.getItem(U().KEYS.apiModel);
      if (saved) return saved;
    } catch (e) { /* */ }
    const assigned = getAssignedApi();
    return (assigned && assigned.model) ? assigned.model : "gemini-2.5-flash";
  }
  function setApiModel(m) { try { localStorage.setItem(U().KEYS.apiModel, m); } catch (e) { /* */ } }

  function dateStamp() {
    const d = new Date();
    return String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear();
  }

  function requireApiKey() {
    const k = getApiKey();
    if (k) return k;
    U().showToast("Ch\u01b0a c\u00f3 Gemini API Key! H\u00e3y c\u00e0i \u0111\u1eb7t API Key tr\u01b0\u1edbc khi ch\u1ea1y AI.", "warning", {
      label: "\u0110i t\u1edbi C\u00e0i \u0111\u1eb7t API",
      onClick: function () { U().showTab("api"); }
    });
    return null;
  }

  /* ======================== API & LANGUAGE SETTINGS PAGE ======================== */
  function renderApiPage() {
    const root = U().$("apiSettingsRoot");
    if (!root) return;
    const personalKey = getPersonalApiKey();
    const assigned = getAssignedApi();
    const key = getApiKey();
    const model = getApiModel();
    const curLang = (U() && typeof U().getLang === "function") ? U().getLang() : "vi";
    if (!personalKey && assigned && assigned.apiKey) {
      cState.apiStatus = "ok";
      cState.apiStatusMsg = "✅ \u0110\u00e3 g\u00e1n b\u1edfi Admin";
    } else if (key && cState.apiStatus === "none") {
      cState.apiStatus = "saved";
      cState.apiStatusMsg = "\u0110\u00e3 l\u01b0u Key";
    } else if (!key) {
      cState.apiStatus = "none";
      cState.apiStatusMsg = "Ch\u01b0a c\u1ea5u h\u00ecnh";
    }
    const badgeCls = cState.apiStatus === "ok" ? "badge-ok" : (cState.apiStatus === "error" ? "badge-bad" : (cState.apiStatus === "saved" ? "" : "badge-warn"));
    const isPro = model.indexOf("pro") !== -1;
    const userEmail = (U().state && U().state.user && U().state.user.email) ? U().state.user.email : "";

    root.innerHTML =
      '<div class="api-wrap">' +
        '<section class="panel">' +
          '<div class="panel-head"><div><h2>C\u00e0i \u0111\u1eb7t Google Gemini API</h2><p class="muted" style="margin:0;font-size:.84rem">H\u1ed7 tr\u1ee3 c\u1ea3 API t\u1eeb t\u00e0i kho\u1ea3n Google AI Pro / Ultra / Paid, API Free v\u00e0 API \u0111\u01b0\u1ee3c Qu\u1ea3n tr\u1ecb vi\u00ean g\u00e1n theo Email.</p></div>' +
          '<span class="badge ' + badgeCls + '" id="apiPageBadge">' + U().esc(cState.apiStatusMsg) + '</span></div>' +

          (assigned && assigned.apiKey
            ? '<div class="checkout-notice" style="margin-bottom:14px;border-color:var(--emerald);background:var(--emerald-soft)">' +
                '🔑 <strong>\u0110\u00e3 \u0111\u01b0\u1ee3c Qu\u1ea3n tr\u1ecb vi\u00ean g\u00e1n h\u1ed9 Gemini API:</strong> T\u00e0i kho\u1ea3n <strong>' + U().esc(userEmail || assigned.email) + '</strong> \u0111\u00e3 \u0111\u01b0\u1ee3c g\u00e1n s\u1eb5n API Key (Model m\u1eb7c \u0111\u1ecbnh: <code>' + U().esc(assigned.model || "gemini-2.5-flash") + '</code>). B\u1ea1n c\u00f3 th\u1ec3 d\u00f9ng ngay <strong>AI Converter</strong> m\u00e0 kh\u00f4ng c\u1ea7n t\u1ef1 nh\u1eadp Key c\u00e1 nh\u00e2n.' +
              '</div>'
            : '') +

          '<label class="field">Gemini API Key c\u00e1 nh\u00e2n (t\u00f9y ch\u1ecdn ghi \u0111\u00e8)' +
            '<div class="key-input-wrap">' +
              '<input type="password" id="uetApiKeyInput" autocomplete="off" spellcheck="false" value="' + U().esc(personalKey) + '" placeholder="' + (assigned && assigned.apiKey ? "\u0110ang d\u00f9ng API Key do Qu\u1ea3n tr\u1ecb vi\u00ean g\u00e1n cho " + U().esc(userEmail) + " (ho\u1eb7c d\u00e1n Key ri\u00eang \u0111\u1ec3 ghi \u0111\u00e8)" : "D\u00e1n chu\u1ed7i kh\u00f3a b\u1eaft \u0111\u1ea7u b\u1eb1ng AIza...") + '">' +
              '<button type="button" class="eye-btn" id="uetApiEyeBtn" title="Hi\u1ec7n / \u1ea8n API Key" aria-label="Hi\u1ec7n ho\u1eb7c \u1ea9n API Key">👁️</button>' +
            '</div>' +
          '</label>' +
          '<p class="muted" style="font-size:.78rem;margin:0 0 12px">Sau khi d\u00e1n ho\u1eb7c b\u1ea5m L\u01b0u Key, \u00f4 nh\u1eadp t\u1ef1 \u0111\u1ed9ng \u1ea9n d\u01b0\u1edbi d\u1ea1ng m\u1eadt kh\u1ea9u (••••••••). B\u1ea5m bi\u1ec3u t\u01b0\u1ee3ng con m\u1eaft \u0111\u1ec3 xem l\u1ea1i b\u1ea5t c\u1ee9 l\u00fac n\u00e0o.</p>' +

          '<div class="deck-actions" style="margin-bottom:16px">' +
            '<button type="button" class="btn btn-primary" id="uetApiSaveBtn">L\u01b0u Key</button>' +
            '<button type="button" class="btn btn-emerald" id="uetApiTestBtn">Ki\u1ec3m tra k\u1ebft n\u1ed1i (Test API)</button>' +
            '<button type="button" class="btn btn-outline" id="uetApiDelBtn">X\u00f3a Key c\u00e1 nh\u00e2n</button>' +
          '</div>' +

          '<label class="field">Ch\u1ecdn Model Gemini AI' +
            '<select id="uetApiModelSelect">' +
              '<option value="gemini-2.5-pro"' + (model === "gemini-2.5-pro" ? " selected" : "") + '>Gemini 2.5 Pro – Ch\u1ebf \u0111\u1ed9 Ch\u00ednh x\u00e1c cao (Khuy\u00ean d\u00f9ng cho Google AI Pro / Ultra / Paid)</option>' +
              '<option value="gemini-2.5-flash"' + (model === "gemini-2.5-flash" ? " selected" : "") + '>Gemini 2.5 Flash – Ch\u1ebf \u0111\u1ed9 Nhanh / Ti\u1ebft ki\u1ec7m (API Free)</option>' +
              '<option value="gemini-3-flash-preview"' + (model === "gemini-3-flash-preview" ? " selected" : "") + '>Gemini 3 Flash Preview – T\u1ed1c \u0111\u1ed9 cao (API Free / Preview)</option>' +
            '</select>' +
          '</label>' +
          '<div class="' + (isPro ? "checkout-notice" : "pending-banner") + '" style="margin:8px 0 16px;font-weight:500;font-size:.82rem">' +
            (isPro
              ? "💎 <strong>Ch\u1ebf \u0111\u1ed9 Ch\u00ednh x\u00e1c cao (Gemini 2.5 Pro):</strong> T\u1ed1i \u01b0u t\u1ed1i \u0111a cho c\u00f4ng th\u1ee9c To\u00e1n/L\u00fd/H\u00f3a ph\u1ee9c t\u1ea1p v\u00e0 t\u1ef1 \u0111\u1ed9ng gi\u1ea3i \u0111\u1ec1 chu\u1ea9n x\u00e1c."
              : "⚠️ <strong>L\u01b0u \u00fd khi d\u00f9ng API Free / Flash:</strong> T\u1ed1c \u0111\u1ed9 nhanh & mi\u1ec5n ph\u00ed, nh\u01b0ng b\u1ea1n n\u00ean m\u1edf <strong>Ch\u1ebf \u0111\u1ed9 Ki\u1ec3m duy\u1ec7t song song (Split-Screen Review)</strong> ho\u1eb7c ch\u1ea1y <strong>AI Double-Check</strong> sau khi \u0111\u1ecdc \u0111\u1ec1 \u0111\u1ec3 \u0111\u1ea3m b\u1ea3o \u0111\u00e1p \u00e1n chu\u1ea9n 100%.") +
          '</div>' +

          '<div style="padding-top:14px;border-top:1px solid var(--border)">' +
            '<div class="panel-head" style="margin-bottom:8px"><div><h3 style="margin:0;font-size:1rem">🌐 Ng\u00f4n ng\u1eef giao di\u1ec7n (Language / 表示言語)</h3><p class="muted" style="margin:2px 0 0;font-size:.8rem">Chuy\u1ec3n \u0111\u1ed5i t\u1ee9c th\u00ec gi\u1eefa Ti\u1ebfng Vi\u1ec7t, Ti\u1ebfng Anh v\u00e0 Ti\u1ebfng Nh\u1eadt (gi\u1eef nguy\u00ean ph\u00f4ng ch\u1eef h\u1ec7 th\u1ed1ng).</p></div></div>' +
            '<div class="seg" role="group" aria-label="Ch\u1ecdn ng\u00f4n ng\u1eef">' +
              '<button type="button" class="seg-btn' + (curLang === "vi" ? " active" : "") + '" data-lang-set="vi">VI</button>' +
              '<button type="button" class="seg-btn' + (curLang === "en" ? " active" : "") + '" data-lang-set="en">EN</button>' +
              '<button type="button" class="seg-btn' + (curLang === "ja" ? " active" : "") + '" data-lang-set="ja">JA</button>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="panel">' +
          '<div class="panel-head"><h2>H\u01b0\u1edbng d\u1eabn l\u1ea5y Gemini API Key</h2>' +
            '<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">M\u1edf Google AI Studio ↗</a>' +
          '</div>' +
          '<ol class="guide-steps">' +
            '<li><span class="step-num">1</span><span>Truy c\u1eadp <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"><strong>https://aistudio.google.com/app/apikey</strong></a> b\u1eb1ng n\u00fat m\u1edf tab m\u1edbi \u1edf tr\u00ean.</span></li>' +
            '<li><span class="step-num">2</span><span>\u0110\u0103ng nh\u1eadp b\u1eb1ng t\u00e0i kho\u1ea3n Google c\u1ee7a b\u1ea1n (t\u00e0i kho\u1ea3n th\u01b0\u1eddng, Google AI Pro ho\u1eb7c Ultra).</span></li>' +
            '<li><span class="step-num">3</span><span>Nh\u1ea5n n\u00fat <strong>Create API Key (T\u1ea1o kh\u00f3a API)</strong> v\u00e0 ch\u1ecdn ho\u1eb7c t\u1ea1o m\u1ed9t d\u1ef1 \u00e1n Google Cloud.</span></li>' +
            '<li><span class="step-num">4</span><span>Sao ch\u00e9p chu\u1ed7i kh\u00f3a b\u1eaft \u0111\u1ea7u b\u1eb1ng <code>AIza...</code>, d\u00e1n v\u00e0o \u00f4 ph\u00eda tr\u00ean r\u1ed3i b\u1ea5m <strong>L\u01b0u Key</strong> v\u00e0 <strong>Ki\u1ec3m tra k\u1ebft n\u1ed1i</strong>.</span></li>' +
          '</ol>' +
          '<p class="muted" style="font-size:.8rem;margin:12px 0 0">🔒 <strong>B\u1ea3o m\u1eadt:</strong> API Key ch\u1ec9 l\u01b0u c\u1ee5c b\u1ed9 ho\u1eb7c \u0111\u01b0\u1ee3c Qu\u1ea3n tr\u1ecb vi\u00ean g\u00e1n theo Email \u0111\u0103ng nh\u1eadp v\u00e0 ch\u1ec9 g\u1eedi tr\u1ef1c ti\u1ebfp t\u1edbi m\u00e1y ch\u1ee7 ch\u00ednh th\u1ee9c c\u1ee7a Google Gemini API.</p>' +
        '</section>' +
      '</div>';

    if (!cState.apiMounted) {
      cState.apiMounted = true;
      root.addEventListener("click", onApiPageClick);
      root.addEventListener("change", onApiPageChange);
      root.addEventListener("paste", onApiPagePaste);
    }
    if (typeof U().applyI18n === "function") U().applyI18n(root);
  }

  function maskKeyEl() {
    const inp = U().$("uetApiKeyInput"), eye = U().$("uetApiEyeBtn");
    if (inp) inp.type = "password";
    if (eye) eye.textContent = "👁️";
  }

  async function testGeminiConnection() {
    const inp = U().$("uetApiKeyInput");
    const typed = (inp ? inp.value : "").trim();
    if (typed) setApiKey(typed);
    const raw = typed || getApiKey();
    if (!raw) { U().showToast("Vui l\u00f2ng nh\u1eadp Gemini API Key tr\u01b0\u1edbc.", "warning"); return; }
    maskKeyEl();
    const btn = U().$("uetApiTestBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>\u0110ang ki\u1ec3m tra...'; }
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(raw));
      if (!res.ok) {
        const err = await res.json().catch(function () { return {}; });
        throw new Error((err && err.error && err.error.message) || ("HTTP " + res.status));
      }
      cState.apiStatus = "ok";
      cState.apiStatusMsg = "✅ K\u1ebft n\u1ed1i th\u00e0nh c\u00f4ng";
      U().showToast("K\u1ebft n\u1ed1i Gemini API th\u00e0nh c\u00f4ng!", "success");
    } catch (e) {
      cState.apiStatus = "error";
      cState.apiStatusMsg = "❌ Key kh\u00f4ng h\u1ee3p l\u1ec7";
      U().showToast("Ki\u1ec3m tra th\u1ea5t b\u1ea1i: " + (e.message || "Kh\u00f4ng k\u1ebft n\u1ed1i \u0111\u01b0\u1ee3c"), "error");
    }
    renderApiPage();
  }

  function onApiPageClick(e) {
    const langBtn = e.target.closest ? e.target.closest("[data-lang-set]") : null;
    if (langBtn && typeof U().setLang === "function") {
      U().setLang(langBtn.getAttribute("data-lang-set"));
      return;
    }
    const t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.id === "uetApiEyeBtn") {
      const inp = U().$("uetApiKeyInput");
      if (!inp) return;
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      t.textContent = show ? "🙈" : "👁️";
    } else if (t.id === "uetApiSaveBtn") {
      const inp = U().$("uetApiKeyInput");
      const val = (inp ? inp.value : "").trim();
      if (!val) { U().showToast("Vui l\u00f2ng d\u00e1n chu\u1ed7i Gemini API Key.", "warning"); return; }
      setApiKey(val);
      maskKeyEl();
      cState.apiStatus = "saved";
      cState.apiStatusMsg = "\u0110\u00e3 l\u01b0u Key";
      U().showToast("\u0110\u00e3 l\u01b0u API Key c\u1ee5c b\u1ed9 tr\u00ean tr\u00ecnh duy\u1ec7t.", "success");
      renderApiPage();
    } else if (t.id === "uetApiTestBtn") {
      testGeminiConnection();
    } else if (t.id === "uetApiDelBtn") {
      U().showConfirm("X\u00f3a API Key", "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a Gemini API Key c\u00e1 nh\u00e2n \u0111\u00e3 l\u01b0u?", function () {
        setApiKey("");
        cState.apiStatus = "none";
        cState.apiStatusMsg = "Ch\u01b0a c\u1ea5u h\u00ecnh";
        U().showToast("\u0110\u00e3 x\u00f3a API Key c\u00e1 nh\u00e2n.", "info");
        renderApiPage();
      });
    }
  }
  function onApiPageChange(e) {
    if (e.target && e.target.id === "uetApiModelSelect") {
      const m = e.target.value;
      if (m.indexOf("pro") !== -1 && !U().can("proAi")) {
        U().showToast("Model Gemini Pro \u0111\u01b0\u1ee3c \u01b0u ti\u00ean cho g\u00f3i Diamond VIP (b\u1ea1n v\u1eabn c\u00f3 th\u1ec3 d\u00f9ng n\u1ebfu c\u00f3 API Key c\u00e1 nh\u00e2n).", "info");
      }
      setApiModel(m);
      renderApiPage();
    }
  }
  function onApiPagePaste(e) {
    if (e.target && e.target.id === "uetApiKeyInput") {
      setTimeout(function () {
        const val = (e.target.value || "").trim();
        if (val) {
          setApiKey(val);
          maskKeyEl();
          cState.apiStatus = "saved";
          cState.apiStatusMsg = "\u0110\u00e3 l\u01b0u Key";
          U().showToast("\u0110\u00e3 d\u00e1n & t\u1ef1 \u0111\u1ed9ng \u1ea9n API Key.", "info");
          renderApiPage();
        }
      }, 40);
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
    const pages = [];
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
      if (lines.length) pages.push(lines.join("\n"));
    }
    const text = pages.join("\n\n").trim();
    return { text: text, pageCount: pdf.numPages, isScanned: text.replace(/\s+/g, "").length < 40 };
  }

  function prepareImageBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file \u1ea3nh.")); };
      reader.onload = function (ev) {
        const img = new Image();
        img.onerror = function () { reject(new Error("File \u1ea3nh kh\u00f4ng h\u1ee3p l\u1ec7.")); };
        img.onload = function () {
          const MAX = 2560;
          const w = img.naturalWidth, h = img.naturalHeight;
          const keepOrig = w <= MAX && h <= MAX && ["image/jpeg", "image/png", "image/webp"].indexOf(file.type) !== -1;
          if (keepOrig) {
            return resolve({ mimeType: file.type, data: String(ev.target.result || "").split(",")[1] || "" });
          }
          const scale = Math.min(1, MAX / Math.max(w, h));
          const cw = Math.round(w * scale), ch = Math.round(h * scale);
          const cv = document.createElement("canvas");
          cv.width = cw; cv.height = ch;
          const ctx = cv.getContext("2d");
          ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          resolve({ mimeType: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.94).split(",")[1] || "" });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function callGemini(apiKey, model, payload, signal) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey);
    let delay = 1500;
    const TIMEOUT_MS = 90000;
    for (let attempt = 0; attempt < 4; attempt++) {
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: reqCtrl ? reqCtrl.signal : signal
        });
      } catch (fetchErr) {
        if (timer) clearTimeout(timer);
        if (signal && typeof signal.removeEventListener === "function") signal.removeEventListener("abort", onParentAbort);
        if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
        if (timedOut) {
          if (attempt < 2) continue;
          throw new Error("Y\u00eau c\u1ea7u t\u1edbi Gemini AI qu\u00e1 th\u1eddi gian ch\u1edd (Timeout 90s). Vui l\u00f2ng th\u1eed l\u1ea1i.");
        }
        throw fetchErr;
      }
      if (timer) clearTimeout(timer);
      if (signal && typeof signal.removeEventListener === "function") signal.removeEventListener("abort", onParentAbort);
      if (res.ok) {
        const data = await res.json();
        const txt = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (!txt) throw new Error("Gemini kh\u00f4ng tr\u1ea3 v\u1ec1 JSON.");
        return JSON.parse(txt);
      }
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await new Promise(function (r) { setTimeout(r, delay); });
        delay *= 2;
        continue;
      }
      const err = await res.json().catch(function () { return {}; });
      throw new Error((err && err.error && err.error.message) || ("HTTP " + res.status));
    }
    throw new Error("V\u01b0\u1ee3t qu\u00e1 s\u1ed1 l\u1ea7n th\u1eed l\u1ea1i API.");
  }

  function ocrPrompt(subject, keepPrefix) {
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
            explanation: { type: "STRING" }
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
    return {
      id: "cq_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      text: text, type: type, options: options, correct: correct,
      time: parseInt(raw && raw.time, 10) > 0 ? parseInt(raw.time, 10) : cState.defaultTime,
      image: String((raw && raw.image) || "").trim(),
      explanation: String((raw && raw.explanation) || "").trim(),
      verified: false, suspect: false, checkNote: ""
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
    const BATCH = 15;
    const schema = {
      type: "OBJECT",
      properties: {
        solutions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: { index: { type: "INTEGER" }, correct: { type: "ARRAY", items: { type: "INTEGER" } }, explanation: { type: "STRING" } },
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
        systemInstruction: { parts: [{ text: "B\u1ea1n l\u00e0 gi\u1ea3ng vi\u00ean xu\u1ea5t s\u1eafc. Gi\u1ea3i ch\u00ednh x\u00e1c t\u1eebng c\u00e2u h\u1ecfi, tr\u1ea3 v\u1ec1 ch\u1ec9 s\u1ed1 1-based trong correct v\u00e0 gi\u1ea3i th\u00edch ng\u1eafn g\u1ecdn ti\u1ebfng Vi\u1ec7t (d\u00f9ng LaTeX $...$ cho To\u00e1n/L\u00fd/H\u00f3a)." }] },
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
    const BATCH = 12;
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
        contents: [{ role: "user", parts: [{ text: "\u0110\u1ecdc \u0111o\u1ea1n \u0111\u1ec1 thi sau, chu\u1ea9n h\u00f3a to\u00e0n b\u1ed9 c\u00e2u h\u1ecfi tr\u1eafc nghi\u1ec7m v\u00e0 gi\u1ea3i ch\u00ednh x\u00e1c m\u1ecdi c\u00e2u h\u1ecfi (k\u00e8m gi\u1ea3i th\u00edch ng\u1eafn g\u1ecdn):\n\n" + chunks[i] }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: QUESTION_LIST_SCHEMA }
      }, signal);
      const qs = Array.isArray(res && res.questions) ? res.questions.map(toConvItem).filter(Boolean) : [];
      out.push.apply(out, qs);
      cState.progressPct = Math.round(p0 + (((i + 1) / chunks.length) * (p1 - p0)));
    }
    return out;
  }

  /* ======================== UNIFIED SMART PROCESSING PIPELINE ======================== */
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
    const collected = [];
    const summaries = [];
    let aiSolvedList = [];
    let stopped = false;

    try {
      setPipelineSteps("active", "pending", "pending");
      cState.progressLabel = "\u0110ang tr\u00edch xu\u1ea5t n\u1ed9i dung...";
      cState.progressPct = 5;
      renderConverter();

      // ---------- CASE C: EXCEL (.xlsx/.xls/.csv) ----------
      for (let ei = 0; ei < excelItems.length; ei++) {
        if (signal.aborted) { stopped = true; break; }
        try {
          const exQs = await parseExcelFileAsync(excelItems[ei].file);
          if (exQs.length > 0) {
            collected.push.apply(collected, exQs);
            summaries.push("Excel (" + excelItems[ei].name + "): " + exQs.length + " c\u00e2u");
          } else {
            U().showToast("T\u1ec7p Excel \"" + excelItems[ei].name + "\" kh\u00f4ng c\u00f3 c\u00e2u h\u1ecfi h\u1ee3p l\u1ec7.", "warning");
          }
        } catch (exErr) {
          U().showToast("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc t\u1ec7p Excel \"" + excelItems[ei].name + "\": " + (exErr.message || "T\u1ec7p l\u1ed7i"), "error");
        }
      }

      // ---------- CASE A: IMAGES (.png/.jpg/.jpeg/.webp/...) -> AI VISION / OCR ----------
      if (!stopped && imageItems.length > 0) {
        const apiKey = requireApiKey();
        if (!apiKey) {
          cState.busy = false; cState.progressLabel = ""; cState.steps = []; renderConverter();
          return;
        }
        setPipelineSteps("active", "pending", "pending", "AI Vision & ki\u1ec3m tra ch\u00e9o...");
        const imgExtracted = [];
        for (let i = 0; i < imageItems.length; i++) {
          if (signal.aborted) { stopped = true; break; }
          const im = imageItems[i];
          cState.progressLabel = "AI Vision \u0111ang \u0111\u1ecdc \u1ea3nh " + (i + 1) + "/" + imageItems.length + ": " + im.name;
          cState.progressPct = Math.round(10 + (i / imageItems.length) * 45);
          renderConverter();
          try {
            const b64 = await prepareImageBase64(im.file);
            const res = await callGemini(apiKey, model, {
              systemInstruction: { parts: [{ text: ocrPrompt(cState.subject, cState.keepPrefix) }] },
              contents: [{ role: "user", parts: [{ text: "Tr\u00edch xu\u1ea5t to\u00e0n b\u1ed9 c\u00e2u h\u1ecfi tr\u1eafc nghi\u1ec7m t\u1eeb \u1ea3nh n\u00e0y, s\u1eeda l\u1ed7i \u0111\u1ecbnh d\u1ea1ng v\u00e0 gi\u1ea3i nh\u1eefng c\u00e2u ch\u01b0a c\u00f3 \u0111\u00e1p \u00e1n." }, { inlineData: { mimeType: b64.mimeType, data: b64.data } }] }],
              generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: QUESTION_LIST_SCHEMA }
            }, signal);
            const qs = Array.isArray(res && res.questions) ? res.questions.map(toConvItem).filter(Boolean) : [];
            imgExtracted.push.apply(imgExtracted, qs);
          } catch (imErr) {
            if (imErr && imErr.name === "AbortError") throw imErr;
            U().showToast("L\u1ed7i \u0111\u1ecdc \u1ea3nh \"" + im.name + "\": " + (imErr.message || "T\u1ec7p \u1ea3nh h\u1ecfng"), "error");
          }
        }
        if (imgExtracted.length > 0) {
          collected.push.apply(collected, imgExtracted);
          aiSolvedList.push.apply(aiSolvedList, imgExtracted);
          summaries.push("\u1ea2nh AI Vision: " + imgExtracted.length + " c\u00e2u");
        }
      }

      // ---------- CASE B: DOCUMENTS (.md, .txt, .pdf, .doc, .docx) + OPTIONAL PASTED TEXT ----------
      const docSources = [];
      for (let di = 0; di < docItems.length; di++) {
        if (signal.aborted) { stopped = true; break; }
        const item = docItems[di];
        cState.progressLabel = "\u0110ang tr\u00edch xu\u1ea5t n\u1ed9i dung t\u1eeb " + item.name + "...";
        cState.progressPct = Math.round(15 + (di / Math.max(1, docItems.length)) * 20);
        renderConverter();

        try {
          if (item.kind === "text") {
            docSources.push({ name: item.name, text: await readFileAsText(item.file), scannedPdfFile: null });
          } else if (item.kind === "docx") {
            docSources.push({ name: item.name, text: await extractDocxText(item.file), scannedPdfFile: null });
          } else if (item.kind === "doc") {
            docSources.push({ name: item.name, text: await extractLegacyDocText(item.file), scannedPdfFile: null });
          } else if (item.kind === "pdf") {
            const pdfRes = await extractPdfText(item.file);
            if (pdfRes.isScanned) {
              docSources.push({ name: item.name, text: "", scannedPdfFile: item.file });
            } else {
              docSources.push({ name: item.name, text: pdfRes.text, scannedPdfFile: null });
            }
          }
        } catch (docErr) {
          U().showToast("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc t\u1ec7p \"" + item.name + "\": " + (docErr.message || "T\u1ec7p b\u1ecb h\u1ecfng ho\u1eb7c kh\u00f4ng h\u1ee3p l\u1ec7"), "error");
        }
      }
      if (!stopped && pasted) {
        docSources.push({ name: "V\u0103n b\u1ea3n \u0111\u00e3 d\u00e1n", text: pasted, scannedPdfFile: null });
      }

      // Step 2: Check Answer Keys & Route Step 2A vs Step 2B
      if (!stopped && docSources.length > 0) {
        setPipelineSteps("done", "active", "pending");
        cState.progressLabel = "\u0110ang ki\u1ec3m tra c\u1ea5u tr\u00fac c\u00e2u h\u1ecfi & \u0111\u00e1p \u00e1n...";
        cState.progressPct = 45;
        renderConverter();

        for (let si = 0; si < docSources.length; si++) {
          if (signal.aborted) { stopped = true; break; }
          const src = docSources[si];

          // Scanned PDF -> route to Gemini PDF Vision directly
          if (src.scannedPdfFile) {
            const apiKey = requireApiKey();
            if (!apiKey) {
              U().showToast("T\u1ec7p PDF \"" + src.name + "\" l\u00e0 b\u1ea3n scan h\u00ecnh \u1ea3nh n\u00ean c\u1ea7n Gemini API Key \u0111\u1ec3 \u0111\u1ecdc.", "warning");
              continue;
            }
            setPipelineSteps("done", "done", "active", "PDF scan → AI Vision \u0111ang \u0111\u1ecdc & gi\u1ea3i...");
            cState.progressLabel = "PDF d\u1ea1ng \u1ea3nh scan — AI \u0111ang \u0111\u1ecdc " + src.name + "...";
            cState.progressPct = 55;
            renderConverter();
            const pdfB64 = await readFileAsBase64(src.scannedPdfFile);
            const res = await callGemini(apiKey, model, {
              systemInstruction: { parts: [{ text: ocrPrompt(cState.subject, cState.keepPrefix) }] },
              contents: [{ role: "user", parts: [{ text: "Tr\u00edch xu\u1ea5t to\u00e0n b\u1ed9 c\u00e2u h\u1ecfi tr\u1eafc nghi\u1ec7m t\u1eeb t\u1ec7p PDF n\u00e0y, gi\u1ea3i c\u00e1c c\u00e2u thi\u1ebfu \u0111\u00e1p \u00e1n v\u00e0 tr\u1ea3 v\u1ec1 JSON chu\u1ea9n." }, { inlineData: { mimeType: "application/pdf", data: pdfB64 } }] }],
              generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: QUESTION_LIST_SCHEMA }
            }, signal);
            const qs = Array.isArray(res && res.questions) ? res.questions.map(toConvItem).filter(Boolean) : [];
            if (qs.length > 0) {
              collected.push.apply(collected, qs);
              aiSolvedList.push.apply(aiSolvedList, qs);
              summaries.push(src.name + " (PDF scan → AI): " + qs.length + " c\u00e2u");
            }
            continue;
          }

          const cleanText = String(src.text || "").trim();
          if (!cleanText) {
            U().showToast("T\u1ec7p \"" + src.name + "\" tr\u1ed1ng ho\u1eb7c kh\u00f4ng c\u00f3 n\u1ed9i dung v\u0103n b\u1ea3n.", "warning");
            continue;
          }

          const parsed = parseMarkdown(cleanText);
          const headerMatches = (cleanText.match(/(?:^|\n)\s*(?:\*\*|__)?(?:C\u00e2u|Question|B\u00e0i)\s*\d+\b/gi) || []).length;
          const isPartiallyBroken = headerMatches >= 4 && parsed.length < Math.ceil(headerMatches * 0.5);
          const missingCount = parsed.filter(function (q) { return q.correct.length === 0; }).length;

          if (!isPartiallyBroken && parsed.length > 0 && missingCount === 0) {
            // STEP 2A: Valid Answer Keys Present -> Direct conversion, ZERO redundant AI calls!
            collected.push.apply(collected, parsed);
            summaries.push(src.name + ": " + parsed.length + " c\u00e2u (\u0111\u1ee7 \u0111\u00e1p \u00e1n – chuy\u1ec3n \u0111\u1ed5i tr\u1ef1c ti\u1ebfp)");
          } else if (!isPartiallyBroken && parsed.length > 0 && missingCount > 0) {
            // STEP 2B-1: Structured questions parsed, but missing some/all answers -> AI Solver + Double-Check
            collected.push.apply(collected, parsed);
            const missingQs = parsed.filter(function (q) { return q.correct.length === 0; });
            const apiKey = getApiKey();
            if (apiKey) {
              setPipelineSteps("done", "done", "active", "AI \u0111ang gi\u1ea3i " + missingCount + " c\u00e2u thi\u1ebfu \u0111\u00e1p \u00e1n & ki\u1ec3m tra ch\u00e9o...");
              await solveQuestionsArray(missingQs, apiKey, model, signal, 50, 78);
              aiSolvedList.push.apply(aiSolvedList, missingQs);
              summaries.push(src.name + ": " + parsed.length + " c\u00e2u (AI gi\u1ea3i " + missingCount + " c\u00e2u)");
            } else {
              summaries.push(src.name + ": " + parsed.length + " c\u00e2u (thi\u1ebfu " + missingCount + " \u0110/A – c\u1ea7n API Key \u0111\u1ec3 AI t\u1ef1 gi\u1ea3i)");
              U().showToast("\u0110\u00e3 tr\u00edch xu\u1ea5t " + parsed.length + " c\u00e2u t\u1eeb \"" + src.name + "\" nh\u01b0ng c\u00f2n " + missingCount + " c\u00e2u thi\u1ebfu \u0111\u00e1p \u00e1n. H\u00e3y c\u00e0i Gemini API Key \u0111\u1ec3 AI t\u1ef1 gi\u1ea3i & ki\u1ec3m tra ch\u00e9o.", "warning", {
                label: "C\u00e0i \u0111\u1eb7t API",
                onClick: function () { U().showTab("api"); }
              });
            }
          } else {
            // STEP 2B-2: Unstructured or broken formatting -> AI extracts, solves & double-checks
            const apiKey = requireApiKey();
            if (!apiKey) {
              if (parsed.length > 0) {
                collected.push.apply(collected, parsed);
                summaries.push(src.name + ": " + parsed.length + " c\u00e2u (\u0111\u1ecbnh d\u1ea1ng l\u1ed9n x\u1ed9n – c\u1ea7n API Key \u0111\u1ec3 AI chu\u1ea9n h\u00f3a \u0111\u1ee7)");
              } else {
                U().showToast("T\u1ec7p \"" + src.name + "\" ch\u01b0a \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng tr\u1eafc nghi\u1ec7m chu\u1ea9n n\u00ean c\u1ea7n Gemini API Key \u0111\u1ec3 AI ph\u00e2n t\u00edch & gi\u1ea3i.", "warning");
              }
              continue;
            }
            setPipelineSteps("done", "done", "active", "\u0110\u1ecbnh d\u1ea1ng t\u1ef1 do → AI \u0111ang \u0111\u1ecdc, gi\u1ea3i & ki\u1ec3m tra ch\u00e9o...");
            const aiQs = await extractAndSolveTextWithAI(cleanText, apiKey, model, signal, 50, 78);
            if (aiQs.length > 0) {
              collected.push.apply(collected, aiQs);
              aiSolvedList.push.apply(aiSolvedList, aiQs);
              summaries.push(src.name + " (AI c\u1ea5u tr\u00fac & gi\u1ea3i): " + aiQs.length + " c\u00e2u");
            }
          }
        }
      }

      // ---------- STEP 3: ENSURE MISSING ANSWERS SOLVED + AI DOUBLE-CHECK ----------
      if (!stopped && collected.length > 0) {
        const apiKey = getApiKey();
        const stillMissing = collected.filter(function (q) { return q.correct.length === 0; });
        if (stillMissing.length > 0 && cState.autoSolve && apiKey) {
          setPipelineSteps("done", "done", "active", "AI \u0111ang gi\u1ea3i \u0111\u00e1p \u00e1n c\u00f2n thi\u1ebfu...");
          await solveQuestionsArray(stillMissing, apiKey, model, signal, 75, 86);
          stillMissing.forEach(function (q) { if (aiSolvedList.indexOf(q) === -1) aiSolvedList.push(q); });
        }

        if (aiSolvedList.length > 0 && apiKey && !signal.aborted) {
          setPipelineSteps("done", "done", "active", "AI \u0111ang ki\u1ec3m tra ch\u00e9o \u0111\u1ed9 ch\u00ednh x\u00e1c \u0111\u00e1p \u00e1n...");
          const flagged = await doubleCheckQuestionsArray(aiSolvedList, apiKey, model, signal, 86, 99);
          setPipelineSteps("done", "done", "done", flagged > 0 ? ("AI \u0111\u00e3 gi\u1ea3i & ki\u1ec3m tra ch\u00e9o (" + flagged + " c\u00e2u c\u1ea7n xem k\u1ef9)") : "AI \u0111\u00e3 gi\u1ea3i & ki\u1ec3m tra ch\u00e9o 100% kh\u1edbp!");
        } else if (aiSolvedList.length === 0) {
          setPipelineSteps("done", "done", "skip", "\u0110\u00e3 \u0111\u1ee7 \u0111\u00e1p \u00e1n h\u1ee3p l\u1ec7 – b\u1ecf qua b\u01b0\u1edbc AI gi\u1ea3i");
        } else {
          setPipelineSteps("done", "done", "done");
        }

        if (cState.appendMode) cState.questions = cState.questions.concat(collected);
        else cState.questions = collected;
        cState.page = 1;
        cState.progressPct = 100;
        cState.lastSummary = summaries.join(" • ");
        const suspectTotal = cState.questions.filter(function (q) { return q.suspect; }).length;
        U().showToast(
          "Ho\u00e0n t\u1ea5t! \u0110\u00e3 x\u1eed l\u00fd " + collected.length + " c\u00e2u h\u1ecfi" + (suspectTotal > 0 ? (" (" + suspectTotal + " c\u00e2u AI \u0111\u00e1nh d\u1ea5u c\u1ea7n xem l\u1ea1i)") : "") + ".",
          suspectTotal > 0 ? "warning" : "success"
        );
        if (cState.autoExport && cState.questions.length > 0) doExport("xlsx", true);
      } else if (!stopped) {
        U().showToast("Kh\u00f4ng t\u00ecm th\u1ea5y c\u00e2u h\u1ecfi h\u1ee3p l\u1ec7 n\u00e0o trong t\u1ec7p \u0111\u00e3 t\u1ea3i l\u00ean.", "warning");
      }
    } catch (e) {
      if (e && e.name === "AbortError") U().showToast("\u0110\u00e3 d\u1eebng qu\u00e1 tr\u00ecnh x\u1eed l\u00fd. C\u00e1c c\u00e2u \u0111\u00e3 tr\u00edch xu\u1ea5t \u0111\u01b0\u1ee3c gi\u1eef l\u1ea1i.", "warning");
      else U().showToast("L\u1ed7i x\u1eed l\u00fd t\u1ec7p: " + ((e && e.message) || "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh"), "error");
    } finally {
      cState.busy = false;
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
      const nonEmptyOpts = q.options.map(function (o) { return String(o || "").trim(); }).filter(Boolean);
      const cleanCorr = q.correct.filter(function (c) { return c >= 0 && c < nonEmptyOpts.length; });
      if (!q.text.trim() || nonEmptyOpts.length < 2) { errors++; return; }
      if (cleanCorr.length === 0) { missingAns++; return; }
      valid++;
      validItems.push(Object.assign({}, q, { options: nonEmptyOpts, correct: cleanCorr }));
    });
    return { total: cState.questions.length, valid: valid, missingAns: missingAns, errors: errors, validItems: validItems };
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
    const hasKey = !!getApiKey();

    let h = "";
    if (!hasKey) {
      h += '<div class="pending-banner"><span>⚠️ B\u1ea1n ch\u01b0a c\u00e0i \u0111\u1eb7t Gemini API Key (c\u1ea7n thi\u1ebft \u0111\u1ec3 d\u00f9ng AI \u0111\u1ecdc \u1ea3nh, gi\u1ea3i \u0111\u1ec1 &amp; Double-Check).</span>' +
        '<button type="button" class="btn btn-primary btn-sm" data-cact="go-api">\u0110i t\u1edbi trang C\u00e0i \u0111\u1eb7t API →</button></div>';
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

    h += '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cAutoSolve"' + (cState.autoSolve ? " checked" : "") + '> T\u1ef1 \u0111\u1ed9ng gi\u1ea3i &amp; ki\u1ec3m tra ch\u00e9o n\u1ebfu thi\u1ebfu \u0111\u00e1p \u00e1n</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cAutoExport"' + (cState.autoExport ? " checked" : "") + '> T\u1ef1 \u0111\u1ed9ng t\u1ea3i Excel sau khi xong</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cAppend"' + (cState.appendMode ? " checked" : "") + '> N\u1ed1i th\u00eam v\u00e0o danh s\u00e1ch hi\u1ec7n c\u00f3</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cKeepPref"' + (cState.keepPrefix ? " checked" : "") + '> Gi\u1eef ti\u1ec1n t\u1ed1 s\u1ed1 c\u00e2u (C\u00e2u 1.)</label>' +
      '<div class="deck-actions" style="margin-top:8px">' +
        '<button type="button" class="btn btn-primary" id="convSmartRunBtn" style="flex:1" data-cact="run-smart"' + (canRunSmart ? "" : " disabled") + '>' + (cState.busy ? '<span class="spinner"></span>\u0110ang x\u1eed l\u00fd th\u00f4ng minh...' : '✨ B\u1eaft \u0111\u1ea7u chuy\u1ec3n \u0111\u1ed5i th\u00f4ng minh') + '</button>' +
        (cState.busy ? '<button type="button" class="btn btn-danger btn-sm" data-cact="stop-ai">D\u1eebng</button>' : "") +
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
          '<button type="button" class="seg-btn' + (cState.viewMode === "table" ? " active" : "") + '" data-cact="vmode" data-val="table">B\u1ea3ng nhanh</button>' +
          '<button type="button" class="seg-btn' + (cState.viewMode === "split" ? " active" : "") + '" data-cact="vmode" data-val="split">' + (U().can("splitReview") ? "" : "🔒 ") + '\u0110\u1ed1i chi\u1ebfu song song (Split-Screen)</button>' +
        '</div>' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="verify-all"' + (v.total === 0 ? " disabled" : "") + '>✓ Duy\u1ec7t t\u1ea5t c\u1ea3</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="clear-all"' + (v.total === 0 ? " disabled" : "") + '>X\u00f3a b\u1ea3ng</button>' +
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
      if (cState.filter === "missing" && q.correct.length > 0) return false;
      const kw = cState.search.trim().toLowerCase();
      if (!kw) return true;
      return String(item.idx + 1) === kw || q.text.toLowerCase().indexOf(kw) !== -1 || q.options.some(function (o) { return o.toLowerCase().indexOf(kw) !== -1; });
    });

    if (filtered.length === 0) {
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
            '<td style="white-space:nowrap"><button type="button" class="btn btn-outline btn-sm" data-cact="edit-inline" data-idx="' + i + '">S\u1eeda</button> <button type="button" class="btn btn-outline btn-sm" data-cact="del-q" data-idx="' + i + '">✕</button></td></tr>';
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
      '<label class="check-row" style="margin:0;font-size:.8rem"><input type="checkbox" data-cact="verify-q" data-idx="' + i + '"' + (q.verified ? " checked" : "") + '> ✓ \u0110\u00e3 duy\u1ec7t (Verified)</label></div>' +
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
    else if (act === "vmode") {
      const m = b.getAttribute("data-val");
      if (m === "split" && !U().requireFeature("splitReview")) return;
      cState.viewMode = m;
      U().navigateTo(m === "split" ? "/converter/review" : "/converter");
    }
    else if (act === "clear-files") clearUnifiedFiles();
    else if (act === "del-file") removeUnifiedFile(Number(b.getAttribute("data-idx")));
    else if (act === "run-smart") runSmartUploadPipeline();
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
    else if (act === "del-q") { cState.questions.splice(Number(b.getAttribute("data-idx")), 1); renderConverter(); }
    else if (act === "verify-all") { cState.questions.forEach(function (q) { q.verified = true; q.suspect = false; }); renderConverter(); U().showToast("\u0110\u00e3 \u0111\u00e1nh d\u1ea5u duy\u1ec7t t\u1ea5t c\u1ea3 c\u00e2u h\u1ecfi.", "success"); }
    else if (act === "clear-all") { U().showConfirm("X\u00f3a b\u1ea3ng", "X\u00f3a to\u00e0n b\u1ed9 c\u00e2u h\u1ecfi trong AI Converter?", function () { cState.questions = []; renderConverter(); }); }
    else if (act === "zoom") { cState.imgZoom = U().clamp(cState.imgZoom + Number(b.getAttribute("data-val")), 50, 250); renderConverter(); }
    else if (act === "img-prev") { cState.activeImgIdx = Math.max(0, cState.activeImgIdx - 1); renderConverter(); }
    else if (act === "img-next") { cState.activeImgIdx = Math.min(cState.images.length - 1, cState.activeImgIdx + 1); renderConverter(); }
    else if (act === "pg") { cState.page = Number(b.getAttribute("data-val")); renderConverter(); }
  }

  function onConverterChange(e) {
    const t = e.target;
    if (!t) return;
    if (t.id === "convUnifiedInput") { addUnifiedFiles(t.files); t.value = ""; }
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

  window.UETConverter = {
    renderConverter: renderConverter,
    renderApiPage: renderApiPage,
    applySubRoute: applySubRoute,
    getValidQuestions: function () { return validateAll().validItems; }
  };
})();
