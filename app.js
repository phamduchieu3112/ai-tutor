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
  users: "uet_master_registered_users",
  lang: "uet_master_lang",
  quizzes: "uet_master_studio_quizzes"
};
const XLSX_HEADERS = [
  "Question Text", "Question Type", "Option 1", "Option 2", "Option 3", "Option 4",
  "Option 5", "Correct Answer", "Time in seconds", "Image Link", "Answer explanation"
];
const LETTERS = "ABCDE";
const MODE_LABEL = { practice: "\u00d4n t\u1eadp", exam: "Thi th\u1eed", mistake: "S\u1ed5 tay c\u00e2u hay sai" };
const FONT_MIN = 15, FONT_MAX = 24, FONT_DEFAULT = 17;
const PAGE_SIZE = 5;
const RING_C = 2 * Math.PI * 52;
const CHART_COLORS = ["#5347CD", "#887CFD", "#4896FE", "#16C8C7"];
const DAY_MS = 86400000;

/* 5-Tier Rank System (Arena of Valor inspired) */
const TIER_ORDER = ["none", "unranked", "bronze", "silver", "gold", "diamond"];
const TIERS = {
  none: { name: "Ch\u01b0a x\u1ebfp h\u1ea1ng", full: "Ch\u01b0a \u0111\u0103ng k\u00fd", sub: "\u0110\u0103ng k\u00fd Unranked 0\u0111 \u0111\u1ec3 b\u1eaft \u0111\u1ea7u", price: 0, maxDecks: 3, maxQ: 50, maxImages: 5, memo: "UNRANKED", icon: "🛡️", cls: "rank-unranked" },
  unranked: { name: "Unranked", full: "Unranked (Ch\u01b0a x\u1ebfp h\u1ea1ng)", sub: "Mi\u1ec5n ph\u00ed tr\u1ecdn \u0111\u1eddi • K\u00edch ho\u1ea1t ngay", price: 0, maxDecks: 3, maxQ: 50, maxImages: 5, memo: "UNRANKED", icon: "🛡️", cls: "rank-unranked" },
  bronze: { name: "Bronze", full: "Bronze (\u0110\u1ed3ng)", sub: "Thanh to\u00e1n → Ch\u1edd Admin duy\u1ec7t", price: 100000, maxDecks: 15, maxQ: 200, maxImages: 20, memo: "BRONZE", icon: "🥉", cls: "rank-bronze" },
  silver: { name: "Silver", full: "Silver (B\u1ea1c)", sub: "Thanh to\u00e1n → Ch\u1edd Admin duy\u1ec7t", price: 200000, maxDecks: 50, maxQ: 500, maxImages: 50, memo: "SILVER", icon: "🥈", cls: "rank-silver" },
  gold: { name: "Gold", full: "Gold (V\u00e0ng)", sub: "Ph\u1ed5 bi\u1ebfn nh\u1ea5t • Ch\u1edd Admin duy\u1ec7t", price: 300000, maxDecks: Infinity, maxQ: Infinity, maxImages: 100, memo: "GOLD", icon: "🥇", cls: "rank-gold" },
  diamond: { name: "Diamond", full: "Diamond (Kim C\u01b0\u01a1ng)", sub: "To\u00e0n quy\u1ec1n VIP • Ch\u1edd Admin duy\u1ec7t", price: 500000, maxDecks: Infinity, maxQ: Infinity, maxImages: 200, memo: "DIAMOND", icon: "💎", cls: "rank-diamond" }
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
  mistake: "S\u1ed5 tay c\u00e2u hay sai (L\u00e0m l\u1ea1i c\u00e2u sai)",
  exam: "Thi th\u1eed chu\u1ea9n ph\u00f2ng thi & L\u1ecbch s\u1eed luy\u1ec7n \u0111\u1ec1",
  exportData: "Xu\u1ea5t b\u1ed9 \u0111\u1ec1 .json / .xlsx kh\u00f4ng gi\u1edbi h\u1ea1n",
  studioAdv: "Creator Studio n\u00e2ng cao (Streak, Redemption, th\u1eddi gian t\u1eebng c\u00e2u, \u0111\u1ea3o \u0111\u1ec1)",
  shuffle: "\u0110\u1ea3o th\u1ee9 t\u1ef1 c\u00e2u h\u1ecfi / \u0111\u00e1p \u00e1n",
  aiExplain: "AI gi\u1ea3i th\u00edch \u0111\u00e1p \u00e1n",
  splitReview: "Ch\u1ebf \u0111\u1ed9 ki\u1ec3m duy\u1ec7t song song (Split-Screen Review)",
  merge: "G\u1ed9p th\u00eam v\u00e0o b\u1ed9 \u0111\u1ec1 c\u00f3 s\u1eb5n khi Import",
  doubleCheck: "AI Ki\u1ec3m tra ch\u00e9o \u0111\u00e1p \u00e1n (Double-Check) h\u00e0ng lo\u1ea1t",
  chunk: "Chia nh\u1ecf ch\u1eb7ng h\u1ecdc",
  proAi: "Ch\u1ebf \u0111\u1ed9 AI Ch\u00ednh x\u00e1c cao \u01b0u ti\u00ean (Gemini Pro)",
  backupSync: "Xu\u1ea5t b\u00e1o c\u00e1o th\u1ed1ng k\u00ea chi ti\u1ebft & Sao l\u01b0u Kho \u0111\u1ec1"
};
const PRICING_FEATURES = {
  unranked: [
    "L\u01b0u t\u1ed1i \u0111a 3 b\u1ed9 \u0111\u1ec1 trong Kho \u0111\u1ec1, t\u1ed1i \u0111a 50 c\u00e2u/b\u1ed9 \u0111\u1ec1",
    "L\u00e0m b\u00e0i luy\u1ec7n t\u1eadp c\u01a1 b\u1ea3n & xem th\u1ed1ng k\u00ea \u0111i\u1ec3m s\u1ed1",
    "D\u00f9ng Creator/Quiz Studio c\u01a1 b\u1ea3n (t\u1ea1o & l\u00e0m b\u00e0i)",
    "D\u00f9ng AI Converter (t\u1ed1i \u0111a 5 \u1ea3nh/l\u1ea7n, d\u00f9ng Gemini API Key c\u00e1 nh\u00e2n)"
  ],
  bronze: [
    "To\u00e0n b\u1ed9 quy\u1ec1n l\u1ee3i g\u00f3i Unranked",
    "L\u01b0u t\u1ed1i \u0111a 15 b\u1ed9 \u0111\u1ec1, t\u1ed1i \u0111a 200 c\u00e2u/b\u1ed9 \u0111\u1ec1",
    "AI Converter t\u1ed1i \u0111a 20 \u1ea3nh/l\u1ea7n + xu\u1ea5t file Excel chu\u1ea9n kh\u00f4ng gi\u1edbi h\u1ea1n",
    "M\u1edf kh\u00f3a L\u00e0m l\u1ea1i c\u00e2u sai (S\u1ed5 tay sai), Thi th\u1eed & L\u1ecbch s\u1eed luy\u1ec7n \u0111\u1ec1"
  ],
  silver: [
    "To\u00e0n b\u1ed9 quy\u1ec1n l\u1ee3i g\u00f3i Bronze",
    "L\u01b0u t\u1ed1i \u0111a 50 b\u1ed9 \u0111\u1ec1, t\u1ed1i \u0111a 500 c\u00e2u/b\u1ed9 \u0111\u1ec1",
    "M\u1edf kh\u00f3a Creator/Quiz Studio n\u00e2ng cao (Streak, Redemption, th\u1eddi gian t\u1eebng c\u00e2u, \u0111\u1ea3o \u0111\u1ec1)",
    "H\u1ed7 tr\u1ee3 AI gi\u1ea3i th\u00edch \u0111\u00e1p \u00e1n & Ch\u1ebf \u0111\u1ed9 ki\u1ec3m duy\u1ec7t song song (Split-Screen Review)"
  ],
  gold: [
    "To\u00e0n b\u1ed9 quy\u1ec1n l\u1ee3i g\u00f3i Silver",
    "Kh\u00f4ng gi\u1edbi h\u1ea1n s\u1ed1 l\u01b0\u1ee3ng b\u1ed9 \u0111\u1ec1 & s\u1ed1 c\u00e2u h\u1ecfi",
    "M\u1edf kh\u00f3a G\u1ed9p th\u00eam v\u00e0o b\u1ed9 \u0111\u1ec1 c\u00f3 s\u1eb5n khi Import",
    "M\u1edf kh\u00f3a AI Ki\u1ec3m tra ch\u00e9o \u0111\u00e1p \u00e1n (Double-Check) h\u00e0ng lo\u1ea1t & l\u1ecdc c\u00e2u nghi ng\u1edd sai"
  ],
  diamond: [
    "To\u00e0n b\u1ed9 quy\u1ec1n l\u1ee3i g\u00f3i Gold (kh\u00f4ng gi\u1edbi h\u1ea1n m\u1ecdi t\u00ednh n\u0103ng)",
    "\u01afu ti\u00ean ch\u1ebf \u0111\u1ed9 AI Ch\u00ednh x\u00e1c cao cho \u0111\u1ec1 To\u00e1n/L\u00fd/H\u00f3a/Ti\u1ebfng Anh ph\u1ee9c t\u1ea1p",
    "Xu\u1ea5t b\u00e1o c\u00e1o th\u1ed1ng k\u00ea h\u1ecdc t\u1eadp chi ti\u1ebft & sao l\u01b0u/\u0111\u1ed3ng b\u1ed9 Kho \u0111\u1ec1",
    "Huy hi\u1ec7u Diamond VIP n\u1ed5i b\u1eadt tr\u00ean h\u1ed3 s\u01a1 & h\u1ed7 tr\u1ee3 \u01b0u ti\u00ean 1-1"
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
  adminQuery: "",
  adminMemberQuery: "",
  adminMemberSort: "newest",
  registeredSessionEmail: "",
  adminStorageDriver: null,
  adminNotificationLogs: []
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
function fmtMoney(n) { return Number(n || 0).toLocaleString("vi-VN") + "\u0111"; }
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
  } catch (e) { showToast("Kh\u00f4ng th\u1ec3 l\u01b0u d\u1eef li\u1ec7u v\u00e0o tr\u00ecnh duy\u1ec7t (b\u1ed9 nh\u1edb \u0111\u1ea7y ho\u1eb7c b\u1ecb ch\u1eb7n).", "error"); return false; }
}
function removeKey(key) { try { localStorage.removeItem(key); } catch (e) { /* b\u1ecf qua */ } }

function showToast(msg, type, action) {
  const box = $("toastContainer");
  if (!box) return;
  const t = document.createElement("div");
  t.className = "toast " + (type || "info");
  const curLang = typeof getLang === "function" ? getLang() : "vi";
  const sp = document.createElement("span");
  sp.textContent = typeof translateString === "function" ? translateString(String(msg || ""), curLang) : msg;
  t.appendChild(sp);
  if (action && action.label && typeof action.onClick === "function") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast-act";
    btn.textContent = typeof translateString === "function" ? translateString(String(action.label || ""), curLang) : action.label;
    btn.addEventListener("click", function () { action.onClick(); if (t.parentNode) t.parentNode.removeChild(t); });
    t.appendChild(btn);
  }
  box.appendChild(t);
  setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, action ? 6500 : 4200);
}
function anyModalOpen() { return !!document.querySelector(".modal-overlay:not(.hidden)"); }
function openModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.remove("hidden");
  document.body.classList.add("modal-open");
  if (typeof applyI18n === "function") applyI18n(m);
}
function closeModal(id) { const m = $(id); if (m) m.classList.add("hidden"); if (!anyModalOpen()) document.body.classList.remove("modal-open"); }
function showConfirm(title, msg, onConfirm, okLabel) {
  const curLang = typeof getLang === "function" ? getLang() : "vi";
  const tr = function (s) { return typeof translateString === "function" ? translateString(String(s || ""), curLang) : s; };
  setText("confirmTitle", tr(title));
  setText("confirmMsg", tr(msg));
  setText("confirmOk", tr(okLabel || "X\u00e1c nh\u1eadn"));
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
  } catch (e) { showToast("Kh\u00f4ng th\u1ec3 t\u1ea3i file xu\u1ed1ng.", "error"); }
}
function fileSafe(name) { return String(name || "de").replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 80) || "de"; }

function paginate(arr, page) {
  const pages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
  const p = clamp(page, 1, pages);
  return { items: arr.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), page: p, pages: pages };
}
function renderPager(id, key, page, pages) {
  let h = '<button type="button" data-pager="' + key + '" data-page="' + (page - 1) + '"' + (page <= 1 ? " disabled" : "") + ' aria-label="Trang tr\u01b0\u1edbc">&lt;</button>';
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
    const mergedApis = {};
    // Scrub any legacy raw keys from browser localStorage (Zero Client Exposure)
    Object.keys(localApis).forEach(function (em) {
      const k = String(em || "").toLowerCase();
      const it = localApis[em];
      if (it && typeof it === "object" && it.maskedKey) {
        mergedApis[k] = {
          email: k,
          maskedKey: String(it.maskedKey),
          model: String(it.model || "gemini-2.5-flash"),
          assignedBy: it.assignedBy || ADMIN_EMAIL,
          updatedAt: it.updatedAt || "",
          ts: Number(it.ts) || 0
        };
      }
    });
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
      if (item && typeof item === "object" && (item.maskedKey || item.apiKey)) {
        const safeItem = {
          email: k,
          maskedKey: String(item.maskedKey || maskApiKeyDisplay(item.apiKey || "")),
          model: String(item.model || "gemini-2.5-flash"),
          assignedBy: item.assignedBy || ADMIN_EMAIL,
          updatedAt: item.updatedAt || "",
          ts: Number(item.ts) || 0
        };
        if (!mergedApis[k] || JSON.stringify(mergedApis[k]) !== JSON.stringify(safeItem)) {
          mergedApis[k] = safeItem;
          changed = true;
        }
      }
    });
    saveJSON(KEYS.userApis, mergedApis);
  }
  if (snap.registeredUsers && typeof snap.registeredUsers === "object") {
    const localUsers = loadObj(KEYS.users);
    const mergedUsers = Object.assign({}, localUsers);
    Object.keys(snap.registeredUsers).forEach(function (em) {
      const k = String(em || "").trim().toLowerCase();
      const u = snap.registeredUsers[em];
      if (k && u && typeof u === "object") {
        if (!mergedUsers[k] || JSON.stringify(mergedUsers[k]) !== JSON.stringify(u)) {
          mergedUsers[k] = Object.assign({}, mergedUsers[k] || {}, u, { email: k });
          changed = true;
        }
      }
    });
    saveJSON(KEYS.users, mergedUsers);
  }
  if (snap.storageDriver && typeof snap.storageDriver === "object") {
    state.adminStorageDriver = snap.storageDriver;
  }
  if (Array.isArray(snap.notificationLogs)) {
    state.adminNotificationLogs = snap.notificationLogs;
  }
  return changed;
}

function recordLocalUserLogin(user, bumpLogin) {
  if (!user || !user.email) return null;
  const em = String(user.email).trim().toLowerCase();
  const users = loadObj(KEYS.users);
  const nowIso = new Date().toISOString();
  const existing = users[em];
  if (!existing) {
    users[em] = {
      uid: user.uid || em,
      email: em,
      name: String(user.name || em.split("@")[0]).trim(),
      picture: String(user.picture || "").trim(),
      createdAt: nowIso,
      lastLoginAt: nowIso,
      loginCount: 1
    };
  } else {
    if (user.name && String(user.name).trim()) existing.name = String(user.name).trim();
    if (user.picture && String(user.picture).trim()) existing.picture = String(user.picture).trim();
    if (bumpLogin) {
      existing.lastLoginAt = nowIso;
      existing.loginCount = (Number(existing.loginCount) || 1) + 1;
    }
  }
  saveJSON(KEYS.users, users);
  return users[em];
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
    if (state.user && state.user.email) {
      const curEm = String(state.user.email).trim().toLowerCase();
      if (state.registeredSessionEmail !== curEm) {
        // Await registration BEFORE billing/sync to avoid parallel race conditions & let Vercel finish SMTP delivery
        const regResp = await apiCall("/api/users/register", "POST", {
          uid: state.user.uid || curEm,
          email: curEm,
          name: state.user.name,
          picture: state.user.picture
        });
        if (regResp && !regResp._err) {
          state.registeredSessionEmail = curEm;
        }
      }
    }
    const localUsers = loadObj(KEYS.users);
    const curUserRec = state.user && state.user.email ? (localUsers[state.user.email.toLowerCase()] || state.user) : undefined;
    const payload = {
      currentUser: curUserRec,
      registeredUsers: isAdmin() ? localUsers : undefined,
      subscriptions: loadObj(KEYS.subs),
      payment_requests: loadArr(KEYS.payReqs),
      vouchers: loadArr(KEYS.vouchers),
      paymentConfig: isAdmin() ? loadObj(KEYS.payCfg) : undefined
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
  if (!item || typeof item !== "object") return null;
  const masked = item.maskedKey || (item.apiKey ? maskApiKeyDisplay(item.apiKey) : "");
  return masked ? { email: em, maskedKey: masked, model: item.model || "gemini-2.5-flash", updatedAt: item.updatedAt || "", ts: Number(item.ts) || 0 } : null;
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
    showToast("Truy c\u1eadp b\u1ecb t\u1eeb ch\u1ed1i! Ch\u1ec9 t\u00e0i kho\u1ea3n qu\u1ea3n tr\u1ecb phamduchieurobotics@gmail.com m\u1edbi c\u00f3 quy\u1ec1n th\u1ef1c hi\u1ec7n thao t\u00e1c n\u00e0y.", "error");
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
  showConfirm("N\u00e2ng c\u1ea5p h\u1ea1ng g\u00f3i", msg + " B\u1ea1n c\u00f3 mu\u1ed1n xem c\u00e1c g\u00f3i n\u00e2ng c\u1ea5p kh\u00f4ng?", function () { showTab("pricing"); }, "Xem g\u00f3i n\u00e2ng c\u1ea5p");
}
function requireFeature(feature) {
  if (can(feature)) return true;
  const minRank = FEATURE_MIN[feature] || 2;
  const minTierName = TIERS[TIER_ORDER[minRank]] ? TIERS[TIER_ORDER[minRank]].name : "cao h\u01a1n";
  promptUpgrade("T\u00ednh n\u0103ng \"" + FEATURE_NAME[feature] + "\" y\u00eau c\u1ea7u g\u00f3i " + minTierName + " tr\u1edf l\u00ean.");
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
      recordLocalUserLogin(user, true);
      hideLoginError();
      onAuthenticated(user);
    } else {
      showLoginError("\u0110\u0103ng nh\u1eadp th\u1ea5t b\u1ea1i! T\u00e0i kho\u1ea3n Google ch\u01b0a \u0111\u01b0\u1ee3c x\u00e1c minh email. Vui l\u00f2ng th\u1eed l\u1ea1i b\u1eb1ng t\u00e0i kho\u1ea3n kh\u00e1c.");
    }
  } catch (e) { showLoginError("\u0110\u0103ng nh\u1eadp th\u1ea5t b\u1ea1i. Vui l\u00f2ng th\u1eed l\u1ea1i."); }
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
      } catch (e) { showLoginError("Kh\u00f4ng th\u1ec3 kh\u1edfi t\u1ea1o \u0111\u0103ng nh\u1eadp Google. Vui l\u00f2ng t\u1ea3i l\u1ea1i trang."); }
    } else if (tries > 100) {
      clearInterval(timer);
      showLoginError("Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c d\u1ecbch v\u1ee5 \u0111\u0103ng nh\u1eadp Google. Vui l\u00f2ng ki\u1ec3m tra k\u1ebft n\u1ed1i m\u1ea1ng v\u00e0 t\u1ea3i l\u1ea1i trang.");
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
  recordLocalUserLogin(user, false);
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
  state.registeredSessionEmail = ""; state.adminStorageDriver = null; state.adminNotificationLogs = [];
  if (typeof sysKeysState !== "undefined") {
    sysKeysState.loaded = false; sysKeysState.keys = []; sysKeysState.envKeys = []; sysKeysState.preview = null; sysKeysState.rawDraft = "";
  }
  if (window.UETConverter && typeof window.UETConverter.resetAdminVerifyCache === "function") {
    window.UETConverter.resetAdminVerifyCache();
  }
  removeKey(KEYS.auth);
  try { if (typeof google !== "undefined" && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) { /* b\u1ecf qua */ }
  ["userChip", "navTabs", "hamburgerBtn", "syncStatusChip", "tierBadge", "appShell"].forEach(function (id) { toggleEl(id, false); });
  toggleEl("loginView", true);
  hideLoginError();
  document.title = "\u0110\u0103ng nh\u1eadp | AI Tutor";
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
      title: String(d.title || "B\u1ed9 \u0111\u1ec1 kh\u00f4ng t\u00ean"),
      tag: String(d.tag || "Ch\u01b0a ph\u00e2n lo\u1ea1i"),
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
  if (window.VocabStudio && typeof window.VocabStudio.onUserAuthenticated === "function") {
    window.VocabStudio.onUserAuthenticated();
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
  "/": { tab: "dashboard", title: "T\u1ed5ng quan | AI Tutor" },
  "/dashboard": { tab: "dashboard", title: "T\u1ed5ng quan | AI Tutor" },
  "/practice": { tab: "study", title: "\u00d4n t\u1eadp & Thi | AI Tutor" },
  "/practice/session": { tab: "study", sub: "session", title: "\u0110ang l\u00e0m b\u00e0i | AI Tutor" },
  "/creator-studio": { tab: "studio", sub: "home", title: "Creator Studio | AI Tutor" },
  "/creator-studio/editor": { tab: "studio", sub: "editor", title: "Tr\u00ecnh so\u1ea1n th\u1ea3o Quiz | AI Tutor" },
  "/creator-studio/lobby": { tab: "studio", sub: "lobby", title: "C\u00e0i \u0111\u1eb7t Quiz | AI Tutor" },
  "/creator-studio/play": { tab: "studio", sub: "play", title: "\u0110ang ch\u01a1i Quiz | AI Tutor" },
  "/creator-studio/summary": { tab: "studio", sub: "summary", title: "T\u1ed5ng k\u1ebft Quiz | AI Tutor" },
  "/creator-studio/students": { tab: "studio", sub: "students", title: "H\u1ecdc sinh & L\u1edbp h\u1ecdc | AI Tutor" },
  "/creator-studio/assignments": { tab: "studio", sub: "assignments", title: "Giao b\u00e0i t\u1eadp | AI Tutor" },
  "/creator-studio/gradebook": { tab: "studio", sub: "gradebook", title: "S\u1ed5 \u0111i\u1ec3m & Ph\u00e2n t\u00edch | AI Tutor" },
  "/converter": { tab: "converter", sub: "upload", title: "AI Converter | AI Tutor" },
  "/converter/image": { tab: "converter", sub: "upload", title: "AI Converter | AI Tutor" },
  "/converter/markdown": { tab: "converter", sub: "upload", title: "AI Converter | AI Tutor" },
  "/converter/excel": { tab: "converter", sub: "upload", title: "AI Converter | AI Tutor" },
  "/converter/review": { tab: "converter", sub: "split", title: "Ki\u1ec3m duy\u1ec7t song song | AI Tutor" },
  "/vocab": { tab: "vocab", title: "Vocab Studio | AI Tutor" },
  "/vocab.html": { tab: "vocab", title: "Vocab Studio | AI Tutor" },
  "/flashcards": { tab: "flash", title: "L\u1eadt th\u1ebb | AI Tutor" },
  "/flashcards/play": { tab: "flash", sub: "play", title: "\u0110ang h\u1ecdc L\u1eadt th\u1ebb | AI Tutor" },
  "/mistakes": { tab: "mistake", title: "S\u1ed5 tay c\u00e2u hay sai | AI Tutor" },
  "/profile": { tab: "profile", title: "H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n | AI Tutor" },
  "/pricing": { tab: "pricing", title: "G\u00f3i n\u00e2ng c\u1ea5p | AI Tutor" },
  "/api-settings": { tab: "api", title: "C\u00e0i \u0111\u1eb7t Gemini API | AI Tutor" },
  "/api-guide": { tab: "guide", title: "H\u01b0\u1edbng d\u1eabn l\u1ea5y API Key | AI Tutor" },
  "/backup": { tab: "backup", title: "Sao l\u01b0u & Kh\u00f4i ph\u1ee5c | AI Tutor" },
  "/admin": { tab: "admin", sub: "requests", title: "Qu\u1ea3n tr\u1ecb duy\u1ec7t \u0111\u01a1n | AI Tutor", adminOnly: true },
  "/admin/requests": { tab: "admin", sub: "requests", title: "Qu\u1ea3n tr\u1ecb – Duy\u1ec7t thanh to\u00e1n | AI Tutor", adminOnly: true },
  "/admin/members": { tab: "admin", sub: "members", title: "Qu\u1ea3n tr\u1ecb – Th\u00e0nh vi\u00ean | AI Tutor", adminOnly: true },
  "/admin/system-keys": { tab: "admin", sub: "syskeys", title: "Qu\u1ea3n tr\u1ecb – API Key H\u1ec7 th\u1ed1ng | AI Tutor", adminOnly: true },
  "/admin/vietqr": { tab: "admin", sub: "cfg", title: "Qu\u1ea3n tr\u1ecb – C\u1ea5u h\u00ecnh VietQR | AI Tutor", adminOnly: true },
  "/admin/vouchers": { tab: "admin", sub: "voucher", title: "Qu\u1ea3n tr\u1ecb – M\u00e3 gi\u1ea3m gi\u00e1 | AI Tutor", adminOnly: true },
  "/admin/backup": { tab: "admin", sub: "backup", title: "Qu\u1ea3n tr\u1ecb – Sao l\u01b0u h\u1ec7 th\u1ed1ng | AI Tutor", adminOnly: true },
  "/quiz": { tab: "studio", sub: "quiz", title: "L\u00e0m b\u00e0i chia s\u1ebb | AI Tutor" }
};
const TAB_TO_PATH = {
  dashboard: "/dashboard",
  study: "/practice",
  studio: "/creator-studio",
  converter: "/converter",
  vocab: "/vocab",
  flash: "/flashcards",
  mistake: "/mistakes",
  profile: "/profile",
  pricing: "/pricing",
  api: "/api-settings",
  guide: "/api-guide",
  backup: "/backup",
  admin: "/admin"
};
const ADMIN_SUB_TO_PATH = {
  requests: "/admin/requests",
  members: "/admin/members",
  syskeys: "/admin/system-keys",
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
    if (!opts.silentGuard) showToast("Truy c\u1eadp b\u1ecb t\u1eeb ch\u1ed1i! B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n v\u00e0o trang Qu\u1ea3n tr\u1ecb.", "error");
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
    pageTitle = (state.session.review ? "Xem l\u1ea1i b\u00e0i thi" : (MODE_LABEL[state.session.mode] || "\u0110ang l\u00e0m b\u00e0i")) + " | AI Tutor";
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
    vocab: "viewVocab",
    flash: "viewFlash",
    mistake: "viewMistake",
    profile: "viewProfile",
    pricing: "viewPricing",
    api: "viewApi",
    guide: "viewApiGuide",
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
    case "vocab":
      if (window.VocabStudio && typeof window.VocabStudio.mount === "function") window.VocabStudio.mount("vocabRoot");
      break;
    case "api":
      if (window.UETConverter && typeof window.UETConverter.renderApiPage === "function") window.UETConverter.renderApiPage();
      break;
    case "guide":
      if (window.UETConverter && typeof window.UETConverter.renderApiGuide === "function") window.UETConverter.renderApiGuide();
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
    const hasPersonal = !!(window.UETConverter && typeof window.UETConverter.hasPersonalKeys === "function" && window.UETConverter.hasPersonalKeys());
    const hasSysProxy = !!(state.user && state.user.credential);
    dot.classList.toggle("ok", hasPersonal || hasSysProxy);
    dot.title = hasPersonal
      ? "\u0110ang d\u00f9ng API Key c\u00e1 nh\u00e2n"
      : (hasSysProxy ? "\u0110ang d\u00f9ng System Key Pool mi\u1ec5n ph\u00ed m\u1eb7c \u0111\u1ecbnh" : "Ch\u01b0a c\u1ea5u h\u00ecnh API Key");
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
      pbox.innerHTML = '<span>⏳ \u0110ang ch\u1edd Qu\u1ea3n tr\u1ecb vi\u00ean x\u00e1c nh\u1eadn y\u00eau c\u1ea7u n\u00e2ng c\u1ea5p g\u00f3i <strong>' + esc(names) + '</strong>.</span>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="go-pricing">Xem chi ti\u1ebft</button>';
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
    actions = '<button type="button" class="btn btn-primary btn-sm" data-action="flash">L\u1eadt th\u1ebb</button>';
  } else {
    actions = '<button type="button" class="btn btn-primary btn-sm" data-action="practice">' + (resume ? "Ti\u1ebfp t\u1ee5c \u00f4n t\u1eadp" : "\u00d4n t\u1eadp") + "</button>" +
      '<button type="button" class="btn btn-primary btn-sm" data-action="exam">' + lockExam + "Thi th\u1eed</button>" +
      '<button type="button" class="btn btn-outline btn-sm" data-action="studio">Quiz Studio</button>';
    if (mode === "dash") {
      actions += '<button type="button" class="btn btn-outline btn-sm" data-action="flash">L\u1eadt th\u1ebb</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="share" title="Chia s\u1ebb b\u1eb1ng Link, M\u00e3 \u0111\u1ec1 &amp; QR">🔗 Chia s\u1ebb</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="pdf" title="Xu\u1ea5t PDF \u0111\u1ec3 in chu\u1ea9n A4">🖨️ Xu\u1ea5t PDF</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="export-json" title="Xu\u1ea5t b\u1ed9 \u0111\u1ec1 ra file .json">' + lockExp + "Xu\u1ea5t .json</button>" +
        '<button type="button" class="btn btn-outline btn-sm" data-action="export-xlsx" title="Xu\u1ea5t b\u1ed9 \u0111\u1ec1 ra file .xlsx">' + lockExp + "Xu\u1ea5t .xlsx</button>" +
        (d.kind === "user" ? '<button type="button" class="btn btn-outline btn-sm" data-action="delete" title="X\u00f3a b\u1ed9 \u0111\u1ec1 n\u00e0y">X\u00f3a</button>' : "");
    }
  }
  return '<div class="deck-row' + (pinned ? " pinned" : "") + '" data-deck-id="' + esc(d.id) + '">' +
    '<div class="deck-title-line"><span class="deck-title">' + esc(d.title) + "</span>" +
    (mode === "dash" ? '<button type="button" class="pin-btn' + (pinned ? " on" : "") + '" data-action="pin" aria-pressed="' + (pinned ? "true" : "false") + '" title="' + (pinned ? "B\u1ecf ghim b\u1ed9 \u0111\u1ec1" : "Ghim b\u1ed9 \u0111\u1ec1 l\u00ean \u0111\u1ea7u") + '">📌</button>' : "") + "</div>" +
    '<div class="deck-sub"><span class="badge">' + esc(d.tag) + "</span><span>" + d.questions.length + " c\u00e2u h\u1ecfi</span>" +
    '<span>Ti\u1ebfn \u0111\u1ed9 ' + pct + '%</span><span class="mini-bar"><i style="width:' + pct + '%"></i></span></div>' +
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
  let pills = '<button type="button" class="pill ' + (state.filterTag === "all" ? "active" : "") + '" data-tag="all">T\u1ea5t c\u1ea3</button>';
  tags.forEach(function (t) {
    pills += '<button type="button" class="pill ' + (state.filterTag === t ? "active" : "") + '" data-tag="' + esc(t) + '">' + esc(t) + "</button>";
  });
  setHTML("tagPills", pills);
  toggleEl("tagPills", state.decks.length > 0);

  if (state.decks.length === 0) {
    setHTML("deckList", '<div class="empty-state"><div style="font-size:2.4rem">📚</div><p>B\u1ea1n ch\u01b0a c\u00f3 b\u1ed9 \u0111\u1ec1 n\u00e0o. Nh\u1eadp t\u1eeb Excel ho\u1eb7c chuy\u1ec3n \u0111\u1ec1 thi ngay b\u1eb1ng AI Converter!</p>' +
      '<div class="deck-actions" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="import">+ Nh\u1eadp \u0111\u1ec1 t\u1eeb Excel</button>' +
      '<button type="button" class="btn btn-outline" data-action="go-converter">✨ M\u1edf AI Converter</button></div></div>');
    setHTML("deckPager", "");
    return;
  }
  const q = state.deckQuery.trim().toLowerCase();
  let list = state.decks.filter(function (d) {
    return (state.filterTag === "all" || d.tag === state.filterTag) && (!q || d.title.toLowerCase().indexOf(q) !== -1);
  });
  list = sortedDecks(list);
  if (list.length === 0) {
    setHTML("deckList", '<div class="empty-state">Kh\u00f4ng t\u00ecm th\u1ea5y b\u1ed9 \u0111\u1ec1 ph\u00f9 h\u1ee3p.</div>');
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
  if (isAdmin()) info += " · To\u00e0n quy\u1ec1n kh\u00f4ng gi\u1edbi h\u1ea1n";
  else {
    const s = getActiveSub(state.user ? state.user.email : "");
    if (s && s.tier === "unranked") info += " · G\u00f3i mi\u1ec5n ph\u00ed 0\u0111/n\u0103m";
    else if (s) info += " · H\u1ebft h\u1ea1n: " + esc(fmtDate(s.expires));
    else info += " · Ch\u01b0a \u0111\u0103ng k\u00fd g\u00f3i (\u0110\u0103ng k\u00fd Unranked 0\u0111 mi\u1ec5n ph\u00ed)";
  }
  info += '</span><span class="deck-actions"><button type="button" class="btn btn-outline btn-sm" data-action="edit-profile">Ch\u1ec9nh s\u1eeda h\u1ed3 s\u01a1</button><button type="button" class="btn btn-primary btn-sm" data-action="go-pricing">G\u00f3i n\u00e2ng c\u1ea5p</button></span>';
  setHTML("tierInfo", info);

  const q = state.histQuery.trim().toLowerCase();
  const hist = loadArr(KEYS.history).filter(function (h) { return h && typeof h === "object"; }).slice().reverse()
    .filter(function (h) { return !q || String(h.deckTitle || "").toLowerCase().indexOf(q) !== -1; });
  if (hist.length === 0) {
    setHTML("histList", '<div class="empty-state">Ch\u01b0a c\u00f3 l\u1ecbch s\u1eed thi th\u1eed.</div>');
    setHTML("histPager", "");
    return;
  }
  const pg = paginate(hist, state.histPage);
  state.histPage = pg.page;
  setHTML("histList", pg.items.map(function (h) {
    return '<div class="hist-row"><span><strong>' + esc(h.deckTitle) + '</strong><br><span class="hist-date">' + esc(fmtDateTime(h.date)) + "</span></span>" +
      '<span class="hist-score">' + esc(h.score) + '/10</span><span class="hist-date">' + esc(h.correct) + "/" + esc(h.total) + " c\u00e2u</span></div>";
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
    setHTML("chartBox", '<div class="empty-state">Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u \u0111i\u1ec3m thi trong ' + (days === 7 ? "tu\u1ea7n" : "th\u00e1ng") + " n\u00e0y. H\u00e3y l\u00e0m m\u1ed9t b\u00e0i thi th\u1eed ho\u1eb7c Quiz Studio \u0111\u1ec3 xem bi\u1ec3u \u0111\u1ed3.</div>");
    return;
  }
  const W = 640, H = 250, pl = 36, pr = 12, pt = 24, pb = 40;
  const pw = W - pl - pr, ph = H - pt - pb;
  let svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Bi\u1ec3u \u0111\u1ed3 \u0111i\u1ec3m thi g\u1ea7n \u0111\u00e2y">';
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
    showConfirm("X\u00f3a b\u1ed9 \u0111\u1ec1", "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a b\u1ed9 \u0111\u1ec1 \"" + deck.title + "\"? H\u00e0nh \u0111\u1ed9ng n\u00e0y kh\u00f4ng th\u1ec3 ho\u00e0n t\u00e1c.", function () { deleteDeck(deck.id); });
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
  showToast("\u0110\u00e3 x\u00f3a b\u1ed9 \u0111\u1ec1.", "success");
}
function renderPicker(containerId, mode) {
  if (state.decks.length === 0) {
    setHTML(containerId, '<div class="empty-state"><div style="font-size:2.4rem">📚</div><p>B\u1ea1n ch\u01b0a c\u00f3 b\u1ed9 \u0111\u1ec1 n\u00e0o \u0111\u1ec3 h\u1ecdc.</p><button type="button" class="btn btn-primary" data-action="import">+ Nh\u1eadp \u0111\u1ec1 t\u1eeb Excel</button></div>');
    return;
  }
  setHTML(containerId, sortedDecks(state.decks).map(function (d) { return deckRowHTML(d, mode); }).join(""));
}

/* ------------------------------ Mistake Bank ------------------------------ */
function renderMistakeTab() {
  const mk = loadObj(KEYS.mistakes);
  const keys = Object.keys(mk);
  if (!can("mistake")) {
    setHTML("mistakeBody", '<div class="lock-card"><div class="lock-ico">🔒</div><h2>S\u1ed5 tay c\u00e2u hay sai (L\u00e0m l\u1ea1i c\u00e2u sai)</h2><p class="muted">T\u00ednh n\u0103ng n\u00e0y m\u1edf kh\u00f3a t\u1eeb G\u00f3i Bronze (100.000\u0111/n\u0103m) tr\u1edf l\u00ean.</p>' +
      '<button type="button" class="btn btn-primary" data-action="go-pricing">Xem g\u00f3i n\u00e2ng c\u1ea5p</button></div>');
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
    return '<div class="hist-row"><span><strong>' + esc(d ? d.title : "B\u1ed9 \u0111\u1ec1 \u0111\u00e3 b\u1ecb x\u00f3a") + '</strong></span><span class="badge badge-bad">' + byDeck[id] + " c\u00e2u</span><span></span></div>";
  }).join("");
  if (!rows) rows = '<div class="empty-state">S\u1ed5 tay \u0111ang tr\u1ed1ng. Nh\u1eefng c\u00e2u b\u1ea1n l\u00e0m sai s\u1ebd xu\u1ea5t hi\u1ec7n \u1edf \u0111\u00e2y.</div>';
  setHTML("mistakeBody", '<div class="mistake-hero"><div><h2>S\u1ed5 tay c\u00e2u hay sai (Mistake Bank)</h2>' +
    '<p class="muted">Tr\u1ea3 l\u1eddi \u0111\u00fang li\u00ean ti\u1ebfp 2 l\u1ea7n \u0111\u1ec3 lo\u1ea1i c\u00e2u kh\u1ecfi s\u1ed5 tay.</p></div>' +
    '<div><span class="mistake-count">' + keys.length + '</span> <span class="muted">c\u00e2u c\u1ea7n \u00f4n l\u1ea1i</span></div></div>' +
    '<div class="deck-actions" style="margin-bottom:14px">' +
    '<button type="button" class="btn btn-danger" data-action="mistake-start"' + (keys.length === 0 ? " disabled" : "") + ">Luy\u1ec7n t\u1eadp s\u1ed5 tay</button>" +
    '<button type="button" class="btn btn-outline" data-action="mistake-clear"' + (keys.length === 0 ? " disabled" : "") + ">X\u00f3a to\u00e0n b\u1ed9 s\u1ed5 tay</button></div>" +
    '<div class="list">' + rows + "</div>");
}
function onMistakeClick(e) {
  const b = e.target.closest ? e.target.closest("[data-action]") : null;
  if (!b || b.disabled) return;
  const a = b.getAttribute("data-action");
  if (a === "go-pricing") showTab("pricing");
  else if (a === "mistake-start") { if (requireFeature("mistake")) openConfig("mistake", null); }
  else if (a === "mistake-clear") {
    showConfirm("X\u00f3a s\u1ed5 tay", "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a to\u00e0n b\u1ed9 c\u00e2u trong S\u1ed5 tay c\u00e2u hay sai?", function () {
      saveJSON(KEYS.mistakes, {}); renderTab(); showToast("\u0110\u00e3 x\u00f3a to\u00e0n b\u1ed9 s\u1ed5 tay.", "success");
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
    summary = "1 phi\u00ean duy nh\u1ea5t (" + t + " c\u00e2u).";
  } else if (remainder === 0) {
    summary = "T\u1ef1 \u0111\u1ed9ng chia th\u00e0nh " + totalSessions + " phi\u00ean × " + sz + " c\u00e2u.";
  } else {
    summary = "T\u1ef1 \u0111\u1ed9ng chia th\u00e0nh " + totalSessions + " phi\u00ean: " + fullSessions + " phi\u00ean × " + sz + " c\u00e2u + 1 phi\u00ean cu\u1ed1i × " + remainder + " c\u00e2u.";
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
  if (total === 0) { showToast("Kh\u00f4ng c\u00f3 c\u00e2u h\u1ecfi n\u00e0o \u0111\u1ec3 b\u1eaft \u0111\u1ea7u.", "warning"); return; }
  state.pending = { mode: mode, deckId: deck ? deck.id : null, total: total };
  const titles = { practice: "Thi\u1ebft l\u1eadp ch\u1ebf \u0111\u1ed9 \u00d4n t\u1eadp", exam: "Thi\u1ebft l\u1eadp ch\u1ebf \u0111\u1ed9 Thi th\u1eed (Ki\u1ec3m tra)", flash: "Thi\u1ebft l\u1eadp ch\u1ebf \u0111\u1ed9 L\u1eadt th\u1ebb", mistake: "Luy\u1ec7n t\u1eadp S\u1ed5 tay c\u00e2u hay sai" };
  setText("configTitle", titles[mode] || "Thi\u1ebft l\u1eadp");
  setText("configSub", (deck ? deck.title + " – " : "") + total + " c\u00e2u h\u1ecfi");
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
    html += '<option value="' + c + '">Phi\u00ean ' + c + "/" + info.totalSessions + " (C\u00e2u " + s + "–" + e + " · " + cnt + " c\u00e2u)</option>";
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
    label: "Phi\u00ean " + chunk + "/" + info.totalSessions + " (" + (end - start) + " c\u00e2u)"
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
      if (base.length === 0) { showToast("S\u1ed5 tay hi\u1ec7n \u0111ang tr\u1ed1ng.", "warning"); return; }
      if (shuffleQ) base = shuffleArray(base);
      closeModal("configModal");
      beginSession({ mode: "mistake", deckId: "mistake_bank", title: "S\u1ed5 tay c\u00e2u hay sai",
        questions: base.map(function (b) { return prepareQuestion(b.q, b.deckId, shuffleO); }) });
      return;
    }
    const deck = getDeck(p.deckId);
    if (!deck) { showToast("Kh\u00f4ng t\u00ecm th\u1ea5y b\u1ed9 \u0111\u1ec1.", "error"); return; }
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
  } catch (e) { showToast("Kh\u00f4ng th\u1ec3 b\u1eaft \u0111\u1ea7u phi\u00ean l\u00e0m b\u00e0i. Vui l\u00f2ng th\u1eed l\u1ea1i.", "error"); }
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
  showToast("\u0110\u00e3 kh\u00f4i ph\u1ee5c ti\u1ebfn \u0111\u1ed9 l\u00e0m b\u00e0i tr\u01b0\u1edbc \u0111\u00f3.", "info");
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

  setText("statusMode", MODE_LABEL[s.mode] + (s.review ? " (Xem l\u1ea1i)" : ""));
  setText("statusDeck", s.title);
  const done = countDone(s);
  const pct = Math.round(done / total * 100);
  setText("statusProgressText", done + "/" + total);
  setText("statusPct", pct + "%");
  const fill = $("statusFill"); if (fill) fill.style.width = pct + "%";
  toggleEl("resetBtn", s.mode === "practice");
  toggleEl("finishBtn", !s.review);
  setText("finishBtn", s.mode === "exam" ? "N\u1ed9p b\u00e0i" : "Ho\u00e0n th\u00e0nh");

  const rb = $("examResult");
  if (rb) {
    if (s.review && s.result) {
      rb.innerHTML = '<div class="score">' + esc(s.result.score) + "/10</div><div>B\u1ea1n tr\u1ea3 l\u1eddi \u0111\u00fang <strong>" + s.result.correct + "/" + s.result.total + "</strong> c\u00e2u" +
        (s.result.unanswered > 0 ? " (" + s.result.unanswered + " c\u00e2u ch\u01b0a tr\u1ea3 l\u1eddi)" : "") + ". H\u00e3y xem l\u1ea1i chi ti\u1ebft t\u1eebng c\u00e2u b\u00ean d\u01b0\u1edbi.</div>";
      rb.classList.remove("hidden");
    } else { rb.classList.add("hidden"); rb.innerHTML = ""; }
  }

  setText("qBadge", "C\u00e2u h\u1ecfi: " + (i + 1));
  setText("qHint", q.type === "multiple" ? "(Ch\u1ecdn nhi\u1ec1u \u0111\u00e1p \u00e1n)" : "(Ch\u1ecdn m\u1ed9t \u0111\u00e1p \u00e1n)");
  const fb = $("flagBtn");
  if (fb) { fb.setAttribute("aria-pressed", s.flags[i] ? "true" : "false"); fb.title = s.flags[i] ? "B\u1ecf \u0111\u00e1nh d\u1ea5u (ph\u00edm F)" : "\u0110\u00e1nh d\u1ea5u c\u00e2u h\u1ecfi (ph\u00edm F)"; }
  setHTML("qText", renderRich(q.text));
  setHTML("qImage", q.image ? '<img src="' + esc(q.image) + '" alt="H\u00ecnh minh h\u1ecda c\u00e2u h\u1ecfi" onerror="this.style.display=\'none\'">' : "");

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
      fbx.textContent = (ok ? "Ch\u00ednh x\u00e1c! " : "Ch\u01b0a ch\u00ednh x\u00e1c. ") + (s.notes[i] || "");
    } else { fbx.className = "feedback hidden"; fbx.textContent = ""; }
  }
  const ex = $("explainBox");
  if (ex) {
    if (revealed && q.explanation) { ex.innerHTML = "<strong>Gi\u1ea3i th\u00edch:</strong> " + renderRich(q.explanation); ex.classList.remove("hidden"); }
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
      '" data-idx="' + k + '" aria-label="C\u00e2u ' + (k + 1) + (s.flags[k] ? " (\u0111\u00e3 c\u1eafm c\u1edd)" : "") + '">' + (k + 1) + "</button>";
  }
  if (shown === 0) html = '<span class="muted" style="grid-column:1/-1">Kh\u00f4ng c\u00f3 c\u00e2u n\u00e0o ph\u00f9 h\u1ee3p b\u1ed9 l\u1ecdc.</span>';
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
        if (m.streak >= 2) { delete ctx.mistakes[key]; s.notes[i] = "\u0110\u00e3 \u0111\u00fang 2 l\u1ea7n li\u00ean ti\u1ebfp – c\u00e2u n\u00e0y \u0111\u01b0\u1ee3c lo\u1ea1i kh\u1ecfi s\u1ed5 tay."; }
        else s.notes[i] = "Chu\u1ed7i \u0111\u00fang: " + m.streak + "/2.";
      }
    } else if (m) { m.streak = 0; s.notes[i] = "Chu\u1ed7i \u0111\u00fang \u0111\u00e3 \u0111\u01b0\u1ee3c \u0111\u1eb7t l\u1ea1i v\u1ec1 0."; }
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
  if (getAnswer(s, i).length === 0) { showToast("Vui l\u00f2ng ch\u1ecdn \u00edt nh\u1ea5t m\u1ed9t \u0111\u00e1p \u00e1n.", "warning"); return; }
  s.submitted[i] = true;
  const ctx = { stats: getStats(), mistakes: loadObj(KEYS.mistakes) };
  recordResult(s, i, ctx);
  saveJSON(KEYS.stats, ctx.stats);
  saveJSON(KEYS.mistakes, ctx.mistakes);
  saveProgress();
  renderStudy();
  updateChrome();
  if (Object.keys(s.submitted).length === s.questions.length) showToast("Ch\u00fac m\u1eebng! B\u1ea1n \u0111\u00e3 ho\u00e0n th\u00e0nh t\u1ea5t c\u1ea3 c\u00e2u h\u1ecfi.", "success");
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
    showToast("\u0110\u00e3 h\u1ebft gi\u1edd! B\u00e0i thi \u0111\u01b0\u1ee3c n\u1ed9p t\u1ef1 \u0111\u1ed9ng.", "warning");
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
    txt.textContent = s.result ? s.result.score : "—"; lab.textContent = "\u0110i\u1ec3m h\u1ec7 10"; frac = clamp(sc / 10, 0, 1);
  } else if (s.mode === "exam") {
    const rem = remainingSeconds(s);
    txt.textContent = fmtClock(rem); lab.textContent = "Th\u1eddi gian c\u00f2n l\u1ea1i"; frac = s.minutes > 0 ? clamp(rem / (s.minutes * 60), 0, 1) : 0; warn = rem <= 60;
  } else {
    txt.textContent = fmtClock(Math.max(0, Math.round((Date.now() - s.startedAt) / 1000)));
    lab.textContent = "Th\u1eddi gian phi\u00ean h\u1ecdc"; frac = s.questions.length ? clamp(countDone(s) / s.questions.length, 0, 1) : 0;
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
    showConfirm("N\u1ed9p b\u00e0i thi", un > 0 ? "B\u1ea1n c\u00f2n " + un + " c\u00e2u ch\u01b0a tr\u1ea3 l\u1eddi. B\u1ea1n c\u00f3 ch\u1eafc ch\u1eafn mu\u1ed1n n\u1ed9p b\u00e0i?" : "B\u1ea1n c\u00f3 ch\u1eafc ch\u1eafn mu\u1ed1n n\u1ed9p b\u00e0i?", finishExam);
  } else {
    const done = countDone(s);
    showConfirm("Ho\u00e0n th\u00e0nh phi\u00ean h\u1ecdc", "B\u1ea1n \u0111\u00e3 ho\u00e0n th\u00e0nh " + done + "/" + s.questions.length + " c\u00e2u. K\u1ebft th\u00fac phi\u00ean h\u1ecdc b\u00e2y gi\u1edd?", function () {
      showToast("\u0110\u00e3 k\u1ebft th\u00fac phi\u00ean h\u1ecdc: " + done + "/" + s.questions.length + " c\u00e2u.", "success");
      leaveStudy();
    });
  }
}
function leaveStudy() { stopTimer(); state.session = null; navigateTo("/practice", { replace: true }); }
function requestExit() {
  const s = state.session;
  if (!s) return;
  if (s.mode === "exam" && !s.review) showConfirm("Tho\u00e1t b\u00e0i thi", "N\u1ebfu tho\u00e1t b\u00e2y gi\u1edd, b\u00e0i thi \u0111ang l\u00e0m s\u1ebd b\u1ecb h\u1ee7y v\u00e0 kh\u00f4ng \u0111\u01b0\u1ee3c l\u01b0u \u0111i\u1ec3m. B\u1ea1n c\u00f3 ch\u1eafc ch\u1eafn?", leaveStudy);
  else leaveStudy();
}
function requestReset() {
  const s = state.session;
  if (!s || s.mode !== "practice") return;
  const deck = getDeck(s.deckId);
  showConfirm("L\u00e0m l\u1ea1i t\u1eeb \u0111\u1ea7u", "To\u00e0n b\u1ed9 ti\u1ebfn \u0111\u1ed9 \u00f4n t\u1eadp c\u1ee7a b\u1ed9 \u0111\u1ec1 n\u00e0y s\u1ebd b\u1ecb x\u00f3a. B\u1ea1n c\u00f3 ch\u1eafc ch\u1eafn mu\u1ed1n l\u00e0m l\u1ea1i t\u1eeb \u0111\u1ea7u?", function () {
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
  setHTML("flashFront", '<div class="f-text">' + renderRich(q.text) + "</div>" + (q.image ? '<img src="' + esc(q.image) + '" alt="H\u00ecnh minh h\u1ecda" onerror="this.style.display=\'none\'">' : ""));
  const answers = q.correct.map(function (c) { return "<li>" + LETTERS.charAt(c) + ". " + renderRich(q.options[c]) + "</li>"; }).join("");
  setHTML("flashBack", "<strong>\u0110\u00e1p \u00e1n \u0111\u00fang:</strong><ul>" + answers + "</ul>" + (q.explanation ? '<div class="f-expl"><strong>Gi\u1ea3i th\u00edch:</strong> ' + renderRich(q.explanation) + "</div>" : ""));
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
  if (!Array.isArray(rows) || rows.length === 0) { out.errors.push("File kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u c\u00e2u h\u1ecfi."); return out; }
  const keys = Object.keys(rows[0]).map(function (k) { return k.trim(); });
  const missing = XLSX_HEADERS.filter(function (h) { return keys.indexOf(h) === -1; });
  if (missing.length > 0) { out.errors.push("File thi\u1ebfu c\u00e1c c\u1ed9t b\u1eaft bu\u1ed9c: " + missing.join(", ")); return out; }
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
    if (!text) errs.push("D\u00f2ng " + line + ": Thi\u1ebfu n\u1ed9i dung c\u00e2u h\u1ecfi");
    const rawOpts = [];
    const origToCompact = {};
    for (let n = 1; n <= 5; n++) {
      const v = String(cell("Option " + n)).replace(/\u00A0/g, " ").trim();
      if (v) { origToCompact[n - 1] = rawOpts.length; rawOpts.push(v); }
    }
    if (rawOpts.length < 2) errs.push("D\u00f2ng " + line + ": C\u1ea7n \u00edt nh\u1ea5t 2 ph\u01b0\u01a1ng \u00e1n tr\u1ea3 l\u1eddi");
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
      errs.push("D\u00f2ng " + line + ": \u0110\u00e1p \u00e1n \u0111\u00fang kh\u00f4ng h\u1ee3p l\u1ec7 (\"" + rawAns + "\")");
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
  if (out.valid === 0 && out.errors.length === 0) out.errors.push("File kh\u00f4ng c\u00f3 d\u00f2ng c\u00e2u h\u1ecfi n\u00e0o.");
  return out;
}

function addOrMergeDeck(opts) {
  // opts: { mode: 'new'|'merge', title, tag, targetDeckId, questions }
  const qs = Array.isArray(opts.questions) ? opts.questions.map(normalizeQuestion).filter(Boolean) : [];
  if (qs.length === 0) { showToast("Ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi h\u1ee3p l\u1ec7 \u0111\u1ec3 nh\u1eadp.", "warning"); return null; }
  const limits = effectiveLimits();
  const decks = loadArr(KEYS.decks);
  const ts = Date.now();
  let savedDeck = null;

  if (opts.mode === "merge") {
    if (!requireFeature("merge")) return null;
    const target = decks.filter(function (d) { return d && String(d.id) === String(opts.targetDeckId); })[0];
    if (!target || !Array.isArray(target.questions)) { showToast("Vui l\u00f2ng ch\u1ecdn m\u1ed9t b\u1ed9 \u0111\u1ec1 c\u00e1 nh\u00e2n \u0111\u1ec3 g\u1ed9p.", "warning"); return null; }
    if (target.questions.length + qs.length > limits.maxQ) {
      promptUpgrade("G\u00f3i " + limits.name + " ch\u1ec9 cho ph\u00e9p t\u1ed1i \u0111a " + limits.maxQ + " c\u00e2u m\u1ed7i b\u1ed9 \u0111\u1ec1.");
      return null;
    }
    const offset = target.questions.length;
    qs.forEach(function (q, i) { target.questions.push(Object.assign({}, q, { id: "q_" + ts + "_" + (offset + i) })); });
    savedDeck = target;
  } else {
    const title = String(opts.title || "").trim();
    const tag = String(opts.tag || "").trim();
    if (!title) { showToast("Vui l\u00f2ng nh\u1eadp t\u00ean b\u1ed9 \u0111\u1ec1.", "warning"); return null; }
    if (getUserDecks().length >= limits.maxDecks) {
      promptUpgrade("G\u00f3i " + limits.name + " ch\u1ec9 cho ph\u00e9p t\u1ed1i \u0111a " + limits.maxDecks + " b\u1ed9 \u0111\u1ec1 c\u00e1 nh\u00e2n.");
      return null;
    }
    if (qs.length > limits.maxQ) {
      promptUpgrade("G\u00f3i " + limits.name + " ch\u1ec9 cho ph\u00e9p t\u1ed1i \u0111a " + limits.maxQ + " c\u00e2u m\u1ed7i b\u1ed9 \u0111\u1ec1.");
      return null;
    }
    savedDeck = {
      id: "user_" + ts,
      title: title,
      tag: tag || "Ch\u01b0a ph\u00e2n lo\u1ea1i",
      isBuiltIn: false,
      questions: qs.map(function (q, i) { return Object.assign({}, q, { id: "q_" + ts + "_" + i }); })
    };
    decks.push(savedDeck);
  }
  if (!saveJSON(KEYS.decks, decks)) return null;
  rebuildDecks();
  renderTab();
  showToast("\u0110\u00e3 nh\u1eadp " + qs.length + " c\u00e2u h\u1ecfi v\u00e0o Kho \u0111\u1ec1 th\u00e0nh c\u00f4ng!", "success");
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
      ? users.map(function (d) { return '<option value="' + esc(d.id) + '">' + esc(d.title) + " (" + d.questions.length + " c\u00e2u)</option>"; }).join("")
      : '<option value="">Ch\u01b0a c\u00f3 b\u1ed9 \u0111\u1ec1 c\u00e1 nh\u00e2n n\u00e0o</option>';
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
  let html = '<div class="ok-line">H\u1ee3p l\u1ec7: ' + r.valid + " c\u00e2u h\u1ecfi</div>";
  if (r.errors.length > 0) {
    html += '<div class="err-line">L\u1ed7i: ' + r.errors.length + " m\u1ee5c (c\u00e1c d\u00f2ng l\u1ed7i s\u1ebd b\u1ecb b\u1ecf qua)</div><ul>" +
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
  if (typeof XLSX === "undefined") { showToast("Th\u01b0 vi\u1ec7n \u0111\u1ecdc Excel ch\u01b0a t\u1ea3i xong. Vui l\u00f2ng th\u1eed l\u1ea1i.", "error"); return; }
  const reader = new FileReader();
  reader.onerror = function () { showToast("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file \u0111\u00e3 ch\u1ecdn.", "error"); };
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
      setHTML("importPreview", '<div class="err-line">Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file Excel. Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i \u0111\u1ecbnh d\u1ea1ng.</div>');
      toggleEl("importPreview", true);
    }
  };
  try { reader.readAsArrayBuffer(file); } catch (err) { showToast("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file \u0111\u00e3 ch\u1ecdn.", "error"); }
}
function confirmImport() {
  const r = state.importResult;
  if (!r || r.valid === 0) { showToast("Ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi h\u1ee3p l\u1ec7 \u0111\u1ec3 nh\u1eadp.", "warning"); return; }
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
  if (typeof XLSX === "undefined") { showToast("Th\u01b0 vi\u1ec7n Excel ch\u01b0a t\u1ea3i xong. Vui l\u00f2ng th\u1eed l\u1ea1i.", "error"); return; }
  try {
    const rows = [
      XLSX_HEADERS,
      ["T\u00ednh gi\u1edbi h\u1ea1n $L = \\lim_{x \\to 0} \\frac{\\sin 3x}{x}$:", "Multiple Choice", "1", "3", "$\\frac{1}{3}$", "0", "", "2", 30, "", "\u00c1p d\u1ee5ng $\\lim_{u \\to 0} \\frac{\\sin u}{u} = 1$, suy ra $L = 3$."],
      ["Choose the word whose underlined part differs in pronunciation:", "Multiple Choice", "biom<u>a</u>ss", "a<u>c</u>tivity", "effi<u>c</u>ient", "<u>a</u>lthough", "", "1", 30, "", "Ph\u1ea7n g\u1ea1ch ch\u00e2n \u1edf <b>biomass</b> ph\u00e1t \u00e2m kh\u00e1c c\u00e1c ph\u01b0\u01a1ng \u00e1n c\u00f2n l\u1ea1i."],
      ["Nh\u1eefng s\u1ed1 n\u00e0o l\u00e0 s\u1ed1 nguy\u00ean t\u1ed1?", "Checkbox", "2", "4", "5", "9", "", "1,3", 45, "", "2 v\u00e0 5 l\u00e0 s\u1ed1 nguy\u00ean t\u1ed1."]
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Questions");
    XLSX.writeFile(wb, "AI_Tutor.xlsx");
  } catch (e) { showToast("Kh\u00f4ng th\u1ec3 t\u1ea1o file m\u1eabu.", "error"); }
}
function exportJSON(deck) {
  try {
    downloadBlob(new Blob([JSON.stringify({ id: deck.id, title: deck.title, tag: deck.tag, questions: deck.questions }, null, 2)], { type: "application/json" }), fileSafe(deck.title) + ".json");
  } catch (e) { showToast("Kh\u00f4ng th\u1ec3 xu\u1ea5t file .json.", "error"); }
}
function exportXLSX(deck) {
  if (typeof XLSX === "undefined") { showToast("Th\u01b0 vi\u1ec7n Excel ch\u01b0a t\u1ea3i xong. Vui l\u00f2ng th\u1eed l\u1ea1i.", "error"); return; }
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
  } catch (e) { showToast("Kh\u00f4ng th\u1ec3 xu\u1ea5t file .xlsx.", "error"); }
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
  if (tierRank() >= 2) { showToast("B\u1ea1n \u0111ang s\u1edf h\u1eefu g\u00f3i cao h\u01a1n Unranked.", "info"); return; }
  const subs = loadObj(KEYS.subs);
  subs[email] = { tier: "unranked", since: Date.now(), expires: Date.now() + 365 * DAY_MS };
  const r = await apiCall("/api/subscriptions/unranked", "POST", { email: email });
  if (r && r._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + r._err, "error"); return; }
  saveJSON(KEYS.subs, subs);
  updateChrome();
  renderTab();
  showToast("\u0110\u00e3 k\u00edch ho\u1ea1t ngay g\u00f3i Unranked (0\u0111/n\u0103m) th\u00e0nh c\u00f4ng!", "success");
}

async function adminSwitchOwnTier(code) {
  if (!assertAdmin() || !state.user || !TIERS[code] || code === "none") return;
  const email = state.user.email.toLowerCase();
  const r = await apiCall("/api/admin/subscriptions", "POST", { email: email, tier: code });
  if (r && r._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + r._err, "error"); return; }
  adminActivatePaidTier(email, code);
  updateChrome();
  renderTab();
  showToast("\u0110\u00e3 k\u00edch ho\u1ea1t tr\u1ef1c ti\u1ebfp g\u00f3i " + TIERS[code].name + " cho t\u00e0i kho\u1ea3n Admin (kh\u00f4ng qua h\u00e0ng ch\u1edd duy\u1ec7t).", "success");
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
    ? "👑 Admin (Diamond): B\u1ea1n c\u00f3 m\u1eb7c \u0111\u1ecbnh to\u00e0n quy\u1ec1n Diamond VIP kh\u00f4ng gi\u1edbi h\u1ea1n. B\u1ea1n c\u00f3 th\u1ec3 b\u1ea5m \"K\u00edch ho\u1ea1t ngay (Admin)\" tr\u00ean b\u1ea5t k\u1ef3 g\u00f3i n\u00e0o \u0111\u1ec3 chuy\u1ec3n \u0111\u1ed5i th\u1eed nghi\u1ec7m tr\u1ef1c ti\u1ebfp."
    : (cur === "none"
      ? "\u0110\u0103ng k\u00fd g\u00f3i Unranked (0\u0111/n\u0103m) \u0111\u1ec3 k\u00edch ho\u1ea1t ngay l\u1eadp t\u1ee9c, ho\u1eb7c ch\u1ecdn 1 trong 4 h\u1ea1ng g\u00f3i tr\u1ea3 ph\u00ed (ch\u1edd Admin x\u00e1c nh\u1eadn)."
      : "G\u00f3i hi\u1ec7n t\u1ea1i c\u1ee7a b\u1ea1n: " + TIERS[cur].icon + " " + TIERS[cur].full + (sub && cur !== "unranked" ? " • H\u1ebft h\u1ea1n: " + fmtDate(sub.expires) : " • Mi\u1ec5n ph\u00ed 0\u0111/n\u0103m")));

  // Pending box on Pricing
  const pBox = $("pricingPendingBox");
  if (pBox) {
    if (pendings.length > 0 && !adm) {
      pBox.innerHTML = pendings.map(function (r) {
        return "<div>⏳ <strong>\u0110ang ch\u1edd duy\u1ec7t g\u00f3i " + esc(TIERS[r.plan] ? TIERS[r.plan].name : r.plan) + "</strong> (" + esc(fmtMoney(r.amount)) + ") • G\u1eedi l\u00fac " + esc(fmtDateTime(r.createdAt)) + "</div>";
      }).join("");
      pBox.classList.remove("hidden");
    } else { pBox.classList.add("hidden"); pBox.innerHTML = ""; }
  }

  // Unranked Banner (Tier 1)
  const unBtn = adm
    ? (cur === "unranked" ? '<span class="badge badge-ok">✓ \u0110ang b\u1eadt (Admin)</span>' : '<button type="button" class="btn btn-outline btn-sm" data-admin-switch="unranked">⚡ K\u00edch ho\u1ea1t ngay (Admin)</button>')
    : (cur === "unranked"
      ? '<span class="badge badge-ok">✓ G\u00f3i hi\u1ec7n t\u1ea1i</span>'
      : (curRank > 1
        ? '<button type="button" class="btn btn-outline" disabled>B\u1ea1n \u0111\u00e3 c\u00f3 g\u00f3i cao h\u01a1n</button>'
        : '<button type="button" class="btn btn-emerald" data-activate-free="unranked">\u0110\u0103ng k\u00fd mi\u1ec5n ph\u00ed (0\u0111)</button>'));
  setHTML("unrankedBanner",
    '<div class="unranked-banner' + (cur === "unranked" ? " current" : "") + '">' +
      '<div style="flex:1;min-width:260px">' +
        '<div class="rank-head"><span class="rank-crest crest-unranked">🛡️</span><div>' +
          '<div class="price-name">Unranked <span class="muted" style="font-weight:500;font-size:.86rem">(Ch\u01b0a x\u1ebfp h\u1ea1ng)</span> • <strong style="color:var(--emerald)">0\u0111 / n\u0103m</strong></div>' +
          '<div class="price-sub">\u0110\u0103ng k\u00fd &amp; k\u00edch ho\u1ea1t ngay l\u1eadp t\u1ee9c – kh\u00f4ng c\u1ea7n thanh to\u00e1n, kh\u00f4ng c\u1ea7n ch\u1edd Admin duy\u1ec7t</div>' +
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
        ? '<button type="button" class="btn btn-emerald" disabled>👑 \u0110ang k\u00edch ho\u1ea1t (Admin)</button>'
        : '<button type="button" class="btn btn-primary" data-admin-switch="' + code + '">⚡ K\u00edch ho\u1ea1t ngay (Admin)</button>';
    }
    else if (isPend) btn = '<button type="button" class="btn btn-amber" disabled>⏳ \u0110ang ch\u1edd Admin duy\u1ec7t</button>';
    else if (cur === code) btn = '<button type="button" class="btn btn-outline" data-buy="' + code + '">✓ G\u00f3i hi\u1ec7n t\u1ea1i (Gia h\u1ea1n)</button>';
    else if (r < curRank) btn = '<button type="button" class="btn btn-outline" disabled>B\u1ea1n \u0111\u00e3 c\u00f3 g\u00f3i cao h\u01a1n</button>';
    else btn = '<button type="button" class="btn btn-primary" data-buy="' + code + '">Ch\u1ecdn g\u00f3i ' + esc(t.name) + "</button>";

    html += '<article class="price-card ' + t.cls + (cur === code ? " current" : "") + '">' +
      (code === "gold" ? '<span class="price-ribbon gold">Ph\u1ed5 bi\u1ebfn</span>' : "") +
      (code === "diamond" ? '<span class="price-ribbon diamond">Diamond VIP</span>' : "") +
      '<div class="rank-head"><span class="rank-crest crest-' + code + '">' + t.icon + '</span><div>' +
        '<div class="price-name">' + esc(t.name) + '</div><div class="price-sub">' + esc(t.sub) + "</div>" +
      "</div></div>" +
      '<div class="price-amount">' + t.price.toLocaleString("vi-VN") + "\u0111 <small>/ n\u0103m</small></div>" +
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
    setHTML("userPayHistoryBody", '<p class="muted" style="margin:0">B\u1ea1n ch\u01b0a g\u1eedi y\u00eau c\u1ea7u thanh to\u00e1n n\u00e0o.</p>');
    return;
  }
  const stBadge = function (st) {
    if (st === "approved") return '<span class="badge badge-ok">✅ \u0110\u00e3 duy\u1ec7t</span>';
    if (st === "rejected") return '<span class="badge badge-bad">❌ B\u1ecb t\u1eeb ch\u1ed1i</span>';
    return '<span class="badge badge-warn">⏳ Ch\u1edd duy\u1ec7t</span>';
  };
  setHTML("userPayHistoryBody", '<table class="data-table"><thead><tr><th>Th\u1eddi gian g\u1eedi</th><th>G\u00f3i</th><th>S\u1ed1 ti\u1ec1n</th><th>Ghi ch\u00fa / M\u00e3 GD</th><th>Tr\u1ea1ng th\u00e1i</th><th>Ph\u1ea3n h\u1ed3i t\u1eeb Admin</th></tr></thead><tbody>' +
    list.map(function (r) {
      let note = "—";
      if (r.status === "approved") note = "\u0110\u00e3 duy\u1ec7t l\u00fac " + fmtDateTime(r.reviewedAt);
      else if (r.status === "rejected") note = '<span style="color:var(--rose);font-weight:600">' + esc(r.rejectReason || "Y\u00eau c\u1ea7u b\u1ecb t\u1eeb ch\u1ed1i") + '</span> <button type="button" class="btn btn-outline btn-sm" data-buy="' + esc(r.plan) + '">G\u1eedi l\u1ea1i</button>';
      else note = "\u0110ang ch\u1edd Qu\u1ea3n tr\u1ecb vi\u00ean x\u00e1c nh\u1eadn";
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
    showToast("B\u1ea1n \u0111\u00e3 c\u00f3 y\u00eau c\u1ea7u \u0111ang ch\u1edd duy\u1ec7t cho g\u00f3i " + TIERS[code].name + ". Vui l\u00f2ng ch\u1edd Qu\u1ea3n tr\u1ecb vi\u00ean x\u00e1c nh\u1eadn.", "warning");
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
  setText("checkoutTitle", "Thanh to\u00e1n – " + t.full);
  setText("coTier", t.icon + " " + t.name + " (365 ng\u00e0y sau khi duy\u1ec7t)");
  setText("coBase", fmtMoney(t.price));
  setText("coDiscount", pct > 0 ? "-" + pct + "% (" + c.voucher.code + ")" : "Kh\u00f4ng c\u00f3");
  setText("coFinal", fmtMoney(amount));
  setText("coBank", (cfg.bankName || "Ch\u01b0a c\u1ea5u h\u00ecnh") + (cfg.bankId ? " (" + cfg.bankId + ")" : ""));
  setText("coAcc", cfg.accountNo || "Ch\u01b0a c\u1ea5u h\u00ecnh");
  setText("coHolder", cfg.accountName || "Ch\u01b0a c\u1ea5u h\u00ecnh");
  setText("coMemo", memo);
  const img = $("qrImg"), fb = $("qrFallback"), pay = $("payBtn");
  const configured = !!(cfg.bankId && cfg.accountNo);
  if (img) img.classList.add("hidden");
  if (fb) fb.classList.remove("hidden");
  if (amount === 0) {
    if (fb) fb.textContent = "M\u00e3 gi\u1ea3m gi\u00e1 100% – b\u1ea1n kh\u00f4ng c\u1ea7n chuy\u1ec3n kho\u1ea3n. B\u1ea5m \"T\u00f4i \u0111\u00e3 thanh to\u00e1n\" \u0111\u1ec3 g\u1eedi Qu\u1ea3n tr\u1ecb vi\u00ean x\u00e1c nh\u1eadn.";
  } else if (!configured) {
    if (fb) fb.textContent = "Qu\u1ea3n tr\u1ecb vi\u00ean ch\u01b0a c\u1ea5u h\u00ecnh t\u00e0i kho\u1ea3n VietQR.";
  } else if (img) {
    const url = "https://img.vietqr.io/image/" + encodeURIComponent(cfg.bankId) + "-" + encodeURIComponent(cfg.accountNo) + "-compact2.png?amount=" + amount +
      "&addInfo=" + encodeURIComponent(memo) + (cfg.accountName ? "&accountName=" + encodeURIComponent(cfg.accountName) : "");
    img.onload = function () { img.classList.remove("hidden"); if (fb) fb.classList.add("hidden"); };
    img.onerror = function () { img.classList.add("hidden"); if (fb) { fb.classList.remove("hidden"); fb.textContent = "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c m\u00e3 QR. Vui l\u00f2ng chuy\u1ec3n kho\u1ea3n th\u1ee7 c\u00f4ng theo th\u00f4ng tin b\u00ean c\u1ea1nh."; } };
    if (fb) fb.textContent = "\u0110ang t\u1ea3i m\u00e3 QR...";
    img.src = url;
  }
  if (pay) {
    pay.disabled = c.busy || (amount > 0 && !configured);
    pay.innerHTML = c.busy ? '<span class="spinner"></span>\u0110ang g\u1eedi y\u00eau c\u1ea7u...' : "T\u00f4i \u0111\u00e3 thanh to\u00e1n";
  }
}
function onReceiptFile(e) {
  const f = e.target && e.target.files ? e.target.files[0] : null;
  if (!f || !state.checkout) return;
  if (!/^image\//.test(f.type)) { showToast("Vui l\u00f2ng ch\u1ecdn file \u1ea3nh bi\u00ean lai.", "warning"); return; }
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
      } catch (err) { showToast("Kh\u00f4ng th\u1ec3 x\u1eed l\u00fd \u1ea3nh bi\u00ean lai.", "error"); }
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
  if (!code) { if (vm) { vm.textContent = "Vui l\u00f2ng nh\u1eadp m\u00e3 gi\u1ea3m gi\u00e1."; vm.className = "voucher-msg bad"; } return; }
  let v = getVouchers().filter(function (x) { return x.code.toUpperCase() === code; })[0];
  if (!v) {
    await syncWithBackend();
    v = getVouchers().filter(function (x) { return x.code.toUpperCase() === code; })[0];
  }
  if (!v) { c.voucher = null; if (vm) { vm.textContent = "M\u00e3 gi\u1ea3m gi\u00e1 kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c \u0111\u00e3 b\u1ecb x\u00f3a."; vm.className = "voucher-msg bad"; } renderCheckout(); return; }
  c.voucher = { code: v.code.toUpperCase(), discountPercent: clamp(Number(v.discountPercent), 1, 100) };
  if (vm) { vm.textContent = "\u00c1p d\u1ee5ng th\u00e0nh c\u00f4ng: gi\u1ea3m " + c.voucher.discountPercent + "%."; vm.className = "voucher-msg ok"; }
  renderCheckout();
}

/* STRICT MANUAL APPROVAL: NEVER UPGRADES TIER IMMEDIATELY */
async function submitPaymentRequest() {
  const c = state.checkout;
  if (!c || c.busy || !state.user) return;
  const email = state.user.email.toLowerCase();
  if (getUserPendingReqs(email).some(function (r) { return r.plan === c.tier; })) {
    showToast("B\u1ea1n \u0111\u00e3 c\u00f3 m\u1ed9t \u0111\u01a1n \u0111ang ch\u1edd duy\u1ec7t cho g\u00f3i " + TIERS[c.tier].name + ".", "warning");
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
    if (res && res._err) { showToast("Kh\u00f4ng th\u1ec3 g\u1eedi y\u00eau c\u1ea7u: " + res._err, "error"); c.busy = false; renderCheckout(); return; }
    const list = loadArr(KEYS.payReqs);
    list.push(reqObj);
    if (!saveJSON(KEYS.payReqs, list)) { c.busy = false; renderCheckout(); return; }
    const planName = TIERS[c.tier].name;
    state.checkout = null;
    closeModal("checkoutModal");
    renderTab();
    showToast("Y\u00eau c\u1ea7u thanh to\u00e1n g\u00f3i " + planName + " \u0111\u00e3 \u0111\u01b0\u1ee3c ghi nh\u1eadn v\u00e0 \u0111ang ch\u1edd Qu\u1ea3n tr\u1ecb vi\u00ean x\u00e1c nh\u1eadn. G\u00f3i s\u1ebd t\u1ef1 \u0111\u1ed9ng k\u00edch ho\u1ea1t ngay sau khi \u0111\u01b0\u1ee3c duy\u1ec7t.", "info");
  } catch (e) {
    c.busy = false;
    renderCheckout();
    showToast("\u0110\u00e3 x\u1ea3y ra l\u1ed7i khi g\u1eedi y\u00eau c\u1ea7u thanh to\u00e1n.", "error");
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

function getAllRegisteredUsers() {
  const usersObj = loadObj(KEYS.users);
  const subs = loadObj(KEYS.subs);
  const apis = loadObj(KEYS.userApis);
  const profiles = loadObj(KEYS.profiles);
  const reqs = loadArr(KEYS.payReqs);
  const map = {};

  const upsert = function (rawEmail, info) {
    const em = String(rawEmail || "").trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return;
    if (!map[em]) {
      map[em] = {
        email: em,
        name: em.split("@")[0],
        picture: "",
        createdAt: "",
        lastLoginAt: ""
      };
    }
    const cur = map[em];
    if (info.name && String(info.name).trim() && (cur.name === em.split("@")[0] || cur.name === em || info.preferName)) {
      cur.name = String(info.name).trim();
    }
    if (info.picture && String(info.picture).trim() && (!cur.picture || info.preferPic)) {
      cur.picture = String(info.picture).trim();
    }
    if (info.createdAt) {
      if (!cur.createdAt || String(info.createdAt) < String(cur.createdAt)) cur.createdAt = String(info.createdAt);
    }
    if (info.lastLoginAt) {
      if (!cur.lastLoginAt || String(info.lastLoginAt) > String(cur.lastLoginAt)) cur.lastLoginAt = String(info.lastLoginAt);
    }
  };

  Object.keys(usersObj).forEach(function (em) {
    const u = usersObj[em];
    if (u && typeof u === "object") {
      upsert(em, {
        name: u.name,
        picture: u.picture,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt || u.createdAt,
        preferName: true
      });
    }
  });
  Object.keys(profiles).forEach(function (em) {
    const p = profiles[em];
    if (p && typeof p === "object") {
      upsert(em, { name: p.displayName, picture: p.customAvatar, preferName: !!p.displayName, preferPic: !!p.customAvatar });
    }
  });
  Object.keys(subs).forEach(function (em) {
    const s = subs[em];
    const sinceIso = s && s.since ? new Date(Number(s.since)).toISOString() : "";
    upsert(em, { createdAt: sinceIso, lastLoginAt: sinceIso });
  });
  reqs.forEach(function (r) {
    if (r && r.userEmail) {
      upsert(r.userEmail, { name: r.userName, createdAt: r.createdAt, lastLoginAt: r.createdAt });
    }
  });
  Object.keys(apis).forEach(function (em) {
    const a = apis[em];
    upsert(em, { createdAt: a && a.updatedAt, lastLoginAt: a && a.updatedAt });
  });
  if (state.user && state.user.email) {
    upsert(state.user.email, {
      name: state.user.name,
      picture: state.user.picture,
      lastLoginAt: new Date().toISOString()
    });
  }

  return Object.keys(map).map(function (em) {
    const u = map[em];
    const sub = getActiveSub(em);
    const tier = isAdminUser(em) ? (sub ? sub.tier : "diamond") : (sub ? sub.tier : "none");
    const apiEntry = apis[em] && (apis[em].maskedKey || apis[em].apiKey) ? apis[em] : null;
    return {
      email: em,
      name: u.name || em.split("@")[0],
      picture: u.picture || "",
      createdAt: u.createdAt || u.lastLoginAt || "",
      lastLoginAt: u.lastLoginAt || u.createdAt || "",
      tier: tier,
      sub: sub,
      isAdminAccount: isAdminUser(em),
      hasAssignedApi: !!apiEntry,
      assignedApi: apiEntry
    };
  });
}

const sysKeysState = {
  loaded: false,
  loading: false,
  busy: false,
  error: "",
  encryptionConfigured: false,
  driver: null,
  keys: [],
  envKeys: [],
  auditLogs: [],
  preview: null,
  rawDraft: ""
};

async function adminSystemKeysFetch(subPath, method, body) {
  const token = (state.user && state.user.credential) ? String(state.user.credential).trim() : "";
  if (!token) {
    return { _err: "Thi\u1ebfu ph\u00ean \u0111\u0103ng nh\u1eadp Google (ID Token). Vui l\u00f2ng \u0111\u0103ng xu\u1ea5t v\u00e0 \u0111\u0103ng nh\u1eadp l\u1ea1i.", _status: 401 };
  }
  try {
    const res = await fetch("/api/admin/system-keys" + (subPath || ""), {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const ct = String((res.headers && res.headers.get && res.headers.get("content-type")) || "").toLowerCase();
    if (ct.indexOf("application/json") === -1) {
      return { _err: "M\u00e1y ch\u1ee7 API kh\u00f4ng kh\u1ea3 d\u1ee5ng (HTTP " + res.status + "). H\u00e3y ch\u1ea1y qua Vercel / npm start.", _status: res.status };
    }
    const data = await res.json().catch(function () { return null; });
    if (!res.ok) {
      const msg = (data && data.error && (data.error.message || data.error)) || ("HTTP " + res.status);
      return { _err: msg, _status: res.status, data: data };
    }
    return { ok: true, data: data };
  } catch (e) {
    return { _err: (e && e.message) || "L\u1ed7i k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7.", _status: 0 };
  }
}

async function loadAdminSysKeys(force) {
  if (sysKeysState.loading && !force) return;
  sysKeysState.loading = true;
  sysKeysState.error = "";
  const resp = await adminSystemKeysFetch("", "GET");
  sysKeysState.loading = false;
  sysKeysState.loaded = true;
  if (resp && resp._err) {
    sysKeysState.error = resp._err;
  } else if (resp && resp.data) {
    sysKeysState.encryptionConfigured = !!resp.data.encryptionConfigured;
    sysKeysState.driver = resp.data.driver || null;
    sysKeysState.keys = Array.isArray(resp.data.keys) ? resp.data.keys : [];
    sysKeysState.envKeys = Array.isArray(resp.data.envKeys) ? resp.data.envKeys : [];
    sysKeysState.auditLogs = Array.isArray(resp.data.auditLogs) ? resp.data.auditLogs : [];
  }
  if (state.tab === "admin" && state.adminTab === "syskeys") renderAdmin();
}

function renderAdmin() {
  if (!isAdmin()) { setHTML("adminBody", ""); return; }
  const reqs = loadArr(KEYS.payReqs);
  const pendingCnt = reqs.filter(function (r) { return r && r.status === "pending"; }).length;
  const approvedList = reqs.filter(function (r) { return r && r.status === "approved"; });
  const revenue = approvedList.reduce(function (acc, r) { return acc + (Number(r.amount) || 0); }, 0);
  const allUsers = getAllRegisteredUsers();

  const tabs = [
    ["requests", "Duy\u1ec7t thanh to\u00e1n (" + pendingCnt + ")"],
    ["members", "Th\u00e0nh vi\u00ean & C\u1ea5p g\u00f3i"],
    ["syskeys", "🔑 API Key H\u1ec7 th\u1ed1ng"],
    ["cfg", "C\u1ea5u h\u00ecnh VietQR"],
    ["voucher", "M\u00e3 gi\u1ea3m gi\u00e1"],
    ["backup", "Sao l\u01b0u h\u1ec7 th\u1ed1ng"]
  ];
  let h = '<h2>B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Qu\u1ea3n tr\u1ecb (Admin Panel)</h2>' +
    '<div class="admin-grid">' +
      '<div class="kpi-card"><span class="kpi-label">T\u1ed5ng ng\u01b0\u1eddi d\u00f9ng \u0111\u0103ng k\u00fd</span><span class="kpi-value" style="color:var(--primary)">' + allUsers.length + '</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">\u0110\u01a1n \u0111ang ch\u1edd duy\u1ec7t</span><span class="kpi-value" style="color:var(--amber)">' + pendingCnt + '</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">\u0110\u01a1n \u0111\u00e3 duy\u1ec7t</span><span class="kpi-value" style="color:var(--emerald)">' + approvedList.length + '</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">T\u1ed5ng doanh thu \u0111\u00e3 duy\u1ec7t</span><span class="kpi-value">' + esc(fmtMoney(revenue)) + '</span></div>' +
    '</div>' +
    '<div class="admin-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button type="button" class="admin-tab' + (state.adminTab === t[0] ? " active" : "") + '" data-act="subtab" data-sub="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>";

  if (state.adminTab === "requests") h += adminRequestsHTML();
  else if (state.adminTab === "members") h += adminMembersHTML();
  else if (state.adminTab === "syskeys") {
    if (!sysKeysState.loaded && !sysKeysState.loading) {
      setTimeout(function () { loadAdminSysKeys(false); }, 0);
    }
    h += adminSysKeysHTML();
  }
  else if (state.adminTab === "cfg") h += adminCfgHTML();
  else if (state.adminTab === "voucher") h += adminVoucherHTML();
  else h += adminBackupHTML();

  setHTML("adminBody", h);
  if (state.adminTab === "requests") renderAdminRequestsTable();
  else if (state.adminTab === "members") renderAdminMembersTable();
  applyI18n($("adminBody"));
}

function adminRequestsHTML() {
  return '<div class="filter-bar">' +
    '<select id="admStatusFilter" aria-label="L\u1ecdc tr\u1ea1ng th\u00e1i">' +
      '<option value="all"' + (state.adminStatusFilter === "all" ? " selected" : "") + '>T\u1ea5t c\u1ea3 tr\u1ea1ng th\u00e1i</option>' +
      '<option value="pending"' + (state.adminStatusFilter === "pending" ? " selected" : "") + '>⏳ Ch\u1edd duy\u1ec7t</option>' +
      '<option value="approved"' + (state.adminStatusFilter === "approved" ? " selected" : "") + '>✅ \u0110\u00e3 duy\u1ec7t</option>' +
      '<option value="rejected"' + (state.adminStatusFilter === "rejected" ? " selected" : "") + '>❌ T\u1eeb ch\u1ed1i</option>' +
    '</select>' +
    '<select id="admPlanFilter" aria-label="L\u1ecdc theo g\u00f3i">' +
      '<option value="all"' + (state.adminPlanFilter === "all" ? " selected" : "") + '>T\u1ea5t c\u1ea3 g\u00f3i</option>' +
      ["bronze", "silver", "gold", "diamond"].map(function (c) {
        return '<option value="' + c + '"' + (state.adminPlanFilter === c ? " selected" : "") + '>' + esc(TIERS[c].name) + '</option>';
      }).join("") +
    '</select>' +
    '<input type="search" id="admQuery" placeholder="T\u00ecm theo email, t\u00ean, m\u00e3 \u0111\u01a1n..." value="' + esc(state.adminQuery) + '" style="flex:1;min-width:200px">' +
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
  if (list.length === 0) { wrap.innerHTML = '<div class="empty-state">Kh\u00f4ng c\u00f3 y\u00eau c\u1ea7u thanh to\u00e1n n\u00e0o ph\u00f9 h\u1ee3p.</div>'; return; }
  wrap.innerHTML = '<table class="data-table"><thead><tr><th>Th\u1eddi gian g\u1eedi</th><th>Ng\u01b0\u1eddi d\u00f9ng</th><th>G\u00f3i</th><th>S\u1ed1 ti\u1ec1n</th><th>Ghi ch\u00fa / M\u00e3 GD</th><th>Bi\u00ean lai</th><th>Tr\u1ea1ng th\u00e1i</th><th>H\u00e0nh \u0111\u1ed9ng</th></tr></thead><tbody>' +
    list.map(function (r) {
      const st = r.status === "approved" ? '<span class="badge badge-ok">✅ \u0110\u00e3 duy\u1ec7t</span>'
        : (r.status === "rejected" ? '<span class="badge badge-bad">❌ T\u1eeb ch\u1ed1i</span>' : '<span class="badge badge-warn">⏳ Ch\u1edd duy\u1ec7t</span>');
      const receiptBtn = r.receiptImage ? '<button type="button" class="btn btn-outline btn-sm" data-act="view-receipt" data-id="' + esc(r.id) + '">Xem \u1ea3nh</button>' : '<span class="muted">—</span>';
      let actHtml = "";
      if (r.status === "pending") {
        actHtml = '<div class="deck-actions">' +
          '<button type="button" class="btn btn-emerald btn-sm" data-act="approve-req" data-id="' + esc(r.id) + '">✅ Duy\u1ec7t</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-act="reject-req" data-id="' + esc(r.id) + '">❌ T\u1eeb ch\u1ed1i</button></div>';
      } else if (r.status === "rejected" && r.rejectReason) {
        actHtml = '<span class="muted" style="font-size:.76rem">L\u00fd do: ' + esc(r.rejectReason) + "</span>";
      } else if (r.reviewedAt) {
        actHtml = '<span class="muted" style="font-size:.76rem">Duy\u1ec7t: ' + esc(fmtDateTime(r.reviewedAt)) + "</span>";
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

function renderAdminMembersTable() {
  const wrap = $("admAllUsersTableWrap");
  if (!wrap) return;
  const q = String(state.adminMemberQuery || "").trim().toLowerCase();
  const sortMode = state.adminMemberSort || "newest";
  const allUsers = getAllRegisteredUsers().filter(function (u) {
    if (!q) return true;
    return [u.email, u.name, u.tier].join(" ").toLowerCase().indexOf(q) !== -1;
  });

  allUsers.sort(function (a, b) {
    if (sortMode === "login") {
      return String(b.lastLoginAt || "").localeCompare(String(a.lastLoginAt || ""));
    }
    if (sortMode === "tier") {
      const rDiff = (TIER_ORDER.indexOf(b.tier) || 0) - (TIER_ORDER.indexOf(a.tier) || 0);
      if (rDiff !== 0) return rDiff;
      return String(a.email).localeCompare(String(b.email));
    }
    if (sortMode === "email") {
      return String(a.email).localeCompare(String(b.email));
    }
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });

  if (allUsers.length === 0) {
    wrap.innerHTML = '<div class="empty-state">Ch\u01b0a c\u00f3 ng\u01b0\u1eddi d\u00f9ng n\u00e0o ph\u00f9 h\u1ee3p v\u1edbi b\u1ed9 l\u1ecdc.</div>';
    if (typeof applyI18n === "function") applyI18n(wrap);
    return;
  }

  wrap.innerHTML = '<table class="data-table"><thead><tr>' +
    '<th>Ng\u01b0\u1eddi d\u00f9ng</th>' +
    '<th>G\u00f3i hi\u1ec7n t\u1ea1i</th>' +
    '<th>Ng\u00e0y \u0111\u0103ng k\u00fd</th>' +
    '<th>\u0110\u0103ng nh\u1eadp g\u1ea7n nh\u1ea5t</th>' +
    '<th>H\u00e0nh \u0111\u1ed9ng</th>' +
  '</tr></thead><tbody>' +
  allUsers.map(function (u) {
    const avSrc = u.picture || placeholderAvatar(u.name || u.email);
    const tierInfo = TIERS[u.tier] || TIERS.none;
    const planLabel = u.isAdminAccount
      ? '<span class="tier-badge rank-diamond">👑 Admin (Diamond)</span>'
      : '<span class="tier-badge ' + tierInfo.cls + '">' + tierInfo.icon + " " + esc(tierInfo.name) + '</span>';
    const expSub = u.isAdminAccount
      ? '<div class="muted" style="font-size:.75rem;margin-top:3px">To\u00e0n quy\u1ec1n kh\u00f4ng gi\u1edbi h\u1ea1n</div>'
      : (u.sub && u.tier !== "unranked" && u.tier !== "none"
          ? '<div class="muted" style="font-size:.75rem;margin-top:3px">H\u1ebft h\u1ea1n: ' + esc(fmtDate(u.sub.expires)) + '</div>'
          : (u.tier === "unranked" ? '<div class="muted" style="font-size:.75rem;margin-top:3px">Mi\u1ec5n ph\u00ed</div>' : '<div class="muted" style="font-size:.75rem;margin-top:3px">Ch\u01b0a \u0111\u0103ng k\u00fd g\u00f3i</div>'));
    const apiBadge = u.hasAssignedApi
      ? ' <span class="badge badge-ok" title="\u0110\u00e3 g\u00e1n Gemini API">🔑 \u0110\u00e3 g\u00e1n API</span>'
      : "";
    return '<tr>' +
      '<td><div style="display:flex;align-items:center;gap:10px">' +
        '<img src="' + esc(avSrc) + '" alt="" class="avatar" style="width:34px;height:34px;flex-shrink:0" referrerpolicy="no-referrer">' +
        '<div><strong>' + esc(u.name) + '</strong>' + apiBadge + '<br><span class="muted" style="font-size:.8rem">' + esc(u.email) + '</span></div>' +
      '</div></td>' +
      '<td>' + planLabel + expSub + '</td>' +
      '<td>' + esc(u.createdAt ? fmtDateTime(u.createdAt) : "—") + '</td>' +
      '<td>' + esc(u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "—") + '</td>' +
      '<td><div class="deck-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="prefill-grant" data-email="' + esc(u.email) + '" data-tier="' + esc(u.tier !== "none" ? u.tier : "diamond") + '">C\u1ea5p / n\u00e2ng c\u1ea5p</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="prefill-api" data-email="' + esc(u.email) + '">🔑 G\u00e1n API</button>' +
        (u.sub ? '<button type="button" class="btn btn-outline btn-sm" data-act="revoke" data-email="' + esc(u.email) + '">Thu h\u1ed3i g\u00f3i</button>' : "") +
      '</div></td>' +
    '</tr>';
  }).join("") +
  '</tbody></table>';
  if (typeof applyI18n === "function") applyI18n(wrap);
}

function adminMembersHTML() {
  const subs = loadObj(KEYS.subs);
  const apis = loadObj(KEYS.userApis);
  const allUsers = getAllRegisteredUsers();
  const members = Object.keys(subs).filter(function (e) { return getActiveSub(e); });
  const rows = members.length ? members.map(function (e) {
    const s = subs[e];
    const hasApi = !!(apis[e] && (apis[e].maskedKey || apis[e].apiKey));
    return "<tr><td>" + esc(e) + (hasApi ? ' <span class="badge badge-ok" title="\u0110\u00e3 g\u00e1n Gemini API">🔑 \u0110\u00e3 g\u00e1n API</span>' : "") + "</td><td><strong>" + esc(TIERS[s.tier] ? TIERS[s.tier].name : s.tier) + "</strong></td><td>" +
      (s.tier === "unranked" ? "Mi\u1ec5n ph\u00ed" : esc(fmtDate(s.expires))) +
      '</td><td><div class="deck-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="prefill-api" data-email="' + esc(e) + '">🔑 G\u00e1n API</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="revoke" data-email="' + esc(e) + '">Thu h\u1ed3i g\u00f3i</button>' +
      '</div></td></tr>';
  }).join("") : '<tr><td colspan="4" class="muted">Ch\u01b0a c\u00f3 th\u00e0nh vi\u00ean n\u00e0o k\u00edch ho\u1ea1t g\u00f3i.</td></tr>';
  const opts = ["unranked", "bronze", "silver", "gold", "diamond"].map(function (c) {
    return '<option value="' + c + '">' + esc(TIERS[c].name) + "</option>";
  }).join("");

  const apiEmails = Object.keys(apis).filter(function (e) { return apis[e] && (apis[e].maskedKey || apis[e].apiKey); });
  const apiRows = apiEmails.length ? apiEmails.map(function (e) {
    const item = apis[e];
    const maskedDisp = item.maskedKey || maskApiKeyDisplay(item.apiKey || "");
    return "<tr><td><strong>" + esc(e) + "</strong></td>" +
      "<td><code>" + esc(maskedDisp) + "</code></td>" +
      "<td>" + esc(item.model || "gemini-2.5-flash") + "</td>" +
      "<td>" + esc(item.updatedAt ? fmtDateTime(item.updatedAt) : "—") + "</td>" +
      '<td><div class="deck-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-act="prefill-api" data-email="' + esc(e) + '">C\u1eadp nh\u1eadt</button>' +
        '<button type="button" class="btn btn-danger btn-sm" data-act="revoke-user-api" data-email="' + esc(e) + '">Thu h\u1ed3i API</button>' +
      '</div></td></tr>';
  }).join("") : '<tr><td colspan="5" class="muted">Ch\u01b0a c\u00f3 t\u00e0i kho\u1ea3n n\u00e0o \u0111\u01b0\u1ee3c Admin g\u00e1n Gemini API Key.</td></tr>';

  const drvWarn = (state.adminStorageDriver && !state.adminStorageDriver.persistentAcrossDeploys)
    ? '<div class="pending-banner" style="border-color:var(--amber);margin-bottom:12px"><span>⚠️ <strong>L\u01b0u \u00fd l\u01b0u tr\u1eef:</strong> M\u00e1y ch\u1ee7 \u0111ang d\u00f9ng <code>' + esc(state.adminStorageDriver.label || "/tmp JSON") + '</code> (kh\u00f4ng b\u1ec1n v\u1eefng qua cold-start/deploy). H\u00e3y c\u1ea5u h\u00ecnh <code>KV_REST_API_URL</code>/<code>UPSTASH_REDIS_REST_URL</code> ho\u1eb7c <code>SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code> tr\u00ean Vercel \u0111\u1ec3 danh s\u00e1ch ng\u01b0\u1eddi d\u00f9ng &amp; ch\u1ed1ng tr\u00f9ng email t\u1ed3n t\u1ea1i v\u0129nh vi\u1ec5n.</span></div>'
    : "";
  const lastLog = (Array.isArray(state.adminNotificationLogs) && state.adminNotificationLogs.length)
    ? state.adminNotificationLogs[state.adminNotificationLogs.length - 1]
    : null;
  const mailStatusLine = lastLog
    ? ('<div class="muted" style="font-size:.76rem;margin:-4px 0 10px">📬 Email g\u1ea7n nh\u1ea5t: <code>' + esc(lastLog.status || "") + '</code> (' + esc(lastLog.provider || "none") + ') \u2014 ' + esc(lastLog.subject || "") + (lastLog.error ? (' <span style="color:var(--rose)">(' + esc(lastLog.error) + ')</span>') : "") + '</div>')
    : "";

  return '<h3>Danh s\u00e1ch t\u1ea5t c\u1ea3 ng\u01b0\u1eddi d\u00f9ng \u0111\u00e3 \u0111\u0103ng k\u00fd (' + allUsers.length + ')</h3>' +
    '<p class="muted" style="font-size:.82rem;margin:0 0 10px">Hi\u1ec3n th\u1ecb to\u00e0n b\u1ed9 t\u00e0i kho\u1ea3n \u0111\u00e3 \u0111\u0103ng k\u00fd tr\u00ean h\u1ec7 th\u1ed1ng. Khi c\u00f3 ng\u01b0\u1eddi d\u00f9ng m\u1edbi \u0111\u0103ng k\u00fd ho\u1eb7c g\u1eedi y\u00eau c\u1ea7u x\u00e1c nh\u1eadn thanh to\u00e1n, h\u1ec7 th\u1ed1ng s\u1ebd t\u1ef1 \u0111\u1ed9ng g\u1eedi th\u00f4ng b\u00e1o v\u1ec1 email qu\u1ea3n tr\u1ecb (<strong>phamduchieu.robotics@gmail.com</strong>).</p>' +
    drvWarn + mailStatusLine +
    '<div class="filter-bar">' +
      '<input type="search" id="admMemberQuery" placeholder="T\u00ecm ng\u01b0\u1eddi d\u00f9ng theo email ho\u1eb7c t\u00ean..." value="' + esc(state.adminMemberQuery) + '" style="flex:1;min-width:220px">' +
      '<select id="admMemberSort" aria-label="S\u1eafp x\u1ebfp ng\u01b0\u1eddi d\u00f9ng">' +
        '<option value="newest"' + (state.adminMemberSort === "newest" ? " selected" : "") + '>M\u1edbi \u0111\u0103ng k\u00fd nh\u1ea5t</option>' +
        '<option value="login"' + (state.adminMemberSort === "login" ? " selected" : "") + '>\u0110\u0103ng nh\u1eadp g\u1ea7n nh\u1ea5t</option>' +
        '<option value="tier"' + (state.adminMemberSort === "tier" ? " selected" : "") + '>H\u1ea1ng g\u00f3i cao nh\u1ea5t</option>' +
        '<option value="email"' + (state.adminMemberSort === "email" ? " selected" : "") + '>Email (A-Z)</option>' +
      '</select>' +
      '<button type="button" class="btn btn-outline btn-sm" data-act="test-admin-email">✉️ Test Email SMTP</button>' +
    '</div>' +
    '<div class="table-scroll" id="admAllUsersTableWrap" style="margin-bottom:24px"></div>' +

    '<div style="padding-top:16px;border-top:2px dashed var(--border)">' +
    '<h3>1. C\u1ea5p / n\u00e2ng c\u1ea5p / thu h\u1ed3i g\u00f3i th\u1ee7 c\u00f4ng</h3><div class="admin-form">' +
    '<label class="field">Email ng\u01b0\u1eddi d\u00f9ng<input type="email" id="grantEmail" placeholder="email@example.com"></label>' +
    '<label class="field">H\u1ea1ng g\u00f3i<select id="grantTier">' + opts + "</select></label>" +
    '<button type="button" class="btn btn-primary" data-act="grant">C\u1ea5p / n\u00e2ng c\u1ea5p</button>' +
    '<button type="button" class="btn btn-danger" data-act="revoke-form">Thu h\u1ed3i g\u00f3i</button></div>' +
    '<h3>Danh s\u00e1ch th\u00e0nh vi\u00ean \u0111ang ho\u1ea1t \u0111\u1ed9ng</h3><div class="table-scroll" style="margin-bottom:20px"><table class="data-table"><thead><tr><th>Email</th><th>G\u00f3i</th><th>H\u1ebft h\u1ea1n</th><th>H\u00e0nh \u0111\u1ed9ng</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
    '</div>' +

    '<div style="padding-top:16px;border-top:2px dashed var(--border)">' +
      '<h3>2. 🔑 G\u00e1n h\u1ed9 Google Gemini API Key theo Email ng\u01b0\u1eddi d\u00f9ng</h3>' +
      '<p class="muted" style="font-size:.82rem;margin:0 0 10px">Key g\u00e1n \u0111\u01b0\u1ee3c m\u00e3 h\u00f3a tr\u00ean m\u00e1y ch\u1ee7 v\u00e0 ch\u1ec9 hi\u1ec3n th\u1ecb d\u1ea1ng \u1ea9n b\u1edbt tr\u00ean giao di\u1ec7n (\u0111\u1ec3 c\u1ea5p System Default Key d\u00f9ng chung qua <code>/api/ai/proxy</code>, h\u00e3y d\u00f9ng tab <strong>🔑 API Key H\u1ec7 th\u1ed1ng</strong>).</p>' +
      '<div class="admin-form" style="align-items:flex-start">' +
        '<label class="field">Email ng\u01b0\u1eddi d\u00f9ng<input type="email" id="assignApiEmail" placeholder="email@example.com"></label>' +
        '<label class="field" style="min-width:240px">API Key ch\u00ednh (Gemini / Groq / OpenAI / OpenRouter / DeepSeek)' +
          '<div class="key-input-wrap">' +
            '<input type="password" id="assignApiKey" autocomplete="off" spellcheck="false" placeholder="AIza..., gsk_..., sk-or-... ho\u1eb7c sk-...">' +
            '<button type="button" class="eye-btn" data-act="toggle-assign-eye" title="Hi\u1ec7n / \u1ea8n API Key">👁️</button>' +
          '</div>' +
        '</label>' +
        '<label class="field">Model m\u1eb7c \u0111\u1ecbnh<select id="assignApiModel">' +
          ((window.AI_PROVIDERS_CONFIG && Array.isArray(window.AI_PROVIDERS_CONFIG.PROVIDERS))
            ? window.AI_PROVIDERS_CONFIG.PROVIDERS.map(function (p) {
                return '<optgroup label="' + esc(p.name + " (" + (p.prefixHint || "") + ")") + '">' +
                  (p.models || []).map(function (m) {
                    return '<option value="' + esc(m.id) + '">' + esc(m.label) + '</option>';
                  }).join("") +
                '</optgroup>';
              }).join("")
            : '<option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option>') +
        '</select></label>' +
        '<label class="field" style="width:100%;flex-basis:100%">📦 H\u1ed9p ch\u1ee9a nhi\u1ec1u API Key d\u1ef1 ph\u00f2ng g\u00e1n cho ng\u01b0\u1eddi d\u00f9ng (t\u00f9y ch\u1ecdn – m\u1ed7i d\u00f2ng 1 Key ho\u1eb7c c\u00e1ch b\u1eb1ng d\u1ea5u ph\u1ea9y)' +
          '<textarea id="assignApiPool" class="multi-key-textarea" rows="5" spellcheck="false" placeholder="D\u00e1n th\u00eam nhi\u1ec1u API Key d\u1ef1 ph\u00f2ng (AIza..., gsk_..., sk-or-..., sk-...) \u0111\u1ec3 t\u1ef1 \u0111\u1ed9ng xoay v\u00f2ng khi Key ch\u00ednh h\u1ebft Quota 429"></textarea>' +
        '</label>' +
        '<button type="button" class="btn btn-primary" data-act="assign-user-api">🔑 G\u00e1n API cho Email</button>' +
        '<button type="button" class="btn btn-danger" data-act="revoke-user-api-form">Thu h\u1ed3i API</button>' +
      '</div>' +
      '<h3>Danh s\u00e1ch t\u00e0i kho\u1ea3n \u0111\u00e3 \u0111\u01b0\u1ee3c Admin g\u00e1n Gemini API (' + apiEmails.length + ')</h3>' +
      '<div class="table-scroll"><table class="data-table"><thead><tr><th>Email ng\u01b0\u1eddi d\u00f9ng</th><th>API Key (\u1ea8n)</th><th>Model</th><th>C\u1eadp nh\u1eadt</th><th>H\u00e0nh \u0111\u1ed9ng</th></tr></thead><tbody>' + apiRows + "</tbody></table></div>" +
    '</div>';
}

function adminSysKeysHTML() {
  const s = sysKeysState;
  const allRows = s.keys.concat(s.envKeys);
  const driverLabel = s.driver ? ((s.driver.label || s.driver.driver) + (s.driver.persistentAcrossDeploys ? " (B\u1ec1n v\u1eefng)" : " (T\u1ea1m th\u1eddi / Local)")) : "\u0110ang ki\u1ec3m tra...";

  const renderStatusBadge = function (rec) {
    if (rec.enabled === false) return '<span class="syskey-status disabled">Disabled</span>';
    if (rec.status === "invalid") return '<span class="syskey-status invalid">Invalid</span>';
    if (rec.status === "cooldown") {
      const rem = rec.cooldownUntil ? Math.max(1, Math.ceil((Number(rec.cooldownUntil) - Date.now()) / 1000)) : 60;
      return '<span class="syskey-status cooldown">Cooldown (' + rem + 's)</span>';
    }
    return '<span class="syskey-status healthy">Healthy</span>';
  };

  let previewHtml = "";
  if (s.preview) {
    const p = s.preview;
    const provSum = Object.keys(p.summaryByProvider || {})
      .filter(function (k) { return p.summaryByProvider[k] > 0; })
      .map(function (k) { return k + ": " + p.summaryByProvider[k]; })
      .join(" • ") || "0";
    const accSum = (p.summaryByAccount || []).map(function (a) {
      return esc(a.accountLabel) + " (" + a.count + ")";
    }).join(" • ");
    const prevRows = (p.previewItems || []).map(function (it) {
      return '<li><strong>' + esc(it.accountLabel) + '</strong> — <code>' + esc(it.provider) + '</code>: <code>' + esc(it.maskedKey) + '</code></li>';
    }).join("");
    const dupHtml = (p.duplicates && p.duplicates.length)
      ? '<div class="muted" style="margin-top:6px;font-size:.78rem">🔁 Tr\u00f9ng l\u1eb7p b\u1ecf qua (' + p.duplicates.length + '): ' + p.duplicates.map(function (d) { return esc(d.provider + " " + d.maskedKey); }).join(", ") + '</div>'
      : "";
    const skipHtml = (p.skipped && p.skipped.length)
      ? '<div class="muted" style="margin-top:4px;font-size:.78rem">⏭️ D\u00f2ng tr\u1ed1ng b\u1ecf qua (' + p.skipped.length + '): ' + p.skipped.map(function (x) { return esc(x.label || x.accountLabel || ""); }).join(", ") + '</div>'
      : "";

    previewHtml = '<div class="syskey-preview-box">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<strong>📋 K\u1ebft qu\u1ea3 ph\u00e2n t\u00edch (Preview): ' + p.totalValid + ' Key h\u1ee3p l\u1ec7 s\u1eb5n s\u00e0ng m\u00e3 h\u00f3a &amp; l\u01b0u</strong>' +
        '<span class="muted" style="font-size:.8rem">' + esc(provSum) + '</span>' +
      '</div>' +
      (accSum ? '<div class="muted" style="font-size:.78rem;margin:6px 0">T\u00e0i kho\u1ea3n: ' + accSum + '</div>' : '') +
      (prevRows ? '<ul style="margin:6px 0 8px 18px;font-size:.8rem;max-height:180px;overflow:auto">' + prevRows + '</ul>' : '') +
      dupHtml + skipHtml +
      '<div class="muted" style="font-size:.76rem;margin-top:6px">ℹ️ Kh\u00f4ng ki\u1ec3m tra ti\u1ec1n t\u1ed1 / \u0111\u1ecbnh d\u1ea1ng chu\u1ed7i (h\u1ed7 tr\u1ee3 m\u1ecdi Key nh\u01b0 <code>AQ.Ab8...</code>, <code>AIza...</code>, <code>gsk_...</code>...). Khi b\u1ea5m X\u00e1c nh\u1eadn, m\u00e1y ch\u1ee7 s\u1ebd m\u00e3 h\u00f3a v\u00e0 ki\u1ec3m tra k\u1ebft n\u1ed1i tr\u1ef1c ti\u1ebfp (Live Health Check) t\u1edbi t\u1eebng h\u00e3ng AI.</div>' +
      '<div class="deck-actions" style="margin-top:10px">' +
        '<button type="button" class="btn btn-emerald" data-act="syskey-confirm-import"' + ((s.busy || !p.totalValid) ? " disabled" : "") + '>✅ X\u00e1c nh\u1eadn M\u00e3 h\u00f3a, L\u01b0u &amp; Ki\u1ec3m tra Live (' + p.totalValid + ' Key)</button>' +
        '<button type="button" class="btn btn-outline" data-act="syskey-cancel-preview"' + (s.busy ? " disabled" : "") + '>H\u1ee7y</button>' +
      '</div>' +
    '</div>';
  }

  const keyTableRows = allRows.length ? allRows.map(function (k) {
    const isEnv = k.source === "env";
    const srcBadge = isEnv
      ? ' <span class="badge" style="font-size:.68rem">ENV</span>'
      : ' <span class="badge badge-ok" style="font-size:.68rem">DB</span>';
    const actCell = isEnv
      ? '<span class="muted" style="font-size:.76rem">Qu\u1ea3n l\u00fd qua ENV</span>'
      : ('<div class="deck-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" data-act="syskey-test-one" data-id="' + esc(k.id) + '"' + (s.busy ? " disabled" : "") + '>🧪 Test</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-act="syskey-toggle" data-id="' + esc(k.id) + '" data-enabled="' + (k.enabled !== false ? "1" : "0") + '"' + (s.busy ? " disabled" : "") + '>' + (k.enabled !== false ? "T\u1ea1m t\u1eaft" : "B\u1eadt l\u1ea1i") + '</button>' +
          ((k.status === "cooldown" || k.status === "invalid")
            ? '<button type="button" class="btn btn-outline btn-sm" data-act="syskey-reset" data-id="' + esc(k.id) + '"' + (s.busy ? " disabled" : "") + '>Reset</button>'
            : '') +
          '<button type="button" class="btn btn-danger btn-sm" data-act="syskey-delete" data-id="' + esc(k.id) + '" data-masked="' + esc(k.maskedKey) + '"' + (s.busy ? " disabled" : "") + '>X\u00f3a</button>' +
        '</div>');

    return '<tr>' +
      '<td><strong>' + esc(k.accountLabel) + '</strong>' + srcBadge + '</td>' +
      '<td><code>' + esc(k.provider) + '</code></td>' +
      '<td><code>' + esc(k.maskedKey) + '</code></td>' +
      '<td>' + renderStatusBadge(k) + (k.lastError ? '<div class="muted" style="font-size:.7rem;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(k.lastError) + '">' + esc(k.lastError) + '</div>' : '') + '</td>' +
      '<td>' + (Number(k.usageCount) || 0) + ' OK / ' + (Number(k.errorCount) || 0) + ' Err</td>' +
      '<td>' + actCell + '</td>' +
    '</tr>';
  }).join("") : '<tr><td colspan="6" class="muted">' + (s.loading ? "\u0110ang t\u1ea3i danh s\u00e1ch System Key..." : "Ch\u01b0a c\u00f3 System Key n\u00e0o trong Pool.") + '</td></tr>';

  const auditRows = (s.auditLogs && s.auditLogs.length)
    ? s.auditLogs.map(function (a) {
        return '<div class="audit-log-row">' +
          '<span class="muted">' + esc(a.createdAt ? fmtDateTime(a.createdAt) : "") + '</span>' +
          '<strong>' + esc(a.adminEmail || "") + '</strong>' +
          '<code>' + esc(a.action || "") + '</code>' +
          '<span>' + esc(a.detail || "") + '</span>' +
        '</div>';
      }).join("")
    : '<div class="muted">Ch\u01b0a c\u00f3 nh\u1eadt k\u00fd thao t\u00e1c n\u00e0o.</div>';

  return '<h3>🔑 Qu\u1ea3n l\u00fd API Key H\u1ec7 th\u1ed1ng (System Key Pool — Zero Client Exposure)</h3>' +
    '<div class="checkout-notice" style="margin-bottom:12px">' +
      '🔒 <strong>B\u1ea3o m\u1eadt m\u00e3 h\u00f3a:</strong> ' +
        (s.encryptionConfigured
          ? '<span class="syskey-status healthy">✅ AES-256-GCM \u0110\u00e3 b\u1eadt (ENCRYPTION_SECRET)</span>'
          : '<span class="syskey-status invalid">⚠️ Ch\u01b0a c\u1ea5u h\u00ecnh ENCRYPTION_SECRET tr\u00ean server</span>') +
      ' &nbsp;|&nbsp; <strong>L\u01b0u tr\u1eef:</strong> <code>' + esc(driverLabel) + '</code>' +
      (s.driver && !s.driver.persistentAcrossDeploys ? '<div class="muted" style="font-size:.78rem;margin-top:4px">⚠️ C\u1ea3nh b\u00e1o: Vercel Serverless kh\u00f4ng l\u01b0u \u0111\u0129a c\u1ee9ng l\u00e2u d\u00e0i n\u1ebfu ch\u01b0a c\u1ea5u h\u00ecnh <code>KV_REST_API_URL</code>/<code>UPSTASH_REDIS_REST_URL</code> ho\u1eb7c <code>SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code>.</div>' : '') +
    '</div>' +

    (s.error ? '<div class="pending-banner" style="border-color:var(--rose);margin-bottom:12px"><span>❌ <strong>L\u1ed7i m\u00e1y ch\u1ee7:</strong> ' + esc(s.error) + '</span></div>' : '') +

    '<div style="margin-bottom:20px">' +
      '<h4>1. Nh\u1eadp h\u00e0ng lo\u1ea1t theo nh\u00f3m t\u00e0i kho\u1ea3n (2-Step Smart Importer)</h4>' +
      '<p class="muted" style="font-size:.8rem;margin:0 0 8px">D\u00e1n danh s\u00e1ch theo c\u1ea5u tr\u00fac <code>Account: email</code> + nh\u00e3n t\u1eebng h\u00e3ng (<code>Google AI Studio (Gemini):</code>, <code>Groq Cloud:</code>, <code>OpenRouter:</code>, <code>OpenAI:</code>, <code>DeepSeek:</code>). Kh\u00f4ng gi\u1edbi h\u1ea1n ti\u1ec1n t\u1ed1 Key (h\u1ed7 tr\u1ee3 c\u1ea3 <code>AQ.Ab8...</code>), t\u1ef1 b\u1ecf qua d\u00f2ng tr\u1ed1ng, ch\u1ed1ng tr\u00f9ng b\u1eb1ng HMAC-SHA256 v\u00e0 x\u00e1c minh tr\u1ea1ng th\u00e1i s\u1ed1ng/ch\u1ebft qua Live API Health Check.</p>' +
      '<textarea id="sysKeysRawInput" class="multi-key-textarea" rows="7" spellcheck="false" autocomplete="off" placeholder="Account: user1@gmail.com&#10;Google AI Studio (Gemini): AQ.Ab8...&#10;Groq Cloud: gsk_...&#10;OpenRouter: sk-or-...&#10;OpenAI:&#10;DeepSeek:">' + esc(s.rawDraft) + '</textarea>' +
      '<div class="deck-actions" style="margin-top:8px">' +
        '<button type="button" class="btn btn-primary" data-act="syskey-preview"' + (s.busy ? " disabled" : "") + '>🔍 Ph\u00e2n t\u00edch &amp; Xem tr\u01b0\u1edbc (Preview)</button>' +
        '<button type="button" class="btn btn-outline" data-act="syskey-clear-input"' + (s.busy ? " disabled" : "") + '>X\u00f3a \u00f4 d\u00e1n</button>' +
      '</div>' +
      previewHtml +
    '</div>' +

    '<div style="padding-top:16px;border-top:2px dashed var(--border);margin-bottom:20px">' +
      '<div class="panel-head" style="margin-bottom:8px">' +
        '<h4 style="margin:0">2. Danh s\u00e1ch System Key trong Pool (' + allRows.length + ')</h4>' +
        '<div class="deck-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" data-act="syskey-refresh"' + (s.busy ? " disabled" : "") + '>🔄 T\u1ea3i l\u1ea1i</button>' +
          '<button type="button" class="btn btn-emerald btn-sm" data-act="syskey-test-all"' + (s.busy ? " disabled" : "") + '>🧪 Test All Keys</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-act="syskey-remove-invalid"' + (s.busy ? " disabled" : "") + '>🧹 Remove All Invalid Keys</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-act="syskey-delete-all"' + ((s.busy || s.keys.length === 0) ? " disabled" : "") + '>🗑️ X\u00f3a to\u00e0n b\u1ed9 Key H\u1ec7 th\u1ed1ng</button>' +
        '</div>' +
      '</div>' +
      '<div class="table-scroll"><table class="data-table"><thead><tr><th>T\u00e0i kho\u1ea3n</th><th>H\u00e3ng</th><th>Key (\u1ea8n)</th><th>Tr\u1ea1ng th\u00e1i</th><th>Th\u1ed1ng k\u00ea</th><th>H\u00e0nh \u0111\u1ed9ng</th></tr></thead><tbody>' + keyTableRows + '</tbody></table></div>' +
    '</div>' +

    '<div style="padding-top:16px;border-top:2px dashed var(--border)">' +
      '<h4 style="margin:0 0 8px">3. Nh\u1eadt k\u00fd Qu\u1ea3n tr\u1ecb (Audit Log)</h4>' +
      '<div class="audit-log-box">' + auditRows + '</div>' +
    '</div>';
}

function adminCfgHTML() {
  const c = getPayCfg();
  return '<h3>C\u1ea5u h\u00ecnh t\u00e0i kho\u1ea3n nh\u1eadn ti\u1ec1n VietQR</h3><div class="admin-form" style="flex-direction:column;align-items:stretch;max-width:440px">' +
    '<label class="field">T\u00ean ng\u00e2n h\u00e0ng<input type="text" id="cfgBankName" value="' + esc(c.bankName) + '" maxlength="60"></label>' +
    '<label class="field">M\u00e3 ng\u00e2n h\u00e0ng VietQR (BIN, v\u00ed d\u1ee5 970414, MB, VCB)<input type="text" id="cfgBankId" value="' + esc(c.bankId) + '" maxlength="20"></label>' +
    '<label class="field">S\u1ed1 t\u00e0i kho\u1ea3n<input type="text" id="cfgAccNo" value="' + esc(c.accountNo) + '" maxlength="30" inputmode="numeric"></label>' +
    '<label class="field">T\u00ean ch\u1ee7 t\u00e0i kho\u1ea3n<input type="text" id="cfgAccName" value="' + esc(c.accountName) + '" maxlength="80"></label>' +
    '<button type="button" class="btn btn-primary" data-act="save-cfg">L\u01b0u c\u1ea5u h\u00ecnh</button></div>';
}

function adminVoucherHTML() {
  const list = getVouchers();
  const rows = list.length ? list.map(function (v) {
    return "<tr><td><strong>" + esc(v.code) + "</strong></td><td>" + esc(v.discountPercent) + '%</td><td><button type="button" class="btn btn-outline btn-sm" data-act="del-voucher" data-code="' + esc(v.code) + '">X\u00f3a</button></td></tr>';
  }).join("") : '<tr><td colspan="3" class="muted">Ch\u01b0a c\u00f3 m\u00e3 gi\u1ea3m gi\u00e1 n\u00e0o.</td></tr>';
  return '<h3>T\u1ea1o m\u00e3 gi\u1ea3m gi\u00e1</h3><div class="admin-form">' +
    '<label class="field">M\u00e3 gi\u1ea3m gi\u00e1<input type="text" id="vCode" maxlength="30" placeholder="AITUTOR20"></label>' +
    '<label class="field">Ph\u1ea7n tr\u0103m gi\u1ea3m (1–100)<input type="number" id="vPercent" min="1" max="100" value="10"></label>' +
    '<button type="button" class="btn btn-primary" data-act="add-voucher">Th\u00eam m\u00e3</button></div>' +
    '<div class="table-scroll"><table class="data-table"><thead><tr><th>M\u00e3</th><th>Gi\u1ea3m gi\u00e1</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>";
}

function adminBackupHTML() {
  const subs = loadObj(KEYS.subs);
  const paidActive = Object.keys(subs).filter(function (e) { const s = getActiveSub(e); return s && s.tier !== "unranked"; }).length;
  return '<p class="muted">Th\u00e0nh vi\u00ean tr\u1ea3 ph\u00ed \u0111ang ho\u1ea1t \u0111\u1ed9ng: <strong>' + paidActive + '</strong>. Xu\u1ea5t to\u00e0n b\u1ed9 d\u1eef li\u1ec7u qu\u1ea3n tr\u1ecb (th\u00e0nh vi\u00ean, y\u00eau c\u1ea7u thanh to\u00e1n, m\u00e3 gi\u1ea3m gi\u00e1, c\u1ea5u h\u00ecnh VietQR) d\u01b0\u1edbi d\u1ea1ng JSON.</p>' +
    '<button type="button" class="btn btn-primary" data-act="export-backup">Xu\u1ea5t d\u1eef li\u1ec7u h\u1ec7 th\u1ed1ng (.json)</button>';
}

async function approvePaymentRequest(id) {
  if (!assertAdmin()) return;
  const list = loadArr(KEYS.payReqs);
  const req = list.filter(function (r) { return r && r.id === id; })[0];
  if (!req || req.status !== "pending") return;
  const now = new Date().toISOString();
  const res = await apiCall("/api/admin/payment-requests/" + encodeURIComponent(id) + "/approve", "POST", { request: req });
  if (res && res._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + res._err, "error"); return; }
  if (!adminActivatePaidTier(req.userEmail, req.plan)) return;
  req.status = "approved";
  req.reviewedAt = now;
  req.reviewedBy = state.user.email.toLowerCase();
  req.rejectReason = "";
  saveJSON(KEYS.payReqs, list);
  showToast("\u0110\u00e3 duy\u1ec7t \u0111\u01a1n v\u00e0 k\u00edch ho\u1ea1t g\u00f3i " + TIERS[req.plan].name + " (365 ng\u00e0y) cho " + req.userEmail + ".", "success");
  updateChrome();
  renderAdmin();
}

async function confirmRejectRequest() {
  if (!assertAdmin()) return;
  const id = state.rejectReqId;
  const reason = ($("rejectReasonInput") ? $("rejectReasonInput").value : "").trim();
  if (!reason) { showToast("Vui l\u00f2ng nh\u1eadp l\u00fd do t\u1eeb ch\u1ed1i.", "warning"); return; }
  const list = loadArr(KEYS.payReqs);
  const req = list.filter(function (r) { return r && r.id === id; })[0];
  if (!req || req.status !== "pending") { closeModal("rejectModal"); return; }
  const res = await apiCall("/api/admin/payment-requests/" + encodeURIComponent(id) + "/reject", "POST", { request: req, rejectReason: reason });
  if (res && res._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + res._err, "error"); return; }
  req.status = "rejected";
  req.reviewedAt = new Date().toISOString();
  req.reviewedBy = state.user.email.toLowerCase();
  req.rejectReason = reason;
  saveJSON(KEYS.payReqs, list);
  state.rejectReqId = null;
  closeModal("rejectModal");
  showToast("\u0110\u00e3 t\u1eeb ch\u1ed1i y\u00eau c\u1ea7u c\u1ee7a " + req.userEmail + ".", "info");
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
      showConfirm("Duy\u1ec7t thanh to\u00e1n", "X\u00e1c nh\u1eadn duy\u1ec7t \u0111\u01a1n " + fmtMoney(req.amount) + " v\u00e0 k\u00edch ho\u1ea1t g\u00f3i " + TIERS[req.plan].name + " (+365 ng\u00e0y) cho " + req.userEmail + "?", function () {
        approvePaymentRequest(id);
      }, "Duy\u1ec7t ngay");
    } else if (act === "reject-req") {
      const id = b.getAttribute("data-id");
      const req = loadArr(KEYS.payReqs).find(function (r) { return r && r.id === id; });
      if (!req) return;
      state.rejectReqId = id;
      setText("rejectMeta", "Ng\u01b0\u1eddi d\u00f9ng: " + req.userEmail + " • G\u00f3i " + TIERS[req.plan].name + " (" + fmtMoney(req.amount) + ")");
      const inp = $("rejectReasonInput"); if (inp) inp.value = "";
      openModal("rejectModal");
    } else if (act === "view-receipt") {
      const id = b.getAttribute("data-id");
      const req = loadArr(KEYS.payReqs).find(function (r) { return r && r.id === id; });
      if (!req || !req.receiptImage) return;
      const im = $("receiptModalImg"); if (im) im.src = req.receiptImage;
      setText("receiptModalTitle", "Bi\u00ean lai – " + req.userEmail + " (" + TIERS[req.plan].name + ")");
      openModal("receiptModal");
    } else if (act === "grant") {
      const email = ($("grantEmail") ? $("grantEmail").value : "").trim().toLowerCase();
      const tier = $("grantTier") ? $("grantTier").value : "";
      if (!isValidEmail(email)) { showToast("Vui l\u00f2ng nh\u1eadp m\u1ed9t \u0111\u1ecba ch\u1ec9 email h\u1ee3p l\u1ec7.", "warning"); return; }
      if (!TIERS[tier] || tier === "none") { showToast("G\u00f3i kh\u00f4ng h\u1ee3p l\u1ec7.", "warning"); return; }
      const r = await apiCall("/api/admin/subscriptions", "POST", { email: email, tier: tier });
      if (r && r._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + r._err, "error"); return; }
      if (!adminActivatePaidTier(email, tier)) return;
      showToast("\u0110\u00e3 c\u1ea5p g\u00f3i " + TIERS[tier].name + " cho " + email + ".", "success");
      updateChrome(); renderAdmin();
    } else if (act === "revoke-form" || act === "revoke") {
      const email = act === "revoke" ? b.getAttribute("data-email") : ($("grantEmail") ? $("grantEmail").value : "").trim().toLowerCase();
      if (!isValidEmail(email)) { showToast("Vui l\u00f2ng nh\u1eadp m\u1ed9t \u0111\u1ecba ch\u1ec9 email h\u1ee3p l\u1ec7.", "warning"); return; }
      showConfirm("Thu h\u1ed3i g\u00f3i", "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n thu h\u1ed3i g\u00f3i c\u1ee7a " + email + "?", async function () {
        const r = await apiCall("/api/admin/subscriptions/" + encodeURIComponent(email), "DELETE");
        if (r && r._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + r._err, "error"); return; }
        const s2 = loadObj(KEYS.subs); delete s2[email]; saveJSON(KEYS.subs, s2);
        showToast("\u0110\u00e3 thu h\u1ed3i g\u00f3i c\u1ee7a " + email + ".", "success");
        updateChrome(); renderTab();
      });
    } else if (act === "save-cfg") {
      const bankName = ($("cfgBankName") ? $("cfgBankName").value : "").trim();
      const bankId = ($("cfgBankId") ? $("cfgBankId").value : "").trim().toUpperCase();
      const acc = ($("cfgAccNo") ? $("cfgAccNo").value : "").trim();
      const name = ($("cfgAccName") ? $("cfgAccName").value : "").trim().toUpperCase();
      if (!bankName || !/^[A-Z0-9]{2,20}$/.test(bankId) || !/^[0-9]{6,20}$/.test(acc) || !name) {
        showToast("Th\u00f4ng tin ng\u00e2n h\u00e0ng/STK ch\u01b0a h\u1ee3p l\u1ec7.", "warning"); return;
      }
      const cfg = { bankName: bankName, bankId: bankId, accountNo: acc, accountName: name };
      const r = await apiCall("/api/admin/payment-config", "PUT", cfg);
      if (r && r._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + r._err, "error"); return; }
      if (saveJSON(KEYS.payCfg, cfg)) showToast("\u0110\u00e3 l\u01b0u c\u1ea5u h\u00ecnh VietQR.", "success");
    } else if (act === "add-voucher") {
      const code = ($("vCode") ? $("vCode").value : "").trim().toUpperCase();
      const pct = parseInt($("vPercent") ? $("vPercent").value : "", 10);
      if (!/^[A-Z0-9_-]{2,30}$/.test(code) || !(pct >= 1 && pct <= 100)) { showToast("M\u00e3 gi\u1ea3m gi\u00e1 ho\u1eb7c ph\u1ea7n tr\u0103m kh\u00f4ng h\u1ee3p l\u1ec7.", "warning"); return; }
      const list = getVouchers();
      if (list.some(function (v) { return v.code.toUpperCase() === code; })) { showToast("M\u00e3 gi\u1ea3m gi\u00e1 \u0111\u00e3 t\u1ed3n t\u1ea1i.", "warning"); return; }
      list.push({ code: code, discountPercent: pct });
      const r = await apiCall("/api/admin/vouchers", "PUT", { vouchers: list });
      if (r && r._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + r._err, "error"); return; }
      if (saveJSON(KEYS.vouchers, list)) { showToast("\u0110\u00e3 th\u00eam m\u00e3 gi\u1ea3m gi\u00e1 " + code + " (-" + pct + "%).", "success"); renderAdmin(); }
    } else if (act === "del-voucher") {
      const code = b.getAttribute("data-code");
      const list = getVouchers().filter(function (v) { return v.code !== code; });
      const r = await apiCall("/api/admin/vouchers", "PUT", { vouchers: list });
      if (r && r._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + r._err, "error"); return; }
      saveJSON(KEYS.vouchers, list);
      showToast("\u0110\u00e3 x\u00f3a m\u00e3 gi\u1ea3m gi\u00e1.", "success");
      renderAdmin();
    } else if (act === "toggle-assign-eye") {
      const inp = $("assignApiKey");
      if (!inp) return;
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      b.textContent = show ? "🙈" : "👁️";
    } else if (act === "prefill-grant") {
      const em = String(b.getAttribute("data-email") || "").trim().toLowerCase();
      const tr = String(b.getAttribute("data-tier") || "diamond").trim().toLowerCase();
      const emInp = $("grantEmail");
      const trSel = $("grantTier");
      if (emInp) { emInp.value = em; emInp.focus(); }
      if (trSel && TIERS[tr] && tr !== "none") trSel.value = tr;
      showToast("\u0110\u00e3 ch\u1ecdn email " + em + " \u0111\u1ec3 c\u1ea5p / n\u00e2ng c\u1ea5p g\u00f3i.", "info");
    } else if (act === "prefill-api") {
      const em = String(b.getAttribute("data-email") || "").trim().toLowerCase();
      const emInp = $("assignApiEmail");
      const keyInp = $("assignApiKey");
      const poolInp = $("assignApiPool");
      const modSel = $("assignApiModel");
      const cur = getAssignedApiForEmail(em);
      if (emInp) emInp.value = em;
      if (keyInp) { keyInp.value = ""; keyInp.type = "password"; keyInp.focus(); }
      if (poolInp) poolInp.value = "";
      if (modSel && cur && cur.model) modSel.value = cur.model;
      showToast("\u0110\u00e3 ch\u1ecdn email " + em + " \u0111\u1ec3 c\u1eadp nh\u1eadt Gemini API Key.", "info");
    } else if (act === "assign-user-api") {
      const email = ($("assignApiEmail") ? $("assignApiEmail").value : "").trim().toLowerCase();
      const rawKey = ($("assignApiKey") ? $("assignApiKey").value : "").trim();
      const apiPool = ($("assignApiPool") ? $("assignApiPool").value : "").trim();
      const model = ($("assignApiModel") ? $("assignApiModel").value : "gemini-2.5-flash").trim();
      const apiKey = rawKey || (apiPool.split(/[\r\n,;]+/).map(function (x) { return x.trim(); }).filter(Boolean)[0] || "");
      if (!isValidEmail(email)) { showToast("Vui l\u00f2ng nh\u1eadp \u0111\u1ecba ch\u1ec9 email ng\u01b0\u1eddi d\u00f9ng h\u1ee3p l\u1ec7.", "warning"); return; }
      if (!apiKey) { showToast("Vui l\u00f2ng d\u00e1n Google Gemini API Key \u0111\u1ec3 g\u00e1n cho ng\u01b0\u1eddi d\u00f9ng.", "warning"); return; }
      const r = await apiCall("/api/admin/user-apis", "POST", { email: email, apiKey: apiKey, apiPool: apiPool, model: model });
      if (r && r._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + r._err, "error"); return; }
      const now = Date.now();
      const all = loadObj(KEYS.userApis);
      all[email] = {
        email: email,
        maskedKey: (r && r.entry && r.entry.maskedKey) ? r.entry.maskedKey : maskApiKeyDisplay(apiKey),
        model: model,
        assignedBy: ADMIN_EMAIL,
        updatedAt: new Date(now).toISOString(),
        ts: now
      };
      saveJSON(KEYS.userApis, all);
      if ($("assignApiKey")) $("assignApiKey").value = "";
      if ($("assignApiPool")) $("assignApiPool").value = "";
      showToast("\u0110\u00e3 m\u00e3 h\u00f3a & g\u00e1n API Key cho t\u00e0i kho\u1ea3n " + email + " th\u00e0nh c\u00f4ng!", "success");
      updateChrome();
      renderAdmin();
    } else if (act === "revoke-user-api" || act === "revoke-user-api-form") {
      const email = act === "revoke-user-api"
        ? String(b.getAttribute("data-email") || "").trim().toLowerCase()
        : ($("assignApiEmail") ? $("assignApiEmail").value : "").trim().toLowerCase();
      if (!isValidEmail(email)) { showToast("Vui l\u00f2ng nh\u1eadp ho\u1eb7c ch\u1ecdn email c\u1ea7n thu h\u1ed3i API Key.", "warning"); return; }
      showConfirm("Thu h\u1ed3i Gemini API Key", "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n thu h\u1ed3i Gemini API Key \u0111\u00e3 g\u00e1n cho " + email + "?", async function () {
        const r = await apiCall("/api/admin/user-apis/" + encodeURIComponent(email), "DELETE");
        if (r && r._err) { showToast("L\u1ed7i m\u00e1y ch\u1ee7: " + r._err, "error"); return; }
        const all = loadObj(KEYS.userApis);
        delete all[email];
        saveJSON(KEYS.userApis, all);
        showToast("\u0110\u00e3 thu h\u1ed3i Gemini API Key c\u1ee7a " + email + ".", "info");
        updateChrome();
        renderAdmin();
      });
    } else if (act === "syskey-preview") {
      const ta = $("sysKeysRawInput");
      const rawText = ta ? ta.value : sysKeysState.rawDraft;
      sysKeysState.rawDraft = rawText;
      if (!String(rawText || "").trim()) { showToast("Vui l\u00f2ng d\u00e1n danh s\u00e1ch API Key tr\u01b0\u1edbc khi ph\u00e2n t\u00edch.", "warning"); return; }
      sysKeysState.busy = true;
      renderAdmin();
      const resp = await adminSystemKeysFetch("/preview", "POST", { rawText: rawText });
      sysKeysState.busy = false;
      if (resp._err) {
        sysKeysState.error = resp._err;
        showToast("L\u1ed7i ph\u00e2n t\u00edch Key: " + resp._err, "error");
      } else if (resp.data) {
        sysKeysState.error = "";
        sysKeysState.preview = resp.data;
        sysKeysState.encryptionConfigured = !!resp.data.encryptionConfigured;
      }
      renderAdmin();
    } else if (act === "syskey-clear-input") {
      sysKeysState.rawDraft = "";
      sysKeysState.preview = null;
      renderAdmin();
    } else if (act === "syskey-cancel-preview") {
      sysKeysState.preview = null;
      renderAdmin();
    } else if (act === "syskey-confirm-import") {
      const ta = $("sysKeysRawInput");
      const rawText = sysKeysState.rawDraft || (ta ? ta.value : "");
      if (!String(rawText || "").trim()) { showToast("Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u \u0111\u1ec3 nh\u1eadp.", "warning"); return; }
      sysKeysState.busy = true;
      renderAdmin();
      const resp = await adminSystemKeysFetch("/import", "POST", { rawText: rawText });
      sysKeysState.busy = false;
      if (resp._err) {
        sysKeysState.error = resp._err;
        showToast("L\u1ed7i nh\u1eadp System Key: " + resp._err, "error");
      } else if (resp.data) {
        sysKeysState.error = "";
        sysKeysState.rawDraft = "";
        sysKeysState.preview = null;
        sysKeysState.keys = Array.isArray(resp.data.keys) ? resp.data.keys : sysKeysState.keys;
        sysKeysState.auditLogs = Array.isArray(resp.data.auditLogs) ? resp.data.auditLogs : sysKeysState.auditLogs;
        const hs = resp.data.healthSummary;
        const hsTxt = hs ? (" (Live Check: " + (hs.healthy || 0) + " Healthy \u2022 " + (hs.cooldown || 0) + " Cooldown \u2022 " + (hs.invalid || 0) + " Invalid)") : "";
        showToast("\u0110\u00e3 m\u00e3 h\u00f3a AES-256-GCM & l\u01b0u " + (resp.data.importedCount || 0) + " API Key!" + hsTxt, (hs && hs.invalid > 0 && !hs.healthy) ? "warning" : "success");
      }
      renderAdmin();
    } else if (act === "syskey-test-one") {
      const id = b.getAttribute("data-id");
      if (!id) return;
      sysKeysState.busy = true;
      renderAdmin();
      const resp = await adminSystemKeysFetch("/" + encodeURIComponent(id) + "/test", "POST", {});
      sysKeysState.busy = false;
      if (resp._err) {
        showToast("L\u1ed7i ki\u1ec3m tra Key: " + resp._err, "error");
      } else if (resp.data) {
        sysKeysState.keys = Array.isArray(resp.data.keys) ? resp.data.keys : sysKeysState.keys;
        sysKeysState.auditLogs = Array.isArray(resp.data.auditLogs) ? resp.data.auditLogs : sysKeysState.auditLogs;
        const k = resp.data.key || {};
        showToast("Live Health Check " + (k.maskedKey || "") + ": " + (k.status || "done").toUpperCase() + (k.lastError ? (" (" + k.lastError + ")") : " (OK)"), k.status === "healthy" ? "success" : "warning");
      }
      renderAdmin();
    } else if (act === "test-admin-email") {
      b.disabled = true;
      showToast("\u0110ang g\u1eedi email ki\u1ec3m tra SMTP...", "info");
      try {
        const resp = await fetch("/api/admin/test-email", {
          method: "POST",
          headers: authHeaders(),
          body: "{}",
          cache: "no-store"
        });
        const data = await resp.json().catch(function () { return null; });
        if (resp.ok && data && data.ok) {
          if (data.storageDriver) state.adminStorageDriver = data.storageDriver;
          if (data.emailNotification) {
            state.adminNotificationLogs = (state.adminNotificationLogs || []).concat([data.emailNotification]).slice(-30);
          }
          showToast("✅ \u0110\u00e3 g\u1eedi email test SMTP th\u00e0nh c\u00f4ng t\u1edbi " + (data.emailNotification && data.emailNotification.to ? data.emailNotification.to : "Admin") + "!", "success");
        } else {
          const errMsg = (data && (data.error || (data.emailNotification && data.emailNotification.error))) || ("HTTP " + resp.status);
          showToast("❌ L\u1ed7i g\u1eedi email SMTP: " + errMsg, "error");
        }
      } catch (e) {
        showToast("❌ Kh\u00f4ng th\u1ec3 g\u1ecdi /api/admin/test-email.", "error");
      }
      b.disabled = false;
      renderAdmin();
    } else if (act === "syskey-refresh") {
      await loadAdminSysKeys(true);
    } else if (act === "syskey-test-all") {
      sysKeysState.busy = true;
      renderAdmin();
      const resp = await adminSystemKeysFetch("/test-all", "POST", {});
      sysKeysState.busy = false;
      if (resp._err) {
        sysKeysState.error = resp._err;
        showToast(resp._err, resp._status === 429 ? "warning" : "error");
      } else if (resp.data) {
        sysKeysState.error = "";
        sysKeysState.keys = Array.isArray(resp.data.keys) ? resp.data.keys : sysKeysState.keys;
        sysKeysState.auditLogs = Array.isArray(resp.data.auditLogs) ? resp.data.auditLogs : sysKeysState.auditLogs;
        const sm = resp.data.summary || {};
        showToast("Test All xong: " + (sm.healthy || 0) + " Healthy • " + (sm.cooldown || 0) + " Cooldown • " + (sm.invalid || 0) + " Invalid.", "info");
      }
      renderAdmin();
    } else if (act === "syskey-remove-invalid") {
      showConfirm("X\u00f3a t\u1ea5t c\u1ea3 Key kh\u00f4ng h\u1ee3p l\u1ec7", "X\u00f3a v\u0129nh vi\u1ec5n t\u1ea5t c\u1ea3 Key \u0111ang c\u00f3 tr\u1ea1ng th\u00e1i Invalid kh\u1ecfi System Key Pool?", async function () {
        sysKeysState.busy = true;
        renderAdmin();
        const resp = await adminSystemKeysFetch("/remove-invalid", "POST", {});
        sysKeysState.busy = false;
        if (resp._err) {
          showToast("L\u1ed7i: " + resp._err, "error");
        } else if (resp.data) {
          sysKeysState.keys = Array.isArray(resp.data.keys) ? resp.data.keys : sysKeysState.keys;
          sysKeysState.auditLogs = Array.isArray(resp.data.auditLogs) ? resp.data.auditLogs : sysKeysState.auditLogs;
          showToast("\u0110\u00e3 x\u00f3a " + (resp.data.removedCount || 0) + " Invalid Key.", "info");
        }
        renderAdmin();
      });
    } else if (act === "syskey-delete-all") {
      const cnt = (sysKeysState.keys || []).length;
      if (cnt === 0) { showToast("Kh\u00f4ng c\u00f3 Key H\u1ec7 th\u1ed1ng n\u00e0o trong DB \u0111\u1ec3 x\u00f3a.", "info"); return; }
      const openModalFn = window.UETConverter && window.UETConverter.openTypedDeleteAllModal;
      if (typeof openModalFn === "function") {
        openModalFn(cnt, async function () {
          sysKeysState.busy = true;
          renderAdmin();
          const resp = await adminSystemKeysFetch("", "DELETE", { confirm: "XOA" });
          sysKeysState.busy = false;
          if (resp._err) {
            showToast("L\u1ed7i x\u00f3a to\u00e0n b\u1ed9 Key: " + resp._err, "error");
          } else if (resp.data) {
            sysKeysState.keys = [];
            sysKeysState.preview = null;
            sysKeysState.auditLogs = Array.isArray(resp.data.auditLogs) ? resp.data.auditLogs : sysKeysState.auditLogs;
            showToast("\u0110\u00e3 x\u00f3a to\u00e0n b\u1ed9 " + (resp.data.deletedCount || cnt) + " Key H\u1ec7 th\u1ed1ng.", "info");
          }
          renderAdmin();
        });
      }
    } else if (act === "syskey-toggle") {
      const id = b.getAttribute("data-id");
      const curEn = b.getAttribute("data-enabled") === "1";
      if (!id) return;
      sysKeysState.busy = true;
      renderAdmin();
      const resp = await adminSystemKeysFetch("/" + encodeURIComponent(id), "PATCH", { enabled: !curEn });
      sysKeysState.busy = false;
      if (resp._err) {
        showToast("L\u1ed7i: " + resp._err, "error");
      } else if (resp.data) {
        sysKeysState.keys = Array.isArray(resp.data.keys) ? resp.data.keys : sysKeysState.keys;
        sysKeysState.auditLogs = Array.isArray(resp.data.auditLogs) ? resp.data.auditLogs : sysKeysState.auditLogs;
      }
      renderAdmin();
    } else if (act === "syskey-reset") {
      const id = b.getAttribute("data-id");
      if (!id) return;
      sysKeysState.busy = true;
      renderAdmin();
      const resp = await adminSystemKeysFetch("/" + encodeURIComponent(id), "PATCH", { resetStatus: true });
      sysKeysState.busy = false;
      if (resp._err) {
        showToast("L\u1ed7i: " + resp._err, "error");
      } else if (resp.data) {
        sysKeysState.keys = Array.isArray(resp.data.keys) ? resp.data.keys : sysKeysState.keys;
        sysKeysState.auditLogs = Array.isArray(resp.data.auditLogs) ? resp.data.auditLogs : sysKeysState.auditLogs;
        showToast("\u0110\u00e3 \u0111\u1eb7t l\u1ea1i tr\u1ea1ng th\u00e1i Healthy cho Key.", "success");
      }
      renderAdmin();
    } else if (act === "syskey-delete") {
      const id = b.getAttribute("data-id");
      const masked = b.getAttribute("data-masked") || id;
      if (!id) return;
      showConfirm("X\u00f3a System Key", "X\u00f3a v\u0129nh vi\u1ec5n System Key " + masked + "?", async function () {
        sysKeysState.busy = true;
        renderAdmin();
        const resp = await adminSystemKeysFetch("/" + encodeURIComponent(id), "DELETE");
        sysKeysState.busy = false;
        if (resp._err) {
          showToast("L\u1ed7i: " + resp._err, "error");
        } else if (resp.data) {
          sysKeysState.keys = Array.isArray(resp.data.keys) ? resp.data.keys : sysKeysState.keys;
          sysKeysState.auditLogs = Array.isArray(resp.data.auditLogs) ? resp.data.auditLogs : sysKeysState.auditLogs;
          showToast("\u0110\u00e3 x\u00f3a System Key " + masked + ".", "info");
        }
        renderAdmin();
      });
    } else if (act === "export-backup") {
      const rawApis = loadObj(KEYS.userApis);
      const maskedUserApis = {};
      Object.keys(rawApis).forEach(function (em) {
        const it = rawApis[em];
        if (it && typeof it === "object") {
          maskedUserApis[em] = {
            email: it.email || em,
            maskedKey: it.maskedKey || maskApiKeyDisplay(it.apiKey || ""),
            model: it.model || "gemini-2.5-flash",
            updatedAt: it.updatedAt || ""
          };
        }
      });
      const data = {
        exportedAt: new Date().toISOString(),
        registeredUsers: loadObj(KEYS.users),
        subscriptions: loadObj(KEYS.subs),
        userApis: maskedUserApis,
        payment_requests: loadArr(KEYS.payReqs),
        vouchers: getVouchers(),
        paymentConfig: getPayCfg()
      };
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "ai_tutor_backup_" + new Date().toISOString().slice(0, 10) + ".json");
    }
  } catch (err) { showToast("\u0110\u00e3 x\u1ea3y ra l\u1ed7i khi th\u1ef1c hi\u1ec7n thao t\u00e1c qu\u1ea3n tr\u1ecb.", "error"); }
}
function onAdminChange(e) {
  if (!isAdmin() || !e.target) return;
  if (e.target.id === "admStatusFilter") { state.adminStatusFilter = e.target.value; renderAdminRequestsTable(); }
  else if (e.target.id === "admPlanFilter") { state.adminPlanFilter = e.target.value; renderAdminRequestsTable(); }
  else if (e.target.id === "admMemberSort") { state.adminMemberSort = e.target.value; renderAdminMembersTable(); }
}
function onAdminInput(e) {
  if (!e.target) return;
  if (e.target.id === "admQuery") { state.adminQuery = e.target.value; renderAdminRequestsTable(); }
  else if (e.target.id === "admMemberQuery") { state.adminMemberQuery = e.target.value; renderAdminMembersTable(); }
  else if (e.target.id === "sysKeysRawInput") { sysKeysState.rawDraft = e.target.value; }
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
  if (u.className) meta += '<span class="badge">L\u1edbp/Khoa: ' + esc(u.className) + "</span>";
  if (u.targetGoal) meta += '<span class="badge badge-ok">🎯 ' + esc(u.targetGoal) + "</span>";
  if (!meta) meta = '<span class="muted">H\u00e3y c\u1eadp nh\u1eadt h\u1ed3 s\u01a1 \u0111\u1ec3 c\u00e1 nh\u00e2n h\u00f3a tr\u1ea3i nghi\u1ec7m h\u1ecdc t\u1eadp.</span>';
  el.innerHTML = '<img class="avatar avatar-lg" id="greetAvatar" alt="\u1ea2nh \u0111\u1ea1i di\u1ec7n"><div class="greet-text"><h2>Xin ch\u00e0o, ' + esc(u.name) + ' 👋</h2><div class="greet-meta">' + meta +
    '</div></div><button type="button" class="btn btn-outline btn-sm" data-action="edit-profile">S\u1eeda h\u1ed3 s\u01a1</button>';
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
  if (!/^https?:\/\/\S+$/i.test(v)) { showToast("Vui l\u00f2ng nh\u1eadp \u0111\u01b0\u1eddng d\u1eabn \u1ea3nh h\u1ee3p l\u1ec7.", "warning"); return; }
  const im = new Image();
  im.onload = function () { state.profDraft.customAvatar = v; updateProfPreview(); };
  im.onerror = function () { showToast("Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c \u1ea3nh t\u1eeb \u0111\u01b0\u1eddng d\u1eabn n\u00e0y.", "error"); };
  im.src = v;
}
function onAvatarFile(e) {
  const f = e.target && e.target.files ? e.target.files[0] : null;
  if (!f || !state.profDraft) return;
  if (!/^image\//.test(f.type)) { showToast("Vui l\u00f2ng ch\u1ecdn m\u1ed9t file \u1ea3nh.", "warning"); return; }
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
      } catch (err) { showToast("Kh\u00f4ng th\u1ec3 x\u1eed l\u00fd \u1ea3nh \u0111\u00e3 ch\u1ecdn.", "error"); }
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
  showToast("\u0110\u00e3 kh\u00f4i ph\u1ee5c \u1ea3nh Google g\u1ed1c (nh\u1ea5n L\u01b0u \u0111\u1ec3 \u00e1p d\u1ee5ng).", "info");
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
  const expText = isAdmin() ? "To\u00e0n quy\u1ec1n kh\u00f4ng gi\u1edbi h\u1ea1n" : (sub && tier !== "unranked" ? ("H\u1ebft h\u1ea1n: " + fmtDate(sub.expires)) : (tier === "unranked" ? "Mi\u1ec5n ph\u00ed 0\u0111/n\u0103m" : "Ch\u01b0a \u0111\u0103ng k\u00fd g\u00f3i"));

  root.innerHTML =
    '<div class="api-wrap">' +
      '<section class="panel">' +
        '<div class="panel-head"><div><h2>👤 H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n</h2><p class="muted" style="margin:0;font-size:.84rem">' + esc(state.user.email) + '</p></div>' +
        '<span class="tier-badge ' + (isAdmin() ? "rank-diamond" : info.cls) + '">' + esc(badgeText) + '</span></div>' +
        '<div class="avatar-edit" style="margin:12px 0 16px">' +
          '<img id="profPageAvatar" class="avatar avatar-xl" alt="\u1ea2nh \u0111\u1ea1i di\u1ec7n" referrerpolicy="no-referrer">' +
          '<div class="avatar-tools">' +
            '<div><strong>' + esc(u.name) + '</strong></div>' +
            '<div class="muted" style="font-size:.82rem">' + esc(expText) + '</div>' +
            '<div class="deck-actions">' +
              '<button type="button" class="btn btn-primary btn-sm" id="profPageOpenEdit">✏️ Ch\u1ec9nh s\u1eeda h\u1ed3 s\u01a1 &amp; \u1ea2nh \u0111\u1ea1i di\u1ec7n</button>' +
              '<button type="button" class="btn btn-outline btn-sm" id="profPageGoPricing">🏆 G\u00f3i n\u00e2ng c\u1ea5p</button>' +
              '<button type="button" class="btn btn-outline btn-sm" id="profPageGoBackup">☁️ Sao l\u01b0u d\u1eef li\u1ec7u</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<dl class="pay-info">' +
          '<dt>T\u00ean hi\u1ec3n th\u1ecb</dt><dd>' + esc(u.name) + '</dd>' +
          '<dt>Email Google</dt><dd>' + esc(state.user.email) + '</dd>' +
          '<dt>API AI</dt><dd>' + ((window.UETConverter && typeof window.UETConverter.hasPersonalKeys === "function" && window.UETConverter.hasPersonalKeys()) ? '<span class="badge badge-ok">\u0110ang d\u00f9ng Key c\u00e1 nh\u00e2n</span>' : '<span class="badge">🌐 System Default Pool (Mi\u1ec5n ph\u00ed)</span>') + '</dd>' +
          '<dt>M\u00e3 sinh vi\u00ean</dt><dd>' + esc(u.studentId || "Ch\u01b0a c\u1eadp nh\u1eadt") + '</dd>' +
          '<dt>L\u1edbp / Khoa</dt><dd>' + esc(u.className || "Ch\u01b0a c\u1eadp nh\u1eadt") + '</dd>' +
          '<dt>M\u1ee5c ti\u00eau h\u1ecdc t\u1eadp</dt><dd>' + esc(u.targetGoal || "Ch\u01b0a c\u1eadp nh\u1eadt") + '</dd>' +
        '</dl>' +
        '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">' +
          '<div class="panel-head" style="margin-bottom:8px"><div><h3 style="margin:0;font-size:1rem">Ng\u00f4n ng\u1eef giao di\u1ec7n</h3><p class="muted" style="margin:2px 0 0;font-size:.8rem">Chuy\u1ec3n \u0111\u1ed5i qua l\u1ea1i gi\u1eefa Ti\u1ebfng Vi\u1ec7t, Ti\u1ebfng Anh v\u00e0 Ti\u1ebfng Nh\u1eadt (gi\u1eef nguy\u00ean ph\u00f4ng ch\u1eef).</p></div></div>' +
          '<div class="seg" role="group" aria-label="Ch\u1ecdn ng\u00f4n ng\u1eef">' +
            '<button type="button" class="seg-btn' + (curLang === "vi" ? " active" : "") + '" data-lang="vi">VI</button>' +
            '<button type="button" class="seg-btn' + (curLang === "en" ? " active" : "") + '" data-lang="en">EN</button>' +
            '<button type="button" class="seg-btn' + (curLang === "ja" ? " active" : "") + '" data-lang="ja">JA</button>' +
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
  showToast("\u0110\u00e3 l\u01b0u h\u1ed3 s\u01a1 c\u1ee7a b\u1ea1n.", "success");
}
function copyText(text, label) {
  const msg = "\u0110\u00e3 sao ch\u00e9p " + (label || "n\u1ed9i dung") + ".";
  const fallback = function () {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      showToast(ok ? msg : "Kh\u00f4ng th\u1ec3 sao ch\u00e9p.", ok ? "success" : "warning");
    } catch (e) { showToast("Kh\u00f4ng th\u1ec3 sao ch\u00e9p.", "warning"); }
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
/* BEGIN_VI_TRANSLATION_DICTIONARY */
/* BEGIN_VI_TRANSLATION_DICTIONARY */
/* BEGIN_VI_TRANSLATION_DICTIONARY */
/* BEGIN_VI_TRANSLATION_DICTIONARY */
/* BEGIN_VI_TRANSLATION_DICTIONARY */
/* BEGIN_VI_TRANSLATION_DICTIONARY */
/* BEGIN_VI_TRANSLATION_DICTIONARY */
/* BEGIN_VI_TRANSLATION_DICTIONARY */
const I18N_MAP = {
  "AI Tutor – Nền tảng Ôn luyện, Creator Studio & AI Converter": { vi: "AI Tutor – Nền tảng Ôn luyện, Creator Studio & AI Converter", en: "AI Tutor – Practice Platform, Creator Studio & AI Converter", ja: "AI Tutor – オンライン学習・クリエイタースタジオ・AI変換" },
  "AI Tutor by Phạm Đức Hiếu: Nền tảng ôn luyện, thi thử trực tuyến.": { vi: "AI Tutor by Phạm Đức Hiếu: Nền tảng ôn luyện, thi thử trực tuyến.", en: "AI Tutor by Pham Duc Hieu: Online practice & mock exam platform.", ja: "AI Tutor by Pham Duc Hieu: オンライン学習・模擬試験プラットフォーム。" },
  "Đăng nhập | AI Tutor": { vi: "Đăng nhập | AI Tutor", en: "Sign In | AI Tutor", ja: "ログイン | AI Tutor" },
  "Tổng quan | AI Tutor": { vi: "Tổng quan | AI Tutor", en: "Overview | AI Tutor", ja: "概要 | AI Tutor" },
  "Ôn tập & Thi | AI Tutor": { vi: "Ôn tập & Thi | AI Tutor", en: "Practice & Exam | AI Tutor", ja: "演習・試験 | AI Tutor" },
  "Đang làm bài | AI Tutor": { vi: "Đang làm bài | AI Tutor", en: "In Session | AI Tutor", ja: "演習中 | AI Tutor" },
  "Creator Studio | AI Tutor": { vi: "Creator Studio | AI Tutor", en: "Creator Studio | AI Tutor", ja: "クリエイタースタジオ | AI Tutor" },
  "Trình soạn thảo Quiz | AI Tutor": { vi: "Trình soạn thảo Quiz | AI Tutor", en: "Quiz Editor | AI Tutor", ja: "クイズエディター | AI Tutor" },
  "Cài đặt Quiz | AI Tutor": { vi: "Cài đặt Quiz | AI Tutor", en: "Quiz Lobby | AI Tutor", ja: "クイズ設定 | AI Tutor" },
  "Đang chơi Quiz | AI Tutor": { vi: "Đang chơi Quiz | AI Tutor", en: "Playing Quiz | AI Tutor", ja: "クイズプレイ中 | AI Tutor" },
  "Tổng kết Quiz | AI Tutor": { vi: "Tổng kết Quiz | AI Tutor", en: "Quiz Summary | AI Tutor", ja: "クイズ結果 | AI Tutor" },
  "AI Converter | AI Tutor": { vi: "AI Converter | AI Tutor", en: "AI Converter | AI Tutor", ja: "AI変換 | AI Tutor" },
  "Kiểm duyệt song song | AI Tutor": { vi: "Kiểm duyệt song song | AI Tutor", en: "Split-Screen Review | AI Tutor", ja: "並列レビュー | AI Tutor" },
  "Lật thẻ | AI Tutor": { vi: "Lật thẻ | AI Tutor", en: "Flashcards | AI Tutor", ja: "フラッシュカード | AI Tutor" },
  "Đang học Lật thẻ | AI Tutor": { vi: "Đang học Lật thẻ | AI Tutor", en: "Studying Flashcards | AI Tutor", ja: "フラッシュカード学習中 | AI Tutor" },
  "Sổ tay câu hay sai | AI Tutor": { vi: "Sổ tay câu hay sai | AI Tutor", en: "Mistake Notebook | AI Tutor", ja: "間違いノート | AI Tutor" },
  "Hồ sơ cá nhân | AI Tutor": { vi: "Hồ sơ cá nhân | AI Tutor", en: "Profile | AI Tutor", ja: "プロフィール | AI Tutor" },
  "Gói nâng cấp | AI Tutor": { vi: "Gói nâng cấp | AI Tutor", en: "Upgrade Plans | AI Tutor", ja: "プランアップグレード | AI Tutor" },
  "Cài đặt Gemini API | AI Tutor": { vi: "Cài đặt Gemini API | AI Tutor", en: "Gemini API Settings | AI Tutor", ja: "Gemini API 設定 | AI Tutor" },
  "Sao lưu & Khôi phục | AI Tutor": { vi: "Sao lưu & Khôi phục | AI Tutor", en: "Backup & Restore | AI Tutor", ja: "バックアップと復元 | AI Tutor" },
  "Quản trị duyệt đơn | AI Tutor": { vi: "Quản trị duyệt đơn | AI Tutor", en: "Admin Panel | AI Tutor", ja: "管理パネル | AI Tutor" },
  "Quản trị – Duyệt thanh toán | AI Tutor": { vi: "Quản trị – Duyệt thanh toán | AI Tutor", en: "Admin – Payment Approvals | AI Tutor", ja: "管理 – 支払い承認 | AI Tutor" },
  "Quản trị – Thành viên | AI Tutor": { vi: "Quản trị – Thành viên | AI Tutor", en: "Admin – Members | AI Tutor", ja: "管理 – メンバー管理 | AI Tutor" },
  "Quản trị – Cấu hình VietQR | AI Tutor": { vi: "Quản trị – Cấu hình VietQR | AI Tutor", en: "Admin – VietQR Config | AI Tutor", ja: "管理 – VietQR設定 | AI Tutor" },
  "Quản trị – Mã giảm giá | AI Tutor": { vi: "Quản trị – Mã giảm giá | AI Tutor", en: "Admin – Discount Codes | AI Tutor", ja: "管理 – 割引クーポン | AI Tutor" },
  "Quản trị – Sao lưu hệ thống | AI Tutor": { vi: "Quản trị – Sao lưu hệ thống | AI Tutor", en: "Admin – System Backup | AI Tutor", ja: "管理 – システムバックアップ | AI Tutor" },
  "Làm bài chia sẻ | AI Tutor": { vi: "Làm bài chia sẻ | AI Tutor", en: "Shared Quiz | AI Tutor", ja: "共有クイズ | AI Tutor" },
  "Tổng quan": { vi: "Tổng quan", en: "Overview", ja: "概要" },
  "🏠 Tổng quan": { vi: "🏠 Tổng quan", en: "🏠 Overview", ja: "🏠 概要" },
  "Ôn tập & Thi": { vi: "Ôn tập & Thi", en: "Practice & Exam", ja: "演習・試験" },
  "📝 Ôn tập & Thi": { vi: "📝 Ôn tập & Thi", en: "📝 Practice & Exam", ja: "📝 演習・試験" },
  "Creator Studio": { vi: "Creator Studio", en: "Creator Studio", ja: "クリエイタースタジオ" },
  "🎮 Creator Studio": { vi: "🎮 Creator Studio", en: "🎮 Creator Studio", ja: "🎮 クリエイタースタジオ" },
  "AI Converter": { vi: "AI Converter", en: "AI Converter", ja: "AI変換" },
  "✨ AI Converter": { vi: "✨ AI Converter", en: "✨ AI Converter", ja: "✨ AI変換" },
  "✨ Mở AI Converter": { vi: "✨ Mở AI Converter", en: "✨ Open AI Converter", ja: "✨ AI変換 を開く" },
  "Lật thẻ": { vi: "Lật thẻ", en: "Flashcards", ja: "フラッシュカード" },
  "🃏 Lật thẻ": { vi: "🃏 Lật thẻ", en: "🃏 Flashcards", ja: "🃏 フラッシュカード" },
  "Sổ tay sai": { vi: "Sổ tay sai", en: "Mistake Notebook", ja: "間違いノート" },
  "📕 Sổ tay sai": { vi: "📕 Sổ tay sai", en: "📕 Mistake Notebook", ja: "📕 間違いノート" },
  "Sổ tay câu hay sai": { vi: "Sổ tay câu hay sai", en: "Mistake Notebook", ja: "間違いノート" },
  "👤 Hồ sơ cá nhân": { vi: "👤 Hồ sơ cá nhân", en: "👤 Profile", ja: "👤 プロフィール" },
  "Hồ sơ cá nhân": { vi: "Hồ sơ cá nhân", en: "Profile", ja: "プロフィール" },
  "🏆 Gói nâng cấp": { vi: "🏆 Gói nâng cấp", en: "🏆 Upgrade Plans", ja: "🏆 プランアップグレード" },
  "Gói nâng cấp": { vi: "Gói nâng cấp", en: "Upgrade Plans", ja: "プランアップグレード" },
  "🔑 Cài đặt API & Ngôn ngữ": { vi: "🔑 Cài đặt API & Ngôn ngữ", en: "🔑 API & Language Settings", ja: "🔑 API・言語設定" },
  "🔑 Cài đặt API (Gemini)": { vi: "🔑 Cài đặt API (Gemini)", en: "🔑 API Settings (Gemini)", ja: "🔑 API設定 (Gemini)" },
  "☁️ Sao lưu & Khôi phục dữ liệu": { vi: "☁️ Sao lưu & Khôi phục dữ liệu", en: "☁️ Backup & Restore Data", ja: "☁️ バックアップと復元" },
  "☁️ Sao lưu & Khôi phục": { vi: "☁️ Sao lưu & Khôi phục", en: "☁️ Backup & Restore", ja: "☁️ バックアップと復元" },
  "Sao lưu & Khôi phục": { vi: "Sao lưu & Khôi phục", en: "Backup & Restore", ja: "バックアップと復元" },
  "☁️ Sao lưu dữ liệu": { vi: "☁️ Sao lưu dữ liệu", en: "☁️ Data Backup", ja: "☁️ データバックアップ" },
  "🛡️ Quản trị duyệt đơn (Admin Panel)": { vi: "🛡️ Quản trị duyệt đơn (Admin Panel)", en: "🛡️ Admin Panel", ja: "🛡️ 管理パネル" },
  "🛡️ Quản trị duyệt đơn": { vi: "🛡️ Quản trị duyệt đơn", en: "🛡️ Admin Panel", ja: "🛡️ 管理パネル" },
  "🚪 Đăng xuất": { vi: "🚪 Đăng xuất", en: "🚪 Sign Out", ja: "🚪 ログアウト" },
  "🌐 Ngôn ngữ": { vi: "🌐 Ngôn ngữ", en: "🌐 Language", ja: "🌐 言語" },
  "Ngôn ngữ": { vi: "Ngôn ngữ", en: "Language", ja: "言語" },
  "Chọn ngôn ngữ": { vi: "Chọn ngôn ngữ", en: "Select language", ja: "言語を選択" },
  "☁️ Đã đồng bộ": { vi: "☁️ Đã đồng bộ", en: "☁️ Synced", ja: "☁️ 同期済み" },
  "🔄 Đang đồng bộ...": { vi: "🔄 Đang đồng bộ...", en: "🔄 Syncing...", ja: "🔄 同期中..." },
  "🔄 Đang lưu...": { vi: "🔄 Đang lưu...", en: "🔄 Saving...", ja: "🔄 保存中..." },
  "Đang lưu": { vi: "Đang lưu", en: "Saving", ja: "保存中" },
  "Mở menu điều hướng": { vi: "Mở menu điều hướng", en: "Open navigation menu", ja: "ナビゲーションメニューを開く" },
  "Về trang Tổng quan": { vi: "Về trang Tổng quan", en: "Go to Overview", ja: "概要へ戻る" },
  "Điều hướng học tập chính": { vi: "Điều hướng học tập chính", en: "Main learning navigation", ja: "メイン学習ナビゲーション" },
  "Trạng thái đồng bộ dữ liệu": { vi: "Trạng thái đồng bộ dữ liệu", en: "Data sync status", ja: "データ同期ステータス" },
  "Cỡ chữ câu hỏi": { vi: "Cỡ chữ câu hỏi", en: "Question font size", ja: "問題の文字サイズ" },
  "Giảm cỡ chữ câu hỏi": { vi: "Giảm cỡ chữ câu hỏi", en: "Decrease question font size", ja: "問題の文字サイズを縮小" },
  "Giảm cỡ chữ": { vi: "Giảm cỡ chữ", en: "Decrease font size", ja: "文字サイズを縮小" },
  "Tăng cỡ chữ câu hỏi": { vi: "Tăng cỡ chữ câu hỏi", en: "Increase question font size", ja: "問題の文字サイズを拡大" },
  "Tăng cỡ chữ": { vi: "Tăng cỡ chữ", en: "Increase font size", ja: "文字サイズを拡大" },
  "Chuyển chế độ Sáng/Tối": { vi: "Chuyển chế độ Sáng/Tối", en: "Toggle Light/Dark mode", ja: "ライト/ダークモード切替" },
  "Mở menu tài khoản": { vi: "Mở menu tài khoản", en: "Open account menu", ja: "アカウントメニューを開く" },
  "Ảnh đại diện": { vi: "Ảnh đại diện", en: "Avatar", ja: "アバター" },
  "Có đơn chờ duyệt": { vi: "Có đơn chờ duyệt", en: "Pending requests awaiting approval", ja: "承認待ちのリクエストがあります" },
  "Menu di động": { vi: "Menu di động", en: "Mobile menu", ja: "モバイルメニュー" },
  "Đóng menu": { vi: "Đóng menu", en: "Close menu", ja: "メニューを閉じる" },
  "Hỗ trợ trực tiếp qua Messenger": { vi: "Hỗ trợ trực tiếp qua Messenger", en: "Live Support via Messenger", ja: "Messenger でライブサポート" },
  "Hỗ trợ trực tiếp": { vi: "Hỗ trợ trực tiếp", en: "Live Support", ja: "ライブサポート" },
  "Đã cấu hình Gemini API Key": { vi: "Đã cấu hình Gemini API Key", en: "Gemini API Key configured", ja: "Gemini API Key 設定済み" },
  "Chưa cấu hình Gemini API Key": { vi: "Chưa cấu hình Gemini API Key", en: "Gemini API Key not configured", ja: "Gemini API Key 未設定" },
  "Nền tảng ôn tập, thi thử trực tuyến được phát triển bởi Phạm Đức Hiếu.": { vi: "Nền tảng ôn tập, thi thử trực tuyến được phát triển bởi Phạm Đức Hiếu.", en: "Online practice & mock exam platform developed by Pham Duc Hieu.", ja: "Pham Duc Hieu によって開発されたオンライン学習・模擬試験プラットフォーム。" },
  "Vui lòng đăng nhập bằng tài khoản Google của bạn để tiếp tục.": { vi: "Vui lòng đăng nhập bằng tài khoản Google của bạn để tiếp tục.", en: "Please sign in with your Google account to continue.", ja: "続行するには Google アカウントでログインしてください。" },
  "Hoặc có": { vi: "Hoặc có", en: "Or have a", ja: "または" },
  "Mã đề chia sẻ": { vi: "Mã đề chia sẻ", en: "Shared Quiz Code", ja: "共有クイズコード" },
  "? Vào làm bài ngay:": { vi: "? Vào làm bài ngay:", en: "? Join immediately:", ja: "をお持ちですか？今すぐ参加:" },
  "Nhập mã đề (VD: AIT-8392)": { vi: "Nhập mã đề (VD: AIT-8392)", en: "Enter code (e.g. AIT-8392)", ja: "コードを入力 (例: AIT-8392)" },
  "Nhập mã đề (AIT-...)": { vi: "Nhập mã đề (AIT-...)", en: "Enter code (AIT-...)", ja: "コードを入力 (AIT-...)" },
  "Nhập mã đề chia sẻ": { vi: "Nhập mã đề chia sẻ", en: "Enter shared quiz code", ja: "共有クイズコードを入力" },
  "Vào làm bài": { vi: "Vào làm bài", en: "Join Quiz", ja: "クイズに参加" },
  "Lưu ý quan trọng:": { vi: "Lưu ý quan trọng:", en: "Important Notice:", ja: "重要なお知らせ:" },
  "Dữ liệu bộ đề cá nhân, tiến độ làm bài (Auto-save) và Sổ tay câu hay sai được lưu trực tiếp trên trình duyệt này và hỗ trợ sao lưu Google Drive / JSON. Vui lòng không xóa cache trình duyệt hoặc hãy sao lưu định kỳ trong mục": { vi: "Dữ liệu bộ đề cá nhân, tiến độ làm bài (Auto-save) và Sổ tay câu hay sai được lưu trực tiếp trên trình duyệt này và hỗ trợ sao lưu Google Drive / JSON. Vui lòng không xóa cache trình duyệt hoặc hãy sao lưu định kỳ trong mục", en: "Your personal decks, study progress (Auto-save), and Mistake Notebook are saved locally in this browser with Google Drive / JSON backup support. Please avoid clearing browser cache or back up regularly in", ja: "個人の問題集、学習進捗（自動保存）、間違いノートはこのブラウザに保存され、Google Drive / JSON バックアップに対応しています。ブラウザのキャッシュを削除しないか、定期的に次のメニューでバックアップしてください：" },
  "Đăng nhập thất bại! Tài khoản Google chưa được xác minh email. Vui lòng thử lại bằng tài khoản khác.": { vi: "Đăng nhập thất bại! Tài khoản Google chưa được xác minh email. Vui lòng thử lại bằng tài khoản khác.", en: "Sign-in failed! Your Google account email is not verified. Please try another account.", ja: "ログインに失敗しました。Google アカウントのメールが未確認です。別のアカウントでお試しください。" },
  "Đăng nhập thất bại. Vui lòng thử lại.": { vi: "Đăng nhập thất bại. Vui lòng thử lại.", en: "Sign-in failed. Please try again.", ja: "ログインに失敗しました。もう一度お試しください。" },
  "Không thể khởi tạo đăng nhập Google. Vui lòng tải lại trang.": { vi: "Không thể khởi tạo đăng nhập Google. Vui lòng tải lại trang.", en: "Could not initialize Google Sign-In. Please reload the page.", ja: "Google ログインを初期化できませんでした。ページを再読み込みしてください。" },
  "Không tải được dịch vụ đăng nhập Google. Vui lòng kiểm tra kết nối mạng và tải lại trang.": { vi: "Không tải được dịch vụ đăng nhập Google. Vui lòng kiểm tra kết nối mạng và tải lại trang.", en: "Failed to load Google Sign-In service. Please check your network and reload.", ja: "Google ログインサービスを読み込めませんでした。通信環境を確認して再読み込みしてください。" },
  "🔗 Tham gia bộ đề bằng Mã đề": { vi: "🔗 Tham gia bộ đề bằng Mã đề", en: "🔗 Join Deck via Share Code", ja: "🔗 共有コードで問題集に参加" },
  "Nhập mã chia sẻ (VD:": { vi: "Nhập mã chia sẻ (VD:", en: "Enter share code (e.g.", ja: "共有コード (例:" },
  ") để vào thẳng Quiz Lobby làm bài ngay.": { vi: ") để vào thẳng Quiz Lobby làm bài ngay.", en: ") to enter Quiz Lobby and start immediately.", ja: ") を入力してすぐにクイズロビーへ参加できます。" },
  "Đề đã luyện": { vi: "Đề đã luyện", en: "Decks Practiced", ja: "学習済みセット" },
  "Câu hỏi đã làm": { vi: "Câu hỏi đã làm", en: "Questions Answered", ja: "回答済み問題数" },
  "Trả lời đúng": { vi: "Trả lời đúng", en: "Correct Answers", ja: "正解数" },
  "Tỷ lệ chính xác (%)": { vi: "Tỷ lệ chính xác (%)", en: "Accuracy Rate (%)", ja: "正答率 (%)" },
  "Kho đề của bạn": { vi: "Kho đề của bạn", en: "Your Question Decks", ja: "マイ問題集" },
  "+ Nhập đề từ Excel": { vi: "+ Nhập đề từ Excel", en: "+ Import from Excel", ja: "+ Excel からインポート" },
  "Tìm kiếm bộ đề...": { vi: "Tìm kiếm bộ đề...", en: "Search decks...", ja: "問題集を検索..." },
  "Tìm kiếm bộ đề": { vi: "Tìm kiếm bộ đề", en: "Search decks", ja: "問題集を検索" },
  "Gói kích hoạt & Lịch sử thi": { vi: "Gói kích hoạt & Lịch sử thi", en: "Active Plan & Exam History", ja: "有効プランと試験履歴" },
  "Tìm kiếm lịch sử thi...": { vi: "Tìm kiếm lịch sử thi...", en: "Search exam history...", ja: "試験履歴を検索..." },
  "Tìm kiếm lịch sử thi": { vi: "Tìm kiếm lịch sử thi", en: "Search exam history", ja: "試験履歴を検索" },
  "Biểu đồ & Phân tích kết quả": { vi: "Biểu đồ & Phân tích kết quả", en: "Performance Chart & Analytics", ja: "成績グラフと分析" },
  "Khoảng thời gian": { vi: "Khoảng thời gian", en: "Time range", ja: "期間" },
  "Tuần": { vi: "Tuần", en: "Week", ja: "週間" },
  "Tháng": { vi: "Tháng", en: "Month", ja: "月間" },
  "Tất cả": { vi: "Tất cả", en: "All", ja: "すべて" },
  "Bạn chưa có bộ đề nào. Nhập từ Excel hoặc chuyển đề thi ngay bằng AI Converter!": { vi: "Bạn chưa có bộ đề nào. Nhập từ Excel hoặc chuyển đề thi ngay bằng AI Converter!", en: "You don't have any question decks yet. Import from Excel or convert exam files now with AI Converter!", ja: "問題集がまだありません。Excel からインポートするか、AI変換 で試験ファイルを変換しましょう！" },
  "Không tìm thấy bộ đề phù hợp.": { vi: "Không tìm thấy bộ đề phù hợp.", en: "No matching question decks found.", ja: "一致する問題集が見つかりませんでした。" },
  "Xem chi tiết": { vi: "Xem chi tiết", en: "View Details", ja: "詳細を見る" },
  "Ôn tập": { vi: "Ôn tập", en: "Practice", ja: "練習" },
  "Tiếp tục ôn tập": { vi: "Tiếp tục ôn tập", en: "Resume Practice", ja: "練習を再開" },
  "Thi thử": { vi: "Thi thử", en: "Mock Exam", ja: "模擬試験" },
  "🔒 Thi thử": { vi: "🔒 Thi thử", en: "🔒 Mock Exam", ja: "🔒 模擬試験" },
  "Quiz Studio": { vi: "Quiz Studio", en: "Quiz Studio", ja: "クイズスタジオ" },
  "🔗 Chia sẻ": { vi: "🔗 Chia sẻ", en: "🔗 Share", ja: "🔗 共有" },
  "Chia sẻ bằng Link, Mã đề & QR": { vi: "Chia sẻ bằng Link, Mã đề & QR", en: "Share via Link, Code & QR", ja: "リンク・コード・QRで共有" },
  "🖨️ Xuất PDF": { vi: "🖨️ Xuất PDF", en: "🖨️ Export PDF", ja: "🖨️ PDF出力" },
  "Xuất PDF để in chuẩn A4": { vi: "Xuất PDF để in chuẩn A4", en: "Export A4 print-ready PDF", ja: "A4印刷用PDFとして出力" },
  "Xuất .json": { vi: "Xuất .json", en: "Export .json", ja: ".json 出力" },
  "🔒 Xuất .json": { vi: "🔒 Xuất .json", en: "🔒 Export .json", ja: "🔒 .json 出力" },
  "Xuất bộ đề ra file .json": { vi: "Xuất bộ đề ra file .json", en: "Export deck to .json file", ja: "問題集を .json に出力" },
  "Xuất .xlsx": { vi: "Xuất .xlsx", en: "Export .xlsx", ja: ".xlsx 出力" },
  "🔒 Xuất .xlsx": { vi: "🔒 Xuất .xlsx", en: "🔒 Export .xlsx", ja: "🔒 .xlsx 出力" },
  "Xuất bộ đề ra file .xlsx": { vi: "Xuất bộ đề ra file .xlsx", en: "Export deck to .xlsx file", ja: "問題集を .xlsx に出力" },
  "Xuất CSV": { vi: "Xuất CSV", en: "Export CSV", ja: "CSV 出力" },
  "Xóa": { vi: "Xóa", en: "Delete", ja: "削除" },
  "Xóa bộ đề này": { vi: "Xóa bộ đề này", en: "Delete this deck", ja: "この問題集を削除" },
  "Bỏ ghim bộ đề": { vi: "Bỏ ghim bộ đề", en: "Unpin deck", ja: "ピン留め解除" },
  "Ghim bộ đề lên đầu": { vi: "Ghim bộ đề lên đầu", en: "Pin deck to top", ja: "上部にピン留め" },
  "· Toàn quyền không giới hạn": { vi: "· Toàn quyền không giới hạn", en: "· Full Unlimited Access", ja: "· 全機能無制限アクセス" },
  "Toàn quyền không giới hạn": { vi: "Toàn quyền không giới hạn", en: "Full Unlimited Access", ja: "全機能無制限アクセス" },
  "· Gói miễn phí 0đ/năm": { vi: "· Gói miễn phí 0đ/năm", en: "· Free Plan (0 VND/year)", ja: "· 無料プラン (0 VND/年)" },
  "Miễn phí 0đ/năm": { vi: "Miễn phí 0đ/năm", en: "Free Plan (0 VND/year)", ja: "無料プラン (0 VND/年)" },
  "• Miễn phí 0đ/năm": { vi: "• Miễn phí 0đ/năm", en: "• Free Plan (0 VND/year)", ja: "• 無料プラン (0 VND/年)" },
  "· Chưa đăng ký gói (Đăng ký Unranked 0đ miễn phí)": { vi: "· Chưa đăng ký gói (Đăng ký Unranked 0đ miễn phí)", en: "· No active plan (Register Free Unranked 0 VND)", ja: "· プラン未登録（無料 Unranked プランに登録可能）" },
  "Chưa đăng ký gói": { vi: "Chưa đăng ký gói", en: "No active plan", ja: "プラン未登録" },
  "Chưa có lịch sử thi thử.": { vi: "Chưa có lịch sử thi thử.", en: "No mock exam history yet.", ja: "模擬試験の履歴はまだありません。" },
  "Biểu đồ điểm thi gần đây": { vi: "Biểu đồ điểm thi gần đây", en: "Recent Exam Score Chart", ja: "最近の試験スコアグラフ" },
  "Hãy cập nhật hồ sơ để cá nhân hóa trải nghiệm học tập.": { vi: "Hãy cập nhật hồ sơ để cá nhân hóa trải nghiệm học tập.", en: "Update your profile to personalize your learning experience.", ja: "プロフィールを更新して学習体験をカスタマイズしましょう。" },
  "Sửa hồ sơ": { vi: "Sửa hồ sơ", en: "Edit Profile", ja: "プロフィール編集" },
  "Bộ đề không tên": { vi: "Bộ đề không tên", en: "Untitled Deck", ja: "無題の問題集" },
  "Chưa phân loại": { vi: "Chưa phân loại", en: "Uncategorized", ja: "未分類" },
  "Bộ đề đã bị xóa": { vi: "Bộ đề đã bị xóa", en: "Deleted Deck", ja: "削除された問題集" },
  "Xóa bộ đề": { vi: "Xóa bộ đề", en: "Delete Deck", ja: "問題集を削除" },
  "Đã xóa bộ đề.": { vi: "Đã xóa bộ đề.", en: "Deck deleted.", ja: "問題集を削除しました。" },
  "Bạn chưa có bộ đề nào để học.": { vi: "Bạn chưa có bộ đề nào để học.", en: "You have no decks to study yet.", ja: "学習できる問題集がまだありません。" },
  "Chọn một bộ đề để bắt đầu Ôn tập hoặc Thi thử.": { vi: "Chọn một bộ đề để bắt đầu Ôn tập hoặc Thi thử.", en: "Select a question deck to start Practice or Mock Exam.", ja: "問題集を選択して練習または模擬試験を開始してください。" },
  "Chế độ": { vi: "Chế độ", en: "Mode", ja: "モード" },
  "Bộ đề": { vi: "Bộ đề", en: "Deck", ja: "問題集" },
  "Tiến độ (": { vi: "Tiến độ (", en: "Progress (", ja: "進捗 (" },
  "Làm lại từ đầu": { vi: "Làm lại từ đầu", en: "Restart", ja: "最初からやり直す" },
  "Thoát": { vi: "Thoát", en: "Exit", ja: "終了" },
  "Nộp bài / Hoàn thành": { vi: "Nộp bài / Hoàn thành", en: "Submit / Finish", ja: "提出・完了" },
  "Nộp bài": { vi: "Nộp bài", en: "Submit", ja: "提出する" },
  "Hoàn thành": { vi: "Hoàn thành", en: "Finish", ja: "完了" },
  "Kiểm tra đáp án": { vi: "Kiểm tra đáp án", en: "Check Answer", ja: "解答を確認" },
  "Đầu": { vi: "Đầu", en: "First", ja: "最初" },
  "Trước": { vi: "Trước", en: "Prev", ja: "前へ" },
  "Tiếp": { vi: "Tiếp", en: "Next", ja: "次へ" },
  "Cuối": { vi: "Cuối", en: "Last", ja: "最後" },
  "Trang trước": { vi: "Trang trước", en: "Previous page", ja: "前のページ" },
  "Trang sau": { vi: "Trang sau", en: "Next page", ja: "次のページ" },
  "Phím tắt: 1–5 hoặc A–E chọn đáp án · Enter / → tiếp tục · ← quay lại · F đánh dấu": { vi: "Phím tắt: 1–5 hoặc A–E chọn đáp án · Enter / → tiếp tục · ← quay lại · F đánh dấu", en: "Shortcuts: 1–5 or A–E select option · Enter / → next · ← prev · F flag", ja: "ショートカット: 1–5 または A–E で選択 · Enter / → 次へ · ← 前へ · F フラグ" },
  "Thời gian": { vi: "Thời gian", en: "Time", ja: "時間" },
  "Thời gian còn lại": { vi: "Thời gian còn lại", en: "Time Remaining", ja: "残り時間" },
  "Thời gian phiên học": { vi: "Thời gian phiên học", en: "Session Duration", ja: "学習時間" },
  "Điểm hệ 10": { vi: "Điểm hệ 10", en: "Score (10-pt scale)", ja: "10点満点スコア" },
  "Bảng câu hỏi": { vi: "Bảng câu hỏi", en: "Question Palette", ja: "問題パレット" },
  "Đã đánh dấu": { vi: "Đã đánh dấu", en: "Answered", ja: "回答済み" },
  "Các câu bạn đã chọn đáp án": { vi: "Các câu bạn đã chọn đáp án", en: "Questions you have answered", ja: "回答を選択した問題" },
  "Chưa làm": { vi: "Chưa làm", en: "Unanswered", ja: "未回答" },
  "Các câu chưa làm": { vi: "Các câu chưa làm", en: "Unanswered questions", ja: "未回答の問題" },
  "Cắm cờ": { vi: "Cắm cờ", en: "Flagged", ja: "フラグ付き" },
  "Các câu đã cắm cờ": { vi: "Các câu đã cắm cờ", en: "Flagged questions", ja: "フラグを付けた問題" },
  "Đánh dấu câu hỏi (phím F)": { vi: "Đánh dấu câu hỏi (phím F)", en: "Flag question (F key)", ja: "問題にフラグを付ける (Fキー)" },
  "Bỏ đánh dấu (phím F)": { vi: "Bỏ đánh dấu (phím F)", en: "Unflag question (F key)", ja: "フラグを解除 (Fキー)" },
  "Đánh dấu câu hỏi": { vi: "Đánh dấu câu hỏi", en: "Flag question", ja: "問題にフラグを付ける" },
  "Hình minh họa câu hỏi": { vi: "Hình minh họa câu hỏi", en: "Question illustration", ja: "問題イラスト" },
  "Hình minh họa": { vi: "Hình minh họa", en: "Illustration", ja: "イラスト" },
  "(Chọn nhiều đáp án)": { vi: "(Chọn nhiều đáp án)", en: "(Select all that apply)", ja: "(複数選択)" },
  "(Chọn một đáp án)": { vi: "(Chọn một đáp án)", en: "(Select one answer)", ja: "(単一選択)" },
  "(Xem lại)": { vi: "(Xem lại)", en: "(Review)", ja: "(見直し)" },
  "Xem lại bài thi": { vi: "Xem lại bài thi", en: "Review Exam", ja: "試験を見直す" },
  "Đang làm bài": { vi: "Đang làm bài", en: "In Progress", ja: "演習中" },
  "Chính xác!": { vi: "Chính xác!", en: "Correct!", ja: "正解！" },
  "Chưa chính xác.": { vi: "Chưa chính xác.", en: "Incorrect.", ja: "不正解。" },
  "Giải thích:": { vi: "Giải thích:", en: "Explanation:", ja: "解説:" },
  "Giải thích": { vi: "Giải thích", en: "Explanation", ja: "解説" },
  "Đúng": { vi: "Đúng", en: "Correct", ja: "正解" },
  "Đã chọn": { vi: "Đã chọn", en: "Selected", ja: "選択済み" },
  "Đáp án đúng:": { vi: "Đáp án đúng:", en: "Correct Answer:", ja: "正解:" },
  "Đáp án đúng": { vi: "Đáp án đúng", en: "Correct Answer", ja: "正解" },
  "Không có câu nào phù hợp bộ lọc.": { vi: "Không có câu nào phù hợp bộ lọc.", en: "No questions match the current filter.", ja: "フィルターに一致する問題がありません。" },
  "Đã đúng 2 lần liên tiếp – câu này được loại khỏi sổ tay.": { vi: "Đã đúng 2 lần liên tiếp – câu này được loại khỏi sổ tay.", en: "Answered correctly 2 times in a row – removed from Mistake Notebook.", ja: "2回連続で正解したため、間違いノートから除外されました。" },
  "Chuỗi đúng đã được đặt lại về 0.": { vi: "Chuỗi đúng đã được đặt lại về 0.", en: "Correct streak reset to 0.", ja: "連続正解数が 0 にリセットされました。" },
  "Vui lòng chọn ít nhất một đáp án.": { vi: "Vui lòng chọn ít nhất một đáp án.", en: "Please select at least one option.", ja: "少なくとも1つの選択肢を選んでください。" },
  "Chúc mừng! Bạn đã hoàn thành tất cả câu hỏi.": { vi: "Chúc mừng! Bạn đã hoàn thành tất cả câu hỏi.", en: "Congratulations! You have completed all questions.", ja: "おめでとうございます！すべての問題を完了しました。" },
  "Đã hết giờ! Bài thi được nộp tự động.": { vi: "Đã hết giờ! Bài thi được nộp tự động.", en: "Time is up! Your exam has been submitted automatically.", ja: "時間切れです！試験は自動的に提出されました。" },
  "Nộp bài thi": { vi: "Nộp bài thi", en: "Submit Exam", ja: "試験を提出" },
  "Bạn có chắc chắn muốn nộp bài?": { vi: "Bạn có chắc chắn muốn nộp bài?", en: "Are you sure you want to submit your exam?", ja: "本当に試験を提出しますか？" },
  "Hoàn thành phiên học": { vi: "Hoàn thành phiên học", en: "Finish Study Session", ja: "学習セッションを完了" },
  "Thoát bài thi": { vi: "Thoát bài thi", en: "Exit Exam", ja: "試験を終了" },
  "Nếu thoát bây giờ, bài thi đang làm sẽ bị hủy và không được lưu điểm. Bạn có chắc chắn?": { vi: "Nếu thoát bây giờ, bài thi đang làm sẽ bị hủy và không được lưu điểm. Bạn có chắc chắn?", en: "If you exit now, your current exam will be discarded and not scored. Are you sure?", ja: "今終了すると、進行中の試験は破棄されスコアは保存されません。よろしいですか？" },
  "Toàn bộ tiến độ ôn tập của bộ đề này sẽ bị xóa. Bạn có chắc chắn muốn làm lại từ đầu?": { vi: "Toàn bộ tiến độ ôn tập của bộ đề này sẽ bị xóa. Bạn có chắc chắn muốn làm lại từ đầu?", en: "All practice progress for this deck will be cleared. Are you sure you want to restart?", ja: "この問題集の練習進捗がすべてリセットされます。最初からやり直しますか？" },
  "Chọn một bộ đề để ôn bằng thẻ ghi nhớ.": { vi: "Chọn một bộ đề để ôn bằng thẻ ghi nhớ.", en: "Select a question deck to study with flashcards.", ja: "フラッシュカードで学習する問題集を選択してください。" },
  "← Thẻ trước": { vi: "← Thẻ trước", en: "← Prev Card", ja: "← 前のカード" },
  "Lật thẻ (Space)": { vi: "Lật thẻ (Space)", en: "Flip Card (Space)", ja: "カードをめくる (Space)" },
  "Thẻ sau →": { vi: "Thẻ sau →", en: "Next Card →", ja: "次のカード →" },
  "Sổ tay đang trống. Những câu bạn làm sai sẽ xuất hiện ở đây.": { vi: "Sổ tay đang trống. Những câu bạn làm sai sẽ xuất hiện ở đây.", en: "Your Mistake Notebook is empty. Questions you answer incorrectly will appear here.", ja: "間違いノートは空です。間違えた問題がここに自動的に追加されます。" },
  "Sổ tay hiện đang trống.": { vi: "Sổ tay hiện đang trống.", en: "Mistake Notebook is currently empty.", ja: "間違いノートは現在空です。" },
  "Sổ tay câu hay sai (Mistake Bank)": { vi: "Sổ tay câu hay sai (Mistake Bank)", en: "Mistake Notebook (Mistake Bank)", ja: "間違いノート" },
  "Trả lời đúng liên tiếp 2 lần để loại câu khỏi sổ tay.": { vi: "Trả lời đúng liên tiếp 2 lần để loại câu khỏi sổ tay.", en: "Answer correctly 2 times in a row to remove a question from the notebook.", ja: "2回連続で正解すると、その問題は間違いノートから除外されます。" },
  "Luyện tập sổ tay": { vi: "Luyện tập sổ tay", en: "Practice Mistakes", ja: "間違いノートを練習" },
  "Luyện tập Sổ tay câu hay sai": { vi: "Luyện tập Sổ tay câu hay sai", en: "Practice Mistake Notebook", ja: "間違いノートを練習" },
  "Xóa toàn bộ sổ tay": { vi: "Xóa toàn bộ sổ tay", en: "Clear Mistake Notebook", ja: "間違いノートをすべてクリア" },
  "Xóa sổ tay": { vi: "Xóa sổ tay", en: "Clear Mistake Notebook", ja: "間違いノートをクリア" },
  "Bạn có chắc muốn xóa toàn bộ câu trong Sổ tay câu hay sai?": { vi: "Bạn có chắc muốn xóa toàn bộ câu trong Sổ tay câu hay sai?", en: "Are you sure you want to clear all questions from your Mistake Notebook?", ja: "間違いノート内のすべての問題を削除してもよろしいですか？" },
  "Đã xóa toàn bộ sổ tay.": { vi: "Đã xóa toàn bộ sổ tay.", en: "Mistake Notebook cleared.", ja: "間違いノートをすべてクリアしました。" },
  "Không có câu hỏi nào để bắt đầu.": { vi: "Không có câu hỏi nào để bắt đầu.", en: "No questions available to start.", ja: "開始できる問題がありません。" },
  "Không tìm thấy bộ đề.": { vi: "Không tìm thấy bộ đề.", en: "Question deck not found.", ja: "問題集が見つかりません。" },
  "Không thể bắt đầu phiên làm bài. Vui lòng thử lại.": { vi: "Không thể bắt đầu phiên làm bài. Vui lòng thử lại.", en: "Could not start session. Please try again.", ja: "セッションを開始できませんでした。もう一度お試しください。" },
  "Đã khôi phục tiến độ làm bài trước đó.": { vi: "Đã khôi phục tiến độ làm bài trước đó.", en: "Restored your previous study progress.", ja: "前回の学習進捗を復元しました。" },
  "Thiết lập": { vi: "Thiết lập", en: "Session Setup", ja: "セッション設定" },
  "Thiết lập chế độ Ôn tập": { vi: "Thiết lập chế độ Ôn tập", en: "Practice Mode Setup", ja: "練習モード設定" },
  "Thiết lập chế độ Thi thử (Kiểm tra)": { vi: "Thiết lập chế độ Thi thử (Kiểm tra)", en: "Mock Exam Mode Setup", ja: "模擬試験モード設定" },
  "Thiết lập chế độ Lật thẻ": { vi: "Thiết lập chế độ Lật thẻ", en: "Flashcard Mode Setup", ja: "フラッシュカード設定" },
  "🔒 Đảo câu hỏi/đáp án yêu cầu Gói Silver trở lên.": { vi: "🔒 Đảo câu hỏi/đáp án yêu cầu Gói Silver trở lên.", en: "🔒 Shuffling questions/options requires Silver plan or higher.", ja: "🔒 問題・選択肢のシャッフルには Silver プラン以上が必要です。" },
  "Đảo câu hỏi": { vi: "Đảo câu hỏi", en: "Shuffle questions", ja: "問題をシャッフル" },
  "Đảo đáp án": { vi: "Đảo đáp án", en: "Shuffle answer options", ja: "選択肢をシャッフル" },
  "Cách chọn câu hỏi kiểm tra": { vi: "Cách chọn câu hỏi kiểm tra", en: "Question Selection Mode", ja: "出題方式の選択" },
  "Chia thành nhiều phiên (VD: 50 câu/phiên)": { vi: "Chia thành nhiều phiên (VD: 50 câu/phiên)", en: "Split into sessions (e.g. 50 Qs/session)", ja: "複数セッションに分割 (例: 50問/回)" },
  "Chọn ngẫu nhiên N câu": { vi: "Chọn ngẫu nhiên N câu", en: "Pick N random questions", ja: "ランダムに N 問抽出" },
  "Chia nhỏ thành nhiều phiên làm bài": { vi: "Chia nhỏ thành nhiều phiên làm bài", en: "Split into multiple study sessions", ja: "複数セッションに分割して学習" },
  "Số câu mỗi phiên (tùy chọn)": { vi: "Số câu mỗi phiên (tùy chọn)", en: "Questions per session (custom)", ja: "1セッションあたりの問題数" },
  "Chọn phiên muốn làm": { vi: "Chọn phiên muốn làm", en: "Select session to start", ja: "開始するセッションを選択" },
  "Số câu ngẫu nhiên": { vi: "Số câu ngẫu nhiên", en: "Number of random questions", ja: "ランダム出題数" },
  "Thời gian làm bài (phút)": { vi: "Thời gian làm bài (phút)", en: "Time limit (minutes)", ja: "制限時間 (分)" },
  "Bắt đầu": { vi: "Bắt đầu", en: "Start", ja: "開始" },
  "Nhập đề từ file Excel": { vi: "Nhập đề từ file Excel", en: "Import Deck from Excel", ja: "Excel ファイルから問題集をインポート" },
  "Tải file mẫu (.xlsx)": { vi: "Tải file mẫu (.xlsx)", en: "Download Template (.xlsx)", ja: "テンプレートをダウンロード (.xlsx)" },
  "Cột": { vi: "Cột", en: "Column", ja: "列" },
  "Tiêu đề (bắt buộc đúng)": { vi: "Tiêu đề (bắt buộc đúng)", en: "Header (exact match required)", ja: "列名 (完全一致必須)" },
  "Mô tả": { vi: "Mô tả", en: "Description", ja: "説明" },
  "Nội dung câu hỏi": { vi: "Nội dung câu hỏi", en: "Question text", ja: "問題文" },
  "Multiple Choice hoặc Checkbox": { vi: "Multiple Choice hoặc Checkbox", en: "Multiple Choice or Checkbox", ja: "Multiple Choice または Checkbox" },
  "Các phương án (tối thiểu 2)": { vi: "Các phương án (tối thiểu 2)", en: "Answer options (minimum 2)", ja: "選択肢 (最低2つ)" },
  "Đáp án đúng: 1,3 hoặc A,C": { vi: "Đáp án đúng: 1,3 hoặc A,C", en: "Correct answer: 1,3 or A,C", ja: "正解: 1,3 または A,C" },
  "Thời gian (giây), mặc định 30": { vi: "Thời gian (giây), mặc định 30", en: "Time (seconds), default 30", ja: "時間 (秒)、デフォルト 30" },
  "Liên kết ảnh (tùy chọn)": { vi: "Liên kết ảnh (tùy chọn)", en: "Image URL (optional)", ja: "画像リンク (任意)" },
  "Giải thích đáp án (tùy chọn)": { vi: "Giải thích đáp án (tùy chọn)", en: "Answer explanation (optional)", ja: "解答の解説 (任意)" },
  "Chọn file Excel": { vi: "Chọn file Excel", en: "Select Excel file", ja: "Excel ファイルを選択" },
  "Cách nhập": { vi: "Cách nhập", en: "Import mode", ja: "インポート方法" },
  "Tạo thành bộ đề mới": { vi: "Tạo thành bộ đề mới", en: "Create as a new deck", ja: "新しい問題集として作成" },
  "Tên bộ đề": { vi: "Tên bộ đề", en: "Deck title", ja: "問題集のタイトル" },
  "Ví dụ: Giải tích 1 – Giữa kỳ": { vi: "Ví dụ: Giải tích 1 – Giữa kỳ", en: "e.g. Calculus 1 – Midterm", ja: "例: 微積分学1 – 中間試験" },
  "Thẻ môn học/Tag": { vi: "Thẻ môn học/Tag", en: "Subject / Tag", ja: "科目・タグ" },
  "Ví dụ: Giải tích": { vi: "Ví dụ: Giải tích", en: "e.g. Calculus", ja: "例: 微積分" },
  "Gộp thêm vào bộ đề có sẵn": { vi: "Gộp thêm vào bộ đề có sẵn", en: "Merge into an existing deck", ja: "既存の問題集に追加統合" },
  "🔒 Gói Gold trở lên": { vi: "🔒 Gói Gold trở lên", en: "🔒 Gold plan or higher", ja: "🔒 Gold プラン以上" },
  "Chọn bộ đề cá nhân": { vi: "Chọn bộ đề cá nhân", en: "Select personal deck", ja: "個人の問題集を選択" },
  "Chưa có bộ đề cá nhân nào": { vi: "Chưa có bộ đề cá nhân nào", en: "No personal decks available", ja: "個人の問題集がありません" },
  "Xác nhận nhập đề": { vi: "Xác nhận nhập đề", en: "Confirm Import", ja: "インポートを確定" },
  "File không có dữ liệu câu hỏi.": { vi: "File không có dữ liệu câu hỏi.", en: "File contains no question data.", ja: "ファイルに問題データがありません。" },
  "File không có dòng câu hỏi nào.": { vi: "File không có dòng câu hỏi nào.", en: "File contains no question rows.", ja: "ファイルに問題行がありません。" },
  "Chưa có câu hỏi hợp lệ để nhập.": { vi: "Chưa có câu hỏi hợp lệ để nhập.", en: "No valid questions to import.", ja: "インポートできる有効な問題がありません。" },
  "Vui lòng chọn một bộ đề cá nhân để gộp.": { vi: "Vui lòng chọn một bộ đề cá nhân để gộp.", en: "Please select a personal deck to merge into.", ja: "統合先の個人問題集を選択してください。" },
  "Vui lòng nhập tên bộ đề.": { vi: "Vui lòng nhập tên bộ đề.", en: "Please enter a deck title.", ja: "問題集のタイトルを入力してください。" },
  "Thư viện đọc Excel chưa tải xong. Vui lòng thử lại.": { vi: "Thư viện đọc Excel chưa tải xong. Vui lòng thử lại.", en: "Excel library is still loading. Please try again.", ja: "Excel ライブラリの読み込み中です。もう一度お試しください。" },
  "Thư viện Excel chưa tải xong. Vui lòng thử lại.": { vi: "Thư viện Excel chưa tải xong. Vui lòng thử lại.", en: "Excel library is still loading. Please try again.", ja: "Excel ライブラリの読み込み中です。もう一度お試しください。" },
  "Thư viện SheetJS chưa tải xong.": { vi: "Thư viện SheetJS chưa tải xong.", en: "SheetJS library is still loading.", ja: "SheetJS ライブラリがまだ読み込まれていません。" },
  "Không thể đọc file đã chọn.": { vi: "Không thể đọc file đã chọn.", en: "Could not read the selected file.", ja: "選択したファイルを読み込めませんでした。" },
  "Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng.": { vi: "Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng.", en: "Could not read Excel file. Please check the file format.", ja: "Excel ファイルを読み込めませんでした。形式を確認してください。" },
  "Không thể đọc file Excel.": { vi: "Không thể đọc file Excel.", en: "Unable to read Excel file.", ja: "Excel ファイルを読み込めませんでした。" },
  "Không thể tạo file mẫu.": { vi: "Không thể tạo file mẫu.", en: "Could not generate template file.", ja: "テンプレートファイルを生成できませんでした。" },
  "Không thể xuất file .json.": { vi: "Không thể xuất file .json.", en: "Could not export .json file.", ja: ".json ファイルを出力できませんでした。" },
  "Không thể xuất file .xlsx.": { vi: "Không thể xuất file .xlsx.", en: "Could not export .xlsx file.", ja: ".xlsx ファイルを出力できませんでした。" },
  "Hệ thống 5 Hạng gói AI Tutor": { vi: "Hệ thống 5 Hạng gói AI Tutor", en: "AI Tutor 5-Tier Plan System", ja: "AI Tutor 5段階ランクプラン" },
  "Lịch sử yêu cầu thanh toán của bạn": { vi: "Lịch sử yêu cầu thanh toán của bạn", en: "Your Payment Request History", ja: "支払いリクエスト履歴" },
  "Chưa xếp hạng": { vi: "Chưa xếp hạng", en: "Unranked", ja: "Unranked (未ランク)" },
  "(Chưa xếp hạng)": { vi: "(Chưa xếp hạng)", en: "(Unranked)", ja: "(未ランク)" },
  "Chưa đăng ký": { vi: "Chưa đăng ký", en: "Not Registered", ja: "未登録" },
  "Đăng ký Unranked 0đ để bắt đầu": { vi: "Đăng ký Unranked 0đ để bắt đầu", en: "Register Unranked (0 VND) to start", ja: "無料 Unranked (0 VND) に登録して開始" },
  "Unranked (Chưa xếp hạng)": { vi: "Unranked (Chưa xếp hạng)", en: "Unranked (Free Starter)", ja: "Unranked (無料スターター)" },
  "Miễn phí trọn đời • Kích hoạt ngay": { vi: "Miễn phí trọn đời • Kích hoạt ngay", en: "Free Forever • Instant Activation", ja: "永久無料 • 即時有効化" },
  "Bronze (Đồng)": { vi: "Bronze (Đồng)", en: "Bronze", ja: "Bronze (ブロンズ)" },
  "Silver (Bạc)": { vi: "Silver (Bạc)", en: "Silver", ja: "Silver (シルバー)" },
  "Gold (Vàng)": { vi: "Gold (Vàng)", en: "Gold", ja: "Gold (ゴールド)" },
  "Diamond (Kim Cương)": { vi: "Diamond (Kim Cương)", en: "Diamond", ja: "Diamond (ダイヤモンド)" },
  "Thanh toán → Chờ Admin duyệt": { vi: "Thanh toán → Chờ Admin duyệt", en: "Payment → Manual Admin Approval", ja: "支払い → 管理者承認待ち" },
  "Phổ biến nhất • Chờ Admin duyệt": { vi: "Phổ biến nhất • Chờ Admin duyệt", en: "Most Popular • Manual Admin Approval", ja: "一番人気 • 管理者承認待ち" },
  "Toàn quyền VIP • Chờ Admin duyệt": { vi: "Toàn quyền VIP • Chờ Admin duyệt", en: "Full VIP Access • Manual Admin Approval", ja: "全機能VIP • 管理者承認待ち" },
  "Phổ biến": { vi: "Phổ biến", en: "Popular", ja: "人気" },
  "0đ / năm": { vi: "0đ / năm", en: "0 VND / year", ja: "0 VND / 年" },
  "/ năm": { vi: "/ năm", en: "/ year", ja: "/ 年" },
  "Đăng ký & kích hoạt ngay lập tức – không cần thanh toán, không cần chờ Admin duyệt": { vi: "Đăng ký & kích hoạt ngay lập tức – không cần thanh toán, không cần chờ Admin duyệt", en: "Register & activate immediately – no payment required, no Admin wait", ja: "即時登録・有効化 – 支払い不要、管理者承認待ちなし" },
  "Đăng ký miễn phí (0đ)": { vi: "Đăng ký miễn phí (0đ)", en: "Register Free (0 VND)", ja: "無料登録 (0 VND)" },
  "✓ Gói hiện tại": { vi: "✓ Gói hiện tại", en: "✓ Current Plan", ja: "✓ 現在のプラン" },
  "✓ Gói hiện tại (Gia hạn)": { vi: "✓ Gói hiện tại (Gia hạn)", en: "✓ Current Plan (Renew)", ja: "✓ 現在のプラン (更新)" },
  "Bạn đã có gói cao hơn": { vi: "Bạn đã có gói cao hơn", en: "You already have a higher plan", ja: "より上位のプランを利用中です" },
  "Bạn đang sở hữu gói cao hơn Unranked.": { vi: "Bạn đang sở hữu gói cao hơn Unranked.", en: "You already have a higher plan than Unranked.", ja: "すでに Unranked より上位のプランを利用中です。" },
  "👑 Đang kích hoạt (Admin)": { vi: "👑 Đang kích hoạt (Admin)", en: "👑 Active (Admin)", ja: "👑 有効中 (管理者)" },
  "✓ Đang bật (Admin)": { vi: "✓ Đang bật (Admin)", en: "✓ Active (Admin)", ja: "✓ 有効中 (管理者)" },
  "⚡ Kích hoạt ngay (Admin)": { vi: "⚡ Kích hoạt ngay (Admin)", en: "⚡ Instant Activate (Admin)", ja: "⚡ 即時有効化 (管理者)" },
  "⏳ Đang chờ Admin duyệt": { vi: "⏳ Đang chờ Admin duyệt", en: "⏳ Awaiting Admin Approval", ja: "⏳ 管理者承認待ち" },
  "👑 Admin (Diamond): Bạn có mặc định toàn quyền Diamond VIP không giới hạn. Bạn có thể bấm \"Kích hoạt ngay (Admin)\" trên bất kỳ gói nào để chuyển đổi thử nghiệm trực tiếp.": { vi: "👑 Admin (Diamond): Bạn có mặc định toàn quyền Diamond VIP không giới hạn. Bạn có thể bấm \"Kích hoạt ngay (Admin)\" trên bất kỳ gói nào để chuyển đổi thử nghiệm trực tiếp.", en: "👑 Admin (Diamond): You have full unlimited Diamond VIP access by default. Click \"Instant Activate (Admin)\" on any plan to test switching directly.", ja: "👑 管理者 (Diamond): デフォルトで無制限の Diamond VIP 全権限が有効です。任意のプランで「即時有効化 (管理者)」を押して直接切り替えテストが可能です。" },
  "Đăng ký gói Unranked (0đ/năm) để kích hoạt ngay lập tức, hoặc chọn 1 trong 4 hạng gói trả phí (chờ Admin xác nhận).": { vi: "Đăng ký gói Unranked (0đ/năm) để kích hoạt ngay lập tức, hoặc chọn 1 trong 4 hạng gói trả phí (chờ Admin xác nhận).", en: "Register the Unranked plan (0 VND/year) for instant activation, or choose one of the 4 paid plans (activated upon Admin approval).", ja: "Unranked プラン（0 VND/年）で即時有効化するか、4つの有料ランクプラン（管理者承認後に有効化）から選択してください。" },
  "Gói hiện tại của bạn:": { vi: "Gói hiện tại của bạn:", en: "Your current plan:", ja: "現在のプラン:" },
  "Bạn chưa gửi yêu cầu thanh toán nào.": { vi: "Bạn chưa gửi yêu cầu thanh toán nào.", en: "You have not submitted any payment requests yet.", ja: "支払いリクエストの送信履歴はまだありません。" },
  "Sổ tay câu hay sai (Làm lại câu sai)": { vi: "Sổ tay câu hay sai (Làm lại câu sai)", en: "Mistake Notebook (Retry wrong questions)", ja: "間違いノート（間違えた問題の復習）" },
  "Thi thử chuẩn phòng thi & Lịch sử luyện đề": { vi: "Thi thử chuẩn phòng thi & Lịch sử luyện đề", en: "Mock Exam Mode & Exam History", ja: "本番形式の模擬試験と試験履歴" },
  "Xuất bộ đề .json / .xlsx không giới hạn": { vi: "Xuất bộ đề .json / .xlsx không giới hạn", en: "Unlimited .json / .xlsx deck export", ja: ".json / .xlsx 問題集の無制限エクスポート" },
  "Creator Studio nâng cao (Streak, Redemption, thời gian từng câu, đảo đề)": { vi: "Creator Studio nâng cao (Streak, Redemption, thời gian từng câu, đảo đề)", en: "Advanced Creator Studio (Streak, Redemption, per-question timer, shuffle)", ja: "高度な クリエイタースタジオ (連続正解、復習問題、問題別タイマー、シャッフル)" },
  "Đảo thứ tự câu hỏi / đáp án": { vi: "Đảo thứ tự câu hỏi / đáp án", en: "Shuffle questions / answer options", ja: "問題・選択肢の順序シャッフル" },
  "AI giải thích đáp án": { vi: "AI giải thích đáp án", en: "AI Answer Explanations", ja: "AI 解答解説" },
  "Chế độ kiểm duyệt song song (Split-Screen Review)": { vi: "Chế độ kiểm duyệt song song (Split-Screen Review)", en: "Split-Screen Review Mode", ja: "並列レビューモード" },
  "Chế độ Kiểm duyệt song song (Split-Screen Review)": { vi: "Chế độ Kiểm duyệt song song (Split-Screen Review)", en: "Split-Screen Review Mode", ja: "並列レビューモード" },
  "Gộp thêm vào bộ đề có sẵn khi Import": { vi: "Gộp thêm vào bộ đề có sẵn khi Import", en: "Merge into existing decks on Import", ja: "インポート時に既存問題集へ統合" },
  "AI Kiểm tra chéo đáp án (Double-Check) hàng loạt": { vi: "AI Kiểm tra chéo đáp án (Double-Check) hàng loạt", en: "Batch AI Answer Double-Check", ja: "一括 AI 解答ダブルチェック" },
  "Chia nhỏ chặng học": { vi: "Chia nhỏ chặng học", en: "Split study sessions", ja: "学習セッション分割" },
  "Chế độ AI Chính xác cao ưu tiên (Gemini Pro)": { vi: "Chế độ AI Chính xác cao ưu tiên (Gemini Pro)", en: "Priority High-Accuracy AI Mode (Gemini Pro)", ja: "高精度 AI 優先モード (Gemini Pro)" },
  "Xuất báo cáo thống kê chi tiết & Sao lưu Kho đề": { vi: "Xuất báo cáo thống kê chi tiết & Sao lưu Kho đề", en: "Detailed analytics export & Deck backup", ja: "詳細統計レポート出力と問題集バックアップ" },
  "Lưu tối đa 3 bộ đề trong Kho đề, tối đa 50 câu/bộ đề": { vi: "Lưu tối đa 3 bộ đề trong Kho đề, tối đa 50 câu/bộ đề", en: "Save up to 3 decks in your library, up to 50 questions/deck", ja: "問題集を最大3セット、1セットあたり最大50問まで保存" },
  "Làm bài luyện tập cơ bản & xem thống kê điểm số": { vi: "Làm bài luyện tập cơ bản & xem thống kê điểm số", en: "Basic practice mode & score statistics", ja: "基本練習モードとスコア統計の閲覧" },
  "Dùng Creator/Quiz Studio cơ bản (tạo & làm bài)": { vi: "Dùng Creator/Quiz Studio cơ bản (tạo & làm bài)", en: "Basic Creator/Quiz Studio (create & play quizzes)", ja: "基本 クリエイタースタジオ（クイズ作成・プレイ）" },
  "Dùng AI Converter (tối đa 5 ảnh/lần, dùng Gemini API Key cá nhân)": { vi: "Dùng AI Converter (tối đa 5 ảnh/lần, dùng Gemini API Key cá nhân)", en: "Use AI Converter (up to 5 images/batch with personal Gemini API Key)", ja: "AI変換 利用（1回最大5画像、個人 Gemini API Key 使用）" },
  "Toàn bộ quyền lợi gói Unranked": { vi: "Toàn bộ quyền lợi gói Unranked", en: "All benefits of the Unranked plan", ja: "Unranked プランのすべての特典" },
  "Lưu tối đa 15 bộ đề, tối đa 200 câu/bộ đề": { vi: "Lưu tối đa 15 bộ đề, tối đa 200 câu/bộ đề", en: "Save up to 15 decks, up to 200 questions/deck", ja: "問題集を最大15セット、1セットあたり最大200問まで保存" },
  "AI Converter tối đa 20 ảnh/lần + xuất file Excel chuẩn không giới hạn": { vi: "AI Converter tối đa 20 ảnh/lần + xuất file Excel chuẩn không giới hạn", en: "AI Converter up to 20 images/batch + unlimited standard Excel export", ja: "AI変換 1回最大20画像 + 標準 Excel 無制限エクスポート" },
  "Mở khóa Làm lại câu sai (Sổ tay sai), Thi thử & Lịch sử luyện đề": { vi: "Mở khóa Làm lại câu sai (Sổ tay sai), Thi thử & Lịch sử luyện đề", en: "Unlock Mistake Notebook retry, Mock Exam & Exam History", ja: "間違いノート復習・模擬試験・試験履歴をアンロック" },
  "Toàn bộ quyền lợi gói Bronze": { vi: "Toàn bộ quyền lợi gói Bronze", en: "All benefits of the Bronze plan", ja: "Bronze プランのすべての特典" },
  "Lưu tối đa 50 bộ đề, tối đa 500 câu/bộ đề": { vi: "Lưu tối đa 50 bộ đề, tối đa 500 câu/bộ đề", en: "Save up to 50 decks, up to 500 questions/deck", ja: "問題集を最大50セット、1セットあたり最大500問まで保存" },
  "Mở khóa Creator/Quiz Studio nâng cao (Streak, Redemption, thời gian từng câu, đảo đề)": { vi: "Mở khóa Creator/Quiz Studio nâng cao (Streak, Redemption, thời gian từng câu, đảo đề)", en: "Unlock advanced Creator/Quiz Studio (Streak, Redemption, per-question time, shuffle)", ja: "高度な クリエイタースタジオ（連続正解、復習問題、問題別時間、シャッフル）をアンロック" },
  "Hỗ trợ AI giải thích đáp án & Chế độ kiểm duyệt song song (Split-Screen Review)": { vi: "Hỗ trợ AI giải thích đáp án & Chế độ kiểm duyệt song song (Split-Screen Review)", en: "AI answer explanations & Split-Screen Review mode", ja: "AI 解答解説と並列レビューモード" },
  "Toàn bộ quyền lợi gói Silver": { vi: "Toàn bộ quyền lợi gói Silver", en: "All benefits of the Silver plan", ja: "Silver プランのすべての特典" },
  "Không giới hạn số lượng bộ đề & số câu hỏi": { vi: "Không giới hạn số lượng bộ đề & số câu hỏi", en: "Unlimited question decks & questions per deck", ja: "問題集数・問題数が無制限" },
  "Mở khóa Gộp thêm vào bộ đề có sẵn khi Import": { vi: "Mở khóa Gộp thêm vào bộ đề có sẵn khi Import", en: "Unlock merging into existing decks during Import", ja: "インポート時の既存問題集への追加統合をアンロック" },
  "Mở khóa AI Kiểm tra chéo đáp án (Double-Check) hàng loạt & lọc câu nghi ngờ sai": { vi: "Mở khóa AI Kiểm tra chéo đáp án (Double-Check) hàng loạt & lọc câu nghi ngờ sai", en: "Unlock batch AI Double-Check & suspect answer filtering", ja: "一括 AI ダブルチェックと要確認問題のフィルタリングをアンロック" },
  "Toàn bộ quyền lợi gói Gold (không giới hạn mọi tính năng)": { vi: "Toàn bộ quyền lợi gói Gold (không giới hạn mọi tính năng)", en: "All benefits of the Gold plan (all features unlimited)", ja: "Gold プランのすべての特典（全機能無制限）" },
  "Ưu tiên chế độ AI Chính xác cao cho đề Toán/Lý/Hóa/Tiếng Anh phức tạp": { vi: "Ưu tiên chế độ AI Chính xác cao cho đề Toán/Lý/Hóa/Tiếng Anh phức tạp", en: "Priority High-Accuracy AI mode for complex Math/Physics/Chemistry/English exams", ja: "複雑な数学・物理・化学・英語試験向けの高精度 AI 優先モード" },
  "Xuất báo cáo thống kê học tập chi tiết & sao lưu/đồng bộ Kho đề": { vi: "Xuất báo cáo thống kê học tập chi tiết & sao lưu/đồng bộ Kho đề", en: "Detailed learning analytics export & deck backup/sync", ja: "詳細な学習統計レポート出力と問題集のバックアップ・同期" },
  "Huy hiệu Diamond VIP nổi bật trên hồ sơ & hỗ trợ ưu tiên 1-1": { vi: "Huy hiệu Diamond VIP nổi bật trên hồ sơ & hỗ trợ ưu tiên 1-1", en: "Exclusive Diamond VIP profile badge & 1-on-1 priority support", ja: "プロフィール上の Diamond VIP バッジと 1対1 優先サポート" },
  "Nâng cấp hạng gói": { vi: "Nâng cấp hạng gói", en: "Upgrade Plan", ja: "プランをアップグレード" },
  "Bạn có muốn xem các gói nâng cấp không?": { vi: "Bạn có muốn xem các gói nâng cấp không?", en: "Would you like to view the upgrade plans?", ja: "アップグレードプラン一覧を表示しますか？" },
  "Xem gói nâng cấp": { vi: "Xem gói nâng cấp", en: "View Upgrade Plans", ja: "プランを見る" },
  "Tính năng này mở khóa từ Gói Bronze (100.000đ/năm) trở lên.": { vi: "Tính năng này mở khóa từ Gói Bronze (100.000đ/năm) trở lên.", en: "This feature unlocks from the Bronze plan (100,000 VND/year) or higher.", ja: "この機能は Bronze プラン（100,000 VND/年）以上で利用可能です。" },
  "Đã kích hoạt ngay gói Unranked (0đ/năm) thành công!": { vi: "Đã kích hoạt ngay gói Unranked (0đ/năm) thành công!", en: "Successfully activated the Unranked plan (0 VND/year)!", ja: "Unranked プラン（0 VND/年）を即時有効化しました！" },
  "Thanh toán nâng cấp gói": { vi: "Thanh toán nâng cấp gói", en: "Plan Upgrade Checkout", ja: "プランアップグレードのお支払い" },
  "Sau khi chuyển khoản, bấm": { vi: "Sau khi chuyển khoản, bấm", en: "After transferring, click", ja: "振込完了後、" },
  "\"Tôi đã thanh toán\"": { vi: "\"Tôi đã thanh toán\"", en: "\"I Have Paid\"", ja: "「支払い完了を通知」" },
  "để gửi yêu cầu. Quản trị viên sẽ kiểm tra và kích hoạt gói (hạn 365 ngày) ngay sau khi xác nhận.": { vi: "để gửi yêu cầu. Quản trị viên sẽ kiểm tra và kích hoạt gói (hạn 365 ngày) ngay sau khi xác nhận.", en: "to submit your request. The Administrator will verify and activate your plan (valid for 365 days).", ja: "を押してリクエストを送信してください。管理者が確認次第、プラン（365日間有効）を有効化します。" },
  "Gói đăng ký": { vi: "Gói đăng ký", en: "Selected Plan", ja: "申込プラン" },
  "Giá gốc": { vi: "Giá gốc", en: "Original Price", ja: "基本価格" },
  "Giảm giá": { vi: "Giảm giá", en: "Discount", ja: "割引" },
  "Không có": { vi: "Không có", en: "None", ja: "なし" },
  "Số tiền cần chuyển": { vi: "Số tiền cần chuyển", en: "Amount Due", ja: "振込金額" },
  "Ngân hàng": { vi: "Ngân hàng", en: "Bank", ja: "銀行名" },
  "Số tài khoản": { vi: "Số tài khoản", en: "Account Number", ja: "口座番号" },
  "Chủ tài khoản": { vi: "Chủ tài khoản", en: "Account Holder", ja: "口座名義" },
  "Nội dung chuyển khoản": { vi: "Nội dung chuyển khoản", en: "Transfer Memo", ja: "振込メモ (摘要)" },
  "Nhập mã giảm giá": { vi: "Nhập mã giảm giá", en: "Enter discount code", ja: "割引コードを入力" },
  "Mã giao dịch / Ghi chú (tùy chọn)": { vi: "Mã giao dịch / Ghi chú (tùy chọn)", en: "Transaction ID / Note (optional)", ja: "取引ID / メモ (任意)" },
  "Ví dụ: FT26325... hoặc ghi chú cho Admin": { vi: "Ví dụ: FT26325... hoặc ghi chú cho Admin", en: "e.g. FT26325... or note for Admin", ja: "例: FT26325... または管理者へのメモ" },
  "Tải ảnh biên lai chuyển khoản (tùy chọn)": { vi: "Tải ảnh biên lai chuyển khoản (tùy chọn)", en: "Upload transfer receipt image (optional)", ja: "振込明細の画像をアップロード (任意)" },
  "Chọn ảnh biên lai": { vi: "Chọn ảnh biên lai", en: "Select Receipt Image", ja: "明細画像を選択" },
  "Xóa ảnh": { vi: "Xóa ảnh", en: "Remove Image", ja: "画像を削除" },
  "Xem trước ảnh biên lai": { vi: "Xem trước ảnh biên lai", en: "Receipt image preview", ja: "明細画像プレビュー" },
  "Mã VietQR thanh toán": { vi: "Mã VietQR thanh toán", en: "VietQR Payment Code", ja: "VietQR 決済コード" },
  "Tôi đã thanh toán": { vi: "Tôi đã thanh toán", en: "I Have Paid", ja: "支払い完了を通知" },
  "Đang gửi yêu cầu...": { vi: "Đang gửi yêu cầu...", en: "Submitting request...", ja: "リクエスト送信中..." },
  "Mã giảm giá 100% – bạn không cần chuyển khoản. Bấm \"Tôi đã thanh toán\" để gửi Quản trị viên xác nhận.": { vi: "Mã giảm giá 100% – bạn không cần chuyển khoản. Bấm \"Tôi đã thanh toán\" để gửi Quản trị viên xác nhận.", en: "100% discount applied – no bank transfer needed. Click \"I Have Paid\" to send for Admin confirmation.", ja: "100%割引適用済み – 振込は不要です。「支払い完了を通知」を押して管理者へ承認リクエストを送信してください。" },
  "Quản trị viên chưa cấu hình tài khoản VietQR.": { vi: "Quản trị viên chưa cấu hình tài khoản VietQR.", en: "Administrator has not configured a VietQR account yet.", ja: "管理者がまだ VietQR 口座を設定していません。" },
  "Không tải được mã QR. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.": { vi: "Không tải được mã QR. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.", en: "Could not load QR image. Please transfer manually using the bank details shown.", ja: "QRコードを読み込めませんでした。横の口座情報を使って手動でお振込みください。" },
  "Đang tải mã QR...": { vi: "Đang tải mã QR...", en: "Loading QR code...", ja: "QRコードを読み込み中..." },
  "Vui lòng chọn file ảnh biên lai.": { vi: "Vui lòng chọn file ảnh biên lai.", en: "Please select an image file for the receipt.", ja: "明細の画像ファイルを選択してください。" },
  "Không thể xử lý ảnh biên lai.": { vi: "Không thể xử lý ảnh biên lai.", en: "Could not process receipt image.", ja: "明細画像を処理できませんでした。" },
  "Vui lòng nhập mã giảm giá.": { vi: "Vui lòng nhập mã giảm giá.", en: "Please enter a discount code.", ja: "割引コードを入力してください。" },
  "Mã giảm giá không hợp lệ hoặc đã bị xóa.": { vi: "Mã giảm giá không hợp lệ hoặc đã bị xóa.", en: "Invalid or expired discount code.", ja: "割引コードが無効か、削除されています。" },
  "Đã xảy ra lỗi khi gửi yêu cầu thanh toán.": { vi: "Đã xảy ra lỗi khi gửi yêu cầu thanh toán.", en: "An error occurred while submitting the payment request.", ja: "支払いリクエストの送信中にエラーが発生しました。" },
  "Bảng điều khiển Quản trị (Admin Panel)": { vi: "Bảng điều khiển Quản trị (Admin Panel)", en: "Admin Control Panel", ja: "管理者コントロールパネル" },
  "Đơn đang chờ duyệt": { vi: "Đơn đang chờ duyệt", en: "Pending Requests", ja: "承認待ちリクエスト" },
  "Đơn đã duyệt": { vi: "Đơn đã duyệt", en: "Approved Requests", ja: "承認済みリクエスト" },
  "Tổng doanh thu đã duyệt": { vi: "Tổng doanh thu đã duyệt", en: "Total Approved Revenue", ja: "承認済み総売上" },
  "Thành viên & Cấp gói": { vi: "Thành viên & Cấp gói", en: "Members & Plans", ja: "メンバー・プラン・API割当" },
  "Cấu hình VietQR": { vi: "Cấu hình VietQR", en: "VietQR Config", ja: "VietQR 設定" },
  "Mã giảm giá": { vi: "Mã giảm giá", en: "Discount Codes", ja: "割引クーポン" },
  "Sao lưu hệ thống": { vi: "Sao lưu hệ thống", en: "System Backup", ja: "システムバックアップ" },
  "Lọc trạng thái": { vi: "Lọc trạng thái", en: "Filter Status", ja: "状態で絞り込み" },
  "Tất cả trạng thái": { vi: "Tất cả trạng thái", en: "All Statuses", ja: "すべての状態" },
  "⏳ Chờ duyệt": { vi: "⏳ Chờ duyệt", en: "⏳ Pending", ja: "⏳ 承認待ち" },
  "✅ Đã duyệt": { vi: "✅ Đã duyệt", en: "✅ Approved", ja: "✅ 承認済み" },
  "❌ Từ chối": { vi: "❌ Từ chối", en: "❌ Rejected", ja: "❌ 却下" },
  "❌ Bị từ chối": { vi: "❌ Bị từ chối", en: "❌ Rejected", ja: "❌ 却下" },
  "Lọc theo gói": { vi: "Lọc theo gói", en: "Filter by plan", ja: "プランで絞り込み" },
  "Tất cả gói": { vi: "Tất cả gói", en: "All Plans", ja: "すべてのプラン" },
  "Tìm theo email, tên, mã đơn...": { vi: "Tìm theo email, tên, mã đơn...", en: "Search by email, name, request ID...", ja: "メール・名前・リクエストIDで検索..." },
  "Không có yêu cầu thanh toán nào phù hợp.": { vi: "Không có yêu cầu thanh toán nào phù hợp.", en: "No matching payment requests found.", ja: "一致する支払いリクエストはありません。" },
  "Thời gian gửi": { vi: "Thời gian gửi", en: "Submitted At", ja: "送信日時" },
  "Người dùng": { vi: "Người dùng", en: "User", ja: "ユーザー" },
  "Gói": { vi: "Gói", en: "Plan", ja: "プラン" },
  "Số tiền": { vi: "Số tiền", en: "Amount", ja: "金額" },
  "Ghi chú / Mã GD": { vi: "Ghi chú / Mã GD", en: "Note / Txn ID", ja: "メモ / 取引ID" },
  "Biên lai": { vi: "Biên lai", en: "Receipt", ja: "明細画像" },
  "Trạng thái": { vi: "Trạng thái", en: "Status", ja: "状態" },
  "Hành động": { vi: "Hành động", en: "Actions", ja: "操作" },
  "Phản hồi từ Admin": { vi: "Phản hồi từ Admin", en: "Admin Feedback", ja: "管理者からの回答" },
  "Đang chờ Quản trị viên xác nhận": { vi: "Đang chờ Quản trị viên xác nhận", en: "Awaiting Administrator confirmation", ja: "管理者の確認待ち" },
  "Gửi lại": { vi: "Gửi lại", en: "Resubmit", ja: "再送信" },
  "Xem ảnh": { vi: "Xem ảnh", en: "View Image", ja: "画像を見る" },
  "✅ Duyệt": { vi: "✅ Duyệt", en: "✅ Approve", ja: "✅ 承認" },
  "Duyệt ngay": { vi: "Duyệt ngay", en: "Approve Now", ja: "今すぐ承認" },
  "Duyệt thanh toán": { vi: "Duyệt thanh toán", en: "Approve Payment", ja: "支払いを承認" },
  "Từ chối yêu cầu thanh toán": { vi: "Từ chối yêu cầu thanh toán", en: "Reject Payment Request", ja: "支払いリクエストを却下" },
  "Lý do từ chối": { vi: "Lý do từ chối", en: "Rejection Reason", ja: "却下理由" },
  "Ví dụ: Chưa nhận được chuyển khoản, sai số tiền...": { vi: "Ví dụ: Chưa nhận được chuyển khoản, sai số tiền...", en: "e.g. Transfer not received, incorrect amount...", ja: "例: 振込が確認できない、金額相違など..." },
  "Xác nhận từ chối": { vi: "Xác nhận từ chối", en: "Confirm Rejection", ja: "却下を確定" },
  "Ảnh biên lai chuyển khoản": { vi: "Ảnh biên lai chuyển khoản", en: "Transfer Receipt Image", ja: "振込明細画像" },
  "Vui lòng nhập lý do từ chối.": { vi: "Vui lòng nhập lý do từ chối.", en: "Please enter a rejection reason.", ja: "却下理由を入力してください。" },
  "Yêu cầu bị từ chối": { vi: "Yêu cầu bị từ chối", en: "Request rejected", ja: "リクエストが却下されました" },
  "1. Cấp / nâng cấp / thu hồi gói thủ công": { vi: "1. Cấp / nâng cấp / thu hồi gói thủ công", en: "1. Grant / Upgrade / Revoke User Plan", ja: "1. プランの手動付与・アップグレード・取消" },
  "Email người dùng": { vi: "Email người dùng", en: "User Email", ja: "ユーザーメール" },
  "Hạng gói": { vi: "Hạng gói", en: "Plan Tier", ja: "プランランク" },
  "Cấp / nâng cấp": { vi: "Cấp / nâng cấp", en: "Grant / Upgrade", ja: "付与・アップグレード" },
  "Thu hồi gói": { vi: "Thu hồi gói", en: "Revoke Plan", ja: "プラン取消" },
  "Thu hồi": { vi: "Thu hồi", en: "Revoke", ja: "取消" },
  "Danh sách thành viên đang hoạt động": { vi: "Danh sách thành viên đang hoạt động", en: "Active Members", ja: "有効メンバー一覧" },
  "Hết hạn": { vi: "Hết hạn", en: "Expires", ja: "有効期限" },
  "Miễn phí": { vi: "Miễn phí", en: "Free", ja: "無料" },
  "Chưa có thành viên nào kích hoạt gói.": { vi: "Chưa có thành viên nào kích hoạt gói.", en: "No members have activated a plan yet.", ja: "プランを有効化したメンバーはまだいません。" },
  "2. 🔑 Gán hộ Google Gemini API Key theo Email người dùng": { vi: "2. 🔑 Gán hộ Google Gemini API Key theo Email người dùng", en: "2. 🔑 Assign Google Gemini API Key by User Email", ja: "2. 🔑 ユーザーメール宛に Google Gemini API Key を割り当て" },
  "Khi người dùng đăng nhập bằng Email đã được gán, hệ thống sẽ tự động kích hoạt Gemini API Key đó cho tài khoản của họ trong AI Converter.": { vi: "Khi người dùng đăng nhập bằng Email đã được gán, hệ thống sẽ tự động kích hoạt Gemini API Key đó cho tài khoản của họ trong AI Converter.", en: "When a user signs in with an assigned Email, the system automatically activates that Gemini API Key for their account in AI Converter.", ja: "割り当てられたメールアドレスでユーザーがログインすると、AI変換 でその Gemini API Key が自動的に有効化されます。" },
  "Model mặc định": { vi: "Model mặc định", en: "Default Model", ja: "デフォルトモデル" },
  "Gemini 2.5 Flash (Nhanh)": { vi: "Gemini 2.5 Flash (Nhanh)", en: "Gemini 2.5 Flash (Fast)", ja: "Gemini 2.5 Flash (高速)" },
  "Gemini 2.5 Pro (Chính xác cao)": { vi: "Gemini 2.5 Pro (Chính xác cao)", en: "Gemini 2.5 Pro (High Accuracy)", ja: "Gemini 2.5 Pro (高精度)" },
  "🔑 Gán API cho Email": { vi: "🔑 Gán API cho Email", en: "🔑 Assign API to Email", ja: "🔑 メールにAPIを割当" },
  "🔑 Gán API": { vi: "🔑 Gán API", en: "🔑 Assign API", ja: "🔑 API割当" },
  "🔑 Đã gán API": { vi: "🔑 Đã gán API", en: "🔑 API Assigned", ja: "🔑 API割当済" },
  "Đã gán Gemini API": { vi: "Đã gán Gemini API", en: "Gemini API Assigned", ja: "Gemini API 割当済" },
  "Thu hồi API": { vi: "Thu hồi API", en: "Revoke API", ja: "API取消" },
  "Thu hồi Gemini API Key": { vi: "Thu hồi Gemini API Key", en: "Revoke Gemini API Key", ja: "Gemini API Key を取消" },
  "Cập nhật": { vi: "Cập nhật", en: "Update", ja: "更新" },
  "Chưa có tài khoản nào được Admin gán Gemini API Key.": { vi: "Chưa có tài khoản nào được Admin gán Gemini API Key.", en: "No accounts have been assigned a Gemini API Key by Admin yet.", ja: "管理者によって Gemini API Key が割り当てられたアカウントはまだありません。" },
  "Cấu hình tài khoản nhận tiền VietQR": { vi: "Cấu hình tài khoản nhận tiền VietQR", en: "VietQR Receiving Bank Account Configuration", ja: "VietQR 受取銀行口座の設定" },
  "Tên ngân hàng": { vi: "Tên ngân hàng", en: "Bank Name", ja: "銀行名" },
  "Mã ngân hàng VietQR (BIN, ví dụ 970414, MB, VCB)": { vi: "Mã ngân hàng VietQR (BIN, ví dụ 970414, MB, VCB)", en: "VietQR Bank Code (BIN, e.g. 970414, MB, VCB)", ja: "VietQR 銀行コード (BIN、例: 970414, MB, VCB)" },
  "Tên chủ tài khoản": { vi: "Tên chủ tài khoản", en: "Account Holder Name", ja: "口座名義人" },
  "Lưu cấu hình": { vi: "Lưu cấu hình", en: "Save Config", ja: "設定を保存" },
  "Tạo mã giảm giá": { vi: "Tạo mã giảm giá", en: "Create Discount Code", ja: "割引クーポンの作成" },
  "Phần trăm giảm (1–100)": { vi: "Phần trăm giảm (1–100)", en: "Discount Percentage (1–100)", ja: "割引率 (1〜100%)" },
  "Thêm mã": { vi: "Thêm mã", en: "Add Code", ja: "コードを追加" },
  "Mã": { vi: "Mã", en: "Code", ja: "コード" },
  "Chưa có mã giảm giá nào.": { vi: "Chưa có mã giảm giá nào.", en: "No discount codes created yet.", ja: "割引クーポンはまだありません。" },
  "Thành viên trả phí đang hoạt động:": { vi: "Thành viên trả phí đang hoạt động:", en: "Active paid members:", ja: "有効な有料プランメンバー数:" },
  ". Xuất toàn bộ dữ liệu quản trị (thành viên, yêu cầu thanh toán, mã giảm giá, cấu hình VietQR) dưới dạng JSON.": { vi: ". Xuất toàn bộ dữ liệu quản trị (thành viên, yêu cầu thanh toán, mã giảm giá, cấu hình VietQR) dưới dạng JSON.", en: ". Export all admin data (members, payment requests, discount codes, VietQR config) as JSON.", ja: "。すべての管理データ（メンバー、支払いリクエスト、割引コード、VietQR設定）を JSON 形式でエクスポートします。" },
  "Xuất dữ liệu hệ thống (.json)": { vi: "Xuất dữ liệu hệ thống (.json)", en: "Export System Data (.json)", ja: "システムデータをエクスポート (.json)" },
  "Truy cập bị từ chối! Chỉ tài khoản quản trị phamduchieurobotics@gmail.com mới có quyền thực hiện thao tác này.": { vi: "Truy cập bị từ chối! Chỉ tài khoản quản trị phamduchieurobotics@gmail.com mới có quyền thực hiện thao tác này.", en: "Access denied! Only the administrator account phamduchieurobotics@gmail.com can perform this action.", ja: "アクセス拒否！管理者アカウント phamduchieurobotics@gmail.com のみがこの操作を実行できます。" },
  "Truy cập bị từ chối! Bạn không có quyền vào trang Quản trị.": { vi: "Truy cập bị từ chối! Bạn không có quyền vào trang Quản trị.", en: "Access denied! You do not have permission to view the Admin Panel.", ja: "アクセス拒否！管理パネルを表示する権限がありません。" },
  "Vui lòng nhập một địa chỉ email hợp lệ.": { vi: "Vui lòng nhập một địa chỉ email hợp lệ.", en: "Please enter a valid email address.", ja: "有効なメールアドレスを入力してください。" },
  "Vui lòng nhập địa chỉ email người dùng hợp lệ.": { vi: "Vui lòng nhập địa chỉ email người dùng hợp lệ.", en: "Please enter a valid user email address.", ja: "有効なユーザーメールアドレスを入力してください。" },
  "Vui lòng dán Google Gemini API Key để gán cho người dùng.": { vi: "Vui lòng dán Google Gemini API Key để gán cho người dùng.", en: "Please paste a Google Gemini API Key to assign to the user.", ja: "ユーザーに割り当てる Google Gemini API Key を貼り付けてください。" },
  "Vui lòng nhập hoặc chọn email cần thu hồi API Key.": { vi: "Vui lòng nhập hoặc chọn email cần thu hồi API Key.", en: "Please enter or select an email to revoke the API Key.", ja: "API Key を取り消すメールアドレスを入力または選択してください。" },
  "Gói không hợp lệ.": { vi: "Gói không hợp lệ.", en: "Invalid plan.", ja: "無効なプランです。" },
  "Thông tin ngân hàng/STK chưa hợp lệ.": { vi: "Thông tin ngân hàng/STK chưa hợp lệ.", en: "Invalid bank or account details.", ja: "銀行情報または口座番号が無効です。" },
  "Đã lưu cấu hình VietQR.": { vi: "Đã lưu cấu hình VietQR.", en: "Saved VietQR configuration.", ja: "VietQR 設定を保存しました。" },
  "Mã giảm giá hoặc phần trăm không hợp lệ.": { vi: "Mã giảm giá hoặc phần trăm không hợp lệ.", en: "Invalid discount code or percentage.", ja: "割引コードまたは割引率が無効です。" },
  "Mã giảm giá đã tồn tại.": { vi: "Mã giảm giá đã tồn tại.", en: "Discount code already exists.", ja: "この割引コードは既に存在します。" },
  "Đã xóa mã giảm giá.": { vi: "Đã xóa mã giảm giá.", en: "Discount code deleted.", ja: "割引コードを削除しました。" },
  "Đã xảy ra lỗi khi thực hiện thao tác quản trị.": { vi: "Đã xảy ra lỗi khi thực hiện thao tác quản trị.", en: "An error occurred while performing the admin action.", ja: "管理操作の実行中にエラーが発生しました。" },
  "Đã xảy ra lỗi khi thực hiện thao tác.": { vi: "Đã xảy ra lỗi khi thực hiện thao tác.", en: "An error occurred while performing the action.", ja: "操作の実行中にエラーが発生しました。" },
  "✏️ Chỉnh sửa hồ sơ & Ảnh đại diện": { vi: "✏️ Chỉnh sửa hồ sơ & Ảnh đại diện", en: "✏️ Edit Profile & Avatar", ja: "✏️ プロフィールとアバターを編集" },
  "Chỉnh sửa hồ sơ": { vi: "Chỉnh sửa hồ sơ", en: "Edit Profile", ja: "プロフィールを編集" },
  "Tải ảnh từ máy": { vi: "Tải ảnh từ máy", en: "Upload Image", ja: "画像をアップロード" },
  "Khôi phục ảnh Google gốc": { vi: "Khôi phục ảnh Google gốc", en: "Restore Google Avatar", ja: "Google の元の画像に戻す" },
  "Dán đường dẫn ảnh (URL)": { vi: "Dán đường dẫn ảnh (URL)", en: "Paste Image URL", ja: "画像URLを貼り付け" },
  "Dùng ảnh này": { vi: "Dùng ảnh này", en: "Use This Image", ja: "この画像を使用" },
  "Tên hiển thị": { vi: "Tên hiển thị", en: "Display Name", ja: "表示名" },
  "Tên hiển thị của bạn": { vi: "Tên hiển thị của bạn", en: "Your display name", ja: "あなたの表示名" },
  "Email Google": { vi: "Email Google", en: "Google Email", ja: "Google メール" },
  "Mã sinh viên": { vi: "Mã sinh viên", en: "Student ID", ja: "学籍番号" },
  "Mã sinh viên (tùy chọn)": { vi: "Mã sinh viên (tùy chọn)", en: "Student ID (optional)", ja: "学籍番号 (任意)" },
  "Ví dụ: 25023599": { vi: "Ví dụ: 25023599", en: "e.g. 25023599", ja: "例: 25023599" },
  "Lớp / Khoa": { vi: "Lớp / Khoa", en: "Class / Faculty", ja: "クラス / 学部" },
  "Lớp / Khoa (tùy chọn)": { vi: "Lớp / Khoa (tùy chọn)", en: "Class / Faculty (optional)", ja: "クラス / 学部 (任意)" },
  "Ví dụ: K70E - RE2": { vi: "Ví dụ: K70E - RE2", en: "e.g. K70E - RE2", ja: "例: K70E - RE2" },
  "Mục tiêu học tập": { vi: "Mục tiêu học tập", en: "Learning Goal", ja: "学習目標" },
  "Mục tiêu học tập (tùy chọn)": { vi: "Mục tiêu học tập (tùy chọn)", en: "Learning Goal (optional)", ja: "学習目標 (任意)" },
  "Ví dụ: A+ KTCT Mác - Lênin": { vi: "Ví dụ: A+ KTCT Mác - Lênin", en: "e.g. A+ Calculus / IELTS 8.0", ja: "例: 微積分 A+ / TOEIC 900" },
  "Chưa cập nhật": { vi: "Chưa cập nhật", en: "Not set", ja: "未設定" },
  "Lưu hồ sơ": { vi: "Lưu hồ sơ", en: "Save Profile", ja: "プロフィールを保存" },
  "Đã lưu hồ sơ của bạn.": { vi: "Đã lưu hồ sơ của bạn.", en: "Your profile has been saved.", ja: "プロフィールを保存しました。" },
  "Vui lòng nhập đường dẫn ảnh hợp lệ.": { vi: "Vui lòng nhập đường dẫn ảnh hợp lệ.", en: "Please enter a valid image URL.", ja: "有効な画像URLを入力してください。" },
  "Không tải được ảnh từ đường dẫn này.": { vi: "Không tải được ảnh từ đường dẫn này.", en: "Could not load image from this URL.", ja: "このURLから画像を読み込めませんでした。" },
  "Vui lòng chọn một file ảnh.": { vi: "Vui lòng chọn một file ảnh.", en: "Please select an image file.", ja: "画像ファイルを選択してください。" },
  "Không thể xử lý ảnh đã chọn.": { vi: "Không thể xử lý ảnh đã chọn.", en: "Could not process the selected image.", ja: "選択した画像を処理できませんでした。" },
  "Đã khôi phục ảnh Google gốc (nhấn Lưu để áp dụng).": { vi: "Đã khôi phục ảnh Google gốc (nhấn Lưu để áp dụng).", en: "Restored original Google avatar (click Save to apply).", ja: "元の Google アバターに戻しました（「保存」を押して適用）。" },
  "Không thể sao chép.": { vi: "Không thể sao chép.", en: "Could not copy to clipboard.", ja: "コピーできませんでした。" },
  "Không thể lưu dữ liệu vào trình duyệt (bộ nhớ đầy hoặc bị chặn).": { vi: "Không thể lưu dữ liệu vào trình duyệt (bộ nhớ đầy hoặc bị chặn).", en: "Could not save data to browser storage (storage full or blocked).", ja: "ブラウザにデータを保存できませんでした（容量不足またはブロックされています）。" },
  "Không thể tải file xuống.": { vi: "Không thể tải file xuống.", en: "Could not download file.", ja: "ファイルをダウンロードできませんでした。" },
  "Cài đặt Google Gemini API": { vi: "Cài đặt Google Gemini API", en: "Google Gemini API Settings", ja: "Google Gemini API 設定" },
  "Hỗ trợ cả API từ tài khoản Google AI Pro / Ultra / Paid, API Free và API được Quản trị viên gán theo Email.": { vi: "Hỗ trợ cả API từ tài khoản Google AI Pro / Ultra / Paid, API Free và API được Quản trị viên gán theo Email.", en: "Supports keys from Google AI Pro / Ultra / Paid accounts, Free tier API keys, and Admin-assigned email keys.", ja: "Google AI Pro / Ultra / 有料アカウントのAPI、無料版API、および管理者がメール宛に割り当てたAPIに対応しています。" },
  "🔑 Đã được Quản trị viên gán hộ Gemini API:": { vi: "🔑 Đã được Quản trị viên gán hộ Gemini API:", en: "🔑 Gemini API Assigned by Administrator:", ja: "🔑 管理者によって Gemini API が割り当てられています:" },
  "Đã được Quản trị viên gán hộ Gemini API:": { vi: "Đã được Quản trị viên gán hộ Gemini API:", en: "Gemini API Assigned by Administrator:", ja: "管理者によって Gemini API が割り当てられています:" },
  "Tài khoản": { vi: "Tài khoản", en: "Account", ja: "アカウント" },
  "đã được gán sẵn API Key (Model mặc định:": { vi: "đã được gán sẵn API Key (Model mặc định:", en: "has an assigned API Key (Default model:", ja: "には API Key が割り当て済みです（デフォルトモデル:" },
  "). Bạn có thể dùng ngay": { vi: "). Bạn có thể dùng ngay", en: "). You can immediately use", ja: "）。個人のキーを入力せずに今すぐ" },
  "mà không cần tự nhập Key cá nhân.": { vi: "mà không cần tự nhập Key cá nhân.", en: "without entering a personal key.", ja: "を利用できます。" },
  "Gemini API Key cá nhân (tùy chọn ghi đè)": { vi: "Gemini API Key cá nhân (tùy chọn ghi đè)", en: "Personal Gemini API Key (optional override)", ja: "個人用 Gemini API Key (任意・上書き用)" },
  "Dán chuỗi khóa bắt đầu bằng AIza...": { vi: "Dán chuỗi khóa bắt đầu bằng AIza...", en: "Paste your key starting with AIza...", ja: "AIza... で始まるキーを貼り付け" },
  "Hiện / Ẩn API Key": { vi: "Hiện / Ẩn API Key", en: "Show / Hide API Key", ja: "API Key を表示 / 非表示" },
  "Hiện hoặc ẩn API Key": { vi: "Hiện hoặc ẩn API Key", en: "Show or hide API Key", ja: "API Key を表示または非表示" },
  "Sau khi dán hoặc bấm Lưu Key, ô nhập tự động ẩn dưới dạng mật khẩu (••••••••). Bấm biểu tượng con mắt để xem lại bất cứ lúc nào.": { vi: "Sau khi dán hoặc bấm Lưu Key, ô nhập tự động ẩn dưới dạng mật khẩu (••••••••). Bấm biểu tượng con mắt để xem lại bất cứ lúc nào.", en: "After pasting or clicking Save Key, the input automatically masks as a password (••••••••). Click the eye icon to reveal anytime.", ja: "貼り付けまたは「キーを保存」を押すと、自動的にパスワード形式（••••••••）で隠れます。目のアイコンでいつでも確認できます。" },
  "Lưu Key": { vi: "Lưu Key", en: "Save Key", ja: "キーを保存" },
  "Kiểm tra kết nối (Test API)": { vi: "Kiểm tra kết nối (Test API)", en: "Test Connection (Test API)", ja: "API接続テスト" },
  "Kiểm tra kết nối": { vi: "Kiểm tra kết nối", en: "Test Connection", ja: "接続テスト" },
  "Xóa Key cá nhân": { vi: "Xóa Key cá nhân", en: "Delete Personal Key", ja: "個人キーを削除" },
  "Xóa Key": { vi: "Xóa Key", en: "Delete Key", ja: "キーを削除" },
  "Chọn Model Gemini AI": { vi: "Chọn Model Gemini AI", en: "Select Gemini AI Model", ja: "Gemini AI モデルを選択" },
  "Gemini 2.5 Pro – Chế độ Chính xác cao (Khuyên dùng cho Google AI Pro / Ultra / Paid)": { vi: "Gemini 2.5 Pro – Chế độ Chính xác cao (Khuyên dùng cho Google AI Pro / Ultra / Paid)", en: "Gemini 2.5 Pro – High Accuracy Mode (Recommended for Google AI Pro / Ultra / Paid)", ja: "Gemini 2.5 Pro – 高精度モード (Google AI Pro / Ultra / 有料版推奨)" },
  "Gemini 2.5 Flash – Chế độ Nhanh / Tiết kiệm (API Free)": { vi: "Gemini 2.5 Flash – Chế độ Nhanh / Tiết kiệm (API Free)", en: "Gemini 2.5 Flash – Fast / Balanced Mode (Free API)", ja: "Gemini 2.5 Flash – 高速・省コストモード (無料 API)" },
  "Gemini 3 Flash Preview – Tốc độ cao (API Free / Preview)": { vi: "Gemini 3 Flash Preview – Tốc độ cao (API Free / Preview)", en: "Gemini 3 Flash Preview – High Speed (Free / Preview API)", ja: "Gemini 3 Flash Preview – 超高速モード (無料 / Preview API)" },
  "💎 Chế độ Chính xác cao (Gemini 2.5 Pro):": { vi: "💎 Chế độ Chính xác cao (Gemini 2.5 Pro):", en: "💎 High Accuracy Mode (Gemini 2.5 Pro):", ja: "💎 高精度モード (Gemini 2.5 Pro):" },
  "Chế độ Chính xác cao (Gemini 2.5 Pro):": { vi: "Chế độ Chính xác cao (Gemini 2.5 Pro):", en: "High Accuracy Mode (Gemini 2.5 Pro):", ja: "高精度モード (Gemini 2.5 Pro):" },
  "Tối ưu tối đa cho công thức Toán/Lý/Hóa phức tạp và tự động giải đề chuẩn xác.": { vi: "Tối ưu tối đa cho công thức Toán/Lý/Hóa phức tạp và tự động giải đề chuẩn xác.", en: "Maximized accuracy for complex Math/Physics/Chemistry formulas and automated exam solving.", ja: "複雑な数学・物理・化学の数式認識と高精度な自動解答に最適化されています。" },
  "⚠️ Lưu ý khi dùng API Free / Flash:": { vi: "⚠️ Lưu ý khi dùng API Free / Flash:", en: "⚠️ Note when using Free / Flash API:", ja: "⚠️ 無料 / Flash API 使用時の注意:" },
  "Lưu ý khi dùng API Free / Flash:": { vi: "Lưu ý khi dùng API Free / Flash:", en: "Note when using Free / Flash API:", ja: "無料 / Flash API 使用時の注意:" },
  "Tốc độ nhanh & miễn phí, nhưng bạn nên mở": { vi: "Tốc độ nhanh & miễn phí, nhưng bạn nên mở", en: "Fast & free, but you should use", ja: "高速かつ無料ですが、読み取り後に" },
  "hoặc chạy": { vi: "hoặc chạy", en: "or run", ja: "を開くか、" },
  "sau khi đọc đề để đảm bảo đáp án chuẩn 100%.": { vi: "sau khi đọc đề để đảm bảo đáp án chuẩn 100%.", en: "after extraction to ensure 100% answer accuracy.", ja: "を実行して100%の解答精度を確認することをお勧めします。" },
  "🌐 Ngôn ngữ giao diện (Language / 表示言語)": { vi: "🌐 Ngôn ngữ giao diện", en: "🌐 Interface Language", ja: "🌐 表示言語" },
  "Chuyển đổi tức thì giữa Tiếng Việt, Tiếng Anh và Tiếng Nhật (giữ nguyên phông chữ hệ thống).": { vi: "Chuyển đổi tức thì giữa Tiếng Việt, Tiếng Anh và Tiếng Nhật (giữ nguyên phông chữ hệ thống).", en: "Switch instantly between Vietnamese, English, and Japanese (preserving the system font).", ja: "ベトナム語・英語・日本語を即座に切り替えます（システムフォントを維持）。" },
  "Chuyển đổi qua lại giữa Tiếng Việt, Tiếng Anh và Tiếng Nhật (giữ nguyên phông chữ).": { vi: "Chuyển đổi qua lại giữa Tiếng Việt, Tiếng Anh và Tiếng Nhật (giữ nguyên phông chữ).", en: "Switch between Vietnamese, English, and Japanese (preserving the system font).", ja: "ベトナム語・英語・日本語を切り替えます（システムフォントを維持）。" },
  "Hướng dẫn lấy Gemini API Key": { vi: "Hướng dẫn lấy Gemini API Key", en: "How to Get a Gemini API Key", ja: "Gemini API Key の取得手順" },
  "Mở Google AI Studio ↗": { vi: "Mở Google AI Studio ↗", en: "Open Google AI Studio ↗", ja: "Google AI Studio を開く ↗" },
  "Truy cập": { vi: "Truy cập", en: "Visit", ja: "上のボタンから" },
  "bằng nút mở tab mới ở trên.": { vi: "bằng nút mở tab mới ở trên.", en: "using the button above.", ja: "にアクセスします。" },
  "Đăng nhập bằng tài khoản Google của bạn (tài khoản thường, Google AI Pro hoặc Ultra).": { vi: "Đăng nhập bằng tài khoản Google của bạn (tài khoản thường, Google AI Pro hoặc Ultra).", en: "Sign in with your Google account (standard, Google AI Pro, or Ultra).", ja: "Google アカウント（通常、Google AI Pro、または Ultra）でログインします。" },
  "Nhấn nút": { vi: "Nhấn nút", en: "Click", ja: "ボタン" },
  "Create API Key (Tạo khóa API)": { vi: "Create API Key (Tạo khóa API)", en: "Create API Key", ja: "APIキーを作成" },
  "và chọn hoặc tạo một dự án Google Cloud.": { vi: "và chọn hoặc tạo một dự án Google Cloud.", en: "and select or create a Google Cloud project.", ja: "を押して Google Cloud プロジェクトを選択または作成します。" },
  "Sao chép chuỗi khóa bắt đầu bằng": { vi: "Sao chép chuỗi khóa bắt đầu bằng", en: "Copy the key string starting with", ja: "で始まるキー文字列をコピーし：" },
  ", dán vào ô phía trên rồi bấm": { vi: ", dán vào ô phía trên rồi bấm", en: ", paste it into the box above, and click", ja: "、上の入力欄に貼り付けて" },
  "và": { vi: "và", en: "and", ja: "および" },
  "🔒 Bảo mật:": { vi: "🔒 Bảo mật:", en: "🔒 Security:", ja: "🔒 セキュリティ:" },
  "Bảo mật:": { vi: "Bảo mật:", en: "Security:", ja: "セキュリティ:" },
  "API Key chỉ lưu cục bộ hoặc được Quản trị viên gán theo Email đăng nhập và chỉ gửi trực tiếp tới máy chủ chính thức của Google Gemini API.": { vi: "API Key chỉ lưu cục bộ hoặc được Quản trị viên gán theo Email đăng nhập và chỉ gửi trực tiếp tới máy chủ chính thức của Google Gemini API.", en: "Your API Key is stored locally or assigned by Admin to your login Email, and is sent directly only to official Google Gemini API servers.", ja: "API Key はローカル保存または管理者によりログインメール宛に割り当てられ、Google Gemini API 公式サーバーにのみ直接送信されます。" },
  "Chưa cấu hình": { vi: "Chưa cấu hình", en: "Not configured", ja: "未設定" },
  "Đã lưu Key": { vi: "Đã lưu Key", en: "Key Saved", ja: "キー保存済み" },
  "Đã lưu Key cá nhân": { vi: "Đã lưu Key cá nhân", en: "Personal Key Saved", ja: "個人キー保存済み" },
  "✅ Đã gán bởi Admin": { vi: "✅ Đã gán bởi Admin", en: "✅ Assigned by Admin", ja: "✅ 管理者により割当済" },
  "✅ Kết nối thành công": { vi: "✅ Kết nối thành công", en: "✅ Connected", ja: "✅ 接続成功" },
  "❌ Key không hợp lệ": { vi: "❌ Key không hợp lệ", en: "❌ Invalid Key", ja: "❌ 無効なキー" },
  "Đang kiểm tra...": { vi: "Đang kiểm tra...", en: "Testing...", ja: "確認中..." },
  "Vui lòng nhập Gemini API Key trước.": { vi: "Vui lòng nhập Gemini API Key trước.", en: "Please enter a Gemini API Key first.", ja: "先に Gemini API Key を入力してください。" },
  "Kết nối Gemini API thành công!": { vi: "Kết nối Gemini API thành công!", en: "Connected to Gemini API successfully!", ja: "Gemini API への接続に成功しました！" },
  "Vui lòng dán chuỗi Gemini API Key.": { vi: "Vui lòng dán chuỗi Gemini API Key.", en: "Please paste a Gemini API Key string.", ja: "Gemini API Key を貼り付けてください。" },
  "Đã lưu API Key cục bộ trên trình duyệt.": { vi: "Đã lưu API Key cục bộ trên trình duyệt.", en: "Saved API Key locally in this browser.", ja: "ブラウザに API Key を保存しました。" },
  "Xóa API Key": { vi: "Xóa API Key", en: "Delete API Key", ja: "API Key を削除" },
  "Bạn có chắc muốn xóa Gemini API Key cá nhân đã lưu?": { vi: "Bạn có chắc muốn xóa Gemini API Key cá nhân đã lưu?", en: "Are you sure you want to delete your saved personal Gemini API Key?", ja: "保存された個人用 Gemini API Key を削除してもよろしいですか？" },
  "Đã xóa API Key cá nhân.": { vi: "Đã xóa API Key cá nhân.", en: "Personal API Key deleted.", ja: "個人用 API Key を削除しました。" },
  "Model Gemini Pro được ưu tiên cho gói Diamond VIP (bạn vẫn có thể dùng nếu có API Key cá nhân).": { vi: "Model Gemini Pro được ưu tiên cho gói Diamond VIP (bạn vẫn có thể dùng nếu có API Key cá nhân).", en: "Gemini Pro is optimized for Diamond VIP (you can still use it with your own API Key).", ja: "Gemini Pro は Diamond VIP 優先モデルです（個人の API Key があれば利用可能です）。" },
  "Đã dán & tự động ẩn API Key.": { vi: "Đã dán & tự động ẩn API Key.", en: "Pasted & automatically masked API Key.", ja: "API Key を貼り付け、自動的に非表示にしました。" },
  "Chưa có Gemini API Key! Hãy cài đặt API Key trước khi chạy AI.": { vi: "Chưa có Gemini API Key! Hãy cài đặt API Key trước khi chạy AI.", en: "No Gemini API Key found! Please configure an API Key before running AI.", ja: "Gemini API Key が未設定です！AI を実行する前に API Key を設定してください。" },
  "Đi tới Cài đặt API": { vi: "Đi tới Cài đặt API", en: "Go to API Settings", ja: "API設定へ移動" },
  "Cài đặt API": { vi: "Cài đặt API", en: "API Settings", ja: "API設定" },
  "⚠️ Bạn chưa cài đặt Gemini API Key (cần thiết để dùng AI đọc ảnh, giải đề & Double-Check).": { vi: "⚠️ Bạn chưa cài đặt Gemini API Key (cần thiết để dùng AI đọc ảnh, giải đề & Double-Check).", en: "⚠️ You have not configured a Gemini API Key yet (required for AI Vision OCR, solving & Double-Check).", ja: "⚠️ Gemini API Key が未設定です（AI 画像読取・自動解答・ダブルチェックに必要です）。" },
  "Đi tới trang Cài đặt API →": { vi: "Đi tới trang Cài đặt API →", en: "Go to API Settings →", ja: "API設定ページへ →" },
  "1. Tải đề thi thông minh": { vi: "1. Tải đề thi thông minh", en: "1. Smart Exam Uploader", ja: "1. スマート試験ファイルアップロード" },
  "Tự động nhận diện": { vi: "Tự động nhận diện", en: "Auto-Detect", ja: "自動判別" },
  "📂 Chọn, kéo thả hoặc Ctrl+V tệp đề thi": { vi: "📂 Chọn, kéo thả hoặc Ctrl+V tệp đề thi", en: "📂 Select, drag & drop, or Ctrl+V exam files", ja: "📂 試験ファイルを選択・ドラッグ＆ドロップ・Ctrl+V貼付" },
  "Ảnh → AI Vision • Tài liệu đủ Đ/A → Chuyển ngay • Thiếu Đ/A → AI giải & kiểm tra chéo": { vi: "Ảnh → AI Vision • Tài liệu đủ Đ/A → Chuyển ngay • Thiếu Đ/A → AI giải & kiểm tra chéo", en: "Images → AI Vision • Docs with keys → Instant convert • Missing keys → AI solve & double-check", ja: "画像 → AI Vision • 解答付き文書 → 即時変換 • 解答なし → AI 解答＆ダブルチェック" },
  "Ảnh → AI Vision": { vi: "Ảnh → AI Vision", en: "Image → AI Vision", ja: "画像 → AI Vision" },
  "Tài liệu": { vi: "Tài liệu", en: "Document", ja: "ドキュメント" },
  "Xóa hết": { vi: "Xóa hết", en: "Clear All", ja: "すべてクリア" },
  "✍️ Hoặc dán nhanh văn bản / Markdown trực tiếp": { vi: "✍️ Hoặc dán nhanh văn bản / Markdown trực tiếp", en: "✍️ Or paste raw text / Markdown directly", ja: "✍️ またはテキスト / Markdown を直接貼り付け" },
  "Dán câu hỏi trắc nghiệm hoặc Markdown tại đây (nếu thiếu đáp án AI sẽ tự giải)...": { vi: "Dán câu hỏi trắc nghiệm hoặc Markdown tại đây (nếu thiếu đáp án AI sẽ tự giải)...", en: "Paste multiple-choice questions or Markdown here (AI will solve missing answers automatically)...", ja: "ここに問題文または Markdown を貼り付けてください（解答がない場合は AI が自動解答します）..." },
  "Tự động giải & kiểm tra chéo nếu thiếu đáp án": { vi: "Tự động giải & kiểm tra chéo nếu thiếu đáp án", en: "Auto-solve & double-check if answer keys are missing", ja: "解答がない場合は自動で AI 解答＆ダブルチェック" },
  "Tự động tải Excel sau khi xong": { vi: "Tự động tải Excel sau khi xong", en: "Auto-download Excel when finished", ja: "完了後に Excel を自動ダウンロード" },
  "Nối thêm vào danh sách hiện có": { vi: "Nối thêm vào danh sách hiện có", en: "Append to current question list", ja: "現在のリストの末尾に追加" },
  "Giữ tiền tố số câu (Câu 1.)": { vi: "Giữ tiền tố số câu (Câu 1.)", en: "Keep question number prefix (Q1.)", ja: "問題番号の接頭辞 (問1.) を維持" },
  "Đang xử lý thông minh...": { vi: "Đang xử lý thông minh...", en: "Smart processing...", ja: "スマート処理中..." },
  "✨ Bắt đầu chuyển đổi thông minh": { vi: "✨ Bắt đầu chuyển đổi thông minh", en: "✨ Start Smart Conversion", ja: "✨ スマート変換を開始" },
  "Dừng": { vi: "Dừng", en: "Stop", ja: "停止" },
  "Đã trích xuất nội dung": { vi: "Đã trích xuất nội dung", en: "Content extracted", ja: "コンテンツ抽出完了" },
  "Đang trích xuất nội dung...": { vi: "Đang trích xuất nội dung...", en: "Extracting content...", ja: "コンテンツを抽出中..." },
  "Đã kiểm tra cấu trúc & đáp án": { vi: "Đã kiểm tra cấu trúc & đáp án", en: "Structure & answer keys checked", ja: "構造と解答キーを確認完了" },
  "Đang kiểm tra đáp án...": { vi: "Đang kiểm tra đáp án...", en: "Checking answer keys...", ja: "解答キーを確認中..." },
  "Đang kiểm tra cấu trúc câu hỏi & đáp án...": { vi: "Đang kiểm tra cấu trúc câu hỏi & đáp án...", en: "Checking question structure & answer keys...", ja: "問題構造と解答キーを確認中..." },
  "AI đã giải & kiểm tra chéo xong": { vi: "AI đã giải & kiểm tra chéo xong", en: "AI solved & double-checked", ja: "AI 解答・ダブルチェック完了" },
  "AI đã giải & kiểm tra chéo 100% khớp!": { vi: "AI đã giải & kiểm tra chéo 100% khớp!", en: "AI solved & double-checked (100% verified)!", ja: "AI 解答・ダブルチェック完了 (100%一致)！" },
  "Đã đủ đáp án – chuyển đổi trực tiếp (không cần gọi AI)": { vi: "Đã đủ đáp án – chuyển đổi trực tiếp (không cần gọi AI)", en: "Answer keys present – converted directly (no AI call needed)", ja: "解答キー完備 – 直接変換完了 (AI 呼び出し不要)" },
  "Đã đủ đáp án hợp lệ – bỏ qua bước AI giải": { vi: "Đã đủ đáp án hợp lệ – bỏ qua bước AI giải", en: "Valid answer keys present – skipped AI solving step", ja: "有効な解答キーあり – AI 解答ステップをスキップ" },
  "AI đang giải & kiểm tra chéo...": { vi: "AI đang giải & kiểm tra chéo...", en: "AI solving & double-checking...", ja: "AI が解答・ダブルチェック中..." },
  "AI Vision & kiểm tra chéo...": { vi: "AI Vision & kiểm tra chéo...", en: "AI Vision & double-checking...", ja: "AI Vision 読取・ダブルチェック中..." },
  "PDF scan → AI Vision đang đọc & giải...": { vi: "PDF scan → AI Vision đang đọc & giải...", en: "Scanned PDF → AI Vision reading & solving...", ja: "スキャンPDF → AI Vision が読取・解答中..." },
  "Định dạng tự do → AI đang đọc, giải & kiểm tra chéo...": { vi: "Định dạng tự do → AI đang đọc, giải & kiểm tra chéo...", en: "Unstructured format → AI reading, solving & double-checking...", ja: "自由形式 → AI が構造化・解答・ダブルチェック中..." },
  "AI đang giải đáp án còn thiếu...": { vi: "AI đang giải đáp án còn thiếu...", en: "AI solving remaining missing answers...", ja: "AI が未解答の問題を解答中..." },
  "AI đang kiểm tra chéo độ chính xác đáp án...": { vi: "AI đang kiểm tra chéo độ chính xác đáp án...", en: "AI double-checking answer accuracy...", ja: "AI が解答精度をダブルチェック中..." },
  "2. File mẫu & Kiểm duyệt AI": { vi: "2. File mẫu & Kiểm duyệt AI", en: "2. Template & AI Verification", ja: "2. テンプレートとAI検証" },
  "Đã tích hợp sẵn cấu trúc chuẩn 11 cột": { vi: "Đã tích hợp sẵn cấu trúc chuẩn 11 cột", en: "Built-in 11-column standard format", ja: "標準11列フォーマット内蔵" },
  "(không cần tải file mẫu lên).": { vi: "(không cần tải file mẫu lên).", en: "(no need to upload a template file).", ja: "（テンプレートのアップロード不要）。" },
  "👁️ Xem file mẫu": { vi: "👁️ Xem file mẫu", en: "👁️ View Template", ja: "👁️ サンプルを表示" },
  "⬇ Tải file mẫu (.xlsx)": { vi: "⬇ Tải file mẫu (.xlsx)", en: "⬇ Download Template (.xlsx)", ja: "⬇ テンプレート (.xlsx)" },
  "Nạp nhanh bảng đáp án thủ công": { vi: "Nạp nhanh bảng đáp án thủ công", en: "Quick Manual Answer Key Input", ja: "手動で解答キーを一括適用" },
  "1.C 2.A 3.D 4.B hoặc 1-c, 2-a,c": { vi: "1.C 2.A 3.D 4.B hoặc 1-c, 2-a,c", en: "1.C 2.A 3.D 4.B or 1-c, 2-a,c", ja: "1.C 2.A 3.D 4.B または 1-c, 2-a,c" },
  "Áp dụng đáp án": { vi: "Áp dụng đáp án", en: "Apply Answer Key", ja: "解答キーを適用" },
  "🔍 AI Kiểm tra lại toàn bộ đáp án (Double-Check)": { vi: "🔍 AI Kiểm tra lại toàn bộ đáp án (Double-Check)", en: "🔍 AI Double-Check All Answers", ja: "🔍 AI 全解答ダブルチェック" },
  "🔒 🔍 AI Kiểm tra lại toàn bộ đáp án (Double-Check)": { vi: "🔒 🔍 AI Kiểm tra lại toàn bộ đáp án (Double-Check)", en: "🔒 🔍 AI Double-Check All Answers", ja: "🔒 🔍 AI 全解答ダブルチェック" },
  "3. Chuẩn hóa & Xuất file": { vi: "3. Chuẩn hóa & Xuất file", en: "3. Normalize & Export", ja: "3. 正規化とエクスポート" },
  "Chế độ môn học": { vi: "Chế độ môn học", en: "Subject Mode", ja: "科目モード" },
  "Toán - Lý - Hóa (Chuyên LaTeX)": { vi: "Toán - Lý - Hóa (Chuyên LaTeX)", en: "Math - Physics - Chemistry (LaTeX)", ja: "数学・物理・化学 (LaTeX特化)" },
  "Tiếng Anh (Gạch chân <u>, trọng âm)": { vi: "Tiếng Anh (Gạch chân <u>, trọng âm)", en: "English (Underline <u>, stress marks)", ja: "英語 (下線 <u>・アクセント記号)" },
  "Môn lý thuyết khác": { vi: "Môn lý thuyết khác", en: "General / Theory Subjects", ja: "その他の理論・一般科目" },
  "Định dạng Đáp án": { vi: "Định dạng Đáp án", en: "Answer Format", ja: "正解の出力形式" },
  "Số (1–5)": { vi: "Số (1–5)", en: "Number (1–5)", ja: "数字 (1–5)" },
  "Chữ (A–E)": { vi: "Chữ (A–E)", en: "Letter (A–E)", ja: "英字 (A–E)" },
  "Thời gian (giây)": { vi: "Thời gian (giây)", en: "Time (seconds)", ja: "制限時間 (秒)" },
  "Phạm vi xuất": { vi: "Phạm vi xuất", en: "Export Scope", ja: "出力範囲" },
  "Chỉ câu có Đ/A": { vi: "Chỉ câu có Đ/A", en: "Answered only", ja: "正解ありのみ" },
  "Chia file": { vi: "Chia file", en: "Split File", ja: "ファイル分割" },
  "Gộp 1 file": { vi: "Gộp 1 file", en: "Single file", ja: "1ファイルにまとめる" },
  "Giữ chuẩn LaTeX ($...$)": { vi: "Giữ chuẩn LaTeX ($...$)", en: "Keep LaTeX math ($...$)", ja: "LaTeX 数式 ($...$) を維持" },
  "Giữ thẻ HTML (<u>, <b>, <i>)": { vi: "Giữ thẻ HTML (<u>, <b>, <i>)", en: "Keep HTML tags (<u>, <b>, <i>)", ja: "HTMLタグ (<u>, <b>, <i>) を維持" },
  "Tên file:": { vi: "Tên file:", en: "Filename:", ja: "ファイル名:" },
  "Tên bộ đề (1-Click Import)": { vi: "Tên bộ đề (1-Click Import)", en: "Deck Title (1-Click Import)", ja: "問題集タイトル (ワンクリック登録)" },
  "Thẻ môn học / Tag": { vi: "Thẻ môn học / Tag", en: "Subject / Tag", ja: "科目 / タグ" },
  "VD: Giải tích, Tiếng Anh": { vi: "VD: Giải tích, Tiếng Anh", en: "e.g. Calculus, English", ja: "例: 微積分、英語" },
  "Đích lưu": { vi: "Đích lưu", en: "Target Deck", ja: "保存先" },
  "Đích lưu (Gộp cần Gold)": { vi: "Đích lưu (Gộp cần Gold)", en: "Target Deck (Merge requires Gold)", ja: "保存先 (統合は Gold 以上)" },
  "🎮 Mở trong Creator Studio": { vi: "🎮 Mở trong Creator Studio", en: "🎮 Open in Creator Studio", ja: "🎮 クリエイタースタジオ で開く" },
  "Kiểm duyệt & Chỉnh sửa câu hỏi": { vi: "Kiểm duyệt & Chỉnh sửa câu hỏi", en: "Review & Edit Questions", ja: "問題の確認と編集" },
  "Bảng nhanh": { vi: "Bảng nhanh", en: "Quick Table", ja: "クイック表" },
  "Đối chiếu song song (Split-Screen)": { vi: "Đối chiếu song song (Split-Screen)", en: "Split-Screen Review", ja: "並列レビュー (Split-Screen)" },
  "🔒 Đối chiếu song song (Split-Screen)": { vi: "🔒 Đối chiếu song song (Split-Screen)", en: "🔒 Split-Screen Review", ja: "🔒 並列レビュー (Split-Screen)" },
  "✓ Duyệt tất cả": { vi: "✓ Duyệt tất cả", en: "✓ Verify All", ja: "✓ すべて承認" },
  "Xóa bảng": { vi: "Xóa bảng", en: "Clear Table", ja: "表をクリア" },
  "Tìm theo số câu hoặc từ khóa...": { vi: "Tìm theo số câu hoặc từ khóa...", en: "Search by question # or keyword...", ja: "問題番号またはキーワードで検索..." },
  "Chưa có câu hỏi nào. Hãy tải tệp Ảnh, PDF, Word, Markdown/Text hoặc Excel ở Khối 1 để bắt đầu.": { vi: "Chưa có câu hỏi nào. Hãy tải tệp Ảnh, PDF, Word, Markdown/Text hoặc Excel ở Khối 1 để bắt đầu.", en: "No questions loaded yet. Upload Image, PDF, Word, Markdown/Text, or Excel files in Panel 1 to start.", ja: "問題がまだありません。パネル1から画像・PDF・Word・Markdown/Text・Excel をアップロードして開始してください。" },
  "Ảnh đề gốc": { vi: "Ảnh đề gốc", en: "Original Exam Image", ja: "元の試験画像" },
  "Chưa có ảnh đề gốc nào trong hàng đợi. Bạn có thể tải ảnh ở Khối 1 để đối chiếu song song.": { vi: "Chưa có ảnh đề gốc nào trong hàng đợi. Bạn có thể tải ảnh ở Khối 1 để đối chiếu song song.", en: "No original exam images in the queue. Upload images in Panel 1 for side-by-side comparison.", ja: "元の試験画像がありません。パネル1で画像をアップロードすると並列比較できます。" },
  "Câu hỏi (KaTeX + HTML)": { vi: "Câu hỏi (KaTeX + HTML)", en: "Question (KaTeX + HTML)", ja: "問題文 (KaTeX + HTML)" },
  "Phương án": { vi: "Phương án", en: "Options", ja: "選択肢" },
  "Đáp án": { vi: "Đáp án", en: "Answer", ja: "正解" },
  "Duyệt": { vi: "Duyệt", en: "Verified", ja: "承認" },
  "⚠️ Cần kiểm tra kỹ": { vi: "⚠️ Cần kiểm tra kỹ", en: "⚠️ Needs Review", ja: "⚠️ 要確認" },
  "Thiếu Đ/A": { vi: "Thiếu Đ/A", en: "Missing Key", ja: "解答なし" },
  "✓ Đã duyệt (Verified)": { vi: "✓ Đã duyệt (Verified)", en: "✓ Verified", ja: "✓ 承認済み (Verified)" },
  "Sửa nội dung câu hỏi": { vi: "Sửa nội dung câu hỏi", en: "Edit question text", ja: "問題文を編集" },
  "Giải thích đáp án...": { vi: "Giải thích đáp án...", en: "Answer explanation...", ja: "解答の解説..." },
  "Nội dung (LaTeX & HTML)": { vi: "Nội dung (LaTeX & HTML)", en: "Content (LaTeX & HTML)", ja: "問題内容 (LaTeX & HTML)" },
  "Xem trước trực quan": { vi: "Xem trước trực quan", en: "Live Preview", ja: "ライブプレビュー" },
  "File mẫu chuẩn 11 cột – AI_Tutor.xlsx": { vi: "File mẫu chuẩn 11 cột – AI_Tutor.xlsx", en: "11-Column Standard Template – AI_Tutor.xlsx", ja: "標準11列テンプレート – AI_Tutor.xlsx" },
  "AI kiểm tra chéo khớp đáp án (Độ tự tin cao).": { vi: "AI kiểm tra chéo khớp đáp án (Độ tự tin cao).", en: "AI cross-check matched answer (High confidence).", ja: "AI ダブルチェックで解答一致（高信頼度）。" },
  "Vui lòng chọn / kéo thả tệp tài liệu (Ảnh, PDF, Word, Markdown/Text) hoặc dán nội dung trước.": { vi: "Vui lòng chọn / kéo thả tệp tài liệu (Ảnh, PDF, Word, Markdown/Text) hoặc dán nội dung trước.", en: "Please select / drag & drop files (Image, PDF, Word, Markdown/Text) or paste content first.", ja: "先にファイル（画像・PDF・Word・Markdown/Text）を選択/ドロップするか、テキストを貼り付けてください。" },
  "Không tìm thấy câu hỏi hợp lệ nào trong tệp đã tải lên.": { vi: "Không tìm thấy câu hỏi hợp lệ nào trong tệp đã tải lên.", en: "No valid questions found in the uploaded file(s).", ja: "アップロードされたファイル内に有効な問題が見つかりませんでした。" },
  "Đã dừng quá trình xử lý. Các câu đã trích xuất được giữ lại.": { vi: "Đã dừng quá trình xử lý. Các câu đã trích xuất được giữ lại.", en: "Processing stopped. Extracted questions have been kept.", ja: "処理を停止しました。抽出済みの問題は保持されています。" },
  "Tất cả câu hỏi đều đã có đáp án.": { vi: "Tất cả câu hỏi đều đã có đáp án.", en: "All questions already have answer keys.", ja: "すべての問題にすでに正解が設定されています。" },
  "Chưa có câu hỏi nào để kiểm tra chéo.": { vi: "Chưa có câu hỏi nào để kiểm tra chéo.", en: "No questions available to double-check.", ja: "ダブルチェックする問題がありません。" },
  "AI Double-Check hoàn tất: toàn bộ đáp án đều khớp & tự tin cao!": { vi: "AI Double-Check hoàn tất: toàn bộ đáp án đều khớp & tự tin cao!", en: "AI Double-Check complete: all answers matched with high confidence!", ja: "AI ダブルチェック完了：すべての解答が高い信頼度で一致しました！" },
  "Đã dừng kiểm tra chéo.": { vi: "Đã dừng kiểm tra chéo.", en: "Stopped double-check.", ja: "ダブルチェックを停止しました。" },
  "Còn câu chưa duyệt": { vi: "Còn câu chưa duyệt", en: "Unverified Questions Remaining", ja: "未承認の問題があります" },
  "Tiếp tục": { vi: "Tiếp tục", en: "Continue", ja: "続行" },
  "Không có câu hỏi hợp lệ để xuất.": { vi: "Không có câu hỏi hợp lệ để xuất.", en: "No valid questions to export.", ja: "エクスポートできる有効な問題がありません。" },
  "Chưa có câu hỏi hợp lệ có đáp án để nhập. Hãy chạy AI giải đáp án hoặc chọn đáp án trước.": { vi: "Chưa có câu hỏi hợp lệ có đáp án để nhập. Hãy chạy AI giải đáp án hoặc chọn đáp án trước.", en: "No valid questions with answer keys to import. Run AI Solver or select answers first.", ja: "正解が設定された有効な問題がありません。先に AI 解答を実行するか正解を選択してください。" },
  "Chưa có câu hỏi hợp lệ để mở trong Creator Studio.": { vi: "Chưa có câu hỏi hợp lệ để mở trong Creator Studio.", en: "No valid questions to open in Creator Studio.", ja: "クリエイタースタジオ で開ける有効な問題がありません。" },
  "Đã đánh dấu duyệt tất cả câu hỏi.": { vi: "Đã đánh dấu duyệt tất cả câu hỏi.", en: "Marked all questions as verified.", ja: "すべての問題を承認済みにしました。" },
  "Xóa toàn bộ câu hỏi trong AI Converter?": { vi: "Xóa toàn bộ câu hỏi trong AI Converter?", en: "Clear all questions in AI Converter?", ja: "AI変換 内のすべての問題をクリアしますか？" },
  "Thiếu nội dung câu hỏi.": { vi: "Thiếu nội dung câu hỏi.", en: "Question text is required.", ja: "問題文が入力されていません。" },
  "Cần ít nhất 2 phương án.": { vi: "Cần ít nhất 2 phương án.", en: "At least 2 options are required.", ja: "選択肢は最低2つ必要です。" },
  "Cần có câu hỏi và danh sách đáp án.": { vi: "Cần có câu hỏi và danh sách đáp án.", en: "Questions and an answer key list are required.", ja: "問題と解答キーリストが必要です。" },
  "Không khớp định dạng đáp án.": { vi: "Không khớp định dạng đáp án.", en: "Answer key format did not match.", ja: "解答キーの形式が一致しません。" },
  "Định dạng không hỗ trợ. Hãy chọn Ảnh (.png/.jpg/.webp), Markdown/Text (.md/.txt), PDF (.pdf), Word (.doc/.docx) hoặc Excel (.xlsx).": { vi: "Định dạng không hỗ trợ. Hãy chọn Ảnh (.png/.jpg/.webp), Markdown/Text (.md/.txt), PDF (.pdf), Word (.doc/.docx) hoặc Excel (.xlsx).", en: "Unsupported format. Please select Image (.png/.jpg/.webp), Markdown/Text (.md/.txt), PDF (.pdf), Word (.doc/.docx), or Excel (.xlsx).", ja: "未対応の形式です。画像 (.png/.jpg/.webp)、Markdown/Text (.md/.txt)、PDF (.pdf)、Word (.doc/.docx)、または Excel (.xlsx) を選択してください。" },
  "🎮 Creator Studio / Quiz Studio": { vi: "🎮 Creator Studio / Quiz Studio", en: "🎮 Creator Studio / Quiz Studio", ja: "🎮 クリエイタースタジオ" },
  "Trình tạo & chơi Quiz tương tác chuẩn Quizizz / Wayground (KaTeX, Streak, Redemption, thời gian từng câu).": { vi: "Trình tạo & chơi Quiz tương tác chuẩn Quizizz / Wayground (KaTeX, Streak, Redemption, thời gian từng câu).", en: "Interactive Quizizz / Wayground-style Quiz creator & player (KaTeX, Streak, Redemption, per-question timer).", ja: "Quizizz / Wayground スタイルのインタラクティブクイズ作成＆プレイヤー（KaTeX、連続正解、復習問題、問題別タイマー）。" },
  "✍️ Tạo Quiz thủ công": { vi: "✍️ Tạo Quiz thủ công", en: "✍️ Create Quiz Manually", ja: "✍️ 手動でクイズ作成" },
  "Tự soạn từng câu hỏi với toolbar B/I/U, LaTeX & ảnh": { vi: "Tự soạn từng câu hỏi với toolbar B/I/U, LaTeX & ảnh", en: "Author questions with B/I/U toolbar, LaTeX math & images", ja: "B/I/U ツールバー・LaTeX 数式・画像付きで問題を作成" },
  "Tạo Quiz mới": { vi: "Tạo Quiz mới", en: "Create New Quiz", ja: "新規クイズ作成" },
  "📚 Lấy từ Kho đề AI Tutor": { vi: "📚 Lấy từ Kho đề AI Tutor", en: "📚 Load from AI Tutor Decks", ja: "📚 AI Tutor 問題集から読み込む" },
  "Chưa có bộ đề nào": { vi: "Chưa có bộ đề nào", en: "No decks available", ja: "問題集がありません" },
  "✨ Nhập từ AI Converter": { vi: "✨ Nhập từ AI Converter", en: "✨ Import from AI Converter", ja: "✨ AI変換 から取り込む" },
  "Bạn chưa lưu Quiz nào trong Creator Studio. Hãy tạo mới hoặc chọn từ Kho đề ở trên!": { vi: "Bạn chưa lưu Quiz nào trong Creator Studio. Hãy tạo mới hoặc chọn từ Kho đề ở trên!", en: "You haven't saved any Quizzes in Creator Studio yet. Create one or load from your Decks above!", ja: "クリエイタースタジオ に保存されたクイズはまだありません。新規作成するか上の問題集から読み込んでください！" },
  "▶ Bắt đầu làm bài (Play)": { vi: "▶ Bắt đầu làm bài (Play)", en: "▶ Start Quiz (Play)", ja: "▶ クイズ開始" },
  "Chỉnh sửa": { vi: "Chỉnh sửa", en: "Edit", ja: "編集" },
  "✏️ Chỉnh sửa": { vi: "✏️ Chỉnh sửa", en: "✏️ Edit", ja: "✏️ 編集" },
  "📋 Nhân bản": { vi: "📋 Nhân bản", en: "📋 Duplicate", ja: "📋 複製" },
  "🗑 Xóa": { vi: "🗑 Xóa", en: "🗑 Delete", ja: "🗑 削除" },
  "← Danh sách": { vi: "← Danh sách", en: "← Back to List", ja: "← 一覧へ戻る" },
  "Tên Quiz...": { vi: "Tên Quiz...", en: "Quiz Title...", ja: "クイズのタイトル..." },
  "Môn học / Tag": { vi: "Môn học / Tag", en: "Subject / Tag", ja: "科目 / タグ" },
  "Thời gian hàng loạt": { vi: "Thời gian hàng loạt", en: "Batch question timer", ja: "一括制限時間" },
  "Đặt thời gian hàng loạt": { vi: "Đặt thời gian hàng loạt", en: "Apply Batch Time", ja: "一括時間を適用" },
  "Lưu vào Kho đề": { vi: "Lưu vào Kho đề", en: "Save to Decks", ja: "問題集に保存" },
  "💾 Lưu Quiz": { vi: "💾 Lưu Quiz", en: "💾 Save Quiz", ja: "💾 クイズを保存" },
  "+ Thêm câu hỏi mới": { vi: "+ Thêm câu hỏi mới", en: "+ Add New Question", ja: "+ 新しい問題を追加" },
  "Quiz này chưa có câu hỏi nào. Nhấn": { vi: "Quiz này chưa có câu hỏi nào. Nhấn", en: "This Quiz has no questions yet. Click", ja: "このクイズにはまだ問題がありません。" },
  "để mở Question Builder chuẩn Quizizz!": { vi: "để mở Question Builder chuẩn Quizizz!", en: "to open the Quizizz-style Question Builder!", ja: "を押して Question Builder を開きましょう！" },
  "(⏱️ Tuỳ chỉnh thời gian riêng mở khóa đầy đủ từ gói Silver)": { vi: "(⏱️ Tuỳ chỉnh thời gian riêng mở khóa đầy đủ từ gói Silver)", en: "(⏱️ Custom per-question timer unlocks fully from Silver plan)", ja: "(⏱️ 問題別の時間設定は Silver プラン以上で完全解放)" },
  "Nhiều đáp án": { vi: "Nhiều đáp án", en: "Multiple Answers", ja: "複数正解" },
  "1 đáp án": { vi: "1 đáp án", en: "Single Answer", ja: "単一正解" },
  "Không giới hạn": { vi: "Không giới hạn", en: "Unlimited", ja: "無制限" },
  "∞ Không giới hạn": { vi: "∞ Không giới hạn", en: "∞ Unlimited", ja: "∞ 無制限" },
  "Tạo câu hỏi mới (Question Builder)": { vi: "Tạo câu hỏi mới (Question Builder)", en: "Create New Question (Question Builder)", ja: "新規問題作成 (Question Builder)" },
  "In đậm": { vi: "In đậm", en: "Bold", ja: "太字" },
  "In nghiêng": { vi: "In nghiêng", en: "Italic", ja: "斜体" },
  "Gạch chân": { vi: "Gạch chân", en: "Underline", ja: "下線" },
  "Chèn công thức Toán LaTeX": { vi: "Chèn công thức Toán LaTeX", en: "Insert LaTeX math formula", ja: "LaTeX 数式を挿入" },
  "∑ Công thức Toán (LaTeX)": { vi: "∑ Công thức Toán (LaTeX)", en: "∑ Math Formula (LaTeX)", ja: "∑ 数式 (LaTeX)" },
  "Chèn ảnh": { vi: "Chèn ảnh", en: "Insert Image", ja: "画像を挿入" },
  "🖼️ Chèn link ảnh": { vi: "🖼️ Chèn link ảnh", en: "🖼️ Insert Image URL", ja: "🖼️ 画像URLを挿入" },
  "Single Choice (1 đáp án)": { vi: "Single Choice (1 đáp án)", en: "Single Choice (1 correct answer)", ja: "Single Choice (単一正解)" },
  "Multiple Choice (Nhiều đáp án)": { vi: "Multiple Choice (Nhiều đáp án)", en: "Multiple Choice (Multiple correct answers)", ja: "Multiple Choice (複数正解)" },
  "Nhập câu hỏi... (dùng $...$ cho công thức LaTeX, <u>...</u> cho gạch chân)": { vi: "Nhập câu hỏi... (dùng $...$ cho công thức LaTeX, <u>...</u> cho gạch chân)", en: "Enter question... (use $...$ for LaTeX math, <u>...</u> for underline)", ja: "問題文を入力... (LaTeX 数式は $...$、下線は <u>...</u>)" },
  "Xem trước trực tiếp (KaTeX + HTML)": { vi: "Xem trước trực tiếp (KaTeX + HTML)", en: "Live Preview (KaTeX + HTML)", ja: "ライブプレビュー (KaTeX + HTML)" },
  "Link hình ảnh minh họa": { vi: "Link hình ảnh minh họa", en: "Illustration Image URL", ja: "イラスト画像URL" },
  "Các phương án trả lời (bấm nút tròn ✓ để chọn đáp án đúng)": { vi: "Các phương án trả lời (bấm nút tròn ✓ để chọn đáp án đúng)", en: "Answer Options (click the circle ✓ to mark correct answer(s))", ja: "選択肢（丸い ✓ ボタンを押して正解を選択）" },
  "Chọn đáp án đúng": { vi: "Chọn đáp án đúng", en: "Mark as correct answer", ja: "正解として選択" },
  "Giải thích ngắn gọn (hỗ trợ LaTeX $...$)...": { vi: "Giải thích ngắn gọn (hỗ trợ LaTeX $...$)...", en: "Brief explanation (supports LaTeX $...$)...", ja: "簡潔な解説 (LaTeX $...$ 対応)..." },
  "Lưu câu hỏi": { vi: "Lưu câu hỏi", en: "Save Question", ja: "問題を保存" },
  "Vui lòng nhập nội dung câu hỏi.": { vi: "Vui lòng nhập nội dung câu hỏi.", en: "Please enter the question text.", ja: "問題文を入力してください。" },
  "Cần ít nhất 2 phương án trả lời.": { vi: "Cần ít nhất 2 phương án trả lời.", en: "At least 2 answer options are required.", ja: "選択肢は最低2つ必要です。" },
  "Vui lòng chọn ít nhất 1 đáp án đúng.": { vi: "Vui lòng chọn ít nhất 1 đáp án đúng.", en: "Please mark at least 1 correct answer.", ja: "正解を少なくとも1つ選択してください。" },
  "Đã cập nhật câu hỏi.": { vi: "Đã cập nhật câu hỏi.", en: "Question updated.", ja: "問題を更新しました。" },
  "Hãy thêm ít nhất 1 câu hỏi trước khi lưu Quiz.": { vi: "Hãy thêm ít nhất 1 câu hỏi trước khi lưu Quiz.", en: "Please add at least 1 question before saving the Quiz.", ja: "クイズを保存する前に少なくとも1問追加してください。" },
  "Quiz chưa có câu hỏi nào.": { vi: "Quiz chưa có câu hỏi nào.", en: "This Quiz has no questions yet.", ja: "クイズに問題がありません。" },
  "⚙️ Cài đặt trước khi làm bài (Quiz Lobby)": { vi: "⚙️ Cài đặt trước khi làm bài (Quiz Lobby)", en: "⚙️ Pre-Game Settings (Quiz Lobby)", ja: "⚙️ 開始前設定" },
  "← Quay lại Editor": { vi: "← Quay lại Editor", en: "← Back to Editor", ja: "← エディターに戻る" },
  "📦 Chọn số lượng câu & Chia phiên làm bài": { vi: "📦 Chọn số lượng câu & Chia phiên làm bài", en: "📦 Question Count & Session Splitting", ja: "📦 問題数とセッション分割" },
  "Chia nhiều phiên (VD: 50 câu/phiên)": { vi: "Chia nhiều phiên (VD: 50 câu/phiên)", en: "Split into sessions (e.g. 50 Qs/session)", ja: "複数セッションに分割 (例: 50問/回)" },
  "Số câu mỗi phiên": { vi: "Số câu mỗi phiên", en: "Questions per session", ja: "1セッションあたりの問題数" },
  "🔒 Một số tính năng nâng cao (Streak 🔥, Redemption Question, Đảo đề/đáp án) mở khóa từ Gói Silver trở lên.": { vi: "🔒 Một số tính năng nâng cao (Streak 🔥, Redemption Question, Đảo đề/đáp án) mở khóa từ Gói Silver trở lên.", en: "🔒 Some advanced features (Streak 🔥, Redemption Question, Shuffle) unlock from the Silver plan or higher.", ja: "🔒 一部の高度な機能（連続正解、復習問題（リデンプション）、シャッフル）は Silver プラン以上で解放されます。" },
  "Chế độ thời gian": { vi: "Chế độ thời gian", en: "Time mode", ja: "時間モード" },
  "Dùng thời gian riêng từng câu": { vi: "Dùng thời gian riêng từng câu", en: "Use per-question timer", ja: "問題ごとの制限時間を使用" },
  "Ghi đè thời gian chung cho tất cả câu": { vi: "Ghi đè thời gian chung cho tất cả câu", en: "Override uniform time for all questions", ja: "全問題に共通の制限時間を適用" },
  "Không giới hạn thời gian": { vi: "Không giới hạn thời gian", en: "Unlimited", ja: "無制限" },
  "Thời gian chung (giây)": { vi: "Thời gian chung (giây)", en: "Time (seconds)", ja: "制限時間（秒）" },
  "Hiện đáp án đúng sau mỗi câu": { vi: "Hiện đáp án đúng sau mỗi câu", en: "Show correct answer after each question", ja: "各問題の後に正解を表示" },
  "Bật (Hiện đáp án đúng + Đúng/Sai)": { vi: "Bật (Hiện đáp án đúng + Đúng/Sai)", en: "On (Show correct answer + Correct/Incorrect)", ja: "オン (正解と正誤を表示)" },
  "Chỉ hiện Đúng / Sai": { vi: "Chỉ hiện Đúng / Sai", en: "Show Correct / Incorrect only", ja: "正誤のみ表示" },
  "Tắt (Ẩn cho đến khi nộp bài)": { vi: "Tắt (Ẩn cho đến khi nộp bài)", en: "Off (Hide until submission)", ja: "オフ (提出まで非表示)" },
  "Tùy chọn hiển thị": { vi: "Tùy chọn hiển thị", en: "Display Options", ja: "表示オプション" },
  "Hiện giải thích đáp án ngay sau mỗi câu": { vi: "Hiện giải thích đáp án ngay sau mỗi câu", en: "Show explanation immediately after each question", ja: "各問題の直後に解説を表示" },
  "Cho phép xem lại bài làm & đáp án sau khi nộp": { vi: "Cho phép xem lại bài làm & đáp án sau khi nộp", en: "Allow reviewing answers after finishing", ja: "終了後に回答と正解の見直しを許可" },
  "Tùy chọn nâng cao chuẩn Quizizz": { vi: "Tùy chọn nâng cao chuẩn Quizizz", en: "Advanced Quizizz Options", ja: "Quizizz スタイル高度オプション" },
  "Đảo thứ tự câu hỏi": { vi: "Đảo thứ tự câu hỏi", en: "Shuffle questions", ja: "問題順をシャッフル" },
  "Đảo thứ tự đáp án (Zero-Drift)": { vi: "Đảo thứ tự đáp án (Zero-Drift)", en: "Shuffle options (Zero-Drift)", ja: "選択肢をシャッフル (Zero-Drift)" },
  "Bật âm thanh hiệu ứng Đúng / Sai": { vi: "Bật âm thanh hiệu ứng Đúng / Sai", en: "Enable Correct / Incorrect sound effects", ja: "正解・不正解の効果音を有効化" },
  "Bật thanh Streak 🔥 & điểm thưởng tốc độ": { vi: "Bật thanh Streak 🔥 & điểm thưởng tốc độ", en: "Enable Streak 🔥 bar & speed bonus points", ja: "連続正解 バーとスピードボーナス点を有効化" },
  "Câu hỏi cứu vớt (Redemption Question – làm lại câu sai ở cuối bài)": { vi: "Câu hỏi cứu vớt (Redemption Question – làm lại câu sai ở cuối bài)", en: "Redemption Question (retry missed questions at the end)", ja: "復習問題（リデンプション）" },
  "Vòng Cứu vớt (Redemption Question):": { vi: "Vòng Cứu vớt (Redemption Question):", en: "Redemption Round:", ja: "復習ラウンド（リデンプション）:" },
  "Trả lời đúng để gỡ lại câu bạn vừa làm sai!": { vi: "Trả lời đúng để gỡ lại câu bạn vừa làm sai!", en: "Answer correctly to redeem your missed question!", ja: "正解して先ほど間違えた問題を取り戻しましょう！" },
  "Chọn nhiều đáp án rồi bấm Xác nhận (Enter)": { vi: "Chọn nhiều đáp án rồi bấm Xác nhận (Enter)", en: "Select multiple options then click Confirm (Enter)", ja: "複数選択して「確定 (Enter)」を押してください" },
  "Xác nhận đáp án (Enter)": { vi: "Xác nhận đáp án (Enter)", en: "Confirm Answer (Enter)", ja: "解答を確定 (Enter)" },
  "🎉 Chính xác!": { vi: "🎉 Chính xác!", en: "🎉 Correct!", ja: "🎉 正解！" },
  "❌ Chưa chính xác!": { vi: "❌ Chưa chính xác!", en: "❌ Incorrect!", ja: "❌ 不正解！" },
  "Câu tiếp theo → (Enter)": { vi: "Câu tiếp theo → (Enter)", en: "Next Question → (Enter)", ja: "次の問題へ → (Enter)" },
  "Độ chính xác": { vi: "Độ chính xác", en: "Accuracy", ja: "正答率" },
  "Tổng điểm": { vi: "Tổng điểm", en: "Total Score", ja: "合計スコア" },
  "Đúng / Sai / Bỏ qua": { vi: "Đúng / Sai / Bỏ qua", en: "Correct / Wrong / Skipped", ja: "正解 / 不正解 / 未回答" },
  "Streak dài nhất · TB/câu": { vi: "Streak dài nhất · TB/câu", en: "Best Streak · Avg Time/Q", ja: "最高連続正解 · 平均回答時間" },
  "🔄 Làm lại phiên này": { vi: "🔄 Làm lại phiên này", en: "🔄 Retry This Session", ja: "🔄 このセッションを再挑戦" },
  "⚙️ Chọn phiên khác": { vi: "⚙️ Chọn phiên khác", en: "⚙️ Choose Another Session", ja: "⚙️ 別のセッションを選択" },
  "✏️ Quay lại Editor": { vi: "✏️ Quay lại Editor", en: "✏️ Back to Editor", ja: "✏️ エディターへ戻る" },
  "Xem lại chi tiết từng câu": { vi: "Xem lại chi tiết từng câu", en: "Detailed Question Review", ja: "問題別の詳細レビュー" },
  "Chưa trả lời": { vi: "Chưa trả lời", en: "Unanswered", ja: "未回答" },
  "🔥 Đã cứu vớt": { vi: "🔥 Đã cứu vớt", en: "🔥 Redeemed", ja: "🔥 復活正解" },
  "Bạn chọn:": { vi: "Bạn chọn:", en: "Your choice:", ja: "あなたの回答:" },
  "Xóa Quiz": { vi: "Xóa Quiz", en: "Delete Quiz", ja: "クイズを削除" },
  "Xóa Quiz này khỏi Creator Studio?": { vi: "Xóa Quiz này khỏi Creator Studio?", en: "Delete this Quiz from Creator Studio?", ja: "クリエイタースタジオ からこのクイズを削除しますか？" },
  "Đã đặt thời gian hàng loạt cho tất cả câu.": { vi: "Đã đặt thời gian hàng loạt cho tất cả câu.", en: "Applied batch time to all questions.", ja: "すべての問題に一括制限時間を適用しました。" },
  "Thoát Quiz": { vi: "Thoát Quiz", en: "Exit Quiz", ja: "クイズを終了" },
  "Bạn có chắc muốn thoát phiên làm bài hiện tại?": { vi: "Bạn có chắc muốn thoát phiên làm bài hiện tại?", en: "Are you sure you want to exit the current quiz session?", ja: "現在のクイズセッションを終了してもよろしいですか？" },
  "☁️ Sao lưu & Khôi phục dữ liệu (3 Lớp)": { vi: "☁️ Sao lưu & Khôi phục dữ liệu (3 Lớp)", en: "☁️ 3-Layer Data Backup & Restore", ja: "☁️ 3層データバックアップと復元" },
  "Chế độ khi khôi phục dữ liệu": { vi: "Chế độ khi khôi phục dữ liệu", en: "Restore Mode", ja: "データ復元モード" },
  "Gộp thêm (Merge)": { vi: "Gộp thêm (Merge)", en: "Merge", ja: "追加統合" },
  "Gộp thêm": { vi: "Gộp thêm", en: "Merge", ja: "追加統合" },
  "– Giữ bộ đề hiện có và thêm bộ đề mới từ bản sao lưu": { vi: "– Giữ bộ đề hiện có và thêm bộ đề mới từ bản sao lưu", en: "– Keep existing decks and add new decks from backup", ja: "– 既存の問題集を保持し、バックアップから新しい問題集を追加" },
  "Ghi đè (Replace)": { vi: "Ghi đè (Replace)", en: "Replace", ja: "上書き" },
  "Ghi đè": { vi: "Ghi đè", en: "Replace", ja: "上書き" },
  "– Thay thế toàn bộ dữ liệu trên trình duyệt bằng bản sao lưu": { vi: "– Thay thế toàn bộ dữ liệu trên trình duyệt bằng bản sao lưu", en: "– Replace all browser data with the backup file", ja: "– ブラウザ上の全データをバックアップで置き換え" },
  "Đã kết nối": { vi: "Đã kết nối", en: "Connected", ja: "接続済み" },
  "Chưa kết nối": { vi: "Chưa kết nối", en: "Not Connected", ja: "未接続" },
  "Tự động tạo thư mục riêng": { vi: "Tự động tạo thư mục riêng", en: "Automatically creates dedicated folder", ja: "専用フォルダを自動作成：" },
  "và ghi đè duy nhất 1 file sao lưu bên trong bằng quyền": { vi: "và ghi đè duy nhất 1 file sao lưu bên trong bằng quyền", en: "and updates a single backup file inside using scope", ja: "し、次の権限で単一のバックアップファイルを安全に更新します：" },
  "Kết nối lại Drive": { vi: "Kết nối lại Drive", en: "Reconnect Drive", ja: "Drive に再接続" },
  "Kết nối Google Drive": { vi: "Kết nối Google Drive", en: "Connect Google Drive", ja: "Google Drive に接続" },
  "Đang xử lý...": { vi: "Đang xử lý...", en: "Processing...", ja: "処理中..." },
  "☁️ Sao lưu lên Google Drive": { vi: "☁️ Sao lưu lên Google Drive", en: "☁️ Back Up to Google Drive", ja: "☁️ Google Drive にバックアップ" },
  "⬇️ Khôi phục từ Google Drive": { vi: "⬇️ Khôi phục từ Google Drive", en: "⬇️ Restore from Google Drive", ja: "⬇️ Google Drive から復元" },
  "2. Sao lưu & Khôi phục ngoại tuyến (.json)": { vi: "2. Sao lưu & Khôi phục ngoại tuyến (.json)", en: "2. Offline Backup & Restore (.json)", ja: "2. オフラインバックアップと復元 (.json)" },
  "Hoạt động 100% Offline": { vi: "Hoạt động 100% Offline", en: "100% Offline Ready", ja: "100% オフライン対応" },
  "Tải về máy tính/điện thoại file": { vi: "Tải về máy tính/điện thoại file", en: "Download file", ja: "PC・スマホにファイル" },
  "để lưu trữ an toàn hoặc chuyển sang thiết bị khác.": { vi: "để lưu trữ an toàn hoặc chuyển sang thiết bị khác.", en: "to your device for safekeeping or transferring to another device.", ja: "をダウンロードして安全に保管、または別端末へ移行できます。" },
  "⬇️ Xuất file sao lưu (.json)": { vi: "⬇️ Xuất file sao lưu (.json)", en: "⬇️ Export Backup File (.json)", ja: "⬇️ バックアップを出力 (.json)" },
  "⬆️ Khôi phục từ file (.json)": { vi: "⬆️ Khôi phục từ file (.json)", en: "⬆️ Restore from File (.json)", ja: "⬆️ ファイルから復元 (.json)" },
  "3. Lớp đồng bộ Cloud & IndexedDB tự động": { vi: "3. Lớp đồng bộ Cloud & IndexedDB tự động", en: "3. Automatic Cloud & IndexedDB Sync Layer", ja: "3. 自動 Cloud & IndexedDB 同期レイヤー" },
  "Server cục bộ + IndexedDB": { vi: "Server cục bộ + IndexedDB", en: "Server + IndexedDB", ja: "サーバー + IndexedDB" },
  "Dịch vụ": { vi: "Dịch vụ", en: "Service", ja: "サービス" },
  "tự động đồng bộ nền theo tài khoản Google và giữ bản dự phòng trong IndexedDB (sẵn sàng kết nối Supabase / Firebase).": { vi: "tự động đồng bộ nền theo tài khoản Google và giữ bản dự phòng trong IndexedDB (sẵn sàng kết nối Supabase / Firebase).", en: "automatically syncs in the background per Google account and keeps a local mirror in IndexedDB.", ja: "が Google アカウントごとにバックグラウンドで自動同期し、IndexedDB に予備コピーを保持します。" },
  "🔄 Đồng bộ ngay": { vi: "🔄 Đồng bộ ngay", en: "🔄 Sync Now", ja: "🔄 今すぐ同期" },
  "Đã đồng bộ dữ liệu thành công.": { vi: "Đã đồng bộ dữ liệu thành công.", en: "Data synced successfully.", ja: "データの同期が完了しました。" },
  "Bộ đề chưa có câu hỏi để chia sẻ.": { vi: "Bộ đề chưa có câu hỏi để chia sẻ.", en: "This deck has no questions to share.", ja: "共有できる問題がこの問題集にありません。" },
  "Học sinh mở Link, quét mã QR hoặc nhập Mã đề ở trang chủ sẽ vào thẳng": { vi: "Học sinh mở Link, quét mã QR hoặc nhập Mã đề ở trang chủ sẽ vào thẳng", en: "Students opening the Link, scanning the QR code, or entering the Share Code on the home page will jump straight into", ja: "リンクを開くか、QRコードをスキャン、またはホーム画面でコードを入力すると、直接" },
  "làm bài ngay (không cần import Excel).": { vi: "làm bài ngay (không cần import Excel).", en: "to start immediately (no Excel import needed).", ja: "に入りすぐ演習を開始できます（Excel インポート不要）。" },
  "Mã QR chia sẻ đề": { vi: "Mã QR chia sẻ đề", en: "Shared Deck QR Code", ja: "問題集共有 QR コード" },
  "⬇ Tải mã QR": { vi: "⬇ Tải mã QR", en: "⬇ Download QR", ja: "⬇ QR をダウンロード" },
  "Mã đề ngắn": { vi: "Mã đề ngắn", en: "Short Share Code", ja: "短縮共有コード" },
  "Sao chép Mã đề": { vi: "Sao chép Mã đề", en: "Copy Code", ja: "コードをコピー" },
  "Đường dẫn trực tiếp (hoạt động cả tab ẩn danh)": { vi: "Đường dẫn trực tiếp (hoạt động cả tab ẩn danh)", en: "Direct Share Link (works in incognito tabs too)", ja: "直接共有リンク（シークレットタブでも利用可能）" },
  "Sao chép Link": { vi: "Sao chép Link", en: "Copy Link", ja: "リンクをコピー" },
  "Dữ liệu đã được đóng gói kèm Link để mở trực tiếp trên mọi trình duyệt.": { vi: "Dữ liệu đã được đóng gói kèm Link để mở trực tiếp trên mọi trình duyệt.", en: "Deck data is embedded in the Link so it opens directly in any browser.", ja: "問題データがリンク内に圧縮されているため、どのブラウザでも直接開けます。" },
  "Bộ đề chưa có câu hỏi để xuất PDF.": { vi: "Bộ đề chưa có câu hỏi để xuất PDF.", en: "This deck has no questions to export to PDF.", ja: "PDF に出力できる問題がありません。" },
  "🖨️ Xuất đề thi ra PDF (Chuẩn khổ A4)": { vi: "🖨️ Xuất đề thi ra PDF (Chuẩn khổ A4)", en: "🖨️ Export Exam to PDF (A4 Standard)", ja: "🖨️ 試験問題を PDF 出力 (A4標準)" },
  "Chế độ xuất": { vi: "Chế độ xuất", en: "Export Mode", ja: "出力モード" },
  "Bản cho học sinh": { vi: "Bản cho học sinh", en: "Student Version", ja: "生徒用（問題のみ）" },
  "(chỉ in đề thi, ẩn đáp án)": { vi: "(chỉ in đề thi, ẩn đáp án)", en: "(print questions only, hide answers)", ja: "（問題のみ印刷、正解を非表示）" },
  "Bản cho giáo viên": { vi: "Bản cho giáo viên", en: "Teacher Version", ja: "教師用（解答・解説付き）" },
  "(tô đậm đáp án đúng + bảng đáp án & giải thích cuối trang)": { vi: "(tô đậm đáp án đúng + bảng đáp án & giải thích cuối trang)", en: "(highlight correct answers + answer key & explanations at the end)", ja: "（正解を太字表示＋巻末に解答一覧と解説を添付）" },
  "Bố cục cột phương án trả lời": { vi: "Bố cục cột phương án trả lời", en: "Answer Options Column Layout", ja: "選択肢の段組みレイアウト" },
  "2 cột gọn gàng (A/B – C/D)": { vi: "2 cột gọn gàng (A/B – C/D)", en: "2 Compact Columns (A/B – C/D)", ja: "2列コンパクト (A/B – C/D)" },
  "1 cột dọc (phù hợp câu dài / nhiều công thức)": { vi: "1 cột dọc (phù hợp câu dài / nhiều công thức)", en: "1 Vertical Column (best for long options / formulas)", ja: "1列縦並び (長文や数式が多い問題に最適)" },
  "Thêm khung": { vi: "Thêm khung", en: "Include", ja: "ページ上部に" },
  "Họ tên / Lớp / Điểm": { vi: "Họ tên / Lớp / Điểm", en: "Name / Class / Score", ja: "氏名 / クラス / 得点" },
  "ở đầu trang": { vi: "ở đầu trang", en: "header box at top of page", ja: "の記入欄を追加" },
  "🖨️ In / Lưu thành PDF": { vi: "🖨️ In / Lưu thành PDF", en: "🖨️ Print / Save as PDF", ja: "🖨️ 印刷 / PDFとして保存" },
  "Họ và tên:": { vi: "Họ và tên:", en: "Full Name:", ja: "氏名:" },
  "Lớp / MSSV:": { vi: "Lớp / MSSV:", en: "Class / Student ID:", ja: "クラス / 学籍番号:" },
  "Điểm:": { vi: "Điểm:", en: "Score:", ja: "得点:" },
  "BẢN GIÁO VIÊN (CÓ ĐÁP ÁN)": { vi: "BẢN GIÁO VIÊN (CÓ ĐÁP ÁN)", en: "TEACHER COPY (WITH ANSWER KEY)", ja: "教師用（解答付き）" },
  "ĐỀ THI DÀNH CHO HỌC SINH": { vi: "ĐỀ THI DÀNH CHO HỌC SINH", en: "STUDENT EXAM PAPER", ja: "生徒用試験問題" },
  "BẢNG ĐÁP ÁN & GIẢI THÍCH CHI TIẾT": { vi: "BẢNG ĐÁP ÁN & GIẢI THÍCH CHI TIẾT", en: "ANSWER KEY & DETAILED EXPLANATIONS", ja: "解答一覧と詳細解説" },
  "Giải thích chi tiết": { vi: "Giải thích chi tiết", en: "Detailed Explanations", ja: "詳細解説" },
  "Xác nhận": { vi: "Xác nhận", en: "Confirm", ja: "確認" },
  "Hủy": { vi: "Hủy", en: "Cancel", ja: "キャンセル" },
  "Lưu": { vi: "Lưu", en: "Save", ja: "保存" },
  "Đóng": { vi: "Đóng", en: "Close", ja: "閉じる" },
  "Áp dụng": { vi: "Áp dụng", en: "Apply", ja: "適用" },
  "Sao chép": { vi: "Sao chép", en: "Copy", ja: "コピー" },
  "Sửa": { vi: "Sửa", en: "Edit", ja: "編集" },
  "Mở": { vi: "Mở", en: "Open", ja: "開く" },
  "(tùy chọn)": { vi: "(tùy chọn)", en: "(optional)", ja: "(任意)" },
  "Tổng hợp": { vi: "Tổng hợp", en: "General", ja: "総合" },
  "Quiz mới": { vi: "Quiz mới", en: "New Quiz", ja: "新規クイズ" },
  "Quiz từ AI Converter": { vi: "Quiz từ AI Converter", en: "Quiz from AI Converter", ja: "AI変換 からのクイズ" },
  "Quiz không tên": { vi: "Quiz không tên", en: "Untitled Quiz", ja: "無題のクイズ" },
  "cao hơn": { vi: "cao hơn", en: "higher plan", ja: "上位プラン" },
  "câu hỏi": { vi: "câu hỏi", en: "questions", ja: "問" },
  "câu": { vi: "câu", en: "questions", ja: "問" },
  "Tiến độ": { vi: "Tiến độ", en: "Progress", ja: "進捗" },
  "· Hết hạn:": { vi: "· Hết hạn:", en: "· Expires:", ja: "· 有効期限:" },
  "• Hết hạn:": { vi: "• Hết hạn:", en: "• Expires:", ja: "• 有効期限:" },
  "Hết hạn:": { vi: "Hết hạn:", en: "Expires:", ja: "有効期限:" },
  "tuần": { vi: "tuần", en: "week", ja: "週" },
  "tháng": { vi: "tháng", en: "month", ja: "月" },
  "câu cần ôn lại": { vi: "câu cần ôn lại", en: "questions to review", ja: "問（復習対象）" },
  "Phiên": { vi: "Phiên", en: "Session", ja: "セッション" },
  "Câu hỏi:": { vi: "Câu hỏi:", en: "Question:", ja: "問題:" },
  "(đã cắm cờ)": { vi: "(đã cắm cờ)", en: "(flagged)", ja: "(フラグ付き)" },
  "Chuỗi đúng:": { vi: "Chuỗi đúng:", en: "Streak:", ja: "連続正解:" },
  "bộ đề cá nhân.": { vi: "bộ đề cá nhân.", en: "personal decks.", ja: "セット（個人問題集）。" },
  "Hợp lệ:": { vi: "Hợp lệ:", en: "Valid:", ja: "有効:" },
  "Lỗi:": { vi: "Lỗi:", en: "Errors:", ja: "エラー:" },
  "mục (các dòng lỗi sẽ bị bỏ qua)": { vi: "mục (các dòng lỗi sẽ bị bỏ qua)", en: "items (invalid rows will be skipped)", ja: "件（エラー行はスキップされます）" },
  "Phần gạch chân ở": { vi: "Phần gạch chân ở", en: "The underlined part in", ja: "下線部の" },
  "phát âm khác các phương án còn lại.": { vi: "phát âm khác các phương án còn lại.", en: "is pronounced differently from the others.", ja: "は他の選択肢と発音が異なります。" },
  "Những số nào là số nguyên tố?": { vi: "Những số nào là số nguyên tố?", en: "Which of the following numbers are prime?", ja: "次のうち素数はどれですか？" },
  "Những số nào sau đây là số nguyên tố? (Chọn tất cả đáp án đúng)": { vi: "Những số nào sau đây là số nguyên tố? (Chọn tất cả đáp án đúng)", en: "Which of the following numbers are prime? (Select all that apply)", ja: "次のうち素数はどれですか？（すべて選択）" },
  "2 và 5 là số nguyên tố.": { vi: "2 và 5 là số nguyên tố.", en: "2 and 5 are prime numbers.", ja: "2 と 5 は素数です。" },
  "Chọn gói": { vi: "Chọn gói", en: "Choose Plan", ja: "プランを選択" },
  "(365 ngày sau khi duyệt)": { vi: "(365 ngày sau khi duyệt)", en: "(365 days upon approval)", ja: "(承認後365日間)" },
  "Lý do:": { vi: "Lý do:", en: "Reason:", ja: "理由:" },
  "Duyệt:": { vi: "Duyệt:", en: "Approved:", ja: "承認:" },
  "Người dùng:": { vi: "Người dùng:", en: "User:", ja: "ユーザー:" },
  "Lớp/Khoa:": { vi: "Lớp/Khoa:", en: "Class/Faculty:", ja: "クラス/学部:" },
  "Xin chào,": { vi: "Xin chào,", en: "Hello,", ja: "こんにちは、" },
  "nội dung": { vi: "nội dung", en: "content", ja: "内容" },
  "số tài khoản": { vi: "số tài khoản", en: "account number", ja: "口座番号" },
  "nội dung chuyển khoản": { vi: "nội dung chuyển khoản", en: "transfer memo", ja: "振込メモ" },
  "Đã chuyển ngôn ngữ giao diện sang Tiếng Việt.": { vi: "Đã chuyển ngôn ngữ giao diện sang Tiếng Việt.", en: "Switched interface language to Vietnamese.", ja: "表示言語をベトナム語に切り替えました。" },
  "(hoặc dán Key riêng để ghi đè)": { vi: "(hoặc dán Key riêng để ghi đè)", en: "(or paste personal key to override)", ja: "（または個人キーを貼り付けて上書き）" },
  "Không kết nối được": { vi: "Không kết nối được", en: "Connection failed", ja: "接続できませんでした" },
  "Không thể khởi tạo thư viện đọc tài liệu.": { vi: "Không thể khởi tạo thư viện đọc tài liệu.", en: "Could not initialize document parser library.", ja: "ドキュメント解析ライブラリを初期化できませんでした。" },
  "Không tải được thư viện phân tích từ CDN. Vui lòng kiểm tra kết nối mạng.": { vi: "Không tải được thư viện phân tích từ CDN. Vui lòng kiểm tra kết nối mạng.", en: "Could not load parser library from CDN. Please check your network.", ja: "CDN から解析ライブラリを読み込めませんでした。通信環境を確認してください。" },
  "Không thể đọc tệp văn bản.": { vi: "Không thể đọc tệp văn bản.", en: "Could not read text file.", ja: "テキストファイルを読み込めませんでした。" },
  "Không thể đọc dữ liệu nhị phân của tệp.": { vi: "Không thể đọc dữ liệu nhị phân của tệp.", en: "Could not read binary file data.", ja: "バイナリデータを読み込めませんでした。" },
  "Không thể mã hóa tệp.": { vi: "Không thể mã hóa tệp.", en: "Could not encode file.", ja: "ファイルをエンコードできませんでした。" },
  "Tệp .doc định dạng nhị phân cũ (Word 97-2003) không thể đọc trực tiếp trên trình duyệt. Hãy lưu lại thành .docx hoặc .pdf rồi tải lên.": { vi: "Tệp .doc định dạng nhị phân cũ (Word 97-2003) không thể đọc trực tiếp trên trình duyệt. Hãy lưu lại thành .docx hoặc .pdf rồi tải lên.", en: "Legacy binary .doc (Word 97-2003) cannot be read directly in the browser. Please save as .docx or .pdf and upload again.", ja: "旧バイナリ形式の .doc (Word 97-2003) はブラウザで直接読み込めません。.docx または .pdf 形式で保存してからアップロードしてください。" },
  "Không thể đọc file ảnh.": { vi: "Không thể đọc file ảnh.", en: "Could not read image file.", ja: "画像ファイルを読み込めませんでした。" },
  "File ảnh không hợp lệ.": { vi: "File ảnh không hợp lệ.", en: "Invalid image file.", ja: "無効な画像ファイルです。" },
  "Yêu cầu tới Gemini AI quá thời gian chờ (Timeout 90s). Vui lòng thử lại.": { vi: "Yêu cầu tới Gemini AI quá thời gian chờ (Timeout 90s). Vui lòng thử lại.", en: "Request to Gemini AI timed out (90s). Please try again.", ja: "Gemini AI へのリクエストがタイムアウトしました (90秒)。もう一度お試しください。" },
  "Gemini không trả về JSON.": { vi: "Gemini không trả về JSON.", en: "Gemini did not return valid JSON.", ja: "Gemini から JSON が返されませんでした。" },
  "Vượt quá số lần thử lại API.": { vi: "Vượt quá số lần thử lại API.", en: "Exceeded maximum API retry attempts.", ja: "API の最大再試行回数を超えました。" },
  "chưa rõ": { vi: "chưa rõ", en: "uncertain", ja: "不明" },
  "Tệp lỗi": { vi: "Tệp lỗi", en: "Corrupted file", ja: "ファイルエラー" },
  "Tệp ảnh hỏng": { vi: "Tệp ảnh hỏng", en: "Corrupted image", ja: "破損した画像" },
  "Tệp bị hỏng hoặc không hợp lệ": { vi: "Tệp bị hỏng hoặc không hợp lệ", en: "Corrupted or invalid file", ja: "破損または無効なファイル" },
  "Văn bản đã dán": { vi: "Văn bản đã dán", en: "Pasted Text", ja: "貼り付けたテキスト" },
  "Không xác định": { vi: "Không xác định", en: "Unknown error", ja: "不明なエラー" },
  "Bộ đề AI Converter": { vi: "Bộ đề AI Converter", en: "AI Converter Deck", ja: "AI変換 問題集" },
  "tệp đang chờ xử lý": { vi: "tệp đang chờ xử lý", en: "file(s) queued", ja: "件のファイルが待機中" },
  "Gộp vào:": { vi: "Gộp vào:", en: "Merge into:", ja: "統合先:" },
  "(Gộp cần Gold)": { vi: "(Gộp cần Gold)", en: "(Merge requires Gold)", ja: "(統合は Gold 以上)" },
  "Tổng:": { vi: "Tổng:", en: "Total:", ja: "合計:" },
  "Thiếu Đ/A / Lỗi:": { vi: "Thiếu Đ/A / Lỗi:", en: "Missing Key / Errors:", ja: "解答なし / エラー:" },
  "✓ Đã kiểm tra:": { vi: "✓ Đã kiểm tra:", en: "✓ Verified:", ja: "✓ 承認済:" },
  "⚠️ Nghi ngờ sai:": { vi: "⚠️ Nghi ngờ sai:", en: "⚠️ Suspect:", ja: "⚠️ 要確認:" },
  "Hiện có": { vi: "Hiện có", en: "Currently", ja: "現在" },
  "bộ đề trong Kho đề": { vi: "bộ đề trong Kho đề", en: "deck(s) in your library", ja: "セットの問題集" },
  "câu hợp lệ trong AI Converter": { vi: "câu hợp lệ trong AI Converter", en: "valid question(s) in AI Converter", ja: "問の有効な問題 (AI変換)" },
  "Cập nhật:": { vi: "Cập nhật:", en: "Updated:", ja: "更新:" },
  "Tổng cộng": { vi: "Tổng cộng", en: "Total", ja: "合計" },
  "Câu": { vi: "Câu", en: "Q", ja: "問" },
  "chữ in đậm": { vi: "chữ in đậm", en: "bold text", ja: "太字テキスト" },
  "chữ in nghiêng": { vi: "chữ in nghiêng", en: "italic text", ja: "斜体テキスト" },
  "chữ gạch chân": { vi: "chữ gạch chân", en: "underlined text", ja: "下線テキスト" },
  "câu/phiên": { vi: "câu/phiên", en: "Qs/session", ja: "問/回" },
  "điểm": { vi: "điểm", en: "pts", ja: "点" },
  "File sao lưu không hợp lệ hoặc bị hỏng cấu trúc.": { vi: "File sao lưu không hợp lệ hoặc bị hỏng cấu trúc.", en: "Invalid or corrupted backup file structure.", ja: "バックアップファイルが無効または破損しています。" },
  "bộ đề từ bộ nhớ đệm Cloud/IndexedDB!": { vi: "bộ đề từ bộ nhớ đệm Cloud/IndexedDB!", en: "deck(s) from Cloud/IndexedDB cache!", ja: "セットの問題集を Cloud/IndexedDB から自動復元しました！" },
  "Thư viện Google Identity Services chưa tải xong. Vui lòng kiểm tra kết nối mạng.": { vi: "Thư viện Google Identity Services chưa tải xong. Vui lòng kiểm tra kết nối mạng.", en: "Google Identity Services library has not loaded yet. Please check your network.", ja: "Google Identity Services がまだ読み込まれていません。通信環境を確認してください。" },
  "Đã hủy cấp quyền Google Drive.": { vi: "Đã hủy cấp quyền Google Drive.", en: "Cancelled Google Drive authorization.", ja: "Google Drive の認証がキャンセルされました。" },
  "Tài khoản Google không cung cấp địa chỉ email.": { vi: "Tài khoản Google không cung cấp địa chỉ email.", en: "Google account did not provide an email address.", ja: "Google アカウントからメールアドレスを取得できませんでした。" },
  "Không thể kết nối Google Drive.": { vi: "Không thể kết nối Google Drive.", en: "Could not connect to Google Drive.", ja: "Google Drive に接続できませんでした。" },
  "Phiên Google Drive đã hết hạn (401). Vui lòng bấm Kết nối lại.": { vi: "Phiên Google Drive đã hết hạn (401). Vui lòng bấm Kết nối lại.", en: "Google Drive session expired (401). Please click Reconnect.", ja: "Google Drive セッションの有効期限が切れました (401)。再接続してください。" },
  "Phiên Google Drive đã hết hạn (401). Vui lòng kết nối lại.": { vi: "Phiên Google Drive đã hết hạn (401). Vui lòng kết nối lại.", en: "Google Drive session expired (401). Please reconnect.", ja: "Google Drive セッションの有効期限が切れました (401)。再接続してください。" },
  "Không thể xuất file sao lưu.": { vi: "Không thể xuất file sao lưu.", en: "Could not export backup file.", ja: "バックアップファイルを出力できませんでした。" },
  "Không thể đọc file sao lưu.": { vi: "Không thể đọc file sao lưu.", en: "Could not read backup file.", ja: "バックアップファイルを読み込めませんでした。" },
  "File JSON không đúng định dạng sao lưu của AI Tutor.": { vi: "File JSON không đúng định dạng sao lưu của AI Tutor.", en: "JSON file is not a valid AI Tutor backup.", ja: "この JSON ファイルは AI Tutor のバックアップ形式ではありません。" },
  "bộ đề và dữ liệu học tập thành công!": { vi: "bộ đề và dữ liệu học tập thành công!", en: "deck(s) and study data successfully!", ja: "セットの問題集と学習データを復元しました！" },
  "Ghi đè dữ liệu hiện tại": { vi: "Ghi đè dữ liệu hiện tại", en: "Replace Current Data", ja: "現在のデータを上書き" },
  "File JSON bị lỗi cú pháp.": { vi: "File JSON bị lỗi cú pháp.", en: "Malformed JSON file.", ja: "JSON ファイルの構文が正しくありません。" },
  "Dữ liệu hiện có:": { vi: "Dữ liệu hiện có:", en: "Current data:", ja: "現在のデータ:" },
  "bộ đề ·": { vi: "bộ đề ·", en: "decks ·", ja: "問題集 ·" },
  "câu sai ·": { vi: "câu sai ·", en: "mistakes ·", ja: "間違いノート ·" },
  "lịch sử thi.": { vi: "lịch sử thi.", en: "exam records.", ja: "試験履歴。" },
  "Lần sao lưu gần nhất:": { vi: "Lần sao lưu gần nhất:", en: "Last backup:", ja: "最終バックアップ:" },
  "Bộ đề được chia sẻ": { vi: "Bộ đề được chia sẻ", en: "Shared Deck", ja: "共有された問題集" },
  "Chia sẻ": { vi: "Chia sẻ", en: "Share", ja: "共有" },
  "🔗 Chia sẻ bộ đề:": { vi: "🔗 Chia sẻ bộ đề:", en: "🔗 Share Deck:", ja: "🔗 問題集を共有:" },
  "Bộ đề gồm": { vi: "Bộ đề gồm", en: "Deck contains", ja: "問題集には" },
  "Bộ đề dung lượng lớn được lưu qua mã đề": { vi: "Bộ đề dung lượng lớn được lưu qua mã đề", en: "Large deck saved under share code", ja: "大容量問題集は共有コード" },
  "trên máy chủ.": { vi: "trên máy chủ.", en: "on the server.", ja: "としてサーバーに保存されました。" },
  "mã đề": { vi: "mã đề", en: "share code", ja: "共有コード" },
  "đường dẫn chia sẻ": { vi: "đường dẫn chia sẻ", en: "share link", ja: "共有リンク" },
  "Đã tải mã QR": { vi: "Đã tải mã QR", en: "Downloaded QR code", ja: "QRコードをダウンロードしました" },
  "đã nhập": { vi: "đã nhập", en: "entered", ja: "入力されたコード" },
  "Môn:": { vi: "Môn:", en: "Subject:", ja: "科目:" },
  "Tổng số:": { vi: "Tổng số:", en: "Total:", ja: "問題数:" },
  "câu ·": { vi: "câu ·", en: "Qs ·", ja: "問 ·" },
  "ℹ️ Đang dùng placeholder": { vi: "ℹ️ Đang dùng placeholder", en: "ℹ️ Currently using placeholder", ja: "ℹ️ 現在プレースホルダーを使用中:" },
  ". Hãy dán OAuth Client ID từ Google Cloud Console vào dòng 6 của": { vi: ". Hãy dán OAuth Client ID từ Google Cloud Console vào dòng 6 của", en: ". Paste your OAuth Client ID from Google Cloud Console on line 6 of", ja: "。Google Cloud Console の OAuth Client ID を次のファイルの6行目に貼り付けてください:" },
  "để bật Google Drive.": { vi: "để bật Google Drive.", en: "to enable Google Drive.", ja: "（Google Drive を有効化するため）。" },
  "Chưa cấu hình GOOGLE_DRIVE_CLIENT_ID! Hãy thay thế \"YOUR_GOOGLE_CLIENT_ID\" ở dòng 6 của file cloud-share-pdf.js bằng Client ID từ Google Cloud Console.": { vi: "Chưa cấu hình GOOGLE_DRIVE_CLIENT_ID! Hãy thay thế \"YOUR_GOOGLE_CLIENT_ID\" ở dòng 6 của file cloud-share-pdf.js bằng Client ID từ Google Cloud Console.", en: "GOOGLE_DRIVE_CLIENT_ID is not configured! Replace \"YOUR_GOOGLE_CLIENT_ID\" on line 6 of cloud-share-pdf.js with your Client ID from Google Cloud Console.", ja: "GOOGLE_DRIVE_CLIENT_ID が設定されていません！cloud-share-pdf.js の6行目の \"YOUR_GOOGLE_CLIENT_ID\" を Google Cloud Console の Client ID に置き換えてください。" },
  "Chưa thay \"YOUR_GOOGLE_CLIENT_ID\" trong cloud-share-pdf.js bằng OAuth Client ID từ Google Cloud Console.": { vi: "Chưa thay \"YOUR_GOOGLE_CLIENT_ID\" trong cloud-share-pdf.js bằng OAuth Client ID từ Google Cloud Console.", en: "Replace \"YOUR_GOOGLE_CLIENT_ID\" in cloud-share-pdf.js with your OAuth Client ID from Google Cloud Console.", ja: "cloud-share-pdf.js の \"YOUR_GOOGLE_CLIENT_ID\" を Google Cloud Console の OAuth Client ID に置き換えてください。" },
  "🇻🇳 Tiếng Việt": { vi: "🇻🇳 Tiếng Việt", en: "VI", ja: "VI" },
  "Gemini 2.0 Flash (Ổn định)": { vi: "Gemini 2.0 Flash (Ổn định)", en: "Gemini 2.0 Flash (Stable)", ja: "Gemini 2.0 Flash (安定)" },
  "Khi người dùng đăng nhập bằng Email đã được gán, hệ thống sẽ tự động kích hoạt sẵn Gemini API Key đó cho AI Converter mà người dùng không cần tự nhập.": { vi: "Khi người dùng đăng nhập bằng Email đã được gán, hệ thống sẽ tự động kích hoạt sẵn Gemini API Key đó cho AI Converter mà người dùng không cần tự nhập.", en: "When the user signs in with the assigned email, the system automatically activates that Gemini API Key for AI Converter without requiring manual entry.", ja: "指定されたメールアドレスでユーザーがログインすると、手動入力なしで AI変換 用の Gemini API Key が自動的に有効化されます。" },
  "Khi người dùng đăng nhập bằng Email đã được gán, hệ thống sẽ tự động kích hoạt sẵn Google Gemini API Key đó cho AI Converter mà người dùng không cần tự nhập.": { vi: "Khi người dùng đăng nhập bằng Email đã được gán, hệ thống sẽ tự động kích hoạt sẵn Google Gemini API Key đó cho AI Converter mà người dùng không cần tự nhập.", en: "When the user signs in with the assigned email, the system automatically activates that Google Gemini API Key for AI Converter without requiring manual entry.", ja: "指定されたメールアドレスでユーザーがログインすると、手動入力なしで AI変換 用の Google Gemini API Key が自動的に有効化されます。" },
  "Tổng người dùng đăng ký": { vi: "Tổng người dùng đăng ký", en: "Total Registered Users", ja: "登録ユーザー総数" },
  "Gói hiện tại": { vi: "Gói hiện tại", en: "Current Plan", ja: "現在のプラン" },
  "Ngày đăng ký": { vi: "Ngày đăng ký", en: "Registered At", ja: "登録日時" },
  "Đăng nhập gần nhất": { vi: "Đăng nhập gần nhất", en: "Last Login", ja: "最終ログイン" },
  "Mới đăng ký nhất": { vi: "Mới đăng ký nhất", en: "Newest Registered", ja: "登録日時（新しい順）" },
  "Hạng gói cao nhất": { vi: "Hạng gói cao nhất", en: "Highest Plan Tier", ja: "プランランク順" },
  "Email (A-Z)": { vi: "Email (A-Z)", en: "Email (A-Z)", ja: "メール (A-Z)" },
  "Sắp xếp người dùng": { vi: "Sắp xếp người dùng", en: "Sort Users", ja: "ユーザー並び替え" },
  "Tìm người dùng theo email hoặc tên...": { vi: "Tìm người dùng theo email hoặc tên...", en: "Search users by email or name...", ja: "メールまたは名前でユーザーを検索..." },
  "Chưa có người dùng nào phù hợp với bộ lọc.": { vi: "Chưa có người dùng nào phù hợp với bộ lọc.", en: "No registered users match the current filter.", ja: "条件に一致する登録ユーザーはいません。" },
  "Hiển thị toàn bộ tài khoản đã đăng ký trên hệ thống. Khi có người dùng mới đăng ký hoặc gửi yêu cầu xác nhận thanh toán, hệ thống sẽ tự động gửi thông báo về email quản trị (": { vi: "Hiển thị toàn bộ tài khoản đã đăng ký trên hệ thống. Khi có người dùng mới đăng ký hoặc gửi yêu cầu xác nhận thanh toán, hệ thống sẽ tự động gửi thông báo về email quản trị (", en: "Displays all registered accounts in the system. Whenever a new user registers or submits a payment confirmation request, an email alert is automatically sent to the admin email (", ja: "システムに登録された全アカウントを表示します。新規ユーザー登録または支払い確認リクエストが送信されると、管理者メール (" },
  ").": { vi: ").", en: ").", ja: ") に自動通知されます。" },
  "Hiển thị toàn bộ tài khoản đã đăng ký trên hệ thống. Khi có người dùng mới đăng ký hoặc gửi yêu cầu xác nhận thanh toán, hệ thống sẽ tự động gửi thông báo về email quản trị (phamduchieu.robotics@gmail.com).": { vi: "Hiển thị toàn bộ tài khoản đã đăng ký trên hệ thống. Khi có người dùng mới đăng ký hoặc gửi yêu cầu xác nhận thanh toán, hệ thống sẽ tự động gửi thông báo về email quản trị (phamduchieu.robotics@gmail.com).", en: "Displays all registered accounts in the system. Whenever a new user registers or submits a payment confirmation request, an email alert is automatically sent to the admin email (phamduchieu.robotics@gmail.com).", ja: "システムに登録された全アカウントを表示します。新規ユーザー登録または支払い確認リクエストが送信されると、管理者メール (phamduchieu.robotics@gmail.com) に自動通知されます。" },
  "Hỗ trợ đa nền tảng AI (Google Gemini, OpenAI, Groq Cloud, OpenRouter, DeepSeek), hộp chứa nhiều API Key dự phòng tự động xoay vòng khi hết Quota 429 và API do Quản trị viên gán theo Email.": { vi: "Hỗ trợ đa nền tảng AI (Google Gemini, OpenAI, Groq Cloud, OpenRouter, DeepSeek), hộp chứa nhiều API Key dự phòng tự động xoay vòng khi hết Quota 429 và API do Quản trị viên gán theo Email.", en: "Supports multi-platform AI (Google Gemini, OpenAI, Groq Cloud, OpenRouter, DeepSeek), a Multi-Key Backup Pool that auto-rotates on 429 Quota limits, and Admin-assigned APIs by Email.", ja: "マルチプラットフォーム AI (Google Gemini, OpenAI, Groq Cloud, OpenRouter, DeepSeek)、Quota 429 制限時に自動ローテーションする予備 API Key プール、および管理者割当 API をサポートします。" },
  "Chọn Nền tảng & Model AI chủ đạo": { vi: "Chọn Nền tảng & Model AI chủ đạo", en: "Select Primary AI Platform & Model", ja: "メインの AI プラットフォーム＆モデルを選択" },
  "Gemini 2.5 Flash-Lite (Siêu nhanh / Quota lớn)": { vi: "Gemini 2.5 Flash-Lite (Siêu nhanh / Quota lớn)", en: "Gemini 2.5 Flash-Lite (Ultra Fast / High Quota)", ja: "Gemini 2.5 Flash-Lite (超高速 / 大容量クォータ)" },
  "Groq Llama 4 Scout 17B (Miễn phí & Vision)": { vi: "Groq Llama 4 Scout 17B (Miễn phí & Vision)", en: "Groq Llama 4 Scout 17B (Free & Vision)", ja: "Groq Llama 4 Scout 17B (無料 & Vision)" },
  "Groq Llama 4 Maverick 17B (Vision)": { vi: "Groq Llama 4 Maverick 17B (Vision)", en: "Groq Llama 4 Maverick 17B (Vision)", ja: "Groq Llama 4 Maverick 17B (Vision)" },
  "Groq Llama 3.3 70B (Siêu tốc)": { vi: "Groq Llama 3.3 70B (Siêu tốc)", en: "Groq Llama 3.3 70B (Ultra Fast)", ja: "Groq Llama 3.3 70B (超高速)" },
  "OpenAI GPT-4o Mini (Nhanh & Vision)": { vi: "OpenAI GPT-4o Mini (Nhanh & Vision)", en: "OpenAI GPT-4o Mini (Fast & Vision)", ja: "OpenAI GPT-4o Mini (高速 & Vision)" },
  "OpenAI GPT-4o (Chính xác cao & Vision)": { vi: "OpenAI GPT-4o (Chính xác cao & Vision)", en: "OpenAI GPT-4o (High Accuracy & Vision)", ja: "OpenAI GPT-4o (高精度 & Vision)" },
  "OpenAI GPT-4.1 Mini (Vision)": { vi: "OpenAI GPT-4.1 Mini (Vision)", en: "OpenAI GPT-4.1 Mini (Vision)", ja: "OpenAI GPT-4.1 Mini (Vision)" },
  "DeepSeek V3 Chat (Giải đề & Chuẩn hóa)": { vi: "DeepSeek V3 Chat (Giải đề & Chuẩn hóa)", en: "DeepSeek V3 Chat (Solving & Formatting)", ja: "DeepSeek V3 Chat (解答・フォーマット正規化)" },
  "DeepSeek R1 Reasoner (Toán/Lý/Hóa chuyên sâu)": { vi: "DeepSeek R1 Reasoner (Toán/Lý/Hóa chuyên sâu)", en: "DeepSeek R1 Reasoner (Advanced STEM Reasoning)", ja: "DeepSeek R1 Reasoner (理系・数学高度推論)" },
  "API Key chính (Gemini AIza..., Groq gsk_..., OpenRouter sk-or-..., OpenAI/DeepSeek sk-...)": { vi: "API Key chính (Gemini AIza..., Groq gsk_..., OpenRouter sk-or-..., OpenAI/DeepSeek sk-...)", en: "Primary API Key (Gemini AIza..., Groq gsk_..., OpenRouter sk-or-..., OpenAI/DeepSeek sk-...)", ja: "メイン API Key (Gemini AIza..., Groq gsk_..., OpenRouter sk-or-..., OpenAI/DeepSeek sk-...)" },
  "API Key chính (Gemini / Groq / OpenAI / OpenRouter / DeepSeek)": { vi: "API Key chính (Gemini / Groq / OpenAI / OpenRouter / DeepSeek)", en: "Primary API Key (Gemini / Groq / OpenAI / OpenRouter / DeepSeek)", ja: "メイン API Key (Gemini / Groq / OpenAI / OpenRouter / DeepSeek)" },
  "Dán chuỗi khóa AIza..., gsk_..., sk-or-... hoặc sk-...": { vi: "Dán chuỗi khóa AIza..., gsk_..., sk-or-... hoặc sk-...", en: "Paste key starting with AIza..., gsk_..., sk-or-..., or sk-...", ja: "AIza..., gsk_..., sk-or-..., または sk-... で始まるキーを貼り付け" },
  "AIza..., gsk_..., sk-or-... hoặc sk-...": { vi: "AIza..., gsk_..., sk-or-... hoặc sk-...", en: "AIza..., gsk_..., sk-or-..., or sk-...", ja: "AIza..., gsk_..., sk-or-..., または sk-..." },
  "📦 Hộp chứa nhiều API Key dự phòng (Multi-Key Pool – Tự động xoay vòng khi hết Quota 429)": { vi: "📦 Hộp chứa nhiều API Key dự phòng (Multi-Key Pool – Tự động xoay vòng khi hết Quota 429)", en: "📦 Multi-Key Backup Pool (Auto-Rotates When Quota 429 Is Reached)", ja: "📦 予備 API Key プール (Multi-Key Pool – Quota 429 上限時に自動ローテーション)" },
  "📦 Hộp chứa nhiều API Key dự phòng gán cho người dùng (tùy chọn – mỗi dòng 1 Key hoặc cách bằng dấu phẩy)": { vi: "📦 Hộp chứa nhiều API Key dự phòng gán cho người dùng (tùy chọn – mỗi dòng 1 Key hoặc cách bằng dấu phẩy)", en: "📦 Multi-Key Backup Pool Assigned to User (optional – one key per line or comma-separated)", ja: "📦 ユーザーに割り当てる予備 API Key プール（任意 – 1行に1キーまたはカンマ区切り）" },
  "Dán thêm nhiều API Key dự phòng (AIza..., gsk_..., sk-or-..., sk-...) để tự động xoay vòng khi Key chính hết Quota 429": { vi: "Dán thêm nhiều API Key dự phòng (AIza..., gsk_..., sk-or-..., sk-...) để tự động xoay vòng khi Key chính hết Quota 429", en: "Paste additional backup API Keys (AIza..., gsk_..., sk-or-..., sk-...) to auto-rotate when the primary key hits 429 Quota", ja: "メインキーが Quota 429 に達した際に自動ローテーションするための予備 API Key (AIza..., gsk_..., sk-or-..., sk-...) を貼り付け" },
  "Hỗ trợ gán API Key đa nền tảng (Google Gemini, Groq Cloud, OpenAI, OpenRouter, DeepSeek) kèm hộp chứa nhiều API Key dự phòng tự động xoay vòng khi hết Quota 429.": { vi: "Hỗ trợ gán API Key đa nền tảng (Google Gemini, Groq Cloud, OpenAI, OpenRouter, DeepSeek) kèm hộp chứa nhiều API Key dự phòng tự động xoay vòng khi hết Quota 429.", en: "Assign multi-platform API Keys (Google Gemini, Groq Cloud, OpenAI, OpenRouter, DeepSeek) along with a Multi-Key Backup Pool that auto-rotates on 429 Quota limits.", ja: "マルチプラットフォーム API Key (Google Gemini, Groq Cloud, OpenAI, OpenRouter, DeepSeek) と Quota 429 時に自動ローテーションする予備 API Key プールを割り当てます。" },
  "Không tìm thấy Model AI tương thích với định dạng tệp này. Nếu đọc ảnh/PDF scan, hãy thêm Key của Gemini, Groq, OpenAI hoặc OpenRouter.": { vi: "Không tìm thấy Model AI tương thích với định dạng tệp này. Nếu đọc ảnh/PDF scan, hãy thêm Key của Gemini, Groq, OpenAI hoặc OpenRouter.", en: "No compatible AI model found for this file format. For images/scanned PDFs, please add a Gemini, Groq, OpenAI, or OpenRouter API Key.", ja: "このファイル形式に対応する AI モデルが見つかりません。画像やスキャン PDF の場合は Gemini, Groq, OpenAI, または OpenRouter の API Key を追加してください。" },
  "Groq Cloud – Miễn phí & Siêu tốc (gsk_...)": { vi: "Groq Cloud – Miễn phí & Siêu tốc (gsk_...)", en: "Groq Cloud – Free & Ultra Fast (gsk_...)", ja: "Groq Cloud – 無料＆超高速 (gsk_...)" },
  "OpenRouter – Đa Model Free & Pro (sk-or-...)": { vi: "OpenRouter – Đa Model Free & Pro (sk-or-...)", en: "OpenRouter – Multi-Model Free & Pro (sk-or-...)", ja: "OpenRouter – マルチモデル Free & Pro (sk-or-...)" },
  "Dán nhiều API Key dự phòng (mỗi dòng 1 Key hoặc cách nhau bằng dấu phẩy). Hỗ trợ trộn nhiều hãng cùng lúc:\nAIzaSy... (Google Gemini)\ngsk_... (Groq Cloud Free)\nsk-or-v1-... (OpenRouter)\nopenai:sk-... hoặc deepseek:sk-...": { vi: "Dán nhiều API Key dự phòng (mỗi dòng 1 Key hoặc cách nhau bằng dấu phẩy). Hỗ trợ trộn nhiều hãng cùng lúc:\nAIzaSy... (Google Gemini)\ngsk_... (Groq Cloud Free)\nsk-or-v1-... (OpenRouter)\nopenai:sk-... hoặc deepseek:sk-...", en: "Paste multiple backup API Keys (one per line or comma-separated). Supports mixing multiple AI providers:\nAIzaSy... (Google Gemini)\ngsk_... (Groq Cloud Free)\nsk-or-v1-... (OpenRouter)\nopenai:sk-... or deepseek:sk-...", ja: "複数の予備 API Key を貼り付け（1行に1キーまたはカンマ区切り）。複数プロバイダーの混在に対応:\nAIzaSy... (Google Gemini)\ngsk_... (Groq Cloud Free)\nsk-or-v1-... (OpenRouter)\nopenai:sk-... または deepseek:sk-..." },
  "📖 Hướng dẫn lấy API Key": { vi: "📖 Hướng dẫn lấy API Key", en: "📖 API Key Guide", ja: "📖 API Key 取得ガイド" },
  "Bạn đang sử dụng API Key miễn phí mặc định được cung cấp bởi hệ thống. Do dùng chung nên hạn mức (quota) thấp và có thể bị chậm hoặc gián đoạn. Để có trải nghiệm mượt mà và không giới hạn, hãy cân nhắc sử dụng API Key cá nhân của bạn.": { vi: "Bạn đang sử dụng API Key miễn phí mặc định được cung cấp bởi hệ thống. Do dùng chung nên hạn mức (quota) thấp và có thể bị chậm hoặc gián đoạn. Để có trải nghiệm mượt mà và không giới hạn, hãy cân nhắc sử dụng API Key cá nhân của bạn.", en: "You are currently using the free default API Key provided by the system. Because it is shared, its quota is limited and may be slow or interrupted. For a smooth and unlimited experience, consider using your own personal API Key.", ja: "現在、システム提供の無料デフォルト API Key を使用しています。共有リソースのため利用枠 (Quota) が少なく、遅延や中断が発生する場合があります。快適で無制限に利用するには、ご自身の個人 API Key の設定をご検討ください。" },
  "Xem hướng dẫn lấy API Key miễn phí →": { vi: "Xem hướng dẫn lấy API Key miễn phí →", en: "View Free API Key Guide →", ja: "無料 API Key 取得ガイドを見る →" },
  "Nhập Key cá nhân": { vi: "Nhập Key cá nhân", en: "Enter Personal Key", ja: "個人 Key を入力" },
  "Ẩn thông báo này": { vi: "Ẩn thông báo này", en: "Dismiss this notice", ja: "この通知を閉じる" },
  "Gợi ý: Đăng nhập Google ở góc trên để kích hoạt System Pool miễn phí, hoặc nhập API Key cá nhân để dùng ngay không cần chờ.": { vi: "Gợi ý: Đăng nhập Google ở góc trên để kích hoạt System Pool miễn phí, hoặc nhập API Key cá nhân để dùng ngay không cần chờ.", en: "Tip: Sign in with Google at the top right to enable the free System Pool, or enter your personal API Key for instant unlimited access.", ja: "ヒント: 右上から Google ログインすると無料の System Pool が利用可能になります。または個人 API Key を入力してすぐにご利用いただけます。" },
  "Đang dùng API Key cá nhân": { vi: "Đang dùng API Key cá nhân", en: "Using personal API Key", ja: "個人 API Key を使用中" },
  "Đang dùng System Key Pool miễn phí mặc định": { vi: "Đang dùng System Key Pool miễn phí mặc định", en: "Using default free System Key Pool", ja: "デフォルトの無料 System Key Pool を使用中" },
  "Chưa cấu hình API Key": { vi: "Chưa cấu hình API Key", en: "API Key not configured", ja: "API Key 未設定" },
  "Cài đặt Đa Nền tảng AI & API Key Cá nhân": { vi: "Cài đặt Đa Nền tảng AI & API Key Cá nhân", en: "Multi-Provider AI & Personal API Key Settings", ja: "マルチプロバイダー AI ＆ 個人 API Key 設定" },
  "Mặc định hệ thống dùng System Key Pool an toàn qua máy chủ /api/ai/proxy (nếu đã đăng nhập Google). Khi bạn nhập Key cá nhân, mọi yêu cầu AI sẽ gọi trực tiếp bằng Key của bạn (không qua hạn mức chung).": { vi: "Mặc định hệ thống dùng System Key Pool an toàn qua máy chủ /api/ai/proxy (nếu đã đăng nhập Google). Khi bạn nhập Key cá nhân, mọi yêu cầu AI sẽ gọi trực tiếp bằng Key của bạn (không qua hạn mức chung).", en: "By default, the system securely routes requests via /api/ai/proxy using the System Key Pool (when signed in with Google). When you save personal keys, all AI requests call providers directly with your keys.", ja: "デフォルトでは /api/ai/proxy 経由で安全な System Key Pool を使用します（Google ログイン時）。個人 Key を設定すると、すべての AI リクエストがご自身の Key で直接送信されます。" },
  "Chế độ hiện tại:": { vi: "Chế độ hiện tại:", en: "Current mode:", ja: "現在のモード:" },
  "📖 Xem hướng dẫn lấy Key →": { vi: "📖 Xem hướng dẫn lấy Key →", en: "📖 API Key Guide →", ja: "📖 Key 取得ガイド →" },
  "Nhập API Key theo từng nhà cung cấp (chọn hãng tránh nhầm tiền tố sk- OpenAI / DeepSeek)": { vi: "Nhập API Key theo từng nhà cung cấp (chọn hãng tránh nhầm tiền tố sk- OpenAI / DeepSeek)", en: "Enter API Keys by Provider (select provider tab to avoid sk- OpenAI vs DeepSeek ambiguity)", ja: "プロバイダー別に API Key を入力（sk- プレフィックスの OpenAI / DeepSeek 混同を防止）" },
  "Tiền tố:": { vi: "Tiền tố:", en: "Prefix:", ja: "プレフィックス:" },
  "Chưa nhập Key nào cho hãng này.": { vi: "Chưa nhập Key nào cho hãng này.", en: "No keys entered for this provider yet.", ja: "このプロバイダーの Key はまだ入力されていません。" },
  "Hợp lệ": { vi: "Hợp lệ", en: "Valid", ja: "有効" },
  "💾 Lưu tất cả Key cá nhân": { vi: "💾 Lưu tất cả Key cá nhân", en: "💾 Save All Personal Keys", ja: "💾 個人 Key をすべて保存" },
  "🧪 Test Keys": { vi: "🧪 Test Keys", en: "🧪 Test Keys", ja: "🧪 Key をテスト" },
  "📤 Xuất JSON": { vi: "📤 Xuất JSON", en: "📤 Export JSON", ja: "📤 JSON エクスポート" },
  "📥 Nhập JSON": { vi: "📥 Nhập JSON", en: "📥 Import JSON", ja: "📥 JSON インポート" },
  "🗑️ Xóa toàn bộ Key cá nhân": { vi: "🗑️ Xóa toàn bộ Key cá nhân", en: "🗑️ Clear All Personal Keys", ja: "🗑️ 個人 Key をすべて削除" },
  "Kết quả kiểm tra từng Key:": { vi: "Kết quả kiểm tra từng Key:", en: "Per-Key Connection Test Results:", ja: "Key 別接続テスト結果:" },
  "📖 Hướng dẫn lấy API Key Miễn phí & Trả phí": { vi: "📖 Hướng dẫn lấy API Key Miễn phí & Trả phí", en: "📖 Guide to Getting Free & Paid AI API Keys", ja: "📖 無料・有料 AI API Key 取得ガイド" },
  "Sử dụng API Key cá nhân giúp đọc ảnh/PDF siêu nhanh, không bị nghẽn hạn mức dùng chung và bảo mật tuyệt đối trên trình duyệt của bạn.": { vi: "Sử dụng API Key cá nhân giúp đọc ảnh/PDF siêu nhanh, không bị nghẽn hạn mức dùng chung và bảo mật tuyệt đối trên trình duyệt của bạn.", en: "Using your own API Key gives fast OCR/PDF processing with zero shared rate limits and keeps your key local to your browser.", ja: "個人 API Key を使用すると、共有制限なしで高速な画像・PDF 読み取りが可能になり、ブラウザ内に安全に保存されます。" },
  "🔑 Nhập API Key ngay →": { vi: "🔑 Nhập API Key ngay →", en: "🔑 Enter API Key Now →", ja: "🔑 今すぐ API Key を入力 →" },
  "★ Khuyên dùng": { vi: "★ Khuyên dùng", en: "★ Recommended", ja: "★ おすすめ" },
  "Lấy Key ↗": { vi: "Lấy Key ↗", en: "Get Key ↗", ja: "Key を取得 ↗" },
  "Model hỗ trợ:": { vi: "Model hỗ trợ:", en: "Supported Models:", ja: "対応モデル:" },
  "Sẵn sàng bắt đầu?": { vi: "Sẵn sàng bắt đầu?", en: "Ready to get started?", ja: "準備はよろしいですか？" },
  "API Key cá nhân của bạn chỉ lưu cục bộ trong trình duyệt (localStorage) và gửi trực tiếp tới máy chủ hãng AI.": { vi: "API Key cá nhân của bạn chỉ lưu cục bộ trong trình duyệt (localStorage) và gửi trực tiếp tới máy chủ hãng AI.", en: "Your personal API Keys are stored locally in your browser (localStorage) and sent directly to official AI provider servers.", ja: "個人 API Key はお使いのブラウザ (localStorage) にのみ保存され、公式 AI プロバイダーへ直接送信されます。" },
  "Đã có Key? Nhập ngay tại Cài đặt API →": { vi: "Đã có Key? Nhập ngay tại Cài đặt API →", en: "Already have a Key? Enter it now in API Settings →", ja: "Key をお持ちですか？ API 設定で今すぐ入力 →" },
  "Mẹo hay (Pro Tip): Tự động xoay vòng không lo hết Quota": { vi: "Mẹo hay (Pro Tip): Tự động xoay vòng không lo hết Quota", en: "Pro Tip: Auto-Rotation Without Quota Interruptions", ja: "便利なコツ (Pro Tip): Quota 上限を気にせず自動ローテーション" },
  "Bạn có thể tạo nhiều API Key từ nhiều tài khoản hoặc Google Cloud Project KHÁC NHAU mà chính bạn sở hữu (ví dụ 2 key Groq Cloud + 2 key OpenRouter + nhiều key Gemini ở các dự án độc lập) và dán tất cả vào hộp nhập theo từng hãng ở Cài đặt API để hệ thống tự động xoay vòng khi 1 key chạm giới hạn. Lưu ý: nhiều API Key tạo trong CÙNG một Google Cloud Project sẽ dùng chung quota với nhau, và hãy luôn tuân thủ Điều khoản sử dụng (Terms of Service) của từng nhà cung cấp.": { vi: "Bạn có thể tạo nhiều API Key từ nhiều tài khoản hoặc Google Cloud Project KHÁC NHAU mà chính bạn sở hữu (ví dụ 2 key Groq Cloud + 2 key OpenRouter + nhiều key Gemini ở các dự án độc lập) và dán tất cả vào hộp nhập theo từng hãng ở Cài đặt API để hệ thống tự động xoay vòng khi 1 key chạm giới hạn. Lưu ý: nhiều API Key tạo trong CÙNG một Google Cloud Project sẽ dùng chung quota với nhau, và hãy luôn tuân thủ Điều khoản sử dụng (Terms of Service) của từng nhà cung cấp.", en: "You can create multiple API Keys across DIFFERENT accounts or Google Cloud Projects that you personally own (e.g., 2 Groq keys + 2 OpenRouter keys + multiple Gemini keys in separate projects) and paste them into each provider tab in API Settings for automatic rotation. Note: keys in the SAME Google Cloud Project share quota; always follow each provider's Terms of Service.", ja: "ご自身が所有する異なるアカウントや Google Cloud プロジェクトから複数の API Key を作成し（例: Groq 2個 + OpenRouter 2個 + 別プロジェクトの Gemini Key 複数）、API 設定の各プロバイダータブに貼り付けることで自動ローテーションが可能です。同一プロジェクト内の Key は枠を共有するためご注意ください。各社の利用規約を遵守してください。" },
  "Khuyên dùng • Miễn phí • Vision": { vi: "Khuyên dùng • Miễn phí • Vision", en: "Recommended • Free • Vision", ja: "おすすめ • 無料 • Vision" },
  "Đa Model :free & Paid": { vi: "Đa Model :free & Paid", en: "Multi-Model :free & Paid", ja: "マルチモデル :free & 有料" },
  "Miễn phí • Tiếng Việt & PDF/Ảnh tốt": { vi: "Miễn phí • Tiếng Việt & PDF/Ảnh tốt", en: "Free • Best for Vietnamese & PDF/Images", ja: "無料 • 多言語・PDF/画像に強い" },
  "Trả phí • Cần nạp tối thiểu": { vi: "Trả phí • Cần nạp tối thiểu", en: "Paid • Minimum Credit Required", ja: "有料 • 最低チャージ必要" },
  "Trả phí giá rẻ • Mạnh Toán & Suy luận": { vi: "Trả phí giá rẻ • Mạnh Toán & Suy luận", en: "Low-Cost Paid • Strong Math & Reasoning", ja: "低コスト有料 • 数学・推論に特化" },
  "Miễn phí, tốc độ LPU cực nhanh, hỗ trợ đọc ảnh đề thi (Vision), không cần thẻ Visa.": { vi: "Miễn phí, tốc độ LPU cực nhanh, hỗ trợ đọc ảnh đề thi (Vision), không cần thẻ Visa.", en: "Free tier with ultra-fast LPU inference and Vision image OCR support, no credit card required.", ja: "無料枠あり、超高速 LPU 推論と画像読み取り (Vision) に対応、クレジットカード不要。" },
  "1 API Key dùng chung cho hàng chục model miễn phí (:free) lẫn trả phí (Gemini, Qwen VL, DeepSeek, GPT).": { vi: "1 API Key dùng chung cho hàng chục model miễn phí (:free) lẫn trả phí (Gemini, Qwen VL, DeepSeek, GPT).", en: "Single API Key for dozens of free (:free) and paid models (Gemini, Qwen VL, DeepSeek, GPT).", ja: "1つの API Key で数十種類の無料 (:free) および有料モデル (Gemini, Qwen VL, DeepSeek, GPT) を利用可能。" },
  "Có gói miễn phí theo ngày, đọc PDF scan / công thức Toán-Lý-Hóa và xử lý tiếng Việt rất tốt.": { vi: "Có gói miễn phí theo ngày, đọc PDF scan / công thức Toán-Lý-Hóa và xử lý tiếng Việt rất tốt.", en: "Daily free tier with strong native PDF OCR, math/science formulas, and multilingual accuracy.", ja: "日次無料枠があり、スキャン PDF や理系数式・多言語処理に優れています。" },
  "Dịch vụ trả phí theo token (cần nạp tối thiểu vào Billing), chất lượng Vision & GPT-4o ổn định cao.": { vi: "Dịch vụ trả phí theo token (cần nạp tối thiểu vào Billing), chất lượng Vision & GPT-4o ổn định cao.", en: "Pay-as-you-go token pricing (minimum Billing top-up required) with high Vision & GPT-4o accuracy.", ja: "従量課金制（Billing への事前チャージが必要）で、Vision と GPT-4o の安定性が高いです。" },
  "Chi phí cực rẻ, đặc biệt mạnh khi giải bài tập Toán/Lý/Hóa và suy luận logic bằng văn bản (không hỗ trợ Vision ảnh).": { vi: "Chi phí cực rẻ, đặc biệt mạnh khi giải bài tập Toán/Lý/Hóa và suy luận logic bằng văn bản (không hỗ trợ Vision ảnh).", en: "Very low cost, excelling at math/science problem solving and text reasoning (text only, no Vision).", ja: "非常に低コストで、数学・理科の解答やテキスト推論に強みがあります（画像 Vision 非対応）。" },
  "🔑 API Key Hệ thống": { vi: "🔑 API Key Hệ thống", en: "🔑 System API Keys", ja: "🔑 システム API Key" },
  "API AI": { vi: "API AI", en: "AI API", ja: "AI API" },
  "🌐 System Default Pool (Miễn phí)": { vi: "🌐 System Default Pool (Miễn phí)", en: "🌐 System Default Pool (Free)", ja: "🌐 システム共有プール (無料)" },
  "🔑 Quản lý API Key Hệ thống (System Key Pool — Zero Client Exposure)": { vi: "🔑 Quản lý API Key Hệ thống (System Key Pool — Zero Client Exposure)", en: "🔑 System API Key Pool Management (Zero Client Exposure)", ja: "🔑 システム API Key プール管理 (クライアント非公開設計)" },
  "Bảo mật mã hóa:": { vi: "Bảo mật mã hóa:", en: "Encryption Security:", ja: "暗号化セキュリティ:" },
  "✅ AES-256-GCM Đã bật (ENCRYPTION_SECRET)": { vi: "✅ AES-256-GCM Đã bật (ENCRYPTION_SECRET)", en: "✅ AES-256-GCM Enabled (ENCRYPTION_SECRET)", ja: "✅ AES-256-GCM 有効 (ENCRYPTION_SECRET)" },
  "⚠️ Chưa cấu hình ENCRYPTION_SECRET trên server": { vi: "⚠️ Chưa cấu hình ENCRYPTION_SECRET trên server", en: "⚠️ ENCRYPTION_SECRET not configured on server", ja: "⚠️ サーバーに ENCRYPTION_SECRET が未設定です" },
  "Lưu trữ:": { vi: "Lưu trữ:", en: "Storage:", ja: "ストレージ:" },
  "1. Nhập hàng loạt theo nhóm tài khoản (2-Step Smart Importer)": { vi: "1. Nhập hàng loạt theo nhóm tài khoản (2-Step Smart Importer)", en: "1. Bulk Account-Grouped Import (2-Step Smart Importer)", ja: "1. アカウント別一括インポート (2段階スマート取込)" },
  "🔍 Phân tích & Xem trước (Preview)": { vi: "🔍 Phân tích & Xem trước (Preview)", en: "🔍 Parse & Preview", ja: "🔍 解析・プレビュー" },
  "Xóa ô dán": { vi: "Xóa ô dán", en: "Clear Input", ja: "入力をクリア" },
  "🔄 Tải lại": { vi: "🔄 Tải lại", en: "🔄 Refresh", ja: "🔄 再読み込み" },
  "Hãng": { vi: "Hãng", en: "Provider", ja: "プロバイダー" },
  "Key (Ẩn)": { vi: "Key (Ẩn)", en: "Masked Key", ja: "マスク済み Key" },
  "API Key (Ẩn)": { vi: "API Key (Ẩn)", en: "Masked API Key", ja: "マスク済み API Key" },
  "Thống kê": { vi: "Thống kê", en: "Stats", ja: "統計" },
  "Tạm tắt": { vi: "Tạm tắt", en: "Disable", ja: "無効化" },
  "Bật lại": { vi: "Bật lại", en: "Enable", ja: "有効化" },
  "Quản lý qua ENV": { vi: "Quản lý qua ENV", en: "Managed via ENV", ja: "ENV で管理" },
  "Chưa có System Key nào trong Pool.": { vi: "Chưa có System Key nào trong Pool.", en: "No System Keys in pool yet.", ja: "プールにシステム Key がまだ登録されていません。" },
  "3. Nhật ký Quản trị (Audit Log)": { vi: "3. Nhật ký Quản trị (Audit Log)", en: "3. Admin Audit Log", ja: "3. 管理者操作ログ (Audit Log)" },
  "Chưa có nhật ký thao tác nào.": { vi: "Chưa có nhật ký thao tác nào.", en: "No audit logs recorded yet.", ja: "操作ログはまだありません。" },
  "Đang dùng: API Key cá nhân (Cục bộ)": { vi: "Đang dùng: API Key cá nhân (Cục bộ)", en: "Active: Personal API Key (Local)", ja: "使用中: 個人 API Key（ローカル）" },
  "Đang dùng: API Key Hệ thống mặc định (Dùng chung)": { vi: "Đang dùng: API Key Hệ thống mặc định (Dùng chung)", en: "Active: Default System API Key (Shared)", ja: "使用中: システム標準 API Key（共有）" },
  "🔑 Cài đặt API Key Cá nhân (Chỉ lưu cục bộ trên trình duyệt này)": { vi: "🔑 Cài đặt API Key Cá nhân (Chỉ lưu cục bộ trên trình duyệt này)", en: "🔑 Personal API Key Settings (Stored Locally in This Browser Only)", ja: "🔑 個人 API Key 設定（このブラウザ内にのみ保存）" },
  "Lưu Key cá nhân (Cục bộ)": { vi: "Lưu Key cá nhân (Cục bộ)", en: "Save Personal Key (Local)", ja: "個人 Key を保存（ローカル）" },
  "🛡️ Kho API Key Hệ thống (Lưu lên Server — Dùng chung cho toàn bộ người dùng)": { vi: "🛡️ Kho API Key Hệ thống (Lưu lên Server — Dùng chung cho toàn bộ người dùng)", en: "🛡️ System API Key Pool (Saved on Server — Shared Across All Users)", ja: "🛡️ システム API Key プール（サーバー保存 — 全ユーザー共有）" },
  "Lưu vào Kho Hệ thống (Dùng chung)": { vi: "Lưu vào Kho Hệ thống (Dùng chung)", en: "Save to System Pool (Shared)", ja: "システムプールに保存（共有）" },
  "Xóa toàn bộ Key Hệ thống": { vi: "Xóa toàn bộ Key Hệ thống", en: "Delete All System Keys", ja: "システム Key をすべて削除" },
  "🗑️ Xóa toàn bộ Key Hệ thống": { vi: "🗑️ Xóa toàn bộ Key Hệ thống", en: "🗑️ Delete All System Keys", ja: "🗑️ システム Key をすべて削除" },
  "⚠️ Xóa toàn bộ Key Hệ thống": { vi: "⚠️ Xóa toàn bộ Key Hệ thống", en: "⚠️ Delete All System Keys", ja: "⚠️ システム Key をすべて削除" },
  "Vocab Studio": { vi: "Vocab Studio", en: "Vocab Studio", ja: "単語スタジオ" },
  "📖 Vocab Studio": { vi: "📖 Vocab Studio", en: "📖 Vocab Studio", ja: "📖 単語スタジオ" },
  "Vocab Studio | AI Tutor": { vi: "Vocab Studio | AI Tutor", en: "Vocab Studio | AI Tutor", ja: "単語スタジオ | AI Tutor" },
  "📖 +Từ vựng": { vi: "📖 +Từ vựng", en: "📖 +Vocab", ja: "📖 +単語登録" },
  "📖 +Vocab": { vi: "📖 +Vocab", en: "📖 +Vocab", ja: "📖 +単語登録" },
  "Lưu nhanh từ vựng vào Vocab Studio": { vi: "Lưu nhanh từ vựng vào Vocab Studio", en: "Quick-save word to Vocab Studio", ja: "単語スタジオ に単語をクイック保存" },
  "Điều hướng Vocab Studio": { vi: "Điều hướng Vocab Studio", en: "Vocab Studio Navigation", ja: "単語スタジオ ナビゲーション" },
  "Lưới từ vựng": { vi: "Lưới từ vựng", en: "Vocabulary Grid", ja: "単語グリッド" },
  "Tra từ": { vi: "Tra từ", en: "Dictionary Lookup", ja: "辞書検索" },
  "Thẻ ghi nhớ": { vi: "Thẻ ghi nhớ", en: "Flashcards", ja: "フラッシュカード" },
  "Thẻ ghi nhớ 3D (SM-2)": { vi: "Thẻ ghi nhớ 3D (SM-2)", en: "3D Flashcards (SM-2)", ja: "3Dフラッシュカード (SM-2)" },
  "Kiểm tra": { vi: "Kiểm tra", en: "Quiz Center", ja: "テスト" },
  "Bảng dò bài": { vi: "Bảng dò bài", en: "Review Table", ja: "復習シート" },
  "Bộ từ": { vi: "Bộ từ", en: "Decks", ja: "単語帳" },
  "Cài đặt": { vi: "Cài đặt", en: "Settings", ja: "設定" },
  "Cài đặt Vocab Studio": { vi: "Cài đặt Vocab Studio", en: "Vocab Studio Settings", ja: "単語スタジオ 設定" },
  "Chiều học": { vi: "Chiều học", en: "Study Direction", ja: "学習方向" },
  "Việt → Anh": { vi: "Việt → Anh", en: "VI → EN", ja: "越 → 英" },
  "Anh → Việt": { vi: "Anh → Việt", en: "EN → VI", ja: "英 → 越" },
  "VIỆT → ANH": { vi: "VIỆT → ANH", en: "VIETNAMESE → ENGLISH", ja: "ベトナム語 → 英語" },
  "ANH → VIỆT": { vi: "ANH → VIỆT", en: "ENGLISH → VIETNAMESE", ja: "英語 → ベトナム語" },
  "Chế độ cục bộ": { vi: "Chế độ cục bộ", en: "Local Mode", ja: "ローカルモード" },
  "Offline · Chờ đồng bộ": { vi: "Offline · Chờ đồng bộ", en: "Offline · Pending Sync", ja: "オフライン · 同期待ち" },
  "Lưu cục bộ · Chờ đồng bộ": { vi: "Lưu cục bộ · Chờ đồng bộ", en: "Saved Locally · Pending Sync", ja: "ローカル保存 · 同期待ち" },
  "Đang đồng bộ…": { vi: "Đang đồng bộ…", en: "Syncing…", ja: "同期中…" },
  "TÌM HIỂU MỘT TỪ, MỞ THÊM MỘT CÁNH CỬA": { vi: "TÌM HIỂU MỘT TỪ, MỞ THÊM MỘT CÁNH CỬA", en: "LEARN A WORD, OPEN A NEW DOOR", ja: "一つの単語から新しい扉を開く" },
  "Tra từ Anh–Việt": { vi: "Tra từ Anh–Việt", en: "English–Vietnamese Dictionary", ja: "英越・越英辞書検索" },
  "Tra nghĩa, nghe phát âm và lưu vào bộ từ trong một chỗ.": { vi: "Tra nghĩa, nghe phát âm và lưu vào bộ từ trong một chỗ.", en: "Look up meanings, listen to pronunciation, and save to your decks in one place.", ja: "意味の検索、発音の再生、単語帳への保存を一箇所で。" },
  "Thêm từ thủ công": { vi: "Thêm từ thủ công", en: "Add Word Manually", ja: "手動で単語を追加" },
  "Nhập từ tiếng Anh hoặc tiếng Việt…": { vi: "Nhập từ tiếng Anh hoặc tiếng Việt…", en: "Enter an English or Vietnamese word…", ja: "英語またはベトナム語の単語を入力…" },
  "Chiều tra cứu": { vi: "Chiều tra cứu", en: "Lookup Direction", ja: "検索方向" },
  "Tự nhận diện": { vi: "Tự nhận diện", en: "Auto-detect", ja: "自動判別" },
  "Tra cứu": { vi: "Tra cứu", en: "Look Up", ja: "検索" },
  "Đang tra…": { vi: "Đang tra…", en: "Looking up…", ja: "検索中…" },
  "Hủy tra cứu": { vi: "Hủy tra cứu", en: "Cancel Lookup", ja: "検索をキャンセル" },
  "Bộ từ nhận kết quả tra": { vi: "Bộ từ nhận kết quả tra", en: "Target Deck for Lookup", ja: "保存先の単語帳" },
  "Lưu ngay vào bộ từ": { vi: "Lưu ngay vào bộ từ", en: "Save Directly to Deck", ja: "単語帳にすぐ保存" },
  "Tự điền vào form Thêm từ": { vi: "Tự điền vào form Thêm từ", en: "Autofill Add Word Form", ja: "単語追加フォームに自動入力" },
  "Cache giữ 7 ngày, tối đa 500 mục. Nhập tay luôn sẵn sàng khi mất mạng hoặc hết lượt tra.": { vi: "Cache giữ 7 ngày, tối đa 500 mục. Nhập tay luôn sẵn sàng khi mất mạng hoặc hết lượt tra.", en: "Cache kept for 7 days (up to 500 entries). Manual entry is always available offline.", ja: "キャッシュは7日間（最大500件）保持されます。オフライン時はいつでも手動入力が可能です。" },
  "Tự nhận diện theo dấu tiếng Việt. Có thể chọn chiều thủ công.": { vi: "Tự nhận diện theo dấu tiếng Việt. Có thể chọn chiều thủ công.", en: "Auto-detected via Vietnamese diacritics, or choose direction manually.", ja: "ベトナム語の声調記号で自動判別します（手動選択も可能）。" },
  "Đang tra cứu. Mỗi yêu cầu tối đa 8 giây…": { vi: "Đang tra cứu. Mỗi yêu cầu tối đa 8 giây…", en: "Looking up (max 8s timeout per request)…", ja: "検索中（リクエストあたり最大8秒）…" },
  "Đã tra cứu · Bạn có thể lưu ngay hoặc chỉnh lại nội dung": { vi: "Đã tra cứu · Bạn có thể lưu ngay hoặc chỉnh lại nội dung", en: "Lookup complete · Save directly or edit details", ja: "検索完了 · そのまま保存するか内容を編集できます" },
  "Định nghĩa tiếng Anh": { vi: "Định nghĩa tiếng Anh", en: "English Definition", ja: "英語の定義" },
  "Ví dụ": { vi: "Ví dụ", en: "Example", ja: "例文" },
  "Ví dụ / Ngữ cảnh": { vi: "Ví dụ / Ngữ cảnh", en: "Example / Context", ja: "例文 / 文脈" },
  "TỪ CỦA BẠN, NHỊP CỦA BẠN": { vi: "TỪ CỦA BẠN, NHỊP CỦA BẠN", en: "YOUR WORDS, YOUR PACE", ja: "あなたの単語、あなたのペース" },
  "Một từ mới. Một bước tiến nhỏ.": { vi: "Một từ mới. Một bước tiến nhỏ.", en: "One new word. One small step forward.", ja: "一つの新しい単語、小さな一歩。" },
  "Thêm từ": { vi: "Thêm từ", en: "Add Word", ja: "単語を追加" },
  "từ vựng": { vi: "từ vựng", en: "words", ja: "単語" },
  "cần ôn": { vi: "cần ôn", en: "starred", ja: "要復習" },
  "đã thuộc": { vi: "đã thuộc", en: "mastered", ja: "習得済" },
  "Tìm từ, nghĩa hoặc STT…": { vi: "Tìm từ, nghĩa hoặc STT…", en: "Search word, meaning, or #…", ja: "単語、意味、または番号で検索…" },
  "Tìm từ": { vi: "Tìm từ", en: "Search words", ja: "単語を検索" },
  "Chọn bộ từ": { vi: "Chọn bộ từ", en: "Select deck", ja: "単語帳を選択" },
  "Tất cả bộ từ": { vi: "Tất cả bộ từ", en: "All Decks", ja: "すべての単語帳" },
  "★ Cần ôn": { vi: "★ Cần ôn", en: "★ Starred", ja: "★ 要復習" },
  "Đã thuộc": { vi: "Đã thuộc", en: "Known", ja: "習得済" },
  "Chưa thuộc": { vi: "Chưa thuộc", en: "Unmastered", ja: "未習得" },
  "Từ của tôi": { vi: "Từ của tôi", en: "My Custom Words", ja: "マイ単語" },
  "Hiện hết": { vi: "Hiện hết", en: "Reveal All", ja: "すべて表示" },
  "Ẩn hết": { vi: "Ẩn hết", en: "Hide All", ja: "すべて隠す" },
  "Xáo trộn": { vi: "Xáo trộn", en: "Shuffle", ja: "シャッフル" },
  "Theo STT": { vi: "Theo STT", en: "By Order", ja: "番号順" },
  "Bấm để xem đáp án ↵": { vi: "Bấm để xem đáp án ↵", en: "Click to reveal answer ↵", ja: "クリックして解答を表示 ↵" },
  "Cần ôn": { vi: "Cần ôn", en: "Starred", ja: "要復習" },
  "Lưu ôn": { vi: "Lưu ôn", en: "Star", ja: "復習に保存" },
  "Lưu từ cần ôn": { vi: "Lưu từ cần ôn", en: "Star for review", ja: "復習用にスターを付ける" },
  "Phát âm · S": { vi: "Phát âm · S", en: "Pronounce · S", ja: "発音 · S" },
  "Chuyển bộ từ": { vi: "Chuyển bộ từ", en: "Move to deck", ja: "単語帳を移動" },
  "Chưa có từ phù hợp": { vi: "Chưa có từ phù hợp", en: "No matching words found", ja: "一致する単語がありません" },
  "Thử đổi bộ lọc, từ khóa hoặc thêm từ mới.": { vi: "Thử đổi bộ lọc, từ khóa hoặc thêm từ mới.", en: "Try changing the filter, keyword, or adding a new word.", ja: "フィルターやキーワードを変更するか、新しい単語を追加してください。" },
  "Bắt đầu ôn": { vi: "Bắt đầu ôn", en: "Start Review", ja: "復習を開始" },
  "Bắt đầu học": { vi: "Bắt đầu học", en: "Start Studying", ja: "学習を開始" },
  "MỖI TỪ MỘT CHỖ RIÊNG": { vi: "MỖI TỪ MỘT CHỖ RIÊNG", en: "A PLACE FOR EVERY WORD", ja: "すべての単語に居場所を" },
  "Bộ từ của bạn": { vi: "Bộ từ của bạn", en: "Your Vocabulary Decks", ja: "マイ単語帳" },
  "Sắp xếp theo cách bạn muốn học.": { vi: "Sắp xếp theo cách bạn muốn học.", en: "Organize words the way you want to study.", ja: "学習スタイルに合わせて整理しましょう。" },
  "Tạo bộ từ": { vi: "Tạo bộ từ", en: "Create Deck", ja: "単語帳を作成" },
  "Đổi tên bộ từ": { vi: "Đổi tên bộ từ", en: "Rename Deck", ja: "単語帳の名前を変更" },
  "Tên bộ từ": { vi: "Tên bộ từ", en: "Deck Name", ja: "単語帳の名前" },
  "Lưu bộ từ": { vi: "Lưu bộ từ", en: "Save Deck", ja: "単語帳を保存" },
  "Mở bộ từ": { vi: "Mở bộ từ", en: "Open Deck", ja: "単語帳を開く" },
  "ÔN MỘT CHÚT, NHỚ LÂU HƠN": { vi: "ÔN MỘT CHÚT, NHỚ LÂU HƠN", en: "REVIEW A LITTLE, REMEMBER LONGER", ja: "少しの復習で、長く記憶する" },
  "Chỉ những từ đã gắn sao. Bấm vào ô đang che để mở đáp án.": { vi: "Chỉ những từ đã gắn sao. Bấm vào ô đang che để mở đáp án.", en: "Starred words only. Click any masked cell to reveal its answer.", ja: "スター付きの単語のみ。隠されたセルをクリックすると解答が表示されます。" },
  "Bộ từ để dò bài": { vi: "Bộ từ để dò bài", en: "Deck for Review Table", ja: "復習シート用の単語帳" },
  "Che cột Tiếng Anh": { vi: "Che cột Tiếng Anh", en: "Mask English Column", ja: "英語列を隠す" },
  "Che cột Tiếng Việt": { vi: "Che cột Tiếng Việt", en: "Mask Vietnamese Column", ja: "ベトナム語列を隠す" },
  "Luyện riêng các từ này": { vi: "Luyện riêng các từ này", en: "Practice These Words", ja: "これらの単語を練習" },
  "Sao chép danh sách": { vi: "Sao chép danh sách", en: "Copy List", ja: "リストをコピー" },
  "In danh sách": { vi: "In danh sách", en: "Print List", ja: "リストを印刷" },
  "STT": { vi: "STT", en: "#", ja: "番号" },
  "Tiếng Anh": { vi: "Tiếng Anh", en: "English", ja: "英語" },
  "Tiếng Việt": { vi: "Tiếng Việt", en: "Vietnamese", ja: "ベトナム語" },
  "Chưa có từ gắn sao trong bộ từ này.": { vi: "Chưa có từ gắn sao trong bộ từ này.", en: "No starred words in this deck yet.", ja: "この単語帳にはスター付きの単語がまだありません。" },
  "THEO CÁCH CỦA BẠN": { vi: "THEO CÁCH CỦA BẠN", en: "TAILORED TO YOU", ja: "あなたに合わせた設定" },
  "Quản lý đồng bộ đám mây, sao lưu JSON và nhịp học mỗi ngày.": { vi: "Quản lý đồng bộ đám mây, sao lưu JSON và nhịp học mỗi ngày.", en: "Manage cloud sync, JSON backups, and your daily study pace.", ja: "クラウド同期、JSONバックアップ、毎日の学習ペースを管理します。" },
  "Tài khoản & Đồng bộ Hybrid (Supabase / Cloud / Google Drive)": { vi: "Tài khoản & Đồng bộ Hybrid (Supabase / Cloud / Google Drive)", en: "Account & Hybrid Sync (Supabase / Cloud / Google Drive)", ja: "アカウントとハイブリッド同期 (Supabase / Cloud / Google Drive)" },
  "Đồng bộ ngay lên Cloud": { vi: "Đồng bộ ngay lên Cloud", en: "Sync to Cloud Now", ja: "今すぐクラウドに同期" },
  "Dữ liệu từ vựng (.json)": { vi: "Dữ liệu từ vựng (.json)", en: "Vocabulary Data (.json)", ja: "単語データ (.json)" },
  "Xuất hoặc nhập riêng dữ liệu Vocab Studio. Hệ thống kiểm tra trùng lặp thông minh (Ghi đè hoặc Bỏ qua) và đồng bộ cùng Google Drive Backup của AI Tutor.": { vi: "Xuất hoặc nhập riêng dữ liệu Vocab Studio. Hệ thống kiểm tra trùng lặp thông minh (Ghi đè hoặc Bỏ qua) và đồng bộ cùng Google Drive Backup của AI Tutor.", en: "Export or import Vocab Studio data with smart duplicate checking (Merge or Skip) and Google Drive Backup integration.", ja: "重複チェック機能（統合またはスキップ）と Google Drive バックアップ連携を備えた 単語スタジオ データのエクスポート・インポート。" },
  "Xuất JSON": { vi: "Xuất JSON", en: "Export JSON", ja: "JSON をエクスポート" },
  "Nhập JSON": { vi: "Nhập JSON", en: "Import JSON", ja: "JSON をインポート" },
  "Chiều học mặc định": { vi: "Chiều học mặc định", en: "Default Study Direction", ja: "デフォルトの学習方向" },
  "Đảo nhanh chiều hiển thị câu hỏi/đáp án giữa Tiếng Việt và Tiếng Anh.": { vi: "Đảo nhanh chiều hiển thị câu hỏi/đáp án giữa Tiếng Việt và Tiếng Anh.", en: "Quickly swap prompt/answer direction between Vietnamese and English.", ja: "ベトナム語と英語の出題・解答方向を素早く切り替えます。" },
  "Đảo chiều học": { vi: "Đảo chiều học", en: "Swap Study Direction", ja: "学習方向を反転" },
  "Nhịp học mỗi ngày (SM-2)": { vi: "Nhịp học mỗi ngày (SM-2)", en: "Daily Study Pace (SM-2)", ja: "1日の学習ペース (SM-2)" },
  "Giới hạn từ mới cho ôn theo lịch, tính chung cho tất cả bộ từ.": { vi: "Giới hạn từ mới cho ôn theo lịch, tính chung cho tất cả bộ từ.", en: "Daily new word limit for scheduled SM-2 reviews across all decks.", ja: "スケジュール復習 (SM-2) における1日あたりの新規単語上限。" },
  "Từ mới / ngày": { vi: "Từ mới / ngày", en: "New words / day", ja: "新規単語 / 日" },
  "TỪNG CHÚT MỘT, MỖI NGÀY": { vi: "TỪNG CHÚT MỘT, MỖI NGÀY", en: "LITTLE BY LITTLE, EVERY DAY", ja: "毎日少しずつ着実に" },
  "Đúng lúc. Đúng từ. Ghi nhớ lâu hơn.": { vi: "Đúng lúc. Đúng từ. Ghi nhớ lâu hơn.", en: "Right time. Right word. Long-term retention.", ja: "適切なタイミングで適切な単語を長期記憶へ。" },
  "Cách học": { vi: "Cách học", en: "Study Mode", ja: "学習モード" },
  "Ôn theo lịch (SM-2)": { vi: "Ôn theo lịch (SM-2)", en: "Scheduled Review (SM-2)", ja: "スケジュール復習 (SM-2)" },
  "Học tự do": { vi: "Học tự do", en: "Free Study", ja: "自由学習" },
  "Chỉ từ gắn sao": { vi: "Chỉ từ gắn sao", en: "Starred Words Only", ja: "スター付き単語のみ" },
  "HÔM NAY CẦN ÔN": { vi: "HÔM NAY CẦN ÔN", en: "DUE FOR REVIEW TODAY", ja: "今日の復習対象" },
  "KHÔNG THEO LỊCH": { vi: "KHÔNG THEO LỊCH", en: "UNSCHEDULED PRACTICE", ja: "スケジュール外学習" },
  "NHỮNG TỪ CẦN THÊM CHÚT THỜI GIAN": { vi: "NHỮNG TỪ CẦN THÊM CHÚT THỜI GIAN", en: "WORDS THAT NEED EXTRA FOCUS", ja: "重点的に復習したい単語" },
  "từ trong phiên ôn hôm nay": { vi: "từ trong phiên ôn hôm nay", en: "words in today's review session", ja: "今日の復習セッションの単語数" },
  "từ sẵn sàng luyện tập": { vi: "từ sẵn sàng luyện tập", en: "words ready for practice", ja: "練習可能な単語数" },
  "Luyện không giới hạn số từ mới. Lượt chấm vẫn cập nhật lịch ôn và thống kê.": { vi: "Luyện không giới hạn số từ mới. Lượt chấm vẫn cập nhật lịch ôn và thống kê.", en: "Practice without daily new-word limits. Ratings still update SM-2 schedule and stats.", ja: "新規単語数の制限なしで練習します。評価は復習スケジュールと統計に反映されます。" },
  "Đã hoàn thành phiên học": { vi: "Đã hoàn thành phiên học", en: "Study Session Complete", ja: "学習セッション完了" },
  "Về lịch ôn": { vi: "Về lịch ôn", en: "Back to Schedule", ja: "復習スケジュールへ戻る" },
  "Xem tiến độ": { vi: "Xem tiến độ", en: "View Progress", ja: "進捗を見る" },
  "Thoát phiên": { vi: "Thoát phiên", en: "Exit Session", ja: "セッションを終了" },
  "TIẾNG VIỆT": { vi: "TIẾNG VIỆT", en: "VIETNAMESE", ja: "ベトナム語" },
  "TIẾNG ANH": { vi: "TIẾNG ANH", en: "ENGLISH", ja: "英語" },
  "ĐÁP ÁN": { vi: "ĐÁP ÁN", en: "ANSWER", ja: "解答" },
  "Chạm thẻ hoặc nhấn Space để lật": { vi: "Chạm thẻ hoặc nhấn Space để lật", en: "Tap card or press Space to flip", ja: "カードをタップするか Space キーでめくる" },
  "Học lại": { vi: "Học lại", en: "Again", ja: "もう一度" },
  "Học lại trong phiên": { vi: "Học lại trong phiên", en: "Repeat in session", ja: "セッション内で再出題" },
  "Nhớ được": { vi: "Nhớ được", en: "Good", ja: "覚えた" },
  "Rất dễ": { vi: "Rất dễ", en: "Easy", ja: "簡単" },
  "THỬ SỨC VỚI NHỮNG TỪ ĐÃ HỌC": { vi: "THỬ SỨC VỚI NHỮNG TỪ ĐÃ HỌC", en: "TEST YOUR VOCABULARY", ja: "学習した単語で力試し" },
  "Trung tâm kiểm tra": { vi: "Trung tâm kiểm tra", en: "Quiz Center", ja: "テストセンター" },
  "Trắc nghiệm, gõ từ, nghe chọn và nghe viết.": { vi: "Trắc nghiệm, gõ từ, nghe chọn và nghe viết.", en: "Multiple choice, typing, listening choice, and dictation.", ja: "4択クイズ、タイピング、リスニング選択・ディクテーション。" },
  "Hình thức": { vi: "Hình thức", en: "Quiz Format", ja: "出題形式" },
  "Trắc nghiệm · 4 đáp án": { vi: "Trắc nghiệm · 4 đáp án", en: "Multiple Choice · 4 Options", ja: "4択クイズ" },
  "Gõ chính tả / nghĩa": { vi: "Gõ chính tả / nghĩa", en: "Typing / Spelling", ja: "タイピング / スペル入力" },
  "Nghe chọn / Nghe viết": { vi: "Nghe chọn / Nghe viết", en: "Listening Choice / Dictation", ja: "リスニング選択 / ディクテーション" },
  "Chiều hỏi": { vi: "Chiều hỏi", en: "Question Direction", ja: "出題方向" },
  "Nguồn câu hỏi": { vi: "Nguồn câu hỏi", en: "Question Source", ja: "出題範囲" },
  "Từ cần ôn · Gắn sao": { vi: "Từ cần ôn · Gắn sao", en: "Starred Words", ja: "スター付き（要復習）" },
  "Theo bộ từ": { vi: "Theo bộ từ", en: "By Deck", ja: "単語帳別" },
  "Số câu": { vi: "Số câu", en: "Question Count", ja: "問題数" },
  "Cách trả lời khi nghe": { vi: "Cách trả lời khi nghe", en: "Listening Response Mode", ja: "リスニング解答方式" },
  "Nghe chọn · 4 đáp án": { vi: "Nghe chọn · 4 đáp án", en: "Listen & Choose · 4 Options", ja: "聞いて選ぶ（4択）" },
  "Nghe viết": { vi: "Nghe viết", en: "Listen & Type (Dictation)", ja: "聞いて書く（ディクテーション）" },
  "Bắt đầu kiểm tra": { vi: "Bắt đầu kiểm tra", en: "Start Quiz", ja: "テストを開始" },
  "BÀI KIỂM TRA HOÀN TẤT": { vi: "BÀI KIỂM TRA HOÀN TẤT", en: "QUIZ COMPLETE", ja: "テスト完了" },
  "Các câu sai đã được gắn sao để bạn luyện lại.": { vi: "Các câu sai đã được gắn sao để bạn luyện lại.", en: "Incorrect words have been starred for review.", ja: "間違えた単語には復習用のスターが付きました。" },
  "Bạn đã trả lời đúng tất cả các câu.": { vi: "Bạn đã trả lời đúng tất cả các câu.", en: "You answered every question correctly!", ja: "全問正解しました！" },
  "Luyện lại các câu sai": { vi: "Luyện lại các câu sai", en: "Retry Incorrect Words", ja: "間違えた単語を再練習" },
  "Tạo bài kiểm tra mới": { vi: "Tạo bài kiểm tra mới", en: "New Quiz", ja: "新しいテストを作成" },
  "Các câu cần luyện lại": { vi: "Các câu cần luyện lại", en: "Words to Review", ja: "復習が必要な問題" },
  "Thoát bài": { vi: "Thoát bài", en: "Exit Quiz", ja: "テストを終了" },
  "Nội dung được đọc bằng tiếng Anh.": { vi: "Nội dung được đọc bằng tiếng Anh.", en: "Audio is spoken in English.", ja: "音声は英語で読み上げられます。" },
  "Nghe lại": { vi: "Nghe lại", en: "Replay Audio", ja: "もう一度聞く" },
  "TỪ TIẾNG ANH LÀ GÌ?": { vi: "TỪ TIẾNG ANH LÀ GÌ?", en: "WHAT IS THE ENGLISH WORD?", ja: "英語で何と言いますか？" },
  "NGHĨA TIẾNG VIỆT LÀ GÌ?": { vi: "NGHĨA TIẾNG VIỆT LÀ GÌ?", en: "WHAT IS THE VIETNAMESE MEANING?", ja: "ベトナム語の意味は何ですか？" },
  "Chấm câu trả lời": { vi: "Chấm câu trả lời", en: "Submit Answer", ja: "解答を採点" },
  "Chính xác": { vi: "Chính xác", en: "Correct!", ja: "正解！" },
  "Chưa đúng · Đã lưu ôn": { vi: "Chưa đúng · Đã lưu ôn", en: "Incorrect · Starred for review", ja: "不正解 · 復習リストに保存しました" },
  "Xem kết quả": { vi: "Xem kết quả", en: "View Results", ja: "結果を見る" },
  "Câu tiếp theo": { vi: "Câu tiếp theo", en: "Next Question", ja: "次の問題" },
  "BƯỚC NHỎ, TIẾN BỘ DÀI": { vi: "BƯỚC NHỎ, TIẾN BỘ DÀI", en: "SMALL STEPS, LONG PROGRESS", ja: "小さな一歩が大きな進歩へ" },
  "Thống kê tiến độ": { vi: "Thống kê tiến độ", en: "Progress Statistics", ja: "学習進捗の統計" },
  "Mỗi lượt học đều được ghi lại theo ngày trên thiết bị và đồng bộ đám mây.": { vi: "Mỗi lượt học đều được ghi lại theo ngày trên thiết bị và đồng bộ đám mây.", en: "Every study review is logged daily on your device and synced to the cloud.", ja: "すべての学習記録は日別にデバイスへ保存され、クラウドと同期されます。" },
  "Tổng số từ": { vi: "Tổng số từ", en: "Total Words", ja: "総単語数" },
  "Từ đang hoạt động": { vi: "Từ đang hoạt động", en: "Active vocabulary", ja: "有効な単語" },
  "Đến hạn hôm nay": { vi: "Đến hạn hôm nay", en: "Due Today", ja: "今日の復習対象" },
  "Bao gồm các từ quá hạn": { vi: "Bao gồm các từ quá hạn", en: "Includes overdue words", ja: "期限切れの単語を含む" },
  "Streak hiện tại": { vi: "Streak hiện tại", en: "Current Streak", ja: "現在の連続学習" },
  "Streak dài nhất": { vi: "Streak dài nhất", en: "Longest Streak", ja: "最長連続学習" },
  "ngày học liên tiếp": { vi: "ngày học liên tiếp", en: "consecutive study days", ja: "日連続" },
  "Độ chính xác 7 ngày": { vi: "Độ chính xác 7 ngày", en: "7-Day Accuracy", ja: "過去7日間の正答率" },
  "Chưa có lượt học trong 7 ngày": { vi: "Chưa có lượt học trong 7 ngày", en: "No study sessions in the last 7 days", ja: "過去7日間の学習記録はありません" },
  "Trạng thái từ vựng": { vi: "Trạng thái từ vựng", en: "Vocabulary Status", ja: "単語の習得状況" },
  "Chưa học": { vi: "Chưa học", en: "New", ja: "未学習" },
  "Đang học": { vi: "Đang học", en: "Learning", ja: "学習中" },
  "Thêm từ mới": { vi: "Thêm từ mới", en: "Add New Word", ja: "新しい単語を追加" },
  "Sửa từ vựng": { vi: "Sửa từ vựng", en: "Edit Word", ja: "単語を編集" },
  "Tra cứu và tự điền": { vi: "Tra cứu và tự điền", en: "Look Up & Autofill", ja: "辞書検索して自動入力" },
  "Nhập từ cần tra…": { vi: "Nhập từ cần tra…", en: "Enter word to look up…", ja: "検索する単語を入力…" },
  "Tiếng Anh *": { vi: "Tiếng Anh *", en: "English *", ja: "英語 *" },
  "Nghĩa tiếng Việt *": { vi: "Nghĩa tiếng Việt *", en: "Vietnamese Meaning *", ja: "ベトナム語の意味 *" },
  "Phiên âm IPA": { vi: "Phiên âm IPA", en: "IPA Pronunciation", ja: "IPA 発音記号" },
  "Từ loại": { vi: "Từ loại", en: "Part of Speech", ja: "品詞" },
  "danh từ, động từ…": { vi: "danh từ, động từ…", en: "noun, verb…", ja: "名詞、動詞…" },
  "Bài học / Nguồn": { vi: "Bài học / Nguồn", en: "Unit / Source", ja: "ユニット / 出典" },
  "Tùy chọn": { vi: "Tùy chọn", en: "Optional", ja: "任意" },
  "Lưu từ": { vi: "Lưu từ", en: "Save Word", ja: "単語を保存" },
  "Phát hiện từ vựng trùng lặp": { vi: "Phát hiện từ vựng trùng lặp", en: "Duplicate Vocabulary Detected", ja: "重複する単語が見つかりました" },
  "Bỏ qua (Skip)": { vi: "Bỏ qua (Skip)", en: "Skip", ja: "スキップ (Skip)" },
  "Ghi đè / Hợp nhất (Merge)": { vi: "Ghi đè / Hợp nhất (Merge)", en: "Overwrite / Merge", ja: "上書き / 統合 (Merge)" },
  "Bạn đang học ở Chế độ Khách (Guest). Dữ liệu được bảo toàn trong trình duyệt và sẽ tự động đồng bộ lên tài khoản ngay khi bạn đăng nhập.": { vi: "Bạn đang học ở Chế độ Khách (Guest). Dữ liệu được bảo toàn trong trình duyệt và sẽ tự động đồng bộ lên tài khoản ngay khi bạn đăng nhập.", en: "You are studying in Guest Mode. Your vocabulary is preserved in this browser and will automatically sync to your cloud account upon sign-in.", ja: "ゲストモードで学習中です。データはこのブラウザに保存され、ログイン時に自動的にクラウドアカウントと同期されます。" },
  "Đã tự động đồng bộ dữ liệu từ vựng trên trình duyệt lên tài khoản đám mây của bạn!": { vi: "Đã tự động đồng bộ dữ liệu từ vựng trên trình duyệt lên tài khoản đám mây của bạn!", en: "Automatically migrated and synced your local browser vocabulary to your cloud account!", ja: "ブラウザ内の単語データをクラウドアカウントに自動移行・同期しました！" },
  "Đã đồng bộ dữ liệu Vocab Studio với đám mây!": { vi: "Đã đồng bộ dữ liệu Vocab Studio với đám mây!", en: "Synced Vocab Studio data with the cloud!", ja: "単語スタジオ のデータをクラウドと同期しました！" },
  "Đã đồng bộ": { vi: "Đã đồng bộ", en: "Synced", ja: "同期済み" },
  "Ngôn ngữ giao diện": { vi: "Ngôn ngữ giao diện", en: "Interface Language", ja: "表示言語" },
  "🌐 Ngôn ngữ giao diện": { vi: "🌐 Ngôn ngữ giao diện", en: "🌐 Interface Language", ja: "🌐 表示言語" },
  "Hướng dẫn lấy API Key | AI Tutor": { vi: "Hướng dẫn lấy API Key | AI Tutor", en: "API Key Guide | AI Tutor", ja: "APIキー取得ガイド | AI Tutor" },
  "Quản trị – API Key Hệ thống | AI Tutor": { vi: "Quản trị – API Key Hệ thống | AI Tutor", en: "Admin – System API Keys | AI Tutor", ja: "管理 – システムAPIキー | AI Tutor" },
  "Dữ liệu học tập được lưu cục bộ trên trình duyệt. Sao lưu định kỳ qua Google Drive hoặc JSON trong mục Sao lưu & Khôi phục.": { vi: "Dữ liệu học tập được lưu cục bộ trên trình duyệt. Sao lưu định kỳ qua Google Drive hoặc JSON trong mục Sao lưu & Khôi phục.", en: "Your study data is stored locally in this browser. Back up regularly via Google Drive or JSON in Backup & Restore.", ja: "学習データはこのブラウザにローカル保存されます。「バックアップと復元」から Google Drive または JSON で定期的にバックアップしてください。" },
  "Đóng thông báo": { vi: "Đóng thông báo", en: "Dismiss notice", ja: "お知らせを閉じる" },
  "Cài đặt trước khi làm bài": { vi: "Cài đặt trước khi làm bài", en: "Pre-Quiz Settings", ja: "クイズ開始前設定" },
  "Quay lại trình soạn thảo": { vi: "Quay lại trình soạn thảo", en: "Back to Editor", ja: "エディターに戻る" },
  "Chế độ làm bài & Chia phiên": { vi: "Chế độ làm bài & Chia phiên", en: "Quiz Mode & Session Splitting", ja: "出題モードとセッション分割" },
  "Chia phiên làm bài": { vi: "Chia phiên làm bài", en: "Split into sessions", ja: "セッションに分割" },
  "Ngẫu nhiên N câu": { vi: "Ngẫu nhiên N câu", en: "Random N questions", ja: "ランダムN問" },
  "Toàn bộ đề": { vi: "Toàn bộ đề", en: "Full quiz", ja: "全問に挑戦" },
  "Chọn phiên": { vi: "Chọn phiên", en: "Select session", ja: "セッションを選択" },
  "Thời gian & Phản hồi đáp án": { vi: "Thời gian & Phản hồi đáp án", en: "Time Settings & Answer Feedback", ja: "制限時間と解答フィードバック" },
  "Thời gian riêng từng câu": { vi: "Thời gian riêng từng câu", en: "Time per question", ja: "問題ごとの制限時間" },
  "Thời gian chung cho mọi câu": { vi: "Thời gian chung cho mọi câu", en: "Uniform time for all", ja: "全問共通の制限時間" },
  "Hiện đáp án đúng ngay lập tức": { vi: "Hiện đáp án đúng ngay lập tức", en: "Show correct answer immediately", ja: "正解をすぐに表示" },
  "Hiển thị kết quả đúng/sai và đáp án ngay sau khi chọn": { vi: "Hiển thị kết quả đúng/sai và đáp án ngay sau khi chọn", en: "Display correctness and answer right after selecting", ja: "選択直後に正誤と正解を表示します" },
  "Hiện giải thích chi tiết": { vi: "Hiện giải thích chi tiết", en: "Show detailed explanation", ja: "詳しい解説を表示" },
  "Hiển thị phần giải thích đáp án ngay sau mỗi câu": { vi: "Hiển thị phần giải thích đáp án ngay sau mỗi câu", en: "Show answer explanation after each question", ja: "各問題の直後に解説を表示します" },
  "Cho phép xem lại sau khi nộp": { vi: "Cho phép xem lại sau khi nộp", en: "Allow review after submission", ja: "提出後の見直しを許可" },
  "Xem lại toàn bộ câu hỏi và đáp án ở màn hình tổng kết": { vi: "Xem lại toàn bộ câu hỏi và đáp án ở màn hình tổng kết", en: "Review all questions and answers on the summary screen", ja: "結果画面ですべての問題と解答を確認できます" },
  "Cài đặt nâng cao": { vi: "Cài đặt nâng cao", en: "Advanced settings", ja: "詳細設定" },
  "Một số tùy chọn nâng cao yêu cầu gói Silver trở lên.": { vi: "Một số tùy chọn nâng cao yêu cầu gói Silver trở lên.", en: "Some advanced options require the Silver plan or higher.", ja: "一部の詳細オプションには Silver プラン以上が必要です。" },
  "Trộn ngẫu nhiên thứ tự các câu hỏi": { vi: "Trộn ngẫu nhiên thứ tự các câu hỏi", en: "Randomize the order of questions", ja: "問題の出題順をランダムに並べ替えます" },
  "Xáo trộn phương án, giữ đúng khóa đáp án": { vi: "Xáo trộn phương án, giữ đúng khóa đáp án", en: "Randomize options while preserving the answer key", ja: "正解キーを保持したまま選択肢を並べ替えます" },
  "Hiệu ứng âm thanh": { vi: "Hiệu ứng âm thanh", en: "Sound effects", ja: "効果音" },
  "Phát âm thanh phản hồi khi trả lời đúng/sai": { vi: "Phát âm thanh phản hồi khi trả lời đúng/sai", en: "Play audio feedback for correct and wrong answers", ja: "正解・不正解時に効果音を再生します" },
  "Thanh chuỗi đúng & thưởng tốc độ": { vi: "Thanh chuỗi đúng & thưởng tốc độ", en: "Streak bar & speed bonus", ja: "連続正解バーとスピードボーナス" },
  "Cộng điểm thưởng khi trả lời nhanh liên tiếp": { vi: "Cộng điểm thưởng khi trả lời nhanh liên tiếp", en: "Earn bonus points for fast, consecutive correct answers", ja: "素早い連続正解でボーナスポイントを獲得します" },
  "Câu hỏi cứu vớt": { vi: "Câu hỏi cứu vớt", en: "Redemption question", ja: "復習問題（リデンプション）" },
  "Làm lại câu đã trả lời sai ở cuối phiên": { vi: "Làm lại câu đã trả lời sai ở cuối phiên", en: "Retry missed questions at the end of the session", ja: "セッションの最後に間違えた問題へ再挑戦します" },
  "Quyền truy cập Quiz": { vi: "Quyền truy cập Quiz", en: "Quiz Visibility", ja: "クイズの公開設定" },
  "Đã chuyển sang 🌐 Public và sao chép Link!": { vi: "Đã chuyển sang 🌐 Public và sao chép Link!", en: "Switched to Public and copied share link!", ja: "公開設定に切り替え、共有リンクをコピーしました！" },
  "Không thể chuyển sang Public.": { vi: "Không thể chuyển sang Public.", en: "Unable to switch to Public.", ja: "公開設定に切り替えられませんでした。" },
  "Cập nhật trạng thái thất bại.": { vi: "Cập nhật trạng thái thất bại.", en: "Failed to update status.", ja: "ステータスの更新に失敗しました。" },
  "⚠️ Không thể lưu & tạo liên kết chia sẻ": { vi: "⚠️ Không thể lưu & tạo liên kết chia sẻ", en: "Unable to save and generate share link", ja: "保存および共有リンクの作成に失敗しました" },
  "Dữ liệu Quiz của bạn vẫn được bảo toàn an toàn trên trình duyệt. Hệ thống không tạo link giả khi chưa xác nhận lưu thành công.": { vi: "Dữ liệu Quiz của bạn vẫn được bảo toàn an toàn trên trình duyệt. Hệ thống không tạo link giả khi chưa xác nhận lưu thành công.", en: "Your quiz data remains safely saved in your browser. No link is generated until cloud save is confirmed.", ja: "クイズデータはブラウザに安全に保持されています。保存が確認されるまで共有リンクは作成されません。" },
  "🔄 Thử lại": { vi: "🔄 Thử lại", en: "Retry", ja: "再試行" },
  "🔄 Thử lại (Retry)": { vi: "🔄 Thử lại (Retry)", en: "Retry", ja: "再試行" },
  "🏠 Về trang chủ": { vi: "🏠 Về trang chủ", en: "Back to Home", ja: "ホームに戻る" },
  "Quyền truy cập (Visibility):": { vi: "Quyền truy cập (Visibility):", en: "Visibility:", ja: "公開範囲:" },
  "🌐 Public (Mọi người có link đều làm được)": { vi: "🌐 Public (Mọi người có link đều làm được)", en: "Public (Anyone with the link can play)", ja: "公開（リンクを知っている全員が参加可能）" },
  "🔒 Private (Chỉ mình bạn xem được)": { vi: "🔒 Private (Chỉ mình bạn xem được)", en: "Private (Only you can view)", ja: "非公開（自分のみ閲覧可能）" },
  "Đường dẫn trực tiếp": { vi: "Đường dẫn trực tiếp", en: "Direct Share Link", ja: "直接共有リンク" },
  "Lỗi kết nối máy chủ.": { vi: "Lỗi kết nối máy chủ.", en: "Server connection error.", ja: "サーバー接続エラーが発生しました。" },
  "Không tìm thấy Quiz với mã này. Vui lòng kiểm tra lại đường dẫn hoặc mã chia sẻ.": { vi: "Không tìm thấy Quiz với mã này. Vui lòng kiểm tra lại đường dẫn hoặc mã chia sẻ.", en: "No quiz found with this code. Please check the link or share code.", ja: "このコードに一致するクイズが見つかりませんでした。リンクまたは共有コードを確認してください。" },
  "Quiz này đang được đặt ở chế độ Riêng tư (Private). Hãy đăng nhập bằng tài khoản chủ sở hữu hoặc nhờ tác giả chuyển sang Public.": { vi: "Quiz này đang được đặt ở chế độ Riêng tư (Private). Hãy đăng nhập bằng tài khoản chủ sở hữu hoặc nhờ tác giả chuyển sang Public.", en: "This quiz is set to Private. Sign in with the owner account or ask the author to make it Public.", ja: "このクイズは非公開に設定されています。作成者アカウントでログインするか、作成者に公開設定への変更を依頼してください。" },
  "Không thể kết nối máy chủ để tải Quiz. Vui lòng kiểm tra mạng và thử lại.": { vi: "Không thể kết nối máy chủ để tải Quiz. Vui lòng kiểm tra mạng và thử lại.", en: "Unable to connect to the server to load the quiz. Please check your network and try again.", ja: "クイズを読み込むためのサーバー接続に失敗しました。通信環境を確認して再試行してください。" },
  "Dữ liệu Quiz không hợp lệ hoặc không thể giải mã.": { vi: "Dữ liệu Quiz không hợp lệ hoặc không thể giải mã.", en: "Invalid or unreadable quiz data.", ja: "クイズデータが無効か、読み取れませんでした。" },
  "Khuyên dùng • Miễn phí • Vision • Không cần thẻ": { vi: "Khuyên dùng • Miễn phí • Vision • Không cần thẻ", en: "Recommended · Free · Vision · No card required", ja: "おすすめ・無料・Vision対応・カード不要" },
  "Miễn phí (~30 RPM / 1.000 RPD), tốc độ LPU siêu nhanh, hỗ trợ đọc ảnh đề thi (Vision) với Qwen 3.6 27B, không cần thẻ tín dụng.": { vi: "Miễn phí (~30 RPM / 1.000 RPD), tốc độ LPU siêu nhanh, hỗ trợ đọc ảnh đề thi (Vision) với Qwen 3.6 27B, không cần thẻ tín dụng.", en: "Free (~30 RPM / 1,000 RPD), ultra-fast LPU inference, supports exam image OCR (Vision) with Qwen 3.6 27B, no credit card required.", ja: "無料（約30 RPM / 1,000 RPD）、超高速LPU推論、Qwen 3.6 27B による試験画像OCR（Vision）対応、クレジットカード不要。" },
  "Mở https://console.groq.com/keys và đăng nhập bằng tài khoản Google hoặc GitHub (không cần thẻ Visa).": { vi: "Mở https://console.groq.com/keys và đăng nhập bằng tài khoản Google hoặc GitHub (không cần thẻ Visa).", en: "Open https://console.groq.com/keys and sign in with Google or GitHub (no credit card needed).", ja: "https://console.groq.com/keys を開き、Google または GitHub アカウントでログインします（クレジットカード不要）。" },
  "Nhấn nút Create API Key, đặt tên gợi nhớ (ví dụ: ai-tutor) rồi nhấn Submit.": { vi: "Nhấn nút Create API Key, đặt tên gợi nhớ (ví dụ: ai-tutor) rồi nhấn Submit.", en: "Click Create API Key, give it a recognizable name (e.g. ai-tutor), and click Submit.", ja: "Create API Key をクリックし、分かりやすい名前（例: ai-tutor）を入力して Submit を押します。" },
  "Sao chép ngay mã khóa bắt đầu bằng gsk_... và dán vào mục Groq Cloud tại Cài đặt API.": { vi: "Sao chép ngay mã khóa bắt đầu bằng gsk_... và dán vào mục Groq Cloud tại Cài đặt API.", en: "Copy the key starting with gsk_... and paste it into Groq Cloud under API Settings.", ja: "gsk_... で始まるキーをコピーし、API設定の Groq Cloud 欄に貼り付けます。" },
  "Groq Qwen 3.6 27B (Miễn phí & Vision)": { vi: "Groq Qwen 3.6 27B (Miễn phí & Vision)", en: "Groq Qwen 3.6 27B (Free & Vision)", ja: "Groq Qwen 3.6 27B（無料・Vision）" },
  "Groq GPT-OSS 120B (Miễn phí • Suy luận mạnh)": { vi: "Groq GPT-OSS 120B (Miễn phí • Suy luận mạnh)", en: "Groq GPT-OSS 120B (Free · Strong Reasoning)", ja: "Groq GPT-OSS 120B（無料・高推論）" },
  "Groq Llama 3.1 8B Instant (Siêu tốc < 400ms • Miễn phí)": { vi: "Groq Llama 3.1 8B Instant (Siêu tốc < 400ms • Miễn phí)", en: "Groq Llama 3.1 8B Instant (Ultra-fast < 400ms · Free)", ja: "Groq Llama 3.1 8B Instant（超高速 < 400ms・無料）" },
  "Groq GPT-OSS 20B (Siêu tốc • Miễn phí)": { vi: "Groq GPT-OSS 20B (Siêu tốc • Miễn phí)", en: "Groq GPT-OSS 20B (Ultra-fast · Free)", ja: "Groq GPT-OSS 20B（超高速・無料）" },
  "Miễn phí 20 RPM / 50 RPD (tăng lên 1.000 RPD khi nạp tối thiểu $10 một lần). Dùng openrouter/free để tự động định tuyến model :free đang hoạt động.": { vi: "Miễn phí 20 RPM / 50 RPD (tăng lên 1.000 RPD khi nạp tối thiểu $10 một lần). Dùng openrouter/free để tự động định tuyến model :free đang hoạt động.", en: "Free 20 RPM / 50 RPD (increases to 1,000 RPD after a one-time $10 top-up). Use openrouter/free to auto-route active free models.", ja: "無料 20 RPM / 50 RPD（10ドルの初回チャージで 1,000 RPD に増加）。openrouter/free で稼働中の無料モデルへ自動ルーティングします。" },
  "Truy cập https://openrouter.ai/keys và đăng nhập bằng tài khoản Google hoặc GitHub.": { vi: "Truy cập https://openrouter.ai/keys và đăng nhập bằng tài khoản Google hoặc GitHub.", en: "Visit https://openrouter.ai/keys and sign in with Google or GitHub.", ja: "https://openrouter.ai/keys にアクセスし、Google または GitHub アカウントでログインします。" },
  "Nhấn Create Key, đặt tên tùy ý rồi xác nhận tạo khóa.": { vi: "Nhấn Create Key, đặt tên tùy ý rồi xác nhận tạo khóa.", en: "Click Create Key, enter any name, and confirm creation.", ja: "Create Key をクリックし、任意の名前を入力してキーを作成します。" },
  "Sao chép khóa bắt đầu bằng sk-or-... để dùng openrouter/free và các model :free (hoặc nạp thêm credit nếu cần).": { vi: "Sao chép khóa bắt đầu bằng sk-or-... để dùng openrouter/free và các model :free (hoặc nạp thêm credit nếu cần).", en: "Copy the key starting with sk-or-... to use openrouter/free and free models (or add credits if needed).", ja: "sk-or-... で始まるキーをコピーして openrouter/free や無料モデルを利用します（必要に応じてクレジットを追加可能）。" },
  "Miễn phí • Tiếng Việt & PDF/Tài liệu dài tốt": { vi: "Miễn phí • Tiếng Việt & PDF/Tài liệu dài tốt", en: "Free · Great for PDF & Long Documents", ja: "無料・PDFや長文資料に強い" },
  "Có gói miễn phí theo dự án (RPM/TPM/RPD), ngữ cảnh rất dài (1M+ token), đọc PDF scan, ảnh công thức và tiếng Việt rất tốt.": { vi: "Có gói miễn phí theo dự án (RPM/TPM/RPD), ngữ cảnh rất dài (1M+ token), đọc PDF scan, ảnh công thức và tiếng Việt rất tốt.", en: "Per-project free tier (RPM/TPM/RPD) with 1M+ token context; excels at scanned PDFs, math formulas, and multilingual text.", ja: "プロジェクト単位の無料枠（RPM/TPM/RPD）があり、100万トークン以上の長文コンテキストでスキャンPDFや数式画像を正確に読み取ります。" },
  "Mở https://aistudio.google.com/apikey và đăng nhập bằng tài khoản Google của bạn.": { vi: "Mở https://aistudio.google.com/apikey và đăng nhập bằng tài khoản Google của bạn.", en: "Open https://aistudio.google.com/apikey and sign in with your Google account.", ja: "https://aistudio.google.com/apikey を開き、Google アカウントでログインします。" },
  "Nhấn Create API Key, chọn hoặc tạo một Google Cloud Project mới.": { vi: "Nhấn Create API Key, chọn hoặc tạo một Google Cloud Project mới.", en: "Click Create API Key, then select or create a new Google Cloud Project.", ja: "Create API Key をクリックし、Google Cloud プロジェクトを選択または新規作成します。" },
  "Sao chép khóa bắt đầu bằng AIza... và dán vào mục Google AI Studio (Gemini) tại Cài đặt API.": { vi: "Sao chép khóa bắt đầu bằng AIza... và dán vào mục Google AI Studio (Gemini) tại Cài đặt API.", en: "Copy the key starting with AIza... and paste it into Google AI Studio (Gemini) under API Settings.", ja: "AIza... で始まるキーをコピーし、API設定の Google AI Studio (Gemini) 欄に貼り付けます。" },
  "Gemini 3.8 Flash (Mặc định • Nhanh & Vision/PDF)": { vi: "Gemini 3.8 Flash (Mặc định • Nhanh & Vision/PDF)", en: "Gemini 3.8 Flash (Default · Fast & Vision/PDF)", ja: "Gemini 3.8 Flash（既定・高速 & Vision/PDF）" },
  "Gemini 3.5 Flash-Lite (Siêu nhanh / Quota lớn)": { vi: "Gemini 3.5 Flash-Lite (Siêu nhanh / Quota lớn)", en: "Gemini 3.5 Flash-Lite (Ultra-fast / High Quota)", ja: "Gemini 3.5 Flash-Lite（超高速・大容量枠）" },
  "Gemini 2.5 Flash-Lite (Ổn định • Vision/PDF)": { vi: "Gemini 2.5 Flash-Lite (Ổn định • Vision/PDF)", en: "Gemini 2.5 Flash-Lite (Stable · Vision/PDF)", ja: "Gemini 2.5 Flash-Lite（安定・Vision/PDF）" },
  "Gemini 2.5 Flash (Legacy — tự định tuyến 3.5 Flash-Lite)": { vi: "Gemini 2.5 Flash (Legacy — tự định tuyến 3.5 Flash-Lite)", en: "Gemini 2.5 Flash (Legacy — routes to 3.5 Flash-Lite)", ja: "Gemini 2.5 Flash（旧版 — 3.5 Flash-Lite へ自動ルーティング）" },
  "Gemini 4 Argon (Chính xác cao • Trả phí)": { vi: "Gemini 4 Argon (Chính xác cao • Trả phí)", en: "Gemini 4 Argon (High Accuracy · Paid)", ja: "Gemini 4 Argon（高精度・有料）" },
  "Dịch vụ trả phí theo token (cần nạp tối thiểu $5 vào Billing), chất lượng Vision & tuân thủ JSON ổn định cao.": { vi: "Dịch vụ trả phí theo token (cần nạp tối thiểu $5 vào Billing), chất lượng Vision & tuân thủ JSON ổn định cao.", en: "Pay-per-token service (minimum $5 billing top-up) with reliable Vision accuracy and strict JSON compliance.", ja: "従量課金サービス（最低5ドルのチャージが必要）。高いVision精度と安定したJSON出力を提供します。" },
  "Truy cập https://platform.openai.com/api-keys và đăng nhập tài khoản OpenAI.": { vi: "Truy cập https://platform.openai.com/api-keys và đăng nhập tài khoản OpenAI.", en: "Visit https://platform.openai.com/api-keys and sign in to your OpenAI account.", ja: "https://platform.openai.com/api-keys にアクセスし、OpenAI アカウントでログインします。" },
  "Vào Billing nạp credit tối thiểu ($5 USD), sau đó quay lại API Keys nhấn Create new secret key.": { vi: "Vào Billing nạp credit tối thiểu ($5 USD), sau đó quay lại API Keys nhấn Create new secret key.", en: "Add at least $5 USD credit under Billing, then return to API Keys and click Create new secret key.", ja: "Billing で最低5ドルのクレジットをチャージした後、API Keys に戻り Create new secret key をクリックします。" },
  "Sao chép mã khóa sk-... và dán đúng vào tab của hãng OpenAI (tránh nhầm với DeepSeek cũng dùng đầu sk-).": { vi: "Sao chép mã khóa sk-... và dán đúng vào tab của hãng OpenAI (tránh nhầm với DeepSeek cũng dùng đầu sk-).", en: "Copy the sk-... key and paste it into the OpenAI tab (do not confuse with DeepSeek, which also starts with sk-).", ja: "sk-... キーをコピーし、OpenAI タブに貼り付けます（同じ sk- で始まる DeepSeek と混同しないようご注意ください）。" },
  "OpenAI GPT-4.1 Mini (Nhanh, ngữ cảnh 1M & Vision)": { vi: "OpenAI GPT-4.1 Mini (Nhanh, ngữ cảnh 1M & Vision)", en: "OpenAI GPT-4.1 Mini (Fast, 1M Context & Vision)", ja: "OpenAI GPT-4.1 Mini（高速・1Mコンテキスト & Vision）" },
  "OpenAI GPT-4o Mini (Tiết kiệm & Vision)": { vi: "OpenAI GPT-4o Mini (Tiết kiệm & Vision)", en: "OpenAI GPT-4o Mini (Cost-Effective & Vision)", ja: "OpenAI GPT-4o Mini（低コスト & Vision）" },
  "OpenAI GPT-5 Mini (Suy luận & Vision)": { vi: "OpenAI GPT-5 Mini (Suy luận & Vision)", en: "OpenAI GPT-5 Mini (Reasoning & Vision)", ja: "OpenAI GPT-5 Mini（推論 & Vision）" },
  "Chi phí rất rẻ (~$0.25/1M input), cực mạnh khi giải bài tập Toán/Lý/Hóa và suy luận logic bằng văn bản (không hỗ trợ đọc ảnh Vision).": { vi: "Chi phí rất rẻ (~$0.25/1M input), cực mạnh khi giải bài tập Toán/Lý/Hóa và suy luận logic bằng văn bản (không hỗ trợ đọc ảnh Vision).", en: "Very low cost (~$0.25/1M input tokens), excels at Math/Physics/Chemistry and text reasoning (no Vision image input).", ja: "非常に低コスト（約0.25ドル/100万入力トークン）。数学・物理・化学や論理推論に優れています（画像Vision非対応）。" },
  "Mở https://platform.deepseek.com/api_keys và đăng nhập tài khoản DeepSeek.": { vi: "Mở https://platform.deepseek.com/api_keys và đăng nhập tài khoản DeepSeek.", en: "Open https://platform.deepseek.com/api_keys and sign in to your DeepSeek account.", ja: "https://platform.deepseek.com/api_keys を開き、DeepSeek アカウントでログインします。" },
  "Nạp số dư tối thiểu ở mục Top up, sau đó nhấn Create new API key.": { vi: "Nạp số dư tối thiểu ở mục Top up, sau đó nhấn Create new API key.", en: "Add the minimum balance under Top up, then click Create new API key.", ja: "Top up で最低残高をチャージした後、Create new API key をクリックします。" },
  "Sao chép mã khóa sk-... và dán vào đúng tab DeepSeek trong Cài đặt API.": { vi: "Sao chép mã khóa sk-... và dán vào đúng tab DeepSeek trong Cài đặt API.", en: "Copy the sk-... key and paste it into the DeepSeek tab under API Settings.", ja: "sk-... キーをコピーし、API設定の DeepSeek タブに貼り付けます。" },
  "DeepSeek Chat V3 (Giải đề & Chuẩn hóa)": { vi: "DeepSeek Chat V3 (Giải đề & Chuẩn hóa)", en: "DeepSeek Chat V3 (Solving & Formatting)", ja: "DeepSeek Chat V3（解答・整形）" },
  "DeepSeek Reasoner R1 (Toán/Lý/Hóa chuyên sâu)": { vi: "DeepSeek Reasoner R1 (Toán/Lý/Hóa chuyên sâu)", en: "DeepSeek Reasoner R1 (Advanced STEM)", ja: "DeepSeek Reasoner R1（理系・高度推論）" },
  "Bạn có thể dán nhiều API Key từ nhiều tài khoản hoặc Google Cloud Project KHÁC NHAU mà CHÍNH BẠN SỞ HỮU vào ô nhập theo từng hãng để hệ thống tự động xoay vòng khi 1 key chạm giới hạn. Lưu ý: các key tạo trong CÙNG một Google Cloud Project sẽ dùng chung quota với nhau, và hãy luôn tuân thủ Điều khoản sử dụng (Terms of Service) của từng nhà cung cấp.": { vi: "Bạn có thể dán nhiều API Key từ nhiều tài khoản hoặc Google Cloud Project KHÁC NHAU mà CHÍNH BẠN SỞ HỮU vào ô nhập theo từng hãng để hệ thống tự động xoay vòng khi 1 key chạm giới hạn. Lưu ý: các key tạo trong CÙNG một Google Cloud Project sẽ dùng chung quota với nhau, và hãy luôn tuân thủ Điều khoản sử dụng (Terms of Service) của từng nhà cung cấp.", en: "You can paste multiple API keys from different accounts or Google Cloud Projects that you own for automatic rotation when a key reaches its quota. Note: keys in the same Google Cloud Project share quota; always comply with each provider's Terms of Service.", ja: "ご自身が所有する複数のアカウントや異なる Google Cloud プロジェクトの API キーを貼り付けると、上限に達した際に自動でローテーションされます。同一プロジェクト内のキーはクォータを共有する点にご注意のうえ、各プロバイダーの利用規約を遵守してください。" },
  "Trống": { vi: "Trống", en: "Empty", ja: "空" },
  "Sẵn sàng (kiểm tra trực tiếp qua API)": { vi: "Sẵn sàng (kiểm tra trực tiếp qua API)", en: "Ready (verified directly via API)", ja: "準備完了（APIで直接検証）" },
  "Đang dùng Key cá nhân": { vi: "Đang dùng Key cá nhân", en: "Using personal key", ja: "個人キーを使用中" },
  "Hôm nay cần ôn": { vi: "Hôm nay cần ôn", en: "Due for review today", ja: "今日の復習予定" },
  "Lịch ôn và thống kê đã được lưu sau mỗi lượt.": { vi: "Lịch ôn và thống kê đã được lưu sau mỗi lượt.", en: "Review schedule and stats are saved after each turn.", ja: "復習スケジュールと統計は毎ターン自動保存されます。" },
  "⚡ Smart Master Review (Đa bộ từ • Khử trùng)": { vi: "⚡ Smart Master Review (Đa bộ từ • Khử trùng)", en: "Smart Master Review (Multi-deck · Deduplicated)", ja: "スマートマスター復習（複数単語帳・重複除外）" },
  "Theo 1 bộ từ": { vi: "Theo 1 bộ từ", en: "Single deck", ja: "単一の単語帳" },
  "Chọn nhiều bộ từ cho Smart Master Review (để trống = tất cả):": { vi: "Chọn nhiều bộ từ cho Smart Master Review (để trống = tất cả):", en: "Select decks for Smart Master Review (leave empty for all):", ja: "スマートマスター復習の対象単語帳を選択（未選択＝すべて）:" },
  "Đáp án:": { vi: "Đáp án:", en: "Answer:", ja: "正解:" },
  "JSON không hợp lệ": { vi: "JSON không hợp lệ", en: "Invalid JSON", ja: "無効なJSONです" },
  "Đã xuất bản sao lưu JSON": { vi: "Đã xuất bản sao lưu JSON", en: "Exported JSON backup", ja: "JSONバックアップを出力しました" },
  "Vui lòng nhập từ và nghĩa": { vi: "Vui lòng nhập từ và nghĩa", en: "Please enter both word and meaning", ja: "単語と意味を入力してください" },
  "Đã thêm từ mới": { vi: "Đã thêm từ mới", en: "New word added", ja: "新しい単語を追加しました" },
  "Đã cập nhật từ": { vi: "Đã cập nhật từ", en: "Word updated", ja: "単語を更新しました" },
  "Đã xóa từ cá nhân": { vi: "Đã xóa từ cá nhân", en: "Custom word deleted", ja: "単語を削除しました" },
  "Đã lưu bộ từ": { vi: "Đã lưu bộ từ", en: "Deck saved", ja: "単語帳を保存しました" },
  "Hãy nhập tên bộ từ": { vi: "Hãy nhập tên bộ từ", en: "Please enter a deck name", ja: "単語帳の名前を入力してください" },
  "Tên bộ từ đã tồn tại": { vi: "Tên bộ từ đã tồn tại", en: "Deck name already exists", ja: "その単語帳名はすでに存在します" },
  "Xóa bộ từ": { vi: "Xóa bộ từ", en: "Delete deck", ja: "単語帳を削除" },
  "Xóa từ vựng": { vi: "Xóa từ vựng", en: "Delete word", ja: "単語を削除" },
  "Đã hết từ đến hạn hoặc đã đủ giới hạn từ mới hôm nay.": { vi: "Đã hết từ đến hạn hoặc đã đủ giới hạn từ mới hôm nay.", en: "No due words remaining or today's new-word limit has been reached.", ja: "本日の復習対象または新規単語の上限に達しました。" },
  "Chưa có từ phù hợp để luyện": { vi: "Chưa có từ phù hợp để luyện", en: "No matching words to practice", ja: "練習できる単語がありません" },
  "Chính xác tuyệt đối (Tier 1 • 0ms, 0 token).": { vi: "Chính xác tuyệt đối (Tier 1 • 0ms, 0 token).", en: "Exact match (Tier 1 · 0ms, 0 tokens).", ja: "完全一致（Tier 1・0ms・0トークン）。" },
  "Chính xác về mặt ngữ nghĩa.": { vi: "Chính xác về mặt ngữ nghĩa.", en: "Semantically correct.", ja: "意味的に正解です。" },
  "Đáp án chưa khớp ngữ nghĩa.": { vi: "Đáp án chưa khớp ngữ nghĩa.", en: "Answer does not match semantically.", ja: "意味が一致しませんでした。" },
  "Chưa đúng.": { vi: "Chưa đúng.", en: "Incorrect.", ja: "不正解です。" },
  "Đã chấp nhận câu trả lời là Đúng!": { vi: "Đã chấp nhận câu trả lời là Đúng!", en: "Accepted answer as correct!", ja: "解答を正解として承認しました！" },
  "Đang tra cứu…": { vi: "Đang tra cứu…", en: "Looking up…", ja: "検索中…" },
  "Nghe phát âm": { vi: "Nghe phát âm", en: "Listen to pronunciation", ja: "発音を聞く" },
  "danh từ": { vi: "danh từ", en: "noun", ja: "名詞" },
  "động từ": { vi: "động từ", en: "verb", ja: "動詞" },
  "tính từ": { vi: "tính từ", en: "adjective", ja: "形容詞" },
  "trạng từ": { vi: "trạng từ", en: "adverb", ja: "副詞" },
  "đại từ": { vi: "đại từ", en: "pronoun", ja: "代名詞" },
  "giới từ": { vi: "giới từ", en: "preposition", ja: "前置詞" },
  "liên từ": { vi: "liên từ", en: "conjunction", ja: "接続詞" },
  "thán từ": { vi: "thán từ", en: "interjection", ja: "間投詞" },
  "Đúng / Sai (2025)": { vi: "Đúng / Sai (2025)", en: "True / False (2025)", ja: "正誤問題 (2025)" },
  "Trả lời ngắn": { vi: "Trả lời ngắn", en: "Short Answer", ja: "記述式（短答）" },
  "Sắp xếp thứ tự": { vi: "Sắp xếp thứ tự", en: "Ordering", ja: "並べ替え" },
  "Tự luận": { vi: "Tự luận", en: "Essay", ja: "論述" },
  "Trắc nghiệm (MCQ)": { vi: "Trắc nghiệm (MCQ)", en: "Multiple Choice", ja: "選択式" },
  "Nhập thứ tự (VD: c-a-b-d)...": { vi: "Nhập thứ tự (VD: c-a-b-d)...", en: "Enter order (e.g. c-a-b-d)...", ja: "順番を入力（例: c-a-b-d）..." },
  "Nhập đáp án ngắn...": { vi: "Nhập đáp án ngắn...", en: "Enter short answer...", ja: "解答を入力..." },
  "✅ Chính xác!": { vi: "✅ Chính xác!", en: "Correct!", ja: "正解！" },
  "Chưa có": { vi: "Chưa có", en: "None", ja: "なし" },
  "Ẩn thông báo": { vi: "Ẩn thông báo", en: "Dismiss", ja: "非表示" },
  "Đã lưu vào thư viện AI Tutor!": { vi: "Đã lưu vào thư viện AI Tutor!", en: "Saved to AI Tutor library!", ja: "AI Tutor ライブラリに保存しました！" },
  "📋 Sao chép Master Prompt": { vi: "📋 Sao chép Master Prompt", en: "Copy Master Prompt", ja: "マスタープロンプトをコピー" },
  "✅ Đã sao chép!": { vi: "✅ Đã sao chép!", en: "Copied!", ja: "コピーしました！" },
  "📂 Kéo thả hoặc chọn file .md tại đây": { vi: "📂 Kéo thả hoặc chọn file .md tại đây", en: "Drag & drop or choose a .md file here", ja: ".md ファイルをドラッグ＆ドロップまたは選択" },
  "⚡ Nhập Markdown cục bộ (0 API call)": { vi: "⚡ Nhập Markdown cục bộ (0 API call)", en: "Import Local Markdown (0 API calls)", ja: "ローカル Markdown をインポート（API消費なし）" },
  "Học sinh & Lớp học | AI Tutor": { vi: "Học sinh & Lớp học | AI Tutor", en: "Students & Classes | AI Tutor", ja: "生徒・クラス管理 | AI Tutor" },
  "Giao bài tập | AI Tutor": { vi: "Giao bài tập | AI Tutor", en: "Assignments | AI Tutor", ja: "課題管理 | AI Tutor" },
  "Sổ điểm & Phân tích | AI Tutor": { vi: "Sổ điểm & Phân tích | AI Tutor", en: "Gradebook & Analytics | AI Tutor", ja: "成績表・分析 | AI Tutor" },
  "Làm bài tập | AI Tutor": { vi: "Làm bài tập | AI Tutor", en: "Assignment | AI Tutor", ja: "課題の受験 | AI Tutor" },
  "Xác nhận kết quả | AI Tutor": { vi: "Xác nhận kết quả | AI Tutor", en: "Parent Result Confirmation | AI Tutor", ja: "保護者確認 | AI Tutor" },
  "Thư viện & Soạn đề": { vi: "Thư viện & Soạn đề", en: "Quiz Library & Editor", ja: "問題ライブラリ・作成" },
  "Học sinh & Lớp học": { vi: "Học sinh & Lớp học", en: "Students & Classes", ja: "生徒・クラス" },
  "Giao bài tập": { vi: "Giao bài tập", en: "Assignments", ja: "課題管理" },
  "Sổ điểm & Phân tích": { vi: "Sổ điểm & Phân tích", en: "Gradebook & Analytics", ja: "成績表・分析" },
  "Giao bài": { vi: "Giao bài", en: "Assign", ja: "課題を配布" },
  "Danh bạ Học sinh & Lớp học": { vi: "Danh bạ Học sinh & Lớp học", en: "Student & Class Directory", ja: "生徒・クラス名簿" },
  "Quản lý danh sách học sinh, mã PIN 4 số bảo mật và theo dõi hồ sơ tiến bộ cá nhân.": { vi: "Quản lý danh sách học sinh, mã PIN 4 số bảo mật và theo dõi hồ sơ tiến bộ cá nhân.", en: "Manage student rosters, 4-digit security PINs, and individual progress portfolios.", ja: "生徒名簿、4桁のセキュリティPIN、および個人の学習ポートフォリオを管理します。" },
  "Nhập Excel / CSV": { vi: "Nhập Excel / CSV", en: "Import Excel / CSV", ja: "Excel / CSV インポート" },
  "Thêm học sinh": { vi: "Thêm học sinh", en: "Add Student", ja: "生徒を追加" },
  "Thêm học sinh đầu tiên": { vi: "Thêm học sinh đầu tiên", en: "Add First Student", ja: "最初の生徒を追加" },
  "Nhập từ CSV / Excel": { vi: "Nhập từ CSV / Excel", en: "Import CSV / Excel", ja: "CSV / Excel から読込" },
  "Tìm theo tên, lớp, trường, email phụ huynh...": { vi: "Tìm theo tên, lớp, trường, email phụ huynh...", en: "Search by name, class, school, or parent email...", ja: "氏名・クラス・学校・保護者メールで検索..." },
  "Chưa có học sinh nào trong danh sách. Hãy thêm học sinh mới hoặc nhập hàng loạt từ file Excel / CSV.": { vi: "Chưa có học sinh nào trong danh sách. Hãy thêm học sinh mới hoặc nhập hàng loạt từ file Excel / CSV.", en: "No students yet. Add a student manually or bulk import from an Excel / CSV file.", ja: "生徒がまだ登録されていません。手動で追加するか、Excel / CSV ファイルから一括インポートしてください。" },
  "Họ và tên": { vi: "Họ và tên", en: "Full Name", ja: "氏名" },
  "Lớp": { vi: "Lớp", en: "Class", ja: "クラス" },
  "Trường": { vi: "Trường", en: "School", ja: "学校" },
  "Email phụ huynh": { vi: "Email phụ huynh", en: "Parent Email", ja: "保護者メール" },
  "Mã PIN": { vi: "Mã PIN", en: "PIN", ja: "PINコード" },
  "Điểm TB": { vi: "Điểm TB", en: "Avg Score", ja: "平均点" },
  "Thao tác": { vi: "Thao tác", en: "Actions", ja: "操作" },
  "Chưa có email": { vi: "Chưa có email", en: "No email", ja: "メール未登録" },
  "Chưa phân lớp": { vi: "Chưa phân lớp", en: "Unassigned", ja: "未分類" },
  "Hồ sơ": { vi: "Hồ sơ", en: "Portfolio", ja: "ポートフォリオ" },
  "Quay lại danh bạ": { vi: "Quay lại danh bạ", en: "Back to Directory", ja: "名簿に戻る" },
  "Bài đã nộp": { vi: "Bài đã nộp", en: "Submitted", ja: "提出済み" },
  "Điểm trung bình": { vi: "Điểm trung bình", en: "Average Score", ja: "平均点" },
  "Điểm cao nhất": { vi: "Điểm cao nhất", en: "Highest Score", ja: "最高点" },
  "Biểu đồ tiến bộ điểm số theo thời gian": { vi: "Biểu đồ tiến bộ điểm số theo thời gian", en: "Score Progression Over Time", ja: "時系列スコア推移グラフ" },
  "Biểu đồ tiến bộ điểm số": { vi: "Biểu đồ tiến bộ điểm số", en: "Score progression chart", ja: "スコア推移グラフ" },
  "Chưa có bài nộp nào để vẽ biểu đồ tiến bộ.": { vi: "Chưa có bài nộp nào để vẽ biểu đồ tiến bộ.", en: "No submissions yet to display a progression chart.", ja: "グラフを表示するための提出データがまだありません。" },
  "Học sinh này chưa hoàn thành bài tập nào.": { vi: "Học sinh này chưa hoàn thành bài tập nào.", en: "This student has not completed any assignments yet.", ja: "この生徒はまだ課題を完了していません。" },
  "Bài tập": { vi: "Bài tập", en: "Assignment", ja: "課題" },
  "Thời gian nộp": { vi: "Thời gian nộp", en: "Submitted At", ja: "提出日時" },
  "Điểm": { vi: "Điểm", en: "Score", ja: "スコア" },
  "Thời lượng": { vi: "Thời lượng", en: "Duration", ja: "所要時間" },
  "Chuyển tab": { vi: "Chuyển tab", en: "Tab Switches", ja: "タブ切替" },
  "Chi tiết": { vi: "Chi tiết", en: "Details", ja: "詳細" },
  "Chỉnh sửa thông tin học sinh": { vi: "Chỉnh sửa thông tin học sinh", en: "Edit Student", ja: "生徒情報を編集" },
  "Thêm học sinh mới": { vi: "Thêm học sinh mới", en: "Add New Student", ja: "新しい生徒を追加" },
  "Lớp / Khối": { vi: "Lớp / Khối", en: "Class / Grade", ja: "クラス・学年" },
  "Trường học": { vi: "Trường học", en: "School", ja: "学校名" },
  "Số điện thoại / Mã HS (tùy chọn)": { vi: "Số điện thoại / Mã HS (tùy chọn)", en: "Phone / Student ID (optional)", ja: "電話番号・学籍番号（任意）" },
  "Mã PIN 4 số bảo mật": { vi: "Mã PIN 4 số bảo mật", en: "4-Digit Security PIN", ja: "4桁セキュリティPIN" },
  "Tạo ngẫu nhiên": { vi: "Tạo ngẫu nhiên", en: "Generate", ja: "自動生成" },
  "Lưu học sinh": { vi: "Lưu học sinh", en: "Save Student", ja: "生徒を保存" },
  "Vui lòng nhập họ và tên học sinh.": { vi: "Vui lòng nhập họ và tên học sinh.", en: "Please enter the student's full name.", ja: "生徒の氏名を入力してください。" },
  "Mã PIN phải gồm đúng 4 chữ số.": { vi: "Mã PIN phải gồm đúng 4 chữ số.", en: "PIN must be exactly 4 digits.", ja: "PINコードは4桁の数字で入力してください。" },
  "Đã cập nhật thông tin học sinh.": { vi: "Đã cập nhật thông tin học sinh.", en: "Student updated.", ja: "生徒情報を更新しました。" },
  "Đã thêm học sinh mới.": { vi: "Đã thêm học sinh mới.", en: "Student added.", ja: "新しい生徒を追加しました。" },
  "Xóa học sinh": { vi: "Xóa học sinh", en: "Delete Student", ja: "生徒を削除" },
  "Bạn có chắc muốn xóa học sinh này khỏi danh bạ?": { vi: "Bạn có chắc muốn xóa học sinh này khỏi danh bạ?", en: "Are you sure you want to remove this student from the directory?", ja: "この生徒を名簿から削除してもよろしいですか？" },
  "Đã xóa học sinh.": { vi: "Đã xóa học sinh.", en: "Student removed.", ja: "生徒を削除しました。" },
  "Nhập danh sách học sinh từ Excel / CSV": { vi: "Nhập danh sách học sinh từ Excel / CSV", en: "Bulk Import Students (Excel / CSV)", ja: "生徒名簿の一括インポート (Excel / CSV)" },
  "Các cột hỗ trợ:": { vi: "Các cột hỗ trợ:", en: "Supported columns:", ja: "対応カラム:" },
  "(tự động tạo PIN 4 số nếu để trống).": { vi: "(tự động tạo PIN 4 số nếu để trống).", en: "(auto-generates a 4-digit PIN if omitted).", ja: "（空欄の場合は4桁PINを自動生成します）。" },
  "Tải file mẫu (.csv)": { vi: "Tải file mẫu (.csv)", en: "Download Template (.csv)", ja: "テンプレート (.csv) をダウンロード" },
  "Xác nhận nhập": { vi: "Xác nhận nhập", en: "Confirm Import", ja: "インポートを確定" },
  "File không có dữ liệu học sinh hợp lệ.": { vi: "File không có dữ liệu học sinh hợp lệ.", en: "No valid student records found in this file.", ja: "有効な生徒データが見つかりませんでした。" },
  "Thư viện Excel chưa tải xong. Vui lòng dùng file .csv.": { vi: "Thư viện Excel chưa tải xong. Vui lòng dùng file .csv.", en: "Excel parser is still loading. Please use a .csv file.", ja: "Excel ライブラリを読み込み中です。.csv ファイルをご利用ください。" },
  "Quản lý Giao bài tập": { vi: "Quản lý Giao bài tập", en: "Assignment Management", ja: "課題管理" },
  "Giao đề cho lớp hoặc nhóm học sinh, cấu hình hạn nộp, số lần làm và tự động gửi báo cáo phụ huynh.": { vi: "Giao đề cho lớp hoặc nhóm học sinh, cấu hình hạn nộp, số lần làm và tự động gửi báo cáo phụ huynh.", en: "Assign quizzes to classes or students, configure deadlines, attempt limits, and automated parent reports.", ja: "クラスや生徒へ課題を配布し、締切・受験回数制限・保護者への自動レポート送信を設定します。" },
  "Mẫu nhận xét tự động": { vi: "Mẫu nhận xét tự động", en: "Feedback Templates", ja: "自動コメント設定" },
  "Tạo bài giao mới": { vi: "Tạo bài giao mới", en: "New Assignment", ja: "新規課題を作成" },
  "Giao bài tập đầu tiên": { vi: "Giao bài tập đầu tiên", en: "Create First Assignment", ja: "最初の課題を作成" },
  "Chưa có bài tập nào được giao. Hãy chọn một đề từ Thư viện và giao cho lớp học của bạn.": { vi: "Chưa có bài tập nào được giao. Hãy chọn một đề từ Thư viện và giao cho lớp học của bạn.", en: "No assignments yet. Pick a quiz from your library and assign it to your class.", ja: "まだ配布された課題がありません。ライブラリから問題を選んでクラスに配布しましょう。" },
  "Đang mở": { vi: "Đang mở", en: "Active", ja: "受付中" },
  "Sắp mở": { vi: "Sắp mở", en: "Upcoming", ja: "開始前" },
  "Đã đóng": { vi: "Đã đóng", en: "Closed", ja: "締切済み" },
  "Bài bổ trợ": { vi: "Bài bổ trợ", en: "Remedial", ja: "補習課題" },
  "Không giới hạn lượt": { vi: "Không giới hạn lượt", en: "Unlimited attempts", ja: "回数無制限" },
  "Email phụ huynh: Bật": { vi: "Email phụ huynh: Bật", en: "Parent email: On", ja: "保護者メール: オン" },
  "Email phụ huynh: Tắt": { vi: "Email phụ huynh: Tắt", en: "Parent email: Off", ja: "保護者メール: オフ" },
  "Sao chép link": { vi: "Sao chép link", en: "Copy Link", ja: "リンクをコピー" },
  "Vào làm thử": { vi: "Vào làm thử", en: "Student Preview", ja: "生徒画面で開く" },
  "Nhắc hạn nộp": { vi: "Nhắc hạn nộp", en: "Send Reminder", ja: "締切リマインド" },
  "Phiếu A4 + QR": { vi: "Phiếu A4 + QR", en: "A4 Worksheet + QR", ja: "A4プリント + QR" },
  "Sổ điểm": { vi: "Sổ điểm", en: "Gradebook", ja: "成績表" },
  "Hãy tạo ít nhất 1 bộ đề trong Thư viện trước khi giao bài.": { vi: "Hãy tạo ít nhất 1 bộ đề trong Thư viện trước khi giao bài.", en: "Please create at least 1 quiz in your Library before assigning.", ja: "課題を配布する前に、ライブラリで少なくとも1つの問題を作成してください。" },
  "Hãy thêm ít nhất 1 học sinh trong mục Học sinh & Lớp học trước khi giao bài.": { vi: "Hãy thêm ít nhất 1 học sinh trong mục Học sinh & Lớp học trước khi giao bài.", en: "Please add at least 1 student in Students & Classes before assigning.", ja: "課題を配布する前に、「生徒・クラス」で少なくとも1名の生徒を登録してください。" },
  "Giao bài tập bổ trợ (Remedial)": { vi: "Giao bài tập bổ trợ (Remedial)", en: "Assign Remedial Quiz", ja: "補習課題を配布" },
  "Chọn bộ đề": { vi: "Chọn bộ đề", en: "Select Quiz", ja: "問題を選択" },
  "Tiêu đề bài giao": { vi: "Tiêu đề bài giao", en: "Assignment Title", ja: "課題タイトル" },
  "Đối tượng giao bài": { vi: "Đối tượng giao bài", en: "Assign To", ja: "配布対象" },
  "Cả lớp học": { vi: "Cả lớp học", en: "Entire Class", ja: "クラス全体" },
  "Chọn từng học sinh": { vi: "Chọn từng học sinh", en: "Selected Students", ja: "個別に生徒を選択" },
  "Chọn lớp": { vi: "Chọn lớp", en: "Select Class", ja: "クラスを選択" },
  "Thời gian mở đề (tùy chọn)": { vi: "Thời gian mở đề (tùy chọn)", en: "Open Time (optional)", ja: "開始日時（任意）" },
  "Hạn nộp bài (bắt buộc)": { vi: "Hạn nộp bài (bắt buộc)", en: "Deadline (required)", ja: "提出期限（必須）" },
  "Số lần làm bài tối đa": { vi: "Số lần làm bài tối đa", en: "Attempt Limit", ja: "最大受験回数" },
  "Chỉ 1 lần duy nhất": { vi: "Chỉ 1 lần duy nhất", en: "1 attempt only", ja: "1回のみ" },
  "Tối đa 2 lần": { vi: "Tối đa 2 lần", en: "Up to 2 attempts", ja: "最大2回" },
  "Tối đa 3 lần": { vi: "Tối đa 3 lần", en: "Up to 3 attempts", ja: "最大3回" },
  "Không giới hạn trước hạn nộp": { vi: "Không giới hạn trước hạn nộp", en: "Unlimited before deadline", ja: "締切まで無制限" },
  "Quy tắc tính điểm": { vi: "Quy tắc tính điểm", en: "Scoring Policy", ja: "採点ルール" },
  "Lấy điểm cao nhất": { vi: "Lấy điểm cao nhất", en: "Keep highest score", ja: "最高点を採用" },
  "Lấy điểm lần đầu tiên": { vi: "Lấy điểm lần đầu tiên", en: "Keep first score", ja: "初回の点数を採用" },
  "Hiển thị đáp án sau khi nộp": { vi: "Hiển thị đáp án sau khi nộp", en: "Answer Reveal Policy", ja: "解答の公開タイミング" },
  "Hiển thị ngay sau khi nộp bài": { vi: "Hiển thị ngay sau khi nộp bài", en: "Reveal immediately after submission", ja: "提出直後に公開" },
  "Chỉ hiển thị sau khi hết hạn nộp của lớp": { vi: "Chỉ hiển thị sau khi hết hạn nộp của lớp", en: "Reveal only after the class deadline passes", ja: "クラスの締切後に公開" },
  "Thời gian làm bài (phút, 0 = không giới hạn)": { vi: "Thời gian làm bài (phút, 0 = không giới hạn)", en: "Time Limit (minutes, 0 = unlimited)", ja: "制限時間（分、0 = 無制限）" },
  "Ghi chú của giáo viên (hướng dẫn, công thức, link tài liệu)": { vi: "Ghi chú của giáo viên (hướng dẫn, công thức, link tài liệu)", en: "Teacher's Note (instructions, formulas, reference links)", ja: "先生からのメモ（注意事項・公式・参考リンクなど）" },
  "Đảo thứ tự câu hỏi riêng cho từng học sinh": { vi: "Đảo thứ tự câu hỏi riêng cho từng học sinh", en: "Shuffle questions per student", ja: "生徒ごとに問題順をシャッフル" },
  "Tự động gửi email báo cáo kết quả cho phụ huynh": { vi: "Tự động gửi email báo cáo kết quả cho phụ huynh", en: "Auto-email result report to parents upon submission", ja: "提出時に保護者へ成績レポートを自動送信" },
  "Tạo & Giao bài": { vi: "Tạo & Giao bài", en: "Create & Assign", ja: "作成して配布" },
  "Vui lòng chọn hạn nộp bài.": { vi: "Vui lòng chọn hạn nộp bài.", en: "Please set a deadline.", ja: "提出期限を設定してください。" },
  "Vui lòng chọn ít nhất 1 học sinh.": { vi: "Vui lòng chọn ít nhất 1 học sinh.", en: "Please select at least 1 student.", ja: "少なくとも1名の生徒を選択してください。" },
  "Xóa bài giao": { vi: "Xóa bài giao", en: "Delete Assignment", ja: "課題を削除" },
  "Bạn có chắc muốn xóa bài tập đã giao này?": { vi: "Bạn có chắc muốn xóa bài tập đã giao này?", en: "Are you sure you want to delete this assignment?", ja: "この課題を削除してもよろしいですか？" },
  "Đã xóa bài giao.": { vi: "Đã xóa bài giao.", en: "Assignment deleted.", ja: "課題を削除しました。" },
  "Mẫu nhận xét tự động theo mức điểm": { vi: "Mẫu nhận xét tự động theo mức điểm", en: "Score-Based Feedback Templates", ja: "スコア別自動コメントテンプレート" },
  "Nội dung nhận xét sẽ tự động chèn vào email gửi phụ huynh dựa trên điểm số của học sinh.": { vi: "Nội dung nhận xét sẽ tự động chèn vào email gửi phụ huynh dựa trên điểm số của học sinh.", en: "Feedback comments are automatically inserted into parent report emails based on each student's score.", ja: "生徒の点数に応じて、保護者向けレポートメールにコメントが自動挿入されます。" },
  "Lưu mẫu nhận xét": { vi: "Lưu mẫu nhận xét", en: "Save Templates", ja: "テンプレートを保存" },
  "Đã lưu mẫu nhận xét tự động.": { vi: "Đã lưu mẫu nhận xét tự động.", en: "Feedback templates saved.", ja: "自動コメントテンプレートを保存しました。" },
  "Tất cả học sinh đã hoàn thành bài tập này.": { vi: "Tất cả học sinh đã hoàn thành bài tập này.", en: "All assigned students have already submitted.", ja: "すべての生徒がすでに課題を提出済みです。" },
  "Học sinh đã làm đúng toàn bộ bài này, không cần bài bổ trợ.": { vi: "Học sinh đã làm đúng toàn bộ bài này, không cần bài bổ trợ.", en: "This student answered every question correctly — no remedial quiz needed.", ja: "全問正解のため、補習課題は必要ありません。" },
  "Đã xuất file bảng điểm thành công.": { vi: "Đã xuất file bảng điểm thành công.", en: "Gradebook exported successfully.", ja: "成績表をエクスポートしました。" },
  "Chưa có bài tập nào để xem sổ điểm và phân tích.": { vi: "Chưa có bài tập nào để xem sổ điểm và phân tích.", en: "No assignments yet to view gradebook and analytics.", ja: "成績表と分析を表示する課題がまだありません。" },
  "Sổ điểm & Phân tích Lớp học": { vi: "Sổ điểm & Phân tích Lớp học", en: "Class Gradebook & Analytics", ja: "クラス成績表・分析" },
  "Xuất Excel": { vi: "Xuất Excel", en: "Export Excel", ja: "Excel 出力" },
  "Xuất PDF tổng hợp": { vi: "Xuất PDF tổng hợp", en: "Export Summary PDF", ja: "サマリーPDF出力" },
  "Đã nộp bài": { vi: "Đã nộp bài", en: "Submitted", ja: "提出済み" },
  "Phụ huynh đã xem": { vi: "Phụ huynh đã xem", en: "Parents Confirmed", ja: "保護者確認済み" },
  "Câu cần giải đáp": { vi: "Câu cần giải đáp", en: "Flagged for Review", ja: "質問フラグ付き" },
  "Bảng điểm trực tiếp": { vi: "Bảng điểm trực tiếp", en: "Live Gradebook", ja: "リアルタイム成績表" },
  "Học sinh": { vi: "Học sinh", en: "Student", ja: "生徒" },
  "Phụ huynh xác nhận": { vi: "Phụ huynh xác nhận", en: "Parent Read Receipt", ja: "保護者確認" },
  "Chưa gửi": { vi: "Chưa gửi", en: "Not sent", ja: "未送信" },
  "Đang tắt": { vi: "Đang tắt", en: "Off", ja: "オフ" },
  "Thiếu email": { vi: "Thiếu email", en: "Missing email", ja: "メール未登録" },
  "Đã gửi": { vi: "Đã gửi", en: "Sent", ja: "送信済み" },
  "Đã xem": { vi: "Đã xem", en: "Confirmed", ja: "確認済み" },
  "Chờ xác nhận": { vi: "Chờ xác nhận", en: "Awaiting confirmation", ja: "確認待ち" },
  "Đã nộp": { vi: "Đã nộp", en: "Submitted", ja: "提出済み" },
  "Chưa nộp": { vi: "Chưa nộp", en: "Pending", ja: "未提出" },
  "Bật": { vi: "Bật", en: "On", ja: "オン" },
  "Tắt": { vi: "Tắt", en: "Off", ja: "オフ" },
  "Xem bài": { vi: "Xem bài", en: "Review", ja: "回答を見る" },
  "Top câu hỏi hay sai nhất": { vi: "Top câu hỏi hay sai nhất", en: "Most-Missed Questions", ja: "正答率が低い問題トップ" },
  "Chưa có dữ liệu câu sai cho bài tập này.": { vi: "Chưa có dữ liệu câu sai cho bài tập này.", en: "No missed-question analytics available yet.", ja: "この課題の誤答データはまだありません。" },
  "Câu học sinh đánh dấu \"Chưa hiểu câu này\"": { vi: "Câu học sinh đánh dấu \"Chưa hiểu câu này\"", en: "Questions Flagged \"Ask Teacher\"", ja: "生徒が「わからない」とマークした問題" },
  "Chưa có học sinh nào gửi yêu cầu giải đáp.": { vi: "Chưa có học sinh nào gửi yêu cầu giải đáp.", en: "No students have flagged any questions yet.", ja: "まだ質問フラグを付けた生徒はいません。" },
  "Bật/tắt gửi email cho học sinh này": { vi: "Bật/tắt gửi email cho học sinh này", en: "Toggle parent email for this student", ja: "この生徒の保護者メール送信を切替" },
  "Không tìm thấy bài tập": { vi: "Không tìm thấy bài tập", en: "Assignment Not Found", ja: "課題が見つかりません" },
  "Mã bài tập không tồn tại hoặc đã bị giáo viên xóa.": { vi: "Mã bài tập không tồn tại hoặc đã bị giáo viên xóa.", en: "This assignment code does not exist or was removed by the teacher.", ja: "この課題コードは存在しないか、先生によって削除されました。" },
  "Quay lại": { vi: "Quay lại", en: "Back", ja: "戻る" },
  "Quay lại Creator Studio": { vi: "Quay lại Creator Studio", en: "Back to Creator Studio", ja: "クリエイタースタジオに戻る" },
  "Ghi chú từ giáo viên": { vi: "Ghi chú từ giáo viên", en: "Teacher's Note", ja: "先生からのメモ" },
  "Xác thực học sinh": { vi: "Xác thực học sinh", en: "Student Verification", ja: "生徒認証" },
  "Chọn họ và tên của bạn": { vi: "Chọn họ và tên của bạn", en: "Select your name", ja: "氏名を選択してください" },
  "-- Chọn tên từ danh sách --": { vi: "-- Chọn tên từ danh sách --", en: "-- Choose your name --", ja: "-- リストから選択 --" },
  "Mã PIN 4 số": { vi: "Mã PIN 4 số", en: "4-Digit PIN", ja: "4桁のPINコード" },
  "Bắt đầu làm bài": { vi: "Bắt đầu làm bài", en: "Start Assignment", ja: "課題を開始" },
  "Vui lòng chọn tên của bạn trong danh sách.": { vi: "Vui lòng chọn tên của bạn trong danh sách.", en: "Please select your name from the roster.", ja: "名簿からあなたの氏名を選択してください。" },
  "Mã PIN 4 số không chính xác. Vui lòng thử lại.": { vi: "Mã PIN 4 số không chính xác. Vui lòng thử lại.", en: "Incorrect 4-digit PIN. Please try again.", ja: "4桁のPINコードが正しくありません。もう一度お試しください。" },
  "Bạn đã hết lượt làm bài cho bài tập này.": { vi: "Bạn đã hết lượt làm bài cho bài tập này.", en: "You have reached the maximum number of attempts for this assignment.", ja: "この課題の最大受験回数に達しました。" },
  "Đã khôi phục bài làm đang dang dở của bạn.": { vi: "Đã khôi phục bài làm đang dang dở của bạn.", en: "Restored your in-progress attempt.", ja: "途中の回答データを復元しました。" },
  "Nộp bài tập": { vi: "Nộp bài tập", en: "Submit Assignment", ja: "課題を提出" },
  "Bạn có chắc chắn muốn nộp bài ngay bây giờ?": { vi: "Bạn có chắc chắn muốn nộp bài ngay bây giờ?", en: "Are you sure you want to submit your answers now?", ja: "今すぐ回答を提出してもよろしいですか？" },
  "Câu trước": { vi: "Câu trước", en: "Previous", ja: "前の問題" },
  "Câu tiếp": { vi: "Câu tiếp", en: "Next", ja: "次の問題" },
  "Chuyển tab:": { vi: "Chuyển tab:", en: "Tab switches:", ja: "タブ切替:" },
  "Đã hết giờ! Bài làm của bạn đã được nộp tự động.": { vi: "Đã hết giờ! Bài làm của bạn đã được nộp tự động.", en: "Time is up! Your assignment was submitted automatically.", ja: "制限時間が終了しました。回答は自動的に提出されました。" },
  "Đã nộp bài thành công!": { vi: "Đã nộp bài thành công!", en: "Assignment submitted successfully!", ja: "課題を提出しました！" },
  "Hoàn thành bài tập": { vi: "Hoàn thành bài tập", en: "Assignment Completed", ja: "課題が完了しました" },
  "Xem sổ điểm": { vi: "Xem sổ điểm", en: "View Gradebook", ja: "成績表を見る" },
  "Điểm số": { vi: "Điểm số", en: "Score", ja: "スコア" },
  "Số câu đúng": { vi: "Số câu đúng", en: "Correct Answers", ja: "正解数" },
  "Xem lại chi tiết & Đánh dấu câu cần hỏi giáo viên": { vi: "Xem lại chi tiết & Đánh dấu câu cần hỏi giáo viên", en: "Detailed Review & Ask Teacher", ja: "詳細レビュー・先生に質問" },
  "Chưa hiểu câu này": { vi: "Chưa hiểu câu này", en: "Ask Teacher", ja: "わからない（先生に質問）" },
  "Đã đánh dấu hỏi giáo viên": { vi: "Đã đánh dấu hỏi giáo viên", en: "Flagged for Teacher", ja: "先生への質問を登録済み" },
  "Đã gửi đánh dấu \"Chưa hiểu câu này\" tới giáo viên.": { vi: "Đã gửi đánh dấu \"Chưa hiểu câu này\" tới giáo viên.", en: "Flagged this question for your teacher.", ja: "この問題に質問フラグを付けて先生へ送信しました。" },
  "· Đáp án đúng:": { vi: "· Đáp án đúng:", en: "· Correct answer:", ja: "・正解:" },
  "Không tìm thấy báo cáo kết quả": { vi: "Không tìm thấy báo cáo kết quả", en: "Result Report Not Found", ja: "成績レポートが見つかりません" },
  "Báo cáo Kết quả Học tập (Dành cho Phụ huynh)": { vi: "Báo cáo Kết quả Học tập (Dành cho Phụ huynh)", en: "Student Progress Report (For Parents)", ja: "学習成績レポート（保護者様向け）" },
  "Thời gian hoàn thành": { vi: "Thời gian hoàn thành", en: "Completion Time", ja: "所要時間" },
  "Ngày nộp": { vi: "Ngày nộp", en: "Submitted Date", ja: "提出日時" },
  "Nhận xét tự động từ giáo viên": { vi: "Nhận xét tự động từ giáo viên", en: "Teacher's Feedback", ja: "先生からのコメント" },
  "Xem chi tiết bài làm": { vi: "Xem chi tiết bài làm", en: "View Detailed Review", ja: "回答の詳細を見る" },
  "Xác nhận đã xem kết quả của con": { vi: "Xác nhận đã xem kết quả của con", en: "Confirm Result Viewed", ja: "お子様の成績を確認しました" },
  "Cảm ơn quý phụ huynh đã xác nhận xem kết quả!": { vi: "Cảm ơn quý phụ huynh đã xác nhận xem kết quả!", en: "Thank you for confirming you viewed the result!", ja: "成績のご確認ありがとうございます！" },
  "Báo cáo Bảng điểm": { vi: "Báo cáo Bảng điểm", en: "Gradebook Summary Report", ja: "成績表サマリーレポート" },
  "Mã bài": { vi: "Mã bài", en: "Code", ja: "コード" },
  "Hạn nộp": { vi: "Hạn nộp", en: "Deadline", ja: "提出期限" },
  "Quét làm bài online": { vi: "Quét làm bài online", en: "Scan to take online", ja: "スキャンしてオンライン受験" },
  "Bảng Đáp án": { vi: "Bảng Đáp án", en: "Answer Key", ja: "解答一覧" },
  "Nắm bài rất chắc, tư duy xuất sắc và cẩn thận. Tiếp tục phát huy!": { vi: "Nắm bài rất chắc, tư duy xuất sắc và cẩn thận. Tiếp tục phát huy!", en: "Excellent mastery and careful reasoning. Keep up the great work!", ja: "内容をしっかり理解しており、素晴らしい思考力と丁寧さです。この調子で頑張りましょう！" },
  "Hiểu bài tốt, còn một vài lỗi nhỏ cần lưu ý để đạt điểm tuyệt đối.": { vi: "Hiểu bài tốt, còn một vài lỗi nhỏ cần lưu ý để đạt điểm tuyệt đối.", en: "Strong understanding with just a few minor errors to review for a perfect score.", ja: "よく理解できています。満点を目指して細かなミスを復習しましょう。" },
  "Đạt mức trung bình khá. Cần ôn lại các câu làm sai để củng cố kiến thức.": { vi: "Đạt mức trung bình khá. Cần ôn lại các câu làm sai để củng cố kiến thức.", en: "Fair progress. Review missed questions to strengthen core concepts.", ja: "概ね理解できていますが、間違えた問題を復習して知識を定着させましょう。" },
  "Cần xem lại lý thuyết cơ bản và luyện tập thêm bài tập bổ trợ.": { vi: "Cần xem lại lý thuyết cơ bản và luyện tập thêm bài tập bổ trợ.", en: "Needs to review fundamental concepts and practice additional remedial exercises.", ja: "基礎理論を復習し、補習問題でさらに練習することをおすすめします。" }
};

const I18N_PATTERNS = [
  {
    re: /^Lịch sử bài làm\s*\((\d+)\)$/,
    en: (m) => "Submission History (" + m[1] + ")",
    ja: (m) => "提出履歴 (" + m[1] + ")"
  },
  {
    re: /^Giao bài bổ trợ\s*\((\d+)\)$/,
    en: (m) => "Assign Remedial (" + m[1] + ")",
    ja: (m) => "補習課題を作成 (" + m[1] + ")"
  },
  {
    re: /^Bổ trợ\s*\((\d+)\)$/,
    en: (m) => "Remedial (" + m[1] + ")",
    ja: (m) => "補習 (" + m[1] + ")"
  },
  {
    re: /^Lớp\s+(.+)$/,
    en: (m) => "Class " + m[1],
    ja: (m) => "クラス " + m[1]
  },
  {
    re: /^(\d+)\s+học sinh được chọn$/,
    en: (m) => m[1] + " selected students",
    ja: (m) => "選択された生徒 " + m[1] + "名"
  },
  {
    re: /^Hạn nộp:\s*(.+)$/,
    en: (m) => "Deadline: " + m[1],
    ja: (m) => "提出期限: " + m[1]
  },
  {
    re: /^(\d+)\s+lượt làm$/,
    en: (m) => m[1] + " attempt(s)",
    ja: (m) => "最大" + m[1] + "回"
  },
  {
    re: /^(\d+)\/(\d+)\s+đã nộp\s*\((\d+)%\)$/,
    en: (m) => m[1] + "/" + m[2] + " submitted (" + m[3] + "%)",
    ja: (m) => m[1] + "/" + m[2] + " 提出済み (" + m[3] + "%)"
  },
  {
    re: /^Sai\s+(\d+)%\s*\((\d+)\/(\d+)\)$/,
    en: (m) => m[1] + "% missed (" + m[2] + "/" + m[3] + ")",
    ja: (m) => "誤答率 " + m[1] + "% (" + m[2] + "/" + m[3] + ")"
  },
  {
    re: /^(\d+)\s+học sinh hỏi$/,
    en: (m) => m[1] + " student(s) asked",
    ja: (m) => m[1] + "名が質問"
  },
  {
    re: /^Mức điểm\s+([0-9.]+)\s*–\s*([0-9.]+)$/,
    en: (m) => "Score range " + m[1] + " – " + m[2],
    ja: (m) => "スコア帯 " + m[1] + " – " + m[2]
  },
  {
    re: /^Đã đọc được\s+(\d+)\s+học sinh hợp lệ\.$/,
    en: (m) => "Parsed " + m[1] + " valid student(s).",
    ja: (m) => m[1] + "名の有効な生徒データを読み込みました。"
  },
  {
    re: /^Đã nhập\s+(\d+)\s+học sinh vào danh bạ\.$/,
    en: (m) => "Imported " + m[1] + " student(s) into the directory.",
    ja: (m) => m[1] + "名の生徒を名簿にインポートしました。"
  },
  {
    re: /^Đã tạo bài giao thành công! Mã bài:\s*(.+)$/,
    en: (m) => "Assignment created! Code: " + m[1],
    ja: (m) => "課題を作成しました！コード: " + m[1]
  },
  {
    re: /^Đã gửi\s+(\d+)\s+email nhắc hạn nộp(?:\s*\(bỏ qua\s+(\d+)\s+học sinh thiếu email\))?\.$/,
    en: (m) => "Sent " + m[1] + " deadline reminder email(s)" + (m[2] ? " (skipped " + m[2] + " without email)" : "") + ".",
    ja: (m) => "締切リマインドメールを" + m[1] + "件送信しました" + (m[2] ? "（メール未登録 " + m[2] + "名をスキップ）" : "") + "。"
  },
  {
    re: /^Bài tập sẽ mở vào lúc\s+(.+)\.$/,
    en: (m) => "This assignment will open at " + m[1] + ".",
    ja: (m) => "この課題は " + m[1] + " に開始されます。"
  },
  {
    re: /^Đã chọn\s+(\d+)\/(\d+)$/,
    en: (m) => "Answered " + m[1] + "/" + m[2],
    ja: (m) => "回答済み " + m[1] + "/" + m[2]
  },
  {
    re: /^Câu\s+(\d+)\s*\/\s*(\d+)$/,
    en: (m) => "Question " + m[1] + " / " + m[2],
    ja: (m) => "問題 " + m[1] + " / " + m[2]
  },
  {
    re: /^Câu\s+(\d+)\s*·\s*(Đúng|Sai)$/,
    en: (m) => "Question " + m[1] + " · " + (m[2] === "Đúng" ? "Correct" : "Incorrect"),
    ja: (m) => "問題 " + m[1] + " ・ " + (m[2] === "Đúng" ? "正解" : "不正解")
  },
  {
    re: /^Hệ thống ghi nhận bạn vừa rời khỏi màn hình làm bài\s*\((\d+)\s*lần\)\.$/,
    en: (m) => "Tab switch detected (" + m[1] + " time(s)). Please stay on the exam screen.",
    ja: (m) => "画面の切り替えを検知しました（" + m[1] + "回目）。試験画面に留まってください。"
  },
  {
    re: /^Đáp án chi tiết sẽ được mở khóa sau khi hết hạn nộp bài của lớp\s*\((.+)\)\.$/,
    en: (m) => "Detailed answers will unlock after the class deadline (" + m[1] + ").",
    ja: (m) => "詳しい解答と解説はクラスの提出期限（" + m[1] + "）後に公開されます。"
  },
  {
    re: /^Đã xác nhận xem kết quả\s*\((.+)\)$/,
    en: (m) => "Confirmed result viewed (" + m[1] + ")",
    ja: (m) => "結果を確認済み (" + m[1] + ")"
  },
  {
    re: /^(✓\s*)?Phiên\s+(\d+)\/(\d+)\s*\(Câu\s+(\d+)[–-](\d+)\s*[·•]\s*(\d+)\s*câu\)$/,
    en: (m) => (m[1] ? "✓ " : "") + "Session " + m[2] + "/" + m[3] + " (Q" + m[4] + "–" + m[5] + " · " + m[6] + " questions)",
    ja: (m) => (m[1] ? "✓ " : "") + "セッション " + m[2] + "/" + m[3] + " (" + m[4] + "〜" + m[5] + "問・" + m[6] + "問)"
  },
  {
    re: /^Bắt đầu Phiên\s+(\d+)\/(\d+)\s*\((\d+)\s*câu\)$/,
    en: (m) => "Start Session " + m[1] + "/" + m[2] + " (" + m[3] + " questions)",
    ja: (m) => "セッション " + m[1] + "/" + m[2] + " を開始 (" + m[3] + "問)"
  },
  {
    re: /^Bắt đầu\s*\((\d+)\s*câu ngẫu nhiên\)$/,
    en: (m) => "Start (" + m[1] + " random questions)",
    ja: (m) => "開始（ランダム" + m[1] + "問）"
  },
  {
    re: /^Bắt đầu toàn bộ\s*\((\d+)\s*câu\)$/,
    en: (m) => "Start Full Quiz (" + m[1] + " questions)",
    ja: (m) => "全問を開始 (" + m[1] + "問)"
  },
  {
    re: /^(\d+)\s+đang bật$/,
    en: (m) => m[1] + " active",
    ja: (m) => m[1] + "件有効"
  },
  {
    re: /^Chọn ngẫu nhiên\s+(\d+)\s+trong tổng số\s+(\d+)\s+câu hỏi\.$/,
    en: (m) => "Randomly selects " + m[1] + " out of " + m[2] + " questions.",
    ja: (m) => "全" + m[2] + "問からランダムに" + m[1] + "問を出題します。"
  },
  {
    re: /^Làm toàn bộ\s+(\d+)\s+câu hỏi trong một phiên duy nhất\.$/,
    en: (m) => "Includes all " + m[1] + " questions in a single session.",
    ja: (m) => "全" + m[1] + "問を1つのセッションで実施します。"
  },
  {
    re: /^Xin chào,\s*(.+?)\s*👋$/,
    en: (m) => "Hello, " + m[1] + " 👋",
    ja: (m) => "こんにちは、" + m[1] + " 👋"
  },
  {
    re: /^MSSV:\s*(.+)$/,
    en: (m) => "Student ID: " + m[1],
    ja: (m) => "学籍番号: " + m[1]
  },
  {
    re: /^MSSV\s+(.+)$/,
    en: (m) => "ID " + m[1],
    ja: (m) => "学籍番号 " + m[1]
  },
  {
    re: /^Lớp\/Khoa:\s*(.+)$/,
    en: (m) => "Class/Faculty: " + m[1],
    ja: (m) => "クラス/学部: " + m[1]
  },
  {
    re: /^(\d+)\s+câu hỏi$/,
    en: (m) => m[1] + " questions",
    ja: (m) => m[1] + " 問"
  },
  {
    re: /^(\d+)\s+câu$/,
    en: (m) => m[1] + " Qs",
    ja: (m) => m[1] + " 問"
  },
  {
    re: /^(\d+)\s+giây$/,
    en: (m) => m[1] + " sec",
    ja: (m) => m[1] + " 秒"
  },
  {
    re: /^(\d+)\s+phút$/,
    en: (m) => m[1] + " min",
    ja: (m) => m[1] + " 分"
  },
  {
    re: /^(\d+)\s+điểm$/,
    en: (m) => m[1] + " pts",
    ja: (m) => m[1] + " 点"
  },
  {
    re: /^(\d+)\s+câu\/phiên$/,
    en: (m) => m[1] + " Qs/session",
    ja: (m) => m[1] + " 問/回"
  },
  {
    re: /^(\d+)\s+câu cần ôn lại$/,
    en: (m) => m[1] + " questions to review",
    ja: (m) => "復習対象 " + m[1] + " 問"
  },
  {
    re: /^(\d+)\s+tệp đang chờ xử lý$/,
    en: (m) => m[1] + " file(s) queued",
    ja: (m) => m[1] + " ファイル待機中"
  },
  {
    re: /^Tiến độ\s+(\d+)%$/,
    en: (m) => "Progress " + m[1] + "%",
    ja: (m) => "進捗 " + m[1] + "%"
  },
  {
    re: /^Tổng:\s*(\d+)$/,
    en: (m) => "Total: " + m[1],
    ja: (m) => "合計: " + m[1]
  },
  {
    re: /^Hợp lệ:\s*(\d+)$/,
    en: (m) => "Valid: " + m[1],
    ja: (m) => "有効: " + m[1]
  },
  {
    re: /^Lỗi:\s*(\d+)$/,
    en: (m) => "Errors: " + m[1],
    ja: (m) => "エラー: " + m[1]
  },
  {
    re: /^Thiếu Đ\/A \/ Lỗi:\s*(\d+)$/,
    en: (m) => "Missing Key / Errors: " + m[1],
    ja: (m) => "解答なし / エラー: " + m[1]
  },
  {
    re: /^✓ Đã kiểm tra:\s*(\d+)\/(\d+)$/,
    en: (m) => "✓ Verified: " + m[1] + "/" + m[2],
    ja: (m) => "✓ 承認済: " + m[1] + "/" + m[2]
  },
  {
    re: /^⚠️ Nghi ngờ sai:\s*(\d+)$/,
    en: (m) => "⚠️ Suspect: " + m[1],
    ja: (m) => "⚠️ 要確認: " + m[1]
  },
  {
    re: /^Tất cả\s*\((\d+)\)$/,
    en: (m) => "All (" + m[1] + ")",
    ja: (m) => "すべて (" + m[1] + ")"
  },
  {
    re: /^Chưa duyệt\s*\((\d+)\)$/,
    en: (m) => "Unverified (" + m[1] + ")",
    ja: (m) => "未承認 (" + m[1] + ")"
  },
  {
    re: /^⚠️ Cảnh báo nghi ngờ sai\s*\((\d+)\)$/,
    en: (m) => "⚠️ Suspect Answers (" + m[1] + ")",
    ja: (m) => "⚠️ 要確認の解答 (" + m[1] + ")"
  },
  {
    re: /^Thiếu đáp án\s*\((\d+)\)$/,
    en: (m) => "Missing Answers (" + m[1] + ")",
    ja: (m) => "解答なし (" + m[1] + ")"
  },
  {
    re: /^🤖 AI giải câu thiếu Đ\/A\s*\((\d+)\)$/,
    en: (m) => "🤖 AI Solve Missing (" + m[1] + ")",
    ja: (m) => "🤖 AI 未解答を解く (" + m[1] + ")"
  },
  {
    re: /^⚡ Nhập thẳng vào Kho đề\s*\((\d+)\s*câu hợp lệ\)$/,
    en: (m) => "⚡ 1-Click Import to Decks (" + m[1] + " valid)",
    ja: (m) => "⚡ 問題集へワンクリック登録 (" + m[1] + " 問)"
  },
  {
    re: /^Gộp vào:\s*(.+?)\s*\((\d+)\s*câu\)$/,
    en: (m) => "Merge into: " + m[1] + " (" + m[2] + " Qs)",
    ja: (m) => "統合先: " + m[1] + " (" + m[2] + " 問)"
  },
  {
    re: /^Bộ đề\s+([0-9\-]+)$/,
    en: (m) => "Deck " + m[1],
    ja: (m) => "問題集 " + m[1]
  },
  {
    re: /^Bộ đề AI変換\s+([0-9\-]+)$/,
    en: (m) => "AI Converter Deck " + m[1],
    ja: (m) => "AI変換 問題集 " + m[1]
  },
  {
    re: /^Trang\s+(\d+)\/(\d+)$/,
    en: (m) => "Page " + m[1] + "/" + m[2],
    ja: (m) => "ページ " + m[1] + "/" + m[2]
  },
  {
    re: /^Câu hỏi:\s*(.+)$/,
    en: (m) => "Question: " + m[1],
    ja: (m) => "問題: " + m[1]
  },
  {
    re: /^Câu\s*#(\d+)(.*)$/,
    en: (m) => "Question #" + m[1] + m[2],
    ja: (m) => "問題 #" + m[1] + m[2]
  },
  {
    re: /^Câu\s+(\d+)(\s*\(đã cắm cờ\))?$/,
    en: (m) => "Question " + m[1] + (m[2] ? " (flagged)" : ""),
    ja: (m) => "問題 " + m[1] + (m[2] ? " (フラグ付き)" : "")
  },
  {
    re: /^Câu\s+(\d+)\.$/,
    en: (m) => "Q" + m[1] + ".",
    ja: (m) => "問" + m[1] + "."
  },
  {
    re: /^Chỉnh sửa câu\s*#(\d+)$/,
    en: (m) => "Edit Question #" + m[1],
    ja: (m) => "問題 #" + m[1] + " を編集"
  },
  {
    re: /^Thời gian câu\s+(\d+)$/,
    en: (m) => "Time for Question " + m[1],
    ja: (m) => "問題 " + m[1] + " の制限時間"
  },
  {
    re: /^Phương án\s+([A-E])(\s*\(tùy chọn\))?$/,
    en: (m) => "Option " + m[1] + (m[2] ? " (optional)" : ""),
    ja: (m) => "選択肢 " + m[1] + (m[2] ? " (任意)" : "")
  },
  {
    re: /^Duyệt thanh toán\s*\((\d+)\)$/,
    en: (m) => "Payment Approvals (" + m[1] + ")",
    ja: (m) => "支払い承認 (" + m[1] + ")"
  },
  {
    re: /^Danh sách Quiz đã tạo\s*\((\d+)\)$/,
    en: (m) => "Created Quizzes (" + m[1] + ")",
    ja: (m) => "作成済みクイズ一覧 (" + m[1] + ")"
  },
  {
    re: /^Danh sách tài khoản đã được Admin gán Gemini API\s*\((\d+)\)$/,
    en: (m) => "Accounts with Admin-Assigned Gemini API (" + m[1] + ")",
    ja: (m) => "管理者が Gemini API を割り当てたアカウント (" + m[1] + ")"
  },
  {
    re: /^🔑 Đã được Admin gán API\s*\((.+)\)$/,
    en: (m) => "🔑 Admin-Assigned API (" + m[1] + ")",
    ja: (m) => "🔑 管理者割当済 API (" + m[1] + ")"
  },
  {
    re: /^Đang dùng API Key do Quản trị viên gán cho\s*(.+?)\s*\(hoặc dán Key riêng để ghi đè\)$/,
    en: (m) => "Using Admin-assigned API Key for " + m[1] + " (or paste personal key to override)",
    ja: (m) => m[1] + " 宛の管理者割当 API Key を使用中（または個人キーで上書き）"
  },
  {
    re: /^Chọn gói\s+(.+)$/,
    en: (m) => "Choose " + m[1],
    ja: (m) => m[1] + " を選択"
  },
  {
    re: /^Thanh toán\s*–\s*(.+)$/,
    en: (m) => "Checkout – " + m[1],
    ja: (m) => "お支払い – " + m[1]
  },
  {
    re: /^(.+?)\s*\(365 ngày sau khi duyệt\)$/,
    en: (m) => m[1] + " (365 days upon approval)",
    ja: (m) => m[1] + " (承認後365日間)"
  },
  {
    re: /^([•·]\s*)?Hết hạn:\s*(.+)$/,
    en: (m) => (m[1] || "") + "Expires: " + m[2],
    ja: (m) => (m[1] || "") + "有効期限: " + m[2]
  },
  {
    re: /^Cập nhật:\s*(.+)$/,
    en: (m) => "Updated: " + m[1],
    ja: (m) => "更新: " + m[1]
  },
  {
    re: /^Duyệt:\s*(.+)$/,
    en: (m) => "Approved: " + m[1],
    ja: (m) => "承認: " + m[1]
  },
  {
    re: /^Đã duyệt lúc\s+(.+)$/,
    en: (m) => "Approved at " + m[1],
    ja: (m) => m[1] + " に承認済"
  },
  {
    re: /^Lý do:\s*(.+)$/,
    en: (m) => "Reason: " + m[1],
    ja: (m) => "理由: " + m[1]
  },
  {
    re: /^Đang chờ duyệt gói\s+(.+?)\s*\((.+?)\)\s*•\s*Gửi lúc\s+(.+)$/,
    en: (m) => "Pending " + m[1] + " (" + m[2] + ") • Sent " + m[3],
    ja: (m) => m[1] + " (" + m[2] + ") 承認待ち • 送信: " + m[3]
  },
  {
    re: /^⏳ Đang chờ Quản trị viên xác nhận yêu cầu nâng cấp gói\s*(.*)$/,
    en: (m) => "⏳ Awaiting Administrator confirmation for plan upgrade " + m[1],
    ja: (m) => "⏳ プランアップグレードの管理者承認待ち " + m[1]
  },
  {
    re: /^1 phiên duy nhất\s*\((\d+)\s*câu\)\.?$/,
    en: (m) => "Single session (" + m[1] + " Qs).",
    ja: (m) => "全1セッション (" + m[1] + " 問)。"
  },
  {
    re: /^Tự động chia thành\s*(\d+)\s*phiên\s*×\s*(\d+)\s*câu\.?$/,
    en: (m) => "Auto-split into " + m[1] + " sessions × " + m[2] + " Qs.",
    ja: (m) => "自動的に " + m[1] + " セッション × " + m[2] + " 問に分割。"
  },
  {
    re: /^Tự động chia thành\s*(\d+)\s*phiên:\s*(\d+)\s*phiên\s*×\s*(\d+)\s*câu\s*\+\s*1 phiên cuối\s*×\s*(\d+)\s*câu\.?$/,
    en: (m) => "Auto-split into " + m[1] + " sessions: " + m[2] + " × " + m[3] + " Qs + 1 final session × " + m[4] + " Qs.",
    ja: (m) => "全 " + m[1] + " セッションに分割: " + m[2] + " 回 × " + m[3] + " 問 + 最終回 " + m[4] + " 問。"
  },
  {
    re: /^([✓○]\s*)?Phiên\s+(\d+)\s*\(Câu\s+([0-9–\-]+)\s*•\s*(\d+)\s*câu\)$/,
    en: (m) => (m[1] || "") + "Session " + m[2] + " (Q" + m[3] + " • " + m[4] + " Qs)",
    ja: (m) => (m[1] || "") + "セッション " + m[2] + " (問" + m[3] + " • " + m[4] + " 問)"
  },
  {
    re: /^Phiên\s+(\d+)\/(\d+)\s*\(Câu\s+([0-9–\-]+)\)$/,
    en: (m) => "Session " + m[1] + "/" + m[2] + " (Q" + m[3] + ")",
    ja: (m) => "セッション " + m[1] + "/" + m[2] + " (問" + m[3] + ")"
  },
  {
    re: /^Phiên\s+(\d+)$/,
    en: (m) => "Session " + m[1],
    ja: (m) => "セッション " + m[1]
  },
  {
    re: /^–\s*Phiên\s+(\d+)$/,
    en: (m) => "– Session " + m[1],
    ja: (m) => "– セッション " + m[1]
  },
  {
    re: /^Câu\s+([0-9–\-]+)\s*\((\d+)\s*câu\)$/,
    en: (m) => "Q" + m[1] + " (" + m[2] + " Qs)",
    ja: (m) => "問" + m[1] + " (" + m[2] + " 問)"
  },
  {
    re: /^🚀 Bắt đầu Phiên\s+(\d+)\s*\((\d+)\s*câu\)$/,
    en: (m) => "🚀 Start Session " + m[1] + " (" + m[2] + " Qs)",
    ja: (m) => "🚀 セッション " + m[1] + " を開始 (" + m[2] + " 問)"
  },
  {
    re: /^🚀 Bắt đầu\s*\((\d+)\s*câu ngẫu nhiên\)$/,
    en: (m) => "🚀 Start (" + m[1] + " random Qs)",
    ja: (m) => "🚀 開始 (ランダム " + m[1] + " 問)"
  },
  {
    re: /^🚀 Bắt đầu toàn bộ\s*\((\d+)\s*câu\)$/,
    en: (m) => "🚀 Start All (" + m[1] + " Qs)",
    ja: (m) => "🚀 全問開始 (" + m[1] + " 問)"
  },
  {
    re: /^Làm toàn bộ\s*\((\d+)\s*câu\)$/,
    en: (m) => "All Questions (" + m[1] + " Qs)",
    ja: (m) => "全問演習 (" + m[1] + " 問)"
  },
  {
    re: /^Số câu ngẫu nhiên\s*\(1–(\d+)\)$/,
    en: (m) => "Number of random questions (1–" + m[1] + ")",
    ja: (m) => "ランダム出題数 (1–" + m[1] + ")"
  },
  {
    re: /^Chọn một đáp án\s*\(phím tắt 1–(\d+)\)$/,
    en: (m) => "Select one option (shortcut 1–" + m[1] + ")",
    ja: (m) => "1つ選択 (ショートカット 1–" + m[1] + ")"
  },
  {
    re: /^🏆 Tổng kết Quiz\s*–\s*(.+)$/,
    en: (m) => "🏆 Quiz Summary – " + m[1],
    ja: (m) => "🏆 クイズ結果 – " + m[1]
  },
  {
    re: /^▶ Làm tiếp Phiên\s+(\d+)\s*\((\d+)\s*câu\)$/,
    en: (m) => "▶ Continue Session " + m[1] + " (" + m[2] + " Qs)",
    ja: (m) => "▶ 次のセッション " + m[1] + " へ (" + m[2] + " 問)"
  },
  {
    re: /^🔁 Làm lại các câu sai\s*\((\d+)\)$/,
    en: (m) => "🔁 Retry Wrong Questions (" + m[1] + ")",
    ja: (m) => "🔁 間違えた問題を再挑戦 (" + m[1] + ")"
  },
  {
    re: /^🔥 Câu hỏi cứu vớt \(Redemption\)! Làm lại\s+(\d+)\s+câu sai để gỡ điểm!$/,
    en: (m) => "🔥 Redemption Round! Retry " + m[1] + " missed question(s) to recover points!",
    ja: (m) => "🔥 敗者復活ラウンド！間違えた " + m[1] + " 問に再挑戦してスコアを挽回！"
  },
  {
    re: /^Hiện có\s+(\d+)\s+bộ đề trong Kho đề$/,
    en: (m) => m[1] + " deck(s) available in your library",
    ja: (m) => "問題集に現在 " + m[1] + " セットあります"
  },
  {
    re: /^Hiện có\s+(\d+)\s+câu hợp lệ trong AI変換$/,
    en: (m) => m[1] + " valid question(s) in AI Converter",
    ja: (m) => "AI変換 に有効な問題が " + m[1] + " 問あります"
  },
  {
    re: /^Lấy từ AI変換\s*\((\d+)\)$/,
    en: (m) => "Load from AI Converter (" + m[1] + ")",
    ja: (m) => "AI変換 から取得 (" + m[1] + ")"
  },
  {
    re: /^Tổng cộng\s+(\d+)\s+câu hỏi$/,
    en: (m) => "Total " + m[1] + " questions",
    ja: (m) => "合計 " + m[1] + " 問"
  },
  {
    re: /^Dữ liệu hiện có:\s*(\d+)\s*bộ đề\s*·\s*(\d+)\s*câu sai\s*·\s*(\d+)\s*lịch sử thi\.$/,
    en: (m) => "Current data: " + m[1] + " decks · " + m[2] + " mistakes · " + m[3] + " exam records.",
    ja: (m) => "現在のデータ: 問題集 " + m[1] + " · 間違いノート " + m[2] + " · 試験履歴 " + m[3] + "。"
  },
  {
    re: /^1\. Google Drive cá nhân\s*\(📁\s*(.+)\)$/,
    en: (m) => "1. Personal Google Drive (📁 " + m[1] + ")",
    ja: (m) => "1. 個人 Google Drive (📁 " + m[1] + ")"
  },
  {
    re: /^Lần sao lưu gần nhất:\s*(.+)$/,
    en: (m) => "Last backup: " + m[1],
    ja: (m) => "最終バックアップ: " + m[1]
  },
  {
    re: /^🔗 Chia sẻ bộ đề:\s*(.+)$/,
    en: (m) => "🔗 Share Deck: " + m[1],
    ja: (m) => "🔗 問題集を共有: " + m[1]
  },
  {
    re: /^Bộ đề gồm\s+(\d+)\s+câu hỏi$/,
    en: (m) => "Deck contains " + m[1] + " questions",
    ja: (m) => "全 " + m[1] + " 問の問題集"
  },
  {
    re: /^Người dùng:\s*(.+?)\s*•\s*Gói\s+(.+?)\s*\((.+)\)$/,
    en: (m) => "User: " + m[1] + " • Plan " + m[2] + " (" + m[3] + ")",
    ja: (m) => "ユーザー: " + m[1] + " • プラン " + m[2] + " (" + m[3] + ")"
  },
  {
    re: /^Biên lai\s*–\s*(.+)$/,
    en: (m) => "Receipt – " + m[1],
    ja: (m) => "振込明細 – " + m[1]
  },
  {
    re: /^Xác nhận duyệt đơn\s+(.+?)\s+và kích hoạt gói\s+(.+?)\s+\(\+365 ngày\) cho\s+(.+)\?$/,
    en: (m) => "Approve payment of " + m[1] + " and activate " + m[2] + " (+365 days) for " + m[3] + "?",
    ja: (m) => m[3] + " の支払い (" + m[1] + ") を承認し、" + m[2] + " (+365日) を有効化しますか？"
  },
  {
    re: /^Đã duyệt đơn và kích hoạt gói\s+(.+?)\s+\(365 ngày\) cho\s+(.+)\.$/,
    en: (m) => "Approved request and activated " + m[1] + " (365 days) for " + m[2] + ".",
    ja: (m) => "リクエストを承認し、" + m[2] + " に " + m[1] + " (365日間) を有効化しました。"
  },
  {
    re: /^Đã từ chối yêu cầu của\s+(.+)\.$/,
    en: (m) => "Rejected request from " + m[1] + ".",
    ja: (m) => m[1] + " のリクエストを却下しました。"
  },
  {
    re: /^Đã cấp gói\s+(.+?)\s+cho\s+(.+)\.$/,
    en: (m) => "Granted " + m[1] + " plan to " + m[2] + ".",
    ja: (m) => m[2] + " に " + m[1] + " プランを付与しました。"
  },
  {
    re: /^Bạn có chắc muốn thu hồi gói của\s+(.+)\?$/,
    en: (m) => "Are you sure you want to revoke the plan of " + m[1] + "?",
    ja: (m) => m[1] + " のプランを取り消してもよろしいですか？"
  },
  {
    re: /^Đã thu hồi gói của\s+(.+)\.$/,
    en: (m) => "Revoked plan of " + m[1] + ".",
    ja: (m) => m[1] + " のプランを取り消しました。"
  },
  {
    re: /^Đã thêm mã giảm giá\s+(.+)\.$/,
    en: (m) => "Added discount code " + m[1] + ".",
    ja: (m) => "割引コード " + m[1] + " を追加しました。"
  },
  {
    re: /^Đã chọn email\s+(.+?)\s+để gán Gemini API Key\.$/,
    en: (m) => "Selected " + m[1] + " to assign Gemini API Key.",
    ja: (m) => "Gemini API Key 割当対象として " + m[1] + " を選択しました。"
  },
  {
    re: /^Đã gán Google Gemini API Key cho tài khoản\s+(.+?)\s+thành công!$/,
    en: (m) => "Assigned Google Gemini API Key to " + m[1] + " successfully!",
    ja: (m) => m[1] + " に Google Gemini API Key を割り当てました！"
  },
  {
    re: /^Bạn có chắc muốn thu hồi Gemini API Key đã gán cho\s+(.+)\?$/,
    en: (m) => "Are you sure you want to revoke the Gemini API Key assigned to " + m[1] + "?",
    ja: (m) => m[1] + " に割り当てた Gemini API Key を取り消しますか？"
  },
  {
    re: /^Đã thu hồi Gemini API Key của\s+(.+)\.$/,
    en: (m) => "Revoked Gemini API Key of " + m[1] + ".",
    ja: (m) => m[1] + " の Gemini API Key を取り消しました。"
  },
  {
    re: /^Áp dụng thành công: giảm\s+(\d+)%\.$/,
    en: (m) => "Discount code applied: -" + m[1] + "%.",
    ja: (m) => "割引コードを適用しました: -" + m[1] + "%。"
  },
  {
    re: /^Đã sao chép\s+(.+)\.$/,
    en: (m) => "Copied " + m[1] + ".",
    ja: (m) => m[1] + " をコピーしました。"
  },
  {
    re: /^Tính năng "(.+?)" yêu cầu gói\s+(.+?)\s+trở lên\.$/,
    en: (m) => "Feature \"" + m[1] + "\" requires the " + m[2] + " plan or higher.",
    ja: (m) => "機能「" + m[1] + "」には " + m[2] + " プラン以上が必要です。"
  },
  {
    re: /^Lỗi máy chủ:\s*(.+)$/,
    en: (m) => "Server error: " + m[1],
    ja: (m) => "サーバーエラー: " + m[1]
  },
  {
    re: /^Không thể gửi yêu cầu:\s*(.+)$/,
    en: (m) => "Could not send request: " + m[1],
    ja: (m) => "リクエストを送信できませんでした: " + m[1]
  },
  {
    re: /^Yêu cầu thanh toán gói\s+(.+?)\s+đã được ghi nhận.+$/,
    en: (m) => "Your payment request for " + m[1] + " has been submitted and is awaiting Administrator approval.",
    ja: (m) => m[1] + " プランの支払いリクエストを受け付けました。管理者の承認後に有効化されます。"
  },
  {
    re: /^Bạn đã có (?:yêu cầu|một đơn) đang chờ duyệt cho gói\s+(.+?)\..*$/,
    en: (m) => "You already have a pending request for the " + m[1] + " plan.",
    ja: (m) => m[1] + " プランの承認待ちリクエストが既にあります。"
  },
  {
    re: /^Đã kích hoạt trực tiếp gói\s+(.+?)\s+cho tài khoản Admin.*$/,
    en: (m) => "Directly activated " + m[1] + " plan for Admin account.",
    ja: (m) => "管理者アカウントで " + m[1] + " プランを直接有効化しました。"
  },
  {
    re: /^Hiện còn\s+(\d+)\/(\d+)\s+câu chưa được đánh dấu ✓ Đã duyệt\. Bạn vẫn muốn tiếp tục\?$/,
    en: (m) => m[1] + "/" + m[2] + " questions are not marked ✓ Verified yet. Continue anyway?",
    ja: (m) => m[1] + "/" + m[2] + " 問がまだ「✓ 承認済」になっていません。続行しますか？"
  },
  {
    re: /^Đã xuất\s+(\d+)\s+file\s+(.+?)\s+chuẩn AI Tutor!$/,
    en: (m) => "Exported " + m[1] + " standard AI Tutor " + m[2] + " file(s)!",
    ja: (m) => "AI Tutor 標準 " + m[2] + " ファイルを " + m[1] + " 件エクスポートしました！"
  },
  {
    re: /^Hoàn tất! Đã xử lý\s+(\d+)\s+câu hỏi(.*)$/,
    en: (m) => "Complete! Processed " + m[1] + " questions.",
    ja: (m) => "完了！" + m[1] + " 問を処理しました。"
  },
  {
    re: /^Đã thêm\s+(\d+)\s+tệp.*$/,
    en: (m) => "Added " + m[1] + " file(s) to the smart processing queue.",
    ja: (m) => m[1] + " 件のファイルをスマート処理キューに追加しました。"
  },
  {
    re: /^Đã lưu Quiz "(.+?)" vào クリエイタースタジオ!$/,
    en: (m) => "Saved Quiz \"" + m[1] + "\" to Creator Studio!",
    ja: (m) => "クイズ「" + m[1] + "」を クリエイタースタジオ に保存しました！"
  },
  {
    re: /^Đã nhập\s+(\d+)\s+câu hỏi vào Kho đề thành công!$/,
    en: (m) => "Imported " + m[1] + " questions into your Decks!",
    ja: (m) => m[1] + " 問を問題集にインポートしました！"
  },
  {
    re: /^Bạn có chắc muốn xóa bộ đề "(.+?)"\? Hành động này không thể hoàn tác\.$/,
    en: (m) => "Are you sure you want to delete deck \"" + m[1] + "\"? This cannot be undone.",
    ja: (m) => "問題集「" + m[1] + "」を削除してもよろしいですか？この操作は元に戻せません。"
  },
  {
    re: /^Chưa có dữ liệu điểm thi trong\s+(tuần|tháng)\s+này\. Hãy làm một bài thi thử hoặc クイズスタジオ để xem biểu đồ\.$/,
    en: (m) => "No exam score data for this " + (m[1] === "tuần" ? "week" : "month") + " yet. Complete a Mock Exam or Quiz Studio session to view analytics.",
    ja: (m) => "この" + (m[1] === "tuần" ? "週" : "月") + "の試験スコアデータはまだありません。模擬試験または クイズスタジオ を完了するとグラフが表示されます。"
  },
  {
    re: /^1 phiên duy nhất\s*\((\d+)\s*câu\)\.$/,
    en: (m) => "1 single session (" + m[1] + " questions).",
    ja: (m) => "全1セッション (" + m[1] + " 問)。"
  },
  {
    re: /^Tự động chia thành\s+(\d+)\s+phiên\s*×\s*(\d+)\s+câu\.$/,
    en: (m) => "Automatically split into " + m[1] + " sessions × " + m[2] + " questions.",
    ja: (m) => "自動的に " + m[1] + " セッション × " + m[2] + " 問に分割されます。"
  },
  {
    re: /^Tự động chia thành\s+(\d+)\s+phiên:\s*(\d+)\s+phiên\s*×\s*(\d+)\s+câu\s*\+\s*1 phiên cuối\s*×\s*(\d+)\s+câu\.$/,
    en: (m) => "Automatically split into " + m[1] + " sessions: " + m[2] + " sessions × " + m[3] + " Qs + 1 final session × " + m[4] + " Qs.",
    ja: (m) => "自動的に " + m[1] + " セッションに分割: " + m[2] + " セッション × " + m[3] + " 問 + 最終セッション × " + m[4] + " 問。"
  },
  {
    re: /^Phiên\s+(\d+)\s*\(Câu\s+(\d+)–(\d+)\s*•\s*(\d+)\s*câu\)$/,
    en: (m) => "Session " + m[1] + " (Q" + m[2] + "–" + m[3] + " • " + m[4] + " Qs)",
    ja: (m) => "セッション " + m[1] + " (問" + m[2] + "–" + m[3] + " • " + m[4] + "問)"
  },
  {
    re: /^Bạn trả lời đúng\s+(\d+)\/(\d+)\s+câu(.*)$/,
    en: (m) => "You answered " + m[1] + "/" + m[2] + " questions correctly. Review the detailed breakdown below.",
    ja: (m) => m[2] + "問中 " + m[1] + "問正解しました。以下で各問題の詳細を確認してください。"
  },
  {
    re: /^Bạn còn\s+(\d+)\s+câu chưa trả lời\. Bạn có chắc chắn muốn nộp bài\?$/,
    en: (m) => "You have " + m[1] + " unanswered question(s). Are you sure you want to submit?",
    ja: (m) => "未回答の問題が " + m[1] + " 問あります。提出してもよろしいですか？"
  },
  {
    re: /^Bạn đã hoàn thành\s+(\d+)\/(\d+)\s+câu\. Kết thúc phiên học bây giờ\?$/,
    en: (m) => "You have completed " + m[1] + "/" + m[2] + " questions. End this study session now?",
    ja: (m) => m[2] + "問中 " + m[1] + "問完了しました。学習セッションを終了しますか？"
  },
  {
    re: /^Đã kết thúc phiên học:\s*(\d+)\/(\d+)\s*câu đúng\.$/,
    en: (m) => "Session ended: " + m[1] + "/" + m[2] + " correct.",
    ja: (m) => "セッション終了: " + m[2] + "問中 " + m[1] + "問正解。"
  },
  {
    re: /^File thiếu các cột bắt buộc:\s*(.+)$/,
    en: (m) => "File is missing required columns: " + m[1],
    ja: (m) => "ファイルに必須列がありません: " + m[1]
  },
  {
    re: /^Dòng\s+(\d+):\s*Thiếu nội dung câu hỏi$/,
    en: (m) => "Row " + m[1] + ": Missing question content",
    ja: (m) => "行 " + m[1] + ": 問題文がありません"
  },
  {
    re: /^Dòng\s+(\d+):\s*Cần ít nhất 2 phương án trả lời$/,
    en: (m) => "Row " + m[1] + ": At least 2 answer choices are required",
    ja: (m) => "行 " + m[1] + ": 少なくとも2つの選択肢が必要です"
  },
  {
    re: /^Dòng\s+(\d+):\s*Đáp án đúng không hợp lệ\s*\("(.+?)"\)$/,
    en: (m) => "Row " + m[1] + ": Invalid correct answer (\"" + m[2] + "\")",
    ja: (m) => "行 " + m[1] + ": 正解の指定が無効です (\"" + m[2] + "\")"
  },
  {
    re: /^Gói\s+(.+?)\s+chỉ cho phép tối đa\s+(\d+)\s+câu mỗi bộ đề\.$/,
    en: (m) => "The " + m[1] + " plan allows up to " + m[2] + " questions per deck.",
    ja: (m) => m[1] + " プランでは1問題集あたり最大 " + m[2] + " 問までです。"
  },
  {
    re: /^Gói\s+(.+?)\s+cho phép tối đa\s+(\d+)\s+ảnh\/lần trong AI変換\.$/,
    en: (m) => "The " + m[1] + " plan allows up to " + m[2] + " images per batch in AI Converter.",
    ja: (m) => m[1] + " プランでは AI変換 で1回あたり最大 " + m[2] + " 枚の画像まで処理できます。"
  },
  {
    re: /^Đang chờ duyệt gói\s+(.+?)\s*\((.+?)\)\s*•\s*Gửi lúc\s+(.+)$/,
    en: (m) => "Pending approval for " + m[1] + " (" + m[2] + ") • Submitted " + m[3],
    ja: (m) => m[1] + " (" + m[2] + ") 承認待ち • 送信日時: " + m[3]
  },
  {
    re: /^Đã duyệt lúc\s+(.+)$/,
    en: (m) => "Approved at " + m[1],
    ja: (m) => "承認日時: " + m[1]
  },
  {
    re: /^Thanh toán\s*–\s*(.+)$/,
    en: (m) => "Checkout – " + m[1],
    ja: (m) => "お支払い – " + m[1]
  },
  {
    re: /^🔑 Đã được Admin gán API\s*\((.+)\)$/,
    en: (m) => "🔑 API Assigned by Admin (" + m[1] + ")",
    ja: (m) => "🔑 管理者割当済 API (" + m[1] + ")"
  },
  {
    re: /^Đang dùng API Key do Quản trị viên gán cho\s+(.+)$/,
    en: (m) => "Using API Key assigned by Administrator for " + m[1],
    ja: (m) => "管理者が " + m[1] + " に割り当てた API Key を使用中"
  },
  {
    re: /^Kiểm tra thất bại:\s*(.+)$/,
    en: (m) => "Verification failed: " + m[1],
    ja: (m) => "テスト失敗: " + m[1]
  },
  {
    re: /^Tệp "(.+?)" rỗng \(0 KB\), không có nội dung để xử lý\.$/,
    en: (m) => "File \"" + m[1] + "\" is empty (0 KB), nothing to process.",
    ja: (m) => "ファイル「" + m[1] + "」は空 (0 KB) です。"
  },
  {
    re: /^AI đang giải đáp án\s+(\d+)\/(\d+)\.\.\.$/,
    en: (m) => "AI solving answers " + m[1] + "/" + m[2] + "...",
    ja: (m) => "AI 解答中 " + m[1] + "/" + m[2] + "..."
  },
  {
    re: /^AI đang kiểm tra chéo đáp án\s+(\d+)\/(\d+)\.\.\.$/,
    en: (m) => "AI cross-checking answers " + m[1] + "/" + m[2] + "...",
    ja: (m) => "AI クロスチェック中 " + m[1] + "/" + m[2] + "..."
  },
  {
    re: /^AI kiểm tra chéo đề xuất:\s*(.+?)\s*\(Độ tự tin\s+(.+?)\)\.\s*(.*)$/,
    en: (m) => "AI Double-Check suggests: " + m[1] + " (Confidence " + m[2] + "). " + m[3],
    ja: (m) => "AI クロスチェック提案: " + m[1] + " (信頼度 " + m[2] + ")。" + m[3]
  },
  {
    re: /^AI đang cấu trúc & giải đề\s*\(phần\s+(\d+)\/(\d+)\)\.\.\.$/,
    en: (m) => "AI structuring & solving exam (part " + m[1] + "/" + m[2] + ")...",
    ja: (m) => "AI 構造化・解答中 (パート " + m[1] + "/" + m[2] + ")..."
  },
  {
    re: /^Tệp Excel "(.+?)" không có câu hỏi hợp lệ\.$/,
    en: (m) => "Excel file \"" + m[1] + "\" contains no valid questions.",
    ja: (m) => "Excel ファイル「" + m[1] + "」に有効な問題がありません。"
  },
  {
    re: /^Không thể đọc tệp Excel "(.+?)":\s*(.+)$/,
    en: (m) => "Could not read Excel file \"" + m[1] + "\": " + m[2],
    ja: (m) => "Excel ファイル「" + m[1] + "」を読み込めませんでした: " + m[2]
  },
  {
    re: /^AI Vision đang đọc ảnh\s+(\d+)\/(\d+):\s*(.+)$/,
    en: (m) => "AI Vision reading image " + m[1] + "/" + m[2] + ": " + m[3],
    ja: (m) => "AI Vision 画像読み取り中 " + m[1] + "/" + m[2] + ": " + m[3]
  },
  {
    re: /^Lỗi đọc ảnh "(.+?)":\s*(.+)$/,
    en: (m) => "Error reading image \"" + m[1] + "\": " + m[2],
    ja: (m) => "画像「" + m[1] + "」の読み取りエラー: " + m[2]
  },
  {
    re: /^Ảnh AI Vision:\s*(.+)$/,
    en: (m) => "AI Vision Image: " + m[1],
    ja: (m) => "AI Vision 画像: " + m[1]
  },
  {
    re: /^Đang trích xuất nội dung từ\s+(.+)\.\.\.$/,
    en: (m) => "Extracting content from " + m[1] + "...",
    ja: (m) => m[1] + " から内容を抽出中..."
  },
  {
    re: /^Không thể đọc tệp "(.+?)":\s*(.+)$/,
    en: (m) => "Could not read file \"" + m[1] + "\": " + m[2],
    ja: (m) => "ファイル「" + m[1] + "」を読み込めませんでした: " + m[2]
  },
  {
    re: /^Tệp PDF "(.+?)" là bản scan hình ảnh nên cần Gemini API Key để đọc\.$/,
    en: (m) => "PDF \"" + m[1] + "\" is a scanned image PDF and requires a Gemini API Key for OCR.",
    ja: (m) => "PDF「" + m[1] + "」はスキャン画像のため、読み取りに Gemini API Key が必要です。"
  },
  {
    re: /^PDF dạng ảnh scan — AI đang đọc\s+(.+)\.\.\.$/,
    en: (m) => "Scanned PDF — AI reading " + m[1] + "...",
    ja: (m) => "スキャン PDF — AI が " + m[1] + " を読み取り中..."
  },
  {
    re: /^Tệp "(.+?)" trống hoặc không có nội dung văn bản\.$/,
    en: (m) => "File \"" + m[1] + "\" is empty or contains no text.",
    ja: (m) => "ファイル「" + m[1] + "」が空かテキストを含んでいません。"
  },
  {
    re: /^(.+?):\s*(\d+)\s*câu\s*\(đủ đáp án – chuyển đổi trực tiếp\)$/,
    en: (m) => m[1] + ": " + m[2] + " Qs (complete answer keys – direct conversion)",
    ja: (m) => m[1] + ": " + m[2] + "問 (解答あり – 直接変換)"
  },
  {
    re: /^AI đang giải\s+(\d+)\s+câu thiếu đáp án & kiểm tra chéo\.\.\.$/,
    en: (m) => "AI solving " + m[1] + " missing answers & cross-checking...",
    ja: (m) => "AI が未解答の " + m[1] + " 問を解答＆クロスチェック中..."
  },
  {
    re: /^(.+?):\s*(\d+)\s*câu\s*\(AI giải\s+(\d+)\s+câu(.*)$/,
    en: (m) => m[1] + ": " + m[2] + " Qs (AI solved " + m[3] + " Qs)",
    ja: (m) => m[1] + ": " + m[2] + "問 (AI解答 " + m[3] + "問)"
  },
  {
    re: /^(.+?):\s*(\d+)\s*câu\s*\(thiếu\s+(\d+)\s+Đ\/A – cần API Key để AI tự giải\)$/,
    en: (m) => m[1] + ": " + m[2] + " Qs (" + m[3] + " missing answers – API Key required for AI solving)",
    ja: (m) => m[1] + ": " + m[2] + "問 (未解答 " + m[3] + "問 – AI自動解答には API Key が必要です)"
  },
  {
    re: /^Đã trích xuất\s+(\d+)\s+câu từ "(.+?)" nhưng còn\s+(\d+)\s+câu thiếu đáp án\. Hãy cài Gemini API Key để AI tự giải & kiểm tra chéo\.$/,
    en: (m) => "Extracted " + m[1] + " questions from \"" + m[2] + "\", with " + m[3] + " missing answers. Configure a Gemini API Key so AI can solve & cross-check them.",
    ja: (m) => "「" + m[2] + "」から " + m[1] + " 問を抽出しました（未解答 " + m[3] + " 問）。AI自動解答には Gemini API Key を設定してください。"
  },
  {
    re: /^(.+?):\s*(\d+)\s*câu\s*\(định dạng lộn xộn – cần API Key để AI chuẩn hóa đủ\)$/,
    en: (m) => m[1] + ": " + m[2] + " Qs (messy format – API Key needed for full AI normalization)",
    ja: (m) => m[1] + ": " + m[2] + "問 (フォーマット不揃い – AI正規化には API Key が必要です)"
  },
  {
    re: /^Tệp "(.+?)" chưa đúng định dạng trắc nghiệm chuẩn nên cần Gemini API Key để AI phân tích & giải\.$/,
    en: (m) => "File \"" + m[1] + "\" is not in standard quiz format and requires a Gemini API Key for AI parsing & solving.",
    ja: (m) => "ファイル「" + m[1] + "」は標準問題形式ではないため、解析・解答には Gemini API Key が必要です。"
  },
  {
    re: /^(.+?)\s*\(AI cấu trúc & giải\):\s*(\d+)\s*câu(.*)$/,
    en: (m) => m[1] + " (AI structured & solved): " + m[2] + " Qs",
    ja: (m) => m[1] + " (AI構造化・解答): " + m[2] + "問"
  },
  {
    re: /^Lỗi xử lý tệp:\s*(.+)$/,
    en: (m) => "File processing error: " + m[1],
    ja: (m) => "ファイル処理エラー: " + m[1]
  },
  {
    re: /^AI đã giải xong\s+(\d+)\s+câu hỏi\.$/,
    en: (m) => "AI solved " + m[1] + " questions.",
    ja: (m) => "AI が " + m[1] + " 問の解答を完了しました。"
  },
  {
    re: /^Đã dừng giải đáp án\. Giữ lại\s+(\d+)\/(\d+)\s+câu đã giải\.$/,
    en: (m) => "Stopped solving. Kept " + m[1] + "/" + m[2] + " solved questions.",
    ja: (m) => "解答を停止しました。解答済みの " + m[1] + "/" + m[2] + " 問を保持します。"
  },
  {
    re: /^Lỗi khi giải đáp án:\s*(.+)$/,
    en: (m) => "Error solving answers: " + m[1],
    ja: (m) => "解答エラー: " + m[1]
  },
  {
    re: /^AI Double-Check phát hiện\s+(\d+)\s+câu cần kiểm tra kỹ!$/,
    en: (m) => "AI Double-Check flagged " + m[1] + " question(s) for review!",
    ja: (m) => "AI クロスチェックで要確認の問題が " + m[1] + " 問見つかりました！"
  },
  {
    re: /^Lỗi Double-Check:\s*(.+)$/,
    en: (m) => "Double-Check error: " + m[1],
    ja: (m) => "クロスチェックエラー: " + m[1]
  },
  {
    re: /^Đã áp dụng đáp án cho\s+Câu\s+#(\d+)$/,
    en: (m) => "Applied answer to Question #" + m[1],
    ja: (m) => "問題 #" + m[1] + " に解答を適用しました"
  },
  {
    re: /^🔥 Câu hỏi cứu vớt \(Redemption\)! Làm lại\s+(\d+)\s+câu sai để gỡ điểm!$/,
    en: (m) => "🔥 Redemption Round! Retry " + m[1] + " missed question(s) to recover points!",
    ja: (m) => "🔥 リデンプション問題！間違えた " + m[1] + " 問に再挑戦してスコアを回復しましょう！"
  },
  {
    re: /^(.+?)\s*–\s*Phiên\s+(\d+)\/(\d+)$/,
    en: (m) => m[1] + " – Session " + m[2] + "/" + m[3],
    ja: (m) => m[1] + " – セッション " + m[2] + "/" + m[3]
  },
  {
    re: /^🏆 Tổng kết Quiz\s*–\s*(.+)$/,
    en: (m) => "🏆 Quiz Summary – " + m[1],
    ja: (m) => "🏆 クイズ結果 – " + m[1]
  },
  {
    re: /^▶ Làm tiếp Phiên\s+(\d+)\/(\d+)$/,
    en: (m) => "▶ Continue to Session " + m[1] + "/" + m[2],
    ja: (m) => "▶ セッション " + m[1] + "/" + m[2] + " へ進む"
  },
  {
    re: /^Đã tự động khôi phục\s+(\d+)\s+bộ đề từ bộ nhớ đệm Cloud\/IndexedDB!$/,
    en: (m) => "Auto-restored " + m[1] + " deck(s) from Cloud/IndexedDB cache!",
    ja: (m) => "Cloud/IndexedDB キャッシュから " + m[1] + " セットの問題集を自動復元しました！"
  },
  {
    re: /^Không thể lấy thông tin email Google \(HTTP\s+(\d+)\)\.$/,
    en: (m) => "Could not retrieve Google email info (HTTP " + m[1] + ").",
    ja: (m) => "Google メール情報を取得できませんでした (HTTP " + m[1] + ")。"
  },
  {
    re: /^Lỗi kiểm tra thư mục Google Drive \(HTTP\s+(\d+)\)\.$/,
    en: (m) => "Error checking Google Drive folder (HTTP " + m[1] + ").",
    ja: (m) => "Google Drive フォルダ確認エラー (HTTP " + m[1] + ")。"
  },
  {
    re: /^Lỗi tạo thư mục trên Google Drive \(HTTP\s+(\d+)\)\.$/,
    en: (m) => "Error creating Google Drive folder (HTTP " + m[1] + ").",
    ja: (m) => "Google Drive フォルダ作成エラー (HTTP " + m[1] + ")。"
  },
  {
    re: /^Lỗi tìm file Google Drive \(HTTP\s+(\d+)\)\.$/,
    en: (m) => "Error searching Google Drive file (HTTP " + m[1] + ").",
    ja: (m) => "Google Drive ファイル検索エラー (HTTP " + m[1] + ")。"
  },
  {
    re: /^Đã kết nối Google Drive! Thư mục lưu trữ: "(.+?)"$/,
    en: (m) => "Connected to Google Drive! Backup folder: \"" + m[1] + "\"",
    ja: (m) => "Google Drive に接続しました！保存フォルダ: \"" + m[1] + "\""
  },
  {
    re: /^Lỗi tải lên Google Drive \(HTTP\s+(\d+)\)\.$/,
    en: (m) => "Google Drive upload error (HTTP " + m[1] + ").",
    ja: (m) => "Google Drive アップロードエラー (HTTP " + m[1] + ")。"
  },
  {
    re: /^Đã sao lưu "(.+?)" vào thư mục "(.+?)" thành công!$/,
    en: (m) => "Backed up \"" + m[1] + "\" to folder \"" + m[2] + "\" successfully!",
    ja: (m) => "「" + m[1] + "」をフォルダ「" + m[2] + "」にバックアップしました！"
  },
  {
    re: /^Sao lưu thất bại:\s*(.+)$/,
    en: (m) => "Backup failed: " + m[1],
    ja: (m) => "バックアップ失敗: " + m[1]
  },
  {
    re: /^Không tìm thấy file "(.+?)" trong thư mục "(.+?)" trên Google Drive\.$/,
    en: (m) => "File \"" + m[1] + "\" not found in folder \"" + m[2] + "\" on Google Drive.",
    ja: (m) => "Google Drive のフォルダ「" + m[2] + "」にファイル「" + m[1] + "」が見つかりません。"
  },
  {
    re: /^Không tải được dữ liệu từ Google Drive \(HTTP\s+(\d+)\)\.$/,
    en: (m) => "Could not download data from Google Drive (HTTP " + m[1] + ").",
    ja: (m) => "Google Drive からデータを取得できませんでした (HTTP " + m[1] + ")。"
  },
  {
    re: /^Đã khôi phục dữ liệu từ "(.+?)" thành công\s*\((.+)\)!$/,
    en: (m) => "Restored data from \"" + m[1] + "\" successfully (" + m[2] + ")!",
    ja: (m) => "「" + m[1] + "」からデータを復元しました (" + m[2] + ")！"
  },
  {
    re: /^Khôi phục thất bại:\s*(.+)$/,
    en: (m) => "Restore failed: " + m[1],
    ja: (m) => "復元失敗: " + m[1]
  },
  {
    re: /^Đã tải file sao lưu\s+(.+)$/,
    en: (m) => "Downloaded backup file " + m[1],
    ja: (m) => "バックアップファイル " + m[1] + " をダウンロードしました"
  },
  {
    re: /^Đã khôi phục\s+(\d+)\s+bộ đề và dữ liệu học tập thành công!$/,
    en: (m) => "Restored " + m[1] + " deck(s) and study data successfully!",
    ja: (m) => m[1] + " セットの問題集と学習データを復元しました！"
  },
  {
    re: /^Chế độ Ghi đè sẽ thay thế toàn bộ bộ đề và tiến độ hiện tại bằng dữ liệu từ file\s*\((\d+)\s*bộ đề\)\. Tiếp tục\?$/,
    en: (m) => "Overwrite mode will replace all current decks and progress with data from the file (" + m[1] + " decks). Continue?",
    ja: (m) => "上書きモードでは現在のすべての問題集と進捗がファイルのデータ (" + m[1] + " セット) に置き換えられます。続行しますか？"
  },
  {
    re: /^Không tìm thấy bộ đề với mã\s+(.+)\.$/,
    en: (m) => "No deck found with share code " + m[1] + ".",
    ja: (m) => "共有コード " + m[1] + " の問題集が見つかりません。"
  },
  {
    re: /^Đã mở bộ đề "(.+?)"\s*\((\d+)\s*câu\)\. Sẵn sàng làm bài!$/,
    en: (m) => "Opened deck \"" + m[1] + "\" (" + m[2] + " Qs). Ready to start!",
    ja: (m) => "問題集「" + m[1] + "」(" + m[2] + "問) を開きました。学習を始められます！"
  },
  {
    re: /^Danh sách tất cả người dùng đã đăng ký\s*\((\d+)\)$/,
    en: (m) => "All Registered Users (" + m[1] + ")",
    ja: (m) => "全登録ユーザー一覧 (" + m[1] + ")"
  },
  {
    re: /^Đã chọn email\s+(.+?)\s+để cấp \/ nâng cấp gói\.$/,
    en: (m) => "Selected " + m[1] + " to grant / upgrade plan.",
    ja: (m) => "プラン付与・アップグレード対象として " + m[1] + " を選択しました。"
  },
  {
    re: /^Model\s+(.+?)\s+đã hết lượt Free Tier — hệ thống tự động chuyển sang\s+(.+?)\s+để tiếp tục xử lý!$/,
    en: (m) => "Model " + m[1] + " reached its Free Tier quota — automatically switched to " + m[2] + " to continue processing!",
    ja: (m) => "モデル " + m[1] + " が無料枠の上限に達したため、自動的に " + m[2] + " に切り替えて処理を続行します！"
  },
  {
    re: /^API Key hiện tại đã hết hạn mức miễn phí \(Free Tier Quota\) trên các model khả dụng(.*)$/,
    en: () => "Current API Key has reached Google's Free Tier quota across available models. Please switch to another Gemini API Key in API Settings or upgrade your Google AI Studio quota.",
    ja: () => "現在の API Key は利用可能なモデルの無料枠 (Free Tier Quota) の上限に達しました。API設定で別の Gemini API Key に変更するか、Google AI Studio のクォータをアップグレードしてください。"
  },
  {
    re: /^\+(\d+)\s+Key dự phòng$/,
    en: (m) => "+" + m[1] + " Backup Key(s)",
    ja: (m) => "+" + m[1] + " 予備キー"
  },
  {
    re: /^🔄 Đang kích hoạt\s+(\d+)\s+API Key trong hàng đợi tự động xoay vòng:$/,
    en: (m) => "🔄 Active in auto-rotation pool: " + m[1] + " API Key(s):",
    ja: (m) => "🔄 自動ローテーションプールで有効な API Key (" + m[1] + " 件):"
  },
  {
    re: /^Đã đồng bộ\s*\((.+)\)$/,
    en: (m) => "Synced (" + m[1] + ")",
    ja: (m) => "同期済 (" + m[1] + ")"
  },
  {
    re: /^(\d+)\/(\d+)\s+từ\s*·\s*Bấm thẻ để lật$/,
    en: (m) => m[1] + "/" + m[2] + " words · Click card to flip",
    ja: (m) => m[1] + "/" + m[2] + " 語 · カードをクリックしてめくる"
  },
  {
    re: /^Hiển thị thêm\s+(\d+)\s+từ$/,
    en: (m) => "Load " + m[1] + " more words",
    ja: (m) => "さらに " + m[1] + " 語を表示"
  },
  {
    re: /^(\d+)\s+đến hạn\s*·\s*(\d+)\s+từ mới chưa học\s*·\s*(\d+)\s+từ mới trong phiên$/,
    en: (m) => m[1] + " due · " + m[2] + " unlearned new · " + m[3] + " new in session",
    ja: (m) => "期限到来 " + m[1] + " · 未学習 " + m[2] + " · 今セッションの新規 " + m[3]
  },
  {
    re: /^Bảng dò bài\s*·\s*(\d+)\s+từ cần ôn$/,
    en: (m) => "Review Table · " + m[1] + " starred words",
    ja: (m) => "復習シート · 要復習 " + m[1] + " 語"
  },
  {
    re: /^(\d+)\s+từ(\s*·\s*Bộ mặc định)?$/,
    en: (m) => m[1] + " words" + (m[2] ? " · Default Deck" : ""),
    ja: (m) => m[1] + " 語" + (m[2] ? " · デフォルト単語帳" : "")
  },
  {
    re: /^(\d+)\s+ngày(\s*·\s*Gỡ sao)?$/,
    en: (m) => m[1] + " days" + (m[2] ? " · Unstar" : ""),
    ja: (m) => m[1] + " 日" + (m[2] ? " · スター解除" : "")
  },
  {
    re: /^(\d+)\s+từ trong nguồn\s*·\s*Đáp án nhiễu lấy từ toàn bộ kho từ\.$/,
    en: (m) => m[1] + " words in source · Distractors drawn from entire vocabulary.",
    ja: (m) => "対象範囲に " + m[1] + " 語 · 誤答選択肢は全単語から抽出されます。"
  },
  {
    re: /^(\d+)%\s+chính xác$/,
    en: (m) => m[1] + "% Accuracy",
    ja: (m) => "正答率 " + m[1] + "%"
  },
  {
    re: /^Đã lưu nhanh “(.+?)” vào 単語スタジオ!$/,
    en: (m) => "Quick-saved “" + m[1] + "” to Vocab Studio!",
    ja: (m) => "「" + m[1] + "」を 単語スタジオ にクイック保存しました！"
  },
  {
    re: /^Dữ liệu hiện có:\s*(\d+)\s*bộ đề\s*·\s*(\d+)\s*từ vựng \(単語スタジオ\)\s*·\s*(\d+)\s*câu sai\s*·\s*(\d+)\s*lịch sử thi\.$/,
    en: (m) => "Current data: " + m[1] + " decks · " + m[2] + " words (Vocab Studio) · " + m[3] + " mistakes · " + m[4] + " exam records.",
    ja: (m) => "現在のデータ: 問題集 " + m[1] + " · 単語 (単語スタジオ) " + m[2] + " · 間違いノート " + m[3] + " · 試験履歴 " + m[4] + "。"
  },
{
    re: /^(.+?)\s*\((\d+)\s*câu\)$/,
    en: (m) => m[1] + " (" + m[2] + " Qs)",
    ja: (m) => m[1] + " (" + m[2] + " 問)"
  }
];
/* END_VI_TRANSLATION_DICTIONARY */
function getLang() {
  try {
    const v = localStorage.getItem(KEYS.lang) || "vi";
    return (v === "en" || v === "ja" || v === "vi") ? v : "vi";
  } catch (e) { return "vi"; }
}

function translateString(viStr, lang) {
  if (!viStr || lang === "vi") return viStr;
  const trimmed = String(viStr).replace(/\s+/g, " ").trim();
  if (!trimmed) return viStr;
  const hit = I18N_MAP[trimmed] || I18N_MAP[String(viStr).trim()];
  if (hit && hit[lang]) {
    const lead = String(viStr).match(/^\s*/)[0];
    const trail = String(viStr).match(/\s*$/)[0];
    return lead + hit[lang] + trail;
  }
  for (let i = 0; i < I18N_PATTERNS.length; i++) {
    const p = I18N_PATTERNS[i];
    const m = trimmed.match(p.re);
    if (m && typeof p[lang] === "function") {
      const lead = String(viStr).match(/^\s*/)[0];
      const trail = String(viStr).match(/\s*$/)[0];
      return lead + p[lang](m) + trail;
    }
  }
  return viStr;
}

let __i18nApplying = false;
let __i18nObserver = null;

function applyI18n(root) {
  if (typeof document === "undefined" || __i18nApplying) return;
  __i18nApplying = true;
  try {
    const lang = getLang();
    if (document.documentElement) document.documentElement.setAttribute("lang", lang);
    const container = root || document.body;
    if (!container || typeof document.createTreeWalker !== "function") return;

    // 1. Walk text nodes (including inside <option>, <button>, <th>, <td>, <label>, etc.) without touching font-family or KaTeX math
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
      if (typeof node.__viText !== "string" || node.__lastTranslated !== curVal) {
        if (node.__lastTranslated !== curVal) node.__viText = curVal;
      }
      const baseVi = typeof node.__viText === "string" ? node.__viText : curVal;
      const nextVal = lang === "vi" ? baseVi : translateString(baseVi, lang);
      if (nextVal !== curVal) {
        node.__lastTranslated = nextVal;
        node.nodeValue = nextVal;
      }
    }

    // 2. Translate attributes: placeholder, title, aria-label, label (on optgroup)
    if (typeof container.querySelectorAll === "function") {
      const attrs = ["placeholder", "title", "aria-label", "label"];
      for (let a = 0; a < attrs.length; a++) {
        const attr = attrs[a];
        const propVi = "__vi_" + attr;
        const propLast = "__last_" + attr;
        const els = container.querySelectorAll("[" + attr + "]");
        for (let i = 0; i < els.length; i++) {
          const el = els[i];
          const curVal = el.getAttribute(attr) || "";
          if (!curVal.trim()) continue;
          if (!el[propVi] || el[propLast] !== curVal) {
            if (el[propLast] !== curVal) el[propVi] = curVal;
          }
          const nextVal = lang === "vi" ? el[propVi] : translateString(el[propVi], lang);
          if (nextVal && nextVal !== curVal) {
            el[propLast] = nextVal;
            el.setAttribute(attr, nextVal);
          }
        }
      }
    }

    // 3. Translate document.title
    if (document.title) {
      if (!document.__viTitle || document.__lastTitle !== document.title) {
        if (document.__lastTitle !== document.title) document.__viTitle = document.title;
      }
      const nextTitle = lang === "vi" ? document.__viTitle : translateString(document.__viTitle, lang);
      if (nextTitle && nextTitle !== document.title) {
        document.__lastTitle = nextTitle;
        document.title = nextTitle;
      }
    }

    // 4. Attach automatic MutationObserver once on document.body so any dynamic modals/banners translate immediately
    if (!__i18nObserver && document.body && typeof MutationObserver === "function") {
      __i18nObserver = new MutationObserver(function (mutations) {
        if (__i18nApplying || getLang() === "vi") return;
        let shouldRun = false;
        for (let i = 0; i < mutations.length; i++) {
          if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
            shouldRun = true;
            break;
          }
        }
        if (shouldRun) applyI18n(document.body);
      });
      __i18nObserver.observe(document.body, { childList: true, subtree: true });
    }
  } finally {
    __i18nApplying = false;
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
    : (next === "ja" ? "表示言語を日本語に切り替えました。" : "\u0110\u00e3 chuy\u1ec3n ng\u00f4n ng\u1eef giao di\u1ec7n sang Ti\u1ebfng Vi\u1ec7t.");
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
  getLang: getLang, setLang: setLang, applyI18n: applyI18n, translateString: translateString,
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
  on("copyAccBtn", "click", function () { copyText(getPayCfg().accountNo, "s\u1ed1 t\u00e0i kho\u1ea3n"); });
  on("copyMemoBtn", "click", function () { copyText(checkoutMemo(), "n\u1ed9i dung chuy\u1ec3n kho\u1ea3n"); });

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
  try {
    if (localStorage.getItem("ai_tutor_notice_dismissed") === "1") toggleEl("noticeBanner", false);
  } catch (e) { /* */ }
  on("noticeBannerClose", "click", function () {
    toggleEl("noticeBanner", false);
    try { localStorage.setItem("ai_tutor_notice_dismissed", "1"); } catch (e) { /* */ }
  });
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
    if (cb) { try { cb(); } catch (e) { showToast("\u0110\u00e3 x\u1ea3y ra l\u1ed7i khi th\u1ef1c hi\u1ec7n thao t\u00e1c.", "error"); } }
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
  on("studyQuickVocabBtn", "click", function () {
    const s = state.session;
    if (!s || !s.questions || !s.questions[s.currentIndex]) return;
    const q = s.questions[s.currentIndex];
    const stripTags = function (str) { return String(str || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); };
    const sel = (typeof window.getSelection === "function" ? String(window.getSelection() || "").trim() : "");
    const corOpt = (q.correct && q.correct.length > 0 && q.options[q.correct[0]]) ? stripTags(q.options[q.correct[0]]) : "";
    const wordCandidate = sel || corOpt || stripTags(q.text).slice(0, 80);
    const meaningCandidate = stripTags(q.explanation) || (corOpt && wordCandidate !== corOpt ? corOpt : "");
    if (window.VocabStudioBridge && typeof window.VocabStudioBridge.quickAddWord === "function") {
      window.VocabStudioBridge.quickAddWord(wordCandidate, meaningCandidate, stripTags(q.text));
    }
  });
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
  const curPth = (window.location.pathname || "").toLowerCase();
  if (stored) onAuthenticated(stored);
  else if (curPth === "/vocab" || curPth === "/vocab.html") {
    enterGuestShareMode();
    navigateTo("/vocab", { replace: true });
  } else {
    toggleEl("loginView", true);
    document.title = "\u0110\u0103ng nh\u1eadp | AI Tutor";
  }

  // Check if opened via Share Link (/quiz?code=..., /quiz/<CODE>, ?quiz=..., ?share=..., or #d=...) — works even in Incognito!
  setTimeout(function () {
    const qs = window.location.search || "";
    const pth = (window.location.pathname || "").toLowerCase();
    const params = typeof URLSearchParams === "function" ? new URLSearchParams(qs) : null;
    if (params && window.UETLms) {
      const assignCode = params.get("assign");
      const receiptId = params.get("receipt");
      if (assignCode) {
        if (!state.user) enterGuestShareMode();
        window.UETLms.openStudentAssignment(assignCode);
        return;
      }
      if (receiptId) {
        if (!state.user) enterGuestShareMode();
        window.UETLms.openParentReceipt(receiptId);
        return;
      }
    }
    if (window.UETCloud && (pth === "/quiz" || pth.indexOf("/quiz/") === 0 || qs.indexOf("quiz=") !== -1 || qs.indexOf("share=") !== -1 || qs.indexOf("code=") !== -1 || window.location.hash.indexOf("d=") !== -1)) {
      window.UETCloud.resolveAndOpenShare("");
    }
  }, 150);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
