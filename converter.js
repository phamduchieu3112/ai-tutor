/* ============================================================
   UET Master – UET Converter, Split-Screen Review & API Settings (converter.js)
   ============================================================ */
(function () {
  "use strict";

  const SAMPLE_ROWS = [
    ["Tính giới hạn $L = \\lim_{x \\to 0} \\frac{\\sin 3x}{x}$:", "Multiple Choice", "1", "3", "$\\frac{1}{3}$", "0", "", "2", 30, "", "Áp dụng $\\lim_{u \\to 0} \\frac{\\sin u}{u} = 1$, ta có $L = 3$."],
    ["Choose the word whose underlined part differs from the other three in pronunciation:", "Multiple Choice", "biom<u>a</u>ss", "a<u>c</u>tivity", "effi<u>c</u>ient", "<u>a</u>lthough", "", "1", 30, "", "Phần gạch chân ở <b>biomass</b> phát âm khác các phương án còn lại."],
    ["Những số nào sau đây là số nguyên tố? (Chọn tất cả đáp án đúng)", "Checkbox", "2", "4", "5", "9", "", "1,3", 45, "", "2 và 5 là số nguyên tố."]
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
    apiStatusMsg: "Chưa cấu hình",
    mounted: false,
    apiMounted: false
  };

  function U() { return window.UET; }
  function getApiKey() { try { return (localStorage.getItem(U().KEYS.apiKey) || "").trim(); } catch (e) { return ""; } }
  function setApiKey(v) {
    try { if (v) localStorage.setItem(U().KEYS.apiKey, v.trim()); else localStorage.removeItem(U().KEYS.apiKey); } catch (e) { /* */ }
    U().updateChrome();
  }
  function getApiModel() { try { return localStorage.getItem(U().KEYS.apiModel) || "gemini-2.5-flash"; } catch (e) { return "gemini-2.5-flash"; } }
  function setApiModel(m) { try { localStorage.setItem(U().KEYS.apiModel, m); } catch (e) { /* */ } }

  function dateStamp() {
    const d = new Date();
    return String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear();
  }

  function requireApiKey() {
    const k = getApiKey();
    if (k) return k;
    U().showToast("Chưa có Gemini API Key! Hãy cài đặt API Key trước khi chạy AI.", "warning", {
      label: "Đi tới Cài đặt API",
      onClick: function () { U().showTab("api"); }
    });
    return null;
  }

  /* ======================== API SETTINGS PAGE (PART 3) ======================== */
  function renderApiPage() {
    const root = U().$("apiSettingsRoot");
    if (!root) return;
    const key = getApiKey();
    const model = getApiModel();
    if (key && cState.apiStatus === "none") { cState.apiStatus = "saved"; cState.apiStatusMsg = "Đã lưu Key"; }
    const badgeCls = cState.apiStatus === "ok" ? "badge-ok" : (cState.apiStatus === "error" ? "badge-bad" : (cState.apiStatus === "saved" ? "" : "badge-warn"));
    const isPro = model.indexOf("pro") !== -1;

    root.innerHTML =
      '<div class="api-wrap">' +
        '<section class="panel">' +
          '<div class="panel-head"><div><h2>Cài đặt Google Gemini API</h2><p class="muted" style="margin:0;font-size:.84rem">Hỗ trợ cả API từ tài khoản Google AI Pro / Ultra / Paid và API Free.</p></div>' +
          '<span class="badge ' + badgeCls + '" id="apiPageBadge">' + U().esc(cState.apiStatusMsg) + '</span></div>' +

          '<label class="field">Gemini API Key' +
            '<div class="key-input-wrap">' +
              '<input type="password" id="uetApiKeyInput" autocomplete="off" spellcheck="false" value="' + U().esc(key) + '" placeholder="Dán chuỗi khóa bắt đầu bằng AIza...">' +
              '<button type="button" class="eye-btn" id="uetApiEyeBtn" title="Hiện / Ẩn API Key" aria-label="Hiện hoặc ẩn API Key">👁️</button>' +
            '</div>' +
          '</label>' +
          '<p class="muted" style="font-size:.78rem;margin:0 0 12px">Sau khi dán hoặc bấm Lưu Key, ô nhập tự động ẩn dưới dạng mật khẩu (••••••••). Bấm biểu tượng con mắt để xem lại bất cứ lúc nào.</p>' +

          '<div class="deck-actions" style="margin-bottom:16px">' +
            '<button type="button" class="btn btn-primary" id="uetApiSaveBtn">Lưu Key</button>' +
            '<button type="button" class="btn btn-emerald" id="uetApiTestBtn">Kiểm tra kết nối (Test API)</button>' +
            '<button type="button" class="btn btn-outline" id="uetApiDelBtn">Xóa Key</button>' +
          '</div>' +

          '<label class="field">Chọn Model Gemini AI' +
            '<select id="uetApiModelSelect">' +
              '<option value="gemini-2.5-pro"' + (model === "gemini-2.5-pro" ? " selected" : "") + '>Gemini 2.5 Pro – Chế độ Chính xác cao (Khuyên dùng cho Google AI Pro / Ultra / Paid)</option>' +
              '<option value="gemini-2.5-flash"' + (model === "gemini-2.5-flash" ? " selected" : "") + '>Gemini 2.5 Flash – Chế độ Nhanh / Tiết kiệm (API Free)</option>' +
              '<option value="gemini-3-flash-preview"' + (model === "gemini-3-flash-preview" ? " selected" : "") + '>Gemini 3 Flash Preview – Tốc độ cao (API Free / Preview)</option>' +
            '</select>' +
          '</label>' +
          '<div class="' + (isPro ? "checkout-notice" : "pending-banner") + '" style="margin:8px 0 0;font-weight:500;font-size:.82rem">' +
            (isPro
              ? "💎 <strong>Chế độ Chính xác cao (Gemini 2.5 Pro):</strong> Tối ưu tối đa cho công thức Toán/Lý/Hóa phức tạp và tự động giải đề chuẩn xác."
              : "⚠️ <strong>Lưu ý khi dùng API Free / Flash:</strong> Tốc độ nhanh & miễn phí, nhưng bạn nên mở <strong>Chế độ Kiểm duyệt song song (Split-Screen Review)</strong> hoặc chạy <strong>AI Double-Check</strong> sau khi đọc đề để đảm bảo đáp án chuẩn 100%.") +
          '</div>' +
        '</section>' +

        '<section class="panel">' +
          '<div class="panel-head"><h2>Hướng dẫn lấy Gemini API Key</h2>' +
            '<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Mở Google AI Studio ↗</a>' +
          '</div>' +
          '<ol class="guide-steps">' +
            '<li><span class="step-num">1</span><span>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"><strong>https://aistudio.google.com/app/apikey</strong></a> bằng nút mở tab mới ở trên.</span></li>' +
            '<li><span class="step-num">2</span><span>Đăng nhập bằng tài khoản Google của bạn (tài khoản thường, Google AI Pro hoặc Ultra).</span></li>' +
            '<li><span class="step-num">3</span><span>Nhấn nút <strong>Create API Key (Tạo khóa API)</strong> và chọn hoặc tạo một dự án Google Cloud.</span></li>' +
            '<li><span class="step-num">4</span><span>Sao chép chuỗi khóa bắt đầu bằng <code>AIza...</code>, dán vào ô phía trên rồi bấm <strong>Lưu Key</strong> và <strong>Kiểm tra kết nối</strong>.</span></li>' +
          '</ol>' +
          '<p class="muted" style="font-size:.8rem;margin:12px 0 0">🔒 <strong>Bảo mật:</strong> API Key chỉ lưu cục bộ trong <code>localStorage</code> trên trình duyệt cá nhân và chỉ gửi trực tiếp tới máy chủ chính thức của Google Gemini API.</p>' +
        '</section>' +
      '</div>';

    if (!cState.apiMounted) {
      cState.apiMounted = true;
      root.addEventListener("click", onApiPageClick);
      root.addEventListener("change", onApiPageChange);
      root.addEventListener("paste", onApiPagePaste);
    }
  }

  function maskKeyEl() {
    const inp = U().$("uetApiKeyInput"), eye = U().$("uetApiEyeBtn");
    if (inp) inp.type = "password";
    if (eye) eye.textContent = "👁️";
  }

  async function testGeminiConnection() {
    const inp = U().$("uetApiKeyInput");
    const raw = (inp ? inp.value : "").trim() || getApiKey();
    if (!raw) { U().showToast("Vui lòng nhập Gemini API Key trước.", "warning"); return; }
    setApiKey(raw);
    maskKeyEl();
    const btn = U().$("uetApiTestBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Đang kiểm tra...'; }
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(raw));
      if (!res.ok) {
        const err = await res.json().catch(function () { return {}; });
        throw new Error((err && err.error && err.error.message) || ("HTTP " + res.status));
      }
      cState.apiStatus = "ok";
      cState.apiStatusMsg = "✅ Kết nối thành công";
      U().showToast("Kết nối Gemini API thành công!", "success");
    } catch (e) {
      cState.apiStatus = "error";
      cState.apiStatusMsg = "❌ Key không hợp lệ";
      U().showToast("Kiểm tra thất bại: " + (e.message || "Không kết nối được"), "error");
    }
    renderApiPage();
  }

  function onApiPageClick(e) {
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
      if (!val) { U().showToast("Vui lòng dán chuỗi Gemini API Key.", "warning"); return; }
      setApiKey(val);
      maskKeyEl();
      cState.apiStatus = "saved";
      cState.apiStatusMsg = "Đã lưu Key";
      U().showToast("Đã lưu API Key cục bộ trên trình duyệt.", "success");
      renderApiPage();
    } else if (t.id === "uetApiTestBtn") {
      testGeminiConnection();
    } else if (t.id === "uetApiDelBtn") {
      U().showConfirm("Xóa API Key", "Bạn có chắc muốn xóa Gemini API Key đã lưu?", function () {
        setApiKey("");
        cState.apiStatus = "none";
        cState.apiStatusMsg = "Chưa cấu hình";
        U().showToast("Đã xóa API Key.", "info");
        renderApiPage();
      });
    }
  }
  function onApiPageChange(e) {
    if (e.target && e.target.id === "uetApiModelSelect") {
      const m = e.target.value;
      if (m.indexOf("pro") !== -1 && !U().can("proAi")) {
        U().showToast("Model Gemini Pro được ưu tiên cho gói Diamond VIP (bạn vẫn có thể dùng nếu có API Key cá nhân).", "info");
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
          cState.apiStatusMsg = "Đã lưu Key";
          U().showToast("Đã dán & tự động ẩn API Key.", "info");
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
        else reject(new Error("Không thể khởi tạo thư viện đọc tài liệu."));
      };
      s.onerror = function () {
        delete _scriptCache[src];
        reject(new Error("Không tải được thư viện phân tích từ CDN. Vui lòng kiểm tra kết nối mạng."));
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
    if (kind === "image") return { icon: "🖼️", badge: "Ảnh → AI Vision" };
    if (kind === "pdf") return { icon: "📕", badge: "PDF" };
    if (kind === "docx") return { icon: "📘", badge: "Word (.docx)" };
    if (kind === "doc") return { icon: "📘", badge: "Word (.doc)" };
    if (kind === "text") return { icon: "📄", badge: "Markdown / Text" };
    if (kind === "excel") return { icon: "📊", badge: "Excel" };
    return { icon: "📎", badge: "Tài liệu" };
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
      U().showToast("Tệp \"" + emptyFiles.join(", ") + "\" rỗng (0 KB), không có nội dung để xử lý.", "warning");
      return;
    }
    if (valid.length === 0) {
      U().showToast("Định dạng không hỗ trợ. Hãy chọn Ảnh (.png/.jpg/.webp), Markdown/Text (.md/.txt), PDF (.pdf), Word (.doc/.docx) hoặc Excel (.xlsx).", "warning");
      return;
    }
    const existingImgCount = cState.files.filter(function (x) { return x.kind === "image"; }).length;
    const incomingImgCount = valid.filter(function (x) { return x.kind === "image"; }).length;
    const maxImgs = U().effectiveLimits().maxImages || 5;
    if (incomingImgCount > 0 && existingImgCount + incomingImgCount > maxImgs && !U().isAdmin()) {
      U().promptUpgrade("Gói " + U().effectiveLimits().name + " cho phép tối đa " + maxImgs + " ảnh/lần trong AI Converter.");
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
      U().showToast("Đã thêm " + valid.length + " tệp (bỏ qua " + rejected.length + " tệp không hỗ trợ).", "warning");
    } else {
      U().showToast("Đã thêm " + valid.length + " tệp vào hàng đợi xử lý thông minh.", "info");
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
      { id: "extract", label: extractSt === "done" ? "Đã trích xuất nội dung" : "Đang trích xuất nội dung...", status: extractSt },
      { id: "validate", label: validateSt === "done" ? "Đã kiểm tra cấu trúc & đáp án" : "Đang kiểm tra đáp án...", status: validateSt },
      { id: "ai", label: aiLabel || (aiSt === "done" ? "AI đã giải & kiểm tra chéo xong" : (aiSt === "skip" ? "Đã đủ đáp án – chuyển đổi trực tiếp (không cần gọi AI)" : "AI đang giải & kiểm tra chéo...")), status: aiSt }
    ];
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onerror = function () { reject(new Error("Không thể đọc tệp văn bản.")); };
      r.onload = function (ev) { resolve(String(ev.target.result || "")); };
      r.readAsText(file, "UTF-8");
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onerror = function () { reject(new Error("Không thể đọc dữ liệu nhị phân của tệp.")); };
      r.onload = function (ev) { resolve(ev.target.result); };
      r.readAsArrayBuffer(file);
    });
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onerror = function () { reject(new Error("Không thể mã hóa tệp.")); };
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
    if (decoded.length >= 80 && /(?:Câu|Question|A\.\s|B\.\s)/i.test(decoded)) return decoded;
    throw new Error("Tệp .doc định dạng nhị phân cũ (Word 97-2003) không thể đọc trực tiếp trên trình duyệt. Hãy lưu lại thành .docx hoặc .pdf rồi tải lên.");
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
      reader.onerror = function () { reject(new Error("Không thể đọc file ảnh.")); };
      reader.onload = function (ev) {
        const img = new Image();
        img.onerror = function () { reject(new Error("File ảnh không hợp lệ.")); };
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
          throw new Error("Yêu cầu tới Gemini AI quá thời gian chờ (Timeout 90s). Vui lòng thử lại.");
        }
        throw fetchErr;
      }
      if (timer) clearTimeout(timer);
      if (signal && typeof signal.removeEventListener === "function") signal.removeEventListener("abort", onParentAbort);
      if (res.ok) {
        const data = await res.json();
        const txt = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (!txt) throw new Error("Gemini không trả về JSON.");
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
    throw new Error("Vượt quá số lần thử lại API.");
  }

  function ocrPrompt(subject, keepPrefix) {
    const guides = {
      math: "CHUYÊN TOÁN/LÝ/HÓA: Bọc mọi công thức trong LaTeX $...$ hoặc $$...$$ (\\frac, \\sqrt[n]{}, x^{}, u_{}, \\int, \\lim, \\begin{cases}, \\vec, \\widehat, \\mathbb{R}). Không rút gọn hay biến phân số thành x+1/x-2.",
      english: "CHUYÊN TIẾNG ANH: Bắt buộc bọc ký tự/cụm từ bị GẠCH CHÂN bằng <u>...</u> (vd: biom<u>a</u>ss), in đậm <b>...</b>, in nghiêng <i>...</i>, giữ nguyên dấu trọng âm (ˈ, ˌ), IPA và chỗ trống ________.",
      theory: "MÔN LÝ THUYẾT: Giữ chính xác từng từ, bọc <b>/<i>/<u> nếu có nhấn mạnh, LaTeX $...$ nếu có công thức.",
      auto: "TỰ ĐỘNG: Công thức Toán/Lý/Hóa bọc LaTeX $...$ (\\frac, \\sqrt, ^{}, _{}, \\int, \\lim, \\mathbb{R}). Tiếng Anh/Ngôn ngữ bọc phần gạch chân bằng <u>...</u>, in đậm <b>, in nghiêng <i>, giữ trọng âm (ˈ, ˌ) và chỗ trống ________."
    };
    const pref = keepPrefix ? "Giữ số câu ở đầu question, bỏ nhãn A./B./C./D. ở đầu các phương án." : "Bỏ tiền tố Câu 1., Question 1:, A., B., C., D. ở đầu câu hỏi và phương án.";
    return "Bạn là chuyên gia số hóa đề thi chuẩn xác 100%. " + (guides[subject] || guides.auto) + "\n" +
      "1. " + pref + "\n" +
      "2. Sửa lỗi định dạng lộn xộn / vỡ dòng nhưng giữ nguyên nội dung học thuật.\n" +
      "3. Nếu tài liệu có đánh dấu đáp án đúng (khoanh, tô màu, gạch chân cả đáp án, in đậm), trả về chỉ số 1-based trong correct (vd [1] cho A, [1,3] cho Checkbox). Nếu chưa có đáp án, hãy tự giải chính xác và trả về đáp án 1-based kèm giải thích ngắn gọn tiếng Việt.\n" +
      "4. Tự kiểm tra lại (self-check) phân số, số mũ, chỉ số dưới, thẻ <u>...</u> và đáp án trước khi trả JSON.";
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
      cState.progressLabel = "AI đang giải đáp án " + (st + 1) + "–" + Math.min(st + BATCH, missingIdx.length) + "/" + missingIdx.length + "...";
      cState.progressPct = Math.round(p0 + ((st / missingIdx.length) * (p1 - p0)));
      renderConverter();
      const items = slice.map(function (idx) {
        const q = list[idx];
        return { index: idx, question: q.text, type: q.type, options: q.options.filter(Boolean).map(function (o, k) { return (k + 1) + ". " + o; }) };
      });
      const res = await callGemini(apiKey, model, {
        systemInstruction: { parts: [{ text: "Bạn là giảng viên xuất sắc. Giải chính xác từng câu hỏi, trả về chỉ số 1-based trong correct và giải thích ngắn gọn tiếng Việt (dùng LaTeX $...$ cho Toán/Lý/Hóa)." }] },
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
      cState.progressLabel = "AI đang kiểm tra chéo đáp án " + (st + 1) + "–" + Math.min(st + BATCH, list.length) + "/" + list.length + "...";
      cState.progressPct = Math.round(p0 + ((st / list.length) * (p1 - p0)));
      renderConverter();
      const items = slice.map(function (q, offset) {
        return { index: st + offset, question: q.text, options: q.options.filter(Boolean).map(function (o, k) { return (k + 1) + ". " + o; }) };
      });
      const res = await callGemini(apiKey, model, {
        systemInstruction: { parts: [{ text: "Giải độc lập từng câu hỏi từ đầu (không phỏng đoán). Trả về đáp án 1-based trong independentCorrect, mức độ tự tin (high/medium/low), và nhận xét ngắn gọn tiếng Việt." }] },
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
          const sug = ind.map(function (i) { return U().LETTERS.charAt(i); }).join(",") || "chưa rõ";
          q.checkNote = (!same ? ("AI kiểm tra chéo đề xuất: " + sug + ". ") : ("Độ tự tin " + chk.confidence + ". ")) + (chk.note || "");
          flagged++;
        } else {
          q.suspect = false;
          q.checkNote = "AI kiểm tra chéo khớp đáp án (Độ tự tin cao).";
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
      cState.progressLabel = "AI đang cấu trúc & giải đề (phần " + (i + 1) + "/" + chunks.length + ")...";
      cState.progressPct = Math.round(p0 + ((i / chunks.length) * (p1 - p0)));
      renderConverter();
      const res = await callGemini(apiKey, model, {
        systemInstruction: { parts: [{ text: ocrPrompt(cState.subject, cState.keepPrefix) }] },
        contents: [{ role: "user", parts: [{ text: "Đọc đoạn đề thi sau, chuẩn hóa toàn bộ câu hỏi trắc nghiệm và giải chính xác mọi câu hỏi (kèm giải thích ngắn gọn):\n\n" + chunks[i] }] }],
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
      U().showToast("Vui lòng chọn / kéo thả tệp tài liệu (Ảnh, PDF, Word, Markdown/Text) hoặc dán nội dung trước.", "warning");
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
      cState.progressLabel = "Đang trích xuất nội dung...";
      cState.progressPct = 5;
      renderConverter();

      // ---------- CASE C: EXCEL (.xlsx/.xls/.csv) ----------
      for (let ei = 0; ei < excelItems.length; ei++) {
        if (signal.aborted) { stopped = true; break; }
        try {
          const exQs = await parseExcelFileAsync(excelItems[ei].file);
          if (exQs.length > 0) {
            collected.push.apply(collected, exQs);
            summaries.push("Excel (" + excelItems[ei].name + "): " + exQs.length + " câu");
          } else {
            U().showToast("Tệp Excel \"" + excelItems[ei].name + "\" không có câu hỏi hợp lệ.", "warning");
          }
        } catch (exErr) {
          U().showToast("Không thể đọc tệp Excel \"" + excelItems[ei].name + "\": " + (exErr.message || "Tệp lỗi"), "error");
        }
      }

      // ---------- CASE A: IMAGES (.png/.jpg/.jpeg/.webp/...) -> AI VISION / OCR ----------
      if (!stopped && imageItems.length > 0) {
        const apiKey = requireApiKey();
        if (!apiKey) {
          cState.busy = false; cState.progressLabel = ""; cState.steps = []; renderConverter();
          return;
        }
        setPipelineSteps("active", "pending", "pending", "AI Vision & kiểm tra chéo...");
        const imgExtracted = [];
        for (let i = 0; i < imageItems.length; i++) {
          if (signal.aborted) { stopped = true; break; }
          const im = imageItems[i];
          cState.progressLabel = "AI Vision đang đọc ảnh " + (i + 1) + "/" + imageItems.length + ": " + im.name;
          cState.progressPct = Math.round(10 + (i / imageItems.length) * 45);
          renderConverter();
          try {
            const b64 = await prepareImageBase64(im.file);
            const res = await callGemini(apiKey, model, {
              systemInstruction: { parts: [{ text: ocrPrompt(cState.subject, cState.keepPrefix) }] },
              contents: [{ role: "user", parts: [{ text: "Trích xuất toàn bộ câu hỏi trắc nghiệm từ ảnh này, sửa lỗi định dạng và giải những câu chưa có đáp án." }, { inlineData: { mimeType: b64.mimeType, data: b64.data } }] }],
              generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: QUESTION_LIST_SCHEMA }
            }, signal);
            const qs = Array.isArray(res && res.questions) ? res.questions.map(toConvItem).filter(Boolean) : [];
            imgExtracted.push.apply(imgExtracted, qs);
          } catch (imErr) {
            if (imErr && imErr.name === "AbortError") throw imErr;
            U().showToast("Lỗi đọc ảnh \"" + im.name + "\": " + (imErr.message || "Tệp ảnh hỏng"), "error");
          }
        }
        if (imgExtracted.length > 0) {
          collected.push.apply(collected, imgExtracted);
          aiSolvedList.push.apply(aiSolvedList, imgExtracted);
          summaries.push("Ảnh AI Vision: " + imgExtracted.length + " câu");
        }
      }

      // ---------- CASE B: DOCUMENTS (.md, .txt, .pdf, .doc, .docx) + OPTIONAL PASTED TEXT ----------
      const docSources = [];
      for (let di = 0; di < docItems.length; di++) {
        if (signal.aborted) { stopped = true; break; }
        const item = docItems[di];
        cState.progressLabel = "Đang trích xuất nội dung từ " + item.name + "...";
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
          U().showToast("Không thể đọc tệp \"" + item.name + "\": " + (docErr.message || "Tệp bị hỏng hoặc không hợp lệ"), "error");
        }
      }
      if (!stopped && pasted) {
        docSources.push({ name: "Văn bản đã dán", text: pasted, scannedPdfFile: null });
      }

      // Step 2: Check Answer Keys & Route Step 2A vs Step 2B
      if (!stopped && docSources.length > 0) {
        setPipelineSteps("done", "active", "pending");
        cState.progressLabel = "Đang kiểm tra cấu trúc câu hỏi & đáp án...";
        cState.progressPct = 45;
        renderConverter();

        for (let si = 0; si < docSources.length; si++) {
          if (signal.aborted) { stopped = true; break; }
          const src = docSources[si];

          // Scanned PDF -> route to Gemini PDF Vision directly
          if (src.scannedPdfFile) {
            const apiKey = requireApiKey();
            if (!apiKey) {
              U().showToast("Tệp PDF \"" + src.name + "\" là bản scan hình ảnh nên cần Gemini API Key để đọc.", "warning");
              continue;
            }
            setPipelineSteps("done", "done", "active", "PDF scan → AI Vision đang đọc & giải...");
            cState.progressLabel = "PDF dạng ảnh scan — AI đang đọc " + src.name + "...";
            cState.progressPct = 55;
            renderConverter();
            const pdfB64 = await readFileAsBase64(src.scannedPdfFile);
            const res = await callGemini(apiKey, model, {
              systemInstruction: { parts: [{ text: ocrPrompt(cState.subject, cState.keepPrefix) }] },
              contents: [{ role: "user", parts: [{ text: "Trích xuất toàn bộ câu hỏi trắc nghiệm từ tệp PDF này, giải các câu thiếu đáp án và trả về JSON chuẩn." }, { inlineData: { mimeType: "application/pdf", data: pdfB64 } }] }],
              generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: QUESTION_LIST_SCHEMA }
            }, signal);
            const qs = Array.isArray(res && res.questions) ? res.questions.map(toConvItem).filter(Boolean) : [];
            if (qs.length > 0) {
              collected.push.apply(collected, qs);
              aiSolvedList.push.apply(aiSolvedList, qs);
              summaries.push(src.name + " (PDF scan → AI): " + qs.length + " câu");
            }
            continue;
          }

          const cleanText = String(src.text || "").trim();
          if (!cleanText) {
            U().showToast("Tệp \"" + src.name + "\" trống hoặc không có nội dung văn bản.", "warning");
            continue;
          }

          const parsed = parseMarkdown(cleanText);
          const headerMatches = (cleanText.match(/(?:^|\n)\s*(?:\*\*|__)?(?:Câu|Question|Bài)\s*\d+\b/gi) || []).length;
          const isPartiallyBroken = headerMatches >= 4 && parsed.length < Math.ceil(headerMatches * 0.5);
          const missingCount = parsed.filter(function (q) { return q.correct.length === 0; }).length;

          if (!isPartiallyBroken && parsed.length > 0 && missingCount === 0) {
            // STEP 2A: Valid Answer Keys Present -> Direct conversion, ZERO redundant AI calls!
            collected.push.apply(collected, parsed);
            summaries.push(src.name + ": " + parsed.length + " câu (đủ đáp án – chuyển đổi trực tiếp)");
          } else if (!isPartiallyBroken && parsed.length > 0 && missingCount > 0) {
            // STEP 2B-1: Structured questions parsed, but missing some/all answers -> AI Solver + Double-Check
            collected.push.apply(collected, parsed);
            const missingQs = parsed.filter(function (q) { return q.correct.length === 0; });
            const apiKey = getApiKey();
            if (apiKey) {
              setPipelineSteps("done", "done", "active", "AI đang giải " + missingCount + " câu thiếu đáp án & kiểm tra chéo...");
              await solveQuestionsArray(missingQs, apiKey, model, signal, 50, 78);
              aiSolvedList.push.apply(aiSolvedList, missingQs);
              summaries.push(src.name + ": " + parsed.length + " câu (AI giải " + missingCount + " câu)");
            } else {
              summaries.push(src.name + ": " + parsed.length + " câu (thiếu " + missingCount + " Đ/A – cần API Key để AI tự giải)");
              U().showToast("Đã trích xuất " + parsed.length + " câu từ \"" + src.name + "\" nhưng còn " + missingCount + " câu thiếu đáp án. Hãy cài Gemini API Key để AI tự giải & kiểm tra chéo.", "warning", {
                label: "Cài đặt API",
                onClick: function () { U().showTab("api"); }
              });
            }
          } else {
            // STEP 2B-2: Unstructured or broken formatting -> AI extracts, solves & double-checks
            const apiKey = requireApiKey();
            if (!apiKey) {
              if (parsed.length > 0) {
                collected.push.apply(collected, parsed);
                summaries.push(src.name + ": " + parsed.length + " câu (định dạng lộn xộn – cần API Key để AI chuẩn hóa đủ)");
              } else {
                U().showToast("Tệp \"" + src.name + "\" chưa đúng định dạng trắc nghiệm chuẩn nên cần Gemini API Key để AI phân tích & giải.", "warning");
              }
              continue;
            }
            setPipelineSteps("done", "done", "active", "Định dạng tự do → AI đang đọc, giải & kiểm tra chéo...");
            const aiQs = await extractAndSolveTextWithAI(cleanText, apiKey, model, signal, 50, 78);
            if (aiQs.length > 0) {
              collected.push.apply(collected, aiQs);
              aiSolvedList.push.apply(aiSolvedList, aiQs);
              summaries.push(src.name + " (AI cấu trúc & giải): " + aiQs.length + " câu");
            }
          }
        }
      }

      // ---------- STEP 3: ENSURE MISSING ANSWERS SOLVED + AI DOUBLE-CHECK ----------
      if (!stopped && collected.length > 0) {
        const apiKey = getApiKey();
        const stillMissing = collected.filter(function (q) { return q.correct.length === 0; });
        if (stillMissing.length > 0 && cState.autoSolve && apiKey) {
          setPipelineSteps("done", "done", "active", "AI đang giải đáp án còn thiếu...");
          await solveQuestionsArray(stillMissing, apiKey, model, signal, 75, 86);
          stillMissing.forEach(function (q) { if (aiSolvedList.indexOf(q) === -1) aiSolvedList.push(q); });
        }

        if (aiSolvedList.length > 0 && apiKey && !signal.aborted) {
          setPipelineSteps("done", "done", "active", "AI đang kiểm tra chéo độ chính xác đáp án...");
          const flagged = await doubleCheckQuestionsArray(aiSolvedList, apiKey, model, signal, 86, 99);
          setPipelineSteps("done", "done", "done", flagged > 0 ? ("AI đã giải & kiểm tra chéo (" + flagged + " câu cần xem kỹ)") : "AI đã giải & kiểm tra chéo 100% khớp!");
        } else if (aiSolvedList.length === 0) {
          setPipelineSteps("done", "done", "skip", "Đã đủ đáp án hợp lệ – bỏ qua bước AI giải");
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
          "Hoàn tất! Đã xử lý " + collected.length + " câu hỏi" + (suspectTotal > 0 ? (" (" + suspectTotal + " câu AI đánh dấu cần xem lại)") : "") + ".",
          suspectTotal > 0 ? "warning" : "success"
        );
        if (cState.autoExport && cState.questions.length > 0) doExport("xlsx", true);
      } else if (!stopped) {
        U().showToast("Không tìm thấy câu hỏi hợp lệ nào trong tệp đã tải lên.", "warning");
      }
    } catch (e) {
      if (e && e.name === "AbortError") U().showToast("Đã dừng quá trình xử lý. Các câu đã trích xuất được giữ lại.", "warning");
      else U().showToast("Lỗi xử lý tệp: " + ((e && e.message) || "Không xác định"), "error");
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
    if (missing.length === 0) { U().showToast("Tất cả câu hỏi đều đã có đáp án.", "info"); return; }
    if (!fromOcr) { cState.busy = true; cState.abortCtrl = new AbortController(); }
    const model = getApiModel();
    let solved = 0;
    try {
      solved = await solveQuestionsArray(cState.questions, apiKey, model, cState.abortCtrl ? cState.abortCtrl.signal : undefined, 0, 100);
      if (solved > 0) U().showToast("AI đã giải xong " + solved + " câu hỏi.", "success");
    } catch (e) {
      if (e.name === "AbortError") U().showToast("Đã dừng giải đáp án. Giữ lại " + solved + " câu đã giải.", "warning");
      else U().showToast("Lỗi khi giải đáp án: " + (e.message || "Không xác định"), "error");
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
    if (cState.questions.length === 0) { U().showToast("Chưa có câu hỏi nào để kiểm tra chéo.", "warning"); return; }
    cState.busy = true;
    cState.abortCtrl = new AbortController();
    const model = getApiModel();
    try {
      const flagged = await doubleCheckQuestionsArray(cState.questions, apiKey, model, cState.abortCtrl.signal, 0, 100);
      cState.filter = flagged > 0 ? "suspect" : "all";
      cState.page = 1;
      U().showToast(flagged > 0 ? ("AI Double-Check phát hiện " + flagged + " câu cần kiểm tra kỹ!") : "AI Double-Check hoàn tất: toàn bộ đáp án đều khớp & tự tin cao!", flagged > 0 ? "warning" : "success");
    } catch (e) {
      if (e.name === "AbortError") U().showToast("Đã dừng kiểm tra chéo.", "warning");
      else U().showToast("Lỗi Double-Check: " + (e.message || "Không xác định"), "error");
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

    const ansSectionHeader = /^\s*(?:#+\s*)?(?:\*\*|__)?(?:BẢNG\s+ĐÁP\s+ÁN|ĐÁP\s+ÁN\s*(?:CHI\s+TIẾT)?|ANSWER\s+KEY)\s*:?(?:\*\*|__)?\s*(.*)$/i;
    const qStart = /^\s*(?:#+\s*)?(?:\*\*|__)?(?:Câu|Question|Bài)\s*\d+\s*[:.)\-]?\s*(?:\*\*|__)?\s*(.*)$/i;
    const numStart = /^\s*(?:\*\*|__)?(\d{1,4})\s*[:.)]\s+(?:\*\*|__)?(.*)$/;
    const optRe = /^\s*(?:[-*+]\s+)?(\*\*|__|\*|\[x\]\s*)?\s*([A-Ea-e])\s*([.):])\s*(.+?)\s*(\*\*|__)?\s*$/;
    const ansRe = /^\s*(?:\*\*|__)?(?:Đáp án|Answer|Key)\s*[:\-]\s*(.+?)(?:\*\*|__)?\s*$/i;
    const expRe = /^\s*(?:\*\*|__)?(?:Giải thích|Explanation|Lời giải)\s*[:\-]\s*(.+?)(?:\*\*|__)?\s*$/i;

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
        reject(new Error("Thư viện SheetJS chưa tải xong."));
        return;
      }
      const r = new FileReader();
      r.onerror = function () { reject(new Error("Không thể đọc file Excel.")); };
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
        } catch (err) { reject(new Error("Không thể đọc file Excel.")); }
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
      U().showConfirm("Còn câu chưa duyệt", "Hiện còn " + unv + "/" + cState.questions.length + " câu chưa được đánh dấu ✓ Đã duyệt. Bạn vẫn muốn tiếp tục?", cb, "Tiếp tục");
    } else cb();
  }

  function doExport(ext, skipWarn) {
    if (typeof XLSX === "undefined") { U().showToast("Thư viện SheetJS chưa tải xong.", "error"); return; }
    const run = function () {
      const v = validateAll();
      const list = cState.scope === "answered" ? v.validItems : cState.questions.map(function (q) {
        const nonEmpty = q.options.map(function (o) { return String(o || "").trim(); }).filter(Boolean);
        return Object.assign({}, q, { options: nonEmpty, correct: q.correct.filter(function (c) { return c >= 0 && c < nonEmpty.length; }) });
      });
      if (list.length === 0) { U().showToast("Không có câu hỏi hợp lệ để xuất.", "warning"); return; }
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
        const fname = chunks.length > 1 ? ("UET_Master_" + stamp + "_phan_" + (idx + 1)) : ("UET_Master_" + stamp);
        if (ext === "xlsx") {
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Questions");
          XLSX.writeFile(wb, fname + ".xlsx");
        } else {
          const csv = "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
          U().downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), fname + ".csv");
        }
      });
      U().showToast("Đã xuất " + chunks.length + " file " + ext.toUpperCase() + " chuẩn UET_Master!", "success");
    };
    if (skipWarn) run(); else warnIfUnverified(run);
  }

  function doOneClickImport() {
    const v = validateAll();
    if (v.valid === 0) {
      U().showToast("Chưa có câu hỏi hợp lệ có đáp án để nhập. Hãy chạy AI giải đáp án hoặc chọn đáp án trước.", "warning");
      return;
    }
    const title = (U().$("convDeckTitle") ? U().$("convDeckTitle").value : "").trim() || ("Bộ đề UET Converter " + dateStamp());
    const tag = (U().$("convDeckTag") ? U().$("convDeckTag").value : "").trim() || "Tổng hợp";
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
          '<h3>File mẫu chuẩn 11 cột – UET_Master.xlsx</h3>' +
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
            '<button type="button" class="btn btn-outline" id="convTplClose">Đóng</button>' +
            '<button type="button" class="btn btn-emerald" id="convTplDown">Tải file mẫu (.xlsx)</button>' +
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
      h += '<div class="pending-banner"><span>⚠️ Bạn chưa cài đặt Gemini API Key (cần thiết để dùng AI đọc ảnh, giải đề &amp; Double-Check).</span>' +
        '<button type="button" class="btn btn-primary btn-sm" data-cact="go-api">Đi tới trang Cài đặt API →</button></div>';
    }

    // 3 Top Cards
    h += '<div class="conv-grid">';

    // Card 1: Unified Smart File Uploader
    const canRunSmart = !cState.busy && (cState.files.length > 0 || (cState.pasteText || "").trim().length > 0);
    h += '<section class="panel"><div class="panel-head"><h2>1. Tải đề thi thông minh</h2>' +
      '<span class="badge">Tự động nhận diện</span></div>' +
      '<label class="conv-drop" id="convDropUnified">' +
        '<strong>📂 Chọn, kéo thả hoặc Ctrl+V tệp đề thi</strong>' +
        '<span class="muted" style="font-size:.76rem">Ảnh → AI Vision • Tài liệu đủ Đ/A → Chuyển ngay • Thiếu Đ/A → AI giải &amp; kiểm tra chéo</span>' +
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
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:.8rem"><strong>' + cState.files.length + ' tệp đang chờ xử lý</strong>' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="clear-files"' + (cState.busy ? " disabled" : "") + '>Xóa hết</button></div>' +
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
      '<summary>✍️ Hoặc dán nhanh văn bản / Markdown trực tiếp</summary>' +
      '<textarea id="convPasteText" rows="3" style="width:100%" placeholder="Dán câu hỏi trắc nghiệm hoặc Markdown tại đây (nếu thiếu đáp án AI sẽ tự giải)...">' + U().esc(cState.pasteText) + '</textarea>' +
    '</details>';

    h += '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cAutoSolve"' + (cState.autoSolve ? " checked" : "") + '> Tự động giải &amp; kiểm tra chéo nếu thiếu đáp án</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cAutoExport"' + (cState.autoExport ? " checked" : "") + '> Tự động tải Excel sau khi xong</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cAppend"' + (cState.appendMode ? " checked" : "") + '> Nối thêm vào danh sách hiện có</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cKeepPref"' + (cState.keepPrefix ? " checked" : "") + '> Giữ tiền tố số câu (Câu 1.)</label>' +
      '<div class="deck-actions" style="margin-top:8px">' +
        '<button type="button" class="btn btn-primary" id="convSmartRunBtn" style="flex:1" data-cact="run-smart"' + (canRunSmart ? "" : " disabled") + '>' + (cState.busy ? '<span class="spinner"></span>Đang xử lý thông minh...' : '✨ Bắt đầu chuyển đổi thông minh') + '</button>' +
        (cState.busy ? '<button type="button" class="btn btn-danger btn-sm" data-cact="stop-ai">Dừng</button>' : "") +
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
    h += '<section class="panel"><div class="panel-head"><h2>2. File mẫu &amp; Kiểm duyệt AI</h2></div>' +
      '<div class="checkout-notice" style="margin-bottom:10px">Đã tích hợp sẵn cấu trúc chuẩn 11 cột <strong>UET_Master.xlsx</strong> (không cần tải file mẫu lên).</div>' +
      '<div class="deck-actions" style="margin-bottom:12px">' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="view-tpl">👁️ Xem file mẫu</button>' +
        '<button type="button" class="btn btn-emerald btn-sm" data-cact="down-tpl">⬇ Tải file mẫu (.xlsx)</button>' +
      '</div>' +
      '<label class="field">Nạp nhanh bảng đáp án thủ công<textarea id="convManualAns" rows="2" placeholder="1.C 2.A 3.D 4.B hoặc 1-c, 2-a,c"></textarea></label>' +
      '<div class="deck-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="apply-manual-ans">Áp dụng đáp án</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-cact="solve-missing"' + (cState.busy || v.missingAns === 0 ? " disabled" : "") + '>🤖 AI giải câu thiếu Đ/A (' + v.missingAns + ')</button>' +
      '</div>' +
      '<div class="deck-actions" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">' +
        '<button type="button" class="btn btn-amber btn-sm" data-cact="double-check"' + (cState.busy || cState.questions.length === 0 ? " disabled" : "") + '>' + (U().can("doubleCheck") ? "" : "🔒 ") + '🔍 AI Kiểm tra lại toàn bộ đáp án (Double-Check)</button>' +
      '</div></section>';

    // Card 3: Options & Export
    h += '<section class="panel"><div class="panel-head"><h2>3. Chuẩn hóa &amp; Xuất file</h2></div>' +
      '<label class="field">Chế độ môn học<select id="cSubject">' +
        '<option value="auto"' + (cState.subject === "auto" ? " selected" : "") + '>Tự động nhận diện</option>' +
        '<option value="math"' + (cState.subject === "math" ? " selected" : "") + '>Toán - Lý - Hóa (Chuyên LaTeX)</option>' +
        '<option value="english"' + (cState.subject === "english" ? " selected" : "") + '>Tiếng Anh (Gạch chân &lt;u&gt;, trọng âm)</option>' +
        '<option value="theory"' + (cState.subject === "theory" ? " selected" : "") + '>Môn lý thuyết khác</option>' +
      '</select></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<label class="field">Định dạng Đáp án<select id="cAnsFmt"><option value="number"' + (cState.ansFormat === "number" ? " selected" : "") + '>Số (1–5)</option><option value="letter"' + (cState.ansFormat === "letter" ? " selected" : "") + '>Chữ (A–E)</option></select></label>' +
        '<label class="field">Thời gian (giây)<input type="number" id="cDefTime" min="5" max="600" value="' + cState.defaultTime + '"></label>' +
        '<label class="field">Phạm vi xuất<select id="cScope"><option value="all"' + (cState.scope === "all" ? " selected" : "") + '>Tất cả</option><option value="answered"' + (cState.scope === "answered" ? " selected" : "") + '>Chỉ câu có Đ/A</option></select></label>' +
        '<label class="field">Chia file<select id="cSplit"><option value="0"' + (cState.splitSize === 0 ? " selected" : "") + '>Gộp 1 file</option><option value="100"' + (cState.splitSize === 100 ? " selected" : "") + '>100 câu</option><option value="200"' + (cState.splitSize === 200 ? " selected" : "") + '>200 câu</option><option value="300"' + (cState.splitSize === 300 ? " selected" : "") + '>300 câu</option></select></label>' +
      '</div>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cKeepLatex"' + (cState.keepLatex ? " checked" : "") + '> Giữ chuẩn LaTeX ($...$)</label>' +
      '<label class="check-row" style="font-size:.8rem"><input type="checkbox" id="cKeepHtml"' + (cState.keepHtml ? " checked" : "") + '> Giữ thẻ HTML (&lt;u&gt;, &lt;b&gt;, &lt;i&gt;)</label>' +
      '<p class="muted" style="font-size:.75rem;margin:4px 0 8px">Tên file: <code>UET_Master_' + dateStamp() + '.xlsx</code></p>' +
      '<div class="deck-actions">' +
        '<button type="button" class="btn btn-emerald btn-sm" style="flex:1" data-cact="exp-xlsx"' + (cState.questions.length === 0 ? " disabled" : "") + '>Xuất .xlsx</button>' +
        '<button type="button" class="btn btn-outline btn-sm" style="flex:1" data-cact="exp-csv"' + (cState.questions.length === 0 ? " disabled" : "") + '>Xuất CSV</button>' +
      '</div></section></div>';

    // 1-Click Import into Kho đề UET Master
    if (cState.questions.length > 0) {
      const mergeOpts = '<option value="">Tạo thành bộ đề mới</option>' +
        (U().can("merge") ? userDecks.map(function (d) { return '<option value="' + U().esc(d.id) + '">Gộp vào: ' + U().esc(d.title) + ' (' + d.questions.length + ' câu)</option>'; }).join("") : "");
      h += '<div class="conv-import-box">' +
        '<label class="field" style="margin:0">Tên bộ đề (1-Click Import)<input type="text" id="convDeckTitle" value="Bộ đề ' + dateStamp() + '"></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<label class="field" style="margin:0">Thẻ môn học / Tag<input type="text" id="convDeckTag" placeholder="VD: Giải tích, Tiếng Anh"></label>' +
          '<label class="field" style="margin:0">Đích lưu' + (U().can("merge") ? "" : " (Gộp cần Gold)") + '<select id="convMergeTarget">' + mergeOpts + '</select></label>' +
        '</div>' +
        '<div class="deck-actions">' +
          '<button type="button" class="btn btn-emerald" data-cact="one-click-import">⚡ Nhập thẳng vào Kho đề (' + v.valid + ' câu hợp lệ)</button>' +
          '<button type="button" class="btn btn-primary btn-sm" data-cact="send-studio">🎮 Mở trong Creator Studio</button>' +
        '</div>' +
      '</div>';
    }

    // Validation & Review Toolbar
    h += '<section class="panel"><div class="panel-head">' +
      '<div><h2>Kiểm duyệt &amp; Chỉnh sửa câu hỏi</h2>' +
      '<div class="pills" style="margin:6px 0 0">' +
        '<span class="badge">Tổng: ' + v.total + '</span>' +
        '<span class="badge badge-ok">Hợp lệ: ' + v.valid + '</span>' +
        '<span class="badge badge-warn">Thiếu Đ/A / Lỗi: ' + (v.missingAns + v.errors) + '</span>' +
        '<span class="badge badge-ok">✓ Đã kiểm tra: ' + verifiedCnt + '/' + v.total + '</span>' +
        (suspectCnt > 0 ? '<span class="badge badge-bad">⚠️ Nghi ngờ sai: ' + suspectCnt + '</span>' : "") +
      '</div></div>' +
      '<div class="deck-actions">' +
        '<div class="seg">' +
          '<button type="button" class="seg-btn' + (cState.viewMode === "table" ? " active" : "") + '" data-cact="vmode" data-val="table">Bảng nhanh</button>' +
          '<button type="button" class="seg-btn' + (cState.viewMode === "split" ? " active" : "") + '" data-cact="vmode" data-val="split">' + (U().can("splitReview") ? "" : "🔒 ") + 'Đối chiếu song song (Split-Screen)</button>' +
        '</div>' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="verify-all"' + (v.total === 0 ? " disabled" : "") + '>✓ Duyệt tất cả</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-cact="clear-all"' + (v.total === 0 ? " disabled" : "") + '>Xóa bảng</button>' +
      '</div></div>';

    h += '<div class="filter-bar">' +
      '<input type="search" id="convSearch" placeholder="Tìm theo số câu hoặc từ khóa..." value="' + U().esc(cState.search) + '" style="flex:1;min-width:200px">' +
      '<select id="convFilter">' +
        '<option value="all"' + (cState.filter === "all" ? " selected" : "") + '>Tất cả (' + v.total + ')</option>' +
        '<option value="unverified"' + (cState.filter === "unverified" ? " selected" : "") + '>Chưa duyệt (' + (v.total - verifiedCnt) + ')</option>' +
        '<option value="suspect"' + (cState.filter === "suspect" ? " selected" : "") + '>⚠️ Cảnh báo nghi ngờ sai (' + suspectCnt + ')</option>' +
        '<option value="missing"' + (cState.filter === "missing" ? " selected" : "") + '>Thiếu đáp án (' + v.missingAns + ')</option>' +
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
      h += '<div class="empty-state">Chưa có câu hỏi nào. Hãy tải tệp Ảnh, PDF, Word, Markdown/Text hoặc Excel ở Khối 1 để bắt đầu.</div>';
    } else if (cState.viewMode === "split") {
      // Split-Screen Review Mode
      const curIm = cState.images[cState.activeImgIdx];
      h += '<div class="split-review">' +
        '<div class="split-img-pane">' +
          '<div class="panel-head" style="margin:0"><strong>Ảnh đề gốc' + (cState.images.length ? (" (" + (cState.activeImgIdx + 1) + "/" + cState.images.length + ")") : "") + '</strong>' +
          '<div class="deck-actions">' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="zoom" data-val="-25">-</button>' +
            '<span class="muted" style="font-size:.78rem">' + cState.imgZoom + '%</span>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="zoom" data-val="25">+</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="img-prev"' + (cState.activeImgIdx <= 0 ? " disabled" : "") + '>←</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cact="img-next"' + (cState.activeImgIdx >= cState.images.length - 1 ? " disabled" : "") + '>→</button>' +
          '</div></div>' +
          '<div class="split-img-stage">' + (curIm ? '<img src="' + curIm.url + '" alt="Ảnh đề gốc" style="width:' + cState.imgZoom + '%">' : '<p class="muted">Chưa có ảnh đề gốc nào trong hàng đợi. Bạn có thể tải ảnh ở Khối 1 để đối chiếu song song.</p>') + '</div>' +
        '</div>' +
        '<div class="review-list">' + filtered.slice(0, 60).map(renderReviewCard).join("") + '</div>' +
      '</div>';
    } else {
      // Paginated Table View
      const totalPages = Math.max(1, Math.ceil(filtered.length / cState.perPage));
      cState.page = U().clamp(cState.page, 1, totalPages);
      const slice = filtered.slice((cState.page - 1) * cState.perPage, cState.page * cState.perPage);
      h += '<div class="table-scroll"><table class="data-table"><thead><tr><th>#</th><th>Câu hỏi (KaTeX + HTML)</th><th>Phương án</th><th>Đáp án</th><th>Giải thích</th><th>Duyệt</th><th></th></tr></thead><tbody>' +
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
              (q.suspect ? '<div class="badge badge-warn" style="margin-top:4px">⚠️ Cần kiểm tra kỹ</div>' : "") +
              (q.checkNote ? '<div class="muted" style="font-size:.74rem;margin-top:3px">' + U().esc(q.checkNote) + "</div>" : "") +
            '</td><td style="min-width:200px">' + opts + '</td>' +
            '<td style="white-space:nowrap">' + ansBtns + (q.correct.length === 0 ? '<div class="badge badge-warn" style="margin-top:4px">Thiếu Đ/A</div>' : "") + '</td>' +
            '<td class="rich-text" style="min-width:140px">' + (q.explanation ? U().renderRich(q.explanation) : '<span class="muted">—</span>') + '</td>' +
            '<td><label class="check-row" style="margin:0;font-size:.76rem"><input type="checkbox" data-cact="verify-q" data-idx="' + i + '"' + (q.verified ? " checked" : "") + '> ✓</label></td>' +
            '<td style="white-space:nowrap"><button type="button" class="btn btn-outline btn-sm" data-cact="edit-inline" data-idx="' + i + '">Sửa</button> <button type="button" class="btn btn-outline btn-sm" data-cact="del-q" data-idx="' + i + '">✕</button></td></tr>';
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
  }

  function renderReviewCard(item) {
    const q = item.q, i = item.idx;
    const ansBtns = q.options.map(function (o, k) {
      if (!o) return "";
      const ok = q.correct.indexOf(k) !== -1;
      return '<button type="button" class="btn ' + (ok ? "btn-emerald" : "btn-outline") + ' btn-sm" data-cact="toggle-ans" data-idx="' + i + '" data-opt="' + k + '">' + U().LETTERS.charAt(k) + "</button>";
    }).join(" ");
    return '<div class="review-card' + (q.verified ? " verified" : "") + (q.suspect ? " suspect" : "") + '">' +
      '<div class="review-card-head"><strong>Câu #' + (i + 1) + (q.suspect ? ' <span class="badge badge-warn">⚠️ Cần kiểm tra kỹ</span>' : "") + '</strong>' +
      '<label class="check-row" style="margin:0;font-size:.8rem"><input type="checkbox" data-cact="verify-q" data-idx="' + i + '"' + (q.verified ? " checked" : "") + '> ✓ Đã duyệt (Verified)</label></div>' +
      '<div class="rich-text" style="font-weight:700">' + U().renderRich(q.text) + '</div>' +
      '<textarea class="inline-edit-input" rows="2" data-cedit="text" data-idx="' + i + '" aria-label="Sửa nội dung câu hỏi">' + U().esc(q.text) + '</textarea>' +
      q.options.map(function (o, k) {
        if (!o && k >= 4) return "";
        return '<div style="display:flex;align-items:center;gap:6px"><strong style="width:18px">' + U().LETTERS.charAt(k) + '.</strong>' +
          '<input type="text" class="inline-edit-input" data-cedit="opt" data-idx="' + i + '" data-opt="' + k + '" value="' + U().esc(o) + '" placeholder="Phương án ' + U().LETTERS.charAt(k) + '"></div>';
      }).join("") +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="muted" style="font-size:.78rem">Đáp án đúng:</span>' + ansBtns + '</div>' +
      '<input type="text" class="inline-edit-input" data-cedit="exp" data-idx="' + i + '" value="' + U().esc(q.explanation) + '" placeholder="Giải thích đáp án...">' +
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
        '<h3>Chỉnh sửa câu #' + (idx + 1) + '</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field">Nội dung (LaTeX &amp; HTML)<textarea id="ceText" rows="4">' + U().esc(q.text) + '</textarea></label>' +
          '<div class="field"><span>Xem trước trực quan</span><div id="cePrev" class="rich-text" style="padding:10px;border:1px solid var(--border);border-radius:10px;min-height:92px;background:var(--bg2)">' + U().renderRich(q.text) + '</div></div>' +
        '</div>' +
        [0, 1, 2, 3, 4].map(function (k) {
          return '<div style="display:flex;align-items:center;gap:8px;margin:6px 0">' +
            '<input type="checkbox" id="ceC_' + k + '"' + (q.correct.indexOf(k) !== -1 ? " checked" : "") + '>' +
            '<strong>' + U().LETTERS.charAt(k) + '</strong>' +
            '<input type="text" id="ceO_' + k + '" class="inline-edit-input" value="' + U().esc(q.options[k] || "") + '" placeholder="Phương án ' + U().LETTERS.charAt(k) + '">' +
          '</div>';
        }).join("") +
        '<label class="field">Giải thích<textarea id="ceExp" rows="2">' + U().esc(q.explanation) + '</textarea></label>' +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" id="ceCancel">Hủy</button><button type="button" class="btn btn-primary" id="ceSave">Lưu</button></div>' +
      '</div></div>';
    U().on("ceText", "input", function (e) { U().setHTML("cePrev", U().renderRich(e.target.value)); });
    U().on("ceCancel", "click", function () { host.innerHTML = ""; });
    U().on("ceSave", "click", function () {
      const txt = U().$("ceText").value.trim();
      if (!txt) { U().showToast("Thiếu nội dung câu hỏi.", "warning"); return; }
      const rawOpts = [0, 1, 2, 3, 4].map(function (k) { return U().$("ceO_" + k).value.trim(); });
      const opts = ["", "", "", "", ""];
      const corr = [];
      let ni = 0;
      rawOpts.forEach(function (val, k) {
        if (val) { opts[ni] = val; if (U().$("ceC_" + k).checked) corr.push(ni); ni++; }
      });
      if (ni < 2) { U().showToast("Cần ít nhất 2 phương án.", "warning"); return; }
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
      if (!raw || cState.questions.length === 0) { U().showToast("Cần có câu hỏi và danh sách đáp án.", "warning"); return; }
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
      U().showToast(n > 0 ? ("Đã áp dụng đáp án cho " + n + " câu.") : "Không khớp định dạng đáp án.", n > 0 ? "success" : "warning");
    }
    else if (act === "solve-missing") runBatchSolve(false);
    else if (act === "double-check") runDoubleCheck();
    else if (act === "exp-xlsx") doExport("xlsx", false);
    else if (act === "exp-csv") doExport("csv", false);
    else if (act === "one-click-import") doOneClickImport();
    else if (act === "send-studio") {
      const v = validateAll();
      if (v.valid === 0) { U().showToast("Chưa có câu hỏi hợp lệ để mở trong Creator Studio.", "warning"); return; }
      if (window.UETStudio && typeof window.UETStudio.openFromQuestions === "function") {
        const title = (U().$("convDeckTitle") ? U().$("convDeckTitle").value : "").trim() || ("Quiz " + dateStamp());
        window.UETStudio.openFromQuestions(title, "UET Converter", v.validItems);
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
    else if (act === "verify-all") { cState.questions.forEach(function (q) { q.verified = true; q.suspect = false; }); renderConverter(); U().showToast("Đã đánh dấu duyệt tất cả câu hỏi.", "success"); }
    else if (act === "clear-all") { U().showConfirm("Xóa bảng", "Xóa toàn bộ câu hỏi trong UET Converter?", function () { cState.questions = []; renderConverter(); }); }
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
