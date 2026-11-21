const GOOGLE_CLIENT_ID = "480927164540-o3o4h9v5vmi8h93605ridg4eqvtf5rcf.apps.googleusercontent.com";

/* ============================================================
   AI Tutor – Core Application (app.js)
   ============================================================ */
const ADMIN_EMAIL = "phamduchieurobotics@gmail.com";
const ADMIN_EMAILS = ["phamduchieurobotics@gmail.com", "phamduchieu.robotics@gmail.com"];
function normalizeGmail(email) {
  const e = String(email || "").trim().toLowerCase();
  const parts = e.split("@");
  if (parts.length === 2 && (parts[1] === "gmail.com" || parts[1] === "googlemail.com")) {
    return parts[0].replace(/\./g, "") + "@gmail.com";
  }
  return e;
}
const isAdminUser = (email) => normalizeGmail(email) === "phamduchieurobotics@gmail.com";
const DEFAULT_PAYMENT_CONFIG = {
  bankName: "MBV Bank",
  bankId: "970414",
  accountNo: "31122007",
  accountName: "PHAM DUC HIEU"
};
const KEYS = {
  auth: "uet_master_auth",
  decks: "uet_master_decks",
  progress: "uet_master_progress",
  mistakes: "uet_master_mistakes",
  history: "uet_master_history",
  stats: "uet_master_stats",
  theme: "uet_master_theme",
  font: "uet_master_font",
  pins: "uet_master_pins",
  subs: "uet_master_subscriptions",
  payReqs: "uet_master_payment_requests",
  payCfg: "uet_master_payment_config",
  vouchers: "uet_master_vouchers",
  profiles: "uet_master_profiles",
  apiKey: "uet_master_gemini_key",
  apiModel: "uet_master_gemini_model",
  userApis: "uet_master_user_apis",
  lang: "uet_master_lang",
  quizzes: "uet_master_studio_quizzes"
};
const XLSX_HEADERS = [
  "Question Text", "Question Type", "Option 1", "Option 2", "Option 3", "Option 4",
  "Option 5", "Correct Answer", "Time in seconds", "Image Link", "Answer explanation"
];
const LETTERS = "ABCDE";
const MODE_LABEL = { practice: "Ôn tập", exam: "Thi thử", mistake: "Sổ tay câu hay sai" };
const FONT_MIN = 15, FONT_MAX = 24, FONT_DEFAULT = 17;
const PAGE_SIZE = 5;
const RING_C = 2 * Math.PI * 52;
const CHART_COLORS = ["#5347CD", "#887CFD", "#4896FE", "#16C8C7"];
const DAY_MS = 86400000;

/* 5-Tier Rank System (Arena of Valor inspired) */
const TIER_ORDER = ["none", "unranked", "bronze", "silver", "gold", "diamond"];
const TIERS = {
  none: { name: "Chưa xếp hạng", full: "Chưa đăng ký", sub: "Đăng ký Unranked 0đ để bắt đầu", price: 0, maxDecks: 3, maxQ: 50, maxImages: 5, memo: "UNRANKED", icon: "🛡️", cls: "rank-unranked" },
  unranked: { name: "Unranked", full: "Unranked (Chưa xếp hạng)", sub: "Miễn phí trọn đời • Kích hoạt ngay", price: 0, maxDecks: 3, maxQ: 50, maxImages: 5, memo: "UNRANKED", icon: "🛡️", cls: "rank-unranked" },
  bronze: { name: "Bronze", full: "Bronze (Đồng)", sub: "Thanh toán → Chờ Admin duyệt", price: 100000, maxDecks: 15, maxQ: 200, maxImages: 20, memo: "BRONZE", icon: "🥉", cls: "rank-bronze" },
  silver: { name: "Silver", full: "Silver (Bạc)", sub: "Thanh toán → Chờ Admin duyệt", price: 200000, maxDecks: 50, maxQ: 500, maxImages: 50, memo: "SILVER", icon: "🥈", cls: "rank-silver" },
  gold: { name: "Gold", full: "Gold (Vàng)", sub: "Phổ biến nhất • Chờ Admin duyệt", price: 300000, maxDecks: Infinity, maxQ: Infinity, maxImages: 100, memo: "GOLD", icon: "🥇", cls: "rank-gold" },
  diamond: { name: "Diamond", full: "Diamond (Kim Cương)", sub: "Toàn quyền VIP • Chờ Admin duyệt", price: 500000, maxDecks: Infinity, maxQ: Infinity, maxImages: 200, memo: "DIAMOND", icon: "💎", cls: "rank-diamond" }
};
const FEATURE_MIN = {
  mistake: 2,        // Bronze+
  exam: 2,           // Bronze+
  exportData: 2,     // Bronze+
  studioAdv: 3,      // Silver+ (Streak, Redemption, per-Q time, shuffle)
  shuffle: 3,        // Silver+
  aiExplain: 3,      // Silver+
  splitReview: 3,    // Silver+
  merge: 4,          // Gold+
  doubleCheck: 4,    // Gold+
  chunk: 4,          // Gold+
  proAi: 5,          // Diamond
  backupSync: 5      // Diamond
};
const FEATURE_NAME = {
  mistake: "Sổ tay câu hay sai (Làm lại câu sai)",
  exam: "Thi thử chuẩn phòng thi & Lịch sử luyện đề",
  exportData: "Xuất bộ đề .json / .xlsx không giới hạn",
  studioAdv: "Creator Studio nâng cao (Streak, Redemption, thời gian từng câu, đảo đề)",
  shuffle: "Đảo thứ tự câu hỏi / đáp án",
  aiExplain: "AI giải thích đáp án",
  splitReview: "Chế độ kiểm duyệt song song (Split-Screen Review)",
  merge: "Gộp thêm vào bộ đề có sẵn khi Import",
  doubleCheck: "AI Kiểm tra chéo đáp án (Double-Check) hàng loạt",
  chunk: "Chia nhỏ chặng học",
  proAi: "Chế độ AI Chính xác cao ưu tiên (Gemini Pro)",
  backupSync: "Xuất báo cáo thống kê chi tiết & Sao lưu Kho đề"
};
const PRICING_FEATURES = {
  unranked: [
    "Lưu tối đa 3 bộ đề trong Kho đề, tối đa 50 câu/bộ đề",
    "Làm bài luyện tập cơ bản & xem thống kê điểm số",
    "Dùng Creator/Quiz Studio cơ bản (tạo & làm bài)",
    "Dùng AI Converter (tối đa 5 ảnh/lần, dùng Gemini API Key cá nhân)"
  ],
  bronze: [
    "Toàn bộ quyền lợi gói Unranked",
    "Lưu tối đa 15 bộ đề, tối đa 200 câu/bộ đề",
    "AI Converter tối đa 20 ảnh/lần + xuất file Excel chuẩn không giới hạn",
    "Mở khóa Làm lại câu sai (Sổ tay sai), Thi thử & Lịch sử luyện đề"
  ],
  silver: [
    "Toàn bộ quyền lợi gói Bronze",
    "Lưu tối đa 50 bộ đề, tối đa 500 câu/bộ đề",
    "Mở khóa Creator/Quiz Studio nâng cao (Streak, Redemption, thời gian từng câu, đảo đề)",
    "Hỗ trợ AI giải thích đáp án & Chế độ kiểm duyệt song song (Split-Screen Review)"
  ],
  gold: [
    "Toàn bộ quyền lợi gói Silver",
    "Không giới hạn số lượng bộ đề & số câu hỏi",
    "Mở khóa Gộp thêm vào bộ đề có sẵn khi Import",
    "Mở khóa AI Kiểm tra chéo đáp án (Double-Check) hàng loạt & lọc câu nghi ngờ sai"
  ],
  diamond: [
    "Toàn bộ quyền lợi gói Gold (không giới hạn mọi tính năng)",
    "Ưu tiên chế độ AI Chính xác cao cho đề Toán/Lý/Hóa/Tiếng Anh phức tạp",
    "Xuất báo cáo thống kê học tập chi tiết & sao lưu/đồng bộ Kho đề",
    "Huy hiệu Diamond VIP nổi bật trên hồ sơ & hỗ trợ ưu tiên 1-1"
  ]
};

const state = {
  user: null,
  backendOnline: false,
  tab: "dashboard",
  decks: [],
  manifestDecks: [],
  filterTag: "all",
  deckQuery: "",
  deckPage: 1,
  histQuery: "",
  histPage: 1,
  chartRange: "week",
  session: null,
  timerId: null,
  flash: null,
  palFilter: null,
  importResult: null,
  pending: null,
  confirmCb: null,
  checkout: null,
  rejectReqId: null,
  adminTab: "requests",
  adminStatusFilter: "all",
  adminPlanFilter: "all",
  adminQuery: ""
};

/* ------------------------------ Utilities ------------------------------ */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function sanitizeAllowedHtml(raw) {
  let s = esc(raw);
  s = s.replace(/&lt;(\/?)(u|b|i|strong|em|sup|sub)&gt;/gi, "<$1$2>");
  s = s.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
  return s;
}
function renderRich(raw) {
  const str = String(raw === null || raw === undefined ? "" : raw);
  if (!str) return "";
  const tokens = [];
  const replaced = str.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, function (match, blockTex, inlineTex) {
    const idx = tokens.length;
    const isBlock = blockTex !== undefined;
    const tex = (isBlock ? blockTex : inlineTex).trim();
    let html = "";
    if (typeof katex !== "undefined" && typeof katex.renderToString === "function") {
      try {
        html = katex.renderToString(tex, { displayMode: isBlock, throwOnError: false, strict: false });
      } catch (e) { html = "<code>" + esc(match) + "</code>"; }
    } else {
      html = "<code>" + esc(match) + "</code>";
    }
    tokens.push(html);
    return "%%KATEX_" + idx + "%%";
  });
  let safe = sanitizeAllowedHtml(replaced).replace(/\n/g, "<br>");
  safe = safe.replace(/%%KATEX_(\d+)%%/g, function (_, i) { return tokens[Number(i)] || ""; });
  return safe;
}
function setText(id, t) { const el = $(id); if (el) el.textContent = t; }
function setHTML(id, h) { const el = $(id); if (el) el.innerHTML = h; }
function toggleEl(id, show) { const el = $(id); if (el) el.classList.toggle("hidden", !show); }
function on(id, evt, fn) { const el = $(id); if (el) el.addEventListener(evt, fn); }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function fmtMoney(n) { return Number(n || 0).toLocaleString("vi-VN") + "đ"; }
function fmtDate(v) {
  try { const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN"); } catch (e) { return ""; }
}
function fmtDateTime(v) {
  try { const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN"); } catch (e) { return ""; }
}

function loadJSON(key, fb) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fb;
    const v = JSON.parse(raw);
    return v === null || v === undefined ? fb : v;
  } catch (e) { return fb; }
}
function loadObj(key) { const v = loadJSON(key, {}); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function loadArr(key) { const v = loadJSON(key, []); return Array.isArray(v) ? v : []; }
const SYNCED_KEYS = [KEYS.decks, KEYS.mistakes, KEYS.history, KEYS.quizzes, KEYS.progress, KEYS.stats, KEYS.pins, KEYS.profiles];
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (state.user && SYNCED_KEYS.indexOf(key) !== -1 && window.UETCloud && window.UETCloud.cloudStorageService) {
      window.UETCloud.cloudStorageService.scheduleSync();
    }
    return true;
  } catch (e) { showToast("Không thể lưu dữ liệu vào trình duyệt (bộ nhớ đầy hoặc bị chặn).", "error"); return false; }
}
function removeKey(key) { try { localStorage.removeItem(key); } catch (e) { /* bỏ qua */ } }

function showToast(msg, type, action) {
  const box = $("toastContainer");
  if (!box) return;
  const t = document.createElement("div");
  t.className = "toast " + (type || "info");
  const sp = document.createElement("span");
  sp.textContent = msg;
  t.appendChild(sp);
  if (action && action.label && typeof action.onClick === "function") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast-act";
    btn.textContent = action.label;
    btn.addEventListener("click", function () { action.onClick(); if (t.parentNode) t.parentNode.removeChild(t); });
    t.appendChild(btn);
  }
  box.appendChild(t);
  setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, action ? 6500 : 4200);
}
function anyModalOpen() { return !!document.querySelector(".modal-overlay:not(.hidden)"); }
function openModal(id) { const m = $(id); if (!m) return; m.classList.remove("hidden"); document.body.classList.add("modal-open"); }
function closeModal(id) { const m = $(id); if (m) m.classList.add("hidden"); if (!anyModalOpen()) document.body.classList.remove("modal-open"); }
function showConfirm(title, msg, onConfirm, okLabel) {
  setText("confirmTitle", title);
  setText("confirmMsg", msg);
  setText("confirmOk", okLabel || "Xác nhận");
  state.confirmCb = typeof onConfirm === "function" ? onConfirm : null;
  openModal("confirmModal");
}
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function downloadBlob(blob, filename) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  } catch (e) { showToast("Không thể tải file xuống.", "error"); }
}
function fileSafe(name) { return String(name || "de").replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 80) || "de"; }

function paginate(arr, page) {
  const pages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
  const p = clamp(page, 1, pages);
  return { items: arr.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), page: p, pages: pages };
}
function renderPager(id, key, page, pages) {
  let h = '<button type="button" data-pager="' + key + '" data-page="' + (page - 1) + '"' + (page <= 1 ? " disabled" : "") + ' aria-label="Trang trước">&lt;</button>';
  for (let i = 1; i <= pages; i++) {
    h += '<button type="button" data-pager="' + key + '" data-page="' + i + '" class="' + (i === page ? "active" : "") + '">' + i + "</button>";
  }
  h += '<button type="button" data-pager="' + key + '" data-page="' + (page + 1) + '"' + (page >= pages ? " disabled" : "") + ' aria-label="Trang sau">&gt;</button>';
  setHTML(id, h);
}

