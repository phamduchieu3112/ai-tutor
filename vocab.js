/* ============================================================
   AI Tutor – Vocab Studio Native Module (vocab.js)
   STRICT ISOLATION: Self-contained IIFE exposing only
   window.VocabStudio and window.VocabStudioBridge
   Features:
     - 110 baseline English-Vietnamese words + custom words
     - Hybrid Storage (localStorage + Supabase/Cloud API 800ms debounce + Google Drive Backup)
     - First-login Auto-Migration & Offline Fallback (pendingSync = true)
     - Smart Case-Insensitive Duplicate Detection (Merge vs Skip dialog)
     - Safe TTS & Dictionary Audio Fallback (zero uncaught promise errors)
     - 3D Flashcards + SM-2 Spaced Repetition + 4-Mode Quiz + Bilingual Dictionary + Printable Review Table + 7-Day Stats
   ============================================================ */
(function () {
  "use strict";

  const DEFAULT_VOCAB_DATA = [
    { id: 1, vi: "học tiếng Anh", en: "study / learn English" },
    { id: 2, vi: "môn Vật lý", en: "Physics" },
    { id: 3, vi: "quyển vở", en: "notebook" },
    { id: 4, vi: "tóc xoăn", en: "curly hair" },
    { id: 5, vi: "kiên nhẫn", en: "patient" },
    { id: 6, vi: "căn hộ", en: "flat / apartment" },
    { id: 7, vi: "đồ nội thất", en: "furniture" },
    { id: 8, vi: "môn Toán", en: "Maths / Math" },
    { id: 9, vi: "thông minh", en: "clever / smart" },
    { id: 10, vi: "tự tin", en: "confident" },
    { id: 11, vi: "đối diện", en: "opposite" },
    { id: 12, vi: "khuôn mặt tròn", en: "round face" },
    { id: 13, vi: "nhút nhát", en: "shy / timid" },
    { id: 14, vi: "bài tập về nhà", en: "homework" },
    { id: 15, vi: "gác mái", en: "attic" },
    { id: 16, vi: "môn Công nghệ", en: "Technology" },
    { id: 17, vi: "cao / thấp", en: "tall / short" },
    { id: 18, vi: "chăm chỉ", en: "hard-working" },
    { id: 19, vi: "hào phóng", en: "generous" },
    { id: 20, vi: "tủ nhiều ngăn kéo", en: "chest of drawers" },
    { id: 21, vi: "giúp ai làm việc gì", en: "help sb with sth" },
    { id: 22, vi: "ở trong", en: "in" },
    { id: 23, vi: "môn Sinh học", en: "Biology" },
    { id: 24, vi: "phòng ăn", en: "dining room" },
    { id: 25, vi: "môn Lịch sử", en: "History" },
    { id: 26, vi: "môn Tiếng Anh", en: "English" },
    { id: 27, vi: "tính cách", en: "character / personality" },
    { id: 28, vi: "thảm trải sàn", en: "carpet" },
    { id: 29, vi: "kính mắt", en: "glasses" },
    { id: 30, vi: "hòa hợp với ai", en: "get along with someone" },
    { id: 31, vi: "sân chơi", en: "playground" },
    { id: 32, vi: "chơi bóng đá", en: "play football" },
    { id: 33, vi: "tóc vàng", en: "blond / blonde hair" },
    { id: 34, vi: "trường nội trú", en: "boarding school" },
    { id: 35, vi: "ở trên (có tiếp xúc)", en: "on" },
    { id: 36, vi: "đôi mắt to", en: "big eyes" },
    { id: 37, vi: "trường trung học cơ sở", en: "secondary school" },
    { id: 38, vi: "thân thiện", en: "friendly" },
    { id: 39, vi: "biệt thự", en: "villa" },
    { id: 40, vi: "biết quan tâm / tốt bụng / hay giúp đỡ", en: "helpful / caring" },
    { id: 41, vi: "phòng ngủ", en: "bedroom" },
    { id: 42, vi: "bếp nấu", en: "cooker" },
    { id: 43, vi: "mũm mĩm", en: "chubby" },
    { id: 44, vi: "nhà để xe", en: "garage" },
    { id: 45, vi: "hài hước", en: "funny" },
    { id: 46, vi: "chia sẻ với", en: "share with" },
    { id: 47, vi: "môn học", en: "subject" },
    { id: 48, vi: "lò vi sóng", en: "microwave" },
    { id: 49, vi: "giá sách", en: "bookshelf" },
    { id: 50, vi: "mặc đồng phục", en: "wear uniform / put on the uniform" },
    { id: 51, vi: "ở giữa hai vật", en: "between" },
    { id: 52, vi: "phía sau", en: "behind" },
    { id: 53, vi: "nhà ở nông thôn", en: "country house" },
    { id: 54, vi: "trường quốc tế", en: "international school" },
    { id: 55, vi: "bữa trưa ở trường", en: "school lunch" },
    { id: 56, vi: "bài tập", en: "exercise / homework" },
    { id: 57, vi: "tóc dài thẳng", en: "long straight hair" },
    { id: 58, vi: "năng động", en: "active" },
    { id: 59, vi: "môn Khoa học", en: "Science" },
    { id: 60, vi: "căng tin, nhà ăn", en: "canteen" },
    { id: 61, vi: "môn Giáo dục thể chất", en: "PE (Physical Education)" },
    { id: 62, vi: "cặp sách / ba lô", en: "school bag / backpack" },
    { id: 63, vi: "tập thể dục", en: "do exercise / exercise" },
    { id: 64, vi: "máy điều hòa", en: "air conditioner" },
    { id: 65, vi: "hộp bút", en: "pencil case" },
    { id: 66, vi: "làm bài tập về nhà", en: "do homework" },
    { id: 67, vi: "môn Ngữ văn", en: "Literature" },
    { id: 68, vi: "tủ đựng đồ", en: "closet / cupboard" },
    { id: 69, vi: "sáng tạo", en: "creative" },
    { id: 70, vi: "môn học yêu thích", en: "favourite subject" },
    { id: 71, vi: "tầng hầm", en: "basement" },
    { id: 72, vi: "tóc đen", en: "black hair" },
    { id: 73, vi: "cục tẩy", en: "rubber / eraser" },
    { id: 74, vi: "đi học", en: "go to school" },
    { id: 75, vi: "com-pa", en: "compass" },
    { id: 76, vi: "hay nói", en: "talkative" },
    { id: 77, vi: "tủ lạnh", en: "fridge / refrigerator" },
    { id: 78, vi: "kết bạn", en: "make friends" },
    { id: 79, vi: "đi xe đạp", en: "ride a bike" },
    { id: 80, vi: "đồ dùng học tập", en: "school supplies" },
    { id: 81, vi: "tủ quần áo", en: "wardrobe" },
    { id: 82, vi: "môn Địa lý", en: "Geography" },
    { id: 83, vi: "đáng tin cậy", en: "reliable" },
    { id: 84, vi: "mảnh mai", en: "slim" },
    { id: 85, vi: "dụng cụ gọt bút chì", en: "pencil sharpener" },
    { id: 86, vi: "máy giặt", en: "washing machine" },
    { id: 87, vi: "đồng phục", en: "uniform" },
    { id: 88, vi: "bạn cùng lớp", en: "classmate" },
    { id: 89, vi: "giờ ra chơi", en: "break time / interval" },
    { id: 90, vi: "từ điển", en: "dictionary" },
    { id: 91, vi: "bên cạnh", en: "next to" },
    { id: 92, vi: "máy tính cầm tay", en: "calculator" },
    { id: 93, vi: "xe đạp", en: "bike / bicycle" },
    { id: 94, vi: "cái gối", en: "pillow" },
    { id: 95, vi: "nhà sàn", en: "stilt house" },
    { id: 96, vi: "phòng khách", en: "living room" },
    { id: 97, vi: "ngoại hình", en: "appearance" },
    { id: 98, vi: "hành lang / sảnh", en: "hall / corridor" },
    { id: 99, vi: "khu vườn", en: "garden" },
    { id: 100, vi: "bồn rửa", en: "sink" },
    { id: 101, vi: "nhà bếp", en: "kitchen" },
    { id: 102, vi: "phía trước", en: "in front of" },
    { id: 103, vi: "ghế sô pha", en: "sofa" },
    { id: 104, vi: "môn Mỹ thuật", en: "Art" },
    { id: 105, vi: "cái kéo", en: "scissors" },
    { id: 106, vi: "ở dưới", en: "under" },
    { id: 107, vi: "nhà phố", en: "town house" },
    { id: 108, vi: "phòng tắm", en: "bathroom" },
    { id: 109, vi: "có các tiết học", en: "have lessons" },
    { id: 110, vi: "thư viện", en: "library" }
  ];

  const DEFAULT_DECK = "deck-default";
  const STORAGE_KEY = "vocabStudio.v2";
  const PENDING_SYNC_KEY = "vocabStudio.pendingSync";
  const MIGRATED_USERS_KEY = "vocabStudio.migratedUsers";

  /* ===== Inline SVG Icon Set (Zero External Dependency Failure) ===== */
  const SVG_ICONS = {
    "search": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    "layout-grid": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    "layers": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>',
    "circle-check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    "table-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>',
    "chart-no-axes-combined": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16v5"/><path d="M16 14v7"/><path d="M20 10v11"/><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/><path d="M4 18v3"/><path d="M8 14v7"/></svg>',
    "folder": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    "settings-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>',
    "plus": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    "eye": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',
    "eye-off": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>',
    "shuffle": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/></svg>',
    "list-ordered": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
    "star": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    "check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    "check-check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>',
    "volume-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    "pencil": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
    "trash-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
    "arrow-up-right": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>',
    "arrow-right": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    "arrow-left-right": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>',
    "play": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    "copy": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    "printer": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>',
    "download": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    "upload": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
    "refresh-cw": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>'
  };

  function ico(name) {
    return SVG_ICONS[name] || "";
  }

  function U() {
    return (typeof window !== "undefined" && window.UET) ? window.UET : null;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(message, type) {
    if (U() && typeof U().showToast === "function") {
      U().showToast(message, type || "info");
      return;
    }
    const box = $("toastContainer");
    if (box) {
      const t = document.createElement("div");
      t.className = "toast " + (type || "info");
      t.textContent = message;
      box.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4200);
    }
  }

  function guard(fn) {
    return function () {
      const args = arguments;
      try {
        const result = fn.apply(this, args);
        if (result && typeof result.catch === "function") {
          result.catch(function (e) {
            toast("Có lỗi: " + (e && e.message ? e.message : "Không thể hoàn tất thao tác"), "error");
          });
        }
        return result;
      } catch (e) {
        toast("Có lỗi: " + (e && e.message ? e.message : "Không thể hoàn tất thao tác"), "error");
      }
    };
  }

  function uuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      return Array.from(bytes).map(function (b, i) {
        return ([4, 6, 8, 10].indexOf(i) !== -1 ? "-" : "") + b.toString(16).padStart(2, "0");
      }).join("");
    }
    return "vs_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cleanPairText(s) {
    return String(s || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function pair(w) {
    return JSON.stringify([cleanPairText(w.en), cleanPairText(w.vi)]);
  }

  function wordEnKey(w) {
    return cleanPairText(w && w.en);
  }

  function stamp(v) {
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }

  function oldId(n) {
    return "u1-" + String(n).padStart(3, "0");
  }

  function localDay(date) {
    const d = date || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function dayPlus(day, days) {
    const parts = String(day || "").split("-").map(Number);
    return localDay(new Date(parts[0], parts[1] - 1, parts[2] + days, 12));
  }

  function validDay(day) {
    return /^\d{4}-\d{2}-\d{2}$/.test(day) && dayPlus(day, 0) === day;
  }

  function finiteCount(n) {
    return Number.isFinite(Number(n)) ? Math.max(0, Math.floor(Number(n))) : 0;
  }

  /* ===== MODULE: Schema & Normalization ===== */
  function wordSchema(w, now) {
    const ts = now || Date.now();
    if (!w || typeof w.en !== "string" || typeof w.vi !== "string" || !w.en.trim() || !w.vi.trim()) {
      throw new Error("Từ phải có tiếng Anh và nghĩa tiếng Việt");
    }
    if (w.en.length > 250 || w.vi.length > 500) {
      throw new Error("Nội dung từ vượt giới hạn cho phép");
    }
    const s = w.srs || {};
    return {
      id: String(w.id || uuid()),
      en: w.en.trim(),
      vi: w.vi.trim(),
      ipa: String(w.ipa || "").trim(),
      pos: String(w.pos || "").trim(),
      example: String(w.example || "").trim(),
      audioUrl: String(w.audioUrl || "").trim(),
      unit: String(w.unit || "").trim(),
      deckId: String(w.deckId || DEFAULT_DECK),
      custom: w.custom === true,
      starred: w.starred === true,
      starredAt: stamp(w.starredAt),
      status: ["new", "learning", "known"].indexOf(w.status) !== -1 ? w.status : "new",
      srs: {
        interval: finiteCount(s.interval),
        ease: Number.isFinite(Number(s.ease)) && Number(s.ease) > 0 ? Number(s.ease) : 2.5,
        reps: finiteCount(s.reps),
        lapses: finiteCount(s.lapses),
        dueDate: typeof s.dueDate === "string" && validDay(s.dueDate) ? s.dueDate : null
      },
      deleted: w.deleted === true,
      createdAt: stamp(w.createdAt) || ts,
      updatedAt: stamp(w.updatedAt) || ts
    };
  }

  function streakSummary(stats, today) {
    const curDay = today || localDay();
    const dates = Object.keys((stats && stats.daily) || {}).filter(function (d) {
      return validDay(d) && d <= curDay && stats.daily[d].reviewed > 0;
    }).sort();
    const studied = new Set(dates);
    let run = 0, longest = 0, previous = null;
    for (let i = 0; i < dates.length; i++) {
      const day = dates[i];
      run = previous && dayPlus(previous, 1) === day ? run + 1 : 1;
      longest = Math.max(longest, run);
      previous = day;
    }
    let current = 0;
    let cursor = studied.has(curDay) ? curDay : dayPlus(curDay, -1);
    while (studied.has(cursor)) {
      current++;
      cursor = dayPlus(cursor, -1);
    }
    return {
      streak: current,
      longestStreak: Math.max(longest, finiteCount(stats && stats.longestStreak)),
      lastStudyDate: dates.length ? dates[dates.length - 1] : null
    };
  }

  function settingsSchema(s) {
    const obj = s || {};
    return {
      direction: obj.direction === "en-vi" ? "en-vi" : "vi-en",
      theme: obj.theme === "dark" ? "dark" : "light",
      newWordsPerDay: Number.isInteger(obj.newWordsPerDay) ? Math.min(500, Math.max(0, obj.newWordsPerDay)) : 10,
      updatedAt: stamp(obj.updatedAt)
    };
  }

  function statsSchema(s) {
    const obj = s || {};
    const daily = {};
    if (obj.daily && typeof obj.daily === "object") {
      Object.keys(obj.daily).forEach(function (day) {
        const v = obj.daily[day];
        if (validDay(day) && v && typeof v === "object") {
          const reviewed = finiteCount(v.reviewed);
          daily[day] = {
            reviewed: reviewed,
            correct: Math.min(reviewed, finiteCount(v.correct)),
            newWordIds: Array.isArray(v.newWordIds)
              ? Array.from(new Set(v.newWordIds.filter(function (id) { return typeof id === "string"; })))
              : []
          };
        }
      });
    }
    const stats = {
      streak: finiteCount(obj.streak),
      lastStudyDate: typeof obj.lastStudyDate === "string" ? obj.lastStudyDate : null,
      longestStreak: finiteCount(obj.longestStreak),
      daily: daily,
      updatedAt: stamp(obj.updatedAt)
    };
    Object.assign(stats, streakSummary(stats));
    return stats;
  }

  function initialState() {
    return {
      words: DEFAULT_VOCAB_DATA.map(function (w) {
        return wordSchema(Object.assign({}, w, { id: oldId(w.id), unit: "Unit 1-2-3", custom: false }), 1);
      }),
      decks: [
        { id: DEFAULT_DECK, name: "Unit 1-2-3", createdAt: 1, updatedAt: 1, deleted: false }
      ],
      stats: { streak: 0, lastStudyDate: null, longestStreak: 0, daily: {}, updatedAt: 0 },
      settings: { direction: "vi-en", theme: "light", newWordsPerDay: 10, updatedAt: 0 }
    };
  }

  function normalize(data, repairDecks) {
    const shouldRepair = repairDecks !== false;
    if (!data || !Array.isArray(data.words) || !Array.isArray(data.decks)) {
      throw new Error("Sai định dạng dữ liệu v2");
    }
    const base = initialState();
    const decks = new Map(base.decks.map(function (d) { return [d.id, d]; }));
    for (let i = 0; i < data.decks.length; i++) {
      const d = data.decks[i];
      if (!d || typeof d.id !== "string" || typeof d.name !== "string" || !d.name.trim()) {
        throw new Error("Bộ từ không hợp lệ");
      }
      decks.set(d.id, {
        id: d.id,
        name: d.name.trim().slice(0, 100),
        createdAt: stamp(d.createdAt) || 1,
        updatedAt: stamp(d.updatedAt) || 1,
        deleted: d.id === DEFAULT_DECK ? false : d.deleted === true
      });
    }
    const words = new Map(base.words.map(function (w) { return [w.id, w]; }));
    for (let j = 0; j < data.words.length; j++) {
      const w = wordSchema(data.words[j]);
      if (words.has(w.id) && words.get(w.id).updatedAt > w.updatedAt) continue;
      words.set(w.id, w);
    }
    if (shouldRepair) {
      words.forEach(function (w) {
        if (!decks.has(w.deckId) || decks.get(w.deckId).deleted) {
          w.deckId = DEFAULT_DECK;
          w.updatedAt = Math.max(Date.now(), w.updatedAt + 1);
        }
      });
    }
    return {
      words: Array.from(words.values()),
      decks: Array.from(decks.values()),
      stats: statsSchema(data.stats),
      settings: settingsSchema(data.settings)
    };
  }

  /* ===== Deterministic Cloud Merge Helpers ===== */
  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
      const out = {};
      Object.keys(value).sort().forEach(function (k) { out[k] = stableValue(value[k]); });
      return out;
    }
    return value;
  }

  function sameData(a, b) {
    return JSON.stringify(stableValue(a)) === JSON.stringify(stableValue(b));
  }

  function mergeTimed(local, cloud) {
    if (!local) return cloud ? clone(cloud) : null;
    if (!cloud) return clone(local);
    return clone(stamp(cloud.updatedAt) >= stamp(local.updatedAt) ? cloud : local);
  }

  function mergeWordRecord(local, cloud) {
    const merged = mergeTimed(local, cloud);
    if (!local || !cloud) return merged;
    const left = stamp(local.starredAt), right = stamp(cloud.starredAt);
    if (left && right) {
      const source = right >= left ? cloud : local;
      merged.starred = source.starred === true;
      merged.starredAt = Math.max(left, right);
    } else {
      merged.starred = local.starred === true || cloud.starred === true;
      const trueClock = Math.max(local.starred ? left : 0, cloud.starred ? right : 0);
      merged.starredAt = merged.starred
        ? (trueClock || Math.max(left, right, stamp(local.updatedAt), stamp(cloud.updatedAt)) + 1)
        : Math.max(left, right);
    }
    return merged;
  }

  function mergeStatsRecords(local, cloud) {
    const left = statsSchema(local || {}), right = statsSchema(cloud || {}), daily = {};
    const allDays = new Set([].concat(Object.keys(left.daily), Object.keys(right.daily)));
    allDays.forEach(function (day) {
      const a = left.daily[day] || {}, b = right.daily[day] || {};
      daily[day] = {
        reviewed: Math.max(a.reviewed || 0, b.reviewed || 0),
        correct: Math.max(a.correct || 0, b.correct || 0),
        newWordIds: Array.from(new Set([].concat(a.newWordIds || [], b.newWordIds || []))).sort()
      };
    });
    return statsSchema({
      daily: daily,
      longestStreak: Math.max(left.longestStreak, right.longestStreak),
      updatedAt: Math.max(stamp(local && local.updatedAt), stamp(cloud && cloud.updatedAt))
    });
  }

  function mergeStates(local, cloud) {
    if (!cloud || typeof cloud !== "object") return clone(local);
    const next = clone(local);
    ["words", "decks"].forEach(function (kind) {
      const merged = new Map(next[kind].map(function (r) { return [r.id, r]; }));
      const remoteList = Array.isArray(cloud[kind]) ? cloud[kind] : [];
      remoteList.forEach(function (remote) {
        if (!remote || typeof remote.id !== "string") return;
        merged.set(
          remote.id,
          kind === "words" ? mergeWordRecord(merged.get(remote.id), remote) : mergeTimed(merged.get(remote.id), remote)
        );
      });
      next[kind] = Array.from(merged.values());
    });
    if (cloud.stats) next.stats = mergeStatsRecords(next.stats, cloud.stats);
    if (cloud.settings) next.settings = settingsSchema(mergeTimed(next.settings, cloud.settings));
    const clean = normalize(next, false);
    const decks = new Map(clean.decks.map(function (d) { return [d.id, d]; }));
    clean.words.forEach(function (w) {
      const deck = decks.get(w.deckId);
      if (!deck || deck.deleted) {
        w.deckId = DEFAULT_DECK;
        w.updatedAt = Math.max(w.updatedAt, stamp(deck && deck.updatedAt));
      }
    });
    return clean;
  }

  function touchLocalRecords(next, previous) {
    ["words", "decks"].forEach(function (kind) {
      const oldRecords = new Map(previous[kind].map(function (r) { return [r.id, r]; }));
      next[kind].forEach(function (record) {
        const old = oldRecords.get(record.id);
        if (!old) return;
        const left = Object.assign({}, record), right = Object.assign({}, old);
        delete left.updatedAt;
        delete right.updatedAt;
        if (!sameData(left, right)) {
          const now = Math.max(Date.now(), stamp(old.updatedAt) + 1, stamp(record.updatedAt), kind === "words" ? stamp(record.starredAt) : 0);
          if (kind === "words" && record.starred !== old.starred && stamp(record.starredAt) <= stamp(old.starredAt)) {
            record.starredAt = Math.max(now, stamp(old.starredAt) + 1);
          }
          record.updatedAt = Math.max(now, kind === "words" ? stamp(record.starredAt) : 0);
        }
      });
    });
  }

  function touchMetadata(next, previous) {
    ["stats", "settings"].forEach(function (kind) {
      const a = Object.assign({}, next[kind]), b = Object.assign({}, previous[kind]);
      delete a.updatedAt;
      delete b.updatedAt;
      if (!sameData(a, b)) {
        next[kind].updatedAt = Math.max(Date.now(), stamp(previous[kind].updatedAt) + 1, stamp(next[kind].updatedAt));
      }
    });
  }

  function hasLocalCustomModifications(data) {
    if (!data) return false;
    const customWords = (data.words || []).some(function (w) {
      return w.custom || w.starred || w.status !== "new" || w.updatedAt > 1;
    });
    const customDecks = (data.decks || []).some(function (d) {
      return d.id !== DEFAULT_DECK || d.updatedAt > 1;
    });
    const hasStats = Object.keys((data.stats && data.stats.daily) || {}).length > 0;
    return customWords || customDecks || hasStats;
  }

  function isRemoteEmpty(remote) {
    if (!remote || typeof remote !== "object") return true;
    const hasWords = Array.isArray(remote.words) && remote.words.length > 0;
    const hasDecks = Array.isArray(remote.decks) && remote.decks.length > 0;
    const hasStats = remote.stats && remote.stats.daily && Object.keys(remote.stats.daily).length > 0;
    return !hasWords && !hasDecks && !hasStats;
  }

  /* ===== MODULE: Hybrid Storage & Cloud Sync Service (VocabStorageService) ===== */
  const VocabStorageService = {
    key: STORAGE_KEY,
    data: initialState(),
    blocked: false,
    pendingSync: false,
    syncStatus: "local", // local | syncing | synced | offline
    debounceTimer: null,
    syncBusy: false,
    lastSyncedEmail: "",

    load: function () {
      let raw;
      try {
        raw = localStorage.getItem(this.key);
        this.pendingSync = localStorage.getItem(PENDING_SYNC_KEY) === "true";
      } catch (e) {
        this.blocked = true;
        toast("Không truy cập được bộ nhớ trình duyệt. Hãy bật quyền lưu trữ rồi tải lại trang.", "error");
        return;
      }
      if (raw) {
        try {
          this.data = normalize(JSON.parse(raw));
        } catch (e) {
          this.blocked = true;
          toast("Dữ liệu v2 bị lỗi; chưa ghi đè. Hãy nhập bản JSON hợp lệ để khôi phục.", "error");
        }
        return;
      }
      this.migrateLegacyLocal();
    },

    migrateLegacyLocal: function () {
      const next = initialState();
      let migrated = false;
      const aliases = new Map(DEFAULT_VOCAB_DATA.map(function (w) { return [String(w.id), oldId(w.id)]; }));
      try {
        const raw = localStorage.getItem("vocab_studio_custom_v1");
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            arr.forEach(function (w) {
              if (!w || typeof w.en !== "string" || typeof w.vi !== "string") return;
              const duplicate = next.words.find(function (x) { return pair(x) === pair(w); });
              const target = duplicate || wordSchema(Object.assign({}, w, { id: uuid(), custom: true }));
              if (!duplicate) next.words.push(target);
              aliases.set(String(w.id), target.id);
            });
            migrated = true;
          }
        }
      } catch (e) { /* keep old key */ }
      try {
        const raw = localStorage.getItem("vocab_unit_1_2_3_review_ids");
        if (raw) {
          const ids = JSON.parse(raw);
          if (Array.isArray(ids)) {
            ids.forEach(function (id) {
              const targetId = aliases.get(String(id)) || String(id);
              const w = next.words.find(function (x) { return x.id === targetId; });
              if (w) {
                w.starred = true;
                w.starredAt = Date.now();
                w.updatedAt = w.starredAt;
              }
            });
            migrated = true;
          }
        }
      } catch (e) { /* keep old key */ }
      this.data = next;
      if (!this.blocked && this.persist(next) && migrated) {
        toast("Đã chuyển từ và danh sách cần ôn từ bản cũ.", "success");
      }
    },

    persist: function (next) {
      try {
        localStorage.setItem(this.key, JSON.stringify(next));
        return true;
      } catch (e) {
        toast("Không thể lưu: bộ nhớ đầy hoặc bị chặn. Hãy xuất JSON ngay.", "error");
        return false;
      }
    },

    setPendingSync: function (flag) {
      this.pendingSync = !!flag;
      try {
        if (this.pendingSync) localStorage.setItem(PENDING_SYNC_KEY, "true");
        else localStorage.removeItem(PENDING_SYNC_KEY);
      } catch (e) { /* ignore */ }
    },

    getCurrentUser: function () {
      if (U() && U().state && U().state.user && U().state.user.email) {
        return U().state.user;
      }
      try {
        const raw = localStorage.getItem("uet_master_auth");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email && Number(parsed.exp) * 1000 > Date.now()) {
          return parsed;
        }
      } catch (e) { /* ignore */ }
      return null;
    },

    /* Optimistic UI (0ms localStorage) + Debounced Sync (800ms) */
    commit: function (mutator) {
      if (this.blocked) {
        throw new Error("Bộ nhớ chưa sẵn sàng. Hãy xuất bản sao lưu rồi nhập JSON hợp lệ để khôi phục");
      }
      const next = clone(this.data);
      mutator(next);
      touchLocalRecords(next, this.data);
      touchMetadata(next, this.data);
      if (!this.persist(next)) {
        throw new Error("Thay đổi chưa được lưu");
      }
      this.data = next;
      this.setPendingSync(true);
      render();
      this.scheduleDebouncedSync();
      if (window.UETCloud && window.UETCloud.cloudStorageService) {
        window.UETCloud.cloudStorageService.scheduleSync();
      }
    },

    updateWord: function (id, patch) {
      this.commit(function (d) {
        const w = d.words.find(function (x) { return x.id === id; });
        if (!w) throw new Error("Không tìm thấy từ");
        const now = Math.max(Date.now(), w.updatedAt + 1, w.starredAt + 1);
        Object.assign(w, patch, { updatedAt: now });
        if ("starred" in patch) w.starredAt = now;
      });
    },

    removeWord: function (id) {
      const w = this.data.words.find(function (x) { return x.id === id; });
      if (!w || !w.custom) throw new Error("Chỉ xóa từ tự thêm");
      this.updateWord(id, { deleted: true });
    },

    exportData: function () {
      return Object.assign({ version: 2 }, clone(this.data), {
        reviewIds: this.data.words.filter(function (w) { return w.starred && !w.deleted; }).map(function (w) { return w.id; })
      });
    },

    scheduleDebouncedSync: function () {
      const user = this.getCurrentUser();
      if (!user) {
        this.syncStatus = "local";
        renderAuthBadge();
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        this.syncStatus = "offline";
        this.setPendingSync(true);
        renderAuthBadge();
        return;
      }
      this.syncStatus = "syncing";
      renderAuthBadge();
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      const self = this;
      this.debounceTimer = setTimeout(function () {
        self.pushToCloud(false);
      }, 800);
    },

    pushToCloud: async function (isAutoMigration) {
      const user = this.getCurrentUser();
      if (!user || this.syncBusy) {
        if (!user) { this.syncStatus = "local"; renderAuthBadge(); }
        return false;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        this.syncStatus = "offline";
        this.setPendingSync(true);
        renderAuthBadge();
        return false;
      }
      this.syncBusy = true;
      this.syncStatus = "syncing";
      renderAuthBadge();
      try {
        const headers = {
          "Content-Type": "application/json",
          "X-User-Email": user.email
        };
        if (user.credential) {
          headers["Authorization"] = "Bearer " + user.credential;
        }
        const payload = this.exportData();
        const res = await fetch("/api/vocab/sync", {
          method: "PUT",
          headers: headers,
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        this.setPendingSync(false);
        this.syncStatus = "synced";
        renderAuthBadge();
        if (isAutoMigration) {
          toast("Đã tự động đồng bộ dữ liệu từ vựng trên trình duyệt lên tài khoản đám mây của bạn!", "success");
        }
        return true;
      } catch (e) {
        this.setPendingSync(true);
        this.syncStatus = "offline";
        renderAuthBadge();
        return false;
      } finally {
        this.syncBusy = false;
      }
    },

    pullAndAutoMigrate: async function () {
      const user = this.getCurrentUser();
      if (!user) {
        this.syncStatus = "local";
        renderAuthBadge();
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        this.syncStatus = "offline";
        renderAuthBadge();
        return;
      }
      this.syncStatus = "syncing";
      renderAuthBadge();
      try {
        const headers = { "X-User-Email": user.email };
        if (user.credential) headers["Authorization"] = "Bearer " + user.credential;
        const res = await fetch("/api/vocab/sync", { headers: headers });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        const remote = json && json.data ? json.data : null;

        let migratedMap = {};
        try { migratedMap = JSON.parse(localStorage.getItem(MIGRATED_USERS_KEY) || "{}"); } catch (e) { migratedMap = {}; }
        const emailKey = String(user.email).trim().toLowerCase();

        if (isRemoteEmpty(remote)) {
          // First-login Auto-Migration: Local has vocab data, remote has none
          const hadCustomLocal = hasLocalCustomModifications(this.data);
          await this.pushToCloud(hadCustomLocal && !migratedMap[emailKey]);
          migratedMap[emailKey] = Date.now();
          try { localStorage.setItem(MIGRATED_USERS_KEY, JSON.stringify(migratedMap)); } catch (e) { /* */ }
        } else {
          const merged = mergeStates(this.data, remote);
          if (!sameData(merged, this.data)) {
            this.persist(merged);
            this.data = merged;
            render();
          }
          if (this.pendingSync || !sameData(merged, remote)) {
            await this.pushToCloud(false);
          } else {
            this.syncStatus = "synced";
            renderAuthBadge();
          }
          migratedMap[emailKey] = Date.now();
          try { localStorage.setItem(MIGRATED_USERS_KEY, JSON.stringify(migratedMap)); } catch (e) { /* */ }
        }
        this.lastSyncedEmail = emailKey;
      } catch (e) {
        this.syncStatus = "offline";
        this.setPendingSync(true);
        renderAuthBadge();
      }
    }
  };

  /* ===== MODULE: Smart Duplicate Detection & Import / Export ===== */
  let duplicatePromptResolver = null;

  function askDuplicatePolicyModal(dupCount, sampleWords, onChoice) {
    const modal = $("vsDuplicateModal");
    if (!modal) {
      const mergeChoice = confirm("Phát hiện " + dupCount + " từ trùng lặp. Bấm OK để Ghi đè (Merge) hoặc Cancel để Bỏ qua (Skip).");
      onChoice(mergeChoice ? "merge" : "skip");
      return;
    }
    const msgEl = $("vsDuplicateMsg");
    if (msgEl) {
      msgEl.textContent = "Phát hiện " + dupCount + " từ vựng đã tồn tại (" + sampleWords.slice(0, 3).join(", ") + (dupCount > 3 ? "…" : "") + "). Bạn muốn Ghi đè/Hợp nhất (Merge) hay Bỏ qua (Skip)?";
    }
    modal.classList.remove("vs-hidden");
    duplicatePromptResolver = function (policy) {
      modal.classList.add("vs-hidden");
      duplicatePromptResolver = null;
      onChoice(policy);
    };
    if (U() && typeof U().applyI18n === "function") U().applyI18n(modal);
  }

  function mergeImportWithPolicy(input, duplicatePolicy) {
    if (!input || typeof input !== "object") throw new Error("JSON không hợp lệ");
    const modern = Array.isArray(input.words);
    if (!modern && !Array.isArray(input.custom)) throw new Error("Cần words (v2) hoặc custom (v1)");
    const raws = modern ? input.words : input.custom;
    if (raws.length > 20000) throw new Error("Tối đa 20.000 từ mỗi lần nhập");

    const next = clone(VocabStorageService.data);
    const aliases = new Map(next.words.map(function (w) { return [w.id, w.id]; }));
    DEFAULT_VOCAB_DATA.forEach(function (w) { aliases.set(String(w.id), oldId(w.id)); });

    if (modern && Array.isArray(input.decks)) {
      input.decks.forEach(function (d) {
        if (!d || typeof d.id !== "string" || typeof d.name !== "string" || !d.name.trim()) return;
        const clean = {
          id: d.id,
          name: d.name.trim().slice(0, 100),
          createdAt: stamp(d.createdAt) || 1,
          updatedAt: stamp(d.updatedAt) || 1,
          deleted: d.id === DEFAULT_DECK ? false : d.deleted === true
        };
        const i = next.decks.findIndex(function (x) { return x.id === d.id; });
        if (i < 0) next.decks.push(clean);
        else if (clean.updatedAt > next.decks[i].updatedAt || duplicatePolicy === "merge") next.decks[i] = clean;
      });
    }

    let added = 0, mergedCount = 0, skippedCount = 0;
    raws.forEach(function (raw) {
      if (!raw || typeof raw.en !== "string" || typeof raw.vi !== "string" || !raw.en.trim() || !raw.vi.trim()) return;
      const legacy = !modern || typeof raw.id === "number";
      let id = raw.id;
      if (legacy) {
        const isBase = Number.isInteger(id) && id >= 1 && id <= 110;
        id = isBase ? oldId(id) : uuid();
      }
      const w = wordSchema(Object.assign({}, raw, {
        id: id,
        custom: legacy ? (Number(raw.id) > 110 || !Number.isInteger(raw.id)) : raw.custom
      }));
      const byId = next.words.findIndex(function (x) { return x.id === w.id; });
      const duplicateIdx = next.words.findIndex(function (x) {
        return !x.deleted && (pair(x) === pair(w) || (x.custom && wordEnKey(x) === wordEnKey(w)));
      });

      if (byId >= 0) {
        aliases.set(String(raw.id), w.id);
        if (duplicatePolicy === "merge" || w.updatedAt > next.words[byId].updatedAt) {
          next.words[byId] = Object.assign({}, next.words[byId], w, { updatedAt: Math.max(Date.now(), w.updatedAt) });
          mergedCount++;
        } else {
          skippedCount++;
        }
      } else if (duplicateIdx >= 0) {
        const existing = next.words[duplicateIdx];
        aliases.set(String(raw.id), existing.id);
        if (duplicatePolicy === "merge") {
          next.words[duplicateIdx] = wordSchema(Object.assign({}, existing, {
            en: w.en,
            vi: w.vi,
            ipa: w.ipa || existing.ipa,
            pos: w.pos || existing.pos,
            example: w.example || existing.example,
            audioUrl: w.audioUrl || existing.audioUrl,
            unit: w.unit || existing.unit,
            deckId: w.deckId || existing.deckId,
            starred: w.starred || existing.starred,
            updatedAt: Math.max(Date.now(), existing.updatedAt + 1)
          }));
          mergedCount++;
        } else {
          skippedCount++;
        }
      } else {
        next.words.push(w);
        aliases.set(String(raw.id), w.id);
        added++;
      }
    });

    const reviews = input.reviewIds ?? input.review;
    if (Array.isArray(reviews)) {
      reviews.forEach(function (id) {
        const w = next.words.find(function (x) { return x.id === (aliases.get(String(id)) || String(id)); });
        if (w) {
          w.starred = true;
          w.starredAt = Math.max(Date.now(), w.updatedAt + 1);
          w.updatedAt = w.starredAt;
        }
      });
    }
    if (modern && input.settings) next.settings = settingsSchema(input.settings);
    if (modern && input.stats) next.stats = mergeStatsRecords(next.stats, input.stats);

    const clean = normalize(next);
    touchMetadata(clean, VocabStorageService.data);
    if (!VocabStorageService.persist(clean)) throw new Error("Không thể ghi bản nhập vào bộ nhớ");
    VocabStorageService.data = clean;
    VocabStorageService.blocked = false;
    VocabStorageService.setPendingSync(true);
    revealed.clear();
    flashSession = null;
    quizSession = null;
    render();
    VocabStorageService.scheduleDebouncedSync();
    toast("Đã nhập dữ liệu · " + added + " từ mới · " + mergedCount + " gộp · " + skippedCount + " bỏ qua", "success");
    return added;
  }

  function handleImportPayload(input) {
    if (!input || typeof input !== "object") throw new Error("JSON không hợp lệ");
    const modern = Array.isArray(input.words);
    if (!modern && !Array.isArray(input.custom)) throw new Error("Cần words (v2) hoặc custom (v1)");
    const raws = modern ? input.words : input.custom;

    // Detect custom/user duplicates case-insensitively
    const active = activeWords();
    const dupSamples = [];
    raws.forEach(function (raw) {
      if (!raw || typeof raw.en !== "string" || typeof raw.vi !== "string") return;
      const isBaseId = typeof raw.id === "string" && /^u1-\d{3}$/.test(raw.id);
      if (isBaseId && !raw.custom) return;
      const hit = active.find(function (x) {
        return pair(x) === pair(raw) || (x.custom && wordEnKey(x) === wordEnKey(raw));
      });
      if (hit) dupSamples.push(raw.en.trim());
    });

    if (dupSamples.length > 0) {
      askDuplicatePolicyModal(dupSamples.length, dupSamples, function (policy) {
        mergeImportWithPolicy(input, policy);
      });
    } else {
      mergeImportWithPolicy(input, "merge");
    }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(VocabStorageService.exportData(), null, 2)], { type: "application/json" });
    if (U() && typeof U().downloadBlob === "function") {
      U().downloadBlob(blob, "vocab-studio-backup-v2.json");
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vocab-studio-backup-v2.json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    toast("Đã xuất bản sao lưu JSON", "success");
  }

  /* ===== MODULE: Navigation & View State ===== */
  const MENU = [
    ["grid", "layout-grid", "Lưới từ vựng"],
    ["lookup", "search", "Tra từ"],
    ["flashcards", "layers", "Thẻ ghi nhớ"],
    ["quiz", "circle-check", "Kiểm tra"],
    ["print", "table-2", "Bảng dò bài"],
    ["stats", "chart-no-axes-combined", "Thống kê"],
    ["decks", "folder", "Bộ từ"],
    ["settings", "settings-2", "Cài đặt"]
  ];

  let page = "grid";
  let deckFilter = "all";
  let printDeckFilter = "all";
  let query = "";
  let filter = "all";
  let order = [];
  let focused = null;
  let editingWord = null;
  let editingDeck = null;
  let indexedWords = null;
  let wordNumbers = new Map();
  let gridLimit = 60;
  let mountedRootId = "";

  const revealed = new Set();
  const openCells = new Set();

  function activeWords() {
    return VocabStorageService.data.words.filter(function (w) { return !w.deleted; });
  }

  function activeDecks() {
    return VocabStorageService.data.decks.filter(function (d) { return !d.deleted; });
  }

  function deckOptions(value, includeAll) {
    const val = value || "all";
    const inc = includeAll !== false;
    return (inc ? '<option value="all">Tất cả bộ từ</option>' : "") +
      activeDecks().map(function (d) {
        return '<option value="' + esc(d.id) + '" ' + (d.id === val ? "selected" : "") + ">" + esc(d.name) + "</option>";
      }).join("");
  }

  function numberOf(w) {
    if (indexedWords !== VocabStorageService.data.words) {
      indexedWords = VocabStorageService.data.words;
      wordNumbers = new Map(VocabStorageService.data.words.map(function (word, i) {
        return [word.id, String(i + 1).padStart(3, "0")];
      }));
    }
    return wordNumbers.get(w.id) || "—";
  }

  function filteredWords() {
    const words = activeWords().filter(function (w) {
      const matchDeck = deckFilter === "all" || w.deckId === deckFilter;
      const matchFilter = filter === "all" ||
        (filter === "starred" && w.starred) ||
        (filter === "known" && w.status === "known") ||
        (filter === "new" && w.status !== "known") ||
        (filter === "custom" && w.custom);
      const qLower = query.toLowerCase();
      const matchQuery = !query || (w.en + " " + w.vi + " " + numberOf(w)).toLowerCase().indexOf(qLower) !== -1;
      return matchDeck && matchFilter && matchQuery;
    });
    if (order.length) {
      const map = new Map(order.map(function (id, i) { return [id, i]; }));
      words.sort(function (a, b) {
        return (map.get(a.id) ?? Infinity) - (map.get(b.id) ?? Infinity);
      });
    }
    return words;
  }

  function navigate(name) {
    if (!MENU.some(function (m) { return m[0] === name; })) name = "grid";
    if (page !== name && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
    }
    page = name;
    render();
    queueQuizSpeech();
  }

  function renderAuthBadge() {
    const badge = $("vsSyncBadge");
    if (!badge) return;
    const user = VocabStorageService.getCurrentUser();
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    let statusText = "Chế độ cục bộ";
    let statusKey = "local";
    if (isOffline) {
      statusText = VocabStorageService.pendingSync ? "Offline · Chờ đồng bộ" : "Offline";
      statusKey = "offline";
    } else if (user) {
      if (VocabStorageService.syncStatus === "syncing") {
        statusText = "Đang đồng bộ…";
        statusKey = "syncing";
      } else if (VocabStorageService.syncStatus === "offline") {
        statusText = "Lưu cục bộ · Chờ đồng bộ";
        statusKey = "offline";
      } else {
        statusText = "Đã đồng bộ (" + user.email + ")";
        statusKey = "synced";
      }
    }
    badge.textContent = statusText;
    badge.setAttribute("data-status", statusKey);
    const infoEl = $("vsAuthModeInfo");
    if (infoEl) {
      infoEl.textContent = user
        ? ("Đang đăng nhập với tài khoản " + user.email + ". Mọi thay đổi từ vựng được lưu tức thì trên thiết bị (0ms) và tự động đồng bộ lên đám mây sau 800ms.")
        : "Bạn đang học ở Chế độ Khách (Guest). Dữ liệu được bảo toàn trong trình duyệt và sẽ tự động đồng bộ lên tài khoản ngay khi bạn đăng nhập.";
    }
    if (U() && typeof U().applyI18n === "function") U().applyI18n(badge.parentElement || badge);
  }

  function render() {
    const navEl = $("vsNavigation");
    if (!navEl) return;

    navEl.innerHTML = MENU.map(function (item) {
      const key = item[0], icon = item[1], label = item[2];
      const active = page === key;
      return '<button type="button" class="vs-subnav-btn ' + (active ? "active" : "") + '" data-vs-page="' + key + '" title="' + label + '" ' + (active ? 'aria-current="page"' : "") + ">" +
        ico(icon) + "<span>" + label + "</span></button>";
    }).join("");

    document.querySelectorAll(".vocab-studio-container [data-vs-dir]").forEach(function (b) {
      const isAct = b.getAttribute("data-vs-dir") === VocabStorageService.data.settings.direction;
      b.classList.toggle("active", isAct);
      b.setAttribute("aria-pressed", String(isAct));
    });

    ["lookup", "grid", "decks", "print", "settings", "flashcards", "quiz", "stats"].forEach(function (name) {
      const sec = $("vs_" + name + "Page");
      if (sec) sec.hidden = name !== page;
    });

    if (!activeDecks().some(function (d) { return d.id === deckFilter; })) deckFilter = "all";
    if (!activeDecks().some(function (d) { return d.id === printDeckFilter; })) printDeckFilter = "all";

    const gd = $("vsGridDeck");
    if (gd) { gd.innerHTML = deckOptions(deckFilter); gd.value = deckFilter; }
    const pd = $("vsPrintDeck");
    if (pd) { pd.innerHTML = deckOptions(printDeckFilter); pd.value = printDeckFilter; }
    const fl = $("vsFilter");
    if (fl) fl.value = filter;

    const views = {
      grid: function () { renderGrid(); renderDailyBanner(); },
      decks: renderDecks,
      print: renderTable,
      flashcards: renderFlash,
      quiz: renderQuiz,
      stats: renderStats
    };
    if (views[page]) views[page]();
    renderDictionary();
    renderAuthBadge();

    const nw = $("vsNewWordsPerDay");
    if (nw) nw.value = VocabStorageService.data.settings.newWordsPerDay;

    const container = document.querySelector(".vocab-studio-container");
    if (container && U() && typeof U().applyI18n === "function") {
      U().applyI18n(container);
    }
  }

  /* ===== MODULE: Vocabulary Grid ===== */
  function renderGrid() {
    const words = filteredWords(), all = activeWords();
    const metricsEl = $("vsMetrics");
    if (metricsEl) {
      metricsEl.innerHTML =
        '<span><strong class="vs-mono">' + all.length + "</strong>từ vựng</span>" +
        '<span><strong class="vs-mono">' + all.filter(function (w) { return w.starred; }).length + "</strong>cần ôn</span>" +
        '<span><strong class="vs-mono">' + all.filter(function (w) { return w.status === "known"; }).length + "</strong>đã thuộc</span>";
    }
    const resCnt = $("vsResultCount");
    if (resCnt) {
      resCnt.textContent = Math.min(gridLimit, words.length) + "/" + words.length + " từ · Bấm thẻ để lật";
    }
    const gridEl = $("vsVocabGrid");
    if (!gridEl) return;

    if (!words.length) {
      gridEl.innerHTML = '<div class="vs-panel vs-empty" style="grid-column:1/-1"><h2>Chưa có từ phù hợp</h2><p>Thử đổi bộ lọc, từ khóa hoặc thêm từ mới.</p></div>';
      return;
    }

    gridEl.innerHTML = words.slice(0, gridLimit).map(function (w) {
      const viFirst = VocabStorageService.data.settings.direction === "vi-en";
      const show = revealed.has(w.id);
      return '<article class="vs-word ' + (focused === w.id ? "focused" : "") + '" data-vs-id="' + esc(w.id) + '">' +
        '<div class="vs-face" data-vs-flip="' + esc(w.id) + '" role="button" tabindex="0" aria-expanded="' + show + '">' +
          '<div class="vs-card-meta"><span class="vs-mono">' + numberOf(w) + "</span><span>" + esc(w.unit || "Từ cá nhân") + (w.custom ? " · Của tôi" : "") + "</span></div>" +
          '<div class="vs-question">' + esc(viFirst ? w.vi : w.en) + "</div>" +
          (!viFirst && w.ipa ? '<div class="vs-ipa vs-mono">' + esc(w.ipa) + "</div>" : "") +
          '<div class="vs-answer ' + (show ? "" : "concealed") + '">' + (show ? esc(viFirst ? w.en : w.vi) : "Bấm để xem đáp án ↵") + "</div>" +
          (show && viFirst && w.ipa ? '<div class="vs-ipa vs-mono">' + esc(w.ipa) + "</div>" : "") +
          (show && w.pos ? '<div class="vs-ipa">' + esc(w.pos) + "</div>" : "") +
          (show && w.example ? '<div class="vs-example">' + esc(w.example) + "</div>" : "") +
        "</div>" +
        '<div class="vs-card-actions">' +
          '<button type="button" data-vs-word-action="star" class="' + (w.starred ? "starred" : "") + '" aria-pressed="' + w.starred + '" title="Lưu từ cần ôn">' + ico("star") + "<span>" + (w.starred ? "Cần ôn" : "Lưu ôn") + "</span></button>" +
          '<button type="button" data-vs-word-action="known" class="' + (w.status === "known" ? "known" : "") + '" aria-pressed="' + (w.status === "known") + '">' + ico("check") + "<span>" + (w.status === "known" ? "Đã thuộc" : "Chưa thuộc") + "</span></button>" +
          '<button type="button" data-vs-word-action="speak" class="audio" title="Phát âm · S">' + ico("volume-2") + "</button>" +
          (w.custom ? '<button type="button" data-vs-word-action="edit" title="Sửa">' + ico("pencil") + '</button><button type="button" data-vs-word-action="delete" title="Xóa">' + ico("trash-2") + "</button>" : "") +
        "</div>" +
        '<div class="vs-card-deck"><select data-vs-move="' + esc(w.id) + '" aria-label="Chuyển bộ từ">' + deckOptions(w.deckId, false) + "</select></div>" +
      "</article>";
    }).join("") + (words.length > gridLimit ? '<button type="button" class="vs-load-more" data-vs-action="moreWords">Hiển thị thêm ' + Math.min(60, words.length - gridLimit) + " từ</button>" : "");
  }

  function flip(id) {
    focused = id;
    if (revealed.has(id)) revealed.delete(id);
    else revealed.add(id);
    renderGrid();
    const face = Array.from(document.querySelectorAll("[data-vs-flip]")).find(function (el) {
      return el.getAttribute("data-vs-flip") === id;
    });
    if (face) face.focus({ preventScroll: true });
  }

  function shuffle() {
    const ids = filteredWords().map(function (w) { return w.id; });
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
    }
    order = ids;
    renderGrid();
  }

  /* ===== MODULE: Safe Speech / Audio TTS (Zero Uncaught Promise Errors) ===== */
  let currentDictionaryAudio = null;

  function safeHTTPS(value) {
    try {
      const str = String(value || "").trim();
      if (!str) return "";
      const url = new URL(str.indexOf("//") === 0 ? "https:" + str : str);
      return url.protocol === "https:" ? url.href : "";
    } catch (e) {
      return "";
    }
  }

  function speakText(text) {
    const clean = String(text || "").trim();
    if (!clean) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      toast("Trình duyệt hiện tại chưa hỗ trợ đọc phát âm tự động (Web Speech API).", "warning");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      const voices = typeof window.speechSynthesis.getVoices === "function" ? window.speechSynthesis.getVoices() : [];
      const voice = voices.find(function (v) { return v && v.lang === "en-US"; });
      if (voice) utterance.voice = voice;
      utterance.onerror = function (e) {
        if (!e || ["interrupted", "canceled"].indexOf(e.error) === -1) {
          toast("Không phát âm được. Kiểm tra giọng đọc trên thiết bị.", "warning");
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      toast("Không thể kích hoạt giọng đọc trên trình duyệt này.", "warning");
    }
  }

  function speakWordRecord(word) {
    if (!word || !word.en) return;
    const url = safeHTTPS(word.audioUrl);
    if (url && typeof Audio !== "undefined") {
      try {
        if (currentDictionaryAudio) {
          try { currentDictionaryAudio.pause(); } catch (e) { /* */ }
        }
        if ("speechSynthesis" in window) {
          try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
        }
        const audio = new Audio(url);
        audio.playbackRate = 0.85;
        currentDictionaryAudio = audio;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {
            speakText(word.en);
          });
          return;
        }
        return;
      } catch (e) {
        speakText(word.en);
        return;
      }
    }
    speakText(word.en);
  }

  function speak(id) {
    const word = VocabStorageService.data.words.find(function (w) { return w.id === id && !w.deleted; });
    if (word) speakWordRecord(word);
  }

  /* ===== MODULE: Manual Word CRUD with Smart Duplicate Resolution ===== */
  function openWord(id) {
    const wordId = id || null;
    cancelLookup("modal");
    dictionaryViews.modal.result = null;
    dictionaryViews.modal.error = "";
    editingWord = wordId;
    const w = wordId ? VocabStorageService.data.words.find(function (x) { return x.id === wordId && x.custom; }) : null;
    if (wordId && !w) throw new Error("Chỉ sửa từ tự thêm");
    const form = $("vsWordForm");
    if (!form) return;
    form.reset();
    const titleEl = $("vsWordTitle");
    if (titleEl) titleEl.textContent = w ? "Sửa từ vựng" : "Thêm từ mới";
    const f = form.elements;
    f.deckId.innerHTML = deckOptions((w && w.deckId) || (deckFilter === "all" ? DEFAULT_DECK : deckFilter), false);
    ["en", "vi", "ipa", "pos", "example", "unit", "audioUrl"].forEach(function (key) {
      if (f[key]) f[key].value = (w && w[key]) || "";
    });
    const modal = $("vsWordModal");
    if (modal) modal.classList.remove("vs-hidden");
    if (f.en) f.en.focus();
  }

  function closeWordModal() {
    cancelLookup("modal");
    const modal = $("vsWordModal");
    if (modal) modal.classList.add("vs-hidden");
  }

  function saveWord(event) {
    if (event) event.preventDefault();
    const form = $("vsWordForm");
    if (!form) return;
    const f = form.elements;
    const patch = {};
    ["en", "vi", "ipa", "pos", "example", "unit", "deckId", "audioUrl"].forEach(function (key) {
      patch[key] = f[key] ? f[key].value.trim() : "";
    });
    if (!patch.en || !patch.vi) throw new Error("Vui lòng nhập từ và nghĩa");

    const duplicate = activeWords().find(function (w) {
      return w.id !== editingWord && (pair(w) === pair(patch) || wordEnKey(w) === wordEnKey(patch));
    });

    if (duplicate) {
      closeWordModal();
      askDuplicatePolicyModal(1, [patch.en], function (policy) {
        if (policy === "merge") {
          VocabStorageService.updateWord(duplicate.id, {
            en: patch.en,
            vi: patch.vi,
            ipa: patch.ipa || duplicate.ipa,
            pos: patch.pos || duplicate.pos,
            example: patch.example || duplicate.example,
            unit: patch.unit || duplicate.unit,
            deckId: patch.deckId || duplicate.deckId,
            audioUrl: patch.audioUrl || duplicate.audioUrl
          });
          toast("Đã ghi đè / cập nhật từ vựng “" + patch.en + "”", "success");
        } else {
          toast("Đã bỏ qua từ trùng lặp “" + patch.en + "”", "info");
        }
      });
      return;
    }

    if (editingWord) {
      VocabStorageService.updateWord(editingWord, patch);
    } else {
      VocabStorageService.commit(function (d) {
        d.words.push(wordSchema(Object.assign({}, patch, { id: uuid(), custom: true })));
      });
    }
    closeWordModal();
    toast(editingWord ? "Đã cập nhật từ" : "Đã thêm từ mới", "success");
  }

  /* ===== MODULE: Independent Decks CRUD & Cross-Deck Info ===== */
  function getOtherDecksForWord(enText, excludeDeckId) {
    const norm = String(enText || "").trim().toLowerCase();
    if (!norm) return [];
    const deckMap = {};
    activeDecks().forEach(function (d) { deckMap[d.id] = d.name; });
    const names = [];
    activeWords().forEach(function (w) {
      if (w.deckId !== excludeDeckId && String(w.en || "").trim().toLowerCase() === norm) {
        const dn = deckMap[w.deckId];
        if (dn && names.indexOf(dn) === -1) names.push(dn);
      }
    });
    return names;
  }

  function renderDecks() {
    const listEl = $("vsDeckList");
    if (!listEl) return;
    const decks = activeDecks();
    listEl.innerHTML = decks.map(function (d) {
      const cnt = activeWords().filter(function (w) { return w.deckId === d.id; }).length;
      return '<div class="vs-panel vs-deck-panel">' +
        '<span class="vs-deck-icon">' + ico("folder") + "</span>" +
        "<h2>" + esc(d.name) + "</h2>" +
        "<p>" + cnt + " t\u1eeb \u00b7 B\u1ed9 \u0111\u1ed9c l\u1eadp</p>" +
        '<div class="vs-row">' +
          '<button type="button" data-vs-study-deck="' + esc(d.id) + '">M\u1edf b\u1ed9 t\u1eeb ' + ico("arrow-up-right") + "</button>" +
          '<button type="button" class="vs-quiet vs-icon-btn" data-vs-rename-deck="' + esc(d.id) + '" title="\u0110\u1ed5i t\u00ean">' + ico("pencil") + "</button>" +
          (decks.length > 1 ? '<button type="button" class="vs-quiet vs-icon-btn vs-danger" data-vs-delete-deck="' + esc(d.id) + '" title="X\u00f3a">' + ico("trash-2") + "</button>" : "") +
        "</div>" +
      "</div>";
    }).join("");
  }

  function openDeck(id) {
    const deckId = id || null;
    editingDeck = deckId;
    const titleEl = $("vsDeckTitle");
    if (titleEl) titleEl.textContent = deckId ? "Đổi tên bộ từ" : "Tạo bộ từ";
    const form = $("vsDeckForm");
    if (!form) return;
    const deck = deckId ? VocabStorageService.data.decks.find(function (d) { return d.id === deckId; }) : null;
    form.elements.name.value = deck ? deck.name : "";
    const modal = $("vsDeckModal");
    if (modal) modal.classList.remove("vs-hidden");
    form.elements.name.focus();
  }

  function closeDeckModal() {
    const modal = $("vsDeckModal");
    if (modal) modal.classList.add("vs-hidden");
  }

  function saveDeck(event) {
    if (event) event.preventDefault();
    const form = $("vsDeckForm");
    if (!form) return;
    const name = form.elements.name.value.trim();
    if (!name) throw new Error("Hãy nhập tên bộ từ");
    if (activeDecks().some(function (d) { return d.id !== editingDeck && d.name.toLowerCase() === name.toLowerCase(); })) {
      throw new Error("Tên bộ từ đã tồn tại");
    }
    VocabStorageService.commit(function (d) {
      if (editingDeck) {
        const deck = d.decks.find(function (x) { return x.id === editingDeck; });
        if (deck) {
          deck.name = name;
          deck.updatedAt = Math.max(Date.now(), deck.updatedAt + 1);
        }
      } else {
        const now = Date.now();
        d.decks.push({ id: uuid(), name: name, createdAt: now, updatedAt: now, deleted: false });
      }
    });
    closeDeckModal();
    toast("Đã lưu bộ từ", "success");
  }

  function deleteDeck(id) {
    const remaining = activeDecks().filter(function (d) { return d.id !== id; });
    if (remaining.length === 0) throw new Error("C\u1ea7n gi\u1eef l\u1ea1i \u00edt nh\u1ea5t 1 b\u1ed9 t\u1eeb \u0111\u1ed9c l\u1eadp.");
    const fallbackDeck = remaining[0];
    const doDelete = function () {
      VocabStorageService.commit(function (d) {
        const deck = d.decks.find(function (x) { return x.id === id; });
        if (deck) {
          deck.deleted = true;
          deck.updatedAt = Math.max(Date.now(), deck.updatedAt + 1);
        }
        d.words.forEach(function (w) {
          if (w.deckId === id) {
            w.deckId = fallbackDeck.id;
            w.updatedAt = Math.max(Date.now(), w.updatedAt + 1);
          }
        });
      });
      if (deckFilter === id) deckFilter = "all";
      if (dictDeck === id) dictDeck = fallbackDeck.id;
      toast("\u0110\u00e3 x\u00f3a b\u1ed9 t\u1eeb; c\u00e1c th\u1ebb \u0111\u00e3 \u0111\u01b0\u1ee3c chuy\u1ec3n an to\u00e0n sang \"" + fallbackDeck.name + "\".", "info");
    };
    const msg = "X\u00f3a b\u1ed9 t\u1eeb n\u00e0y? C\u00e1c t\u1eeb b\u00ean trong s\u1ebd \u0111\u01b0\u1ee3c chuy\u1ec3n an to\u00e0n sang \"" + fallbackDeck.name + "\", kh\u00f4ng b\u1ecb x\u00f3a.";
    if (U() && typeof U().showConfirm === "function") {
      U().showConfirm("X\u00f3a b\u1ed9 t\u1eeb", msg, doDelete);
    } else if (confirm(msg)) {
      doDelete();
    }
  }

  /* ===== MODULE: Review Table & Print ===== */
  function reviewWords() {
    return activeWords().filter(function (w) {
      return w.starred && (printDeckFilter === "all" || w.deckId === printDeckFilter);
    });
  }

  function renderTable() {
    const area = $("vsPrintableArea");
    if (!area) return;
    const words = reviewWords();
    const hideEnEl = $("vsHideEn"), hideViEl = $("vsHideVi");
    const hideEn = !!(hideEnEl && hideEnEl.checked);
    const hideVi = !!(hideViEl && hideViEl.checked);

    area.innerHTML =
      '<div class="vs-print-title">Bảng dò bài · ' + words.length + " từ cần ôn</div>" +
      "<table><thead><tr><th>STT</th><th>Tiếng Anh</th><th>Tiếng Việt</th></tr></thead><tbody>" +
      (words.length ? words.map(function (w) {
        return '<tr><td class="vs-mono">' + numberOf(w) + "</td>" +
          ["en", "vi"].map(function (lang) {
            const key = w.id + ":" + lang;
            const hidden = (lang === "en" ? hideEn : hideVi) && !openCells.has(key);
            return '<td><button type="button" class="vs-cell-btn ' + (hidden ? "vs-covered" : "") + '" data-vs-cell="' + esc(key) + '">' +
              (hidden ? "••••••" : esc(w[lang])) + "</button></td>";
          }).join("") + "</tr>";
      }).join("") : '<tr><td colspan="3">Chưa có từ gắn sao trong bộ từ này.</td></tr>') +
      "</tbody></table>";
  }

  async function copyList() {
    const text = reviewWords().map(function (w) { return w.en + "\t" + w.vi; }).join("\n");
    if (!text) throw new Error("Chưa có từ để sao chép");
    if (U() && typeof U().copyText === "function") {
      U().copyText(text, "danh sách Anh–Việt");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Đã sao chép danh sách Anh–Việt", "success");
    } catch (e) {
      toast("Không thể sao chép tự động.", "warning");
    }
  }

  function printReviewTable() {
    document.body.classList.add("vs-printing-table");
    window.print();
    setTimeout(function () {
      document.body.classList.remove("vs-printing-table");
    }, 500);
  }

  /* ===== MODULE: Daily Stats, SM-2 & Flashcards 3D ===== */
  function recordStudy(data, correct, newWordId, today) {
    const curDay = today || localDay();
    const daily = data.stats.daily;
    const entry = daily[curDay] || { reviewed: 0, correct: 0, newWordIds: [] };
    entry.reviewed++;
    if (correct) entry.correct++;
    entry.newWordIds = Array.isArray(entry.newWordIds) ? entry.newWordIds : [];
    if (newWordId && entry.newWordIds.indexOf(newWordId) === -1) entry.newWordIds.push(newWordId);
    daily[curDay] = entry;
    Object.assign(data.stats, streakSummary(data.stats, curDay));
  }

  function isNewWord(w) {
    return w.status === "new" && w.srs.dueDate === null;
  }

  function isDueWord(w, today) {
    const curDay = today || localDay();
    return !!w.srs.dueDate && w.srs.dueDate <= curDay;
  }

  function reviewPlan(deck, today) {
    const dk = deck || "all";
    const curDay = today || localDay();
    const words = activeWords().filter(function (w) { return dk === "all" || w.deckId === dk; });
    const due = words.filter(function (w) { return isDueWord(w, curDay); }).sort(function (a, b) {
      return a.srs.dueDate.localeCompare(b.srs.dueDate) || a.createdAt - b.createdAt;
    });
    const fresh = words.filter(isNewWord);
    const used = new Set((VocabStorageService.data.stats.daily[curDay] && VocabStorageService.data.stats.daily[curDay].newWordIds) || []).size;
    const remaining = Math.max(0, VocabStorageService.data.settings.newWordsPerDay - used);
    const newWords = fresh.slice(0, remaining);
    return {
      due: due,
      fresh: fresh,
      newWords: newWords,
      remaining: remaining,
      ids: [].concat(due, newWords).map(function (w) { return w.id; })
    };
  }

  function renderDailyBanner() {
    const banner = $("vsDailyBanner");
    if (!banner) return;
    const plan = reviewPlan();
    banner.innerHTML =
      '<div><h2>Hôm nay cần ôn <span class="vs-mono">' + plan.ids.length + "</span> từ</h2>" +
      "<p>" + plan.due.length + " đến hạn · " + plan.fresh.length + " từ mới chưa học · " + plan.newWords.length + " từ mới trong phiên</p></div>" +
      '<button type="button" class="vs-primary" data-vs-action="reviewToday">' + ico("play") + "<span>Bắt đầu ôn</span></button>";
  }

  function scheduleGrade(word, grade, today, now) {
    const curDay = today || localDay();
    const ts = now || Date.now();
    if ([1, 2, 3].indexOf(grade) === -1) throw new Error("Đánh giá không hợp lệ");
    const s = Object.assign({}, word.srs);
    let starred = word.starred, starredAt = word.starredAt, status = "learning";
    if (grade === 1) {
      s.reps = 0;
      s.lapses++;
      s.ease = Math.max(1.3, s.ease - 0.2);
      s.interval = 0;
      starred = true;
      starredAt = Math.max(ts, word.starredAt + 1);
    } else if (grade === 2) {
      s.reps++;
      s.interval = s.reps === 1 ? 1 : (s.reps === 2 ? 3 : Math.round(s.interval * s.ease));
    } else {
      s.interval = Math.round(Math.max(s.interval, 1) * s.ease * 1.3);
      s.ease += 0.15;
      s.reps++;
      starred = false;
      starredAt = Math.max(ts, word.starredAt + 1);
      if (s.interval >= 21) status = "known";
    }
    s.dueDate = dayPlus(curDay, s.interval);
    return Object.assign({}, word, {
      srs: s,
      starred: starred,
      starredAt: starredAt,
      status: status,
      updatedAt: Math.max(ts, word.updatedAt + 1)
    });
  }

  let flashDeck = "all", flashMode = "scheduled", flashSession = null, gradeBusy = false;

  function flashCurrent() {
    if (!flashSession) return null;
    return VocabStorageService.data.words.find(function (w) {
      return w.id === flashSession.queue[0] && !w.deleted;
    });
  }

  function startFlash(mode, deck) {
    const m = mode || flashMode;
    const d = deck || flashDeck;
    if (VocabStorageService.blocked) throw new Error("Hãy khôi phục bộ nhớ trước khi bắt đầu học");
    flashMode = m;
    flashDeck = d;
    let ids;
    if (m === "scheduled") ids = reviewPlan(d).ids;
    else {
      ids = activeWords().filter(function (w) {
        return (d === "all" || w.deckId === d) && (m !== "starred" || w.starred);
      }).map(function (w) { return w.id; });
    }
    if (!ids.length) {
      toast(m === "scheduled" ? "Đã hết từ đến hạn hoặc đã đủ giới hạn từ mới hôm nay." : "Chưa có từ phù hợp để luyện", "info");
      navigate("flashcards");
      return;
    }
    flashSession = {
      mode: m,
      deck: d,
      queue: ids.slice(),
      initialIds: ids.slice(),
      done: [],
      attempts: 0,
      flipped: false
    };
    navigate("flashcards");
  }

  function exitFlash() {
    flashSession = null;
    if ("speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
    }
    renderFlash();
  }

  function flipFlash() {
    if (!flashSession || !flashSession.queue.length) return;
    flashSession.flipped = !flashSession.flipped;
    const stage = $("vsFlashFlip");
    if (!stage) return;
    stage.classList.toggle("flipped", flashSession.flipped);
    stage.setAttribute("aria-expanded", String(flashSession.flipped));
    const front = $("vsFlashFront"), back = $("vsFlashBack");
    if (front) front.setAttribute("aria-hidden", String(flashSession.flipped));
    if (back) back.setAttribute("aria-hidden", String(!flashSession.flipped));
    document.querySelectorAll(".vocab-studio-container [data-vs-grade]").forEach(function (b) {
      b.disabled = !flashSession.flipped;
    });
    if (flashSession.flipped) {
      const cur = flashCurrent();
      if (cur) speak(cur.id);
    }
  }

  function gradeFlash(grade) {
    if (gradeBusy || !flashSession || !flashSession.flipped) return;
    const w = flashCurrent();
    if (!w) { renderFlash(); return; }
    gradeBusy = true;
    try {
      const today = localDay();
      const graded = scheduleGrade(w, grade, today);
      const newId = flashSession.mode === "scheduled" && isNewWord(w) ? w.id : null;
      VocabStorageService.commit(function (d) {
        const i = d.words.findIndex(function (x) { return x.id === w.id; });
        if (i < 0 || d.words[i].deleted) throw new Error("Từ không còn trong bộ từ");
        d.words[i] = graded;
        recordStudy(d, grade !== 1, newId, today);
      });
      flashSession.queue.shift();
      if (grade === 1) {
        flashSession.queue.splice(Math.min(3, flashSession.queue.length), 0, w.id);
      } else if (flashSession.done.indexOf(w.id) === -1) {
        flashSession.done.push(w.id);
      }
      flashSession.attempts++;
      flashSession.flipped = false;
      if ("speechSynthesis" in window) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
      }
      renderFlash();
      renderDailyBanner();
      renderStats();
    } finally {
      gradeBusy = false;
    }
  }

  function renderFlash() {
    const contentEl = $("vsFlashContent");
    if (!contentEl) return;
    if (!activeDecks().some(function (d) { return d.id === flashDeck; })) flashDeck = "all";

    if (!flashSession) {
      const plan = reviewPlan(flashDeck);
      const count = flashMode === "scheduled"
        ? plan.ids.length
        : activeWords().filter(function (w) {
            return (flashDeck === "all" || w.deckId === flashDeck) && (flashMode !== "starred" || w.starred);
          }).length;
      contentEl.innerHTML =
        '<div class="vs-study-controls">' +
          '<label>Bộ từ<select id="vsFlashDeck">' + deckOptions(flashDeck) + "</select></label>" +
          '<label>Cách học<select id="vsFlashMode">' +
            '<option value="scheduled" ' + (flashMode === "scheduled" ? "selected" : "") + ">Ôn theo lịch (SM-2)</option>" +
            '<option value="free" ' + (flashMode === "free" ? "selected" : "") + ">Học tự do</option>" +
            '<option value="starred" ' + (flashMode === "starred" ? "selected" : "") + ">Chỉ từ gắn sao</option>" +
          "</select></label>" +
        "</div>" +
        '<div class="vs-panel vs-study-overview">' +
          '<div class="vs-eyebrow">' + (flashMode === "scheduled" ? "HÔM NAY CẦN ÔN" : (flashMode === "free" ? "KHÔNG THEO LỊCH" : "NHỮNG TỪ CẦN THÊM CHÚT THỜI GIAN")) + "</div>" +
          '<span class="vs-big-count vs-mono">' + count + "</span>" +
          "<h2>" + (flashMode === "scheduled" ? "từ trong phiên ôn hôm nay" : "từ sẵn sàng luyện tập") + "</h2>" +
          "<p>" + (flashMode === "scheduled"
            ? (plan.due.length + " từ đến hạn + " + plan.newWords.length + " từ mới.<br>Còn " + plan.fresh.length + " từ chưa học · Có thể học mới thêm " + plan.remaining + " từ hôm nay.")
            : "Luyện không giới hạn số từ mới. Lượt chấm vẫn cập nhật lịch ôn và thống kê.") + "</p>" +
          '<div class="vs-row"><button type="button" class="vs-primary" data-vs-action="startFlash" ' + (count ? "" : "disabled") + ">" + ico("play") + "<span>" + (flashMode === "scheduled" ? "Bắt đầu ôn" : "Bắt đầu học") + "</span></button></div>" +
          '<div class="vs-limits-note">Giới hạn ' + VocabStorageService.data.settings.newWordsPerDay + " từ mới/ngày · Chỉnh trong Cài đặt</div>" +
        "</div>";
      return;
    }

    const alive = new Set(activeWords().map(function (w) { return w.id; }));
    flashSession.queue = flashSession.queue.filter(function (id) { return alive.has(id); });
    flashSession.initialIds = flashSession.initialIds.filter(function (id) { return alive.has(id); });
    flashSession.done = flashSession.done.filter(function (id) { return alive.has(id); });
    const total = flashSession.initialIds.length, done = flashSession.done.length;

    if (!flashSession.queue.length) {
      contentEl.innerHTML =
        '<div class="vs-panel vs-finish">' +
          '<span class="vs-deck-icon">' + ico("check-check") + "</span>" +
          "<h2>Đã hoàn thành phiên học</h2>" +
          "<p>" + done + "/" + total + " từ hoàn tất · " + flashSession.attempts + " lượt chấm.<br>Lịch ôn và thống kê đã được lưu sau mỗi lượt.</p>" +
          '<div class="vs-row"><button type="button" class="vs-primary" data-vs-action="exitFlash">Về lịch ôn</button><button type="button" data-vs-action="showStats">Xem tiến độ</button></div>' +
        "</div>";
      return;
    }

    const w = flashCurrent();
    const viFirst = VocabStorageService.data.settings.direction === "vi-en";
    const isFlipped = flashSession.flipped;
    const next = [1, 2, 3].map(function (g) { return scheduleGrade(w, g); });

    contentEl.innerHTML =
      '<div class="vs-row vs-between vs-session-header">' +
        '<span><strong class="vs-mono">' + done + "/" + total + "</strong> từ hoàn tất · " + flashSession.attempts + " lượt chấm</span>" +
        '<div class="vs-row">' +
          '<button type="button" class="vs-quiet vs-icon-btn" data-vs-action="speakFlash" title="Phát âm · S">' + ico("volume-2") + "</button>" +
          '<button type="button" class="vs-quiet" data-vs-action="exitFlash">Thoát phiên</button>' +
        "</div>" +
      "</div>" +
      '<div class="vs-progress-track"><div class="vs-progress-fill" style="width:' + (total ? (done / total * 100) : 0) + '%"></div></div>' +
      '<button type="button" id="vsFlashFlip" class="vs-flash-stage ' + (isFlipped ? "flipped" : "") + '" data-vs-action="flipFlash" aria-expanded="' + isFlipped + '">' +
        '<span class="vs-flash-inner">' +
          '<span class="vs-flash-face vs-flash-front" id="vsFlashFront" aria-hidden="' + isFlipped + '">' +
            '<span class="vs-flash-label">' + (viFirst ? "TIẾNG VIỆT" : "TIẾNG ANH") + "</span>" +
            '<span class="vs-flash-word">' + esc(viFirst ? w.vi : w.en) + "</span>" +
            (!viFirst && w.ipa ? '<span class="vs-flash-ipa vs-mono">' + esc(w.ipa) + "</span>" : "") +
            '<span class="vs-flash-help">Chạm thẻ hoặc nhấn Space để lật</span>' +
          "</span>" +
          '<span class="vs-flash-face vs-flash-back" id="vsFlashBack" aria-hidden="' + (!isFlipped) + '">' +
            '<span class="vs-flash-label">ĐÁP ÁN</span>' +
            '<span class="vs-flash-word">' + esc(viFirst ? w.en : w.vi) + "</span>" +
            (w.ipa ? '<span class="vs-flash-ipa vs-mono">' + esc(w.ipa) + "</span>" : "") +
            (w.pos ? '<span class="vs-pill">' + esc(w.pos) + "</span>" : "") +
            (w.example ? '<span class="vs-flash-example">' + esc(w.example) + "</span>" : "") +
            '<span class="vs-flash-help">' + esc(w.en) + " · Tự đánh giá mức độ ghi nhớ bên dưới</span>" +
          "</span>" +
        "</span>" +
      "</button>" +
      '<div class="vs-ratings">' +
        '<button type="button" class="vs-again" data-vs-grade="1" ' + (isFlipped ? "" : "disabled") + '><span><kbd>1</kbd> Học lại</span><small>Học lại trong phiên</small></button>' +
        '<button type="button" data-vs-grade="2" ' + (isFlipped ? "" : "disabled") + '><span><kbd>2</kbd> Nhớ được</span><small>' + next[1].srs.interval + " ngày</small></button>" +
        '<button type="button" class="vs-easy" data-vs-grade="3" ' + (isFlipped ? "" : "disabled") + '><span><kbd>3</kbd> Rất dễ</span><small>' + next[2].srs.interval + " ngày · Gỡ sao</small></button>" +
      "</div>" +
      '<div class="vs-session-footer"><kbd>Space</kbd> lật thẻ &nbsp; <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> đánh giá &nbsp; <kbd>S</kbd> phát âm</div>';
  }

  /* ===== MODULE: Quiz Center ===== */
  const quizConfig = { source: "all", deck: "all", count: "10", type: "mcq", listenStyle: "choice" };
  let quizSession = null;

  function randomOrder(items) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  function cleanAnswer(text) {
    return String(text || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function answerVariants(text) {
    return Array.from(new Set([cleanAnswer(text)].concat(String(text || "").split("/").map(cleanAnswer)).filter(Boolean)));
  }

  function matchesAnswer(input, answer) {
    return answerVariants(answer).indexOf(cleanAnswer(input)) !== -1;
  }

  function quizAnswer(word, direction) {
    return direction === "vi-en" ? word.en : word.vi;
  }

  function makeQuestion(word, direction, choiceMode) {
    const answer = quizAnswer(word, direction);
    const accepted = answerVariants(answer);
    let options = [];
    if (choiceMode) {
      const used = new Set(accepted);
      const wrongs = [];
      const candidates = randomOrder(activeWords());
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (candidate.id === word.id) continue;
        const text = quizAnswer(candidate, direction);
        const variants = answerVariants(text);
        if (variants.some(function (s) { return used.has(s); })) continue;
        wrongs.push(text);
        variants.forEach(function (s) { used.add(s); });
        if (wrongs.length === 3) break;
      }
      if (wrongs.length < 3) {
        throw new Error("Kho từ cần ít nhất 4 đáp án khác nhau cho trắc nghiệm. Hãy chọn chế độ viết hoặc thêm từ.");
      }
      options = randomOrder([{ text: answer, correct: true }].concat(wrongs.map(function (text) {
        return { text: text, correct: false };
      })));
    }
    return { id: word.id, word: clone(word), answer: answer, options: options };
  }

  /* ===== MODULE: Smart Master Review (Deduplicated Multi-Deck Pool) & Two-Tier AI Semantic Grading ===== */
  const smartReviewState = {
    selectedDecks: [], // array of deckIds; empty = all active decks
    syncedKeys: new Set() // idempotency guard: sessionId:normalizedWord
  };

  function buildDeduplicatedReviewPool(selectedDeckIds) {
    const decks = activeDecks();
    const deckMap = {};
    decks.forEach(function (d) { deckMap[d.id] = d.name; });
    const ids = Array.isArray(selectedDeckIds) && selectedDeckIds.length > 0
      ? selectedDeckIds
      : decks.map(function (d) { return d.id; });
    const idSet = new Set(ids);

    const rawWords = activeWords().filter(function (w) { return idSet.has(w.deckId); });
    const byNorm = {};
    const order = [];

    rawWords.forEach(function (w) {
      const norm = String(w.en || "").trim().toLowerCase();
      if (!norm) return;
      const copyRef = { deckId: w.deckId, deckName: deckMap[w.deckId] || w.deckId, wordId: w.id };
      if (!byNorm[norm]) {
        byNorm[norm] = {
          id: w.id,
          normalizedKey: norm,
          en: w.en,
          viList: w.vi ? [w.vi] : [],
          exampleList: w.example ? [w.example] : [],
          posList: w.pos ? [w.pos] : [],
          ipa: w.ipa || "",
          audioUrl: w.audioUrl || "",
          deckId: w.deckId,
          starred: !!w.starred,
          sourceCopies: [copyRef]
        };
        order.push(norm);
      } else {
        const entry = byNorm[norm];
        entry.sourceCopies.push(copyRef);
        if (w.vi && entry.viList.indexOf(w.vi) === -1) entry.viList.push(w.vi);
        if (w.example && entry.exampleList.indexOf(w.example) === -1) entry.exampleList.push(w.example);
        if (w.pos && entry.posList.indexOf(w.pos) === -1) entry.posList.push(w.pos);
        if (!entry.ipa && w.ipa) entry.ipa = w.ipa;
        if (!entry.audioUrl && w.audioUrl) entry.audioUrl = w.audioUrl;
        if (w.starred) entry.starred = true;
      }
    });

    const pool = order.map(function (norm) {
      const e = byNorm[norm];
      return {
        id: e.id,
        normalizedKey: e.normalizedKey,
        en: e.en,
        vi: e.viList.join(" / "),
        example: e.exampleList.join(" | "),
        pos: e.posList.join(", "),
        ipa: e.ipa,
        audioUrl: e.audioUrl,
        deckId: e.deckId,
        starred: e.starred,
        sourceCopies: e.sourceCopies,
        mergedCount: e.sourceCopies.length
      };
    });

    const mergedDuplicates = Math.max(0, rawWords.length - pool.length);
    return {
      pool: pool,
      rawCount: rawWords.length,
      uniqueCount: pool.length,
      mergedDuplicates: mergedDuplicates,
      summary: mergedDuplicates > 0
        ? (rawWords.length + " th\u1ebb t\u1eeb " + ids.length + " b\u1ed9 \u0111\u01b0\u1ee3c g\u1ed9p th\u00e0nh " + pool.length + " t\u1eeb duy nh\u1ea5t (\u0111\u00e3 kh\u1eed " + mergedDuplicates + " tr\u00f9ng l\u1eb7p).")
        : (pool.length + " t\u1eeb duy nh\u1ea5t t\u1eeb " + ids.length + " b\u1ed9 t\u1eeb.")
    };
  }

  function syncMasteryToCopies(sessionId, card, isCorrect, allowOverride) {
    if (!card) return false;
    const norm = card.normalizedKey || String(card.en || "").trim().toLowerCase();
    const guardKey = String(sessionId || "s") + ":" + norm + (allowOverride ? ":override" : "");
    if (smartReviewState.syncedKeys.has(guardKey)) return false;
    smartReviewState.syncedKeys.add(guardKey);

    const copyIds = Array.isArray(card.sourceCopies) && card.sourceCopies.length > 0
      ? card.sourceCopies.map(function (c) { return c.wordId; })
      : [card.id];
    const idSet = new Set(copyIds);

    VocabStorageService.commit(function (d) {
      let updatedAny = false;
      const today = localDay();
      d.words.forEach(function (w, idx) {
        if (!w || w.deleted || !idSet.has(w.id)) return;
        const graded = scheduleGrade(w, isCorrect ? 3 : 1, today);
        if (isCorrect && allowOverride) graded.starred = false;
        d.words[idx] = graded;
        updatedAny = true;
      });
      if (updatedAny && !allowOverride) recordStudy(d, isCorrect);
    });
    return true;
  }

  function logVocabMistakeToNotebook(q, userResponse, feedbackText) {
    try {
      if (!U() || !U().KEYS || !U().KEYS.mistakes) return;
      const mk = U().loadObj(U().KEYS.mistakes);
      const key = "vocab_" + String((q.word && q.word.en) || q.id || Date.now()).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      mk[key] = {
        id: key,
        deckId: "vocab_studio",
        deckTitle: "Vocab Studio",
        text: (q.word ? (q.word.en + " — " + q.word.vi) : q.answer),
        options: [q.answer, userResponse || "(Tr\u1ed1ng)"],
        correct: [0],
        explanation: feedbackText || ("B\u1ea1n tr\u1ea3 l\u1eddi: \"" + userResponse + "\". \u0110\u00e1p \u00e1n chu\u1ea9n: " + q.answer),
        wrongCount: ((mk[key] && mk[key].wrongCount) || 0) + 1,
        lastWrongAt: new Date().toISOString()
      };
      U().saveJSON(U().KEYS.mistakes, mk);
    } catch (e) { /* ignore */ }
  }

  /* Tier 1 – Exact Match (0 LLM tokens, preserves meaningful grammatical distinctions) */
  function gradeTier1Exact(userInput, expectedRaw) {
    const cleanUser = String(userInput || "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
    const expectedStr = String(expectedRaw || "").trim();
    const variants = expectedStr.split(/[\/|;]/).map(function (v) {
      return v.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
    }).filter(Boolean);
    const exact = !!cleanUser && variants.indexOf(cleanUser) !== -1;
    if (exact) {
      return {
        tier: 1,
        status: "CORRECT",
        score: 100,
        feedback: "Ch\u00ednh x\u00e1c tuy\u1ec7t \u0111\u1ed1i (Tier 1 Exact Match \u2022 0 token).",
        expected_answer: expectedStr
      };
    }
    return null;
  }

  /* Tier 2 – Semantic AI Evaluation (temperature: 0.1, validated JSON 0-100) */
  async function gradeTier2Semantic(userInput, expectedRaw, direction, wordObj) {
    const expectedStr = String(expectedRaw || "").trim();
    const lang = (U() && U().state && U().state.lang) || "vi";
    const langName = lang === "en" ? "English" : (lang === "ja" ? "Japanese" : "Vietnamese");
    const prompt =
      "Evaluate the student's vocabulary quiz answer.\n" +
      "Direction: " + direction + "\n" +
      "Prompt word: " + (direction === "vi-en" ? (wordObj && wordObj.vi || "") : (wordObj && wordObj.en || "")) + "\n" +
      "Reference answer: " + expectedStr + "\n" +
      "Student answer: " + String(userInput || "").trim() + "\n\n" +
      "Rules:\n" +
      "- Accept valid synonyms or semantically equivalent phrasing.\n" +
      "- Distinguish minor spelling mistakes (PARTIAL, 60-85) from meaning-changing errors (INCORRECT, 0-40).\n" +
      "- Return STRICT JSON ONLY matching this exact schema:\n" +
      '{"status":"CORRECT|PARTIAL|INCORRECT","score":0,"feedback":"1-2 sentence explanation in ' + langName + '","expected_answer":"' + expectedStr.replace(/"/g, '\\"') + '"}';

    try {
      const u = U() && U().state && U().state.user;
      const hdr = { "Content-Type": "application/json" };
      if (u && u.email) hdr["X-User-Email"] = u.email;
      if (u && u.credential) hdr["Authorization"] = "Bearer " + u.credential;

      const res = await fetch("/api/ai/proxy", {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({
          provider: "gemini",
          model: "gemini-2.5-flash",
          stream: false,
          payload: {
            systemInstruction: { parts: [{ text: "You are a strict, fair bilingual language grading engine. Output valid JSON only." }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 256 }
          }
        })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const rawText = (data && data.text) ||
        (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ||
        (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
      const jsonMatch = String(rawText).match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid JSON");
      const parsed = JSON.parse(jsonMatch[0]);
      const validStatuses = ["CORRECT", "PARTIAL", "INCORRECT"];
      const status = validStatuses.indexOf(String(parsed.status || "").toUpperCase()) !== -1
        ? String(parsed.status).toUpperCase()
        : "INCORRECT";
      const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || (status === "CORRECT" ? 100 : (status === "PARTIAL" ? 65 : 0)))));
      const feedback = typeof parsed.feedback === "string" && parsed.feedback.trim()
        ? parsed.feedback.trim().slice(0, 320)
        : (status === "CORRECT" ? "Ch\u00ednh x\u00e1c v\u1ec1 m\u1eb7t ng\u1eef ngh\u0129a." : "\u0110\u00e1p \u00e1n ch\u01b0a kh\u1edbp ng\u1eef ngh\u0129a.");
      const expected_answer = typeof parsed.expected_answer === "string" && parsed.expected_answer.trim()
        ? parsed.expected_answer.trim()
        : expectedStr;
      return { tier: 2, status: status, score: score, feedback: feedback, expected_answer: expected_answer };
    } catch (err) {
      // Safe fallback without fabricating an AI semantic evaluation
      return {
        tier: 1,
        status: "INCORRECT",
        score: 0,
        feedback: "AI ch\u1ea5m ng\u1eef ngh\u0129a t\u1ea1m kh\u00f4ng kh\u1ea3 d\u1ee5ng \u2014 \u0111\u00e3 \u0111\u1ed1i chi\u1ebfu theo \u0111\u00e1p \u00e1n chu\u1ea9n.",
        expected_answer: expectedStr,
        fallback: true
      };
    }
  }

  function quizPool() {
    if (quizConfig.source === "smart") {
      return buildDeduplicatedReviewPool(smartReviewState.selectedDecks).pool;
    }
    return activeWords().filter(function (w) {
      return (quizConfig.deck === "all" || w.deckId === quizConfig.deck) && (quizConfig.source !== "starred" || w.starred);
    });
  }

  function startQuiz(retry) {
    if (VocabStorageService.blocked) throw new Error("H\u00e3y kh\u00f4i ph\u1ee5c b\u1ed9 nh\u1edb tr\u01b0\u1edbc khi b\u1eaft \u0111\u1ea7u ki\u1ec3m tra");
    let pool, direction, type, listenStyle, dedupSummary = "";
    if (retry && quizSession) {
      const ids = new Set(quizSession.records.filter(function (r) { return !r.correct; }).map(function (r) { return r.id; }));
      pool = activeWords().filter(function (w) { return ids.has(w.id); });
      direction = quizSession.direction;
      type = quizSession.type;
      listenStyle = quizSession.listenStyle;
    } else {
      if (quizConfig.source === "deck" && quizConfig.deck === "all") throw new Error("H\u00e3y ch\u1ecdn m\u1ed9t b\u1ed9 t\u1eeb \u0111\u1ec3 ki\u1ec3m tra");
      if (quizConfig.source === "smart") {
        const res = buildDeduplicatedReviewPool(smartReviewState.selectedDecks);
        pool = res.pool;
        dedupSummary = res.summary;
      } else {
        pool = quizPool();
      }
      direction = VocabStorageService.data.settings.direction;
      type = quizConfig.type;
      listenStyle = quizConfig.listenStyle;
    }
    const requested = retry ? pool.length : (quizConfig.count === "all" ? pool.length : Number(quizConfig.count));
    pool = randomOrder(pool).slice(0, requested);
    if (!pool.length) throw new Error("Ch\u01b0a c\u00f3 t\u1eeb ph\u00f9 h\u1ee3p trong ngu\u1ed3n \u0111\u00e3 ch\u1ecdn");
    const choiceMode = type === "mcq" || (type === "listening" && listenStyle === "choice");
    const questions = pool.map(function (w) { return makeQuestion(w, direction, choiceMode); });
    quizSession = {
      sessionId: "vsess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      direction: direction,
      type: type,
      listenStyle: listenStyle,
      dedupSummary: dedupSummary,
      questions: questions,
      index: 0,
      records: [],
      feedback: null,
      gradingBusy: false,
      draft: ""
    };
    renderQuiz();
    queueQuizSpeech();
  }

  function quizCurrent() {
    return quizSession ? quizSession.questions[quizSession.index] : null;
  }

  function queueQuizSpeech() {
    const q = quizCurrent(), session = quizSession;
    if (!q || !session || session.type !== "listening" || session.feedback || page !== "quiz") return;
    setTimeout(guard(function () {
      if (page === "quiz" && quizSession === session && quizCurrent() === q && !session.feedback) {
        speak(q.id);
      }
    }), 120);
  }

  async function submitQuiz(input, choiceIndex) {
    const s = quizSession, q = quizCurrent();
    if (!s || !q || s.feedback || s.gradingBusy) return;
    const choiceMode = s.type === "mcq" || (s.type === "listening" && s.listenStyle === "choice");
    if (!choiceMode && !String(input || "").trim()) {
      toast("H\u00e3y nh\u1eadp c\u00e2u tr\u1ea3 l\u1eddi tr\u01b0\u1edbc khi ch\u1ea5m", "warning");
      return;
    }
    if (choiceMode && (!Number.isInteger(choiceIndex) || !q.options[choiceIndex])) {
      throw new Error("\u0110\u00e1p \u00e1n kh\u00f4ng h\u1ee3p l\u1ec7");
    }

    const answer = choiceMode ? q.options[choiceIndex].text : String(input).trim();
    let gradeRes;
    if (choiceMode) {
      const ok = !!q.options[choiceIndex].correct;
      gradeRes = { tier: 1, status: ok ? "CORRECT" : "INCORRECT", score: ok ? 100 : 0, feedback: ok ? "Ch\u00ednh x\u00e1c!" : "Ch\u01b0a \u0111\u00fang.", expected_answer: q.answer };
    } else {
      gradeRes = gradeTier1Exact(answer, q.answer);
      if (!gradeRes) {
        s.gradingBusy = true;
        renderQuiz();
        gradeRes = await gradeTier2Semantic(answer, q.answer, s.direction, q.word);
        s.gradingBusy = false;
        if (quizSession !== s) return;
      }
    }

    const isCorrect = gradeRes.status === "CORRECT";
    syncMasteryToCopies(s.sessionId, q.word, isCorrect, false);
    if (gradeRes.status === "INCORRECT") {
      logVocabMistakeToNotebook(q, answer, gradeRes.feedback);
    }

    s.feedback = {
      correct: isCorrect,
      status: gradeRes.status,
      score: gradeRes.score,
      tier: gradeRes.tier,
      explanation: gradeRes.feedback,
      expectedAnswer: gradeRes.expected_answer || q.answer,
      answer: answer,
      choiceIndex: choiceIndex
    };
    s.records.push({
      id: q.id,
      word: q.word,
      question: s.type === "listening" ? ("Nghe: " + q.word.en) : (s.direction === "vi-en" ? q.word.vi : q.word.en),
      answer: q.answer,
      response: answer,
      status: gradeRes.status,
      score: gradeRes.score,
      correct: isCorrect
    });
    renderQuiz();
    renderStats();
    renderDailyBanner();
    const nextBtn = $("vsQuizNext");
    if (nextBtn) nextBtn.focus({ preventScroll: true });
  }

  function acceptPartialAnswer() {
    const s = quizSession, q = quizCurrent();
    if (!s || !q || !s.feedback || s.feedback.status !== "PARTIAL") return;
    s.feedback.status = "CORRECT";
    s.feedback.correct = true;
    s.feedback.score = 100;
    s.feedback.explanation = "\u0110\u00e3 ch\u1ea5p nh\u1eadn l\u00e0 \u0110\u00fang (Override) v\u00e0 \u0111\u1ed3ng b\u1ed9 ti\u1ebfn \u0111\u1ed9.";
    const lastRec = s.records[s.records.length - 1];
    if (lastRec && lastRec.id === q.id) {
      lastRec.status = "CORRECT";
      lastRec.correct = true;
      lastRec.score = 100;
    }
    syncMasteryToCopies(s.sessionId, q.word, true, true);
    renderQuiz();
    renderStats();
    toast("\u0110\u00e3 ch\u1ea5p nh\u1eadn c\u00e2u tr\u1ea3 l\u1eddi l\u00e0 \u0110\u00fang!", "success");
  }

  function planQuizDirection(direction) {
    const s = quizSession;
    if (!s || s.index >= s.questions.length) return null;
    if (s.feedback) return { pending: direction };
    const choice = s.type === "mcq" || (s.type === "listening" && s.listenStyle === "choice");
    return {
      direction: direction,
      questions: s.questions.map(function (q, i) {
        return i < s.index ? q : makeQuestion(q.word, direction, choice);
      })
    };
  }

  function applyQuizDirection(plan) {
    if (!plan || !quizSession) return;
    if (plan.pending) {
      quizSession.pendingDirection = plan.pending;
      return;
    }
    quizSession.direction = plan.direction;
    quizSession.questions = plan.questions;
    quizSession.pendingDirection = null;
    quizSession.draft = "";
    renderQuiz();
    queueQuizSpeech();
  }

  function nextQuiz() {
    if (!quizSession || !quizSession.feedback) return;
    quizSession.index++;
    quizSession.feedback = null;
    quizSession.draft = "";
    if (quizSession.pendingDirection) {
      applyQuizDirection(planQuizDirection(quizSession.pendingDirection));
    }
    if ("speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
    }
    renderQuiz();
    queueQuizSpeech();
    if (quizSession.type !== "listening") {
      const inp = $("vsQuizInput");
      if (inp) inp.focus({ preventScroll: true });
    }
  }

  function exitQuiz() {
    quizSession = null;
    if ("speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
    }
    renderQuiz();
  }

  function renderQuiz() {
    const contentEl = $("vsQuizContent");
    if (!contentEl) return;
    if (!activeDecks().some(function (d) { return d.id === quizConfig.deck; })) quizConfig.deck = "all";

    if (!quizSession) {
      contentEl.innerHTML =
        '<div class="vs-panel"><div class="vs-quiz-setup">' +
          '<label>Hình thức<select id="vsQuizType">' +
            '<option value="mcq" ' + (quizConfig.type === "mcq" ? "selected" : "") + ">Trắc nghiệm · 4 đáp án</option>" +
            '<option value="typing" ' + (quizConfig.type === "typing" ? "selected" : "") + ">Gõ chính tả / nghĩa</option>" +
            '<option value="listening" ' + (quizConfig.type === "listening" ? "selected" : "") + ">Nghe chọn / Nghe viết</option>" +
          "</select></label>" +
          '<label>Chiều hỏi<select id="vsQuizDirection">' +
            '<option value="vi-en" ' + (VocabStorageService.data.settings.direction === "vi-en" ? "selected" : "") + ">Việt → Anh</option>" +
            '<option value="en-vi" ' + (VocabStorageService.data.settings.direction === "en-vi" ? "selected" : "") + ">Anh → Việt</option>" +
          "</select></label>" +
          '<label>Ngu\u1ed3n c\u00e2u h\u1ecfi<select id="vsQuizSource">' +
            '<option value="all" ' + (quizConfig.source === "all" ? "selected" : "") + ">T\u1ea5t c\u1ea3</option>" +
            '<option value="smart" ' + (quizConfig.source === "smart" ? "selected" : "") + ">⚡ Smart Master Review (\u0110a b\u1ed9 t\u1eeb \u2022 Kh\u1eed tr\u00f9ng)</option>" +
            '<option value="starred" ' + (quizConfig.source === "starred" ? "selected" : "") + ">T\u1eeb c\u1ea7n \u00f4n \u00b7 G\u1eafn sao</option>" +
            '<option value="deck" ' + (quizConfig.source === "deck" ? "selected" : "") + ">Theo 1 b\u1ed9 t\u1eeb</option>" +
          "</select></label>" +
          (quizConfig.source === "smart"
            ? '<div class="vs-wide" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;border:1px solid var(--vs-border, #e2e8f0);border-radius:10px">' +
                '<span class="vs-muted" style="width:100%;font-size:12px;font-weight:700">Ch\u1ecdn nhi\u1ec1u b\u1ed9 t\u1eeb cho Smart Master Review (\u0111\u1ec3 tr\u1ed1ng = t\u1ea5t c\u1ea3):</span>' +
                activeDecks().map(function (dk) {
                  const checked = smartReviewState.selectedDecks.indexOf(dk.id) !== -1;
                  return '<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:4px 8px;border-radius:8px;background:var(--vs-surface2, #f8fafc);cursor:pointer">' +
                    '<input type="checkbox" data-vs-smart-deck="' + esc(dk.id) + '"' + (checked ? " checked" : "") + '> ' + esc(dk.name) + '</label>';
                }).join("") +
              '</div>'
            : '<label>B\u1ed9 t\u1eeb<select id="vsQuizDeck">' + deckOptions(quizConfig.deck) + "</select></label>") +
          '<label>S\u1ed1 c\u00e2u<select id="vsQuizCount">' +
            ["10", "20", "all"].map(function (v) {
              return '<option value="' + v + '" ' + (quizConfig.count === v ? "selected" : "") + ">" + (v === "all" ? "T\u1ea5t c\u1ea3" : v + " c\u00e2u") + "</option>";
            }).join("") +
          "</select></label>" +
          (quizConfig.type === "listening"
            ? '<label>C\u00e1ch tr\u1ea3 l\u1eddi khi nghe<select id="vsQuizListenStyle">' +
                '<option value="choice" ' + (quizConfig.listenStyle === "choice" ? "selected" : "") + ">Nghe ch\u1ecdn \u00b7 4 \u0111\u00e1p \u00e1n</option>" +
                '<option value="write" ' + (quizConfig.listenStyle === "write" ? "selected" : "") + ">Nghe vi\u1ebft</option>" +
              "</select></label>"
            : "") +
          '<div class="vs-wide vs-setup-note">' +
            (quizConfig.source === "smart"
              ? esc(buildDeduplicatedReviewPool(smartReviewState.selectedDecks).summary)
              : (quizPool().length + " t\u1eeb trong ngu\u1ed3n \u00b7 Ch\u1ea5m \u0111i\u1ec3m 2 t\u1ea7ng (Exact Match + AI Semantic).")) +
          '</div>' +
          '<button type="button" class="vs-primary vs-wide" data-vs-action="startQuiz">' + ico("play") + "<span>Bắt đầu kiểm tra</span></button>" +
        "</div></div>";
      return;
    }

    const s = quizSession, total = s.questions.length;
    const correct = s.records.filter(function (r) { return r.correct; }).length;
    if (s.index >= total) {
      const wrong = s.records.filter(function (r) { return !r.correct; });
      contentEl.innerHTML =
        '<div class="vs-panel vs-finish">' +
          '<div class="vs-eyebrow">BÀI KIỂM TRA HOÀN TẤT</div>' +
          '<div class="vs-score-number vs-mono">' + correct + "/" + total + "</div>" +
          "<h2>" + Math.round(correct / total * 100) + "% chính xác</h2>" +
          "<p>" + (wrong.length ? "Các câu sai đã được gắn sao để bạn luyện lại." : "Bạn đã trả lời đúng tất cả các câu.") + "</p>" +
          '<div class="vs-row">' +
            (wrong.length ? '<button type="button" class="vs-primary" data-vs-action="retryQuiz">Luyện lại các câu sai</button>' : "") +
            '<button type="button" data-vs-action="exitQuiz">Tạo bài kiểm tra mới</button>' +
          "</div>" +
        "</div>" +
        (wrong.length ? '<div class="vs-panel vs-wrong-list"><h2>Các câu cần luyện lại</h2>' + wrong.map(function (r) {
          return '<div class="vs-wrong-item"><strong>' + esc(r.question) + "</strong><p>Bạn trả lời: " + esc(r.response) + "</p><p>Đáp án: <strong>" + esc(r.answer) + "</strong></p></div>";
        }).join("") + "</div>" : "");
      return;
    }

    const q = quizCurrent();
    const listening = s.type === "listening";
    const choiceMode = s.type === "mcq" || (listening && s.listenStyle === "choice");
    const f = s.feedback;
    const hint = q.answer.split("/")[0].trim();

    contentEl.innerHTML =
      '<div class="vs-row vs-between vs-session-header">' +
        '<span>Câu <strong class="vs-mono">' + (s.index + 1) + "/" + total + "</strong> · " + (s.direction === "vi-en" ? "Việt → Anh" : "Anh → Việt") + "</span>" +
        '<button type="button" class="vs-quiet" data-vs-action="exitQuiz">Thoát bài</button>' +
      "</div>" +
      '<div class="vs-progress-track"><div class="vs-progress-fill" style="width:' + (s.index / total * 100) + '%"></div></div>' +
      '<div class="vs-panel vs-quiz-prompt">' +
        (listening
          ? '<span class="vs-audio-orb">' + ico("volume-2") + "</span><h2>Nghe và " + (choiceMode ? "chọn" : "viết") + " " + (s.direction === "vi-en" ? "từ tiếng Anh" : "nghĩa tiếng Việt") + '</h2><p class="vs-muted">Nội dung được đọc bằng tiếng Anh.</p><button type="button" style="margin-top:14px" data-vs-action="speakQuiz">' + ico("volume-2") + "<span>Nghe lại</span></button>"
          : '<div class="vs-eyebrow">' + (s.direction === "vi-en" ? "TỪ TIẾNG ANH LÀ GÌ?" : "NGHĨA TIẾNG VIỆT LÀ GÌ?") + "</div><h2>" + esc(s.direction === "vi-en" ? q.word.vi : q.word.en) + "</h2>" +
            (!choiceMode ? '<p class="vs-muted" style="font-size:12px">Gợi ý: ' + Array.from(hint).length + " ký tự · Bắt đầu bằng “" + esc(Array.from(hint)[0] || "") + "”</p>" : "")) +
      "</div>" +
      (choiceMode
        ? '<div class="vs-choices">' + q.options.map(function (o, i) {
            const cls = f ? (o.correct ? "correct" : (f.choiceIndex === i ? "incorrect" : "")) : "";
            return '<button type="button" class="vs-choice ' + cls + '" data-vs-quiz-choice="' + i + '" ' + (f ? "disabled" : "") + '><span class="vs-mono">' + String.fromCharCode(65 + i) + ".</span><span>" + esc(o.text) + "</span></button>";
          }).join("") + "</div>"
        : '<form id="vsQuizAnswerForm" class="vs-write-form"><input id="vsQuizInput" value="' + esc(s.draft) + '" placeholder="Nh\u1eadp ' + (s.direction === "vi-en" ? "t\u1eeb ti\u1ebfng Anh" : "ngh\u0129a ti\u1ebfng Vi\u1ec7t") + '\u2026" autocomplete="off" maxlength="1000" ' + (f || s.gradingBusy ? "disabled" : "") + '><button class="vs-primary" type="submit" ' + (f || s.gradingBusy ? "disabled" : "") + ">" + (s.gradingBusy ? "🤖 AI \u0111ang ch\u1ea5m ng\u1eef ngh\u0129a\u2026" : "Ch\u1ea5m c\u00e2u tr\u1ea3 l\u1eddi") + "</button></form>") +
      (f
        ? (function () {
            const st = f.status || (f.correct ? "CORRECT" : "INCORRECT");
            const cls = st === "CORRECT" ? "vs-grade-correct" : (st === "PARTIAL" ? "vs-grade-partial" : "wrong vs-grade-incorrect");
            const heading = st === "CORRECT"
              ? ("✅ CORRECT (" + (f.score != null ? f.score : 100) + "/100)")
              : (st === "PARTIAL"
                ? ("🟡 PARTIAL (" + (f.score != null ? f.score : 65) + "/100)")
                : ("❌ INCORRECT (" + (f.score != null ? f.score : 0) + "/100) \u00b7 \u0110\u00e3 l\u01b0u S\u1ed5 tay sai"));
            return '<div class="vs-feedback ' + cls + '" role="status">' +
              '<strong>' + heading + '</strong>' +
              (f.explanation ? '<p style="margin:4px 0">' + esc(f.explanation) + '</p>' : '') +
              '<p>\u0110\u00e1p \u00e1n chu\u1ea9n: <strong>' + esc(f.expectedAnswer || q.answer) + '</strong></p>' +
              '<div class="vs-row" style="margin-top:8px;gap:8px;flex-wrap:wrap">' +
                (st === "PARTIAL" ? '<button type="button" class="vs-btn-accept" data-vs-action="acceptPartial">✓ Accept as Correct</button>' : '') +
                '<button type="button" id="vsQuizNext" class="vs-primary" data-vs-action="nextQuiz"><span>' + (s.index + 1 === total ? "Xem k\u1ebft qu\u1ea3" : "C\u00e2u ti\u1ebfp theo") + "</span>" + ico("arrow-right") + "</button>" +
              '</div></div>';
          })()
        : "");
  }

  /* ===== MODULE: Progress Statistics ===== */
  function renderStats() {
    const contentEl = $("vsStatsContent");
    if (!contentEl) return;
    const words = activeWords(), today = localDay();
    const streak = streakSummary(VocabStorageService.data.stats, today);
    const due = words.filter(function (w) { return isDueWord(w, today); }).length;
    const counts = { new: 0, learning: 0, known: 0 };
    words.forEach(function (w) { counts[w.status] = (counts[w.status] || 0) + 1; });

    const days = Array.from({ length: 7 }, function (_, i) {
      const day = dayPlus(today, i - 6);
      const d = VocabStorageService.data.stats.daily[day] || { reviewed: 0, correct: 0 };
      return {
        day: day,
        reviewed: d.reviewed,
        correct: d.correct,
        accuracy: d.reviewed ? Math.round(d.correct / d.reviewed * 100) : 0
      };
    });
    const reviewed = days.reduce(function (n, d) { return n + d.reviewed; }, 0);
    const correct = days.reduce(function (n, d) { return n + d.correct; }, 0);

    contentEl.innerHTML =
      '<div class="vs-stats-cards">' +
        [
          ["Tổng số từ", words.length, "Từ đang hoạt động"],
          ["Đến hạn hôm nay", due, "Bao gồm các từ quá hạn"],
          ["Streak hiện tại", streak.streak, "ngày học liên tiếp"],
          ["Streak dài nhất", streak.longestStreak, "ngày học liên tiếp"]
        ].map(function (card) {
          return '<div class="vs-panel"><div class="vs-stat-label">' + card[0] + '</div><div class="vs-stat-number vs-mono">' + card[1] + '</div><div class="vs-stat-detail">' + card[2] + "</div></div>";
        }).join("") +
      "</div>" +
      '<div class="vs-stats-bottom">' +
        '<div class="vs-panel">' +
          '<div class="vs-row vs-between vs-chart-head"><div><h2>Độ chính xác 7 ngày</h2><p class="vs-muted" style="font-size:12px;margin-top:4px">' +
            (reviewed ? (Math.round(correct / reviewed * 100) + "% · " + correct + "/" + reviewed + " lượt đúng") : "Chưa có lượt học trong 7 ngày") +
          '</p></div><span class="vs-pill">0–100%</span></div>' +
          '<div class="vs-chart">' +
            days.map(function (d) {
              return '<div class="vs-chart-col" title="' + d.day + ": " + d.correct + "/" + d.reviewed + ' lượt đúng">' +
                '<span class="vs-chart-value vs-mono">' + (d.reviewed ? d.accuracy + "%" : "—") + "</span>" +
                '<div class="vs-chart-bed"><div class="vs-chart-bar" style="height:' + (d.reviewed ? d.accuracy : 0) + "%;opacity:" + (d.reviewed ? 1 : 0.18) + '"></div></div>' +
                '<span class="vs-chart-day vs-mono">' + d.day.slice(8) + "/" + d.day.slice(5, 7) + "</span>" +
              "</div>";
            }).join("") +
          "</div>" +
        "</div>" +
        '<div class="vs-panel">' +
          "<h2>Trạng thái từ vựng</h2>" +
          '<div class="vs-status-lines">' +
            [["new", "Chưa học"], ["learning", "Đang học"], ["known", "Đã thuộc"]].map(function (st) {
              const key = st[0], label = st[1];
              const pct = words.length ? (counts[key] / words.length * 100) : 0;
              return '<div class="vs-status-line"><div class="vs-row"><span>' + label + '</span><strong class="vs-mono">' + counts[key] + '</strong></div><div class="vs-progress-track"><div class="vs-progress-fill" style="width:' + pct + '%"></div></div></div>';
            }).join("") +
          "</div>" +
          '<p class="vs-stats-streak">Lần học gần nhất: <strong>' + (streak.lastStudyDate ? streak.lastStudyDate.split("-").reverse().join("/") : "Chưa có") + "</strong></p>" +
        "</div>" +
      "</div>";
  }

  /* ===== MODULE: Dictionary Lookup & Cache ===== */
  const DictCache = {
    key: "vocabStudio.dictCache",
    ttl: 7 * 24 * 60 * 60 * 1000,
    max: 500,
    entries: [],
    load: function () {
      try {
        const raw = localStorage.getItem(this.key);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!Array.isArray(data.entries)) return;
        this.entries = data.entries.filter(function (e) {
          return e && typeof e.key === "string" && stamp(e.cachedAt) && e.result && typeof e.result.en === "string" && typeof e.result.vi === "string";
        }).sort(function (a, b) { return a.cachedAt - b.cachedAt; }).slice(-this.max);
      } catch (e) {
        this.entries = [];
      }
    },
    get: function (key, now) {
      const ts = now || Date.now();
      const item = this.entries.find(function (e) { return e.key === key; });
      return item ? Object.assign({}, clone(item), { fresh: ts >= item.cachedAt && ts - item.cachedAt < this.ttl }) : null;
    },
    put: function (key, result, now) {
      const ts = now || Date.now();
      this.entries = this.entries.filter(function (e) { return e.key !== key; });
      this.entries.push({ key: key, cachedAt: ts, result: clone(result) });
      this.entries.sort(function (a, b) { return a.cachedAt - b.cachedAt; });
      this.entries = this.entries.slice(-this.max);
      try {
        localStorage.setItem(this.key, JSON.stringify({ version: 1, entries: this.entries }));
      } catch (e) { /* ignore quota error */ }
    }
  };

  function apiError(kind, message) {
    const err = new Error(message);
    err.kind = kind;
    return err;
  }

  function detectLookupDirection(text, selected) {
    if (selected && selected !== "auto") return selected;
    return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(String(text || "").normalize("NFC")) ? "vi-en" : "en-vi";
  }

  async function apiJSON(url, opts) {
    const o = opts || {};
    const signal = o.signal;
    const validate = o.validate || function (v) { return v; };
    const timeoutMs = o.timeoutMs || 8000;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal && signal.aborted) throw apiError("cancelled", "Đã hủy tra cứu");
      const controller = new AbortController();
      let timer;
      const abort = function () { controller.abort(); };
      if (signal) signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(function () { controller.abort(); }, timeoutMs);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          mode: "cors",
          credentials: "omit",
          headers: { Accept: "application/json" }
        });
        if (response.status === 429) throw apiError("quota", "Đã hết lượt tra hôm nay, thử lại sau");
        if (response.status === 404) throw apiError("not-found", "Không tìm thấy từ trong từ điển tiếng Anh");
        if (!response.ok) throw apiError("http", "Dịch vụ tra từ hiện chưa sẵn sàng");
        const data = await response.json();
        return validate(data);
      } catch (error) {
        let reason = error;
        if (reason.kind === undefined) {
          reason = apiError(
            reason.name === "AbortError" ? (signal && signal.aborted ? "cancelled" : "timeout") : "network",
            navigator.onLine === false ? "Bạn đang mất mạng. Hãy dùng cache hoặc nhập tay." : "Không kết nối được dịch vụ tra từ. Hãy thử lại hoặc nhập tay."
          );
        }
        if (reason.kind === "cancelled" || (signal && signal.aborted)) throw apiError("cancelled", "Đã hủy tra cứu");
        if (attempt === 0 && ["timeout", "network"].indexOf(reason.kind) !== -1 && navigator.onLine !== false) continue;
        throw reason;
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", abort);
      }
    }
  }

  async function translateTerm(q, direction, signal) {
    const langpair = direction === "vi-en" ? "vi|en" : "en|vi";
    const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=" + encodeURIComponent(langpair);
    const data = await apiJSON(url, {
      signal: signal,
      validate: function (d) {
        if (Number(d && d.responseStatus) !== 200 || /MYMEMORY WARNING/i.test(JSON.stringify(d))) {
          throw apiError("quota", "Đã hết lượt tra hôm nay, thử lại sau");
        }
        if (!d.responseData || typeof d.responseData.translatedText !== "string" || !d.responseData.translatedText.trim()) {
          throw apiError("invalid", "Dịch vụ chưa trả về bản dịch.");
        }
        return d;
      }
    });
    return String(data.responseData.translatedText).trim();
  }

  async function englishDetails(word, signal) {
    const entries = await apiJSON("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word), { signal: signal });
    if (!Array.isArray(entries) || !entries[0]) throw apiError("not-found", "Không tìm thấy từ trong từ điển tiếng Anh");
    const first = entries[0];
    const phonetics = entries.flatMap(function (e) { return Array.isArray(e.phonetics) ? e.phonetics : []; });
    const meanings = entries.flatMap(function (e) { return Array.isArray(e.meanings) ? e.meanings : []; });
    const definitions = meanings.flatMap(function (m) { return Array.isArray(m.definitions) ? m.definitions : []; });
    const audioHit = phonetics.find(function (p) { return safeHTTPS(p && p.audio); });
    const ipaHit = phonetics.find(function (p) { return p && p.text; });
    const defHit = definitions.find(function (d) { return d && d.definition; });
    const exHit = definitions.find(function (d) { return d && d.example; });
    const ukAudioHit = phonetics.find(function (p) { return safeHTTPS(p && p.audio) && /-uk\.mp3/i.test(p.audio); });
    const usAudioHit = phonetics.find(function (p) { return safeHTTPS(p && p.audio) && /-us\.mp3/i.test(p.audio); });
    const ukIpaHit = phonetics.find(function (p) { return p && p.text && /-uk\.mp3/i.test(String(p.audio || "")); });
    const usIpaHit = phonetics.find(function (p) { return p && p.text && /-us\.mp3/i.test(String(p.audio || "")); });
    const senses = [];
    const synSet = new Set();
    const antSet = new Set();
    meanings.forEach(function (m) {
      const mPos = String((m && m.partOfSpeech) || "").trim();
      (Array.isArray(m && m.synonyms) ? m.synonyms : []).forEach(function (s) { if (s) synSet.add(String(s).trim()); });
      (Array.isArray(m && m.antonyms) ? m.antonyms : []).forEach(function (a) { if (a) antSet.add(String(a).trim()); });
      (Array.isArray(m && m.definitions) ? m.definitions : []).slice(0, 3).forEach(function (d, idx) {
        if (!d || !d.definition || senses.length >= 6) return;
        (Array.isArray(d.synonyms) ? d.synonyms : []).forEach(function (s) { if (s) synSet.add(String(s).trim()); });
        (Array.isArray(d.antonyms) ? d.antonyms : []).forEach(function (a) { if (a) antSet.add(String(a).trim()); });
        senses.push({
          id: "s_" + senses.length + "_" + idx,
          pos: mPos,
          defEn: String(d.definition || "").trim(),
          defVi: "",
          grammarPattern: "",
          examples: d.example ? [{ en: String(d.example).trim(), vi: "" }] : [],
          selected: senses.length === 0,
          verified: true
        });
      });
    });
    return {
      en: String(first.word || word).trim(),
      ipa: String(first.phonetic || (ipaHit && ipaHit.text) || "").trim(),
      ukIpa: String((ukIpaHit && ukIpaHit.text) || first.phonetic || (ipaHit && ipaHit.text) || "").trim(),
      usIpa: String((usIpaHit && usIpaHit.text) || "").trim(),
      audioUrl: safeHTTPS((usAudioHit && usAudioHit.audio) || (ukAudioHit && ukAudioHit.audio) || (audioHit && audioHit.audio) || ""),
      ukAudio: safeHTTPS((ukAudioHit && ukAudioHit.audio) || ""),
      usAudio: safeHTTPS((usAudioHit && usAudioHit.audio) || ""),
      pos: Array.from(new Set(meanings.map(function (m) { return m.partOfSpeech; }).filter(Boolean))).slice(0, 3).join(", "),
      definition: String((defHit && defHit.definition) || ""),
      example: String((exHit && exHit.example) || ""),
      senses: senses,
      synonyms: Array.from(synSet).slice(0, 10),
      antonyms: Array.from(antSet).slice(0, 10),
      verifiedDict: true
    };
  }

  /* Hybrid AI Enrichment (NEVER fabricates IPA or audio; clearly flagged as aiEnriched) */
  async function enrichDictionaryWithAI(result, signal) {
    if (!result || !result.en) return result;
    try {
      const u = U() && U().state && U().state.user;
      const hdr = { "Content-Type": "application/json" };
      if (u && u.email) hdr["X-User-Email"] = u.email;
      if (u && u.credential) hdr["Authorization"] = "Bearer " + u.credential;
      const prompt =
        "Provide structured Cambridge-style learner enrichment for the English word: \"" + result.en + "\".\n" +
        "Do NOT generate IPA or audio URLs.\n" +
        "Return STRICT JSON ONLY:\n" +
        '{"cefr":"A1|A2|B1|B2|C1|C2","syllables":"e.g. ex\u00b7am\u00b7ple","collocations":["..."],"wordFamily":["..."],"senses":[{"pos":"noun|verb|adj","defVi":"Vietnamese meaning","defEn":"concise English definition","grammarPattern":"e.g. [C] / + to V","examples":[{"en":"...","vi":"..."}]}]}';
      const res = await fetch("/api/ai/proxy", {
        method: "POST",
        headers: hdr,
        signal: signal,
        body: JSON.stringify({
          provider: "gemini",
          model: "gemini-2.5-flash",
          stream: false,
          payload: {
            systemInstruction: { parts: [{ text: "You are a bilingual Cambridge lexicographer. Return strict JSON only." }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 700 }
          }
        })
      });
      if (!res.ok) return result;
      const data = await res.json();
      const rawText = (data && data.text) ||
        (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ||
        (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
      const m = String(rawText).match(/\{[\s\S]*\}/);
      if (!m) return result;
      const ai = JSON.parse(m[0]);
      if (/^(A1|A2|B1|B2|C1|C2)$/i.test(String(ai.cefr || "").trim())) result.cefr = String(ai.cefr).trim().toUpperCase();
      if (typeof ai.syllables === "string" && ai.syllables.trim()) result.syllables = ai.syllables.trim();
      if (Array.isArray(ai.collocations)) result.collocations = ai.collocations.map(String).filter(Boolean).slice(0, 8);
      if (Array.isArray(ai.wordFamily)) result.wordFamily = ai.wordFamily.map(String).filter(Boolean).slice(0, 8);
      if (Array.isArray(ai.senses) && ai.senses.length > 0) {
        if (!Array.isArray(result.senses) || result.senses.length === 0) {
          result.senses = ai.senses.slice(0, 4).map(function (s, i) {
            return {
              id: "ai_s_" + i,
              pos: String(s.pos || result.pos || ""),
              defEn: String(s.defEn || ""),
              defVi: String(s.defVi || result.vi || ""),
              grammarPattern: String(s.grammarPattern || ""),
              examples: Array.isArray(s.examples) ? s.examples.slice(0, 3) : [],
              selected: i === 0,
              verified: false
            };
          });
        } else {
          result.senses.forEach(function (vs, idx) {
            const match = ai.senses[idx] || ai.senses[0];
            if (!match) return;
            if (!vs.defVi && match.defVi) vs.defVi = String(match.defVi);
            if (!vs.grammarPattern && match.grammarPattern) vs.grammarPattern = String(match.grammarPattern);
            if ((!vs.examples || vs.examples.length < 2) && Array.isArray(match.examples)) {
              vs.examples = (vs.examples || []).concat(match.examples.slice(0, 2)).slice(0, 3);
            }
          });
        }
      }
      result.aiEnriched = true;
    } catch (e) { /* graceful fallback without AI enrichment */ }
    return result;
  }

  async function lookupTerm(q, selected, signal) {
    const cleanQ = String(q || "").trim();
    if (!cleanQ || cleanQ.length > 150) throw apiError("input", "Hãy nhập từ hoặc cụm từ từ 1 đến 150 ký tự");
    const direction = detectLookupDirection(cleanQ, selected || "auto");
    const key = direction + ":" + cleanAnswer(cleanQ);
    const cached = DictCache.get(key);
    if (cached && cached.fresh) return Object.assign({}, cached.result, { source: "cache", cachedAt: cached.cachedAt });
    if (navigator.onLine === false) {
      if (cached) return Object.assign({}, cached.result, { source: "stale-cache", cachedAt: cached.cachedAt });
      throw apiError("network", "Bạn đang mất mạng. Hãy nhập từ thủ công.");
    }
    const result = {
      en: direction === "en-vi" ? cleanQ : "",
      vi: direction === "vi-en" ? cleanQ : "",
      ipa: "",
      pos: "",
      example: "",
      definition: "",
      audioUrl: "",
      direction: direction,
      warnings: []
    };
    let translated = false, detailsOK = false, notFound = false;
    const failures = [];
    if (direction === "en-vi") {
      const outcomes = await Promise.allSettled([translateTerm(cleanQ, direction, signal), englishDetails(cleanQ, signal)]);
      if (outcomes[0].status === "fulfilled") { result.vi = outcomes[0].value; translated = true; }
      else failures.push(outcomes[0].reason);
      if (outcomes[1].status === "fulfilled") { Object.assign(result, outcomes[1].value); detailsOK = true; }
      else { failures.push(outcomes[1].reason); notFound = outcomes[1].reason && outcomes[1].reason.kind === "not-found"; }
    } else {
      try { result.en = await translateTerm(cleanQ, direction, signal); translated = true; }
      catch (e) { failures.push(e); }
      if (translated) {
        try { Object.assign(result, await englishDetails(result.en, signal)); detailsOK = true; }
        catch (e) { failures.push(e); notFound = e && e.kind === "not-found"; }
      }
    }
    if ((signal && signal.aborted) || failures.some(function (e) { return e && e.kind === "cancelled"; })) {
      throw apiError("cancelled", "Đã hủy tra cứu");
    }
    if (failures.length && cached) {
      return Object.assign({}, cached.result, { source: "stale-cache", cachedAt: cached.cachedAt });
    }
    if (notFound) result.warnings.push("Chưa có IPA hoặc ví dụ từ điển; vẫn có thể lưu bản dịch hoặc nhập tay.");
    if (!translated && !detailsOK) throw failures[0] || apiError("network", "Kh\u00f4ng l\u1ea5y \u0111\u01b0\u1ee3c k\u1ebft qu\u1ea3");
    if (result.en) {
      await enrichDictionaryWithAI(result, signal);
    }
    if (translated && (detailsOK || notFound)) DictCache.put(key, result);
    return Object.assign({}, result, { source: "api" });
  }

  const dictionaryViews = {
    page: { busy: false, result: null, controller: null, token: 0, error: "" },
    modal: { busy: false, result: null, controller: null, token: 0, error: "" }
  };
  let dictDeck = DEFAULT_DECK;

  function posLabel(pos) {
    const labels = {
      noun: "danh từ", verb: "động từ", adjective: "tính từ", adverb: "trạng từ",
      pronoun: "đại từ", preposition: "giới từ", conjunction: "liên từ", interjection: "thán từ"
    };
    return String(pos || "").split(",").map(function (p) { return labels[p.trim()] || p.trim(); }).join(", ");
  }

  function cancelLookup(context) {
    const state = dictionaryViews[context];
    if (!state) return;
    state.token++;
    if (state.controller) state.controller.abort();
    state.controller = null;
    state.busy = false;
    renderDictionary();
  }

  function fillWordForm(result) {
    const form = $("vsWordForm");
    if (!form || !result) return;
    const fields = form.elements;
    ["en", "vi", "ipa", "pos", "example", "audioUrl"].forEach(function (key) {
      if (fields[key] && result[key]) fields[key].value = String(result[key]);
    });
  }

  async function runLookup(context) {
    const state = dictionaryViews[context];
    const prefix = context === "page" ? "vsDict" : "vsModalDict";
    if (state.controller) state.controller.abort();
    const controller = new AbortController();
    const token = ++state.token;
    state.controller = controller;
    state.busy = true;
    state.error = "";
    state.result = null;
    renderDictionary();
    try {
      const qEl = $(prefix + "Query"), dEl = $(prefix + "Direction");
      const result = await lookupTerm(qEl ? qEl.value : "", dEl ? dEl.value : "auto", controller.signal);
      if (token !== state.token) return;
      state.result = result;
      if (context === "modal") fillWordForm(result);
    } catch (e) {
      if (token === state.token && (!e || e.kind !== "cancelled")) {
        state.error = (e && e.message) || "Không thể tra cứu";
        toast(state.error, "warning");
      }
    } finally {
      if (token === state.token) {
        state.busy = false;
        state.controller = null;
        renderDictionary();
      }
    }
  }

  function renderDictionary() {
    const saveDeckEl = $("vsDictSaveDeck");
    if (!saveDeckEl) return;
    if (!activeDecks().some(function (d) { return d.id === dictDeck; })) dictDeck = DEFAULT_DECK;
    saveDeckEl.innerHTML = deckOptions(dictDeck, false);
    saveDeckEl.value = dictDeck;

    ["page", "modal"].forEach(function (name) {
      const state = dictionaryViews[name];
      const prefix = name === "page" ? "vsDict" : "vsModalDict";
      const btn = $(prefix + "Button"), cancel = $(prefix + "Cancel"), status = $(prefix + "Status");
      if (btn) {
        btn.disabled = state.busy;
        btn.textContent = state.busy ? "Đang tra…" : "Tra cứu";
      }
      if (cancel) cancel.hidden = !state.busy;
      if (status) {
        status.textContent = state.busy
          ? "Đang tra cứu. Mỗi yêu cầu tối đa 8 giây…"
          : (state.error || (state.result ? "Đã tra cứu · Bạn có thể lưu ngay hoặc chỉnh lại nội dung" : "Tự nhận diện theo dấu tiếng Việt. Có thể chọn chiều thủ công."));
      }
    });

    const r = dictionaryViews.page.result;
    const resBox = $("vsDictResult"), resBody = $("vsDictResultBody");
    if (!resBox || !resBody) return;
    resBox.hidden = !r;
    if (!r) { resBody.innerHTML = ""; return; }
    const otherDecks = getOtherDecksForWord(r.en, dictDeck);
    const senses = Array.isArray(r.senses) && r.senses.length > 0
      ? r.senses
      : [{ id: "s_0", pos: r.pos || "", defEn: r.definition || "", defVi: r.vi || "", grammarPattern: "", examples: r.example ? [{ en: r.example, vi: "" }] : [], selected: true, verified: !!r.verifiedDict }];
    r.senses = senses;

    const svgFallback = '<svg class="vs-dict-svg" viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">' +
      '<rect width="64" height="64" rx="14" fill="currentColor" opacity="0.1"/>' +
      '<text x="32" y="40" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor">' + esc((r.en || "W").charAt(0).toUpperCase()) + '</text></svg>';

    resBody.innerHTML =
      '<div class="vs-row vs-between" style="align-items:flex-start;gap:12px">' +
        '<div style="display:flex;gap:12px;align-items:flex-start;flex:1;min-width:0">' +
          '<div class="vs-dict-illus">' + svgFallback + '</div>' +
          '<div style="min-width:0">' +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
              '<span class="vs-eyebrow">' + (r.direction === "vi-en" ? "VI\u1ec6T \u2192 ANH" : "ANH \u2192 VI\u1ec6T") + '</span>' +
              (r.cefr ? '<span class="vs-pill vs-cefr">' + esc(r.cefr) + '</span>' : '') +
              (r.verifiedDict ? '<span class="vs-pill vs-badge-verified">✓ Verified Dictionary</span>' : '') +
              (r.aiEnriched ? '<span class="vs-pill vs-badge-ai">✨ AI Enrichment</span>' : '') +
            '</div>' +
            '<h2 class="vs-dict-word">' + esc(r.en || "Ch\u01b0a c\u00f3 t\u1eeb ti\u1ebfng Anh") +
              (r.syllables ? ' <span class="vs-muted" style="font-size:13px;font-weight:500">(' + esc(r.syllables) + ')</span>' : '') +
            '</h2>' +
            '<div class="vs-row" style="gap:10px;flex-wrap:wrap;margin-top:4px">' +
              (r.ukIpa ? '<span class="vs-mono vs-muted">UK ' + esc(r.ukIpa) + '</span>' : (r.ipa ? '<span class="vs-mono vs-muted">' + esc(r.ipa) + '</span>' : '')) +
              (r.ukAudio ? '<button type="button" class="vs-quiet vs-btn-xs" data-vs-dict-audio="uk" title="Ph\u00e1t \u00e2m UK">🔊 UK</button>' : '') +
              (r.usIpa ? '<span class="vs-mono vs-muted">US ' + esc(r.usIpa) + '</span>' : '') +
              (r.usAudio ? '<button type="button" class="vs-quiet vs-btn-xs" data-vs-dict-audio="us" title="Ph\u00e1t \u00e2m US">🔊 US</button>' : '') +
              (!r.ukAudio && !r.usAudio ? '<button type="button" class="vs-icon-btn" data-vs-action="speakDictionary" title="Nghe ph\u00e1t \u00e2m" ' + (r.en ? "" : "disabled") + '>' + ico("volume-2") + '</button>' : '') +
            '</div>' +
            (otherDecks.length > 0 ? '<div class="vs-also-in">ℹ️ Also in: <strong>' + esc(otherDecks.join(", ")) + '</strong></div>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      (r.pos ? '<p class="vs-dict-pos">' + esc(posLabel(r.pos)) + "</p>" : "") +
      '<p class="vs-dict-meaning">' + esc(r.vi || "Ch\u01b0a c\u00f3 ngh\u0129a ti\u1ebfng Vi\u1ec7t") + "</p>" +
      '<div class="vs-senses-list"><div class="vs-muted" style="font-size:12px;margin-bottom:6px;font-weight:700">Ch\u1ecdn c\u00e1c ngh\u0129a mu\u1ed1n l\u01b0u v\u00e0o b\u1ed9 t\u1eeb:</div>' +
        senses.map(function (s, idx) {
          return '<label class="vs-sense-card">' +
            '<input type="checkbox" data-vs-sense-idx="' + idx + '"' + (s.selected ? " checked" : "") + '>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
                (s.pos ? '<span class="vs-pill">' + esc(posLabel(s.pos)) + '</span>' : '') +
                (s.grammarPattern ? '<span class="vs-pill vs-mono">' + esc(s.grammarPattern) + '</span>' : '') +
                (s.defVi ? '<strong>' + esc(s.defVi) + '</strong>' : '') +
              '</div>' +
              (s.defEn ? '<p style="margin:3px 0;font-size:13px">' + esc(s.defEn) + '</p>' : '') +
              (Array.isArray(s.examples) && s.examples.length ? s.examples.map(function (ex) {
                const exEn = typeof ex === "string" ? ex : (ex.en || "");
                const exVi = typeof ex === "string" ? "" : (ex.vi || "");
                return '<div class="vs-sense-ex">' +
                  '<button type="button" class="vs-quiet vs-btn-xs" data-vs-speak-text="' + esc(exEn) + '" title="Nghe v\u00ed d\u1ee5">🔊</button>' +
                  '<span><em>' + esc(exEn) + '</em>' + (exVi ? (' — <span class="vs-muted">' + esc(exVi) + '</span>') : '') + '</span></div>';
              }).join("") : '') +
            '</div>' +
          '</label>';
        }).join("") +
      '</div>' +
      (r.synonyms && r.synonyms.length ? '<div class="vs-dict-detail"><span>\u0110\u1ed3ng ngh\u0129a (Synonyms)</span><div class="vs-chip-row">' + r.synonyms.map(function (syn) { return '<button type="button" class="vs-chip-link" data-vs-lookup-word="' + esc(syn) + '">' + esc(syn) + '</button>'; }).join("") + '</div></div>' : '') +
      (r.antonyms && r.antonyms.length ? '<div class="vs-dict-detail"><span>Tr\u00e1i ngh\u0129a (Antonyms)</span><div class="vs-chip-row">' + r.antonyms.map(function (ant) { return '<button type="button" class="vs-chip-link" data-vs-lookup-word="' + esc(ant) + '">' + esc(ant) + '</button>'; }).join("") + '</div></div>' : '') +
      (r.collocations && r.collocations.length ? '<div class="vs-dict-detail"><span>Collocations</span><div class="vs-chip-row">' + r.collocations.map(function (c) { return '<span class="vs-pill">' + esc(c) + '</span>'; }).join("") + '</div></div>' : '') +
      (r.wordFamily && r.wordFamily.length ? '<div class="vs-dict-detail"><span>Word Family</span><div class="vs-chip-row">' + r.wordFamily.map(function (wf) { return '<button type="button" class="vs-chip-link" data-vs-lookup-word="' + esc(wf) + '">' + esc(wf) + '</button>'; }).join("") + '</div></div>' : '') +
      (r.warnings && r.warnings.length ? '<div class="vs-dict-notice">' + r.warnings.map(esc).join("<br>") + "</div>" : "");
    const qs = $("vsDictQuickSave");
    if (qs) qs.disabled = !r.en || (!r.vi && !senses.some(function (s) { return s.selected && (s.defVi || s.defEn); }));
  }

  function saveDictionaryWord() {
    const r = dictionaryViews.page.result;
    if (!r || !r.en) throw new Error("H\u00e3y t\u1ef1 \u0111i\u1ec1n c\u00e1c tr\u01b0\u1eddng c\u00f2n thi\u1ebfu trong form Th\u00eam t\u1eeb");
    const selectedSenses = (Array.isArray(r.senses) ? r.senses : []).filter(function (s) { return s.selected; });
    const mergedVi = selectedSenses.map(function (s) { return s.defVi; }).filter(Boolean).join("; ") || r.vi || selectedSenses.map(function (s) { return s.defEn; }).filter(Boolean).join("; ");
    if (!mergedVi) throw new Error("H\u00e3y ch\u1ecdn \u00edt nh\u1ea5t 1 ngh\u0129a ho\u1eb7c nh\u1eadp ngh\u0129a ti\u1ebfng Vi\u1ec7t.");
    const mergedPos = Array.from(new Set(selectedSenses.map(function (s) { return s.pos; }).filter(Boolean))).join(", ") || r.pos || "";
    const firstExObj = selectedSenses.map(function (s) { return s.examples && s.examples[0]; }).find(Boolean);
    const mergedEx = (firstExObj ? (typeof firstExObj === "string" ? firstExObj : firstExObj.en) : "") || r.example || "";

    // Independent decks: allow same word in different decks! Only prompt if duplicate in the SAME target deck.
    const sameDeckDup = activeWords().find(function (w) {
      return w.deckId === dictDeck && wordEnKey(w) === wordEnKey(r);
    });
    if (sameDeckDup) {
      askDuplicatePolicyModal(1, [r.en], function (policy) {
        if (policy === "merge") {
          VocabStorageService.updateWord(sameDeckDup.id, {
            en: r.en,
            vi: mergedVi,
            ipa: r.ipa || sameDeckDup.ipa,
            pos: mergedPos || sameDeckDup.pos,
            example: mergedEx || sameDeckDup.example,
            audioUrl: r.audioUrl || sameDeckDup.audioUrl,
            deckId: dictDeck
          });
          toast("\u0110\u00e3 c\u1eadp nh\u1eadt t\u1eeb \u201c" + r.en + "\u201d trong b\u1ed9 t\u1eeb", "success");
        } else {
          toast("\u0110\u00e3 b\u1ecf qua t\u1eeb tr\u00f9ng trong c\u00f9ng b\u1ed9", "info");
        }
      });
      return;
    }
    const otherDecks = getOtherDecksForWord(r.en, dictDeck);
    VocabStorageService.commit(function (d) {
      d.words.push(wordSchema({
        id: uuid(),
        en: r.en,
        vi: mergedVi,
        ipa: r.ipa,
        pos: mergedPos,
        example: mergedEx,
        audioUrl: r.audioUrl,
        unit: r.cefr || "",
        deckId: dictDeck,
        custom: true
      }));
    });
    const dk = activeDecks().find(function (d) { return d.id === dictDeck; });
    toast("\u0110\u00e3 l\u01b0u \u201c" + r.en + "\u201d v\u00e0o " + (dk ? dk.name : "b\u1ed9 t\u1eeb") + (otherDecks.length ? (" (Also in: " + otherDecks.join(", ") + ")") : ""), "success");
  }

  function openDictionaryForm() {
    const result = dictionaryViews.page.result;
    openWord();
    if (result) fillWordForm(result);
    const form = $("vsWordForm");
    if (form && form.elements.deckId) form.elements.deckId.value = dictDeck;
  }

  function speakDictionary() {
    const r = dictionaryViews.page.result;
    if (r && r.en) speakWordRecord(r);
  }

  function changeDirection(direction) {
    const plan = planQuizDirection(direction);
    VocabStorageService.commit(function (d) { d.settings.direction = direction; });
    revealed.clear();
    if (flashSession) { flashSession.flipped = false; renderFlash(); }
    if (page === "grid") renderGrid();
    applyQuizDirection(plan);
  }

  /* ===== MODULE: Build Scoped HTML Template ===== */
  function buildVocabStudioTemplate() {
    return (
      '<div class="vocab-studio-container" id="vocabStudioContainer">' +
        '<div class="vs-shell-header">' +
          '<nav class="vs-subnav" id="vsNavigation" aria-label="Điều hướng Vocab Studio"></nav>' +
          '<div class="vs-header-controls">' +
            '<div class="vs-direction" role="group" aria-label="Chiều học">' +
              '<button type="button" class="vs-dir-btn" data-vs-dir="vi-en">Việt → Anh</button>' +
              '<button type="button" class="vs-dir-btn" data-vs-dir="en-vi">Anh → Việt</button>' +
            '</div>' +
            '<span class="vs-sync-badge" id="vsSyncBadge" role="status" aria-live="polite">Chế độ cục bộ</span>' +
          '</div>' +
        '</div>' +

        /* 1. Lookup Page */
        '<section id="vs_lookupPage" hidden>' +
          '<div class="vs-row vs-between vs-pagehead">' +
            '<div><div class="vs-eyebrow">TÌM HIỂU MỘT TỪ, MỞ THÊM MỘT CÁNH CỬA</div><h1>Tra từ Anh–Việt</h1><p class="vs-subtitle">Tra nghĩa, nghe phát âm và lưu vào bộ từ trong một chỗ.</p></div>' +
            '<button type="button" data-vs-action="add">' + ico("plus") + '<span>Thêm từ thủ công</span></button>' +
          '</div>' +
          '<div class="vs-dict-layout">' +
            '<div class="vs-panel">' +
              '<form id="vsDictionaryForm">' +
                '<div class="vs-dict-query-row">' +
                  '<input id="vsDictQuery" maxlength="150" placeholder="Nhập từ tiếng Anh hoặc tiếng Việt…" autocomplete="off">' +
                  '<select id="vsDictDirection" aria-label="Chiều tra cứu"><option value="auto">Tự nhận diện</option><option value="en-vi">Anh → Việt</option><option value="vi-en">Việt → Anh</option></select>' +
                  '<button id="vsDictButton" class="vs-primary" type="submit">Tra cứu</button>' +
                '</div>' +
              '</form>' +
              '<div class="vs-row vs-between"><p id="vsDictStatus" class="vs-dict-status" role="status" aria-live="polite"></p><button type="button" id="vsDictCancel" class="vs-quiet" data-vs-action="cancelDictionary" hidden>Hủy tra cứu</button></div>' +
            '</div>' +
            '<div id="vsDictResult" class="vs-panel vs-dict-result" hidden>' +
              '<div id="vsDictResultBody"></div>' +
              '<div class="vs-dict-savebar">' +
                '<select id="vsDictSaveDeck" aria-label="Bộ từ nhận kết quả tra"></select>' +
                '<button type="button" id="vsDictQuickSave" class="vs-primary" data-vs-action="saveDictionary">Lưu ngay vào bộ từ</button>' +
                '<button type="button" data-vs-action="editDictionary">Tự điền vào form Thêm từ</button>' +
              '</div>' +
            '</div>' +
            '<div class="vs-dict-placeholder vs-muted"><p>Cache giữ 7 ngày, tối đa 500 mục. Nhập tay luôn sẵn sàng khi mất mạng hoặc hết lượt tra.</p></div>' +
          '</div>' +
        '</section>' +

        /* 2. Grid Page */
        '<section id="vs_gridPage">' +
          '<div class="vs-row vs-between vs-pagehead">' +
            '<div><div class="vs-eyebrow">TỪ CỦA BẠN, NHỊP CỦA BẠN</div><h1>Lưới từ vựng</h1><p class="vs-subtitle">Một từ mới. Một bước tiến nhỏ.</p></div>' +
            '<button type="button" class="vs-primary" data-vs-action="add">' + ico("plus") + '<span>Thêm từ</span></button>' +
          '</div>' +
          '<div class="vs-panel vs-row vs-between vs-review-banner" id="vsDailyBanner"></div>' +
          '<div class="vs-metrics" id="vsMetrics"></div>' +
          '<div class="vs-toolbar">' +
            '<div class="vs-search">' + ico("search") + '<input id="vsSearch" placeholder="Tìm từ, nghĩa hoặc STT…" aria-label="Tìm từ"><kbd>/</kbd></div>' +
            '<select id="vsGridDeck" aria-label="Chọn bộ từ"></select>' +
            '<select id="vsFilter" aria-label="Lọc trạng thái"><option value="all">Tất cả trạng thái</option><option value="starred">★ Cần ôn</option><option value="known">Đã thuộc</option><option value="new">Chưa thuộc</option><option value="custom">Từ của tôi</option></select>' +
          '</div>' +
          '<div class="vs-tools">' +
            '<button type="button" data-vs-action="reveal">' + ico("eye") + '<span>Hiện hết</span></button>' +
            '<button type="button" data-vs-action="hide">' + ico("eye-off") + '<span>Ẩn hết</span></button>' +
            '<button type="button" data-vs-action="shuffle">' + ico("shuffle") + '<span>Xáo trộn</span></button>' +
            '<button type="button" data-vs-action="sort">' + ico("list-ordered") + '<span>Theo STT</span></button>' +
            '<span id="vsResultCount" class="vs-resultline"></span>' +
          '</div>' +
          '<div id="vsVocabGrid" class="vs-grid"></div>' +
          '<div class="vs-shortcuts"><span><kbd>Space</kbd> lật thẻ đang chọn</span><span><kbd>S</kbd> phát âm</span><span><kbd>/</kbd> tìm kiếm</span><span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> đánh giá trong Thẻ ghi nhớ</span></div>' +
        '</section>' +

        /* 3. Decks Page */
        '<section id="vs_decksPage" hidden>' +
          '<div class="vs-row vs-between vs-pagehead">' +
            '<div><div class="vs-eyebrow">MỖI TỪ MỘT CHỖ RIÊNG</div><h1>Bộ từ của bạn</h1><p class="vs-subtitle">Sắp xếp theo cách bạn muốn học.</p></div>' +
            '<button type="button" class="vs-primary" data-vs-action="newDeck">' + ico("plus") + '<span>Tạo bộ từ</span></button>' +
          '</div>' +
          '<div class="vs-deck-grid" id="vsDeckList"></div>' +
        '</section>' +

        /* 4. Print / Review Table Page */
        '<section id="vs_printPage" hidden>' +
          '<div class="vs-pagehead"><div class="vs-eyebrow">ÔN MỘT CHÚT, NHỚ LÂU HƠN</div><h1>Bảng dò bài</h1><p class="vs-subtitle">Chỉ những từ đã gắn sao. Bấm vào ô đang che để mở đáp án.</p></div>' +
          '<div class="vs-row vs-table-actions">' +
            '<select id="vsPrintDeck" aria-label="Bộ từ để dò bài"></select>' +
            '<label class="vs-check"><input id="vsHideEn" type="checkbox"><span>Che cột Tiếng Anh</span></label>' +
            '<label class="vs-check"><input id="vsHideVi" type="checkbox"><span>Che cột Tiếng Việt</span></label>' +
          '</div>' +
          '<div class="vs-row vs-table-actions">' +
            '<button type="button" data-vs-action="practice">' + ico("layers") + '<span>Luyện riêng các từ này</span></button>' +
            '<button type="button" data-vs-action="copy">' + ico("copy") + '<span>Sao chép danh sách</span></button>' +
            '<button type="button" class="vs-primary" data-vs-action="print">' + ico("printer") + '<span>In danh sách</span></button>' +
          '</div>' +
          '<div class="vs-tablewrap" id="vsPrintableArea"></div>' +
        '</section>' +

        /* 5. Settings Page */
        '<section id="vs_settingsPage" hidden>' +
          '<div class="vs-pagehead"><div class="vs-eyebrow">THEO CÁCH CỦA BẠN</div><h1>Cài đặt Vocab Studio</h1><p class="vs-subtitle">Quản lý đồng bộ đám mây, sao lưu JSON và nhịp học mỗi ngày.</p></div>' +
          '<div class="vs-settings-layout">' +
            '<div class="vs-panel"><h2>Tài khoản &amp; Đồng bộ Hybrid (Supabase / Cloud / Google Drive)</h2><p id="vsAuthModeInfo"></p><div class="vs-row"><button type="button" class="vs-primary" data-vs-action="syncNow">' + ico("refresh-cw") + '<span>Đồng bộ ngay lên Cloud</span></button></div></div>' +
            '<div class="vs-panel"><h2>Dữ liệu từ vựng (.json)</h2><p>Xuất hoặc nhập riêng dữ liệu Vocab Studio. Hệ thống kiểm tra trùng lặp thông minh (Ghi đè hoặc Bỏ qua) và đồng bộ cùng Google Drive Backup của AI Tutor.</p><div class="vs-row"><button type="button" class="vs-primary" data-vs-action="export">' + ico("download") + '<span>Xuất JSON</span></button><button type="button" data-vs-action="import">' + ico("upload") + '<span>Nhập JSON</span></button></div></div>' +
            '<div class="vs-panel"><h2>Chiều học mặc định</h2><p>Đảo nhanh chiều hiển thị câu hỏi/đáp án giữa Tiếng Việt và Tiếng Anh.</p><div class="vs-row"><button type="button" data-vs-action="direction">' + ico("arrow-left-right") + '<span>Đảo chiều học</span></button></div></div>' +
            '<div class="vs-panel"><h2>Nhịp học mỗi ngày (SM-2)</h2><p>Giới hạn từ mới cho ôn theo lịch, tính chung cho tất cả bộ từ.</p><label class="vs-row"><span>Từ mới / ngày</span><input id="vsNewWordsPerDay" class="vs-setting-limit vs-mono" type="number" min="0" max="500" step="1" value="10"></label></div>' +
          '</div>' +
        '</section>' +

        /* 6. Flashcards Page */
        '<section id="vs_flashcardsPage" hidden><div class="vs-pagehead"><div class="vs-eyebrow">TỪNG CHÚT MỘT, MỖI NGÀY</div><h1>Thẻ ghi nhớ 3D (SM-2)</h1><p class="vs-subtitle">Đúng lúc. Đúng từ. Ghi nhớ lâu hơn.</p></div><div class="vs-study-layout" id="vsFlashContent"></div></section>' +

        /* 7. Quiz Page */
        '<section id="vs_quizPage" hidden><div class="vs-pagehead"><div class="vs-eyebrow">THỬ SỨC VỚI NHỮNG TỪ ĐÃ HỌC</div><h1>Trung tâm kiểm tra</h1><p class="vs-subtitle">Trắc nghiệm, gõ từ, nghe chọn và nghe viết.</p></div><div class="vs-study-layout" id="vsQuizContent"></div></section>' +

        /* 8. Stats Page */
        '<section id="vs_statsPage" hidden><div class="vs-pagehead"><div class="vs-eyebrow">BƯỚC NHỎ, TIẾN BỘ DÀI</div><h1>Thống kê tiến độ</h1><p class="vs-subtitle">Mỗi lượt học đều được ghi lại theo ngày trên thiết bị và đồng bộ đám mây.</p></div><div id="vsStatsContent"></div></section>' +

        /* Scoped Modal 1: Add/Edit Word */
        '<div id="vsWordModal" class="vs-modal-overlay vs-hidden" role="dialog" aria-modal="true" aria-labelledby="vsWordTitle">' +
          '<div class="vs-modal-card">' +
            '<form id="vsWordForm">' +
              '<div class="vs-row vs-between"><h2 id="vsWordTitle">Thêm từ mới</h2><button type="button" class="vs-quiet vs-icon-btn" data-vs-action="closeWord" aria-label="Đóng">✕</button></div>' +
              '<div class="vs-modal-lookup">' +
                '<label for="vsModalDictQuery">Tra cứu và tự điền</label>' +
                '<div class="vs-dict-query-row" style="margin-top:6px">' +
                  '<input id="vsModalDictQuery" maxlength="150" placeholder="Nhập từ cần tra…" autocomplete="off">' +
                  '<select id="vsModalDictDirection" aria-label="Chiều tra trong form"><option value="auto">Tự nhận diện</option><option value="en-vi">Anh → Việt</option><option value="vi-en">Việt → Anh</option></select>' +
                  '<button type="button" class="vs-primary" id="vsModalDictButton" data-vs-action="lookupModal">Tra cứu</button>' +
                '</div>' +
                '<p class="vs-dict-status" id="vsModalDictStatus" role="status" aria-live="polite"></p>' +
                '<button type="button" id="vsModalDictCancel" class="vs-quiet" data-vs-action="cancelModalLookup" hidden>Hủy tra cứu</button>' +
              '</div>' +
              '<input type="hidden" name="audioUrl">' +
              '<label><span>Tiếng Anh *</span><input name="en" required maxlength="250" autocomplete="off"></label>' +
              '<label><span>Nghĩa tiếng Việt *</span><input name="vi" required maxlength="500"></label>' +
              '<div class="vs-twocol"><label><span>Phiên âm IPA</span><input class="vs-mono" name="ipa" maxlength="200"></label><label><span>Từ loại</span><input name="pos" maxlength="80" placeholder="danh từ, động từ…"></label></div>' +
              '<label><span>Ví dụ / Ngữ cảnh</span><textarea name="example" maxlength="1000" rows="2"></textarea></label>' +
              '<div class="vs-twocol"><label><span>Bài học / Nguồn</span><input name="unit" maxlength="100" placeholder="Tùy chọn"></label><label><span>Bộ từ</span><select name="deckId"></select></label></div>' +
              '<div class="vs-row" style="justify-content:flex-end"><button type="button" data-vs-action="closeWord">Hủy</button><button type="submit" class="vs-primary">Lưu từ</button></div>' +
            '</form>' +
          '</div>' +
        '</div>' +

        /* Scoped Modal 2: Create/Rename Deck */
        '<div id="vsDeckModal" class="vs-modal-overlay vs-hidden" role="dialog" aria-modal="true" aria-labelledby="vsDeckTitle">' +
          '<div class="vs-modal-card">' +
            '<form id="vsDeckForm">' +
              '<h2 id="vsDeckTitle">Tạo bộ từ</h2>' +
              '<label><span>Tên bộ từ</span><input name="name" required maxlength="100"></label>' +
              '<div class="vs-row" style="justify-content:flex-end"><button type="button" data-vs-action="closeDeck">Hủy</button><button class="vs-primary" type="submit">Lưu bộ từ</button></div>' +
            '</form>' +
          '</div>' +
        '</div>' +

        /* Scoped Modal 3: Smart Duplicate Resolution (Merge vs Skip) */
        '<div id="vsDuplicateModal" class="vs-modal-overlay vs-hidden" role="dialog" aria-modal="true">' +
          '<div class="vs-modal-card">' +
            '<h2>Phát hiện từ vựng trùng lặp</h2>' +
            '<p id="vsDuplicateMsg" class="vs-muted" style="margin:10px 0 18px"></p>' +
            '<div class="vs-row" style="justify-content:flex-end">' +
              '<button type="button" data-vs-action="dupSkip">Bỏ qua (Skip)</button>' +
              '<button type="button" class="vs-primary" data-vs-action="dupMerge">Ghi đè / Hợp nhất (Merge)</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<input type="file" id="vsImportFile" accept=".json,application/json" hidden>' +
      '</div>'
    );
  }

  /* ===== MODULE: Event Delegation & Keyboard Shortcuts ===== */
  const actions = {
    add: function () { openWord(); },
    reveal: function () { filteredWords().forEach(function (w) { revealed.add(w.id); }); renderGrid(); },
    hide: function () { filteredWords().forEach(function (w) { revealed.delete(w.id); }); renderGrid(); },
    shuffle: shuffle,
    sort: function () { order = []; renderGrid(); },
    newDeck: function () { openDeck(); },
    closeWord: closeWordModal,
    closeDeck: closeDeckModal,
    practice: function () { startFlash("starred", printDeckFilter); },
    copy: copyList,
    print: printReviewTable,
    export: downloadJSON,
    import: function () { const inp = $("vsImportFile"); if (inp) inp.click(); },
    direction: function () { changeDirection(VocabStorageService.data.settings.direction === "vi-en" ? "en-vi" : "vi-en"); },
    reviewToday: function () { startFlash("scheduled", "all"); },
    startFlash: function () { startFlash(); },
    exitFlash: exitFlash,
    flipFlash: flipFlash,
    speakFlash: function () { const cur = flashCurrent(); if (cur) speak(cur.id); },
    showStats: function () { navigate("stats"); },
    startQuiz: function () { startQuiz(false); },
    retryQuiz: function () { startQuiz(true); },
    nextQuiz: nextQuiz,
    acceptPartial: acceptPartialAnswer,
    exitQuiz: exitQuiz,
    speakQuiz: function () { const cur = quizCurrent(); if (cur) speak(cur.id); },
    moreWords: function () { gridLimit += 60; renderGrid(); },
    lookupModal: function () { runLookup("modal"); },
    cancelDictionary: function () { cancelLookup("page"); },
    cancelModalLookup: function () { cancelLookup("modal"); },
    saveDictionary: saveDictionaryWord,
    editDictionary: openDictionaryForm,
    speakDictionary: speakDictionary,
    syncNow: function () {
      const user = VocabStorageService.getCurrentUser();
      if (!user) {
        toast("Vui lòng đăng nhập tài khoản Google để đồng bộ dữ liệu từ vựng lên đám mây.", "warning");
        return;
      }
      VocabStorageService.pullAndAutoMigrate().then(function () {
        toast("Đã đồng bộ dữ liệu Vocab Studio với đám mây!", "success");
      });
    },
    dupMerge: function () { if (duplicatePromptResolver) duplicatePromptResolver("merge"); },
    dupSkip: function () { if (duplicatePromptResolver) duplicatePromptResolver("skip"); }
  };

  function isVocabStudioVisible() {
    const c = $("vocabStudioContainer");
    if (!c) return false;
    const view = c.closest(".view");
    if (view && view.classList.contains("hidden")) return false;
    return true;
  }

  function handleContainerClick(event) {
    const target = event.target.closest("button,[data-vs-flip]");
    if (!target) return;

    if (target.dataset.vsWordAction) {
      event.stopPropagation();
      const card = target.closest("[data-vs-id]");
      if (!card) return;
      const id = card.dataset.vsId;
      focused = id;
      const w = VocabStorageService.data.words.find(function (x) { return x.id === id; });
      if (!w) return;
      switch (target.dataset.vsWordAction) {
        case "star":
          VocabStorageService.updateWord(id, { starred: !w.starred });
          break;
        case "known":
          VocabStorageService.updateWord(id, { status: w.status === "known" ? "new" : "known" });
          break;
        case "speak":
          speak(id);
          break;
        case "edit":
          openWord(id);
          break;
        case "delete":
          if (U() && typeof U().showConfirm === "function") {
            U().showConfirm("Xóa từ vựng", "Xóa từ “" + w.en + "”?", function () {
              VocabStorageService.removeWord(id);
              toast("Đã xóa từ cá nhân", "info");
            });
          } else if (confirm("Xóa từ “" + w.en + "”?")) {
            VocabStorageService.removeWord(id);
            toast("Đã xóa từ cá nhân", "info");
          }
          break;
      }
      return;
    }
    if (target.dataset.vsPage) { navigate(target.dataset.vsPage); return; }
    if (target.dataset.vsDir) { changeDirection(target.dataset.vsDir); return; }
    if (target.dataset.vsAction) { if (actions[target.dataset.vsAction]) actions[target.dataset.vsAction](); return; }
    if (target.dataset.vsFlip) { flip(target.dataset.vsFlip); return; }
    if (target.dataset.vsStudyDeck) {
      deckFilter = target.dataset.vsStudyDeck;
      filter = "all";
      query = "";
      const sEl = $("vsSearch"); if (sEl) sEl.value = "";
      navigate("grid");
      return;
    }
    if (target.dataset.vsRenameDeck) { openDeck(target.dataset.vsRenameDeck); return; }
    if (target.dataset.vsDeleteDeck) { deleteDeck(target.dataset.vsDeleteDeck); return; }
    if (target.dataset.vsCell) { openCells.add(target.dataset.vsCell); renderTable(); return; }
    if (target.dataset.vsGrade) { event.preventDefault(); gradeFlash(Number(target.dataset.vsGrade)); return; }
    if (target.dataset.vsQuizChoice !== undefined) {
      event.preventDefault();
      submitQuiz("", Number(target.dataset.vsQuizChoice));
      return;
    }
    if (target.dataset.vsLookupWord) {
      const qEl = $("vsDictQuery");
      if (qEl) { qEl.value = target.dataset.vsLookupWord; runLookup("page"); }
      return;
    }
    if (target.dataset.vsDictAudio) {
      const r = dictionaryViews.page.result;
      if (r) {
        const url = target.dataset.vsDictAudio === "uk" ? r.ukAudio : r.usAudio;
        if (url) speakWordRecord({ en: r.en, audioUrl: url });
        else speakWordRecord(r);
      }
      return;
    }
    if (target.dataset.vsSpeakText) {
      speakWordRecord({ en: target.dataset.vsSpeakText, audioUrl: "" });
      return;
    }
  }

  function handleContainerChange(event) {
    const t = event.target;
    if (!t) return;
    if (t.dataset.vsMove) {
      event.stopPropagation();
      VocabStorageService.updateWord(t.dataset.vsMove, { deckId: t.value });
      toast("Đã chuyển bộ từ", "success");
      return;
    }
    if (t.dataset.vsSenseIdx !== undefined) {
      const r = dictionaryViews.page.result;
      const idx = Number(t.dataset.vsSenseIdx);
      if (r && Array.isArray(r.senses) && r.senses[idx]) {
        r.senses[idx].selected = !!t.checked;
        renderDictionary();
      }
      return;
    }
    if (t.dataset.vsSmartDeck) {
      const did = t.dataset.vsSmartDeck;
      const pos = smartReviewState.selectedDecks.indexOf(did);
      if (t.checked && pos === -1) smartReviewState.selectedDecks.push(did);
      else if (!t.checked && pos !== -1) smartReviewState.selectedDecks.splice(pos, 1);
      renderQuiz();
      return;
    }
    const id = t.id, value = t.value;
    if (id === "vsGridDeck") { deckFilter = value; gridLimit = 60; renderGrid(); }
    else if (id === "vsFilter") { filter = value; gridLimit = 60; renderGrid(); }
    else if (id === "vsPrintDeck") { printDeckFilter = value; openCells.clear(); renderTable(); }
    else if (id === "vsHideEn" || id === "vsHideVi") { openCells.clear(); renderTable(); }
    else if (id === "vsDictSaveDeck") { dictDeck = value; }
    else if (id === "vsFlashDeck") { flashDeck = value; renderFlash(); }
    else if (id === "vsFlashMode") { flashMode = value; renderFlash(); }
    else if (id === "vsQuizDirection") { changeDirection(value); }
    else if (id === "vsNewWordsPerDay") {
      const number = Number(value);
      if (!Number.isInteger(number) || number < 0 || number > 500) {
        t.value = VocabStorageService.data.settings.newWordsPerDay;
        throw new Error("Giới hạn từ mới cần là số nguyên từ 0 đến 500");
      }
      VocabStorageService.commit(function (d) { d.settings.newWordsPerDay = number; });
      toast("Đã lưu giới hạn từ mới mỗi ngày", "success");
    } else if (id === "vsImportFile") {
      const file = t.files && t.files[0];
      t.value = "";
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) throw new Error("JSON vượt quá 10 MB");
      file.text().then(function (txt) {
        handleImportPayload(JSON.parse(txt));
      }).catch(function (err) {
        toast("Không thể nhập JSON: " + (err && err.message ? err.message : "Lỗi định dạng"), "error");
      });
    } else {
      const configKeys = {
        vsQuizSource: "source",
        vsQuizDeck: "deck",
        vsQuizCount: "count",
        vsQuizType: "type",
        vsQuizListenStyle: "listenStyle"
      };
      if (configKeys[id]) {
        quizConfig[configKeys[id]] = value;
        if (id === "vsQuizSource" && value === "deck" && quizConfig.deck === "all") quizConfig.deck = DEFAULT_DECK;
        renderQuiz();
      }
    }
  }

  function handleContainerInput(event) {
    const t = event.target;
    if (!t) return;
    if (t.id === "vsSearch") {
      query = t.value;
      gridLimit = 60;
      renderGrid();
    } else if (t.id === "vsQuizInput" && quizSession) {
      quizSession.draft = t.value;
    }
  }

  function handleContainerSubmit(event) {
    const t = event.target;
    if (!t) return;
    if (t.id === "vsWordForm") {
      event.preventDefault();
      saveWord(event);
    } else if (t.id === "vsDeckForm") {
      event.preventDefault();
      saveDeck(event);
    } else if (t.id === "vsDictionaryForm") {
      event.preventDefault();
      runLookup("page");
    } else if (t.id === "vsQuizAnswerForm") {
      event.preventDefault();
      const inp = $("vsQuizInput");
      submitQuiz(inp ? inp.value : "");
    }
  }

  function handleGlobalKeydown(e) {
    if (!isVocabStudioVisible()) return;
    if (e.target && e.target.id === "vsModalDictQuery" && e.key === "Enter") {
      e.preventDefault();
      runLookup("modal");
      return;
    }
    if (e.key === "Escape") {
      const wm = $("vsWordModal"), dm = $("vsDeckModal"), dupm = $("vsDuplicateModal");
      if (wm && !wm.classList.contains("vs-hidden")) { closeWordModal(); return; }
      if (dm && !dm.classList.contains("vs-hidden")) { closeDeckModal(); return; }
      if (dupm && !dupm.classList.contains("vs-hidden")) { if (duplicatePromptResolver) duplicatePromptResolver("skip"); return; }
    }
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing) return;
    if (e.target && e.target.closest && e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
    const anyModal = document.querySelector(".vocab-studio-container .vs-modal-overlay:not(.vs-hidden)");
    if (anyModal) return;

    if (e.key === "/") {
      e.preventDefault();
      navigate("grid");
      const sEl = $("vsSearch");
      if (sEl) sEl.focus();
      return;
    }
    if (page === "flashcards" && flashSession && flashSession.queue.length) {
      if (e.code === "Space" && (!e.target.closest("button,a") || e.target.id === "vsFlashFlip")) {
        e.preventDefault();
        flipFlash();
        return;
      }
      if (["1", "2", "3"].indexOf(e.key) !== -1) {
        e.preventDefault();
        gradeFlash(Number(e.key));
        return;
      }
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        const cur = flashCurrent();
        if (cur) speak(cur.id);
      }
      return;
    }
    if (page === "quiz") {
      if (e.key.toLowerCase() === "s" && quizCurrent() && quizSession.type === "listening") {
        e.preventDefault();
        speak(quizCurrent().id);
      }
      return;
    }
    if (page !== "grid") return;
    const fWords = filteredWords();
    const id = fWords.some(function (w) { return w.id === focused; }) ? focused : (fWords[0] && fWords[0].id);
    if ((e.code === "Space" || e.key === "Enter") && e.target && e.target.matches && e.target.matches("[data-vs-flip]")) {
      e.preventDefault();
      flip(e.target.getAttribute("data-vs-flip"));
      return;
    }
    if (e.code === "Space" && (!e.target || !e.target.closest("button,a"))) {
      e.preventDefault();
      if (id) flip(id);
    }
    if (e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (id) speak(id);
    }
  }

  /* ===== MODULE: Mount & Lifecycle ===== */
  let listenersAttached = false;

  function mount(rootId) {
    const targetId = rootId || "vocabRoot";
    const root = $(targetId);
    if (!root) return;
    if (!root.querySelector("#vocabStudioContainer") || mountedRootId !== targetId) {
      mountedRootId = targetId;
      root.innerHTML = buildVocabStudioTemplate();
      const container = $("vocabStudioContainer");
      if (container) {
        container.addEventListener("click", guard(handleContainerClick));
        container.addEventListener("change", guard(handleContainerChange));
        container.addEventListener("input", guard(handleContainerInput));
        container.addEventListener("submit", guard(handleContainerSubmit));
      }
    }
    render();
    const user = VocabStorageService.getCurrentUser();
    if (user && VocabStorageService.lastSyncedEmail !== String(user.email).trim().toLowerCase()) {
      VocabStorageService.pullAndAutoMigrate();
    }
  }

  function initGlobalListeners() {
    if (listenersAttached) return;
    listenersAttached = true;
    VocabStorageService.load();
    DictCache.load();
    document.addEventListener("keydown", guard(handleGlobalKeydown));
    window.addEventListener("storage", guard(function (e) {
      if (e.key === VocabStorageService.key) {
        VocabStorageService.load();
        revealed.clear();
        render();
      }
    }));
    window.addEventListener("online", function () {
      renderAuthBadge();
      if (VocabStorageService.pendingSync) {
        VocabStorageService.scheduleDebouncedSync();
      }
    });
    window.addEventListener("offline", function () {
      VocabStorageService.syncStatus = "offline";
      renderAuthBadge();
    });
  }

  /* ===== MODULE: Cross-Module Bridge (window.VocabStudioBridge) ===== */
  function quickAddWord(word, meaning, context) {
    initGlobalListeners();
    const cleanWord = String(word || "").trim().slice(0, 240);
    const cleanMeaning = String(meaning || "").trim().slice(0, 480);
    const cleanContext = String(context || "").trim().slice(0, 900);

    // If running inside AI Tutor SPA, open Vocab Studio or add directly with feedback
    if (cleanWord && cleanMeaning) {
      const existing = activeWords().find(function (w) {
        return wordEnKey(w) === cleanPairText(cleanWord);
      });
      if (existing) {
        // Switch to vocab view and ask Merge vs Skip
        if (U() && typeof U().showTab === "function" && $("vocabRoot")) {
          U().showTab("vocab");
          mount("vocabRoot");
        }
        askDuplicatePolicyModal(1, [cleanWord], function (policy) {
          if (policy === "merge") {
            VocabStorageService.updateWord(existing.id, {
              en: cleanWord,
              vi: cleanMeaning,
              example: cleanContext || existing.example
            });
            toast("Đã cập nhật từ “" + cleanWord + "” trong Vocab Studio!", "success");
          } else {
            toast("Đã giữ nguyên từ “" + cleanWord + "” trong Vocab Studio.", "info");
          }
        });
        return existing;
      }

      const record = wordSchema({
        id: uuid(),
        en: cleanWord,
        vi: cleanMeaning,
        example: cleanContext,
        unit: "AI Tutor Quick Save",
        deckId: DEFAULT_DECK,
        custom: true
      });
      VocabStorageService.commit(function (d) {
        d.words.push(record);
      });
      toast("Đã lưu nhanh “" + cleanWord + "” vào Vocab Studio!", "success");
      return record;
    }

    // If word or meaning is missing, switch to Vocab Studio and open pre-filled modal with auto-lookup
    if (U() && typeof U().showTab === "function" && $("vocabRoot")) {
      U().showTab("vocab");
      mount("vocabRoot");
    } else if ($("vocabRoot")) {
      mount("vocabRoot");
    }
    openWord();
    const form = $("vsWordForm");
    if (form) {
      if (cleanWord) form.elements.en.value = cleanWord;
      if (cleanMeaning) form.elements.vi.value = cleanMeaning;
      if (cleanContext) form.elements.example.value = cleanContext;
      form.elements.unit.value = "AI Tutor";
    }
    if (cleanWord && !cleanMeaning) {
      const mq = $("vsModalDictQuery");
      if (mq) {
        mq.value = cleanWord;
        runLookup("modal");
      }
    }
    return null;
  }

  initGlobalListeners();

  window.VocabStudio = {
    mount: mount,
    render: render,
    navigate: navigate,
    storage: VocabStorageService,
    buildDeduplicatedReviewPool: buildDeduplicatedReviewPool,
    syncMasteryToCopies: syncMasteryToCopies,
    gradeTier1Exact: gradeTier1Exact,
    gradeTier2Semantic: gradeTier2Semantic,
    getOtherDecksForWord: getOtherDecksForWord,
    exportBackupData: function () { return VocabStorageService.exportData(); },
    importBackupData: function (data, mode) {
      if (!data || typeof data !== "object") return false;
      try {
        if (mode === "replace") {
          const clean = normalize(data);
          VocabStorageService.persist(clean);
          VocabStorageService.data = clean;
          VocabStorageService.setPendingSync(true);
          render();
          VocabStorageService.scheduleDebouncedSync();
          return true;
        }
        mergeImportWithPolicy(data, "merge");
        return true;
      } catch (e) {
        return false;
      }
    },
    onUserAuthenticated: function () {
      VocabStorageService.pullAndAutoMigrate();
    }
  };

  window.VocabStudioBridge = {
    quickAddWord: quickAddWord
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if ($("vocabStandaloneRoot")) mount("vocabStandaloneRoot");
    });
  } else {
    if ($("vocabStandaloneRoot")) mount("vocabStandaloneRoot");
  }
})();