/* ------------------------------ Optional Local Backend Sync ------------------------------ */
function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (state.user) {
    if (state.user.credential) h["Authorization"] = "Bearer " + state.user.credential;
    h["X-User-Email"] = state.user.email;
  }
  return h;
}
async function apiCall(path, method, body) {
  try {
    const res = await fetch(path, {
      method: method || "GET",
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    const ct = String((res.headers && res.headers.get && res.headers.get("content-type")) || "").toLowerCase();
    // If static host rewrote /api/* to HTML or returned 404 / 405 / 5xx, fall back gracefully to localStorage
    if (res.status === 404 || res.status === 405 || res.status >= 500 || ct.indexOf("application/json") === -1) {
      state.backendOnline = false;
      return null;
    }
    const data = await res.json().catch(function () { return null; });
    if (!data) {
      state.backendOnline = false;
      return null;
    }
    state.backendOnline = true;
    if (!res.ok) return { _err: data.error || ("HTTP " + res.status), _status: res.status };
    return data;
  } catch (e) {
    state.backendOnline = false;
    return null;
  }
}

function mergeRemoteBillingSnap(snap) {
  if (!snap || snap._err) return false;
  let changed = false;
  const revoked = (snap.revokedSubscriptions && typeof snap.revokedSubscriptions === "object") ? snap.revokedSubscriptions : {};
  const delVouchers = (snap.deletedVouchers && typeof snap.deletedVouchers === "object") ? snap.deletedVouchers : {};

  if (snap.subscriptions && typeof snap.subscriptions === "object") {
    const localSubs = loadObj(KEYS.subs);
    const mergedSubs = Object.assign({}, localSubs);
    Object.keys(revoked).forEach(function (em) {
      const k = String(em || "").toLowerCase();
      if (mergedSubs[k] && (Number(mergedSubs[k].since) || 0) <= Number(revoked[em])) {
        delete mergedSubs[k];
        changed = true;
      }
    });
    Object.keys(snap.subscriptions).forEach(function (em) {
      const k = String(em || "").toLowerCase();
      const s = snap.subscriptions[em];
      if (s && typeof s === "object" && s.tier) {
        if (!mergedSubs[k] || JSON.stringify(mergedSubs[k]) !== JSON.stringify(s)) {
          mergedSubs[k] = s;
          changed = true;
        }
      }
    });
    saveJSON(KEYS.subs, mergedSubs);
  }

  if (Array.isArray(snap.payment_requests)) {
    const localReqs = loadArr(KEYS.payReqs);
    const map = {};
    localReqs.forEach(function (r) { if (r && r.id) map[r.id] = r; });
    snap.payment_requests.forEach(function (r) {
      if (!r || !r.id) return;
      const cur = map[r.id];
      if (!cur || (cur.status === "pending" && r.status !== "pending") || JSON.stringify(cur) !== JSON.stringify(r)) {
        map[r.id] = r;
        changed = true;
      }
    });
    const mergedReqs = Object.keys(map).map(function (id) { return map[id]; }).sort(function (a, b) {
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
    saveJSON(KEYS.payReqs, mergedReqs);
  }

  if (snap.paymentConfig && typeof snap.paymentConfig === "object" && snap.paymentConfig.accountNo) {
    saveJSON(KEYS.payCfg, snap.paymentConfig);
  }

  if (Array.isArray(snap.vouchers)) {
    const localVouchers = loadArr(KEYS.vouchers).filter(function (v) {
      return v && v.code && !delVouchers[String(v.code).toUpperCase()];
    });
    const vMap = {};
    localVouchers.forEach(function (v) { vMap[String(v.code).toUpperCase()] = { code: String(v.code).toUpperCase(), discountPercent: Number(v.discountPercent) }; });
    snap.vouchers.forEach(function (v) {
      if (v && v.code && !delVouchers[String(v.code).toUpperCase()]) {
        vMap[String(v.code).toUpperCase()] = { code: String(v.code).toUpperCase(), discountPercent: Number(v.discountPercent) };
      }
    });
    const mergedVouchers = Object.keys(vMap).map(function (c) { return vMap[c]; });
    if (JSON.stringify(loadArr(KEYS.vouchers)) !== JSON.stringify(mergedVouchers)) changed = true;
    saveJSON(KEYS.vouchers, mergedVouchers);
  }

  if (snap.userApis && typeof snap.userApis === "object") {
    const revApis = (snap.revokedUserApis && typeof snap.revokedUserApis === "object") ? snap.revokedUserApis : {};
    const localApis = loadObj(KEYS.userApis);
    const mergedApis = Object.assign({}, localApis);
    Object.keys(revApis).forEach(function (em) {
      const k = String(em || "").toLowerCase();
      if (mergedApis[k] && (Number(mergedApis[k].ts) || 0) <= Number(revApis[em])) {
        delete mergedApis[k];
        changed = true;
      }
    });
    Object.keys(snap.userApis).forEach(function (em) {
      const k = String(em || "").toLowerCase();
      const item = snap.userApis[em];
      if (item && typeof item === "object" && item.apiKey) {
        if (!mergedApis[k] || JSON.stringify(mergedApis[k]) !== JSON.stringify(item)) {
          mergedApis[k] = item;
          changed = true;
        }
      }
    });
    saveJSON(KEYS.userApis, mergedApis);
  }
  return changed;
}

async function syncWithBackend() {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const ct = String((res.headers && res.headers.get && res.headers.get("content-type")) || "").toLowerCase();
    if (!res.ok || ct.indexOf("application/json") === -1) {
      state.backendOnline = false;
      return false;
    }
    const health = await res.json().catch(function () { return null; });
    if (!health || health.ok !== true) {
      state.backendOnline = false;
      return false;
    }
    state.backendOnline = true;
    const payload = {
      subscriptions: loadObj(KEYS.subs),
      payment_requests: loadArr(KEYS.payReqs),
      vouchers: loadArr(KEYS.vouchers),
      paymentConfig: isAdmin() ? loadObj(KEYS.payCfg) : undefined,
      userApis: isAdmin() ? loadObj(KEYS.userApis) : undefined
    };
    const snap = await apiCall("/api/billing/sync", "POST", payload) || await apiCall("/api/billing/state", "GET");
    return mergeRemoteBillingSnap(snap);
  } catch (e) {
    state.backendOnline = false;
    return false;
  }
}

function getAssignedApiForEmail(email) {
  const em = String(email || "").trim().toLowerCase();
  if (!em) return null;
  const all = loadObj(KEYS.userApis);
  const item = all[em];
  return (item && typeof item === "object" && item.apiKey) ? item : null;
}
function getActiveUserAssignedApi() {
  return (state.user && state.user.email) ? getAssignedApiForEmail(state.user.email) : null;
}

/* ------------------------------ Tiers & Rank Enforcement ------------------------------ */
function isAdmin() {
  return !!(state.user && isAdminUser(state.user.email));
}
function assertAdmin() {
  if (!isAdmin()) {
    showToast("Truy cập bị từ chối! Chỉ tài khoản quản trị phamduchieurobotics@gmail.com mới có quyền thực hiện thao tác này.", "error");
    return false;
  }
  return true;
}
function getActiveSub(email) {
  const s = loadObj(KEYS.subs)[String(email || "").trim().toLowerCase()];
  if (!s || typeof s !== "object") return null;
  const rank = TIER_ORDER.indexOf(s.tier);
  if (rank < 1) return null;
  if (s.tier === "unranked") return s;
  if (!(Number(s.expires) > Date.now())) return null;
  return s;
}
function currentTier() {
  if (!state.user) return "none";
  if (isAdmin()) {
    const s = getActiveSub(state.user.email);
    return s ? s.tier : "diamond";
  }
  const s = getActiveSub(state.user.email);
  return s ? s.tier : "none";
}
function tierRank() { return TIER_ORDER.indexOf(currentTier()); }
function effectiveLimits() {
  if (isAdmin()) return TIERS.diamond;
  const t = currentTier();
  return TIERS[t] || TIERS.unranked;
}
function can(feature) {
  if (isAdmin()) return true;
  const req = FEATURE_MIN[feature];
  if (req === undefined) return true;
  return tierRank() >= req;
}
function promptUpgrade(msg) {
  showConfirm("Nâng cấp hạng gói", msg + " Bạn có muốn xem các gói nâng cấp không?", function () { showTab("pricing"); }, "Xem gói nâng cấp");
}
function requireFeature(feature) {
  if (can(feature)) return true;
  const minRank = FEATURE_MIN[feature] || 2;
  const minTierName = TIERS[TIER_ORDER[minRank]] ? TIERS[TIER_ORDER[minRank]].name : "cao hơn";
  promptUpgrade("Tính năng \"" + FEATURE_NAME[feature] + "\" yêu cầu gói " + minTierName + " trở lên.");
  return false;
}

/* ------------------------------ Authentication ------------------------------ */
function decodeJwtPayload(token) {
  try {
    if (typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const json = decodeURIComponent(atob(b64).split("").map(function (c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(""));
    return JSON.parse(json);
  } catch (e) { return null; }
}
function isValidEmail(email) { return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()); }
function showLoginError(msg) { const b = $("loginError"); if (b) { b.textContent = msg; b.classList.remove("hidden"); } }
function hideLoginError() { toggleEl("loginError", false); }

function handleGoogleLogin(response) {
  try {
    const cred = response && response.credential;
    const payload = decodeJwtPayload(cred);
    if (payload && payload.email_verified === true && typeof payload.email === "string" && payload.email.trim().length > 0) {
      const user = {
        uid: payload.sub || payload.email.trim().toLowerCase(),
        email: payload.email.trim().toLowerCase(),
        name: typeof payload.name === "string" && payload.name ? payload.name : payload.email,
        picture: typeof payload.picture === "string" ? payload.picture : "",
        exp: typeof payload.exp === "number" ? payload.exp : Math.floor(Date.now() / 1000) + 3600,
        credential: cred
      };
      saveJSON(KEYS.auth, user);
      hideLoginError();
      onAuthenticated(user);
    } else {
      showLoginError("Đăng nhập thất bại! Tài khoản Google chưa được xác minh email. Vui lòng thử lại bằng tài khoản khác.");
    }
  } catch (e) { showLoginError("Đăng nhập thất bại. Vui lòng thử lại."); }
}

function loadStoredAuth() {
  const u = loadJSON(KEYS.auth, null);
  if (!u || typeof u !== "object") return null;
  if (!isValidEmail(u.email)) { removeKey(KEYS.auth); return null; }
  if (typeof u.exp !== "number" || u.exp * 1000 <= Date.now()) { removeKey(KEYS.auth); return null; }
  return {
    uid: u.uid || u.email.trim().toLowerCase(),
    email: u.email.trim().toLowerCase(),
    name: u.name || u.email,
    picture: u.picture || "",
    exp: u.exp,
    credential: u.credential || ""
  };
}

function initGoogle() {
  let tries = 0;
  const timer = setInterval(function () {
    tries++;
    if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
      clearInterval(timer);
      try {
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleLogin, auto_select: false });
        const wrap = $("googleBtnWrap");
        if (wrap) google.accounts.id.renderButton(wrap, { theme: "outline", size: "large", text: "signin_with", locale: "vi", width: 280 });
      } catch (e) { showLoginError("Không thể khởi tạo đăng nhập Google. Vui lòng tải lại trang."); }
    } else if (tries > 100) {
      clearInterval(timer);
      showLoginError("Không tải được dịch vụ đăng nhập Google. Vui lòng kiểm tra kết nối mạng và tải lại trang.");
    }
  }, 100);
}

function closeDropdown() {
  toggleEl("userDropdown", false);
  const b = $("userMenuBtn"); if (b) b.setAttribute("aria-expanded", "false");
}
function closeDrawer() {
  toggleEl("mobileDrawer", false);
  toggleEl("drawerBackdrop", false);
  const b = $("hamburgerBtn"); if (b) b.setAttribute("aria-expanded", "false");
}
function enterGuestShareMode() {
  toggleEl("loginView", false);
  toggleEl("appShell", true);
  toggleEl("navTabs", true);
  toggleEl("hamburgerBtn", true);
  updateChrome();
}

function onAuthenticated(user) {
  state.user = user;
  renderUserChrome();
  toggleEl("userChip", true);
  toggleEl("navTabs", true);
  toggleEl("hamburgerBtn", true);
  toggleEl("syncStatusChip", true);
  toggleEl("tierBadge", true);
  toggleEl("loginView", false);
  toggleEl("appShell", true);
  updateChrome();
  const initialPath = (window.location.pathname || "/") + (window.location.search || "");
  navigateTo(initialPath, { replace: true });
  initAppData();
}

function logout() {
  stopTimer();
  closeDropdown();
  closeDrawer();
  state.session = null; state.flash = null; state.user = null; state.checkout = null;
  state.decks = []; state.manifestDecks = [];
  removeKey(KEYS.auth);
  try { if (typeof google !== "undefined" && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) { /* bỏ qua */ }
  ["userChip", "navTabs", "hamburgerBtn", "syncStatusChip", "tierBadge", "appShell"].forEach(function (id) { toggleEl(id, false); });
  toggleEl("loginView", true);
  hideLoginError();
  document.title = "Đăng nhập | AI Tutor";
  ["configModal", "importModal", "checkoutModal", "profileModal", "confirmModal", "rejectModal", "receiptModal"].forEach(closeModal);
}

/* ------------------------------ Data & Decks ------------------------------ */
function normalizeQuestion(q, i) {
  try {
    if (!q || typeof q !== "object") return null;
    const text = String(q.text === undefined || q.text === null ? "" : q.text).trim();
    if (!text || !Array.isArray(q.options)) return null;
    const options = q.options.map(function (o) { return String(o === null || o === undefined ? "" : o).trim(); }).filter(Boolean);
    if (options.length < 2 || options.length > 5) return null;
    let correct = Array.isArray(q.correct) ? q.correct.map(Number) : [];
    correct = Array.from(new Set(correct)).sort(function (a, b) { return a - b; });
    if (correct.length === 0 || correct.some(function (c) { return !Number.isInteger(c) || c < 0 || c >= options.length; })) return null;
    const t = parseInt(q.time, 10);
    return {
      id: q.id !== undefined && q.id !== null && String(q.id) ? String(q.id) : "q_" + Date.now() + "_" + i,
      text: text,
      type: q.type === "multiple" || String(q.type || "").toLowerCase() === "checkbox" || correct.length > 1 ? "multiple" : "single",
      options: options,
      correct: correct,
      time: t >= 0 && !isNaN(t) ? (t === 0 ? 0 : t) : 30,
      image: typeof q.image === "string" ? q.image.trim() : "",
      explanation: typeof q.explanation === "string" ? q.explanation.trim() : ""
    };
  } catch (e) { return null; }
}
function normalizeDeck(d, idx) {
  try {
    if (!d || typeof d !== "object" || !Array.isArray(d.questions)) return null;
    const questions = d.questions.map(normalizeQuestion).filter(Boolean);
    if (questions.length === 0) return null;
    return {
      id: d.id !== undefined && d.id !== null && String(d.id) ? String(d.id) : "deck_" + idx,
      title: String(d.title || "Bộ đề không tên"),
      tag: String(d.tag || "Chưa phân loại"),
      isBuiltIn: false,
      questions: questions
    };
  } catch (e) { return null; }
}
function getUserDecks() { return loadArr(KEYS.decks).map(normalizeDeck).filter(Boolean); }

function rebuildDecks() {
  const seen = {}, result = [];
  const push = function (d, kind) { if (!d || seen[d.id]) return; seen[d.id] = true; d.kind = kind; result.push(d); };
  state.manifestDecks.forEach(function (d) { push(d, "manifest"); });
  getUserDecks().forEach(function (d) { push(d, "user"); });
  state.decks = result;
}
function getDeck(id) {
  for (let i = 0; i < state.decks.length; i++) if (state.decks[i].id === id) return state.decks[i];
  return null;
}

async function initAppData() {
  rebuildDecks();
  renderTab();
  if (!state.user) return;
  await syncWithBackend();
  if (window.UETCloud && window.UETCloud.cloudStorageService) {
    await window.UETCloud.cloudStorageService.pull();
  }
  try {
    const res = await fetch("/data/manifest.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.decks) ? data.decks : []);
    state.manifestDecks = list.map(normalizeDeck).filter(Boolean);
  } catch (e) { state.manifestDecks = []; }
  if (!state.user) return;
  rebuildDecks();
  renderTab();
}

function getPins() { return loadArr(KEYS.pins).map(String); }
function getStats() {
  const s = loadObj(KEYS.stats);
  return {
    attempts: Number.isFinite(s.attempts) ? s.attempts : 0,
    correct: Number.isFinite(s.correct) ? s.correct : 0,
    decks: s.decks && typeof s.decks === "object" && !Array.isArray(s.decks) ? s.decks : {}
  };
}
function deckProgressPct(deckId) {
  const p = loadObj(KEYS.progress)[deckId];
  if (!p || !Array.isArray(p.sessionQuestions) || p.sessionQuestions.length === 0) return 0;
  const done = p.submitted && typeof p.submitted === "object" ? Object.keys(p.submitted).length : 0;
  return clamp(Math.round(done / p.sessionQuestions.length * 100), 0, 100);
}
function isResumable(deckId) {
  const p = loadObj(KEYS.progress)[deckId];
  if (!p || !Array.isArray(p.sessionQuestions) || p.sessionQuestions.length === 0) return null;
  const done = p.submitted && typeof p.submitted === "object" ? Object.keys(p.submitted).length : 0;
  if (done >= p.sessionQuestions.length) return null;
  const valid = p.sessionQuestions.every(function (q) { return q && typeof q.text === "string" && Array.isArray(q.options) && Array.isArray(q.correct); });
  return valid ? { done: done, total: p.sessionQuestions.length } : null;
}
function mistakeCount() { return Object.keys(loadObj(KEYS.mistakes)).length; }

/* ------------------------------ SPA Router (History API) ------------------------------ */
const ROUTES = {
  "/": { tab: "dashboard", title: "Tổng quan | AI Tutor" },
  "/dashboard": { tab: "dashboard", title: "Tổng quan | AI Tutor" },
  "/practice": { tab: "study", title: "Ôn tập & Thi | AI Tutor" },
  "/practice/session": { tab: "study", sub: "session", title: "Đang làm bài | AI Tutor" },
  "/creator-studio": { tab: "studio", sub: "home", title: "Creator Studio | AI Tutor" },
  "/creator-studio/editor": { tab: "studio", sub: "editor", title: "Trình soạn thảo Quiz | AI Tutor" },
  "/creator-studio/lobby": { tab: "studio", sub: "lobby", title: "Cài đặt Quiz | AI Tutor" },
  "/creator-studio/play": { tab: "studio", sub: "play", title: "Đang chơi Quiz | AI Tutor" },
  "/creator-studio/summary": { tab: "studio", sub: "summary", title: "Tổng kết Quiz | AI Tutor" },
  "/converter": { tab: "converter", sub: "upload", title: "AI Converter | AI Tutor" },
  "/converter/image": { tab: "converter", sub: "upload", title: "AI Converter | AI Tutor" },
  "/converter/markdown": { tab: "converter", sub: "upload", title: "AI Converter | AI Tutor" },
  "/converter/excel": { tab: "converter", sub: "upload", title: "AI Converter | AI Tutor" },
  "/converter/review": { tab: "converter", sub: "split", title: "Kiểm duyệt song song | AI Tutor" },
  "/flashcards": { tab: "flash", title: "Lật thẻ | AI Tutor" },
  "/flashcards/play": { tab: "flash", sub: "play", title: "Đang học Lật thẻ | AI Tutor" },
  "/mistakes": { tab: "mistake", title: "Sổ tay câu hay sai | AI Tutor" },
  "/profile": { tab: "profile", title: "Hồ sơ cá nhân | AI Tutor" },
  "/pricing": { tab: "pricing", title: "Gói nâng cấp | AI Tutor" },
  "/api-settings": { tab: "api", title: "Cài đặt Gemini API | AI Tutor" },
  "/backup": { tab: "backup", title: "Sao lưu & Khôi phục | AI Tutor" },
  "/admin": { tab: "admin", sub: "requests", title: "Quản trị duyệt đơn | AI Tutor", adminOnly: true },
  "/admin/requests": { tab: "admin", sub: "requests", title: "Quản trị – Duyệt thanh toán | AI Tutor", adminOnly: true },
  "/admin/members": { tab: "admin", sub: "members", title: "Quản trị – Thành viên | AI Tutor", adminOnly: true },
  "/admin/vietqr": { tab: "admin", sub: "cfg", title: "Quản trị – Cấu hình VietQR | AI Tutor", adminOnly: true },
  "/admin/vouchers": { tab: "admin", sub: "voucher", title: "Quản trị – Mã giảm giá | AI Tutor", adminOnly: true },
  "/admin/backup": { tab: "admin", sub: "backup", title: "Quản trị – Sao lưu hệ thống | AI Tutor", adminOnly: true },
  "/quiz": { tab: "studio", sub: "quiz", title: "Làm bài chia sẻ | AI Tutor" }
};
const TAB_TO_PATH = {
  dashboard: "/dashboard",
  study: "/practice",
  studio: "/creator-studio",
  converter: "/converter",
  flash: "/flashcards",
  mistake: "/mistakes",
  profile: "/profile",
  pricing: "/pricing",
  api: "/api-settings",
  backup: "/backup",
  admin: "/admin"
};
const ADMIN_SUB_TO_PATH = {
  requests: "/admin/requests",
  members: "/admin/members",
  cfg: "/admin/vietqr",
  voucher: "/admin/vouchers",
  backup: "/admin/backup"
};

function cleanRoutePath(raw) {
  let str = String(raw || "/").trim();
  let search = "", hash = "";
  const hi = str.indexOf("#");
  if (hi !== -1) { hash = str.slice(hi); str = str.slice(0, hi); }
  const qi = str.indexOf("?");
  if (qi !== -1) { search = str.slice(qi); str = str.slice(0, qi); }
  if (!str.startsWith("/")) str = "/" + str;
  if (str.length > 1 && str.endsWith("/")) str = str.slice(0, -1);
  return { pathname: str.toLowerCase(), search: search, hash: hash };
}

function syncHistory(fullUrl, title, replace) {
  if (title) document.title = title;
  try {
    const cur = window.location.pathname + window.location.search + window.location.hash;
    if (cur === fullUrl) return;
    if (replace) window.history.replaceState({ path: fullUrl }, "", fullUrl);
    else window.history.pushState({ path: fullUrl }, "", fullUrl);
  } catch (e) { /* file:// fallback */ }
}

function navigateTo(rawPath, options) {
  const opts = options || {};
  closeDropdown();
  closeDrawer();
  const parsed = cleanRoutePath(rawPath);
  let route = ROUTES[parsed.pathname];
  let finalPath = parsed.pathname;
  let replace = !!opts.replace;

  if (!route) {
    route = ROUTES["/"];
    finalPath = "/";
    replace = true;
  }
  if (route.adminOnly && !isAdmin()) {
    if (!opts.silentGuard) showToast("Truy cập bị từ chối! Bạn không có quyền vào trang Quản trị.", "error");
    route = ROUTES["/"];
    finalPath = "/";
    replace = true;
  }

  // Fallback for session-only sub-routes if refreshed without active in-memory session
  if (finalPath === "/practice/session" && !state.session) {
    route = ROUTES["/practice"]; finalPath = "/practice"; replace = true;
  }
  if (finalPath === "/flashcards/play" && !state.flash) {
    route = ROUTES["/flashcards"]; finalPath = "/flashcards"; replace = true;
  }

  let pageTitle = route.title;
  if (finalPath === "/practice/session" && state.session) {
    pageTitle = (state.session.review ? "Xem lại bài thi" : (MODE_LABEL[state.session.mode] || "Đang làm bài")) + " | AI Tutor";
  }

  const fullUrl = finalPath + (parsed.search || "") + (parsed.hash || "");
  if (!opts.fromPopState) syncHistory(fullUrl, pageTitle, replace);
  else document.title = pageTitle;

  state.tab = route.tab;

  // Apply sub-tab state before rendering
  if (route.tab === "admin" && route.sub) state.adminTab = route.sub;
  if (route.tab === "converter" && route.sub && window.UETConverter && typeof window.UETConverter.applySubRoute === "function") {
    window.UETConverter.applySubRoute(route.sub);
  }
  if (route.tab === "studio" && route.sub && route.sub !== "quiz" && window.UETStudio && typeof window.UETStudio.applySubRoute === "function") {
    window.UETStudio.applySubRoute(route.sub);
  }

  const map = {
    dashboard: "viewDashboard",
    study: "viewStudy",
    studio: "viewStudio",
    converter: "viewConverter",
    flash: "viewFlash",
    mistake: "viewMistake",
    profile: "viewProfile",
    pricing: "viewPricing",
    api: "viewApi",
    backup: "viewBackup",
    admin: "viewAdmin"
  };
  Object.keys(map).forEach(function (k) { toggleEl(map[k], k === route.tab); });

  const tabs = document.querySelectorAll(".nav-tab, .drawer-item");
  for (let i = 0; i < tabs.length; i++) {
    const active = tabs[i].getAttribute("data-tab") === route.tab;
    tabs[i].classList.toggle("active", active);
    if (active) tabs[i].setAttribute("aria-current", "page"); else tabs[i].removeAttribute("aria-current");
  }
  const ddItems = document.querySelectorAll(".dd-item[data-dd]");
  for (let i = 0; i < ddItems.length; i++) {
    ddItems[i].classList.toggle("active", ddItems[i].getAttribute("data-dd") === route.tab);
  }

  if (!opts.skipRender) renderTab();
  if (state.user && (route.tab === "pricing" || route.tab === "admin" || route.tab === "dashboard")) {
    syncWithBackend().then(function (changed) {
      if (changed) { updateChrome(); renderTab(); }
    });
  }
  window.scrollTo(0, 0);
}

function showTab(name, options) {
  const path = TAB_TO_PATH[name] || "/";
  navigateTo(path, options);
}

function renderTab() {
  updateChrome();
  switch (state.tab) {
    case "dashboard": renderDashboard(); break;
    case "study":
      if (state.session) { toggleEl("studyIdle", false); toggleEl("studyActive", true); renderStudy(); }
      else { toggleEl("studyIdle", true); toggleEl("studyActive", false); renderPicker("studyPicker", "study"); }
      break;
    case "studio":
      if (window.UETStudio && typeof window.UETStudio.render === "function") window.UETStudio.render();
      break;
    case "converter":
      if (window.UETConverter && typeof window.UETConverter.renderConverter === "function") window.UETConverter.renderConverter();
      break;
    case "api":
      if (window.UETConverter && typeof window.UETConverter.renderApiPage === "function") window.UETConverter.renderApiPage();
      break;
    case "backup":
      if (window.UETCloud && typeof window.UETCloud.renderBackupPage === "function") window.UETCloud.renderBackupPage();
      break;
    case "flash":
      if (state.flash) { toggleEl("flashIdle", false); toggleEl("flashActive", true); renderFlash(); }
      else { toggleEl("flashIdle", true); toggleEl("flashActive", false); renderPicker("flashPicker", "flash"); }
      break;
    case "mistake": renderMistakeTab(); break;
    case "profile": renderProfilePage(); break;
    case "pricing": renderPricing(); break;
    case "admin": renderAdmin(); break;
    default: break;
  }
  applyI18n(document.body);
}

function getPendingCount() {
  return loadArr(KEYS.payReqs).filter(function (r) { return r && r.status === "pending"; }).length;
}
function getUserPendingReqs(email) {
  const em = String(email || "").trim().toLowerCase();
  return loadArr(KEYS.payReqs).filter(function (r) { return r && String(r.userEmail || "").toLowerCase() === em && r.status === "pending"; });
}

function updateChrome() {
  const adm = isAdmin();
  const tier = currentTier();
  const info = adm ? TIERS.diamond : (TIERS[tier] || TIERS.none);
  const b = $("tierBadge");
  if (b) {
    b.textContent = adm ? "👑 Admin (Diamond)" : (info.icon + " " + info.name);
    b.className = "tier-badge " + (adm ? "rank-diamond" : info.cls);
  }
  const mCnt = String(mistakeCount());
  setText("navMistakeBadge", mCnt);
  setText("drawerMistakeBadge", mCnt);
  const pCnt = getPendingCount();
  toggleEl("navAdmin", adm);
  toggleEl("drawerAdminBtn", adm);
  ["navAdminBadge", "drawerAdminBadge", "userAdminAlertDot"].forEach(function (id) {
    const el = $(id);
    if (el) { el.textContent = String(pCnt); el.classList.toggle("hidden", !adm || pCnt === 0); }
  });
  const dot = $("navApiDot");
  if (dot) {
    const assigned = getActiveUserAssignedApi();
    const hasKey = !!((localStorage.getItem(KEYS.apiKey) || "").trim() || (assigned && assigned.apiKey));
    dot.classList.toggle("ok", hasKey);
    dot.title = hasKey ? "Đã cấu hình Gemini API Key" : "Chưa cấu hình Gemini API Key";
  }
  const curLang = getLang();
  const langBtns = document.querySelectorAll("[data-lang]");
  for (let i = 0; i < langBtns.length; i++) {
    langBtns[i].classList.toggle("active", langBtns[i].getAttribute("data-lang") === curLang);
  }
}

/* ------------------------------ Dashboard ------------------------------ */
function renderDashboard() {
  renderGreeting();
  // Pending banner on Dashboard
  const pbox = $("dashPendingBanner");
  if (pbox && state.user) {
    const pendings = getUserPendingReqs(state.user.email);
    if (pendings.length > 0 && !isAdmin()) {
      const names = pendings.map(function (r) { return TIERS[r.plan] ? TIERS[r.plan].name : r.plan; }).join(", ");
      pbox.innerHTML = '<span>⏳ Đang chờ Quản trị viên xác nhận yêu cầu nâng cấp gói <strong>' + esc(names) + '</strong>.</span>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="go-pricing">Xem chi tiết</button>';
      pbox.classList.remove("hidden");
    } else { pbox.classList.add("hidden"); pbox.innerHTML = ""; }
  }
  const st = getStats();
  setText("kpiDecks", String(Object.keys(st.decks).length));
  setText("kpiAnswered", String(st.attempts));
  setText("kpiCorrect", String(st.correct));
  setText("kpiRate", (st.attempts > 0 ? Math.round(st.correct / st.attempts * 100) : 0) + "%");
  renderDeckPanel();
  renderHistPanel();
  renderChart();
}

function deckRowHTML(d, mode) {
  const pins = getPins();
  const pinned = pins.indexOf(d.id) !== -1;
  const pct = deckProgressPct(d.id);
  const resume = isResumable(d.id);
  const lockExam = can("exam") ? "" : "🔒 ";
  const lockExp = can("exportData") ? "" : "🔒 ";
  let actions = "";
  if (mode === "flash") {
    actions = '<button type="button" class="btn btn-primary btn-sm" data-action="flash">Lật thẻ</button>';
  } else {
    actions = '<button type="button" class="btn btn-primary btn-sm" data-action="practice">' + (resume ? "Tiếp tục ôn tập" : "Ôn tập") + "</button>" +
      '<button type="button" class="btn btn-primary btn-sm" data-action="exam">' + lockExam + "Thi thử</button>" +
      '<button type="button" class="btn btn-outline btn-sm" data-action="studio">Quiz Studio</button>';
    if (mode === "dash") {
      actions += '<button type="button" class="btn btn-outline btn-sm" data-action="flash">Lật thẻ</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="share" title="Chia sẻ bằng Link, Mã đề &amp; QR">🔗 Chia sẻ</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="pdf" title="Xuất PDF để in chuẩn A4">🖨️ Xuất PDF</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="export-json" title="Xuất bộ đề ra file .json">' + lockExp + "Xuất .json</button>" +
        '<button type="button" class="btn btn-outline btn-sm" data-action="export-xlsx" title="Xuất bộ đề ra file .xlsx">' + lockExp + "Xuất .xlsx</button>" +
        (d.kind === "user" ? '<button type="button" class="btn btn-outline btn-sm" data-action="delete" title="Xóa bộ đề này">Xóa</button>' : "");
    }
  }
  return '<div class="deck-row' + (pinned ? " pinned" : "") + '" data-deck-id="' + esc(d.id) + '">' +
    '<div class="deck-title-line"><span class="deck-title">' + esc(d.title) + "</span>" +
    (mode === "dash" ? '<button type="button" class="pin-btn' + (pinned ? " on" : "") + '" data-action="pin" aria-pressed="' + (pinned ? "true" : "false") + '" title="' + (pinned ? "Bỏ ghim bộ đề" : "Ghim bộ đề lên đầu") + '">📌</button>' : "") + "</div>" +
    '<div class="deck-sub"><span class="badge">' + esc(d.tag) + "</span><span>" + d.questions.length + " câu hỏi</span>" +
    '<span>Tiến độ ' + pct + '%</span><span class="mini-bar"><i style="width:' + pct + '%"></i></span></div>' +
    '<div class="deck-actions">' + actions + "</div></div>";
}

function sortedDecks(list) {
  const pins = getPins();
  return list.map(function (d, i) { return { d: d, i: i, p: pins.indexOf(d.id) !== -1 }; })
    .sort(function (a, b) { return (b.p ? 1 : 0) - (a.p ? 1 : 0) || a.i - b.i; })
    .map(function (x) { return x.d; });
}

function renderDeckPanel() {
  const tags = [];
  state.decks.forEach(function (d) { if (d.tag && tags.indexOf(d.tag) === -1) tags.push(d.tag); });
  if (state.filterTag !== "all" && tags.indexOf(state.filterTag) === -1) state.filterTag = "all";
  let pills = '<button type="button" class="pill ' + (state.filterTag === "all" ? "active" : "") + '" data-tag="all">Tất cả</button>';
  tags.forEach(function (t) {
    pills += '<button type="button" class="pill ' + (state.filterTag === t ? "active" : "") + '" data-tag="' + esc(t) + '">' + esc(t) + "</button>";
  });
  setHTML("tagPills", pills);
  toggleEl("tagPills", state.decks.length > 0);

  if (state.decks.length === 0) {
    setHTML("deckList", '<div class="empty-state"><div style="font-size:2.4rem">📚</div><p>Bạn chưa có bộ đề nào. Nhập từ Excel hoặc chuyển đề thi ngay bằng AI Converter!</p>' +
      '<div class="deck-actions" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="import">+ Nhập đề từ Excel</button>' +
      '<button type="button" class="btn btn-outline" data-action="go-converter">✨ Mở AI Converter</button></div></div>');
    setHTML("deckPager", "");
    return;
  }
  const q = state.deckQuery.trim().toLowerCase();
  let list = state.decks.filter(function (d) {
    return (state.filterTag === "all" || d.tag === state.filterTag) && (!q || d.title.toLowerCase().indexOf(q) !== -1);
  });
  list = sortedDecks(list);
  if (list.length === 0) {
    setHTML("deckList", '<div class="empty-state">Không tìm thấy bộ đề phù hợp.</div>');
    setHTML("deckPager", "");
    return;
  }
  const pg = paginate(list, state.deckPage);
  state.deckPage = pg.page;
  setHTML("deckList", pg.items.map(function (d) { return deckRowHTML(d, "dash"); }).join(""));
  renderPager("deckPager", "decks", pg.page, pg.pages);
}

function renderHistPanel() {
  const tier = currentTier();
  const tInfo = isAdmin() ? TIERS.diamond : (TIERS[tier] || TIERS.none);
  let info = '<span><strong>' + (isAdmin() ? "👑 Admin (Diamond)" : (tInfo.icon + " " + esc(tInfo.name))) + "</strong>";
  if (isAdmin()) info += " · Toàn quyền không giới hạn";
  else {
    const s = getActiveSub(state.user ? state.user.email : "");
    if (s && s.tier === "unranked") info += " · Gói miễn phí 0đ/năm";
    else if (s) info += " · Hết hạn: " + esc(fmtDate(s.expires));
    else info += " · Chưa đăng ký gói (Đăng ký Unranked 0đ miễn phí)";
  }
  info += '</span><span class="deck-actions"><button type="button" class="btn btn-outline btn-sm" data-action="edit-profile">Chỉnh sửa hồ sơ</button><button type="button" class="btn btn-primary btn-sm" data-action="go-pricing">Gói nâng cấp</button></span>';
  setHTML("tierInfo", info);

  const q = state.histQuery.trim().toLowerCase();
  const hist = loadArr(KEYS.history).filter(function (h) { return h && typeof h === "object"; }).slice().reverse()
    .filter(function (h) { return !q || String(h.deckTitle || "").toLowerCase().indexOf(q) !== -1; });
  if (hist.length === 0) {
    setHTML("histList", '<div class="empty-state">Chưa có lịch sử thi thử.</div>');
    setHTML("histPager", "");
    return;
  }
  const pg = paginate(hist, state.histPage);
  state.histPage = pg.page;
  setHTML("histList", pg.items.map(function (h) {
    return '<div class="hist-row"><span><strong>' + esc(h.deckTitle) + '</strong><br><span class="hist-date">' + esc(fmtDateTime(h.date)) + "</span></span>" +
      '<span class="hist-score">' + esc(h.score) + '/10</span><span class="hist-date">' + esc(h.correct) + "/" + esc(h.total) + " câu</span></div>";
  }).join(""));
  renderPager("histPager", "hist", pg.page, pg.pages);
}

function renderChart() {
  const days = state.chartRange === "month" ? 30 : 7;
  const cutoff = Date.now() - days * DAY_MS;
  const items = loadArr(KEYS.history).filter(function (h) {
    if (!h || typeof h !== "object") return false;
    const t = new Date(h.date).getTime();
    return !isNaN(t) && t >= cutoff && Number.isFinite(parseFloat(h.score));
  }).slice(-12);
  const btns = document.querySelectorAll(".seg-btn");
  for (let i = 0; i < btns.length; i++) btns[i].classList.toggle("active", btns[i].getAttribute("data-range") === state.chartRange);
  if (items.length === 0) {
    setHTML("chartBox", '<div class="empty-state">Chưa có dữ liệu điểm thi trong ' + (days === 7 ? "tuần" : "tháng") + " này. Hãy làm một bài thi thử hoặc Quiz Studio để xem biểu đồ.</div>");
    return;
  }
  const W = 640, H = 250, pl = 36, pr = 12, pt = 24, pb = 40;
  const pw = W - pl - pr, ph = H - pt - pb;
  let svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Biểu đồ điểm thi gần đây">';
  [0, 5, 10].forEach(function (v) {
    const y = pt + ph - (v / 10) * ph;
    svg += '<line class="ch-grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '"/><text class="ch-text" x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + v + "</text>";
  });
  const slot = pw / items.length;
  const bw = Math.min(46, slot * 0.6);
  items.forEach(function (h, i) {
    const sc = clamp(parseFloat(h.score), 0, 10);
    const bh = (sc / 10) * ph;
    const x = pl + slot * i + (slot - bw) / 2;
    const y = pt + ph - bh;
    const d = new Date(h.date);
    const lab = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2);
    svg += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(bh, 1) + '" rx="6" fill="' + CHART_COLORS[i % 4] + '"><title>' + esc(h.deckTitle) + ": " + esc(h.score) + "/10</title></rect>" +
      '<text class="ch-val" x="' + (x + bw / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + sc.toFixed(1) + "</text>" +
      '<text class="ch-text" x="' + (x + bw / 2) + '" y="' + (H - pb + 16) + '" text-anchor="middle">' + lab + "</text>";
  });
  svg += "</svg>";
  setHTML("chartBox", svg);
}

function onDeckListClick(e) {
  const btn = e.target.closest ? e.target.closest("[data-action]") : null;
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  if (action === "import") { openImport(); return; }
  if (action === "go-pricing") { showTab("pricing"); return; }
  if (action === "go-converter") { showTab("converter"); return; }
  if (action === "edit-profile") { navigateTo("/profile"); return; }
  const row = btn.closest("[data-deck-id]");
  if (!row) return;
  const deck = getDeck(row.getAttribute("data-deck-id"));
  if (!deck) return;
  if (action === "pin") togglePin(deck.id);
  else if (action === "practice") startPractice(deck);
  else if (action === "exam") { if (requireFeature("exam")) openConfig("exam", deck); }
  else if (action === "studio") {
    if (window.UETStudio && typeof window.UETStudio.openFromDeck === "function") window.UETStudio.openFromDeck(deck);
  }
  else if (action === "flash") openConfig("flash", deck);
  else if (action === "share") { if (window.UETCloud) window.UETCloud.openShareModal(deck); }
  else if (action === "pdf") { if (window.UETCloud) window.UETCloud.openPdfModal(deck); }
  else if (action === "export-json") { if (requireFeature("exportData")) exportJSON(deck); }
  else if (action === "export-xlsx") { if (requireFeature("exportData")) exportXLSX(deck); }
  else if (action === "delete") {
    showConfirm("Xóa bộ đề", "Bạn có chắc muốn xóa bộ đề \"" + deck.title + "\"? Hành động này không thể hoàn tác.", function () { deleteDeck(deck.id); });
  }
}
function onPagerClick(e) {
  const b = e.target.closest ? e.target.closest("[data-pager]") : null;
  if (!b || b.disabled) return;
  const p = parseInt(b.getAttribute("data-page"), 10);
  if (!Number.isFinite(p)) return;
  if (b.getAttribute("data-pager") === "decks") { state.deckPage = p; renderDeckPanel(); }
  else { state.histPage = p; renderHistPanel(); }
}
function togglePin(id) {
  let pins = getPins();
  pins = pins.indexOf(id) === -1 ? pins.concat([id]) : pins.filter(function (p) { return p !== id; });
  saveJSON(KEYS.pins, pins);
  renderDeckPanel();
}
function deleteDeck(id) {
  saveJSON(KEYS.decks, loadArr(KEYS.decks).filter(function (d) { return !d || String(d.id) !== id; }));
  const prog = loadObj(KEYS.progress); delete prog[id]; saveJSON(KEYS.progress, prog);
  saveJSON(KEYS.pins, getPins().filter(function (p) { return p !== id; }));
  if (state.session && state.session.deckId === id) { stopTimer(); state.session = null; }
  if (state.flash && state.flash.deckId === id) state.flash = null;
  rebuildDecks();
  renderTab();
  showToast("Đã xóa bộ đề.", "success");
}
function renderPicker(containerId, mode) {
  if (state.decks.length === 0) {
    setHTML(containerId, '<div class="empty-state"><div style="font-size:2.4rem">📚</div><p>Bạn chưa có bộ đề nào để học.</p><button type="button" class="btn btn-primary" data-action="import">+ Nhập đề từ Excel</button></div>');
    return;
  }
  setHTML(containerId, sortedDecks(state.decks).map(function (d) { return deckRowHTML(d, mode); }).join(""));
}

/* ------------------------------ Mistake Bank ------------------------------ */
function renderMistakeTab() {
  const mk = loadObj(KEYS.mistakes);
  const keys = Object.keys(mk);
  if (!can("mistake")) {
    setHTML("mistakeBody", '<div class="lock-card"><div class="lock-ico">🔒</div><h2>Sổ tay câu hay sai (Làm lại câu sai)</h2><p class="muted">Tính năng này mở khóa từ Gói Bronze (100.000đ/năm) trở lên.</p>' +
      '<button type="button" class="btn btn-primary" data-action="go-pricing">Xem gói nâng cấp</button></div>');
    return;
  }
  const byDeck = {};
  keys.forEach(function (k) {
    const m = mk[k];
    if (!m || !m.deckId) return;
    byDeck[m.deckId] = (byDeck[m.deckId] || 0) + 1;
  });
  let rows = Object.keys(byDeck).map(function (id) {
    const d = getDeck(id);
    return '<div class="hist-row"><span><strong>' + esc(d ? d.title : "Bộ đề đã bị xóa") + '</strong></span><span class="badge badge-bad">' + byDeck[id] + " câu</span><span></span></div>";
  }).join("");
  if (!rows) rows = '<div class="empty-state">Sổ tay đang trống. Những câu bạn làm sai sẽ xuất hiện ở đây.</div>';
  setHTML("mistakeBody", '<div class="mistake-hero"><div><h2>Sổ tay câu hay sai (Mistake Bank)</h2>' +
    '<p class="muted">Trả lời đúng liên tiếp 2 lần để loại câu khỏi sổ tay.</p></div>' +
    '<div><span class="mistake-count">' + keys.length + '</span> <span class="muted">câu cần ôn lại</span></div></div>' +
    '<div class="deck-actions" style="margin-bottom:14px">' +
    '<button type="button" class="btn btn-danger" data-action="mistake-start"' + (keys.length === 0 ? " disabled" : "") + ">Luyện tập sổ tay</button>" +
    '<button type="button" class="btn btn-outline" data-action="mistake-clear"' + (keys.length === 0 ? " disabled" : "") + ">Xóa toàn bộ sổ tay</button></div>" +
    '<div class="list">' + rows + "</div>");
}
function onMistakeClick(e) {
  const b = e.target.closest ? e.target.closest("[data-action]") : null;
  if (!b || b.disabled) return;
  const a = b.getAttribute("data-action");
  if (a === "go-pricing") showTab("pricing");
  else if (a === "mistake-start") { if (requireFeature("mistake")) openConfig("mistake", null); }
  else if (a === "mistake-clear") {
    showConfirm("Xóa sổ tay", "Bạn có chắc muốn xóa toàn bộ câu trong Sổ tay câu hay sai?", function () {
      saveJSON(KEYS.mistakes, {}); renderTab(); showToast("Đã xóa toàn bộ sổ tay.", "success");
    });
  }
}

/* ------------------------------ Session Splitter Helper ------------------------------ */
function describeSessions(total, perSession) {
  const t = Math.max(1, parseInt(total, 10) || 1);
  const sz = clamp(parseInt(perSession, 10) || 50, 1, t);
  const totalSessions = Math.ceil(t / sz);
  const fullSessions = Math.floor(t / sz);
  const remainder = t % sz;
  let summary = "";
  if (totalSessions === 1) {
    summary = "1 phiên duy nhất (" + t + " câu).";
  } else if (remainder === 0) {
    summary = "Tự động chia thành " + totalSessions + " phiên × " + sz + " câu.";
  } else {
    summary = "Tự động chia thành " + totalSessions + " phiên: " + fullSessions + " phiên × " + sz + " câu + 1 phiên cuối × " + remainder + " câu.";
  }
  return { total: t, size: sz, totalSessions: totalSessions, fullSessions: fullSessions, remainder: remainder, summary: summary };
}

function currentExamPickMode() {
  const rs = document.getElementsByName("examPickMode");
  for (let i = 0; i < rs.length; i++) if (rs[i].checked) return rs[i].value;
  return "sessions";
}

function syncExamConfigVisibility() {
  const p = state.pending;
  if (!p) return;
  if (p.mode === "exam") {
    const pickMode = currentExamPickMode();
    toggleEl("cfgPractice", pickMode === "sessions");
    toggleEl("cfgChunkRow", false);
    toggleEl("chunkOptions", pickMode === "sessions");
    toggleEl("examCountField", pickMode === "random");
  } else {
    toggleEl("cfgPractice", p.mode === "practice" || p.mode === "flash");
    toggleEl("cfgChunkRow", true);
    toggleEl("chunkOptions", !!($("cfgChunk") && $("cfgChunk").checked));
    toggleEl("examCountField", false);
  }
}

/* ------------------------------ Config Modal ------------------------------ */
function openConfig(mode, deck) {
  let total = 0;
  if (mode === "mistake") total = mistakeCount(); else if (deck) total = deck.questions.length;
  if (total === 0) { showToast("Không có câu hỏi nào để bắt đầu.", "warning"); return; }
  state.pending = { mode: mode, deckId: deck ? deck.id : null, total: total };
  const titles = { practice: "Thiết lập chế độ Ôn tập", exam: "Thiết lập chế độ Thi thử (Kiểm tra)", flash: "Thiết lập chế độ Lật thẻ", mistake: "Luyện tập Sổ tay câu hay sai" };
  setText("configTitle", titles[mode] || "Thiết lập");
  setText("configSub", (deck ? deck.title + " – " : "") + total + " câu hỏi");
  const canShuffle = can("shuffle");
  const q = $("cfgShuffleQ"); if (q) { q.checked = false; q.disabled = !canShuffle; }
  const o = $("cfgShuffleO"); if (o) { o.checked = false; o.disabled = !canShuffle; }
  const c = $("cfgChunk"); if (c) { c.checked = total > 50; c.disabled = false; }
  toggleEl("cfgLockNote", !canShuffle);
  const sz = $("chunkSize"); if (sz) { sz.max = String(total); sz.value = String(Math.min(50, total)); }
  toggleEl("cfgExamModeRow", mode === "exam");
  const rs = document.getElementsByName("examPickMode");
  for (let i = 0; i < rs.length; i++) rs[i].checked = rs[i].value === (total > 50 ? "sessions" : "random");
  toggleEl("cfgExam", mode === "exam");
  toggleEl("cfgShuffleOptRow", mode !== "flash");
  const ec = $("examCount"); if (ec) { ec.max = String(total); ec.value = String(Math.min(40, total)); }
  const em = $("examMinutes"); if (em) em.value = "45";
  syncExamConfigVisibility();
  updateChunkSelector();
  openModal("configModal");
}
function updateChunkSelector() {
  const sel = $("chunkSelect"), sizeEl = $("chunkSize");
  if (!sel || !sizeEl || !state.pending) return;
  const info = describeSessions(state.pending.total, sizeEl.value);
  setText("chunkSummary", "📊 " + info.summary);
  let html = "";
  for (let c = 1; c <= info.totalSessions; c++) {
    const s = (c - 1) * info.size + 1;
    const e = Math.min(c * info.size, info.total);
    const cnt = e - s + 1;
    html += '<option value="' + c + '">Phiên ' + c + "/" + info.totalSessions + " (Câu " + s + "–" + e + " · " + cnt + " câu)</option>";
  }
  sel.innerHTML = html;
}
function prepareQuestion(q, deckId, shuffleOptions) {
  let options = q.options.slice();
  let correct = q.correct.slice().sort(function (a, b) { return a - b; });
  if (shuffleOptions) {
    const paired = q.options.map(function (opt, idx) { return { opt: opt, isCorrect: q.correct.includes(idx) }; });
    const sh = shuffleArray(paired);
    options = sh.map(function (p) { return p.opt; });
    correct = sh.map(function (p, idx) { return p.isCorrect ? idx : -1; }).filter(function (idx) { return idx !== -1; });
  }
  return {
    id: String(deckId) + "_" + q.id, origId: q.id, deckId: deckId, text: q.text, type: q.type,
    options: options, correct: correct, time: q.time, image: q.image || "", explanation: q.explanation || ""
  };
}
function sliceBySelectedSession(allQs) {
  const info = describeSessions(allQs.length, $("chunkSize") ? $("chunkSize").value : "50");
  const chunk = clamp(parseInt($("chunkSelect") ? $("chunkSelect").value : "1", 10) || 1, 1, info.totalSessions);
  const start = (chunk - 1) * info.size;
  const end = Math.min(chunk * info.size, allQs.length);
  return {
    items: allQs.slice(start, end),
    label: "Phiên " + chunk + "/" + info.totalSessions + " (" + (end - start) + " câu)"
  };
}
function startFromConfig() {
  const p = state.pending;
  if (!p) return;
  const shuffleQ = can("shuffle") && !!($("cfgShuffleQ") && $("cfgShuffleQ").checked);
  const shuffleO = can("shuffle") && !!($("cfgShuffleO") && $("cfgShuffleO").checked);
  try {
    if (p.mode === "mistake") {
      if (!requireFeature("mistake")) return;
      const mk = loadObj(KEYS.mistakes);
      let base = [];
      Object.keys(mk).forEach(function (k, i) {
        const m = mk[k];
        const nq = m && normalizeQuestion(m.question, i);
        if (nq && m.deckId) base.push({ q: nq, deckId: String(m.deckId) });
      });
      if (base.length === 0) { showToast("Sổ tay hiện đang trống.", "warning"); return; }
      if (shuffleQ) base = shuffleArray(base);
      closeModal("configModal");
      beginSession({ mode: "mistake", deckId: "mistake_bank", title: "Sổ tay câu hay sai",
        questions: base.map(function (b) { return prepareQuestion(b.q, b.deckId, shuffleO); }) });
      return;
    }
    const deck = getDeck(p.deckId);
    if (!deck) { showToast("Không tìm thấy bộ đề.", "error"); return; }
    if (p.mode === "flash") {
      let qs = deck.questions.slice();
      let title = deck.title;
      if ($("cfgChunk") && $("cfgChunk").checked) {
        const sl = sliceBySelectedSession(qs);
        qs = sl.items; title += " – " + sl.label;
      }
      if (shuffleQ) qs = shuffleArray(qs);
      closeModal("configModal");
      state.flash = { deckId: deck.id, questions: qs.map(function (q) { return prepareQuestion(q, deck.id, false); }), index: 0, flipped: false };
      setText("flashTitle", title);
      navigateTo("/flashcards/play");
      return;
    }
    if (p.mode === "exam") {
      if (!requireFeature("exam")) return;
      let minutes = parseInt($("examMinutes") ? $("examMinutes").value : "45", 10);
      if (!(minutes > 0)) minutes = 45;
      minutes = Math.min(minutes, 600);
      let picked = [];
      let title = deck.title;
      if (currentExamPickMode() === "sessions") {
        const sl = sliceBySelectedSession(deck.questions);
        picked = shuffleQ ? shuffleArray(sl.items) : sl.items;
        title += " – " + sl.label;
      } else {
        let count = parseInt($("examCount") ? $("examCount").value : "40", 10);
        if (!Number.isFinite(count)) count = 40;
        count = clamp(count, 1, deck.questions.length);
        picked = shuffleArray(deck.questions).slice(0, count);
      }
      closeModal("configModal");
      beginSession({ mode: "exam", deckId: deck.id, title: title,
        questions: picked.map(function (q) { return prepareQuestion(q, deck.id, shuffleO); }),
        endTime: Date.now() + minutes * 60000, minutes: minutes });
      return;
    }
    let base = deck.questions.slice();
    let pTitle = deck.title;
    if ($("cfgChunk") && $("cfgChunk").checked) {
      const sl = sliceBySelectedSession(base);
      base = sl.items; pTitle += " – " + sl.label;
    }
    if (shuffleQ) base = shuffleArray(base);
    closeModal("configModal");
    beginSession({ mode: "practice", deckId: deck.id, title: pTitle,
      questions: base.map(function (q) { return prepareQuestion(q, deck.id, shuffleO); }) });
  } catch (e) { showToast("Không thể bắt đầu phiên làm bài. Vui lòng thử lại.", "error"); }
}

/* ------------------------------ Study Session ------------------------------ */
function beginSession(cfg) {
  stopTimer();
  state.palFilter = null;
  state.session = {
    mode: cfg.mode, deckId: cfg.deckId, title: cfg.title, questions: cfg.questions,
    currentIndex: 0, answers: {}, submitted: {}, flags: {}, notes: {}, review: false,
    endTime: cfg.endTime || 0, minutes: cfg.minutes || 0, startedAt: Date.now(), result: null
  };
  if (cfg.mode === "practice") saveProgress();
  startTimer();
  navigateTo("/practice/session");
}
function startPractice(deck) {
  const resume = isResumable(deck.id);
  if (!resume) { openConfig("practice", deck); return; }
  const p = loadObj(KEYS.progress)[deck.id];
  stopTimer();
  state.palFilter = null;
  state.session = {
    mode: "practice", deckId: deck.id, title: deck.title, questions: p.sessionQuestions,
    currentIndex: clamp(parseInt(p.currentIndex, 10) || 0, 0, p.sessionQuestions.length - 1),
    answers: p.answers && typeof p.answers === "object" ? p.answers : {},
    submitted: p.submitted && typeof p.submitted === "object" ? p.submitted : {},
    flags: p.flags && typeof p.flags === "object" ? p.flags : {},
    notes: {}, review: false, endTime: 0, minutes: 0, startedAt: Date.now(), result: null
  };
  startTimer();
  navigateTo("/practice/session");
  showToast("Đã khôi phục tiến độ làm bài trước đó.", "info");
}
function saveProgress() {
  const s = state.session;
  if (!s || s.mode !== "practice" || s.review) return;
  const prog = loadObj(KEYS.progress);
  prog[s.deckId] = { currentIndex: s.currentIndex, answers: s.answers, submitted: s.submitted, flags: s.flags, sessionQuestions: s.questions, savedAt: Date.now() };
  saveJSON(KEYS.progress, prog);
}
function gradeQ(q, selected) {
  const sel = Array.isArray(selected) ? selected : [];
  const correct = q.correct.slice().sort(function (a, b) { return a - b; });
  return sel.length === correct.length && sel.slice().sort(function (a, b) { return a - b; }).every(function (v, i) { return v === correct[i]; });
}
function getAnswer(s, i) { return Array.isArray(s.answers[i]) ? s.answers[i] : []; }
function isRevealed(s, i) { return s.review || (s.mode !== "exam" && !!s.submitted[i]); }
function questionState(s, i) {
  if (isRevealed(s, i)) return gradeQ(s.questions[i], getAnswer(s, i)) ? "correct" : "wrong";
  return getAnswer(s, i).length > 0 ? "selected" : "none";
}
function countDone(s) {
  let done = 0;
  for (let k = 0; k < s.questions.length; k++) {
    if (s.review) done++;
    else if (s.mode === "exam" ? getAnswer(s, k).length > 0 : !!s.submitted[k]) done++;
  }
  return done;
}
function renderStudy() {
  const s = state.session;
  if (!s || !$("qText")) return;
  const total = s.questions.length;
  const i = clamp(s.currentIndex, 0, total - 1);
  s.currentIndex = i;
  const q = s.questions[i];
  if (!q) return;

  setText("statusMode", MODE_LABEL[s.mode] + (s.review ? " (Xem lại)" : ""));
  setText("statusDeck", s.title);
  const done = countDone(s);
  const pct = Math.round(done / total * 100);
  setText("statusProgressText", done + "/" + total);
  setText("statusPct", pct + "%");
  const fill = $("statusFill"); if (fill) fill.style.width = pct + "%";
  toggleEl("resetBtn", s.mode === "practice");
  toggleEl("finishBtn", !s.review);
  setText("finishBtn", s.mode === "exam" ? "Nộp bài" : "Hoàn thành");

  const rb = $("examResult");
  if (rb) {
    if (s.review && s.result) {
      rb.innerHTML = '<div class="score">' + esc(s.result.score) + "/10</div><div>Bạn trả lời đúng <strong>" + s.result.correct + "/" + s.result.total + "</strong> câu" +
        (s.result.unanswered > 0 ? " (" + s.result.unanswered + " câu chưa trả lời)" : "") + ". Hãy xem lại chi tiết từng câu bên dưới.</div>";
      rb.classList.remove("hidden");
    } else { rb.classList.add("hidden"); rb.innerHTML = ""; }
  }

  setText("qBadge", "Câu hỏi: " + (i + 1));
  setText("qHint", q.type === "multiple" ? "(Chọn nhiều đáp án)" : "(Chọn một đáp án)");
  const fb = $("flagBtn");
  if (fb) { fb.setAttribute("aria-pressed", s.flags[i] ? "true" : "false"); fb.title = s.flags[i] ? "Bỏ đánh dấu (phím F)" : "Đánh dấu câu hỏi (phím F)"; }
  setHTML("qText", renderRich(q.text));
  setHTML("qImage", q.image ? '<img src="' + esc(q.image) + '" alt="Hình minh họa câu hỏi" onerror="this.style.display=\'none\'">' : "");

  const revealed = isRevealed(s, i);
  const ans = getAnswer(s, i);
  let oh = "";
  q.options.forEach(function (opt, idx) {
    const isSel = ans.indexOf(idx) !== -1;
    const isCor = q.correct.indexOf(idx) !== -1;
    let cls = "";
    if (revealed) { if (isCor) cls = "correct"; else if (isSel) cls = "wrong"; }
    else if (isSel) cls = "selected";
    oh += '<button type="button" class="option-card ' + cls + (revealed ? " locked" : "") + '" data-idx="' + idx + '" aria-pressed="' + (isSel ? "true" : "false") + '">' +
      '<span class="opt-badge">' + LETTERS.charAt(idx) + '</span><span class="opt-text rich-text">' + renderRich(opt) + "</span></button>";
  });
  setHTML("optionsList", oh);
  toggleEl("multiActions", s.mode !== "exam" && !s.review && q.type === "multiple" && !s.submitted[i]);

  const fbx = $("feedbackBox");
  if (fbx) {
    if (revealed && s.mode !== "exam" && !s.review) {
      const ok = gradeQ(q, ans);
      fbx.className = "feedback " + (ok ? "ok" : "bad");
      fbx.textContent = (ok ? "Chính xác! " : "Chưa chính xác. ") + (s.notes[i] || "");
    } else { fbx.className = "feedback hidden"; fbx.textContent = ""; }
  }
  const ex = $("explainBox");
  if (ex) {
    if (revealed && q.explanation) { ex.innerHTML = "<strong>Giải thích:</strong> " + renderRich(q.explanation); ex.classList.remove("hidden"); }
    else { ex.classList.add("hidden"); ex.innerHTML = ""; }
  }

  setText("posLabel", (i + 1) + " / " + total);
  const atStart = i === 0, atEnd = i >= total - 1;
  ["firstBtn", "prevBtn"].forEach(function (id) { const b = $(id); if (b) b.disabled = atStart; });
  ["nextBtn", "lastBtn"].forEach(function (id) { const b = $(id); if (b) b.disabled = atEnd; });

  renderPalette();
  updateTimerUI();
}
function renderPalette() {
  const s = state.session;
  if (!s) return;
  const f = state.palFilter;
  const pills = document.querySelectorAll("#palFilters .pill");
  for (let k = 0; k < pills.length; k++) pills[k].classList.toggle("active", pills[k].getAttribute("data-filter") === f);
  let html = "", shown = 0;
  for (let k = 0; k < s.questions.length; k++) {
    if (f === "answered" && getAnswer(s, k).length === 0) continue;
    if (f === "unanswered" && getAnswer(s, k).length > 0) continue;
    if (f === "flagged" && !s.flags[k]) continue;
    const st = questionState(s, k);
    shown++;
    html += '<button type="button" class="pal-btn ' + (st === "none" ? "" : st) + (s.flags[k] ? " flagged" : "") + (k === s.currentIndex ? " current" : "") +
      '" data-idx="' + k + '" aria-label="Câu ' + (k + 1) + (s.flags[k] ? " (đã cắm cờ)" : "") + '">' + (k + 1) + "</button>";
  }
  if (shown === 0) html = '<span class="muted" style="grid-column:1/-1">Không có câu nào phù hợp bộ lọc.</span>';
  setHTML("paletteGrid", html);
}
function goTo(i) { const s = state.session; if (!s) return; s.currentIndex = clamp(i, 0, s.questions.length - 1); saveProgress(); renderStudy(); }
function toggleFlag() { const s = state.session; if (!s) return; const i = s.currentIndex; if (s.flags[i]) delete s.flags[i]; else s.flags[i] = true; saveProgress(); renderStudy(); }
function selectOption(idx) {
  const s = state.session;
  if (!s || s.review) return;
  const i = s.currentIndex;
  const q = s.questions[i];
  if (!q || idx < 0 || idx >= q.options.length) return;
  if (s.mode !== "exam" && s.submitted[i]) return;
  let sel = getAnswer(s, i).slice();
  if (q.type === "multiple") {
    const p = sel.indexOf(idx);
    if (p === -1) sel.push(idx); else sel.splice(p, 1);
    sel.sort(function (a, b) { return a - b; });
  } else sel = [idx];
  s.answers[i] = sel;
  if (s.mode !== "exam" && q.type === "single") { submitCurrent(); return; }
  saveProgress();
  renderStudy();
}
function recordResult(s, i, ctx) {
  const q = s.questions[i];
  const ok = gradeQ(q, getAnswer(s, i));
  const key = q.deckId + "_" + q.origId;
  ctx.stats.attempts++;
  if (ok) ctx.stats.correct++;
  if (q.deckId) ctx.stats.decks[q.deckId] = true;
  if (s.mode === "mistake") {
    const m = ctx.mistakes[key];
    if (ok) {
      if (m) {
        m.streak = (Number(m.streak) || 0) + 1;
        if (m.streak >= 2) { delete ctx.mistakes[key]; s.notes[i] = "Đã đúng 2 lần liên tiếp – câu này được loại khỏi sổ tay."; }
        else s.notes[i] = "Chuỗi đúng: " + m.streak + "/2.";
      }
    } else if (m) { m.streak = 0; s.notes[i] = "Chuỗi đúng đã được đặt lại về 0."; }
  } else if (!ok) {
    const deck = getDeck(q.deckId);
    let orig = deck ? (deck.questions.filter(function (x) { return x.id === q.origId; })[0] || null) : null;
    if (!orig) orig = { id: q.origId, text: q.text, type: q.type, options: q.options, correct: q.correct, time: q.time, image: q.image, explanation: q.explanation };
    ctx.mistakes[key] = { deckId: q.deckId, question: orig, streak: 0 };
  }
  return ok;
}
function submitCurrent() {
  const s = state.session;
  if (!s || s.review || s.mode === "exam") return;
  const i = s.currentIndex;
  if (s.submitted[i]) return;
  if (getAnswer(s, i).length === 0) { showToast("Vui lòng chọn ít nhất một đáp án.", "warning"); return; }
  s.submitted[i] = true;
  const ctx = { stats: getStats(), mistakes: loadObj(KEYS.mistakes) };
  recordResult(s, i, ctx);
  saveJSON(KEYS.stats, ctx.stats);
  saveJSON(KEYS.mistakes, ctx.mistakes);
  saveProgress();
  renderStudy();
  updateChrome();
  if (Object.keys(s.submitted).length === s.questions.length) showToast("Chúc mừng! Bạn đã hoàn thành tất cả câu hỏi.", "success");
}
function nextQuestion() { const s = state.session; if (s) goTo(s.currentIndex + 1); }
function prevQuestion() { const s = state.session; if (s) goTo(s.currentIndex - 1); }
function handleEnterKey() {
  const s = state.session;
  if (!s) return;
  const q = s.questions[s.currentIndex];
  if (s.mode !== "exam" && !s.review && q && q.type === "multiple" && !s.submitted[s.currentIndex] && getAnswer(s, s.currentIndex).length > 0) submitCurrent();
  else nextQuestion();
}

/* Timer + exam */
function startTimer() { stopTimer(); state.timerId = setInterval(tick, 1000); updateTimerUI(); }
function stopTimer() { if (state.timerId) { clearInterval(state.timerId); state.timerId = null; } }
function remainingSeconds(s) { return Math.max(0, Math.round((s.endTime - Date.now()) / 1000)); }
function tick() {
  const s = state.session;
  if (!s || s.review) { stopTimer(); return; }
  if (s.mode === "exam" && remainingSeconds(s) <= 0) {
    stopTimer(); closeModal("confirmModal"); state.confirmCb = null;
    showToast("Đã hết giờ! Bài thi được nộp tự động.", "warning");
    finishExam();
    return;
  }
  updateTimerUI();
}
function fmtClock(sec) { return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0"); }
function updateTimerUI() {
  const s = state.session;
  const ring = $("timerRing"), txt = $("timerText"), lab = $("timerLabel");
  if (!s || !ring || !txt || !lab) return;
  ring.style.strokeDasharray = String(RING_C);
  let frac = 1, warn = false;
  if (s.review) {
    const sc = s.result ? parseFloat(s.result.score) : 0;
    txt.textContent = s.result ? s.result.score : "—"; lab.textContent = "Điểm hệ 10"; frac = clamp(sc / 10, 0, 1);
  } else if (s.mode === "exam") {
    const rem = remainingSeconds(s);
    txt.textContent = fmtClock(rem); lab.textContent = "Thời gian còn lại"; frac = s.minutes > 0 ? clamp(rem / (s.minutes * 60), 0, 1) : 0; warn = rem <= 60;
  } else {
    txt.textContent = fmtClock(Math.max(0, Math.round((Date.now() - s.startedAt) / 1000)));
    lab.textContent = "Thời gian phiên học"; frac = s.questions.length ? clamp(countDone(s) / s.questions.length, 0, 1) : 0;
  }
  ring.style.strokeDashoffset = String(RING_C * (1 - frac));
  ring.classList.toggle("warn", warn);
}
function finishExam() {
  const s = state.session;
  if (!s || s.mode !== "exam" || s.review) return;
  stopTimer();
  const ctx = { stats: getStats(), mistakes: loadObj(KEYS.mistakes) };
  let correct = 0, unanswered = 0;
  s.questions.forEach(function (q, i) { if (getAnswer(s, i).length === 0) unanswered++; if (recordResult(s, i, ctx)) correct++; });
  const total = s.questions.length;
  const score = ((correct / total) * 10).toFixed(2);
  saveJSON(KEYS.stats, ctx.stats);
  saveJSON(KEYS.mistakes, ctx.mistakes);
  const hist = loadArr(KEYS.history);
  hist.push({ deckId: s.deckId, deckTitle: s.title, date: new Date().toISOString(), score: score, correct: correct, total: total });
  saveJSON(KEYS.history, hist.slice(-200));
  s.review = true;
  s.result = { score: score, correct: correct, total: total, unanswered: unanswered };
  s.currentIndex = 0;
  state.palFilter = null;
  if (state.tab !== "study") showTab("study"); else renderTab();
  window.scrollTo(0, 0);
}
function requestFinish() {
  const s = state.session;
  if (!s || s.review) return;
  if (s.mode === "exam") {
    let un = 0;
    for (let i = 0; i < s.questions.length; i++) if (getAnswer(s, i).length === 0) un++;
    showConfirm("Nộp bài thi", un > 0 ? "Bạn còn " + un + " câu chưa trả lời. Bạn có chắc chắn muốn nộp bài?" : "Bạn có chắc chắn muốn nộp bài?", finishExam);
  } else {
    const done = countDone(s);
    showConfirm("Hoàn thành phiên học", "Bạn đã hoàn thành " + done + "/" + s.questions.length + " câu. Kết thúc phiên học bây giờ?", function () {
      showToast("Đã kết thúc phiên học: " + done + "/" + s.questions.length + " câu.", "success");
      leaveStudy();
    });
  }
}
function leaveStudy() { stopTimer(); state.session = null; navigateTo("/practice", { replace: true }); }
function requestExit() {
  const s = state.session;
  if (!s) return;
  if (s.mode === "exam" && !s.review) showConfirm("Thoát bài thi", "Nếu thoát bây giờ, bài thi đang làm sẽ bị hủy và không được lưu điểm. Bạn có chắc chắn?", leaveStudy);
  else leaveStudy();
}
function requestReset() {
  const s = state.session;
  if (!s || s.mode !== "practice") return;
  const deck = getDeck(s.deckId);
  showConfirm("Làm lại từ đầu", "Toàn bộ tiến độ ôn tập của bộ đề này sẽ bị xóa. Bạn có chắc chắn muốn làm lại từ đầu?", function () {
    const prog = loadObj(KEYS.progress); delete prog[s.deckId]; saveJSON(KEYS.progress, prog);
    stopTimer(); state.session = null; renderTab();
    if (deck) openConfig("practice", deck);
  });
}

/* ------------------------------ Flashcards ------------------------------ */
function renderFlash() {
  const f = state.flash;
  if (!f) return;
  const q = f.questions[f.index];
  if (!q) return;
  const card = $("flipCard"); if (card) card.classList.toggle("flipped", f.flipped);
  setHTML("flashFront", '<div class="f-text">' + renderRich(q.text) + "</div>" + (q.image ? '<img src="' + esc(q.image) + '" alt="Hình minh họa" onerror="this.style.display=\'none\'">' : ""));
  const answers = q.correct.map(function (c) { return "<li>" + LETTERS.charAt(c) + ". " + renderRich(q.options[c]) + "</li>"; }).join("");
  setHTML("flashBack", "<strong>Đáp án đúng:</strong><ul>" + answers + "</ul>" + (q.explanation ? '<div class="f-expl"><strong>Giải thích:</strong> ' + renderRich(q.explanation) + "</div>" : ""));
  setText("flashCounter", (f.index + 1) + "/" + f.questions.length);
  const p = $("flashPrevBtn"); if (p) p.disabled = f.index === 0;
  const n = $("flashNextBtn"); if (n) n.disabled = f.index >= f.questions.length - 1;
}
function flashFlip() { if (state.flash) { state.flash.flipped = !state.flash.flipped; renderFlash(); } }
function flashMove(d) {
  const f = state.flash;
  if (!f) return;
  const ni = clamp(f.index + d, 0, f.questions.length - 1);
  if (ni === f.index) return;
  f.index = ni; f.flipped = false;
  renderFlash();
}

/* ------------------------------ Import / Export (Synced 11-Column) ------------------------------ */
function parseWorkbookRows(rows) {
  const out = { questions: [], errors: [], valid: 0 };
  if (!Array.isArray(rows) || rows.length === 0) { out.errors.push("File không có dữ liệu câu hỏi."); return out; }
  const keys = Object.keys(rows[0]).map(function (k) { return k.trim(); });
  const missing = XLSX_HEADERS.filter(function (h) { return keys.indexOf(h) === -1; });
  if (missing.length > 0) { out.errors.push("File thiếu các cột bắt buộc: " + missing.join(", ")); return out; }
  const ts = Date.now();
  rows.forEach(function (row, index) {
    const line = index + 2;
    const cell = function (h) {
      let v = row[h];
      if (v === undefined) {
        const matchKey = Object.keys(row).find(function (k) { return k.trim() === h; });
        if (matchKey) v = row[matchKey];
      }
      return v === undefined || v === null ? "" : v;
    };
    if (XLSX_HEADERS.every(function (h) { return String(cell(h)).replace(/\u00A0/g, " ").trim() === ""; })) return;
    const errs = [];
    const text = String(cell("Question Text")).replace(/\u00A0/g, " ").trim();
    if (!text) errs.push("Dòng " + line + ": Thiếu nội dung câu hỏi");
    const rawOpts = [];
    const origToCompact = {};
    for (let n = 1; n <= 5; n++) {
      const v = String(cell("Option " + n)).replace(/\u00A0/g, " ").trim();
      if (v) { origToCompact[n - 1] = rawOpts.length; rawOpts.push(v); }
    }
    if (rawOpts.length < 2) errs.push("Dòng " + line + ": Cần ít nhất 2 phương án trả lời");
    const rawAns = String(cell("Correct Answer")).replace(/\u00A0/g, " ").trim();
    let tokens = rawAns.split(/[,;\/\s]+/).map(function (t) { return t.replace(/[.()]/g, "").trim(); }).filter(Boolean);
    let correct = tokens.map(function (t) {
      let origIdx = -1;
      if (/^[1-5]$/.test(t)) origIdx = Number(t) - 1;
      else if (/^[A-Ea-e]$/.test(t)) origIdx = "ABCDE".indexOf(t.toUpperCase());
      if (origIdx === -1) return -1;
      return origToCompact[origIdx] !== undefined ? origToCompact[origIdx] : (origIdx < rawOpts.length ? origIdx : -1);
    });
    correct = Array.from(new Set(correct)).sort(function (a, b) { return a - b; });
    if (correct.length === 0 || correct.some(function (c) { return c < 0 || c >= rawOpts.length; })) {
      errs.push("Dòng " + line + ": Đáp án đúng không hợp lệ (\"" + rawAns + "\")");
    }
    if (errs.length > 0) { errs.forEach(function (e) { out.errors.push(e); }); return; }
    const rawType = String(cell("Question Type")).trim().toLowerCase();
    const type = (rawType === "checkbox" || correct.length > 1) ? "multiple" : "single";
    const tm = parseInt(cell("Time in seconds"), 10);
    out.questions.push({
      id: "q_" + ts + "_" + out.questions.length,
      text: text,
      type: type,
      options: rawOpts,
      correct: correct,
      time: tm > 0 ? tm : 30,
      image: String(cell("Image Link")).trim(),
      explanation: String(cell("Answer explanation")).trim()
    });
  });
  out.valid = out.questions.length;
  if (out.valid === 0 && out.errors.length === 0) out.errors.push("File không có dòng câu hỏi nào.");
  return out;
}

function addOrMergeDeck(opts) {
  // opts: { mode: 'new'|'merge', title, tag, targetDeckId, questions }
  const qs = Array.isArray(opts.questions) ? opts.questions.map(normalizeQuestion).filter(Boolean) : [];
  if (qs.length === 0) { showToast("Chưa có câu hỏi hợp lệ để nhập.", "warning"); return null; }
  const limits = effectiveLimits();
  const decks = loadArr(KEYS.decks);
  const ts = Date.now();
  let savedDeck = null;

  if (opts.mode === "merge") {
    if (!requireFeature("merge")) return null;
    const target = decks.filter(function (d) { return d && String(d.id) === String(opts.targetDeckId); })[0];
    if (!target || !Array.isArray(target.questions)) { showToast("Vui lòng chọn một bộ đề cá nhân để gộp.", "warning"); return null; }
    if (target.questions.length + qs.length > limits.maxQ) {
      promptUpgrade("Gói " + limits.name + " chỉ cho phép tối đa " + limits.maxQ + " câu mỗi bộ đề.");
      return null;
    }
    const offset = target.questions.length;
    qs.forEach(function (q, i) { target.questions.push(Object.assign({}, q, { id: "q_" + ts + "_" + (offset + i) })); });
    savedDeck = target;
  } else {
    const title = String(opts.title || "").trim();
    const tag = String(opts.tag || "").trim();
    if (!title) { showToast("Vui lòng nhập tên bộ đề.", "warning"); return null; }
    if (getUserDecks().length >= limits.maxDecks) {
      promptUpgrade("Gói " + limits.name + " chỉ cho phép tối đa " + limits.maxDecks + " bộ đề cá nhân.");
      return null;
    }
    if (qs.length > limits.maxQ) {
      promptUpgrade("Gói " + limits.name + " chỉ cho phép tối đa " + limits.maxQ + " câu mỗi bộ đề.");
      return null;
    }
    savedDeck = {
      id: "user_" + ts,
      title: title,
      tag: tag || "Chưa phân loại",
      isBuiltIn: false,
      questions: qs.map(function (q, i) { return Object.assign({}, q, { id: "q_" + ts + "_" + i }); })
    };
    decks.push(savedDeck);
  }
  if (!saveJSON(KEYS.decks, decks)) return null;
  rebuildDecks();
  renderTab();
  showToast("Đã nhập " + qs.length + " câu hỏi vào Kho đề thành công!", "success");
  return savedDeck;
}

function openImport() {
  state.importResult = null;
  const f = $("importFile"); if (f) f.value = "";
  const n = $("importName"); if (n) n.value = "";
  const t = $("importTag"); if (t) t.value = "";
  const radios = document.getElementsByName("importMode");
  for (let i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === "new";
  toggleEl("newDeckFields", true);
  toggleEl("mergeFields", false);
  toggleEl("importPreview", false);
  setHTML("importPreview", "");
  const c = $("importConfirm"); if (c) c.disabled = true;
  const rm = $("radioMerge"); if (rm) rm.disabled = !can("merge");
  toggleEl("mergeLock", !can("merge"));
  const users = getUserDecks();
  const sel = $("mergeSelect");
  if (sel) {
    sel.innerHTML = users.length
      ? users.map(function (d) { return '<option value="' + esc(d.id) + '">' + esc(d.title) + " (" + d.questions.length + " câu)</option>"; }).join("")
      : '<option value="">Chưa có bộ đề cá nhân nào</option>';
  }
  openModal("importModal");
}
function currentImportMode() {
  const radios = document.getElementsByName("importMode");
  for (let i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value;
  return "new";
}
function renderImportPreview() {
  const r = state.importResult;
  if (!r) return;
  let html = '<div class="ok-line">Hợp lệ: ' + r.valid + " câu hỏi</div>";
  if (r.errors.length > 0) {
    html += '<div class="err-line">Lỗi: ' + r.errors.length + " mục (các dòng lỗi sẽ bị bỏ qua)</div><ul>" +
      r.errors.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>";
  }
  setHTML("importPreview", html);
  toggleEl("importPreview", true);
  const c = $("importConfirm"); if (c) c.disabled = r.valid === 0;
}
function onImportFile(e) {
  const file = e.target && e.target.files ? e.target.files[0] : null;
  state.importResult = null;
  const c = $("importConfirm"); if (c) c.disabled = true;
  if (!file) { toggleEl("importPreview", false); return; }
  if (typeof XLSX === "undefined") { showToast("Thư viện đọc Excel chưa tải xong. Vui lòng thử lại.", "error"); return; }
  const reader = new FileReader();
  reader.onerror = function () { showToast("Không thể đọc file đã chọn.", "error"); };
  reader.onload = function (ev) {
    try {
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
      const name = wb.SheetNames && wb.SheetNames[0];
      const ws = name ? wb.Sheets[name] : null;
      if (!ws) throw new Error("no sheet");
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      state.importResult = parseWorkbookRows(rows);
      const nameEl = $("importName");
      if (nameEl && !nameEl.value.trim()) nameEl.value = file.name.replace(/\.[^.]+$/, "");
      renderImportPreview();
    } catch (err) {
      state.importResult = null;
      setHTML("importPreview", '<div class="err-line">Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng.</div>');
      toggleEl("importPreview", true);
    }
  };
  try { reader.readAsArrayBuffer(file); } catch (err) { showToast("Không thể đọc file đã chọn.", "error"); }
}
function confirmImport() {
  const r = state.importResult;
  if (!r || r.valid === 0) { showToast("Chưa có câu hỏi hợp lệ để nhập.", "warning"); return; }
  const saved = addOrMergeDeck({
    mode: currentImportMode(),
    title: $("importName") ? $("importName").value.trim() : "",
    tag: $("importTag") ? $("importTag").value.trim() : "",
    targetDeckId: $("mergeSelect") ? $("mergeSelect").value : "",
    questions: r.questions
  });
  if (saved) closeModal("importModal");
}
function downloadTemplate() {
  if (typeof XLSX === "undefined") { showToast("Thư viện Excel chưa tải xong. Vui lòng thử lại.", "error"); return; }
  try {
    const rows = [
      XLSX_HEADERS,
      ["Tính giới hạn $L = \\lim_{x \\to 0} \\frac{\\sin 3x}{x}$:", "Multiple Choice", "1", "3", "$\\frac{1}{3}$", "0", "", "2", 30, "", "Áp dụng $\\lim_{u \\to 0} \\frac{\\sin u}{u} = 1$, suy ra $L = 3$."],
      ["Choose the word whose underlined part differs in pronunciation:", "Multiple Choice", "biom<u>a</u>ss", "a<u>c</u>tivity", "effi<u>c</u>ient", "<u>a</u>lthough", "", "1", 30, "", "Phần gạch chân ở <b>biomass</b> phát âm khác các phương án còn lại."],
      ["Những số nào là số nguyên tố?", "Checkbox", "2", "4", "5", "9", "", "1,3", 45, "", "2 và 5 là số nguyên tố."]
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Questions");
    XLSX.writeFile(wb, "AI_Tutor.xlsx");
  } catch (e) { showToast("Không thể tạo file mẫu.", "error"); }
}
function exportJSON(deck) {
  try {
    downloadBlob(new Blob([JSON.stringify({ id: deck.id, title: deck.title, tag: deck.tag, questions: deck.questions }, null, 2)], { type: "application/json" }), fileSafe(deck.title) + ".json");
  } catch (e) { showToast("Không thể xuất file .json.", "error"); }
}
function exportXLSX(deck) {
  if (typeof XLSX === "undefined") { showToast("Thư viện Excel chưa tải xong. Vui lòng thử lại.", "error"); return; }
  try {
    const rows = [XLSX_HEADERS];
    deck.questions.forEach(function (q) {
      const o = [];
      for (let n = 0; n < 5; n++) o.push(q.options[n] !== undefined ? q.options[n] : "");
      rows.push([q.text, q.type === "multiple" ? "Checkbox" : "Multiple Choice", o[0], o[1], o[2], o[3], o[4],
        q.correct.map(function (c) { return c + 1; }).join(","), q.time || 30, q.image || "", q.explanation || ""]);
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Questions");
    XLSX.writeFile(wb, fileSafe(deck.title) + ".xlsx");
  } catch (e) { showToast("Không thể xuất file .xlsx.", "error"); }
}

/* ------------------------------ 5-Tier Pricing & Manual Approval Checkout ------------------------------ */
function getPayCfg() {
  const c = loadObj(KEYS.payCfg);
  const d = DEFAULT_PAYMENT_CONFIG;
  return {
    bankName: String(c.bankName || d.bankName).trim(),
    bankId: String(c.bankId || d.bankId).trim(),
    accountNo: String(c.accountNo || d.accountNo).trim(),
    accountName: String(c.accountName || d.accountName).trim()
  };
}
function ensurePayCfg() { if (!loadJSON(KEYS.payCfg, null)) saveJSON(KEYS.payCfg, getPayCfg()); }
function getVouchers() {
  return loadArr(KEYS.vouchers).filter(function (v) { return v && typeof v.code === "string" && Number(v.discountPercent) > 0; });
}

async function activateUnranked() {
  if (!state.user) return;
  const email = state.user.email.toLowerCase();
  if (tierRank() >= 2) { showToast("Bạn đang sở hữu gói cao hơn Unranked.", "info"); return; }
  const subs = loadObj(KEYS.subs);
  subs[email] = { tier: "unranked", since: Date.now(), expires: Date.now() + 365 * DAY_MS };
  const r = await apiCall("/api/subscriptions/unranked", "POST", { email: email });
  if (r && r._err) { showToast("Lỗi máy chủ: " + r._err, "error"); return; }
  saveJSON(KEYS.subs, subs);
  updateChrome();
  renderTab();
  showToast("Đã kích hoạt ngay gói Unranked (0đ/năm) thành công!", "success");
}

async function adminSwitchOwnTier(code) {
  if (!assertAdmin() || !state.user || !TIERS[code] || code === "none") return;
  const email = state.user.email.toLowerCase();
  const r = await apiCall("/api/admin/subscriptions", "POST", { email: email, tier: code });
  if (r && r._err) { showToast("Lỗi máy chủ: " + r._err, "error"); return; }
  adminActivatePaidTier(email, code);
  updateChrome();
  renderTab();
  showToast("Đã kích hoạt trực tiếp gói " + TIERS[code].name + " cho tài khoản Admin (không qua hàng chờ duyệt).", "success");
}

function renderPricing() {
  const adm = isAdmin();
  const cur = currentTier();
  const curRank = TIER_ORDER.indexOf(cur);
  const sub = state.user ? getActiveSub(state.user.email) : null;
  const pendings = state.user ? getUserPendingReqs(state.user.email) : [];
  const pendingPlans = {};
  pendings.forEach(function (r) { pendingPlans[r.plan] = r; });

  setText("pricingNote", adm
    ? "👑 Admin (Diamond): Bạn có mặc định toàn quyền Diamond VIP không giới hạn. Bạn có thể bấm \"Kích hoạt ngay (Admin)\" trên bất kỳ gói nào để chuyển đổi thử nghiệm trực tiếp."
    : (cur === "none"
      ? "Đăng ký gói Unranked (0đ/năm) để kích hoạt ngay lập tức, hoặc chọn 1 trong 4 hạng gói trả phí (chờ Admin xác nhận)."
      : "Gói hiện tại của bạn: " + TIERS[cur].icon + " " + TIERS[cur].full + (sub && cur !== "unranked" ? " • Hết hạn: " + fmtDate(sub.expires) : " • Miễn phí 0đ/năm")));

  // Pending box on Pricing
  const pBox = $("pricingPendingBox");
  if (pBox) {
    if (pendings.length > 0 && !adm) {
      pBox.innerHTML = pendings.map(function (r) {
        return "<div>⏳ <strong>Đang chờ duyệt gói " + esc(TIERS[r.plan] ? TIERS[r.plan].name : r.plan) + "</strong> (" + esc(fmtMoney(r.amount)) + ") • Gửi lúc " + esc(fmtDateTime(r.createdAt)) + "</div>";
      }).join("");
      pBox.classList.remove("hidden");
    } else { pBox.classList.add("hidden"); pBox.innerHTML = ""; }
  }

  // Unranked Banner (Tier 1)
  const unBtn = adm
    ? (cur === "unranked" ? '<span class="badge badge-ok">✓ Đang bật (Admin)</span>' : '<button type="button" class="btn btn-outline btn-sm" data-admin-switch="unranked">⚡ Kích hoạt ngay (Admin)</button>')
    : (cur === "unranked"
      ? '<span class="badge badge-ok">✓ Gói hiện tại</span>'
      : (curRank > 1
        ? '<button type="button" class="btn btn-outline" disabled>Bạn đã có gói cao hơn</button>'
        : '<button type="button" class="btn btn-emerald" data-activate-free="unranked">Đăng ký miễn phí (0đ)</button>'));
  setHTML("unrankedBanner",
    '<div class="unranked-banner' + (cur === "unranked" ? " current" : "") + '">' +
      '<div style="flex:1;min-width:260px">' +
        '<div class="rank-head"><span class="rank-crest crest-unranked">🛡️</span><div>' +
          '<div class="price-name">Unranked <span class="muted" style="font-weight:500;font-size:.86rem">(Chưa xếp hạng)</span> • <strong style="color:var(--emerald)">0đ / năm</strong></div>' +
          '<div class="price-sub">Đăng ký &amp; kích hoạt ngay lập tức – không cần thanh toán, không cần chờ Admin duyệt</div>' +
        '</div></div>' +
        '<ul class="unranked-feats">' + PRICING_FEATURES.unranked.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" +
      "</div>" +
      '<div>' + unBtn + "</div>" +
    "</div>");

  // 4 Paid Rank Cards
  let html = "";
  ["bronze", "silver", "gold", "diamond"].forEach(function (code) {
    const t = TIERS[code];
    const r = TIER_ORDER.indexOf(code);
    const isPend = !!pendingPlans[code];
    let btn;
    if (adm) {
      btn = cur === code
        ? '<button type="button" class="btn btn-emerald" disabled>👑 Đang kích hoạt (Admin)</button>'
        : '<button type="button" class="btn btn-primary" data-admin-switch="' + code + '">⚡ Kích hoạt ngay (Admin)</button>';
    }
    else if (isPend) btn = '<button type="button" class="btn btn-amber" disabled>⏳ Đang chờ Admin duyệt</button>';
    else if (cur === code) btn = '<button type="button" class="btn btn-outline" data-buy="' + code + '">✓ Gói hiện tại (Gia hạn)</button>';
    else if (r < curRank) btn = '<button type="button" class="btn btn-outline" disabled>Bạn đã có gói cao hơn</button>';
    else btn = '<button type="button" class="btn btn-primary" data-buy="' + code + '">Chọn gói ' + esc(t.name) + "</button>";

    html += '<article class="price-card ' + t.cls + (cur === code ? " current" : "") + '">' +
      (code === "gold" ? '<span class="price-ribbon gold">Phổ biến</span>' : "") +
      (code === "diamond" ? '<span class="price-ribbon diamond">Diamond VIP</span>' : "") +
      '<div class="rank-head"><span class="rank-crest crest-' + code + '">' + t.icon + '</span><div>' +
        '<div class="price-name">' + esc(t.name) + '</div><div class="price-sub">' + esc(t.sub) + "</div>" +
      "</div></div>" +
      '<div class="price-amount">' + t.price.toLocaleString("vi-VN") + "đ <small>/ năm</small></div>" +
      '<ul class="price-feats">' + PRICING_FEATURES[code].map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" +
      btn + "</article>";
  });
  setHTML("pricingGrid", html);

  renderUserPaymentHistory();
}

function renderUserPaymentHistory() {
  if (!state.user) return;
  const email = state.user.email.toLowerCase();
  const list = loadArr(KEYS.payReqs).filter(function (r) {
    return r && String(r.userEmail || "").toLowerCase() === email;
  }).slice().reverse();
  if (list.length === 0) {
    setHTML("userPayHistoryBody", '<p class="muted" style="margin:0">Bạn chưa gửi yêu cầu thanh toán nào.</p>');
    return;
  }
  const stBadge = function (st) {
    if (st === "approved") return '<span class="badge badge-ok">✅ Đã duyệt</span>';
    if (st === "rejected") return '<span class="badge badge-bad">❌ Bị từ chối</span>';
    return '<span class="badge badge-warn">⏳ Chờ duyệt</span>';
  };
  setHTML("userPayHistoryBody", '<table class="data-table"><thead><tr><th>Thời gian gửi</th><th>Gói</th><th>Số tiền</th><th>Ghi chú / Mã GD</th><th>Trạng thái</th><th>Phản hồi từ Admin</th></tr></thead><tbody>' +
    list.map(function (r) {
      let note = "—";
      if (r.status === "approved") note = "Đã duyệt lúc " + fmtDateTime(r.reviewedAt);
      else if (r.status === "rejected") note = '<span style="color:var(--rose);font-weight:600">' + esc(r.rejectReason || "Yêu cầu bị từ chối") + '</span> <button type="button" class="btn btn-outline btn-sm" data-buy="' + esc(r.plan) + '">Gửi lại</button>';
      else note = "Đang chờ Quản trị viên xác nhận";
      return "<tr><td>" + esc(fmtDateTime(r.createdAt)) + "</td><td><strong>" + esc(TIERS[r.plan] ? TIERS[r.plan].name : r.plan) + "</strong></td><td>" +
        esc(fmtMoney(r.amount)) + "</td><td>" + esc(r.transferNote || r.memo || "—") + "</td><td>" + stBadge(r.status) + "</td><td>" + note + "</td></tr>";
    }).join("") + "</tbody></table>");
}

function checkoutAmount() {
  const c = state.checkout;
  if (!c) return 0;
  const pct = c.voucher ? clamp(Number(c.voucher.discountPercent) || 0, 0, 100) : 0;
  return Math.max(0, Math.round(TIERS[c.tier].price * (100 - pct) / 100));
}
function checkoutMemo() {
  const c = state.checkout;
  const prefix = state.user ? state.user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 20) : "";
  return "AITUTOR " + prefix + " " + (c ? TIERS[c.tier].memo : "");
}
function openCheckout(code) {
  if (!state.user || !TIERS[code] || code === "none" || code === "unranked") return;
  if (isAdmin()) { adminSwitchOwnTier(code); return; }
  const dup = getUserPendingReqs(state.user.email).some(function (r) { return r.plan === code; });
  if (dup) {
    showToast("Bạn đã có yêu cầu đang chờ duyệt cho gói " + TIERS[code].name + ". Vui lòng chờ Quản trị viên xác nhận.", "warning");
    return;
  }
  state.checkout = { tier: code, voucher: null, receiptImage: "", busy: false };
  const vi = $("voucherInput"); if (vi) vi.value = "";
  const vm = $("voucherMsg"); if (vm) { vm.textContent = ""; vm.className = "voucher-msg"; }
  const tn = $("coTransferNote"); if (tn) tn.value = "";
  const rf = $("coReceiptFile"); if (rf) rf.value = "";
  const rp = $("coReceiptPreview"); if (rp) { rp.src = ""; rp.classList.add("hidden"); }
  toggleEl("coReceiptClear", false);
  renderCheckout();
  openModal("checkoutModal");
  syncWithBackend().then(function () {
    if (state.checkout) renderCheckout();
  });
}
function renderCheckout() {
  const c = state.checkout;
  if (!c) return;
  const t = TIERS[c.tier];
  const cfg = getPayCfg();
  const amount = checkoutAmount();
  const memo = checkoutMemo();
  const pct = c.voucher ? c.voucher.discountPercent : 0;
  setText("checkoutTitle", "Thanh toán – " + t.full);
  setText("coTier", t.icon + " " + t.name + " (365 ngày sau khi duyệt)");
  setText("coBase", fmtMoney(t.price));
  setText("coDiscount", pct > 0 ? "-" + pct + "% (" + c.voucher.code + ")" : "Không có");
  setText("coFinal", fmtMoney(amount));
  setText("coBank", (cfg.bankName || "Chưa cấu hình") + (cfg.bankId ? " (" + cfg.bankId + ")" : ""));
  setText("coAcc", cfg.accountNo || "Chưa cấu hình");
  setText("coHolder", cfg.accountName || "Chưa cấu hình");
  setText("coMemo", memo);
  const img = $("qrImg"), fb = $("qrFallback"), pay = $("payBtn");
  const configured = !!(cfg.bankId && cfg.accountNo);
  if (img) img.classList.add("hidden");
  if (fb) fb.classList.remove("hidden");
  if (amount === 0) {
    if (fb) fb.textContent = "Mã giảm giá 100% – bạn không cần chuyển khoản. Bấm \"Tôi đã thanh toán\" để gửi Quản trị viên xác nhận.";
  } else if (!configured) {
    if (fb) fb.textContent = "Quản trị viên chưa cấu hình tài khoản VietQR.";
  } else if (img) {
    const url = "https://img.vietqr.io/image/" + encodeURIComponent(cfg.bankId) + "-" + encodeURIComponent(cfg.accountNo) + "-compact2.png?amount=" + amount +
      "&addInfo=" + encodeURIComponent(memo) + (cfg.accountName ? "&accountName=" + encodeURIComponent(cfg.accountName) : "");
    img.onload = function () { img.classList.remove("hidden"); if (fb) fb.classList.add("hidden"); };
    img.onerror = function () { img.classList.add("hidden"); if (fb) { fb.classList.remove("hidden"); fb.textContent = "Không tải được mã QR. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh."; } };
    if (fb) fb.textContent = "Đang tải mã QR...";
    img.src = url;
  }
  if (pay) {
    pay.disabled = c.busy || (amount > 0 && !configured);
    pay.innerHTML = c.busy ? '<span class="spinner"></span>Đang gửi yêu cầu...' : "Tôi đã thanh toán";
  }
}
function onReceiptFile(e) {
  const f = e.target && e.target.files ? e.target.files[0] : null;
  if (!f || !state.checkout) return;
  if (!/^image\//.test(f.type)) { showToast("Vui lòng chọn file ảnh biên lai.", "warning"); return; }
  const reader = new FileReader();
  reader.onload = function (ev) {
    const im = new Image();
    im.onload = function () {
      try {
        const MAX = 800;
        const scale = Math.min(1, MAX / Math.max(im.width, im.height));
        const cw = Math.round(im.width * scale), ch = Math.round(im.height * scale);
        const cv = document.createElement("canvas");
        cv.width = cw; cv.height = ch;
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(im, 0, 0, cw, ch);
        state.checkout.receiptImage = cv.toDataURL("image/jpeg", 0.72);
        const rp = $("coReceiptPreview");
        if (rp) { rp.src = state.checkout.receiptImage; rp.classList.remove("hidden"); }
        toggleEl("coReceiptClear", true);
      } catch (err) { showToast("Không thể xử lý ảnh biên lai.", "error"); }
    };
    im.src = ev.target.result;
  };
  reader.readAsDataURL(f);
}
async function applyVoucher() {
  const c = state.checkout;
  if (!c || c.busy) return;
  const code = ($("voucherInput") ? $("voucherInput").value : "").trim().toUpperCase();
  const vm = $("voucherMsg");
  if (!code) { if (vm) { vm.textContent = "Vui lòng nhập mã giảm giá."; vm.className = "voucher-msg bad"; } return; }
  let v = getVouchers().filter(function (x) { return x.code.toUpperCase() === code; })[0];
  if (!v) {
    await syncWithBackend();
    v = getVouchers().filter(function (x) { return x.code.toUpperCase() === code; })[0];
  }
  if (!v) { c.voucher = null; if (vm) { vm.textContent = "Mã giảm giá không hợp lệ hoặc đã bị xóa."; vm.className = "voucher-msg bad"; } renderCheckout(); return; }
  c.voucher = { code: v.code.toUpperCase(), discountPercent: clamp(Number(v.discountPercent), 1, 100) };
  if (vm) { vm.textContent = "Áp dụng thành công: giảm " + c.voucher.discountPercent + "%."; vm.className = "voucher-msg ok"; }
  renderCheckout();
}

/* STRICT MANUAL APPROVAL: NEVER UPGRADES TIER IMMEDIATELY */
async function submitPaymentRequest() {
  const c = state.checkout;
  if (!c || c.busy || !state.user) return;
  const email = state.user.email.toLowerCase();
  if (getUserPendingReqs(email).some(function (r) { return r.plan === c.tier; })) {
    showToast("Bạn đã có một đơn đang chờ duyệt cho gói " + TIERS[c.tier].name + ".", "warning");
    closeModal("checkoutModal");
    return;
  }
  c.busy = true;
  renderCheckout();
  const uEff = effectiveUser();
  const reqObj = {
    id: "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    userId: state.user.uid || email,
    userEmail: email,
    userName: uEff ? uEff.name : state.user.name,
    plan: c.tier,
    amount: checkoutAmount(),
    voucher: c.voucher ? c.voucher.code : "",
    memo: checkoutMemo(),
    transferNote: ($("coTransferNote") ? $("coTransferNote").value : "").trim(),
    receiptImage: c.receiptImage || "",
    status: "pending",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectReason: ""
  };
  try {
    const res = await apiCall("/api/payment-requests", "POST", reqObj);
    if (res && res._err) { showToast("Không thể gửi yêu cầu: " + res._err, "error"); c.busy = false; renderCheckout(); return; }
    const list = loadArr(KEYS.payReqs);
    list.push(reqObj);
    if (!saveJSON(KEYS.payReqs, list)) { c.busy = false; renderCheckout(); return; }
    const planName = TIERS[c.tier].name;
    state.checkout = null;
    closeModal("checkoutModal");
    renderTab();
    showToast("Yêu cầu thanh toán gói " + planName + " đã được ghi nhận và đang chờ Quản trị viên xác nhận. Gói sẽ tự động kích hoạt ngay sau khi được duyệt.", "info");
  } catch (e) {
    c.busy = false;
    renderCheckout();
    showToast("Đã xảy ra lỗi khi gửi yêu cầu thanh toán.", "error");
  }
}

/* ------------------------------ Admin Panel (phamduchieurobotics@gmail.com ONLY) ------------------------------ */
function adminActivatePaidTier(email, plan) {
  if (!assertAdmin()) return false;
  const subs = loadObj(KEYS.subs);
  const key = String(email).trim().toLowerCase();
  const old = getActiveSub(key);
  const start = old && old.tier === plan ? Number(old.expires) : Date.now();
  subs[key] = { tier: plan, since: old && old.since ? old.since : Date.now(), expires: Math.max(start, Date.now()) + 365 * DAY_MS };
  return saveJSON(KEYS.subs, subs);
}

function renderAdmin() {
  if (!isAdmin()) { setHTML("adminBody", ""); return; }
  const reqs = loadArr(KEYS.payReqs);
  const pendingCnt = reqs.filter(function (r) { return r && r.status === "pending"; }).length;
  const approvedList = reqs.filter(function (r) { return r && r.status === "approved"; });
  const revenue = approvedList.reduce(function (acc, r) { return acc + (Number(r.amount) || 0); }, 0);

  const tabs = [
    ["requests", "Duyệt thanh toán (" + pendingCnt + ")"],
    ["members", "Thành viên & Cấp gói"],
    ["cfg", "Cấu hình VietQR"],
    ["voucher", "Mã giảm giá"],
    ["backup", "Sao lưu hệ thống"]
  ];
  let h = '<h2>Bảng điều khiển Quản trị (Admin Panel)</h2>' +
    '<div class="admin-grid">' +
      '<div class="kpi-card"><span class="kpi-label">Đơn đang chờ duyệt</span><span class="kpi-value" style="color:var(--amber)">' + pendingCnt + '</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">Đơn đã duyệt</span><span class="kpi-value" style="color:var(--emerald)">' + approvedList.length + '</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">Tổng doanh thu đã duyệt</span><span class="kpi-value">' + esc(fmtMoney(revenue)) + '</span></div>' +
    '</div>' +
    '<div class="admin-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button type="button" class="admin-tab' + (state.adminTab === t[0] ? " active" : "") + '" data-act="subtab" data-sub="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>";

  if (state.adminTab === "requests") h += adminRequestsHTML();
  else if (state.adminTab === "members") h += adminMembersHTML();
  else if (state.adminTab === "cfg") h += adminCfgHTML();
  else if (state.adminTab === "voucher") h += adminVoucherHTML();
  else h += adminBackupHTML();

  setHTML("adminBody", h);
  if (state.adminTab === "requests") renderAdminRequestsTable();
}

function adminRequestsHTML() {
  return '<div class="filter-bar">' +
    '<select id="admStatusFilter" aria-label="Lọc trạng thái">' +
      '<option value="all"' + (state.adminStatusFilter === "all" ? " selected" : "") + '>Tất cả trạng thái</option>' +
      '<option value="pending"' + (state.adminStatusFilter === "pending" ? " selected" : "") + '>⏳ Chờ duyệt</option>' +
      '<option value="approved"' + (state.adminStatusFilter === "approved" ? " selected" : "") + '>✅ Đã duyệt</option>' +
      '<option value="rejected"' + (state.adminStatusFilter === "rejected" ? " selected" : "") + '>❌ Từ chối</option>' +
    '</select>' +
    '<select id="admPlanFilter" aria-label="Lọc theo gói">' +
      '<option value="all"' + (state.adminPlanFilter === "all" ? " selected" : "") + '>Tất cả gói</option>' +
      ["bronze", "silver", "gold", "diamond"].map(function (c) {
        return '<option value="' + c + '"' + (state.adminPlanFilter === c ? " selected" : "") + '>' + esc(TIERS[c].name) + '</option>';
      }).join("") +
    '</select>' +
    '<input type="search" id="admQuery" placeholder="Tìm theo email, tên, mã đơn..." value="' + esc(state.adminQuery) + '" style="flex:1;min-width:200px">' +
  '</div><div class="table-scroll" id="admReqTableWrap"></div>';
}

function renderAdminRequestsTable() {
  const wrap = $("admReqTableWrap");
  if (!wrap) return;
  const q = state.adminQuery.trim().toLowerCase();
  const list = loadArr(KEYS.payReqs).filter(function (r) { return r && typeof r === "object"; }).slice().reverse().filter(function (r) {
    if (state.adminStatusFilter !== "all" && r.status !== state.adminStatusFilter) return false;
    if (state.adminPlanFilter !== "all" && r.plan !== state.adminPlanFilter) return false;
    if (q && [r.userEmail, r.userName, r.id, r.transferNote, r.memo].join(" ").toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
  if (list.length === 0) { wrap.innerHTML = '<div class="empty-state">Không có yêu cầu thanh toán nào phù hợp.</div>'; return; }
  wrap.innerHTML = '<table class="data-table"><thead><tr><th>Thời gian gửi</th><th>Người dùng</th><th>Gói</th><th>Số tiền</th><th>Ghi chú / Mã GD</th><th>Biên lai</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody>' +
    list.map(function (r) {
      const st = r.status === "approved" ? '<span class="badge badge-ok">✅ Đã duyệt</span>'
        : (r.status === "rejected" ? '<span class="badge badge-bad">❌ Từ chối</span>' : '<span class="badge badge-warn">⏳ Chờ duyệt</span>');
      const receiptBtn = r.receiptImage ? '<button type="button" class="btn btn-outline btn-sm" data-act="view-receipt" data-id="' + esc(r.id) + '">Xem ảnh</button>' : '<span class="muted">—</span>';
      let actHtml = "";
      if (r.status === "pending") {
        actHtml = '<div class="deck-actions">' +
          '<button type="button" class="btn btn-emerald btn-sm" data-act="approve-req" data-id="' + esc(r.id) + '">✅ Duyệt</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-act="reject-req" data-id="' + esc(r.id) + '">❌ Từ chối</button></div>';
      } else if (r.status === "rejected" && r.rejectReason) {
        actHtml = '<span class="muted" style="font-size:.76rem">Lý do: ' + esc(r.rejectReason) + "</span>";
      } else if (r.reviewedAt) {
        actHtml = '<span class="muted" style="font-size:.76rem">Duyệt: ' + esc(fmtDateTime(r.reviewedAt)) + "</span>";
      }
      return "<tr><td>" + esc(fmtDateTime(r.createdAt)) + "</td><td><strong>" + esc(r.userName || "") + '</strong><br><span class="muted">' + esc(r.userEmail) + "</span></td>" +
        "<td><strong>" + esc(TIERS[r.plan] ? TIERS[r.plan].name : r.plan) + "</strong></td><td>" + esc(fmtMoney(r.amount)) + "</td>" +
        "<td>" + esc(r.transferNote || "—") + (r.memo ? '<br><span class="muted" style="font-size:.74rem">' + esc(r.memo) + "</span>" : "") + "</td>" +
        "<td>" + receiptBtn + "</td><td>" + st + "</td><td>" + actHtml + "</td></tr>";
    }).join("") + "</tbody></table>";
}

function maskApiKeyDisplay(key) {
  const s = String(key || "").trim();
  if (!s) return "—";
  if (s.length <= 10) return s.slice(0, 3) + "••••••";
  return s.slice(0, 6) + "••••••••" + s.slice(-4);
}

function adminMembersHTML() {
  const subs = loadObj(KEYS.subs);
  const apis = loadObj(KEYS.userApis);
  const members = Object.keys(subs).filter(function (e) { return getActiveSub(e); });
  const rows = members.length ? members.map(function (e) {
    const s = subs[e];
    const hasApi = !!(apis[e] && apis[e].apiKey);
    return "<tr><td>" + esc(e) + (hasApi ? ' <span class="badge badge-ok" title="Đã gán Gemini API">🔑 Đã gán API</span>' : "") + "</td><td><strong>" + esc(TIERS[s.tier] ? TIERS[s.tier].name : s.tier) + "</strong></td><td>" +
      (s.tier === "unranked" ? "Miễn phí" : esc(fmtDate(s.expires))) +
      '</td><td><div class="deck-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="prefill-api" data-email="' + esc(e) + '">🔑 Gán API</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="revoke" data-email="' + esc(e) + '">Thu hồi gói</button>' +
      '</div></td></tr>';
  }).join("") : '<tr><td colspan="4" class="muted">Chưa có thành viên nào kích hoạt gói.</td></tr>';
  const opts = ["unranked", "bronze", "silver", "gold", "diamond"].map(function (c) {
    return '<option value="' + c + '">' + esc(TIERS[c].name) + "</option>";
  }).join("");

  const apiEmails = Object.keys(apis).filter(function (e) { return apis[e] && apis[e].apiKey; });
  const apiRows = apiEmails.length ? apiEmails.map(function (e) {
    const item = apis[e];
    return "<tr><td><strong>" + esc(e) + "</strong></td>" +
      "<td><code>" + esc(maskApiKeyDisplay(item.apiKey)) + "</code></td>" +
      "<td>" + esc(item.model || "gemini-2.5-flash") + "</td>" +
      "<td>" + esc(item.updatedAt ? fmtDateTime(item.updatedAt) : "—") + "</td>" +
      '<td><div class="deck-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="prefill-api" data-email="' + esc(e) + '">Sửa</button>' +
        '<button type="button" class="btn btn-danger btn-sm" data-act="revoke-user-api" data-email="' + esc(e) + '">Thu hồi API</button>' +
      '</div></td></tr>';
  }).join("") : '<tr><td colspan="5" class="muted">Chưa có tài khoản nào được Admin gán Gemini API Key.</td></tr>';

  return '<h3>1. Cấp / nâng cấp / thu hồi gói thủ công</h3><div class="admin-form">' +
    '<label class="field">Email người dùng<input type="email" id="grantEmail" placeholder="email@example.com"></label>' +
    '<label class="field">Hạng gói<select id="grantTier">' + opts + "</select></label>" +
    '<button type="button" class="btn btn-primary" data-act="grant">Cấp / nâng cấp</button>' +
    '<button type="button" class="btn btn-danger" data-act="revoke-form">Thu hồi gói</button></div>' +
    '<h3>Danh sách thành viên đang hoạt động</h3><div class="table-scroll" style="margin-bottom:20px"><table class="data-table"><thead><tr><th>Email</th><th>Gói</th><th>Hết hạn</th><th>Hành động</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +

    '<div style="padding-top:16px;border-top:2px dashed var(--border)">' +
      '<h3>2. 🔑 Gán hộ Google Gemini API Key theo Email người dùng</h3>' +
      '<p class="muted" style="font-size:.82rem;margin:0 0 10px">Khi người dùng đăng nhập bằng Email đã được gán, hệ thống sẽ tự động kích hoạt Gemini API Key đó cho tài khoản của họ trong AI Converter.</p>' +
      '<div class="admin-form">' +
        '<label class="field">Email người dùng<input type="email" id="assignApiEmail" placeholder="email@example.com"></label>' +
        '<label class="field" style="min-width:240px">Google Gemini API Key' +
          '<div class="key-input-wrap">' +
            '<input type="password" id="assignApiKey" autocomplete="off" spellcheck="false" placeholder="AIza...">' +
            '<button type="button" class="eye-btn" data-act="toggle-assign-eye" title="Hiện / Ẩn API Key">👁️</button>' +
          '</div>' +
        '</label>' +
        '<label class="field">Model mặc định<select id="assignApiModel">' +
          '<option value="gemini-2.5-flash">Gemini 2.5 Flash (Nhanh)</option>' +
          '<option value="gemini-2.5-pro">Gemini 2.5 Pro (Chính xác cao)</option>' +
          '<option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>' +
        '</select></label>' +
        '<button type="button" class="btn btn-primary" data-act="assign-user-api">🔑 Gán API cho Email</button>' +
        '<button type="button" class="btn btn-danger" data-act="revoke-user-api-form">Thu hồi API</button>' +
      '</div>' +
      '<h3>Danh sách tài khoản đã được Admin gán Gemini API (' + apiEmails.length + ')</h3>' +
      '<div class="table-scroll"><table class="data-table"><thead><tr><th>Email người dùng</th><th>Gemini API Key</th><th>Model</th><th>Cập nhật</th><th>Hành động</th></tr></thead><tbody>' + apiRows + "</tbody></table></div>" +
    '</div>';
}

function adminCfgHTML() {
  const c = getPayCfg();
  return '<h3>Cấu hình tài khoản nhận tiền VietQR</h3><div class="admin-form" style="flex-direction:column;align-items:stretch;max-width:440px">' +
    '<label class="field">Tên ngân hàng<input type="text" id="cfgBankName" value="' + esc(c.bankName) + '" maxlength="60"></label>' +
    '<label class="field">Mã ngân hàng VietQR (BIN, ví dụ 970414, MB, VCB)<input type="text" id="cfgBankId" value="' + esc(c.bankId) + '" maxlength="20"></label>' +
    '<label class="field">Số tài khoản<input type="text" id="cfgAccNo" value="' + esc(c.accountNo) + '" maxlength="30" inputmode="numeric"></label>' +
    '<label class="field">Tên chủ tài khoản<input type="text" id="cfgAccName" value="' + esc(c.accountName) + '" maxlength="80"></label>' +
    '<button type="button" class="btn btn-primary" data-act="save-cfg">Lưu cấu hình</button></div>';
}

function adminVoucherHTML() {
  const list = getVouchers();
  const rows = list.length ? list.map(function (v) {
    return "<tr><td><strong>" + esc(v.code) + "</strong></td><td>" + esc(v.discountPercent) + '%</td><td><button type="button" class="btn btn-outline btn-sm" data-act="del-voucher" data-code="' + esc(v.code) + '">Xóa</button></td></tr>';
  }).join("") : '<tr><td colspan="3" class="muted">Chưa có mã giảm giá nào.</td></tr>';
  return '<h3>Tạo mã giảm giá</h3><div class="admin-form">' +
    '<label class="field">Mã giảm giá<input type="text" id="vCode" maxlength="30" placeholder="AITUTOR20"></label>' +
    '<label class="field">Phần trăm giảm (1–100)<input type="number" id="vPercent" min="1" max="100" value="10"></label>' +
    '<button type="button" class="btn btn-primary" data-act="add-voucher">Thêm mã</button></div>' +
    '<div class="table-scroll"><table class="data-table"><thead><tr><th>Mã</th><th>Giảm giá</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>";
}

function adminBackupHTML() {
  const subs = loadObj(KEYS.subs);
  const paidActive = Object.keys(subs).filter(function (e) { const s = getActiveSub(e); return s && s.tier !== "unranked"; }).length;
  return '<p class="muted">Thành viên trả phí đang hoạt động: <strong>' + paidActive + '</strong>. Xuất toàn bộ dữ liệu quản trị (thành viên, yêu cầu thanh toán, mã giảm giá, cấu hình VietQR) dưới dạng JSON.</p>' +
    '<button type="button" class="btn btn-primary" data-act="export-backup">Xuất dữ liệu hệ thống (.json)</button>';
}

async function approvePaymentRequest(id) {
  if (!assertAdmin()) return;
  const list = loadArr(KEYS.payReqs);
  const req = list.filter(function (r) { return r && r.id === id; })[0];
  if (!req || req.status !== "pending") return;
  const now = new Date().toISOString();
  const res = await apiCall("/api/admin/payment-requests/" + encodeURIComponent(id) + "/approve", "POST", { request: req });
  if (res && res._err) { showToast("Lỗi máy chủ: " + res._err, "error"); return; }
  if (!adminActivatePaidTier(req.userEmail, req.plan)) return;
  req.status = "approved";
  req.reviewedAt = now;
  req.reviewedBy = state.user.email.toLowerCase();
  req.rejectReason = "";
  saveJSON(KEYS.payReqs, list);
  showToast("Đã duyệt đơn và kích hoạt gói " + TIERS[req.plan].name + " (365 ngày) cho " + req.userEmail + ".", "success");
  updateChrome();
  renderAdmin();
}

async function confirmRejectRequest() {
  if (!assertAdmin()) return;
  const id = state.rejectReqId;
  const reason = ($("rejectReasonInput") ? $("rejectReasonInput").value : "").trim();
  if (!reason) { showToast("Vui lòng nhập lý do từ chối.", "warning"); return; }
  const list = loadArr(KEYS.payReqs);
  const req = list.filter(function (r) { return r && r.id === id; })[0];
  if (!req || req.status !== "pending") { closeModal("rejectModal"); return; }
  const res = await apiCall("/api/admin/payment-requests/" + encodeURIComponent(id) + "/reject", "POST", { request: req, rejectReason: reason });
  if (res && res._err) { showToast("Lỗi máy chủ: " + res._err, "error"); return; }
  req.status = "rejected";
  req.reviewedAt = new Date().toISOString();
  req.reviewedBy = state.user.email.toLowerCase();
  req.rejectReason = reason;
  saveJSON(KEYS.payReqs, list);
  state.rejectReqId = null;
  closeModal("rejectModal");
  showToast("Đã từ chối yêu cầu của " + req.userEmail + ".", "info");
  updateChrome();
  renderAdmin();
}

async function onAdminClick(e) {
  if (!isAdmin()) return;
  const b = e.target.closest ? e.target.closest("[data-act]") : null;
  if (!b) return;
  const act = b.getAttribute("data-act");
  try {
    if (act === "subtab") {
      const sub = b.getAttribute("data-sub");
      state.adminTab = sub;
      navigateTo(ADMIN_SUB_TO_PATH[sub] || "/admin");
    }
    else if (act === "approve-req") {
      const id = b.getAttribute("data-id");
      const req = loadArr(KEYS.payReqs).find(function (r) { return r && r.id === id; });
      if (!req) return;
      showConfirm("Duyệt thanh toán", "Xác nhận duyệt đơn " + fmtMoney(req.amount) + " và kích hoạt gói " + TIERS[req.plan].name + " (+365 ngày) cho " + req.userEmail + "?", function () {
        approvePaymentRequest(id);
      }, "Duyệt ngay");
    } else if (act === "reject-req") {
      const id = b.getAttribute("data-id");
      const req = loadArr(KEYS.payReqs).find(function (r) { return r && r.id === id; });
      if (!req) return;
      state.rejectReqId = id;
      setText("rejectMeta", "Người dùng: " + req.userEmail + " • Gói " + TIERS[req.plan].name + " (" + fmtMoney(req.amount) + ")");
      const inp = $("rejectReasonInput"); if (inp) inp.value = "";
      openModal("rejectModal");
    } else if (act === "view-receipt") {
      const id = b.getAttribute("data-id");
      const req = loadArr(KEYS.payReqs).find(function (r) { return r && r.id === id; });
      if (!req || !req.receiptImage) return;
      const im = $("receiptModalImg"); if (im) im.src = req.receiptImage;
      setText("receiptModalTitle", "Biên lai – " + req.userEmail + " (" + TIERS[req.plan].name + ")");
      openModal("receiptModal");
    } else if (act === "grant") {
      const email = ($("grantEmail") ? $("grantEmail").value : "").trim().toLowerCase();
      const tier = $("grantTier") ? $("grantTier").value : "";
      if (!isValidEmail(email)) { showToast("Vui lòng nhập một địa chỉ email hợp lệ.", "warning"); return; }
      if (!TIERS[tier] || tier === "none") { showToast("Gói không hợp lệ.", "warning"); return; }
      const r = await apiCall("/api/admin/subscriptions", "POST", { email: email, tier: tier });
      if (r && r._err) { showToast("Lỗi máy chủ: " + r._err, "error"); return; }
      if (!adminActivatePaidTier(email, tier)) return;
      showToast("Đã cấp gói " + TIERS[tier].name + " cho " + email + ".", "success");
      updateChrome(); renderAdmin();
    } else if (act === "revoke-form" || act === "revoke") {
      const email = act === "revoke" ? b.getAttribute("data-email") : ($("grantEmail") ? $("grantEmail").value : "").trim().toLowerCase();
      if (!isValidEmail(email)) { showToast("Vui lòng nhập một địa chỉ email hợp lệ.", "warning"); return; }
      showConfirm("Thu hồi gói", "Bạn có chắc muốn thu hồi gói của " + email + "?", async function () {
        const r = await apiCall("/api/admin/subscriptions/" + encodeURIComponent(email), "DELETE");
        if (r && r._err) { showToast("Lỗi máy chủ: " + r._err, "error"); return; }
        const s2 = loadObj(KEYS.subs); delete s2[email]; saveJSON(KEYS.subs, s2);
        showToast("Đã thu hồi gói của " + email + ".", "success");
        updateChrome(); renderTab();
      });
    } else if (act === "save-cfg") {
      const bankName = ($("cfgBankName") ? $("cfgBankName").value : "").trim();
      const bankId = ($("cfgBankId") ? $("cfgBankId").value : "").trim().toUpperCase();
      const acc = ($("cfgAccNo") ? $("cfgAccNo").value : "").trim();
      const name = ($("cfgAccName") ? $("cfgAccName").value : "").trim().toUpperCase();
      if (!bankName || !/^[A-Z0-9]{2,20}$/.test(bankId) || !/^[0-9]{6,20}$/.test(acc) || !name) {
        showToast("Thông tin ngân hàng/STK chưa hợp lệ.", "warning"); return;
      }
      const cfg = { bankName: bankName, bankId: bankId, accountNo: acc, accountName: name };
      const r = await apiCall("/api/admin/payment-config", "PUT", cfg);
      if (r && r._err) { showToast("Lỗi máy chủ: " + r._err, "error"); return; }
      if (saveJSON(KEYS.payCfg, cfg)) showToast("Đã lưu cấu hình VietQR.", "success");
    } else if (act === "add-voucher") {
      const code = ($("vCode") ? $("vCode").value : "").trim().toUpperCase();
      const pct = parseInt($("vPercent") ? $("vPercent").value : "", 10);
      if (!/^[A-Z0-9_-]{2,30}$/.test(code) || !(pct >= 1 && pct <= 100)) { showToast("Mã giảm giá hoặc phần trăm không hợp lệ.", "warning"); return; }
      const list = getVouchers();
      if (list.some(function (v) { return v.code.toUpperCase() === code; })) { showToast("Mã giảm giá đã tồn tại.", "warning"); return; }
      list.push({ code: code, discountPercent: pct });
      const r = await apiCall("/api/admin/vouchers", "PUT", { vouchers: list });
      if (r && r._err) { showToast("Lỗi máy chủ: " + r._err, "error"); return; }
      if (saveJSON(KEYS.vouchers, list)) { showToast("Đã thêm mã giảm giá " + code + " (-" + pct + "%).", "success"); renderAdmin(); }
    } else if (act === "del-voucher") {
      const code = b.getAttribute("data-code");
      const list = getVouchers().filter(function (v) { return v.code !== code; });
      const r = await apiCall("/api/admin/vouchers", "PUT", { vouchers: list });
      if (r && r._err) { showToast("Lỗi máy chủ: " + r._err, "error"); return; }
      saveJSON(KEYS.vouchers, list);
      showToast("Đã xóa mã giảm giá.", "success");
      renderAdmin();
    } else if (act === "toggle-assign-eye") {
      const inp = $("assignApiKey");
      if (!inp) return;
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      b.textContent = show ? "🙈" : "👁️";
    } else if (act === "prefill-api") {
      const em = String(b.getAttribute("data-email") || "").trim().toLowerCase();
      const emInp = $("assignApiEmail");
      const keyInp = $("assignApiKey");
      const modSel = $("assignApiModel");
      const cur = getAssignedApiForEmail(em);
      if (emInp) emInp.value = em;
      if (keyInp) { keyInp.value = cur ? cur.apiKey : ""; keyInp.type = "password"; keyInp.focus(); }
      if (modSel && cur && cur.model) modSel.value = cur.model;
      showToast("Đã chọn email " + em + " để gán Gemini API Key.", "info");
    } else if (act === "assign-user-api") {
      const email = ($("assignApiEmail") ? $("assignApiEmail").value : "").trim().toLowerCase();
      const apiKey = ($("assignApiKey") ? $("assignApiKey").value : "").trim();
      const model = ($("assignApiModel") ? $("assignApiModel").value : "gemini-2.5-flash").trim();
      if (!isValidEmail(email)) { showToast("Vui lòng nhập địa chỉ email người dùng hợp lệ.", "warning"); return; }
      if (!apiKey) { showToast("Vui lòng dán Google Gemini API Key để gán cho người dùng.", "warning"); return; }
      const r = await apiCall("/api/admin/user-apis", "POST", { email: email, apiKey: apiKey, model: model });
      if (r && r._err) { showToast("Lỗi máy chủ: " + r._err, "error"); return; }
      const now = Date.now();
      const all = loadObj(KEYS.userApis);
      all[email] = {
        email: email,
        apiKey: apiKey,
        model: model,
        assignedBy: ADMIN_EMAIL,
        updatedAt: new Date(now).toISOString(),
        ts: now
      };
      saveJSON(KEYS.userApis, all);
      showToast("Đã gán Google Gemini API Key cho tài khoản " + email + " thành công!", "success");
      updateChrome();
      renderAdmin();
    } else if (act === "revoke-user-api" || act === "revoke-user-api-form") {
      const email = act === "revoke-user-api"
        ? String(b.getAttribute("data-email") || "").trim().toLowerCase()
        : ($("assignApiEmail") ? $("assignApiEmail").value : "").trim().toLowerCase();
      if (!isValidEmail(email)) { showToast("Vui lòng nhập hoặc chọn email cần thu hồi API Key.", "warning"); return; }
      showConfirm("Thu hồi Gemini API Key", "Bạn có chắc muốn thu hồi Gemini API Key đã gán cho " + email + "?", async function () {
        const r = await apiCall("/api/admin/user-apis/" + encodeURIComponent(email), "DELETE");
        if (r && r._err) { showToast("Lỗi máy chủ: " + r._err, "error"); return; }
        const all = loadObj(KEYS.userApis);
        delete all[email];
        saveJSON(KEYS.userApis, all);
        showToast("Đã thu hồi Gemini API Key của " + email + ".", "info");
        updateChrome();
        renderAdmin();
      });
    } else if (act === "export-backup") {
      const data = {
        exportedAt: new Date().toISOString(),
        subscriptions: loadObj(KEYS.subs),
        userApis: loadObj(KEYS.userApis),
        payment_requests: loadArr(KEYS.payReqs),
        vouchers: getVouchers(),
        paymentConfig: getPayCfg()
      };
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "ai_tutor_backup_" + new Date().toISOString().slice(0, 10) + ".json");
    }
  } catch (err) { showToast("Đã xảy ra lỗi khi thực hiện thao tác quản trị.", "error"); }
}
function onAdminChange(e) {
  if (!isAdmin() || !e.target) return;
  if (e.target.id === "admStatusFilter") { state.adminStatusFilter = e.target.value; renderAdminRequestsTable(); }
  else if (e.target.id === "admPlanFilter") { state.adminPlanFilter = e.target.value; renderAdminRequestsTable(); }
}
function onAdminInput(e) {
  if (e.target && e.target.id === "admQuery") { state.adminQuery = e.target.value; renderAdminRequestsTable(); }
}

/* ------------------------------ Profile ------------------------------ */
function placeholderAvatar(name) {
  const ch = (String(name || "?").trim().charAt(0) || "?").toUpperCase();
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#5347CD"/><text x="80" y="104" font-size="72" font-family="Arial" font-weight="700" fill="#ffffff" text-anchor="middle">' + esc(ch) + "</text></svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function setAvatar(img, url, name) {
  if (!img) return;
  img.onerror = function () { img.onerror = null; img.src = placeholderAvatar(name); };
  img.src = url || placeholderAvatar(name);
}
function getProfile(email) {
  const p = loadObj(KEYS.profiles)[String(email || "").toLowerCase()];
  return p && typeof p === "object" ? p : {};
}
function effectiveUser() {
  const u = state.user;
  if (!u) return null;
  const p = getProfile(u.email);
  return {
    name: String(p.displayName || "").trim() || u.name,
    picture: p.customAvatar || u.picture || "",
    studentId: String(p.studentId || "").trim(),
    className: String(p.className || "").trim(),
    targetGoal: String(p.targetGoal || "").trim()
  };
}
function renderUserChrome() {
  const u = effectiveUser();
  if (!u) return;
  setText("userName", u.name);
  setText("userEmail", state.user.email);
  setText("ddUserName", u.name);
  setText("ddUserEmail", state.user.email);
  setAvatar($("userAvatar"), u.picture, u.name);
  const sb = $("userStudentId");
  if (sb) { sb.textContent = u.studentId ? "MSSV " + u.studentId : ""; sb.classList.toggle("hidden", !u.studentId); }
  renderGreeting();
}
function renderGreeting() {
  const el = $("greetingCard");
  const u = effectiveUser();
  if (!el || !u) return;
  let meta = "";
  if (u.studentId) meta += '<span class="badge">MSSV: ' + esc(u.studentId) + "</span>";
  if (u.className) meta += '<span class="badge">Lớp/Khoa: ' + esc(u.className) + "</span>";
  if (u.targetGoal) meta += '<span class="badge badge-ok">🎯 ' + esc(u.targetGoal) + "</span>";
  if (!meta) meta = '<span class="muted">Hãy cập nhật hồ sơ để cá nhân hóa trải nghiệm học tập.</span>';
  el.innerHTML = '<img class="avatar avatar-lg" id="greetAvatar" alt="Ảnh đại diện"><div class="greet-text"><h2>Xin chào, ' + esc(u.name) + ' 👋</h2><div class="greet-meta">' + meta +
    '</div></div><button type="button" class="btn btn-outline btn-sm" data-action="edit-profile">Sửa hồ sơ</button>';
  setAvatar($("greetAvatar"), u.picture, u.name);
}
function profVal(id) { const el = $(id); return el ? el.value : ""; }
function updateProfPreview() {
  if (!state.user || !state.profDraft) return;
  const name = profVal("profName").trim() || state.user.name;
  setAvatar($("profAvatarPreview"), state.profDraft.customAvatar || state.user.picture, name);
}
function openProfile() {
  if (!state.user) return;
  const p = getProfile(state.user.email);
  state.profDraft = { customAvatar: p.customAvatar || "" };
  const set = function (id, v) { const el = $(id); if (el) el.value = v; };
  set("profName", String(p.displayName || "").trim() || state.user.name);
  set("profStudentId", p.studentId || "");
  set("profClass", p.className || "");
  set("profTarget", p.targetGoal || "");
  set("profAvatarUrl", /^https?:\/\//i.test(state.profDraft.customAvatar) ? state.profDraft.customAvatar : "");
  const f = $("profAvatarFile"); if (f) f.value = "";
  updateProfPreview();
  openModal("profileModal");
}
function applyAvatarUrl() {
  if (!state.profDraft) return;
  const v = profVal("profAvatarUrl").trim();
  if (!/^https?:\/\/\S+$/i.test(v)) { showToast("Vui lòng nhập đường dẫn ảnh hợp lệ.", "warning"); return; }
  const im = new Image();
  im.onload = function () { state.profDraft.customAvatar = v; updateProfPreview(); };
  im.onerror = function () { showToast("Không tải được ảnh từ đường dẫn này.", "error"); };
  im.src = v;
}
function onAvatarFile(e) {
  const f = e.target && e.target.files ? e.target.files[0] : null;
  if (!f || !state.profDraft) return;
  if (!/^image\//.test(f.type)) { showToast("Vui lòng chọn một file ảnh.", "warning"); return; }
  const reader = new FileReader();
  reader.onload = function (ev) {
    const im = new Image();
    im.onload = function () {
      try {
        const c = document.createElement("canvas");
        c.width = 160; c.height = 160;
        const ctx = c.getContext("2d");
        const side = Math.min(im.width, im.height);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 160, 160);
        ctx.drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, 160, 160);
        state.profDraft.customAvatar = c.toDataURL("image/jpeg", 0.8);
        updateProfPreview();
      } catch (err) { showToast("Không thể xử lý ảnh đã chọn.", "error"); }
    };
    im.src = ev.target.result;
  };
  reader.readAsDataURL(f);
}
function resetAvatar() {
  if (!state.profDraft) return;
  state.profDraft.customAvatar = "";
  const u = $("profAvatarUrl"); if (u) u.value = "";
  const f = $("profAvatarFile"); if (f) f.value = "";
  updateProfPreview();
  showToast("Đã khôi phục ảnh Google gốc (nhấn Lưu để áp dụng).", "info");
}
function renderProfilePage() {
  const root = $("profilePageRoot");
  if (!root || !state.user) return;
  const u = effectiveUser();
  const tier = currentTier();
  const info = isAdmin() ? TIERS.diamond : (TIERS[tier] || TIERS.none);
  const sub = getActiveSub(state.user.email);
  const assignedApi = getActiveUserAssignedApi();
  const curLang = getLang();
  const badgeText = isAdmin() ? "👑 Admin (Diamond)" : (info.icon + " " + info.name);
  const expText = isAdmin() ? "Toàn quyền không giới hạn" : (sub && tier !== "unranked" ? ("Hết hạn: " + fmtDate(sub.expires)) : (tier === "unranked" ? "Miễn phí 0đ/năm" : "Chưa đăng ký gói"));

  root.innerHTML =
    '<div class="api-wrap">' +
      '<section class="panel">' +
        '<div class="panel-head"><div><h2>👤 Hồ sơ cá nhân</h2><p class="muted" style="margin:0;font-size:.84rem">' + esc(state.user.email) + '</p></div>' +
        '<span class="tier-badge ' + (isAdmin() ? "rank-diamond" : info.cls) + '">' + esc(badgeText) + '</span></div>' +
        '<div class="avatar-edit" style="margin:12px 0 16px">' +
          '<img id="profPageAvatar" class="avatar avatar-xl" alt="Ảnh đại diện" referrerpolicy="no-referrer">' +
          '<div class="avatar-tools">' +
            '<div><strong>' + esc(u.name) + '</strong></div>' +
            '<div class="muted" style="font-size:.82rem">' + esc(expText) + '</div>' +
            '<div class="deck-actions">' +
              '<button type="button" class="btn btn-primary btn-sm" id="profPageOpenEdit">✏️ Chỉnh sửa hồ sơ &amp; Ảnh đại diện</button>' +
              '<button type="button" class="btn btn-outline btn-sm" id="profPageGoPricing">🏆 Gói nâng cấp</button>' +
              '<button type="button" class="btn btn-outline btn-sm" id="profPageGoBackup">☁️ Sao lưu dữ liệu</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<dl class="pay-info">' +
          '<dt>Tên hiển thị</dt><dd>' + esc(u.name) + '</dd>' +
          '<dt>Email Google</dt><dd>' + esc(state.user.email) + '</dd>' +
          '<dt>Gemini API</dt><dd>' + (assignedApi ? ('<span class="badge badge-ok">🔑 Đã được Admin gán API (' + esc(assignedApi.model || "gemini-2.5-flash") + ')</span>') : ((localStorage.getItem(KEYS.apiKey) || "").trim() ? '<span class="badge badge-ok">Đã lưu Key cá nhân</span>' : '<span class="muted">Chưa cấu hình</span>')) + '</dd>' +
          '<dt>Mã sinh viên</dt><dd>' + esc(u.studentId || "Chưa cập nhật") + '</dd>' +
          '<dt>Lớp / Khoa</dt><dd>' + esc(u.className || "Chưa cập nhật") + '</dd>' +
          '<dt>Mục tiêu học tập</dt><dd>' + esc(u.targetGoal || "Chưa cập nhật") + '</dd>' +
        '</dl>' +
        '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">' +
          '<div class="panel-head" style="margin-bottom:8px"><div><h3 style="margin:0;font-size:1rem">🌐 Ngôn ngữ giao diện (Language / 表示言語)</h3><p class="muted" style="margin:2px 0 0;font-size:.8rem">Chuyển đổi qua lại giữa Tiếng Việt, Tiếng Anh và Tiếng Nhật (giữ nguyên phông chữ).</p></div></div>' +
          '<div class="seg" role="group" aria-label="Chọn ngôn ngữ">' +
            '<button type="button" class="seg-btn' + (curLang === "vi" ? " active" : "") + '" data-lang="vi">🇻🇳 Tiếng Việt</button>' +
            '<button type="button" class="seg-btn' + (curLang === "en" ? " active" : "") + '" data-lang="en">🇬🇧 English</button>' +
            '<button type="button" class="seg-btn' + (curLang === "ja" ? " active" : "") + '" data-lang="ja">🇯🇵 日本語</button>' +
          '</div>' +
        '</div>' +
      '</section>' +
    '</div>';
  setAvatar($("profPageAvatar"), u.picture, u.name);
  on("profPageOpenEdit", "click", openProfile);
  on("profPageGoPricing", "click", function () { navigateTo("/pricing"); });
  on("profPageGoBackup", "click", function () { navigateTo("/backup"); });
  applyI18n(root);
}

function saveProfile() {
  if (!state.user || !state.profDraft) return;
  const email = state.user.email.toLowerCase();
  const profiles = loadObj(KEYS.profiles);
  profiles[email] = {
    displayName: profVal("profName").trim().slice(0, 80),
    studentId: profVal("profStudentId").trim().slice(0, 30),
    className: profVal("profClass").trim().slice(0, 60),
    targetGoal: profVal("profTarget").trim().slice(0, 120),
    customAvatar: state.profDraft.customAvatar || ""
  };
  if (!saveJSON(KEYS.profiles, profiles)) return;
  closeModal("profileModal");
  renderUserChrome();
  if (state.tab === "profile") renderProfilePage();
  showToast("Đã lưu hồ sơ của bạn.", "success");
}
function copyText(text, label) {
  const msg = "Đã sao chép " + (label || "nội dung") + ".";
  const fallback = function () {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      showToast(ok ? msg : "Không thể sao chép.", ok ? "success" : "warning");
    } catch (e) { showToast("Không thể sao chép.", "warning"); }
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { showToast(msg, "success"); }, fallback);
    else fallback();
  } catch (e) { fallback(); }
}

/* ------------------------------ Settings & Keyboard ------------------------------ */
function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  const b = $("themeBtn"); if (b) b.textContent = t === "dark" ? "☀️" : "🌙";
}
function applyFont(px) {
  const v = clamp(Number(px) || FONT_DEFAULT, FONT_MIN, FONT_MAX);
  document.documentElement.style.setProperty("--q-font", v + "px");
  setText("fontLabel", v + "px");
  const d = $("fontDecBtn"); if (d) d.disabled = v <= FONT_MIN;
  const i = $("fontIncBtn"); if (i) i.disabled = v >= FONT_MAX;
  return v;
}
function currentFont() {
  const v = parseInt(loadJSON(KEYS.font, FONT_DEFAULT), 10);
  return clamp(Number.isFinite(v) ? v : FONT_DEFAULT, FONT_MIN, FONT_MAX);
}

function onKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const ae = document.activeElement;
  const tag = ae && ae.tagName ? ae.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (anyModalOpen()) {
    if (e.key === "Escape") {
      ["confirmModal", "rejectModal", "receiptModal", "configModal", "importModal", "checkoutModal", "profileModal"].forEach(function (id) {
        const el = $(id);
        if (el && !el.classList.contains("hidden") && !(id === "checkoutModal" && state.checkout && state.checkout.busy)) closeModal(id);
      });
    }
    return;
  }
  if (!state.user) return;
  if (state.tab === "studio" && window.UETStudio && typeof window.UETStudio.onKeyDown === "function") {
    if (window.UETStudio.onKeyDown(e)) return;
  }
  if (state.tab === "study" && state.session) {
    const k = e.key;
    if (/^[1-5]$/.test(k)) { e.preventDefault(); selectOption(Number(k) - 1); }
    else if (/^[a-eA-E]$/.test(k)) { e.preventDefault(); selectOption("ABCDE".indexOf(k.toUpperCase())); }
    else if (k === "Enter" || k === "ArrowRight") { e.preventDefault(); handleEnterKey(); }
    else if (k === "ArrowLeft") { e.preventDefault(); prevQuestion(); }
    else if (k === "f" || k === "F") { e.preventDefault(); toggleFlag(); }
  } else if (state.tab === "flash" && state.flash) {
    if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); if (tag === "BUTTON" && ae.blur) ae.blur(); flashFlip(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); flashMove(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); flashMove(-1); }
  }
}

/* ------------------------------ Multi-Language Engine (VI / EN / JA - Zero Font Change) ------------------------------ */
const I18N_MAP = {
  "Tổng quan": { en: "Dashboard", ja: "ダッシュボード" },
  "🏠 Tổng quan": { en: "🏠 Dashboard", ja: "🏠 ダッシュボード" },
  "Ôn tập & Thi": { en: "Practice & Exam", ja: "練習・試験" },
  "📝 Ôn tập & Thi": { en: "📝 Practice & Exam", ja: "📝 練習・試験" },
  "Creator Studio": { en: "Creator Studio", ja: "Creator Studio" },
  "🎮 Creator Studio": { en: "🎮 Creator Studio", ja: "🎮 Creator Studio" },
  "AI Converter": { en: "AI Converter", ja: "AI Converter" },
  "✨ AI Converter": { en: "✨ AI Converter", ja: "✨ AI Converter" },
  "✨ Mở AI Converter": { en: "✨ Open AI Converter", ja: "✨ AI Converter を開く" },
  "Lật thẻ": { en: "Flashcards", ja: "フラッシュカード" },
  "🃏 Lật thẻ": { en: "🃏 Flashcards", ja: "🃏 フラッシュカード" },
  "Sổ tay sai": { en: "Mistakes", ja: "弱点ノート" },
  "📕 Sổ tay sai": { en: "📕 Mistakes", ja: "📕 弱点ノート" },
  "Sổ tay câu hay sai": { en: "Mistake Notebook", ja: "弱点ノート（間違い復習）" },
  "👤 Hồ sơ cá nhân": { en: "👤 Profile", ja: "👤 プロフィール" },
  "🏆 Gói nâng cấp": { en: "🏆 Upgrade Plans", ja: "🏆 プランアップグレード" },
  "🔑 Cài đặt API & Ngôn ngữ": { en: "🔑 API & Language Settings", ja: "🔑 API・言語設定" },
  "🔑 Cài đặt API (Gemini)": { en: "🔑 API Settings (Gemini)", ja: "🔑 API設定 (Gemini)" },
  "☁️ Sao lưu & Khôi phục dữ liệu": { en: "☁️ Backup & Restore Data", ja: "☁️ バックアップと復元" },
  "☁️ Sao lưu & Khôi phục": { en: "☁️ Backup & Restore", ja: "☁️ バックアップと復元" },
  "☁️ Sao lưu dữ liệu": { en: "☁️ Data Backup", ja: "☁️ データバックアップ" },
  "🛡️ Quản trị duyệt đơn (Admin Panel)": { en: "🛡️ Admin Panel", ja: "🛡️ 管理パネル (Admin)" },
  "🛡️ Quản trị duyệt đơn": { en: "🛡️ Admin Panel", ja: "🛡️ 管理パネル" },
  "🚪 Đăng xuất": { en: "🚪 Sign Out", ja: "🚪 ログアウト" },
  "🌐 Ngôn ngữ": { en: "🌐 Language", ja: "🌐 言語" },
  "☁️ Đã đồng bộ": { en: "☁️ Synced", ja: "☁️ 同期済み" },
  "🔄 Đang đồng bộ...": { en: "🔄 Syncing...", ja: "🔄 同期中..." },
  "Chưa xếp hạng": { en: "Unranked", ja: "未ランク" },
  "Nền tảng ôn tập, thi thử trực tuyến được phát triển bởi Phạm Đức Hiếu.": {
    en: "Online practice & exam platform developed by Pham Duc Hieu.",
    ja: "Pham Duc Hieu によって開発されたオンライン学習・模擬試験プラットフォーム。"
  },
  "Vui lòng đăng nhập bằng tài khoản Google của bạn để tiếp tục.": {
    en: "Please sign in with your Google account to continue.",
    ja: "続行するには Google アカウントでログインしてください。"
  },
  "Vào làm bài": { en: "Join Quiz", ja: "参加する" },
  "🔗 Tham gia bộ đề bằng Mã đề": { en: "🔗 Join Deck via Share Code", ja: "🔗 共有コードで問題集に参加" },
  "Đề đã luyện": { en: "Decks Practiced", ja: "学習済みセット" },
  "Câu hỏi đã làm": { en: "Questions Answered", ja: "回答済み問題数" },
  "Trả lời đúng": { en: "Correct Answers", ja: "正解数" },
  "Tỷ lệ chính xác (%)": { en: "Accuracy Rate (%)", ja: "正答率 (%)" },
  "Kho đề của bạn": { en: "Your Question Decks", ja: "マイ問題集" },
  "+ Nhập đề từ Excel": { en: "+ Import from Excel", ja: "+ Excel からインポート" },
  "Gói kích hoạt & Lịch sử thi": { en: "Active Plan & Exam History", ja: "有効プランと試験履歴" },
  "Biểu đồ & Phân tích kết quả": { en: "Performance Chart & Analytics", ja: "成績グラフと分析" },
  "Tuần": { en: "Week", ja: "週間" },
  "Tháng": { en: "Month", ja: "月間" },
  "Tất cả": { en: "All", ja: "すべて" },
  "Ôn tập": { en: "Practice", ja: "練習" },
  "Tiếp tục ôn tập": { en: "Resume Practice", ja: "練習を再開" },
  "Thi thử": { en: "Mock Exam", ja: "模擬試験" },
  "🔒 Thi thử": { en: "🔒 Mock Exam", ja: "🔒 模擬試験" },
  "Quiz Studio": { en: "Quiz Studio", ja: "Quiz Studio" },
  "🔗 Chia sẻ": { en: "🔗 Share", ja: "🔗 共有" },
  "🖨️ Xuất PDF": { en: "🖨️ Export PDF", ja: "🖨️ PDF出力" },
  "Xuất .json": { en: "Export .json", ja: ".json 出力" },
  "🔒 Xuất .json": { en: "🔒 Export .json", ja: "🔒 .json 出力" },
  "Xuất .xlsx": { en: "Export .xlsx", ja: ".xlsx 出力" },
  "🔒 Xuất .xlsx": { en: "🔒 Export .xlsx", ja: "🔒 .xlsx 出力" },
  "Xuất CSV": { en: "Export CSV", ja: "CSV 出力" },
  "Xóa": { en: "Delete", ja: "削除" },
  "Sửa": { en: "Edit", ja: "編集" },
  "Sửa hồ sơ": { en: "Edit Profile", ja: "プロフィール編集" },
  "Lưu": { en: "Save", ja: "保存" },
  "Lưu hồ sơ": { en: "Save Profile", ja: "プロフィールを保存" },
  "Hủy": { en: "Cancel", ja: "キャンセル" },
  "Đóng": { en: "Close", ja: "閉じる" },
  "Áp dụng": { en: "Apply", ja: "適用" },
  "Sao chép": { en: "Copy", ja: "コピー" },
  "Tôi đã thanh toán": { en: "I Have Paid", ja: "支払い完了を通知" },
  "Chọn một bộ đề để bắt đầu Ôn tập hoặc Thi thử.": {
    en: "Select a question deck to start Practice or Mock Exam.",
    ja: "問題集を選択して練習または模擬試験を開始してください。"
  },
  "Chế độ": { en: "Mode", ja: "モード" },
  "Bộ đề": { en: "Deck", ja: "問題集" },
  "Làm lại từ đầu": { en: "Restart", ja: "最初からやり直す" },
  "Thoát": { en: "Exit", ja: "終了" },
  "Nộp bài / Hoàn thành": { en: "Submit / Finish", ja: "提出・完了" },
  "Kiểm tra đáp án": { en: "Check Answer", ja: "解答を確認" },
  "Đầu": { en: "First", ja: "最初" },
  "Trước": { en: "Prev", ja: "前へ" },
  "Tiếp": { en: "Next", ja: "次へ" },
  "Cuối": { en: "Last", ja: "最後" },
  "1. Tải đề thi thông minh": { en: "1. Smart Exam Uploader", ja: "1. スマート試験ファイルアップロード" },
  "Tự động nhận diện": { en: "Auto-Detect", ja: "自動判別" },
  "📂 Chọn, kéo thả hoặc Ctrl+V tệp đề thi": {
    en: "📂 Select, drag & drop, or Ctrl+V exam files",
    ja: "📂 ファイルを選択・ドラッグ＆ドロップ・Ctrl+V貼付"
  },
  "✍️ Hoặc dán nhanh văn bản / Markdown trực tiếp": {
    en: "✍️ Or paste raw text / Markdown directly",
    ja: "✍️ またはテキスト / Markdown を直接貼り付け"
  },
  "✨ Bắt đầu chuyển đổi thông minh": { en: "✨ Start Smart Conversion", ja: "✨ スマート変換を開始" },
  "Dừng": { en: "Stop", ja: "停止" },
  "Xóa hết": { en: "Clear All", ja: "すべてクリア" },
  "2. File mẫu & Kiểm duyệt AI": { en: "2. Template & AI Verification", ja: "2. テンプレートとAI検証" },
  "👁️ Xem file mẫu": { en: "👁️ View Template", ja: "👁️ サンプルを表示" },
  "⬇ Tải file mẫu (.xlsx)": { en: "⬇ Download Template (.xlsx)", ja: "⬇ テンプレート (.xlsx)" },
  "Áp dụng đáp án": { en: "Apply Answer Key", ja: "解答キーを適用" },
  "3. Chuẩn hóa & Xuất file": { en: "3. Normalize & Export", ja: "3. 正規化とエクスポート" },
  "Kiểm duyệt & Chỉnh sửa câu hỏi": { en: "Review & Edit Questions", ja: "問題の確認と編集" },
  "Bảng nhanh": { en: "Quick Table", ja: "クイック表" },
  "Đối chiếu song song (Split-Screen)": { en: "Split-Screen Review", ja: "並列レビュー (Split-Screen)" },
  "🔒 Đối chiếu song song (Split-Screen)": { en: "🔒 Split-Screen Review", ja: "🔒 並列レビュー (Split-Screen)" },
  "✓ Duyệt tất cả": { en: "✓ Verify All", ja: "✓ すべて承認" },
  "Xóa bảng": { en: "Clear Table", ja: "表をクリア" },
  "🎮 Mở trong Creator Studio": { en: "🎮 Open in Creator Studio", ja: "🎮 Creator Studio で開く" },
  "🎮 Creator Studio / Quiz Studio": { en: "🎮 Creator Studio / Quiz Studio", ja: "🎮 Creator Studio / Quiz Studio" },
  "✍️ Tạo Quiz thủ công": { en: "✍️ Create Quiz Manually", ja: "✍️ 手動でクイズ作成" },
  "Tạo Quiz mới": { en: "Create New Quiz", ja: "新規クイズ作成" },
  "📚 Lấy từ Kho đề AI Tutor": { en: "📚 Load from AI Tutor Decks", ja: "📚 AI Tutor 問題集から読み込む" },
  "✨ Nhập từ AI Converter": { en: "✨ Import from AI Converter", ja: "✨ AI Converter から取り込む" },
  "Mở": { en: "Open", ja: "開く" },
  "▶ Bắt đầu làm bài (Play)": { en: "▶ Start Quiz (Play)", ja: "▶ クイズ開始 (Play)" },
  "Cài đặt Google Gemini API": { en: "Google Gemini API Settings", ja: "Google Gemini API 設定" },
  "🌐 Ngôn ngữ giao diện (Language / 表示言語)": { en: "🌐 Interface Language (Ngôn ngữ / 表示言語)", ja: "🌐 表示言語 (Language / Ngôn ngữ)" },
  "Chuyển đổi tức thì giữa Tiếng Việt, Tiếng Anh và Tiếng Nhật (giữ nguyên phông chữ hệ thống).": {
    en: "Switch instantly between Vietnamese, English, and Japanese (keeping the system font intact).",
    ja: "ベトナム語・英語・日本語を即座に切り替えます（システムフォントは維持されます）。"
  },
  "Chuyển đổi qua lại giữa Tiếng Việt, Tiếng Anh và Tiếng Nhật (giữ nguyên phông chữ).": {
    en: "Switch between Vietnamese, English, and Japanese (preserving the current font).",
    ja: "ベトナム語・英語・日本語を切り替えます（現在のフォントを維持）。"
  },
  "Lưu Key": { en: "Save Key", ja: "キーを保存" },
  "Kiểm tra kết nối (Test API)": { en: "Test Connection (Test API)", ja: "接続テスト (Test API)" },
  "Xóa Key cá nhân": { en: "Delete Personal Key", ja: "個人キーを削除" },
  "Hướng dẫn lấy Gemini API Key": { en: "How to Get a Gemini API Key", ja: "Gemini API キーの取得方法" },
  "Mở Google AI Studio ↗": { en: "Open Google AI Studio ↗", ja: "Google AI Studio を開く ↗" },
  "✏️ Chỉnh sửa hồ sơ & Ảnh đại diện": { en: "✏️ Edit Profile & Avatar", ja: "✏️ プロフィールとアバターを編集" },
  "Tên hiển thị": { en: "Display Name", ja: "表示名" },
  "Email Google": { en: "Google Email", ja: "Google メール" },
  "Mã sinh viên": { en: "Student ID", ja: "学籍番号" },
  "Lớp / Khoa": { en: "Class / Faculty", ja: "クラス・学部" },
  "Mục tiêu học tập": { en: "Learning Goal", ja: "学習目標" },
  "Chưa cập nhật": { en: "Not set", ja: "未設定" },
  "Chưa cấu hình": { en: "Not configured", ja: "未設定" },
  "Đã lưu Key": { en: "Key Saved", ja: "キー保存済み" },
  "Đã lưu Key cá nhân": { en: "Personal Key Saved", ja: "個人キー保存済み" },
  "✅ Đã gán bởi Admin": { en: "✅ Assigned by Admin", ja: "✅ 管理者により割当済" },
  "✅ Kết nối thành công": { en: "✅ Connected", ja: "✅ 接続成功" },
  "❌ Key không hợp lệ": { en: "❌ Invalid Key", ja: "❌ 無効なキー" },
  "Bảng điều khiển Quản trị (Admin Panel)": { en: "Admin Control Panel", ja: "管理者コントロールパネル (Admin Panel)" },
  "Đơn đang chờ duyệt": { en: "Pending Requests", ja: "承認待ちリクエスト" },
  "Đơn đã duyệt": { en: "Approved Requests", ja: "承認済みリクエスト" },
  "Tổng doanh thu đã duyệt": { en: "Total Approved Revenue", ja: "承認済み総売上" },
  "Thành viên & Cấp gói": { en: "Members & Plans", ja: "メンバー・プラン・API割当" },
  "Cấu hình VietQR": { en: "VietQR Config", ja: "VietQR 設定" },
  "Mã giảm giá": { en: "Discount Codes", ja: "割引クーポン" },
  "Sao lưu hệ thống": { en: "System Backup", ja: "システムバックアップ" },
  "1. Cấp / nâng cấp / thu hồi gói thủ công": { en: "1. Grant / Upgrade / Revoke User Plan", ja: "1. プランの手動付与・アップグレード・取消" },
  "2. 🔑 Gán hộ Google Gemini API Key theo Email người dùng": {
    en: "2. 🔑 Assign Google Gemini API Key by User Email",
    ja: "2. 🔑 ユーザーメール宛に Google Gemini API キーを割り当て"
  },
  "Danh sách thành viên đang hoạt động": { en: "Active Members", ja: "有効メンバー一覧" },
  "Cấp / nâng cấp": { en: "Grant / Upgrade", ja: "付与・アップグレード" },
  "Thu hồi gói": { en: "Revoke Plan", ja: "プラン取消" },
  "🔑 Gán API cho Email": { en: "🔑 Assign API to Email", ja: "🔑 メールにAPIを割当" },
  "🔑 Gán API": { en: "🔑 Assign API", ja: "🔑 API割当" },
  "🔑 Đã gán API": { en: "🔑 API Assigned", ja: "🔑 API割当済" },
  "Thu hồi API": { en: "Revoke API", ja: "API取消" },
  "Lưu cấu hình": { en: "Save Config", ja: "設定を保存" },
  "Thêm mã": { en: "Add Code", ja: "コード追加" },
  "Xuất dữ liệu hệ thống (.json)": { en: "Export System Data (.json)", ja: "システムデータを出力 (.json)" }
};

const I18N_PATTERNS = [
  {
    re: /^Xin chào,\s*(.+?)\s*👋$/,
    en: function (m) { return "Hello, " + m[1] + " 👋"; },
    ja: function (m) { return "こんにちは、" + m[1] + " 👋"; }
  },
  {
    re: /^(\d+)\s+câu hỏi$/,
    en: function (m) { return m[1] + " questions"; },
    ja: function (m) { return m[1] + " 問"; }
  },
  {
    re: /^Tiến độ\s+(\d+)%$/,
    en: function (m) { return "Progress " + m[1] + "%"; },
    ja: function (m) { return "進捗 " + m[1] + "%"; }
  },
  {
    re: /^Tổng:\s*(\d+)$/,
    en: function (m) { return "Total: " + m[1]; },
    ja: function (m) { return "合計: " + m[1]; }
  },
  {
    re: /^Hợp lệ:\s*(\d+)$/,
    en: function (m) { return "Valid: " + m[1]; },
    ja: function (m) { return "有効: " + m[1]; }
  },
  {
    re: /^Trang\s+(\d+)\/(\d+)$/,
    en: function (m) { return "Page " + m[1] + "/" + m[2]; },
    ja: function (m) { return "ページ " + m[1] + "/" + m[2]; }
  },
  {
    re: /^Duyệt thanh toán\s*\((\d+)\)$/,
    en: function (m) { return "Payment Approvals (" + m[1] + ")"; },
    ja: function (m) { return "支払い承認 (" + m[1] + ")"; }
  },
  {
    re: /^Danh sách Quiz đã tạo\s*\((\d+)\)$/,
    en: function (m) { return "Created Quizzes (" + m[1] + ")"; },
    ja: function (m) { return "作成済みクイズ一覧 (" + m[1] + ")"; }
  },
  {
    re: /^Danh sách tài khoản đã được Admin gán Gemini API\s*\((\d+)\)$/,
    en: function (m) { return "Accounts with Admin-Assigned Gemini API (" + m[1] + ")"; },
    ja: function (m) { return "管理者が Gemini API を割り当てたアカウント (" + m[1] + ")"; }
  },
  {
    re: /^⚡ Nhập thẳng vào Kho đề\s*\((\d+)\s*câu hợp lệ\)$/,
    en: function (m) { return "⚡ 1-Click Import to Decks (" + m[1] + " valid)"; },
    ja: function (m) { return "⚡ 問題集へワンクリック登録 (" + m[1] + " 問)"; }
  }
];

function getLang() {
  try {
    const v = localStorage.getItem(KEYS.lang) || "vi";
    return (v === "en" || v === "ja" || v === "vi") ? v : "vi";
  } catch (e) { return "vi"; }
}

function translateString(viStr, lang) {
  if (!viStr || lang === "vi") return viStr;
  const trimmed = viStr.trim();
  if (!trimmed) return viStr;
  const hit = I18N_MAP[trimmed];
  if (hit && hit[lang]) {
    const lead = viStr.match(/^\s*/)[0];
    const trail = viStr.match(/\s*$/)[0];
    return lead + hit[lang] + trail;
  }
  for (let i = 0; i < I18N_PATTERNS.length; i++) {
    const p = I18N_PATTERNS[i];
    const m = trimmed.match(p.re);
    if (m && typeof p[lang] === "function") {
      return p[lang](m);
    }
  }
  return viStr;
}

function applyI18n(root) {
  if (typeof document === "undefined") return;
  const lang = getLang();
  if (document.documentElement) document.documentElement.setAttribute("lang", lang);
  const container = root || document.body;
  if (!container || typeof document.createTreeWalker !== "function") return;

  // 1. Walk text nodes without touching font-family or KaTeX math
  const walker = document.createTreeWalker(container, 4 /* NodeFilter.SHOW_TEXT */, null, false);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent) continue;
    const tag = parent.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE" || tag === "TEXTAREA") continue;
    if (parent.closest && parent.closest(".katex")) continue;
    const curVal = node.nodeValue || "";
    if (!curVal.trim()) continue;
    if (typeof node.__viText !== "string" || (lang === "vi" && node.__lastTranslated !== curVal)) {
      if (node.__lastTranslated !== curVal) node.__viText = curVal;
    }
    const baseVi = typeof node.__viText === "string" ? node.__viText : curVal;
    const nextVal = lang === "vi" ? baseVi : translateString(baseVi, lang);
    if (nextVal !== curVal) {
      node.__lastTranslated = nextVal;
      node.nodeValue = nextVal;
    }
  }

  // 2. Translate placeholders
  if (typeof container.querySelectorAll === "function") {
    const inputs = container.querySelectorAll("[placeholder]");
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      const curP = el.getAttribute("placeholder") || "";
      if (!el.__viPlaceholder || (lang === "vi" && el.__lastPlaceholder !== curP)) {
        if (el.__lastPlaceholder !== curP) el.__viPlaceholder = curP;
      }
      const nextP = lang === "vi" ? el.__viPlaceholder : translateString(el.__viPlaceholder, lang);
      if (nextP && nextP !== curP) {
        el.__lastPlaceholder = nextP;
        el.setAttribute("placeholder", nextP);
      }
    }
  }
}

function setLang(lang) {
  const next = (lang === "en" || lang === "ja" || lang === "vi") ? lang : "vi";
  try { localStorage.setItem(KEYS.lang, next); } catch (e) { /* */ }
  if (document.documentElement) document.documentElement.setAttribute("lang", next);
  updateChrome();
  renderTab();
  applyI18n(document.body);
  const msg = next === "en"
    ? "Switched interface language to English."
    : (next === "ja" ? "表示言語を日本語に切り替えました。" : "Đã chuyển ngôn ngữ giao diện sang Tiếng Việt.");
  showToast(msg, "info");
}

/* ------------------------------ Shared Namespace ------------------------------ */
window.UET = {
  state: state, KEYS: KEYS, XLSX_HEADERS: XLSX_HEADERS, LETTERS: LETTERS, TIERS: TIERS, TIER_ORDER: TIER_ORDER,
  $: $, esc: esc, renderRich: renderRich, setText: setText, setHTML: setHTML, toggleEl: toggleEl, on: on, clamp: clamp,
  fmtMoney: fmtMoney, fmtDate: fmtDate, fmtDateTime: fmtDateTime,
  loadJSON: loadJSON, loadObj: loadObj, loadArr: loadArr, saveJSON: saveJSON, removeKey: removeKey,
  showToast: showToast, showConfirm: showConfirm, openModal: openModal, closeModal: closeModal,
  shuffleArray: shuffleArray, downloadBlob: downloadBlob, fileSafe: fileSafe, copyText: copyText,
  isAdmin: isAdmin, isAdminUser: isAdminUser, currentTier: currentTier, tierRank: tierRank, effectiveLimits: effectiveLimits,
  can: can, requireFeature: requireFeature, promptUpgrade: promptUpgrade,
  getAssignedApiForUser: getActiveUserAssignedApi, getAssignedApiForEmail: getAssignedApiForEmail,
  getLang: getLang, setLang: setLang, applyI18n: applyI18n,
  getDecks: function () { return state.decks; }, getUserDecks: getUserDecks, getDeck: getDeck,
  normalizeQuestion: normalizeQuestion, parseWorkbookRows: parseWorkbookRows, addOrMergeDeck: addOrMergeDeck,
  downloadTemplate: downloadTemplate, showTab: showTab, navigateTo: navigateTo, syncHistory: syncHistory, renderTab: renderTab, updateChrome: updateChrome,
  describeSessions: describeSessions,
  rebuildAndRefresh: function () { rebuildDecks(); renderTab(); },
  enterGuestShareMode: enterGuestShareMode,
  saveExamHistory: function (entry) {
    const hist = loadArr(KEYS.history);
    hist.push(entry);
    saveJSON(KEYS.history, hist.slice(-200));
  },
  recordMistake: function (deckId, q) {
    const mk = loadObj(KEYS.mistakes);
    mk[deckId + "_" + q.id] = { deckId: deckId, question: q, streak: 0 };
    saveJSON(KEYS.mistakes, mk);
    updateChrome();
  },
  recordStats: function (deckId, attempts, correct) {
    const st = getStats();
    st.attempts += attempts;
    st.correct += correct;
    if (deckId) st.decks[deckId] = true;
    saveJSON(KEYS.stats, st);
  }
};

/* ------------------------------ Init ------------------------------ */
function init() {
  applyTheme(loadJSON(KEYS.theme, "light"));
  applyFont(currentFont());
  ensurePayCfg();

  on("themeBtn", "click", function () {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next); saveJSON(KEYS.theme, next);
  });
  on("fontDecBtn", "click", function () { saveJSON(KEYS.font, applyFont(currentFont() - 1)); });
  on("fontIncBtn", "click", function () { saveJSON(KEYS.font, applyFont(currentFont() + 1)); });
  on("userMenuBtn", "click", function (e) {
    e.stopPropagation();
    updateChrome();
    const dd = $("userDropdown");
    if (!dd) return;
    const open = dd.classList.contains("hidden");
    dd.classList.toggle("hidden", !open);
    const b = $("userMenuBtn"); if (b) b.setAttribute("aria-expanded", open ? "true" : "false");
  });
  on("brandHomeBtn", "click", function () { if (state.user) navigateTo("/"); });
  on("userDropdown", "click", function (e) {
    const lb = e.target.closest ? e.target.closest("[data-lang]") : null;
    if (lb) { e.stopPropagation(); setLang(lb.getAttribute("data-lang")); return; }
    const b = e.target.closest ? e.target.closest("[data-dd]") : null;
    if (!b) return;
    const act = b.getAttribute("data-dd");
    closeDropdown();
    if (act === "logout") logout();
    else showTab(act);
  });
  document.addEventListener("click", function (e) {
    const lb = e.target.closest ? e.target.closest("[data-lang]") : null;
    if (lb) { setLang(lb.getAttribute("data-lang")); }
    const wrap = $("userChip");
    if (wrap && !wrap.contains(e.target)) closeDropdown();
  });
  on("hamburgerBtn", "click", function () {
    const d = $("mobileDrawer");
    const open = d && d.classList.contains("hidden");
    toggleEl("mobileDrawer", !!open);
    toggleEl("drawerBackdrop", !!open);
    const b = $("hamburgerBtn"); if (b) b.setAttribute("aria-expanded", open ? "true" : "false");
  });
  on("drawerCloseBtn", "click", closeDrawer);
  on("drawerBackdrop", "click", closeDrawer);
  on("drawerNav", "click", function (e) {
    const lb = e.target.closest ? e.target.closest("[data-lang]") : null;
    if (lb) { e.stopPropagation(); setLang(lb.getAttribute("data-lang")); return; }
    const b = e.target.closest ? e.target.closest("[data-tab]") : null;
    if (b) showTab(b.getAttribute("data-tab"));
  });
  on("dashJoinBtn", "click", function () {
    const code = ($("dashJoinCode") ? $("dashJoinCode").value : "").trim();
    if (window.UETCloud) window.UETCloud.resolveAndOpenShare(code);
  });
  on("loginJoinBtn", "click", function () {
    const code = ($("loginJoinCode") ? $("loginJoinCode").value : "").trim();
    if (window.UETCloud) window.UETCloud.resolveAndOpenShare(code);
  });
  on("profSave", "click", saveProfile);
  on("profCancel", "click", function () { closeModal("profileModal"); });
  on("profUrlApply", "click", applyAvatarUrl);
  on("profAvatarFile", "change", onAvatarFile);
  on("profAvatarReset", "click", resetAvatar);
  on("profName", "input", updateProfPreview);
  on("copyAccBtn", "click", function () { copyText(getPayCfg().accountNo, "số tài khoản"); });
  on("copyMemoBtn", "click", function () { copyText(checkoutMemo(), "nội dung chuyển khoản"); });

  on("navTabs", "click", function (e) {
    const b = e.target.closest ? e.target.closest("[data-tab]") : null;
    if (b) showTab(b.getAttribute("data-tab"));
  });

  ["deckList", "studyPicker", "flashPicker", "tierInfo", "greetingCard", "dashPendingBanner"].forEach(function (id) { on(id, "click", onDeckListClick); });
  on("dashGoConverterBtn", "click", function () { showTab("converter"); });
  on("mistakeBody", "click", onMistakeClick);
  on("deckPager", "click", onPagerClick);
  on("histPager", "click", onPagerClick);
  on("tagPills", "click", function (e) {
    const b = e.target.closest ? e.target.closest("[data-tag]") : null;
    if (!b) return;
    state.filterTag = b.getAttribute("data-tag"); state.deckPage = 1; renderDeckPanel();
  });
  on("deckSearch", "input", function (e) { state.deckQuery = e.target.value; state.deckPage = 1; renderDeckPanel(); });
  on("histSearch", "input", function (e) { state.histQuery = e.target.value; state.histPage = 1; renderHistPanel(); });
  on("importBtn", "click", openImport);
  const segs = document.querySelectorAll(".seg-btn[data-range]");
  for (let i = 0; i < segs.length; i++) {
    segs[i].addEventListener("click", function (e) { state.chartRange = e.currentTarget.getAttribute("data-range") === "month" ? "month" : "week"; renderChart(); });
  }
  updateChrome();
  applyI18n(document.body);

  // Config
  on("cfgChunk", "change", function () { syncExamConfigVisibility(); updateChunkSelector(); });
  on("chunkSize", "input", updateChunkSelector);
  on("chunkPresets", "click", function (e) {
    const b = e.target.closest ? e.target.closest("[data-csize]") : null;
    if (!b) return;
    const sz = $("chunkSize"); if (sz) sz.value = b.getAttribute("data-csize");
    updateChunkSelector();
  });
  const eRadios = document.getElementsByName("examPickMode");
  for (let i = 0; i < eRadios.length; i++) {
    eRadios[i].addEventListener("change", function () { syncExamConfigVisibility(); updateChunkSelector(); });
  }
  on("configCancel", "click", function () { closeModal("configModal"); });
  on("configStart", "click", startFromConfig);

  // Import
  on("importCancel", "click", function () { closeModal("importModal"); });
  on("downloadTemplateBtn", "click", downloadTemplate);
  on("importFile", "change", onImportFile);
  on("importConfirm", "click", confirmImport);
  const radios = document.getElementsByName("importMode");
  for (let i = 0; i < radios.length; i++) {
    radios[i].addEventListener("change", function () {
      const m = currentImportMode();
      toggleEl("newDeckFields", m === "new");
      toggleEl("mergeFields", m === "merge");
    });
  }

  // Confirm
  on("confirmCancel", "click", function () { state.confirmCb = null; closeModal("confirmModal"); });
  on("confirmOk", "click", function () {
    const cb = state.confirmCb;
    state.confirmCb = null;
    closeModal("confirmModal");
    if (cb) { try { cb(); } catch (e) { showToast("Đã xảy ra lỗi khi thực hiện thao tác.", "error"); } }
  });

  // Study
  on("optionsList", "click", function (e) {
    const b = e.target.closest ? e.target.closest(".option-card") : null;
    if (b) selectOption(parseInt(b.getAttribute("data-idx"), 10));
  });
  on("paletteGrid", "click", function (e) {
    const b = e.target.closest ? e.target.closest(".pal-btn") : null;
    if (b) goTo(parseInt(b.getAttribute("data-idx"), 10));
  });
  on("palFilters", "click", function (e) {
    const b = e.target.closest ? e.target.closest("[data-filter]") : null;
    if (!b) return;
    const f = b.getAttribute("data-filter");
    state.palFilter = state.palFilter === f ? null : f;
    renderPalette();
  });
  on("checkBtn", "click", submitCurrent);
  on("flagBtn", "click", toggleFlag);
  on("firstBtn", "click", function () { goTo(0); });
  on("prevBtn", "click", prevQuestion);
  on("nextBtn", "click", nextQuestion);
  on("lastBtn", "click", function () { const s = state.session; if (s) goTo(s.questions.length - 1); });
  on("exitBtn", "click", requestExit);
  on("resetBtn", "click", requestReset);
  on("finishBtn", "click", requestFinish);

  // Flash
  on("flipCard", "click", flashFlip);
  on("flashFlipBtn", "click", flashFlip);
  on("flashPrevBtn", "click", function () { flashMove(-1); });
  on("flashNextBtn", "click", function () { flashMove(1); });
  on("flashExitBtn", "click", function () { state.flash = null; navigateTo("/flashcards", { replace: true }); });

  // Pricing + checkout
  on("unrankedBanner", "click", function (e) {
    const sw = e.target.closest ? e.target.closest("[data-admin-switch]") : null;
    if (sw) { adminSwitchOwnTier(sw.getAttribute("data-admin-switch")); return; }
    const b = e.target.closest ? e.target.closest("[data-activate-free]") : null;
    if (b) activateUnranked();
  });
  on("pricingGrid", "click", function (e) {
    const sw = e.target.closest ? e.target.closest("[data-admin-switch]") : null;
    if (sw && !sw.disabled) { adminSwitchOwnTier(sw.getAttribute("data-admin-switch")); return; }
    const b = e.target.closest ? e.target.closest("[data-buy]") : null;
    if (b && !b.disabled) openCheckout(b.getAttribute("data-buy"));
  });
  on("userPayHistoryBody", "click", function (e) {
    const b = e.target.closest ? e.target.closest("[data-buy]") : null;
    if (b) openCheckout(b.getAttribute("data-buy"));
  });
  on("voucherApply", "click", applyVoucher);
  on("voucherInput", "keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); applyVoucher(); } });
  on("coReceiptFile", "change", onReceiptFile);
  on("coReceiptClear", "click", function () {
    if (state.checkout) state.checkout.receiptImage = "";
    const rf = $("coReceiptFile"); if (rf) rf.value = "";
    const rp = $("coReceiptPreview"); if (rp) { rp.src = ""; rp.classList.add("hidden"); }
    toggleEl("coReceiptClear", false);
  });
  on("payBtn", "click", submitPaymentRequest);
  on("checkoutCancel", "click", function () {
    if (state.checkout && state.checkout.busy) return;
    state.checkout = null; closeModal("checkoutModal");
  });

  // Reject & Receipt Modals
  on("rejectCancel", "click", function () { state.rejectReqId = null; closeModal("rejectModal"); });
  on("rejectConfirm", "click", confirmRejectRequest);
  on("receiptClose", "click", function () { closeModal("receiptModal"); });

  // Admin
  on("adminBody", "click", onAdminClick);
  on("adminBody", "change", onAdminChange);
  on("adminBody", "input", onAdminInput);

  document.addEventListener("keydown", onKeyDown);

  window.addEventListener("popstate", function () {
    if (!state.user) return;
    navigateTo((window.location.pathname || "/") + (window.location.search || "") + (window.location.hash || ""), { fromPopState: true });
  });

  initGoogle();
  const stored = loadStoredAuth();
  if (stored) onAuthenticated(stored);
  else {
    toggleEl("loginView", true);
    document.title = "Đăng nhập | AI Tutor";
  }

  // Check if opened via Share Link (/quiz?code=... or ?share=... or #d=...) — works even in Incognito!
  setTimeout(function () {
    const qs = window.location.search || "";
    const pth = (window.location.pathname || "").toLowerCase();
    if (window.UETCloud && (pth === "/quiz" || qs.indexOf("share=") !== -1 || qs.indexOf("code=") !== -1 || window.location.hash.indexOf("d=") !== -1)) {
      window.UETCloud.resolveAndOpenShare("");
    }
  }, 150);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
