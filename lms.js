/* ============================================================
   AI Tutor – Teacher LMS & Assignment Management (lms.js)
   Modular LMS for Creator Studio:
   1. Students & Classes Directory + Student Portfolio + 4-Digit PIN
   2. Quiz Assignments, Access Control, Deadlines, Remedial Quizzes
   3. Student Exam Runner (Auto-Save/Resume, Anti-Cheating, Ask Teacher)
   4. Gradebook, Most-Missed Analytics, Parent Emails & Read Receipts
   5. A4 PDF Worksheet with QR Code + Detached Answer Key, Excel/CSV Export
   ============================================================ */
(function () {
  "use strict";

  const LMS_KEYS = {
    students: "uet_lms_students",
    assignments: "uet_lms_assignments",
    submissions: "uet_lms_submissions",
    drafts: "uet_lms_drafts",
    emailLogs: "uet_lms_email_logs",
    feedbackRules: "uet_lms_feedback_rules"
  };

  const DEFAULT_FEEDBACK_RULES = [
    { min: 9, max: 10, comment: "Nắm bài rất chắc, tư duy xuất sắc và cẩn thận. Tiếp tục phát huy!" },
    { min: 7, max: 8.99, comment: "Hiểu bài tốt, còn một vài lỗi nhỏ cần lưu ý để đạt điểm tuyệt đối." },
    { min: 5, max: 6.99, comment: "Đạt mức trung bình khá. Cần ôn lại các câu làm sai để củng cố kiến thức." },
    { min: 0, max: 4.99, comment: "Cần xem lại lý thuyết cơ bản và luyện tập thêm bài tập bổ trợ." }
  ];

  const ICONS = {
    plus: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>',
    upload: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg>',
    download: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>',
    mail: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>',
    bell: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>',
    link: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    printer: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect width="12" height="8" x="6" y="14"></rect></svg>',
    check: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    lock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    flag: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>',
    sparkles: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path></svg>',
    clock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    user: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    alert: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>'
  };

  function U() { return window.UET; }
  function tr(viStr) {
    if (!U() || typeof U().translateString !== "function") return viStr;
    return U().translateString(viStr, U().getLang ? U().getLang() : "vi");
  }
  function esc(s) { return U() ? U().esc(s) : String(s || ""); }

  /* ======================== DATA LAYER ======================== */
  function loadStudents() { return U().loadArr(LMS_KEYS.students); }
  function saveStudents(list) { return U().saveJSON(LMS_KEYS.students, list); }

  function loadAssignments() { return U().loadArr(LMS_KEYS.assignments); }
  function saveAssignments(list) { return U().saveJSON(LMS_KEYS.assignments, list); }

  function loadSubmissions() { return U().loadArr(LMS_KEYS.submissions); }
  function saveSubmissions(list) { return U().saveJSON(LMS_KEYS.submissions, list); }

  function loadDrafts() { return U().loadObj(LMS_KEYS.drafts); }
  function saveDrafts(obj) { return U().saveJSON(LMS_KEYS.drafts, obj); }

  function loadEmailLogs() { return U().loadArr(LMS_KEYS.emailLogs); }
  function saveEmailLogs(list) { return U().saveJSON(LMS_KEYS.emailLogs, list.slice(-200)); }

  function loadFeedbackRules() {
    const saved = U().loadArr(LMS_KEYS.feedbackRules);
    return saved && saved.length ? saved : DEFAULT_FEEDBACK_RULES.slice();
  }
  function saveFeedbackRules(rules) { return U().saveJSON(LMS_KEYS.feedbackRules, rules); }

  function genPin() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }
  function genAssignCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "LMS-";
    for (let i = 0; i < 5; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  function fmtDeadlineParts(iso) {
    if (!iso) return { hhmm: "--:--", ddmmyyyy: "--/--/----", full: "" };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { hhmm: "--:--", ddmmyyyy: "--/--/----", full: "" };
    const hhmm = pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    const ddmmyyyy = pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear();
    return { hhmm: hhmm, ddmmyyyy: ddmmyyyy, full: hhmm + " " + ddmmyyyy };
  }
  function fmtDuration(sec) {
    const s = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return pad2(m) + ":" + pad2(r);
  }
  function toLocalInputVal(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function getAllAvailableQuizzes() {
    const studioQzs = U().loadArr(U().KEYS.quizzes) || [];
    const decks = U().getDecks ? U().getDecks() : [];
    const map = {};
    const out = [];
    studioQzs.forEach(function (q) {
      if (!q || !q.id || !Array.isArray(q.questions) || !q.questions.length) return;
      map[q.id] = true;
      out.push(q);
    });
    decks.forEach(function (d) {
      if (!d || !d.id || !Array.isArray(d.questions) || !d.questions.length) return;
      const id = "deck_" + d.id;
      if (!map[id]) out.push({ id: id, title: d.title, tag: d.tag || "Tổng hợp", questions: d.questions });
    });
    return out;
  }

  function getAssignmentStatus(a) {
    const now = Date.now();
    const openMs = a.openAt ? new Date(a.openAt).getTime() : 0;
    const deadMs = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    if (openMs && now < openMs) return "upcoming";
    if (deadMs && now > deadMs) return "closed";
    return "active";
  }

  function getAssignedStudentsFor(a) {
    const all = loadStudents();
    if (a.targetMode === "class" && a.targetClass) {
      return all.filter(function (s) { return s.className === a.targetClass; });
    }
    const ids = Array.isArray(a.targetStudentIds) ? a.targetStudentIds : [];
    return all.filter(function (s) { return ids.indexOf(s.id) !== -1; });
  }

  function getStudentSubmissions(assignId, studentId) {
    return loadSubmissions().filter(function (s) {
      return s.assignmentId === assignId && s.studentId === studentId;
    }).sort(function (a, b) {
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });
  }

  function pickEffectiveSubmission(subs, policy) {
    if (!subs || !subs.length) return null;
    if (policy === "first") return subs[0];
    return subs.reduce(function (best, cur) {
      return (cur.score10 > best.score10) ? cur : best;
    }, subs[0]);
  }

  function computeDynamicFeedback(score10, rules) {
    const list = rules && rules.length ? rules : loadFeedbackRules();
    const s = Number(score10) || 0;
    for (let i = 0; i < list.length; i++) {
      if (s >= Number(list[i].min) && s <= Number(list[i].max)) return list[i].comment;
    }
    return list[list.length - 1] ? list[list.length - 1].comment : "";
  }

  function buildAssignmentUrl(code) {
    return (window.location.origin || "") + "/creator-studio?assign=" + encodeURIComponent(code);
  }
  function buildReceiptUrl(subId) {
    return (window.location.origin || "") + "/creator-studio?receipt=" + encodeURIComponent(subId);
  }
  function buildSubmissionReviewUrl(code, subId) {
    let url = (window.location.origin || "") + "/creator-studio?assign=" + encodeURIComponent(code || "");
    if (subId) url += "&attempt=" + encodeURIComponent(subId);
    url += "&review=1";
    return url;
  }

  /* ======================== LOCAL ZERO-DEPENDENCY SVG QR GENERATOR (ISO/IEC 18004, EC-L, V1-V10) ======================== */
  const QR_EC_L_SPECS = [
    null,
    { ver: 1,  size: 21, dataBytes: 19,  ecPerBlock: 7,  blocks: [1],       align: [] },
    { ver: 2,  size: 25, dataBytes: 34,  ecPerBlock: 10, blocks: [1],       align: [6, 18] },
    { ver: 3,  size: 29, dataBytes: 55,  ecPerBlock: 15, blocks: [1],       align: [6, 22] },
    { ver: 4,  size: 33, dataBytes: 80,  ecPerBlock: 20, blocks: [1],       align: [6, 26] },
    { ver: 5,  size: 37, dataBytes: 108, ecPerBlock: 26, blocks: [1],       align: [6, 30] },
    { ver: 6,  size: 41, dataBytes: 136, ecPerBlock: 18, blocks: [2],       align: [6, 34] },
    { ver: 7,  size: 45, dataBytes: 156, ecPerBlock: 20, blocks: [2],       align: [6, 22, 38] },
    { ver: 8,  size: 49, dataBytes: 194, ecPerBlock: 24, blocks: [2],       align: [6, 24, 42] },
    { ver: 9,  size: 53, dataBytes: 232, ecPerBlock: 30, blocks: [2],       align: [6, 26, 46] },
    { ver: 10, size: 57, dataBytes: 274, ecPerBlock: 18, blocks: [2, 2],    align: [6, 28, 50], g1Data: 68, g2Data: 69 }
  ];

  const QR_GF_EXP = new Uint8Array(512);
  const QR_GF_LOG = new Uint8Array(256);
  (function initQrGf() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      QR_GF_EXP[i] = x;
      QR_GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) QR_GF_EXP[i] = QR_GF_EXP[i - 255];
  })();

  function qrGfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return QR_GF_EXP[QR_GF_LOG[a] + QR_GF_LOG[b]];
  }

  function qrRsPoly(deg) {
    let poly = [1];
    for (let i = 0; i < deg; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = QR_GF_EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= qrGfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function qrRsRemainder(data, ecLen) {
    const gen = qrRsPoly(ecLen);
    const rem = new Uint8Array(ecLen);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ rem[0];
      for (let j = 0; j < ecLen - 1; j++) rem[j] = rem[j + 1];
      rem[ecLen - 1] = 0;
      if (factor !== 0) {
        for (let j = 0; j < ecLen; j++) rem[j] ^= qrGfMul(gen[j + 1], factor);
      }
    }
    return rem;
  }

  function qrUtf8Bytes(str) {
    if (typeof TextEncoder !== "undefined") {
      return Array.from(new TextEncoder().encode(String(str || "")));
    }
    const out = [];
    const s = unescape(encodeURIComponent(String(str || "")));
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function encodeQrMatrix(text) {
    const bytes = qrUtf8Bytes(text);
    let spec = null;
    for (let v = 1; v < QR_EC_L_SPECS.length; v++) {
      const sp = QR_EC_L_SPECS[v];
      const countBits = v <= 9 ? 8 : 16;
      const capBits = sp.dataBytes * 8;
      if (4 + countBits + bytes.length * 8 <= capBits) {
        spec = sp;
        break;
      }
    }
    if (!spec) {
      // Truncate safely to max v10 capacity if URL is unusually long
      spec = QR_EC_L_SPECS[10];
      bytes.length = Math.min(bytes.length, spec.dataBytes - 3);
    }

    // 1. Build data bit stream (Byte mode: 0100)
    const bits = [];
    const pushBits = function (val, len) {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };
    pushBits(0x4, 4);
    pushBits(bytes.length, spec.ver <= 9 ? 8 : 16);
    for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);
    const totalBits = spec.dataBytes * 8;
    const termLen = Math.min(4, totalBits - bits.length);
    pushBits(0, termLen);
    while (bits.length % 8 !== 0) bits.push(0);
    let padIdx = 0;
    while (bits.length < totalBits) {
      pushBits(padIdx % 2 === 0 ? 0xec : 0x11, 8);
      padIdx++;
    }
    const dataCw = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      dataCw.push(b);
    }

    // 2. Split into RS blocks & interleave
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    if (spec.blocks.length === 1) {
      const nBlk = spec.blocks[0];
      const blkLen = Math.floor(spec.dataBytes / nBlk);
      for (let b = 0; b < nBlk; b++) {
        const chunk = dataCw.slice(offset, offset + blkLen);
        offset += blkLen;
        dataBlocks.push(chunk);
        ecBlocks.push(qrRsRemainder(chunk, spec.ecPerBlock));
      }
    } else {
      for (let b = 0; b < spec.blocks[0]; b++) {
        const chunk = dataCw.slice(offset, offset + spec.g1Data);
        offset += spec.g1Data;
        dataBlocks.push(chunk);
        ecBlocks.push(qrRsRemainder(chunk, spec.ecPerBlock));
      }
      for (let b = 0; b < spec.blocks[1]; b++) {
        const chunk = dataCw.slice(offset, offset + spec.g2Data);
        offset += spec.g2Data;
        dataBlocks.push(chunk);
        ecBlocks.push(qrRsRemainder(chunk, spec.ecPerBlock));
      }
    }

    const codewords = [];
    const maxDataLen = Math.max.apply(null, dataBlocks.map(function (b) { return b.length; }));
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < dataBlocks.length; b++) {
        if (i < dataBlocks[b].length) codewords.push(dataBlocks[b][i]);
      }
    }
    for (let i = 0; i < spec.ecPerBlock; i++) {
      for (let b = 0; b < ecBlocks.length; b++) codewords.push(ecBlocks[b][i]);
    }

    // 3. Matrix & Function patterns
    const N = spec.size;
    const mat = Array.from({ length: N }, function () { return new Uint8Array(N); });
    const isFunc = Array.from({ length: N }, function () { return new Uint8Array(N); });
    const setFunc = function (r, c, dark) {
      if (r < 0 || c < 0 || r >= N || c >= N) return;
      mat[r][c] = dark ? 1 : 0;
      isFunc[r][c] = 1;
    };

    const drawFinder = function (r0, c0) {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = r0 + dr, c = c0 + dc;
          if (r < 0 || c < 0 || r >= N || c >= N) continue;
          const dark = (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) &&
            (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
          setFunc(r, c, dark);
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, N - 7);
    drawFinder(N - 7, 0);

    // Timing patterns
    for (let i = 8; i < N - 8; i++) {
      setFunc(6, i, i % 2 === 0);
      setFunc(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    const al = spec.align;
    for (let i = 0; i < al.length; i++) {
      for (let j = 0; j < al.length; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
        const cr = al[i], cc = al[j];
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setFunc(cr + dr, cc + dc, dark);
          }
        }
      }
    }

    // Reserve format info + dark module
    for (let i = 0; i <= 8; i++) {
      if (!isFunc[8][i]) setFunc(8, i, false);
      if (!isFunc[i][8]) setFunc(i, 8, false);
    }
    for (let i = N - 8; i < N; i++) {
      if (!isFunc[8][i]) setFunc(8, i, false);
      if (!isFunc[i][8]) setFunc(i, 8, false);
    }
    setFunc(N - 8, 8, true);

    // Version info for v >= 7
    if (spec.ver >= 7) {
      let rem = spec.ver;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const vBits = (spec.ver << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = ((vBits >>> i) & 1) === 1;
        const a = N - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunc(a, b, bit);
        setFunc(b, a, bit);
      }
    }

    // 4. Place data bits in zigzag
    const allBits = [];
    for (let i = 0; i < codewords.length; i++) {
      for (let b = 7; b >= 0; b--) allBits.push((codewords[i] >>> b) & 1);
    }
    let bitIdx = 0;
    for (let right = N - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      const upward = ((right + 1) & 2) === 0;
      for (let v = 0; v < N; v++) {
        const r = upward ? (N - 1 - v) : v;
        for (let j = 0; j < 2; j++) {
          const c = right - j;
          if (!isFunc[r][c]) {
            mat[r][c] = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          }
        }
      }
    }

    // 5. Apply Mask 0 ((r + c) % 2 === 0) and write EC-L Format Info (EC-L = 01, Mask 0 = 000 -> 01000)
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!isFunc[r][c] && ((r + c) % 2 === 0)) mat[r][c] ^= 1;
      }
    }
    const fmtData = (1 << 3) | 0; // EC-L (01) + Mask 0 (000)
    let fmtRem = fmtData;
    for (let i = 0; i < 10; i++) fmtRem = (fmtRem << 1) ^ ((fmtRem >>> 9) * 0x537);
    const fmtBits = ((fmtData << 10) | fmtRem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFunc(8, i, ((fmtBits >>> i) & 1) === 1);
    setFunc(8, 7, ((fmtBits >>> 6) & 1) === 1);
    setFunc(8, 8, ((fmtBits >>> 7) & 1) === 1);
    setFunc(7, 8, ((fmtBits >>> 8) & 1) === 1);
    for (let i = 9; i < 15; i++) setFunc(14 - i, 8, ((fmtBits >>> i) & 1) === 1);
    for (let i = 0; i < 8; i++) setFunc(N - 1 - i, 8, ((fmtBits >>> i) & 1) === 1);
    for (let i = 8; i < 15; i++) setFunc(8, N - 15 + i, ((fmtBits >>> i) & 1) === 1);
    setFunc(N - 8, 8, true);

    return mat;
  }

  function generateQrSvg(text, sizePx) {
    const px = Number(sizePx) || 104;
    const mat = encodeQrMatrix(text);
    const N = mat.length;
    const quiet = 3;
    const dim = N + quiet * 2;
    const paths = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (mat[r][c]) paths.push("M" + (c + quiet) + "," + (r + quiet) + "h1v1h-1z");
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges" role="img" aria-label="QR Code">' +
      '<rect width="' + dim + '" height="' + dim + '" fill="#ffffff"/>' +
      '<path d="' + paths.join("") + '" fill="#000000"/>' +
    '</svg>';
  }

  /* ======================== LMS UI STATE ======================== */
  const lmsState = {
    classFilter: "all",
    studentQuery: "",
    portfolioStudentId: null,
    selectedAssignmentId: null,
    assignGradeFilter: "all",
    assignSubjectFilter: "all",
    expandedRecipients: {},
    // Student exam runner state
    activeAssignCode: null,
    studentSession: null, // { assignId, studentId, attemptNo, questions, answers, idx, remainingSec, totalSec, startedAt, tabSwitches, blurHandler, visHandler, timerId }
    lastSubmissionId: null,
    activeReceiptId: null,
    mounted: false
  };

  /* ======================== SUB-NAVBAR FOR CREATOR STUDIO ======================== */
  function renderStudioSubnav(activeView) {
    const studentsCount = loadStudents().length;
    const assignCount = loadAssignments().length;
    return '<div class="lms-subnav" role="tablist">' +
      '<button type="button" class="lms-subtab' + (activeView === "home" || activeView === "editor" ? " active" : "") + '" data-lms-nav="home">Thư viện &amp; Soạn đề</button>' +
      '<button type="button" class="lms-subtab' + (activeView === "students" ? " active" : "") + '" data-lms-nav="students">Học sinh &amp; Lớp học <span class="lms-tab-cnt">' + studentsCount + '</span></button>' +
      '<button type="button" class="lms-subtab' + (activeView === "assignments" ? " active" : "") + '" data-lms-nav="assignments">Giao bài tập <span class="lms-tab-cnt">' + assignCount + '</span></button>' +
      '<button type="button" class="lms-subtab' + (activeView === "gradebook" ? " active" : "") + '" data-lms-nav="gradebook">Sổ điểm &amp; Phân tích</button>' +
    '</div>';
  }

  /* ======================== VIEW 1: STUDENTS & CLASSES + PORTFOLIO ======================== */
  function renderStudentsView(root) {
    if (lmsState.portfolioStudentId) {
      renderStudentPortfolio(root, lmsState.portfolioStudentId);
      return;
    }
    const students = loadStudents();
    const classes = Array.from(new Set(students.map(function (s) { return s.className || "Chưa phân lớp"; }))).sort();
    const q = (lmsState.studentQuery || "").toLowerCase().trim();
    const filtered = students.filter(function (s) {
      if (lmsState.classFilter !== "all" && (s.className || "Chưa phân lớp") !== lmsState.classFilter) return false;
      if (!q) return true;
      return (s.fullName || "").toLowerCase().indexOf(q) !== -1 ||
        (s.className || "").toLowerCase().indexOf(q) !== -1 ||
        (s.school || "").toLowerCase().indexOf(q) !== -1 ||
        (s.parentEmail || "").toLowerCase().indexOf(q) !== -1 ||
        (s.phone || "").toLowerCase().indexOf(q) !== -1;
    });

    const subs = loadSubmissions();

    let h = renderStudioSubnav("students") +
      '<div class="lms-card">' +
        '<div class="lms-head">' +
          '<div>' +
            '<h2 class="lms-title">Danh bạ Học sinh &amp; Lớp học</h2>' +
            '<p class="lms-sub">Quản lý danh sách học sinh, mã PIN 4 số bảo mật và theo dõi hồ sơ tiến bộ cá nhân.</p>' +
          '</div>' +
          '<div class="lms-actions">' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="import-students">' + ICONS.upload + ' Nhập Excel / CSV</button>' +
            '<button type="button" class="btn btn-primary btn-sm" data-lms="add-student">' + ICONS.plus + ' Thêm học sinh</button>' +
          '</div>' +
        '</div>' +

        '<div class="lms-toolbar">' +
          '<input type="search" class="ql-input lms-search" id="lmsStudentSearch" value="' + esc(lmsState.studentQuery) + '" placeholder="Tìm theo tên, lớp, trường, email phụ huynh...">' +
          '<div class="lms-pills">' +
            '<button type="button" class="ql-tag' + (lmsState.classFilter === "all" ? " active" : "") + '" data-lms="filter-class" data-val="all">Tất cả (' + students.length + ')</button>' +
            classes.map(function (cls) {
              const cnt = students.filter(function (s) { return (s.className || "Chưa phân lớp") === cls; }).length;
              return '<button type="button" class="ql-tag' + (lmsState.classFilter === cls ? " active" : "") + '" data-lms="filter-class" data-val="' + esc(cls) + '">' + esc(cls) + ' (' + cnt + ')</button>';
            }).join("") +
          '</div>' +
        '</div>';

    if (filtered.length === 0) {
      h += '<div class="lms-empty">' +
        '<p>Chưa có học sinh nào trong danh sách. Hãy thêm học sinh mới hoặc nhập hàng loạt từ file Excel / CSV.</p>' +
        '<div class="lms-actions" style="justify-content:center;margin-top:10px">' +
          '<button type="button" class="btn btn-primary btn-sm" data-lms="add-student">' + ICONS.plus + ' Thêm học sinh đầu tiên</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-lms="import-students">' + ICONS.upload + ' Nhập từ CSV / Excel</button>' +
        '</div>' +
      '</div>';
    } else {
      h += '<div class="lms-table-wrap"><table class="lms-table">' +
        '<thead><tr>' +
          '<th>Họ và tên</th>' +
          '<th>Lớp</th>' +
          '<th>Trường</th>' +
          '<th>Email phụ huynh</th>' +
          '<th>Mã PIN</th>' +
          '<th>Điểm TB</th>' +
          '<th style="text-align:right">Thao tác</th>' +
        '</tr></thead><tbody>' +
        filtered.map(function (s) {
          const stSubs = subs.filter(function (x) { return x.studentId === s.id; });
          const avg = stSubs.length ? (stSubs.reduce(function (acc, x) { return acc + (Number(x.score10) || 0); }, 0) / stSubs.length).toFixed(1) : "—";
          return '<tr>' +
            '<td><button type="button" class="lms-link-btn" data-lms="open-portfolio" data-id="' + esc(s.id) + '"><strong>' + esc(s.fullName) + '</strong></button>' +
              (s.phone ? '<div class="lms-cell-sub">' + esc(s.phone) + '</div>' : '') + '</td>' +
            '<td><span class="lms-pill-neutral">' + esc(s.className || "Chưa phân lớp") + '</span></td>' +
            '<td>' + esc(s.school || "—") + '</td>' +
            '<td>' + (s.parentEmail ? esc(s.parentEmail) : '<span class="muted">Chưa có email</span>') + '</td>' +
            '<td><code class="lms-pin">' + esc(s.pin) + '</code></td>' +
            '<td><strong>' + avg + '</strong> <span class="muted" style="font-size:.74rem">(' + stSubs.length + ')</span></td>' +
            '<td style="text-align:right;white-space:nowrap">' +
              '<button type="button" class="btn btn-outline btn-sm" data-lms="open-portfolio" data-id="' + esc(s.id) + '">Hồ sơ</button> ' +
              '<button type="button" class="btn btn-outline btn-sm" data-lms="edit-student" data-id="' + esc(s.id) + '">Sửa</button> ' +
              '<button type="button" class="btn btn-outline btn-sm lms-btn-danger-ghost" data-lms="del-student" data-id="' + esc(s.id) + '">Xóa</button>' +
            '</td>' +
          '</tr>';
        }).join("") +
        '</tbody></table></div>';
    }

    h += '</div>';
    root.innerHTML = h;
    bindSearchInput("lmsStudentSearch", function (val) { lmsState.studentQuery = val; renderStudentsView(root); });
  }

  function renderStudentPortfolio(root, studentId) {
    const st = loadStudents().find(function (s) { return s.id === studentId; });
    if (!st) { lmsState.portfolioStudentId = null; renderStudentsView(root); return; }
    const assignments = loadAssignments();
    const assignMap = {};
    assignments.forEach(function (a) { assignMap[a.id] = a; });
    const subs = loadSubmissions()
      .filter(function (s) { return s.studentId === st.id; })
      .sort(function (a, b) { return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(); });

    const avg = subs.length ? (subs.reduce(function (a, b) { return a + (Number(b.score10) || 0); }, 0) / subs.length).toFixed(2) : "—";
    const best = subs.length ? Math.max.apply(null, subs.map(function (s) { return Number(s.score10) || 0; })).toFixed(1) : "—";

    // Build chronological SVG line chart
    let chartHtml = '<div class="lms-empty" style="padding:24px">Chưa có bài nộp nào để vẽ biểu đồ tiến bộ.</div>';
    if (subs.length >= 1) {
      const W = 640, H = 190, padL = 36, padR = 20, padT = 18, padB = 34;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const pts = subs.map(function (s, idx) {
        const x = subs.length === 1 ? padL + plotW / 2 : padL + (idx / (subs.length - 1)) * plotW;
        const y = padT + plotH - (Math.min(10, Math.max(0, Number(s.score10) || 0)) / 10) * plotH;
        const dt = fmtDeadlineParts(s.submittedAt).ddmmyyyy.slice(0, 5);
        return { x: x, y: y, score: Number(s.score10).toFixed(1), label: dt };
      });
      const poly = pts.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
      let gridLines = "";
      [0, 2.5, 5, 7.5, 10].forEach(function (v) {
        const y = padT + plotH - (v / 10) * plotH;
        gridLines += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#E5E7EB" stroke-dasharray="3 3"></line>' +
          '<text x="' + (padL - 8) + '" y="' + (y + 3) + '" text-anchor="end" font-size="10" fill="#64748B">' + v + '</text>';
      });
      const dots = pts.map(function (p) {
        return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4.5" fill="#5347CD" stroke="#fff" stroke-width="2"></circle>' +
          '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 9).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#1E293B">' + p.score + '</text>' +
          '<text x="' + p.x.toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10" fill="#64748B">' + p.label + '</text>';
      }).join("");
      chartHtml = '<div class="lms-chart-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" class="lms-svg-chart" role="img" aria-label="Biểu đồ tiến bộ điểm số">' +
        gridLines +
        (pts.length > 1 ? '<polyline fill="none" stroke="#5347CD" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + poly + '"></polyline>' : "") +
        dots +
      '</svg></div>';
    }

    root.innerHTML = renderStudioSubnav("students") +
      '<div class="lms-card">' +
        '<div class="lms-head">' +
          '<div>' +
            '<h2 class="lms-title">' + esc(st.fullName) + '</h2>' +
            '<p class="lms-sub">' + esc(st.className || "Chưa phân lớp") + (st.school ? " · " + esc(st.school) : "") + (st.parentEmail ? " · " + esc(st.parentEmail) : "") + ' · PIN: <code class="lms-pin">' + esc(st.pin) + '</code></p>' +
          '</div>' +
          '<div class="lms-actions">' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="edit-student" data-id="' + esc(st.id) + '">Chỉnh sửa</button>' +
            '<button type="button" class="ql-back-btn" data-lms="close-portfolio">' + ICONS.arrowLeft + '<span>Quay lại danh bạ</span></button>' +
          '</div>' +
        '</div>' +

        '<div class="lms-kpi-row">' +
          '<div class="lms-kpi"><span class="lms-kpi-k">Bài đã nộp</span><span class="lms-kpi-v">' + subs.length + '</span></div>' +
          '<div class="lms-kpi"><span class="lms-kpi-k">Điểm trung bình</span><span class="lms-kpi-v">' + avg + '</span></div>' +
          '<div class="lms-kpi"><span class="lms-kpi-k">Điểm cao nhất</span><span class="lms-kpi-v">' + best + '</span></div>' +
        '</div>' +

        '<div class="lms-section">' +
          '<span class="ql-section-label">Biểu đồ tiến bộ điểm số theo thời gian</span>' +
          chartHtml +
        '</div>' +

        '<div class="lms-section">' +
          '<span class="ql-section-label">Lịch sử bài làm (' + subs.length + ')</span>' +
          (subs.length === 0
            ? '<div class="lms-empty">Học sinh này chưa hoàn thành bài tập nào.</div>'
            : '<div class="lms-table-wrap"><table class="lms-table">' +
                '<thead><tr><th>Bài tập</th><th>Thời gian nộp</th><th>Điểm</th><th>Thời lượng</th><th>Chuyển tab</th><th style="text-align:right">Thao tác</th></tr></thead><tbody>' +
                subs.slice().reverse().map(function (s) {
                  const a = assignMap[s.assignmentId];
                  const wrongCnt = (s.records || []).filter(function (r) { return !r.ok; }).length;
                  return '<tr>' +
                    '<td><strong>' + esc(a ? a.title : (s.quizTitle || "Bài tập")) + '</strong></td>' +
                    '<td>' + esc(fmtDeadlineParts(s.submittedAt).full) + '</td>' +
                    '<td><strong>' + Number(s.score10).toFixed(1) + '/10</strong> <span class="muted">(' + s.correctCount + '/' + s.totalQuestions + ')</span></td>' +
                    '<td>' + fmtDuration(s.durationSec) + '</td>' +
                    '<td>' + (s.tabSwitches > 0 ? '<span class="lms-badge-warn">' + s.tabSwitches + '</span>' : '<span class="muted">0</span>') + '</td>' +
                    '<td style="text-align:right;white-space:nowrap">' +
                      '<button type="button" class="btn btn-outline btn-sm" data-lms="view-sub" data-id="' + esc(s.id) + '">Chi tiết</button> ' +
                      (wrongCnt > 0 ? '<button type="button" class="btn btn-primary btn-sm" data-lms="make-remedial" data-sub="' + esc(s.id) + '">' + ICONS.sparkles + ' Giao bài bổ trợ (' + wrongCnt + ')</button>' : '') +
                    '</td>' +
                  '</tr>';
                }).join("") +
              '</tbody></table></div>') +
        '</div>' +
      '</div>';
  }

  /* ======================== VIEW 2: ASSIGNMENTS ======================== */
  function renderAssignedRecipientsStrip(assign, roster) {
    if (!roster || !roster.length) {
      return '<div class="lms-recip-strip"><span class="lms-recip-chip is-warn">⚠️ ' + esc(tr("Chưa có học sinh nào được gán")) + '</span></div>';
    }
    const isExpanded = !!(lmsState.expandedRecipients && lmsState.expandedRecipients[assign.id]);
    const limit = roster.length > 5 && !isExpanded ? 3 : roster.length;
    const shown = roster.slice(0, limit);
    const hiddenCnt = roster.length - shown.length;

    const chipsHtml = shown.map(function (st) {
      const em = getStudentParentEmail(st);
      const clsPart = st.className ? (' <span class="muted">(' + esc(st.className) + ')</span>') : '';
      const emailPart = em
        ? '<span class="lms-recip-email">📧 ' + esc(em) + '</span>'
        : '<span class="lms-recip-warn">⚠️ ' + esc(tr("Chưa có email PH")) + '</span>';
      return '<span class="lms-recip-chip' + (em ? '' : ' is-warn') + '">👤 <strong>' + esc(st.fullName) + '</strong>' + clsPart + ' · ' + emailPart + '</span>';
    }).join("");

    const toggleHtml = roster.length > 5
      ? '<button type="button" class="lms-recip-toggle" data-lms="toggle-assign-recipients" data-id="' + esc(assign.id) + '">' +
          (isExpanded
            ? ('▲ ' + esc(tr("Thu gọn")))
            : ('+' + hiddenCnt + ' ' + esc(tr("học sinh khác")) + ' (' + esc(tr("Xem danh sách")) + ')')) +
        '</button>'
      : '';

    return '<div class="lms-recip-strip">' + chipsHtml + toggleHtml + '</div>';
  }

  function renderAssignmentsView(root) {
    const assignments = loadAssignments().slice().sort(function (a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    const submissions = loadSubmissions();
    const curr = U().CURRICULUM;

    const enriched = assignments.map(function (a) {
      const tax = curr ? curr.detectTaxonomy(a) : { gradeLevel: "unclassified", gradeLabel: "Chưa phân loại", subject: "" };
      return { a: a, tax: tax };
    });

    const gradeCounts = {};
    enriched.forEach(function (x) {
      gradeCounts[x.tax.gradeLevel] = (gradeCounts[x.tax.gradeLevel] || 0) + 1;
    });
    const gradeOrder = curr ? curr.grades.map(function (g) { return g.id; }).concat(["unclassified"]) : ["unclassified"];
    const activeGrades = gradeOrder.filter(function (gid) { return gradeCounts[gid] > 0; });
    if (lmsState.assignGradeFilter !== "all" && !gradeCounts[lmsState.assignGradeFilter]) {
      lmsState.assignGradeFilter = "all";
      lmsState.assignSubjectFilter = "all";
    }

    const gradeFiltered = lmsState.assignGradeFilter === "all"
      ? enriched
      : enriched.filter(function (x) { return x.tax.gradeLevel === lmsState.assignGradeFilter; });

    const subjCounts = {};
    gradeFiltered.forEach(function (x) {
      if (x.tax.subject) subjCounts[x.tax.subject] = (subjCounts[x.tax.subject] || 0) + 1;
    });
    const activeSubjects = Object.keys(subjCounts).sort();
    if (lmsState.assignSubjectFilter !== "all" && !subjCounts[lmsState.assignSubjectFilter]) {
      lmsState.assignSubjectFilter = "all";
    }

    const visible = lmsState.assignSubjectFilter === "all"
      ? gradeFiltered
      : gradeFiltered.filter(function (x) { return (x.tax.subject || "") === lmsState.assignSubjectFilter; });

    let h = renderStudioSubnav("assignments") +
      '<div class="lms-card">' +
        '<div class="lms-head">' +
          '<div>' +
            '<h2 class="lms-title">Quản lý Giao bài tập</h2>' +
            '<p class="lms-sub">Giao đề cho lớp hoặc nhóm học sinh, cấu hình hạn nộp, số lần làm và tự động gửi báo cáo phụ huynh.</p>' +
          '</div>' +
          '<div class="lms-actions">' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="edit-feedback-rules">Mẫu nhận xét tự động</button>' +
            '<button type="button" class="btn btn-primary btn-sm" data-lms="create-assignment">' + ICONS.plus + ' Tạo bài giao mới</button>' +
          '</div>' +
        '</div>';

    if (assignments.length > 0) {
      h += '<div class="tax-filter-bar">' +
        '<div class="tax-pill-row">' +
          '<button type="button" class="tax-pill' + (lmsState.assignGradeFilter === "all" ? " active" : "") + '" data-lms="filter-assign-grade" data-val="all">' + esc(tr("Tất cả")) + ' <span class="tax-cnt">' + assignments.length + '</span></button>' +
          activeGrades.map(function (gid) {
            const lbl = curr ? curr.getGradeLabel(gid) : gid;
            return '<button type="button" class="tax-pill' + (lmsState.assignGradeFilter === gid ? " active" : "") + '" data-lms="filter-assign-grade" data-val="' + esc(gid) + '">' + esc(lbl) + ' <span class="tax-cnt">' + gradeCounts[gid] + '</span></button>';
          }).join("") +
        '</div>' +
        (activeSubjects.length > 0
          ? '<div class="tax-pill-row tax-subj-row">' +
              '<button type="button" class="tax-pill tax-pill-sm' + (lmsState.assignSubjectFilter === "all" ? " active" : "") + '" data-lms="filter-assign-subject" data-val="all">' + esc(tr("Mọi môn")) + '</button>' +
              activeSubjects.map(function (s) {
                return '<button type="button" class="tax-pill tax-pill-sm' + (lmsState.assignSubjectFilter === s ? " active" : "") + '" data-lms="filter-assign-subject" data-val="' + esc(s) + '">' + esc(s) + ' <span class="tax-cnt">' + subjCounts[s] + '</span></button>';
              }).join("") +
            '</div>'
          : '') +
      '</div>';
    }

    if (assignments.length === 0) {
      h += '<div class="lms-empty">' +
        '<p>Chưa có bài tập nào được giao. Hãy chọn một đề từ Thư viện và giao cho lớp học của bạn.</p>' +
        '<button type="button" class="btn btn-primary btn-sm" data-lms="create-assignment" style="margin-top:10px">' + ICONS.plus + ' Giao bài tập đầu tiên</button>' +
      '</div>';
    } else if (visible.length === 0) {
      h += '<div class="lms-empty"><p>' + esc(tr("Không có bài giao nào khớp bộ lọc Khối / Môn học đang chọn.")) + '</p></div>';
    } else {
      h += '<div class="lms-assign-list">' + visible.map(function (entry) {
        const a = entry.a;
        const tax = entry.tax;
        const status = getAssignmentStatus(a);
        const roster = getAssignedStudentsFor(a);
        const submittedIds = new Set(submissions.filter(function (s) { return s.assignmentId === a.id; }).map(function (s) { return s.studentId; }));
        const doneCnt = roster.filter(function (st) { return submittedIds.has(st.id); }).length;
        const pct = roster.length ? Math.round((doneCnt / roster.length) * 100) : 0;
        const statusLabel = status === "active" ? "Đang mở" : (status === "upcoming" ? "Sắp mở" : "Đã đóng");
        const statusCls = status === "active" ? "lms-badge-ok" : (status === "upcoming" ? "lms-badge-info" : "lms-badge-closed");
        const dl = fmtDeadlineParts(a.deadline);

        return '<div class="lms-assign-row">' +
          '<div class="lms-assign-main">' +
            '<div class="lms-assign-title-line">' +
              '<strong class="lms-assign-name">' + esc(a.title) + '</strong>' +
              '<span class="badge tax-badge-grade">' + esc(tax.gradeLabel) + '</span>' +
              (tax.subject ? '<span class="badge tax-badge-subj">' + esc(tax.subject) + '</span>' : '') +
              '<span class="' + statusCls + '">' + statusLabel + '</span>' +
              (a.isRemedial ? '<span class="lms-badge-info">Bài bổ trợ</span>' : '') +
              '<code class="lms-pin">' + esc(a.code) + '</code>' +
            '</div>' +
            '<div class="lms-assign-meta">' +
              (a.targetMode === "class" ? ('<span>Lớp ' + esc(a.targetClass) + ' (' + roster.length + ' HS)</span><span>·</span>') : '') +
              '<span>Hạn nộp: ' + esc(dl.full) + '</span>' +
              '<span>·</span>' +
              '<span>' + (a.maxAttempts === 0 ? "Không giới hạn lượt" : (a.maxAttempts + " lượt làm")) + '</span>' +
              '<span>·</span>' +
              '<span>' + (a.parentEmailEnabled ? "Email phụ huynh: Bật" : "Email phụ huynh: Tắt") + '</span>' +
            '</div>' +
            renderAssignedRecipientsStrip(a, roster) +
            '<div class="lms-prog-wrap">' +
              '<div class="lms-prog-bar"><div class="lms-prog-fill" style="width:' + pct + '%"></div></div>' +
              '<span class="lms-prog-txt">' + doneCnt + '/' + roster.length + ' đã nộp (' + pct + '%)</span>' +
            '</div>' +
          '</div>' +
          '<div class="lms-assign-actions">' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="copy-assign-link" data-code="' + esc(a.code) + '">' + ICONS.link + ' Sao chép link</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="open-student-entry" data-code="' + esc(a.code) + '">' + ICONS.user + ' Vào làm thử</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="edit-assignment" data-id="' + esc(a.id) + '">✏️ ' + esc(tr("Chỉnh sửa")) + '</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="send-reminders" data-id="' + esc(a.id) + '">' + ICONS.bell + ' Nhắc hạn nộp</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="export-worksheet-pdf" data-id="' + esc(a.id) + '">' + ICONS.printer + ' Phiếu A4 + QR</button>' +
            '<button type="button" class="btn btn-primary btn-sm" data-lms="open-gradebook" data-id="' + esc(a.id) + '">Sổ điểm</button>' +
            '<button type="button" class="btn btn-outline btn-sm lms-btn-danger-ghost" data-lms="del-assignment" data-id="' + esc(a.id) + '">Xóa</button>' +
          '</div>' +
        '</div>';
      }).join("") + '</div>';
    }

    h += '</div>';
    root.innerHTML = h;
  }

  /* ======================== VIEW 3: GRADEBOOK & ANALYTICS ======================== */
  function renderGradebookView(root) {
    const assignments = loadAssignments();
    if (!assignments.length) {
      root.innerHTML = renderStudioSubnav("gradebook") +
        '<div class="lms-card"><div class="lms-empty">' +
          '<p>Chưa có bài tập nào để xem sổ điểm và phân tích.</p>' +
          '<button type="button" class="btn btn-primary btn-sm" data-lms="create-assignment" style="margin-top:10px">' + ICONS.plus + ' Tạo bài giao mới</button>' +
        '</div></div>';
      return;
    }

    let assign = assignments.find(function (a) { return a.id === lmsState.selectedAssignmentId; }) || assignments[0];
    lmsState.selectedAssignmentId = assign.id;

    const roster = getAssignedStudentsFor(assign);
    const allSubs = loadSubmissions().filter(function (s) { return s.assignmentId === assign.id; });
    const rows = roster.map(function (st) {
      const stSubs = allSubs.filter(function (s) { return s.studentId === st.id; });
      const eff = pickEffectiveSubmission(stSubs, assign.scorePolicy || "highest");
      const overrideOff = !!(assign.parentEmailOverrides && assign.parentEmailOverrides[st.id] === false);
      return { student: st, subs: stSubs, eff: eff, overrideOff: overrideOff };
    });

    const submittedRows = rows.filter(function (r) { return !!r.eff; });
    const avgScore = submittedRows.length
      ? (submittedRows.reduce(function (a, r) { return a + (Number(r.eff.score10) || 0); }, 0) / submittedRows.length).toFixed(2)
      : "—";
    const readCount = submittedRows.filter(function (r) { return !!r.eff.parentReadAt; }).length;

    // Most-Missed Questions & "Ask Teacher" Analytics
    const qStats = {};
    (assign.quizSnapshot && assign.quizSnapshot.questions || []).forEach(function (q, idx) {
      qStats[q.id] = { id: q.id, idx: idx + 1, text: q.text, total: 0, wrong: 0, askedBy: [] };
    });
    submittedRows.forEach(function (r) {
      const recs = r.eff.records || [];
      recs.forEach(function (rec) {
        const key = rec.qId || (rec.q && rec.q.id);
        if (!qStats[key]) qStats[key] = { id: key, idx: 0, text: (rec.q && rec.q.text) || "", total: 0, wrong: 0, askedBy: [] };
        qStats[key].total++;
        if (!rec.ok) qStats[key].wrong++;
      });
      const asked = r.eff.askTeacherIds || [];
      asked.forEach(function (qId) {
        if (qStats[qId]) qStats[qId].askedBy.push(r.student.fullName);
      });
    });

    const allQMetrics = Object.values(qStats).map(function (m) {
      m.errorRate = m.total > 0 ? Math.round((m.wrong / m.total) * 100) : 0;
      return m;
    });
    const topMissed = allQMetrics
      .filter(function (m) { return m.wrong > 0; })
      .sort(function (a, b) { return b.errorRate - a.errorRate || b.wrong - a.wrong; })
      .slice(0, 5);
    const askedQuestions = allQMetrics.filter(function (m) { return m.askedBy.length > 0; });

    root.innerHTML = renderStudioSubnav("gradebook") +
      '<div class="lms-card">' +
        '<div class="lms-head">' +
          '<div style="flex:1;min-width:220px">' +
            '<h2 class="lms-title">Sổ điểm &amp; Phân tích Lớp học</h2>' +
            '<div style="margin-top:8px;max-width:420px">' +
              '<select class="ql-select" id="lmsGradebookSelect">' +
                assignments.map(function (a) {
                  return '<option value="' + esc(a.id) + '"' + (a.id === assign.id ? " selected" : "") + '>' + esc(a.title) + ' (' + esc(a.code) + ')</option>';
                }).join("") +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="lms-actions">' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="send-reminders" data-id="' + esc(assign.id) + '">' + ICONS.bell + ' Nhắc hạn nộp</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="export-gb-xlsx" data-id="' + esc(assign.id) + '">' + ICONS.download + ' Xuất Excel</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="export-gb-pdf" data-id="' + esc(assign.id) + '">' + ICONS.printer + ' Xuất PDF tổng hợp</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-lms="export-worksheet-pdf" data-id="' + esc(assign.id) + '">' + ICONS.printer + ' Phiếu A4 + QR</button>' +
          '</div>' +
        '</div>' +

        '<div class="lms-kpi-row">' +
          '<div class="lms-kpi"><span class="lms-kpi-k">Đã nộp bài</span><span class="lms-kpi-v">' + submittedRows.length + ' / ' + roster.length + '</span></div>' +
          '<div class="lms-kpi"><span class="lms-kpi-k">Điểm trung bình</span><span class="lms-kpi-v">' + avgScore + '</span></div>' +
          '<div class="lms-kpi"><span class="lms-kpi-k">Phụ huynh đã xem</span><span class="lms-kpi-v">' + readCount + ' / ' + submittedRows.length + '</span></div>' +
          '<div class="lms-kpi"><span class="lms-kpi-k">Câu cần giải đáp</span><span class="lms-kpi-v">' + askedQuestions.length + '</span></div>' +
        '</div>' +

        /* Live Gradebook Table */
        '<div class="lms-section">' +
          '<span class="ql-section-label">Bảng điểm trực tiếp</span>' +
          '<div class="lms-table-wrap"><table class="lms-table">' +
            '<thead><tr>' +
              '<th>Học sinh</th>' +
              '<th>Trạng thái</th>' +
              '<th>Điểm</th>' +
              '<th>Thời lượng</th>' +
              '<th>Chuyển tab</th>' +
              '<th>Email phụ huynh</th>' +
              '<th>Phụ huynh xác nhận</th>' +
              '<th style="text-align:right">Thao tác</th>' +
            '</tr></thead><tbody>' +
            rows.map(function (r) {
              const eff = r.eff;
              const wrongCnt = eff ? (eff.records || []).filter(function (x) { return !x.ok; }).length : 0;
              const remState = assign.reminderDelivery && assign.reminderDelivery[r.student.id];
              let emailCell = '<span class="muted">Chưa gửi</span>';
              if (!assign.parentEmailEnabled || r.overrideOff) {
                emailCell = '<span class="muted">Đang tắt</span>';
              } else if (!getStudentParentEmail(r.student)) {
                emailCell = '<span class="lms-badge-warn">Thiếu email</span>';
              } else if (eff && eff.parentEmailStatus === "failed") {
                emailCell = '<span class="lms-badge-closed" title="' + esc(eff.parentEmailError || "Gửi email thất bại") + '">Lỗi gửi</span>';
              } else if (eff && eff.parentEmailSentAt) {
                emailCell = '<span class="lms-badge-ok" title="' + esc(fmtDeadlineParts(eff.parentEmailSentAt).full) + '">Đã gửi KQ</span>';
              } else if (remState && remState.status === "sent") {
                emailCell = '<span class="lms-badge-ok" title="' + esc(fmtDeadlineParts(remState.timestamp).full + (remState.messageId ? (" · ID: " + remState.messageId) : "")) + '">Đã nhắc</span>';
              } else if (remState && remState.status === "failed") {
                emailCell = '<span class="lms-badge-closed" title="' + esc(remState.error || "Gửi nhắc nhở thất bại") + '">Lỗi nhắc</span>';
              }
              let readCell = '<span class="muted">—</span>';
              if (eff) {
                readCell = eff.parentReadAt
                  ? '<span class="lms-receipt-ok" title="' + esc(fmtDeadlineParts(eff.parentReadAt).full) + '">' + ICONS.check + ' Đã xem</span>'
                  : '<button type="button" class="lms-link-btn muted" data-lms="open-receipt" data-id="' + esc(eff.id) + '" style="font-size:.76rem">Chờ xác nhận</button>';
              }
              return '<tr>' +
                '<td><button type="button" class="lms-link-btn" data-lms="open-portfolio" data-id="' + esc(r.student.id) + '"><strong>' + esc(r.student.fullName) + '</strong></button>' +
                  '<div class="lms-cell-sub">' + esc(r.student.className || "") + '</div></td>' +
                '<td>' + (eff ? '<span class="lms-badge-ok">Đã nộp</span>' : '<span class="lms-badge-closed">Chưa nộp</span>') + '</td>' +
                '<td>' + (eff ? ('<strong>' + Number(eff.score10).toFixed(1) + '/10</strong> <span class="muted">(' + eff.correctCount + '/' + eff.totalQuestions + ')</span>') : '<span class="muted">—</span>') + '</td>' +
                '<td>' + (eff ? fmtDuration(eff.durationSec) : '<span class="muted">—</span>') + '</td>' +
                '<td>' + (eff ? (eff.tabSwitches > 0 ? '<span class="lms-badge-warn">' + eff.tabSwitches + '</span>' : '<span class="muted">0</span>') : '<span class="muted">—</span>') + '</td>' +
                '<td>' + emailCell +
                  ' <button type="button" class="lms-mini-toggle" data-lms="toggle-student-email" data-assign="' + esc(assign.id) + '" data-student="' + esc(r.student.id) + '" title="Bật/tắt gửi email cho học sinh này">' + (r.overrideOff ? "Bật" : "Tắt") + '</button>' +
                  ' <button type="button" class="lms-mini-toggle" data-lms="send-student-email" data-assign="' + esc(assign.id) + '" data-student="' + esc(r.student.id) + '" title="' + esc(eff ? tr("Gửi email báo cáo kết quả cho phụ huynh") : tr("Gửi email nhắc hạn nộp cho phụ huynh")) + '">✉️ ' + esc(tr("Gửi")) + '</button>' +
                '</td>' +
                '<td>' + readCell + '</td>' +
                '<td style="text-align:right;white-space:nowrap">' +
                  (eff ? '<button type="button" class="btn btn-outline btn-sm" data-lms="view-sub" data-id="' + esc(eff.id) + '">Xem bài</button> ' : '') +
                  (eff && wrongCnt > 0 ? '<button type="button" class="btn btn-primary btn-sm" data-lms="make-remedial" data-sub="' + esc(eff.id) + '">' + ICONS.sparkles + ' Bổ trợ (' + wrongCnt + ')</button>' : '') +
                '</td>' +
              '</tr>';
            }).join("") +
          '</tbody></table></div>' +
        '</div>' +

        /* Analytics: Top Missed & Ask Teacher */
        '<div class="lms-section lms-analytics-grid">' +
          '<div class="lms-analytics-box">' +
            '<span class="ql-section-label">Top câu hỏi hay sai nhất</span>' +
            (topMissed.length === 0
              ? '<p class="muted" style="font-size:.82rem">Chưa có dữ liệu câu sai cho bài tập này.</p>'
              : topMissed.map(function (m) {
                  return '<div class="lms-miss-item">' +
                    '<div class="lms-miss-top"><strong>Câu ' + m.idx + '</strong><span class="lms-badge-warn">Sai ' + m.errorRate + '% (' + m.wrong + '/' + m.total + ')</span></div>' +
                    '<div class="lms-miss-text">' + esc(m.text).slice(0, 140) + (m.text.length > 140 ? "…" : "") + '</div>' +
                    '<div class="lms-prog-bar" style="margin-top:6px"><div class="lms-prog-fill lms-fill-warn" style="width:' + m.errorRate + '%"></div></div>' +
                  '</div>';
                }).join("")) +
          '</div>' +
          '<div class="lms-analytics-box">' +
            '<span class="ql-section-label">Câu học sinh đánh dấu "Chưa hiểu câu này"</span>' +
            (askedQuestions.length === 0
              ? '<p class="muted" style="font-size:.82rem">Chưa có học sinh nào gửi yêu cầu giải đáp.</p>'
              : askedQuestions.map(function (m) {
                  return '<div class="lms-miss-item">' +
                    '<div class="lms-miss-top"><strong>Câu ' + m.idx + '</strong><span class="lms-badge-info">' + ICONS.flag + ' ' + m.askedBy.length + ' học sinh hỏi</span></div>' +
                    '<div class="lms-miss-text">' + esc(m.text).slice(0, 140) + (m.text.length > 140 ? "…" : "") + '</div>' +
                    '<div class="lms-cell-sub" style="margin-top:4px">' + esc(m.askedBy.join(", ")) + '</div>' +
                  '</div>';
                }).join("")) +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ======================== MODALS: STUDENT CRUD, CSV/EXCEL IMPORT, ASSIGNMENT BUILDER, FEEDBACK RULES ======================== */
  function openStudentModal(studentId) {
    const existing = studentId ? loadStudents().find(function (s) { return s.id === studentId; }) : null;
    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="lmsStudentModal" role="dialog" aria-modal="true"><div class="modal">' +
        '<h3>' + (existing ? "Chỉnh sửa thông tin học sinh" : "Thêm học sinh mới") + '</h3>' +
        '<div class="lms-form-grid">' +
          '<label class="field">Họ và tên<input type="text" id="lmsStName" value="' + esc(existing ? existing.fullName : "") + '" placeholder="Nguyễn Văn An" maxlength="100"></label>' +
          '<label class="field">Lớp / Khối<input type="text" id="lmsStClass" value="' + esc(existing ? existing.className : "") + '" placeholder="10A1" maxlength="40"></label>' +
          '<label class="field">Trường học<input type="text" id="lmsStSchool" value="' + esc(existing ? existing.school : "") + '" placeholder="THPT Chu Văn An" maxlength="100"></label>' +
          '<label class="field">Email phụ huynh<input type="email" id="lmsStEmail" value="' + esc(existing ? existing.parentEmail : "") + '" placeholder="phuhuynh@email.com" maxlength="120"></label>' +
          '<label class="field">Số điện thoại / Mã HS (tùy chọn)<input type="text" id="lmsStPhone" value="' + esc(existing ? existing.phone : "") + '" placeholder="09xx..." maxlength="40"></label>' +
          '<label class="field">Mã PIN 4 số bảo mật' +
            '<div style="display:flex;gap:6px">' +
              '<input type="text" id="lmsStPin" value="' + esc(existing ? existing.pin : genPin()) + '" maxlength="4" pattern="\\d{4}" style="flex:1">' +
              '<button type="button" class="btn btn-outline btn-sm" id="lmsGenPinBtn">Tạo ngẫu nhiên</button>' +
            '</div>' +
          '</label>' +
        '</div>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-outline" id="lmsStCancel">Hủy</button>' +
          '<button type="button" class="btn btn-primary" id="lmsStSave">Lưu học sinh</button>' +
        '</div>' +
      '</div></div>';

    if (typeof U().applyI18n === "function") U().applyI18n(host);
    U().on("lmsGenPinBtn", "click", function () {
      const p = U().$("lmsStPin"); if (p) p.value = genPin();
    });
    U().on("lmsStCancel", "click", function () { host.innerHTML = ""; });
    U().on("lmsStSave", "click", function () {
      const fullName = (U().$("lmsStName").value || "").trim();
      const className = (U().$("lmsStClass").value || "").trim() || "Chưa phân lớp";
      const school = (U().$("lmsStSchool").value || "").trim();
      const parentEmail = (U().$("lmsStEmail").value || "").trim();
      const phone = (U().$("lmsStPhone").value || "").trim();
      const pin = (U().$("lmsStPin").value || "").trim();
      if (!fullName) { U().showToast("Vui lòng nhập họ và tên học sinh.", "warning"); return; }
      if (!/^\d{4}$/.test(pin)) { U().showToast("Mã PIN phải gồm đúng 4 chữ số.", "warning"); return; }
      const list = loadStudents();
      if (existing) {
        const idx = list.findIndex(function (x) { return x.id === existing.id; });
        if (idx !== -1) list[idx] = Object.assign({}, list[idx], { fullName: fullName, className: className, school: school, parentEmail: parentEmail, phone: phone, pin: pin });
      } else {
        list.push({ id: "st_" + Date.now() + "_" + Math.floor(Math.random() * 1000), fullName: fullName, className: className, school: school, parentEmail: parentEmail, phone: phone, pin: pin, createdAt: new Date().toISOString() });
      }
      saveStudents(list);
      host.innerHTML = "";
      U().showToast(existing ? "Đã cập nhật thông tin học sinh." : "Đã thêm học sinh mới.", "success");
      refreshStudio();
    });
  }

  function parseCsvText(text) {
    const lines = String(text || "").split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
    return lines.map(function (line) {
      const cells = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === "," && !inQ) {
          cells.push(cur.trim()); cur = "";
        } else { cur += ch; }
      }
      cells.push(cur.trim());
      return cells;
    });
  }

  function openImportStudentsModal() {
    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="lmsImportStModal" role="dialog" aria-modal="true"><div class="modal">' +
        '<h3>Nhập danh sách học sinh từ Excel / CSV</h3>' +
        '<p class="muted" style="font-size:.82rem;margin-top:0">Các cột hỗ trợ: <code>Full Name</code>, <code>Class</code>, <code>School</code>, <code>Parent Email</code>, <code>Phone/ID</code>, <code>PIN</code> (tự động tạo PIN 4 số nếu để trống).</p>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0">' +
          '<button type="button" class="btn btn-outline btn-sm" id="lmsDlStTpl">' + ICONS.download + ' Tải file mẫu (.csv)</button>' +
          '<input type="file" id="lmsStFile" accept=".xlsx,.xls,.csv">' +
        '</div>' +
        '<div id="lmsStImportPreview" class="muted" style="font-size:.82rem"></div>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-outline" id="lmsStImpCancel">Đóng</button>' +
          '<button type="button" class="btn btn-primary" id="lmsStImpConfirm" disabled>Xác nhận nhập</button>' +
        '</div>' +
      '</div></div>';

    if (typeof U().applyI18n === "function") U().applyI18n(host);
    let parsedRows = [];

    U().on("lmsDlStTpl", "click", function () {
      const csv = "\uFEFFFull Name,Class,School,Parent Email,Phone/ID,PIN\nNguyen Van An,10A1,THPT Chu Van An,phuhuynh.an@email.com,0901234567,1234\nTran Thi Binh,10A1,THPT Chu Van An,phuhuynh.binh@email.com,0907654321,\n";
      U().downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "danh_sach_hoc_sinh_mau.csv");
    });

    U().on("lmsStFile", "change", function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const preview = U().$("lmsStImportPreview");
      const confirmBtn = U().$("lmsStImpConfirm");
      const handleMatrix = function (rows) {
        if (!rows || rows.length < 2) {
          preview.textContent = tr("File không có dữ liệu học sinh hợp lệ.");
          confirmBtn.disabled = true;
          return;
        }
        const headers = rows[0].map(function (h) { return String(h || "").toLowerCase().trim(); });
        const findCol = function (keys) {
          for (let i = 0; i < headers.length; i++) {
            for (let k = 0; k < keys.length; k++) if (headers[i].indexOf(keys[k]) !== -1) return i;
          }
          return -1;
        };
        const iName = findCol(["name", "họ", "tên", "student"]);
        const iClass = findCol(["class", "lớp", "grade"]);
        const iSchool = findCol(["school", "trường"]);
        const iEmail = findCol(["email", "mail"]);
        const iPhone = findCol(["phone", "điện thoại", "sdt", "id", "mã"]);
        const iPin = findCol(["pin"]);
        parsedRows = [];
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const nm = String(row[iName >= 0 ? iName : 0] || "").trim();
          if (!nm) continue;
          const rawPin = iPin >= 0 ? String(row[iPin] || "").trim() : "";
          parsedRows.push({
            id: "st_" + Date.now() + "_" + r + "_" + Math.floor(Math.random() * 1000),
            fullName: nm,
            className: String(iClass >= 0 ? (row[iClass] || "") : (row[1] || "")).trim() || "Chưa phân lớp",
            school: String(iSchool >= 0 ? (row[iSchool] || "") : (row[2] || "")).trim(),
            parentEmail: String(iEmail >= 0 ? (row[iEmail] || "") : (row[3] || "")).trim(),
            phone: String(iPhone >= 0 ? (row[iPhone] || "") : (row[4] || "")).trim(),
            pin: /^\d{4}$/.test(rawPin) ? rawPin : genPin(),
            createdAt: new Date().toISOString()
          });
        }
        preview.textContent = tr("Đã đọc được " + parsedRows.length + " học sinh hợp lệ.");
        confirmBtn.disabled = parsedRows.length === 0;
      };

      if (/\.csv$/i.test(file.name)) {
        const rd = new FileReader();
        rd.onload = function () { handleMatrix(parseCsvText(rd.result)); };
        rd.readAsText(file, "utf-8");
      } else if (typeof XLSX !== "undefined") {
        const rd = new FileReader();
        rd.onload = function () {
          try {
            const wb = XLSX.read(new Uint8Array(rd.result), { type: "array" });
            const sh = wb.Sheets[wb.SheetNames[0]];
            handleMatrix(XLSX.utils.sheet_to_json(sh, { header: 1 }));
          } catch (err) {
            preview.textContent = tr("Không thể đọc file Excel.");
          }
        };
        rd.readAsArrayBuffer(file);
      } else {
        preview.textContent = tr("Thư viện Excel chưa tải xong. Vui lòng dùng file .csv.");
      }
    });

    U().on("lmsStImpCancel", "click", function () { host.innerHTML = ""; });
    U().on("lmsStImpConfirm", "click", function () {
      if (!parsedRows.length) return;
      const cur = loadStudents();
      saveStudents(cur.concat(parsedRows));
      host.innerHTML = "";
      U().showToast("Đã nhập " + parsedRows.length + " học sinh vào danh bạ.", "success");
      refreshStudio();
    });
  }

  function openAssignmentModal(preset) {
    const p = preset || {};
    const existing = p.editId ? loadAssignments().find(function (a) { return a.id === p.editId; }) : null;
    const isEdit = !!existing;
    const quizzes = getAllAvailableQuizzes();
    if (!quizzes.length && !isEdit) {
      U().showToast("H\u00e3y t\u1ea1o \u00edt nh\u1ea5t 1 b\u1ed9 \u0111\u1ec1 trong Th\u01b0 vi\u1ec7n tr\u01b0\u1edbc khi giao b\u00e0i.", "warning");
      return;
    }
    if (isEdit && existing.quizSnapshot && !quizzes.some(function (q) { return q.id === existing.quizId; })) {
      quizzes.unshift(Object.assign({ id: existing.quizId || ("snap_" + existing.id) }, existing.quizSnapshot));
    }

    const students = loadStudents();
    const classes = Array.from(new Set(students.map(function (s) { return s.className || "Ch\u01b0a ph\u00e2n l\u1edbp"; }))).sort();
    const defaultDead = new Date(Date.now() + 2 * 86400000);
    defaultDead.setHours(21, 0, 0, 0);

    const selectedQuizId = isEdit ? (existing.quizId || (quizzes[0] && quizzes[0].id) || "") : (p.quizId || (quizzes[0] && quizzes[0].id) || "");
    const selQuizObj = quizzes.find(function (q) { return q.id === selectedQuizId; }) || quizzes[0];
    const curr = U().CURRICULUM;
    const baseTax = curr
      ? curr.detectTaxonomy(isEdit ? existing : (selQuizObj || {}))
      : { gradeLevel: "unclassified", subject: "" };
    const initGrade = isEdit ? (existing.gradeLevel || baseTax.gradeLevel || "unclassified") : (p.gradeLevel || baseTax.gradeLevel || "unclassified");
    const initSubject = isEdit ? (existing.subject || baseTax.subject || "") : (p.subject || baseTax.subject || "");

    const targetMode = isEdit
      ? (existing.targetMode || "students")
      : ((p.targetStudentIds || students.length === 0) ? "students" : "class");
    const initTargetClass = isEdit ? (existing.targetClass || "") : "";
    const initTargetIds = isEdit ? (Array.isArray(existing.targetStudentIds) ? existing.targetStudentIds.slice() : []) : (p.targetStudentIds || []);
    const existingSubsCount = isEdit
      ? loadSubmissions().filter(function (s) { return s.assignmentId === existing.id; }).length
      : 0;

    const renderSubjectFieldInner = function (gradeId, curSubj) {
      if (gradeId === "university") {
        const uniList = curr ? curr.getSubjectsForGrade("university") : [];
        return '<input type="text" id="lmsAsSubjectCustom" list="lmsUniSubjList" value="' + esc(curSubj) + '" placeholder="VD: Gi\u1ea3i t\u00edch 1, K\u0129 thu\u1eadt Robot, Ti\u1ebfng Nh\u1eadt N3..." maxlength="100">' +
          '<datalist id="lmsUniSubjList">' + uniList.map(function (s) { return '<option value="' + esc(s) + '"></option>'; }).join("") + '</datalist>';
      }
      return '<select id="lmsAsSubject">' + (curr ? curr.renderSubjectOptionsHtml(gradeId, curSubj) : '') + '</select>' +
        '<input type="text" id="lmsAsSubjectCustom" class="hidden" value="" placeholder="' + esc(tr("Nhập tên môn học mới...")) + '" maxlength="100" style="margin-top:6px">';
    };

    const renderStudentChecks = function (stList, precheckedIds) {
      if (!stList.length) {
        return '<div class="muted" style="font-size:.82rem;padding:6px 0">Ch\u01b0a c\u00f3 h\u1ecdc sinh n\u00e0o trong danh b\u1ea1. D\u00f9ng n\u00fat <strong>+ Th\u00eam h\u1ecdc sinh nhanh</strong> b\u00ean d\u01b0\u1edbi \u0111\u1ec3 th\u00eam ngay!</div>';
      }
      return stList.map(function (s) {
        const chk = precheckedIds && precheckedIds.indexOf(s.id) !== -1;
        const em = getStudentParentEmail(s);
        return '<div class="lms-pick-row" data-st-row="' + esc(s.id) + '">' +
          '<div class="lms-pick-main">' +
            '<label class="check-row" style="margin:0;flex:1"><input type="checkbox" name="lmsAsStPick" value="' + esc(s.id) + '"' + (chk ? " checked" : "") + '> ' +
              '<strong>' + esc(s.fullName) + '</strong> <span class="muted">(' + esc(s.className || "") + ')</span> · ' +
              (em ? ('<span class="lms-recip-email">📧 ' + esc(em) + '</span>') : ('<span class="lms-recip-warn">⚠️ ' + esc(tr("Chưa có email PH")) + '</span>')) +
            '</label>' +
            '<button type="button" class="lms-mini-toggle" data-qedit-st="' + esc(s.id) + '">✏️ ' + esc(tr("Sửa nhanh")) + '</button>' +
          '</div>' +
          '<div class="lms-inline-st-edit hidden" id="lmsInlineEdit_' + esc(s.id) + '">' +
            '<input type="text" class="lms-ie-name" value="' + esc(s.fullName) + '" placeholder="H\u1ecd t\u00ean" maxlength="100">' +
            '<input type="text" class="lms-ie-class" value="' + esc(s.className || "") + '" placeholder="L\u1edbp" maxlength="40">' +
            '<input type="email" class="lms-ie-email" value="' + esc(em) + '" placeholder="Email ph\u1ee5 huynh" maxlength="140">' +
            '<button type="button" class="btn btn-primary btn-sm" data-qsave-st="' + esc(s.id) + '">L\u01b0u HS</button>' +
          '</div>' +
        '</div>';
      }).join("");
    };

    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="lmsAssignModal" role="dialog" aria-modal="true"><div class="modal modal-lg">' +
        '<h3>' + (isEdit ? (esc(tr("Chỉnh sửa bài giao & Học sinh")) + ' <code class="lms-pin">' + esc(existing.code) + '</code>') : (p.isRemedial ? "Giao b\u00e0i t\u1eadp b\u1ed5 tr\u1ee3 (Remedial)" : "T\u1ea1o b\u00e0i giao m\u1edbi")) + '</h3>' +
        '<div class="lms-form-grid">' +
          '<label class="field">' + (isEdit ? "B\u1ed9 \u0111\u1ec1 li\u00ean k\u1ebft (\u0110\u1ed5i \u0111\u1ec1 thi)" : "Ch\u1ecdn b\u1ed9 \u0111\u1ec1") + '<select id="lmsAsQuiz">' +
            quizzes.map(function (q) {
              return '<option value="' + esc(q.id) + '"' + (q.id === selectedQuizId ? " selected" : "") + '>' + esc(q.title) + ' (' + (q.questions ? q.questions.length : 0) + ' c\u00e2u)</option>';
            }).join("") +
          '</select></label>' +
          '<label class="field">Ti\u00eau \u0111\u1ec1 b\u00e0i giao<input type="text" id="lmsAsTitle" value="' + esc(isEdit ? existing.title : (p.title || "")) + '" placeholder="VD: B\u00e0i t\u1eadp tu\u1ea7n 5 - Ch\u01b0\u01a1ng 2" maxlength="120"></label>' +
        '</div>' +

        (isEdit && existingSubsCount > 0
          ? '<div id="lmsAsQuizSwitchWarn" class="hidden" style="margin-top:8px;padding:8px 12px;border-radius:8px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4);font-size:.82rem;color:#92400e">' +
              '⚠️ B\u00e0i giao n\u00e0y \u0111\u00e3 c\u00f3 <strong>' + existingSubsCount + '</strong> b\u00e0i n\u1ed9p. \u0110\u1ed5i \u0111\u1ec1 thi s\u1ebd \u00e1p d\u1ee5ng cho c\u00e1c l\u01b0\u1ee3t l\u00e0m m\u1edbi v\u00e0 <strong>gi\u1eef nguy\u00ean to\u00e0n b\u1ed9 \u0111i\u1ec3m &amp; b\u00e0i n\u1ed9p c\u0169</strong>.' +
            '</div>'
          : '') +

        '<div class="lms-form-grid" style="margin-top:8px">' +
          '<label class="field">' + esc(tr("Khối / Cấp học")) + '<select id="lmsAsGrade">' +
            (curr ? curr.renderGradeOptionsHtml(initGrade, true) : '<option value="unclassified">Ch\u01b0a ph\u00e2n lo\u1ea1i</option>') +
          '</select></label>' +
          '<label class="field">' + esc(tr("Môn học")) + '<div id="lmsAsSubjectHost">' + renderSubjectFieldInner(initGrade, initSubject) + '</div></label>' +
        '</div>' +

        '<div class="lms-form-grid" style="margin-top:8px">' +
          '<label class="field">\u0110\u1ed1i t\u01b0\u1ee3ng giao b\u00e0i<select id="lmsAsTargetMode">' +
            '<option value="class"' + (targetMode === "class" ? " selected" : "") + '>C\u1ea3 l\u1edbp h\u1ecdc</option>' +
            '<option value="students"' + (targetMode === "students" ? " selected" : "") + '>Ch\u1ecdn t\u1eebng h\u1ecdc sinh</option>' +
          '</select></label>' +
          '<label class="field" id="lmsAsClassWrap"' + (targetMode === "students" ? ' style="display:none"' : '') + '>Ch\u1ecdn l\u1edbp<select id="lmsAsClass">' +
            (classes.length ? classes.map(function (c) { return '<option value="' + esc(c) + '"' + (c === initTargetClass ? " selected" : "") + '>' + esc(c) + '</option>'; }).join("") : '<option value="">-- Ch\u01b0a c\u00f3 l\u1edbp --</option>') +
          '</select></label>' +
        '</div>' +

        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px;flex-wrap:wrap">' +
          '<span class="muted" style="font-size:.78rem">Danh s\u00e1ch h\u1ecdc sinh (b\u1ea5m <strong>S\u1eeda nhanh</strong> \u0111\u1ec3 s\u1eeda t\u00ean, l\u1edbp, email PH v\u00e0 \u0111\u1ed3ng b\u1ed9 danh b\u1ea1)</span>' +
          '<button type="button" class="btn btn-outline btn-sm" id="lmsQuickAddToggle">+ Th\u00eam h\u1ecdc sinh nhanh</button>' +
        '</div>' +

        '<div id="lmsQuickAddBox" class="' + (students.length === 0 ? "" : "hidden") + '" style="margin-top:8px;padding:10px 12px;border-radius:10px;border:1px dashed var(--brand);background:var(--bg2)">' +
          '<div class="lms-form-grid">' +
            '<label class="field" style="margin:0">H\u1ecd v\u00e0 t\u00ean<input type="text" id="lmsQaName" placeholder="Nguy\u1ec5n V\u0103n An" maxlength="100"></label>' +
            '<label class="field" style="margin:0">L\u1edbp<input type="text" id="lmsQaClass" placeholder="10A1" maxlength="40"></label>' +
            '<label class="field" style="margin:0">Email ph\u1ee5 huynh<input type="email" id="lmsQaEmail" placeholder="phuhuynh@email.com" maxlength="120"></label>' +
            '<label class="field" style="margin:0">M\u00e3 PIN 4 s\u1ed1<input type="text" id="lmsQaPin" value="' + genPin() + '" maxlength="4"></label>' +
          '</div>' +
          '<div style="margin-top:8px;display:flex;justify-content:flex-end">' +
            '<button type="button" class="btn btn-primary btn-sm" id="lmsQaSaveBtn">+ L\u01b0u &amp; Ch\u1ecdn h\u1ecdc sinh n\u00e0y</button>' +
          '</div>' +
        '</div>' +

        '<div id="lmsAsStudentsWrap" class="lms-pick-box' + (targetMode === "students" ? "" : " hidden") + '">' +
          renderStudentChecks(students, initTargetIds) +
        '</div>' +

        '<div class="lms-form-grid" style="margin-top:8px">' +
          '<label class="field">Th\u1eddi gian m\u1edf \u0111\u1ec1 (t\u00f9y ch\u1ecdn)<input type="datetime-local" id="lmsAsOpen" value="' + esc(isEdit && existing.openAt ? toLocalInputVal(existing.openAt) : "") + '"></label>' +
          '<label class="field">H\u1ea1n n\u1ed9p b\u00e0i (b\u1eaft bu\u1ed9c)<input type="datetime-local" id="lmsAsDeadline" value="' + esc(isEdit && existing.deadline ? toLocalInputVal(existing.deadline) : toLocalInputVal(defaultDead.toISOString())) + '"></label>' +
          '<label class="field">S\u1ed1 l\u1ea7n l\u00e0m b\u00e0i t\u1ed1i \u0111a<select id="lmsAsAttempts">' +
            '<option value="1"' + (isEdit && existing.maxAttempts === 1 ? " selected" : "") + '>Ch\u1ec9 1 l\u1ea7n duy nh\u1ea5t</option>' +
            '<option value="2"' + (isEdit && existing.maxAttempts === 2 ? " selected" : "") + '>T\u1ed1i \u0111a 2 l\u1ea7n</option>' +
            '<option value="3"' + (isEdit && existing.maxAttempts === 3 ? " selected" : "") + '>T\u1ed1i \u0111a 3 l\u1ea7n</option>' +
            '<option value="0"' + (isEdit && existing.maxAttempts === 0 ? " selected" : "") + '>Kh\u00f4ng gi\u1edbi h\u1ea1n tr\u01b0\u1edbc h\u1ea1n n\u1ed9p</option>' +
          '</select></label>' +
          '<label class="field">Quy t\u1eafc t\u00ednh \u0111i\u1ec3m<select id="lmsAsScorePolicy">' +
            '<option value="highest"' + (!isEdit || existing.scorePolicy !== "first" ? " selected" : "") + '>L\u1ea5y \u0111i\u1ec3m cao nh\u1ea5t</option>' +
            '<option value="first"' + (isEdit && existing.scorePolicy === "first" ? " selected" : "") + '>L\u1ea5y \u0111i\u1ec3m l\u1ea7n \u0111\u1ea7u ti\u00ean</option>' +
          '</select></label>' +
          '<label class="field">Hi\u1ec3n th\u1ecb \u0111\u00e1p \u00e1n sau khi n\u1ed9p<select id="lmsAsReveal">' +
            '<option value="immediate"' + (!isEdit || existing.revealMode !== "after_deadline" ? " selected" : "") + '>Hi\u1ec3n th\u1ecb ngay sau khi n\u1ed9p b\u00e0i</option>' +
            '<option value="after_deadline"' + (isEdit && existing.revealMode === "after_deadline" ? " selected" : "") + '>Ch\u1ec9 hi\u1ec3n th\u1ecb sau khi h\u1ebft h\u1ea1n n\u1ed9p c\u1ee7a l\u1edbp</option>' +
          '</select></label>' +
          '<label class="field">Th\u1eddi gian l\u00e0m b\u00e0i (ph\u00fat, 0 = kh\u00f4ng gi\u1edbi h\u1ea1n)<input type="number" id="lmsAsMinutes" min="0" max="300" value="' + esc(isEdit ? String(existing.durationMinutes || 0) : "30") + '"></label>' +
        '</div>' +

        '<label class="field" style="margin-top:8px">Ghi ch\u00fa c\u1ee7a gi\u00e1o vi\u00ean (h\u01b0\u1edbng d\u1eabn, c\u00f4ng th\u1ee9c, link t\u00e0i li\u1ec7u)<textarea id="lmsAsNote" rows="2" maxlength="600" placeholder="VD: \u0110\u1ecdc k\u1ef9 \u0111\u1ec1 tr\u01b0\u1edbc khi ch\u1ecdn \u0111\u00e1p \u00e1n. \u00d4n l\u1ea1i c\u00f4ng th\u1ee9c trang 42.">' + esc(isEdit ? (existing.teacherNote || "") : (p.note || "")) + '</textarea></label>' +

        '<div class="lms-checks-row">' +
          '<label class="check-row"><input type="checkbox" id="lmsAsShuffleQ"' + (!isEdit || existing.shuffleQ ? " checked" : "") + '> \u0110\u1ea3o th\u1ee9 t\u1ef1 c\u00e2u h\u1ecfi ri\u00eang cho t\u1eebng h\u1ecdc sinh</label>' +
          '<label class="check-row"><input type="checkbox" id="lmsAsShuffleO"' + (!isEdit || existing.shuffleO ? " checked" : "") + '> \u0110\u1ea3o th\u1ee9 t\u1ef1 \u0111\u00e1p \u00e1n (Zero-Drift)</label>' +
          '<label class="check-row"><input type="checkbox" id="lmsAsParentEmail"' + (!isEdit || existing.parentEmailEnabled ? " checked" : "") + '> T\u1ef1 \u0111\u1ed9ng g\u1eedi email b\u00e1o c\u00e1o k\u1ebft qu\u1ea3 cho ph\u1ee5 huynh</label>' +
        '</div>' +

        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-outline" id="lmsAsCancel">H\u1ee7y</button>' +
          '<button type="button" class="btn btn-primary" id="lmsAsSave">' + (isEdit ? esc(tr("Lưu thay đổi")) : "T\u1ea1o &amp; Giao b\u00e0i") + '</button>' +
        '</div>' +
      '</div></div>';

    if (typeof U().applyI18n === "function") U().applyI18n(host);

    const bindSubjectEvents = function () {
      const sel = U().$("lmsAsSubject");
      const customInp = U().$("lmsAsSubjectCustom");
      if (sel && customInp) {
        sel.addEventListener("change", function () {
          const isCustom = sel.value === "__custom__";
          customInp.classList.toggle("hidden", !isCustom);
          if (isCustom) customInp.focus();
        });
      }
    };
    bindSubjectEvents();

    U().on("lmsAsGrade", "change", function (e) {
      const hostEl = U().$("lmsAsSubjectHost");
      if (hostEl) {
        hostEl.innerHTML = renderSubjectFieldInner(e.target.value, "");
        bindSubjectEvents();
      }
    });

    U().on("lmsAsQuiz", "change", function (e) {
      const warnEl = U().$("lmsAsQuizSwitchWarn");
      if (warnEl && isEdit) {
        warnEl.classList.toggle("hidden", e.target.value === existing.quizId);
      }
      if (!isEdit && curr) {
        const pickedQ = quizzes.find(function (q) { return q.id === e.target.value; });
        if (pickedQ) {
          const tx = curr.detectTaxonomy(pickedQ);
          const grEl = U().$("lmsAsGrade");
          const sHost = U().$("lmsAsSubjectHost");
          if (grEl && tx.gradeLevel) grEl.value = tx.gradeLevel;
          if (sHost) {
            sHost.innerHTML = renderSubjectFieldInner(tx.gradeLevel, tx.subject);
            bindSubjectEvents();
          }
        }
      }
    });

    // Inline Quick-Edit Student Info inside the modal (syncs back to master roster!)
    const swEl = U().$("lmsAsStudentsWrap");
    if (swEl) {
      swEl.addEventListener("click", function (ev) {
        const editBtn = ev.target.closest ? ev.target.closest("[data-qedit-st]") : null;
        if (editBtn) {
          const sid = editBtn.getAttribute("data-qedit-st");
          const box = U().$("lmsInlineEdit_" + sid);
          if (box) box.classList.toggle("hidden");
          return;
        }
        const saveBtn = ev.target.closest ? ev.target.closest("[data-qsave-st]") : null;
        if (saveBtn) {
          const sid = saveBtn.getAttribute("data-qsave-st");
          const box = U().$("lmsInlineEdit_" + sid);
          if (!box) return;
          const nm = (box.querySelector(".lms-ie-name") ? box.querySelector(".lms-ie-name").value : "").trim();
          const cls = (box.querySelector(".lms-ie-class") ? box.querySelector(".lms-ie-class").value : "").trim() || "Ch\u01b0a ph\u00e2n l\u1edbp";
          const em = (box.querySelector(".lms-ie-email") ? box.querySelector(".lms-ie-email").value : "").trim();
          if (!nm) { U().showToast("Vui l\u00f2ng nh\u1eadp h\u1ecd v\u00e0 t\u00ean h\u1ecdc sinh.", "warning"); return; }
          if (em && !isValidEmailList(em)) { U().showToast("\u0110\u1ecba ch\u1ec9 email ph\u1ee5 huynh kh\u00f4ng h\u1ee3p l\u1ec7.", "warning"); return; }
          const allSt = loadStudents();
          const idx = allSt.findIndex(function (x) { return x.id === sid; });
          if (idx !== -1) {
            allSt[idx] = Object.assign({}, allSt[idx], { fullName: nm, className: cls, parentEmail: em });
            saveStudents(allSt);
          }
          const checkedIds = [];
          host.querySelectorAll('input[name="lmsAsStPick"]:checked').forEach(function (cb) { checkedIds.push(cb.value); });
          swEl.innerHTML = renderStudentChecks(allSt, checkedIds);
          const clSel = U().$("lmsAsClass");
          if (clSel) {
            const curClsVal = clSel.value;
            const nextClasses = Array.from(new Set(allSt.map(function (s) { return s.className || "Ch\u01b0a ph\u00e2n l\u1edbp"; }))).sort();
            clSel.innerHTML = nextClasses.map(function (c) { return '<option value="' + esc(c) + '"' + (c === curClsVal ? " selected" : "") + '>' + esc(c) + '</option>'; }).join("");
          }
          U().showToast(tr("Đã cập nhật thông tin học sinh và đồng bộ danh bạ."), "success");
        }
      });
    }

    U().on("lmsQuickAddToggle", "click", function () {
      const box = U().$("lmsQuickAddBox");
      if (box) box.classList.toggle("hidden");
    });
    U().on("lmsQaSaveBtn", "click", function () {
      const nm = (U().$("lmsQaName") ? U().$("lmsQaName").value : "").trim();
      const cls = (U().$("lmsQaClass") ? U().$("lmsQaClass").value : "").trim() || "Ch\u01b0a ph\u00e2n l\u1edbp";
      const em = (U().$("lmsQaEmail") ? U().$("lmsQaEmail").value : "").trim();
      const pin = (U().$("lmsQaPin") ? U().$("lmsQaPin").value : "").trim();
      if (!nm) { U().showToast("Vui l\u00f2ng nh\u1eadp h\u1ecd v\u00e0 t\u00ean h\u1ecdc sinh.", "warning"); return; }
      if (!/^\d{4}$/.test(pin)) { U().showToast("M\u00e3 PIN ph\u1ea3i g\u1ed3m \u0111\u00fang 4 ch\u1eef s\u1ed1.", "warning"); return; }
      const newSt = { id: "st_" + Date.now() + "_" + Math.floor(Math.random() * 1000), fullName: nm, className: cls, school: "", parentEmail: em, phone: "", pin: pin, createdAt: new Date().toISOString() };
      const curList = loadStudents();
      curList.push(newSt);
      saveStudents(curList);

      const checkedIds = [];
      host.querySelectorAll('input[name="lmsAsStPick"]:checked').forEach(function (cb) { checkedIds.push(cb.value); });
      checkedIds.push(newSt.id);
      const sw = U().$("lmsAsStudentsWrap");
      if (sw) {
        sw.innerHTML = renderStudentChecks(curList, checkedIds);
        sw.classList.remove("hidden");
      }
      const tm = U().$("lmsAsTargetMode");
      if (tm) tm.value = "students";
      const cw = U().$("lmsAsClassWrap");
      if (cw) cw.style.display = "none";
      const clSel = U().$("lmsAsClass");
      if (clSel) {
        const nextClasses = Array.from(new Set(curList.map(function (s) { return s.className || "Ch\u01b0a ph\u00e2n l\u1edbp"; }))).sort();
        clSel.innerHTML = nextClasses.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");
      }
      if (U().$("lmsQaName")) U().$("lmsQaName").value = "";
      if (U().$("lmsQaEmail")) U().$("lmsQaEmail").value = "";
      if (U().$("lmsQaPin")) U().$("lmsQaPin").value = genPin();
      U().showToast("\u0110\u00e3 th\u00eam h\u1ecdc sinh \"" + nm + "\" (PIN: " + pin + ")!", "success");
    });
    U().on("lmsAsTargetMode", "change", function (e) {
      const isSt = e.target.value === "students";
      const cw = U().$("lmsAsClassWrap");
      const sw = U().$("lmsAsStudentsWrap");
      if (cw) cw.style.display = isSt ? "none" : "";
      if (sw) sw.classList.toggle("hidden", !isSt);
    });
    U().on("lmsAsCancel", "click", function () { host.innerHTML = ""; });
    U().on("lmsAsSave", "click", function () {
      const qId = U().$("lmsAsQuiz").value;
      const quizObj = quizzes.find(function (q) { return q.id === qId; });
      if (!quizObj) return;
      const title = (U().$("lmsAsTitle").value || "").trim() || quizObj.title;
      const deadlineVal = U().$("lmsAsDeadline").value;
      if (!deadlineVal) { U().showToast("Vui l\u00f2ng ch\u1ecdn h\u1ea1n n\u1ed9p b\u00e0i.", "warning"); return; }
      const openVal = U().$("lmsAsOpen").value;
      const tMode = U().$("lmsAsTargetMode").value;
      let targetClass = "", targetStudentIds = [];
      if (tMode === "class") {
        targetClass = U().$("lmsAsClass").value;
        if (!targetClass) { U().showToast("Ch\u01b0a c\u00f3 l\u1edbp h\u1ecdc n\u00e0o. H\u00e3y th\u00eam h\u1ecdc sinh nhanh tr\u01b0\u1edbc.", "warning"); return; }
      } else {
        const boxes = host.querySelectorAll('input[name="lmsAsStPick"]:checked');
        for (let i = 0; i < boxes.length; i++) targetStudentIds.push(boxes[i].value);
        if (!targetStudentIds.length) { U().showToast("Vui l\u00f2ng ch\u1ecdn \u00edt nh\u1ea5t 1 h\u1ecdc sinh.", "warning"); return; }
      }

      const gradeLevel = (U().$("lmsAsGrade") && U().$("lmsAsGrade").value) || "unclassified";
      let subject = "";
      if (gradeLevel === "university") {
        subject = (U().$("lmsAsSubjectCustom") && U().$("lmsAsSubjectCustom").value.trim()) || "";
      } else {
        const selSubj = U().$("lmsAsSubject") ? U().$("lmsAsSubject").value : "";
        subject = selSubj === "__custom__"
          ? ((U().$("lmsAsSubjectCustom") && U().$("lmsAsSubjectCustom").value.trim()) || "")
          : selSubj.trim();
      }
      if (subject && curr) {
        subject = curr.saveCustomSubject(gradeLevel, subject);
      }

      const list = loadAssignments();
      if (isEdit) {
        const idx = list.findIndex(function (a) { return a.id === existing.id; });
        if (idx !== -1) {
          const quizChanged = existing.quizId !== quizObj.id;
          list[idx] = Object.assign({}, list[idx], {
            quizId: quizObj.id,
            title: title,
            gradeLevel: gradeLevel,
            subject: subject,
            quizSnapshot: quizChanged ? JSON.parse(JSON.stringify(quizObj)) : list[idx].quizSnapshot,
            targetMode: tMode,
            targetClass: targetClass,
            targetStudentIds: targetStudentIds,
            openAt: openVal ? new Date(openVal).toISOString() : "",
            deadline: new Date(deadlineVal).toISOString(),
            maxAttempts: parseInt(U().$("lmsAsAttempts").value, 10) || 0,
            scorePolicy: U().$("lmsAsScorePolicy").value || "highest",
            revealMode: U().$("lmsAsReveal").value || "immediate",
            durationMinutes: Math.max(0, parseInt(U().$("lmsAsMinutes").value, 10) || 0),
            teacherNote: (U().$("lmsAsNote").value || "").trim(),
            shuffleQ: !!U().$("lmsAsShuffleQ").checked,
            shuffleO: !!U().$("lmsAsShuffleO").checked,
            parentEmailEnabled: !!U().$("lmsAsParentEmail").checked,
            updatedAt: new Date().toISOString()
          });
          saveAssignments(list);
          host.innerHTML = "";
          U().showToast(tr("Đã cập nhật bài giao thành công!"), "success");
          refreshStudio();
        }
        return;
      }

      const item = {
        id: "as_" + Date.now(),
        code: genAssignCode(),
        quizId: quizObj.id,
        title: title,
        gradeLevel: gradeLevel,
        subject: subject,
        quizSnapshot: JSON.parse(JSON.stringify(quizObj)),
        targetMode: tMode,
        targetClass: targetClass,
        targetStudentIds: targetStudentIds,
        openAt: openVal ? new Date(openVal).toISOString() : "",
        deadline: new Date(deadlineVal).toISOString(),
        maxAttempts: parseInt(U().$("lmsAsAttempts").value, 10) || 0,
        scorePolicy: U().$("lmsAsScorePolicy").value || "highest",
        revealMode: U().$("lmsAsReveal").value || "immediate",
        durationMinutes: Math.max(0, parseInt(U().$("lmsAsMinutes").value, 10) || 0),
        teacherNote: (U().$("lmsAsNote").value || "").trim(),
        shuffleQ: !!U().$("lmsAsShuffleQ").checked,
        shuffleO: !!U().$("lmsAsShuffleO").checked,
        parentEmailEnabled: !!U().$("lmsAsParentEmail").checked,
        parentEmailOverrides: {},
        isRemedial: !!p.isRemedial,
        createdAt: new Date().toISOString()
      };
      list.unshift(item);
      saveAssignments(list);
      lmsState.selectedAssignmentId = item.id;
      host.innerHTML = "";
      U().showToast("\u0110\u00e3 t\u1ea1o b\u00e0i giao th\u00e0nh c\u00f4ng! M\u00e3 b\u00e0i: " + item.code, "success");
      if (window.UETStudio && typeof window.UETStudio.openLmsScreen === "function") {
        window.UETStudio.openLmsScreen("assignments");
      } else {
        refreshStudio();
      }
    });
  }

  function openFeedbackRulesModal() {
    const rules = loadFeedbackRules();
    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="lmsFbModal" role="dialog" aria-modal="true"><div class="modal">' +
        '<h3>Mẫu nhận xét tự động theo mức điểm</h3>' +
        '<p class="muted" style="font-size:.82rem;margin-top:0">Nội dung nhận xét sẽ tự động chèn vào email gửi phụ huynh dựa trên điểm số của học sinh.</p>' +
        rules.map(function (r, i) {
          return '<label class="field" style="margin-bottom:10px">Mức điểm ' + r.min + ' – ' + r.max +
            '<textarea id="lmsFbRule_' + i + '" rows="2" maxlength="300">' + esc(r.comment) + '</textarea></label>';
        }).join("") +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-outline" id="lmsFbCancel">Hủy</button>' +
          '<button type="button" class="btn btn-primary" id="lmsFbSave">Lưu mẫu nhận xét</button>' +
        '</div>' +
      '</div></div>';

    if (typeof U().applyI18n === "function") U().applyI18n(host);
    U().on("lmsFbCancel", "click", function () { host.innerHTML = ""; });
    U().on("lmsFbSave", "click", function () {
      const next = rules.map(function (r, i) {
        const el = U().$("lmsFbRule_" + i);
        return { min: r.min, max: r.max, comment: el ? el.value.trim() : r.comment };
      });
      saveFeedbackRules(next);
      host.innerHTML = "";
      U().showToast("Đã lưu mẫu nhận xét tự động.", "success");
    });
  }

  /* ======================== PARENT EMAIL & REMINDER SERVICE ======================== */
  function buildReminderPlainText(assign, pendingList) {
    const dl = fmtDeadlineParts(assign.deadline);
    const link = buildAssignmentUrl(assign.code);
    const names = pendingList.map(function (st) { return st.fullName + (st.className ? (" (" + st.className + ")") : ""); }).join(", ");
    return "[AI Tutor] " + tr("Nhắc hạn nộp bài") + ": " + assign.title + "\n" +
      tr("Học sinh chưa nộp") + ": " + names + "\n" +
      tr("Hạn nộp") + ": " + dl.full + "\n" +
      (assign.teacherNote ? (tr("Ghi chú của giáo viên") + ": " + assign.teacherNote + "\n") : "") +
      tr("Liên kết làm bài") + ": " + link;
  }

  function openEmailDeliveryFallbackModal(opts) {
    const host = U().$("extraModals");
    if (!host) return;
    const assign = opts.assign;
    const pendingWithEmail = opts.pendingWithEmail || [];
    const results = opts.results || [];
    const isNotConfigured = opts.code === "EMAIL_PROVIDER_NOT_CONFIGURED";
    const requiredEnv = Array.isArray(opts.requiredEnv) && opts.requiredEnv.length
      ? opts.requiredEnv
      : ["RESEND_API_KEY", "EMAIL_FROM", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
    const errMsg = opts.error || tr("Không thể gửi email từ máy chủ.");
    const plainMsg = buildReminderPlainText(assign, pendingWithEmail);
    const toEmails = pendingWithEmail.map(function (st) { return st.parentEmail; }).filter(Boolean).join(",");
    const mailtoSubject = "[AI Tutor] " + tr("Nhắc hạn nộp bài") + ": " + assign.title;
    const mailtoHref = "mailto:" + encodeURIComponent(toEmails) + "?subject=" + encodeURIComponent(mailtoSubject) + "&body=" + encodeURIComponent(plainMsg);

    const rowsHtml = results.length
      ? '<div class="lms-table-wrap" style="max-height:180px;overflow:auto;margin:10px 0"><table class="lms-table"><thead><tr><th>' + esc(tr("Học sinh")) + '</th><th>Email</th><th>' + esc(tr("Trạng thái")) + '</th></tr></thead><tbody>' +
          results.map(function (r) {
            return '<tr><td>' + esc(r.studentName || "") + '</td><td><code>' + esc(r.to || "") + '</code></td><td>' +
              (r.status === "sent"
                ? '<span class="lms-badge-ok">' + esc(tr("Đã gửi")) + '</span>'
                : '<span class="lms-badge-closed" title="' + esc(r.error || "") + '">' + esc(tr("Thất bại")) + ': ' + esc((r.error || "").slice(0, 80)) + '</span>') +
            '</td></tr>';
          }).join("") +
        '</tbody></table></div>'
      : '';

    host.innerHTML =
      '<div class="modal-overlay" id="lmsEmailFallbackModal" role="dialog" aria-modal="true"><div class="modal" style="max-width:600px">' +
        '<h3 style="margin-top:0">' + esc(isNotConfigured ? tr("Chưa cấu hình dịch vụ gửi Email trên máy chủ") : tr("Gửi email nhắc nộp bài chưa thành công")) + '</h3>' +
        '<div style="background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.35);color:#b91c1c;padding:10px 12px;border-radius:10px;font-size:.84rem;line-height:1.5;margin-bottom:12px">' +
          '<strong>' + esc(tr("Chi tiết lỗi")) + ':</strong> ' + esc(errMsg) +
        '</div>' +
        (isNotConfigured
          ? '<div style="background:var(--bg2);border:1px solid var(--border);padding:10px 12px;border-radius:10px;font-size:.82rem;margin-bottom:12px">' +
              '<div style="font-weight:700;margin-bottom:4px">' + esc(tr("Biến môi trường cần cấu hình trên Vercel")) + ':</div>' +
              '<code>' + esc(requiredEnv.join(", ")) + '</code>' +
              '<div class="muted" style="margin-top:4px">' + esc(tr("Cấu hình Resend (RESEND_API_KEY + EMAIL_FROM) hoặc Gmail/SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) rồi Redeploy.")) + '</div>' +
            '</div>'
          : '') +
        rowsHtml +
        '<label class="field" style="margin-bottom:12px">' + esc(tr("Nội dung nhắc nhở (dự phòng gửi thủ công)")) +
          '<textarea id="lmsReminderFallbackText" rows="5" readonly style="font-size:.82rem">' + esc(plainMsg) + '</textarea>' +
        '</label>' +
        '<div class="modal-actions" style="flex-wrap:wrap;gap:8px">' +
          '<button type="button" class="btn btn-outline btn-sm" id="lmsRemCopyBtn">📋 ' + esc(tr("Sao chép nội dung nhắc nhở")) + '</button>' +
          '<a class="btn btn-primary btn-sm" id="lmsRemMailtoBtn" href="' + esc(mailtoHref) + '" style="text-decoration:none">✉️ ' + esc(tr("Mở ứng dụng Email (mailto:)")) + '</a>' +
          '<button type="button" class="btn btn-outline btn-sm" id="lmsRemCloseBtn">' + esc(tr("Đóng")) + '</button>' +
        '</div>' +
      '</div></div>';

    if (typeof U().applyI18n === "function") U().applyI18n(host);
    U().on("lmsRemCopyBtn", "click", function () {
      U().copyText(plainMsg, tr("nội dung nhắc nộp bài"));
    });
    U().on("lmsRemCloseBtn", "click", function () { host.innerHTML = ""; });
  }

  function getStudentParentEmail(student) {
    if (!student || typeof student !== "object") return "";
    const raw = student.parentEmail || student.parent_email || student.email || "";
    return String(raw).trim();
  }

  function isValidEmailList(raw) {
    const parts = String(raw || "").split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!parts.length) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return parts.every(function (addr) { return re.test(addr); });
  }

  function openMissingParentEmailModal(opts) {
    const host = U().$("extraModals");
    const assign = opts.assign;
    const missingStudents = opts.missingStudents || [];
    const readyStudents = opts.readyStudents || [];
    const onConfirm = opts.onConfirm;

    if (!host) {
      if (readyStudents.length && typeof onConfirm === "function") onConfirm(readyStudents);
      return;
    }

    host.innerHTML =
      '<div class="modal-overlay" id="lmsMissingEmailModal" role="dialog" aria-modal="true"><div class="modal" style="max-width:560px">' +
        '<h3 style="margin-top:0">' + esc(tr("Nhập Email phụ huynh trước khi gửi")) + '</h3>' +
        '<p class="muted" style="font-size:.84rem;margin-top:0">' +
          esc(tr("Các học sinh sau chưa có địa chỉ email phụ huynh hợp lệ. Hãy nhập email bên dưới để gửi ngay (có thể phân tách nhiều email bằng dấu phẩy):")) +
        '</p>' +
        '<div style="max-height:260px;overflow:auto;display:flex;flex-direction:column;gap:10px;margin:12px 0">' +
          missingStudents.map(function (st, idx) {
            return '<label class="field" style="margin:0">' +
              '<span><strong>' + esc(st.fullName) + '</strong>' + (st.className ? (' <span class="muted">(' + esc(st.className) + ')</span>') : '') + '</span>' +
              '<input type="email" id="lmsMissEm_' + idx + '" data-st-id="' + esc(st.id) + '" value="' + esc(getStudentParentEmail(st)) + '" placeholder="phuhuynh@email.com" maxlength="160">' +
            '</label>';
          }).join("") +
        '</div>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:.84rem;margin-bottom:14px;cursor:pointer">' +
          '<input type="checkbox" id="lmsMissEmSave" checked>' +
          '<span>' + esc(tr("Lưu email này vào hồ sơ học sinh cho các lần gửi sau")) + '</span>' +
        '</label>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" id="lmsMissEmCancel">' + esc(tr("Hủy")) + '</button>' +
          (readyStudents.length
            ? '<button type="button" class="btn btn-outline btn-sm" id="lmsMissEmSkip">' + esc(tr("Bỏ qua & chỉ gửi ")) + readyStudents.length + ' HS</button>'
            : '') +
          '<button type="button" class="btn btn-primary btn-sm" id="lmsMissEmSend">✉️ ' + esc(tr("Xác nhận & Gửi email")) + '</button>' +
        '</div>' +
      '</div></div>';

    if (typeof U().applyI18n === "function") U().applyI18n(host);
    U().on("lmsMissEmCancel", "click", function () { host.innerHTML = ""; });
    if (readyStudents.length) {
      U().on("lmsMissEmSkip", "click", function () {
        host.innerHTML = "";
        if (typeof onConfirm === "function") onConfirm(readyStudents);
      });
    }
    U().on("lmsMissEmSend", "click", function () {
      const saveBack = !!(U().$("lmsMissEmSave") && U().$("lmsMissEmSave").checked);
      const updatedStudents = [];
      const allStudents = loadStudents();
      let changedRoster = false;

      for (let i = 0; i < missingStudents.length; i++) {
        const inp = U().$("lmsMissEm_" + i);
        const val = inp ? inp.value.trim() : "";
        if (!val) continue;
        if (!isValidEmailList(val)) {
          U().showToast(tr("Địa chỉ email không hợp lệ cho học sinh ") + missingStudents[i].fullName + ": " + val, "warning");
          if (inp) inp.focus();
          return;
        }
        const clone = Object.assign({}, missingStudents[i], { parentEmail: val });
        updatedStudents.push(clone);
        if (saveBack) {
          const idx = allStudents.findIndex(function (x) { return x.id === clone.id; });
          if (idx !== -1) {
            allStudents[idx].parentEmail = val;
            changedRoster = true;
          }
        }
      }

      if (changedRoster) saveStudents(allStudents);
      const finalList = readyStudents.concat(updatedStudents);
      if (!finalList.length) {
        U().showToast(tr("Vui lòng nhập ít nhất 1 địa chỉ email phụ huynh hợp lệ."), "warning");
        return;
      }
      host.innerHTML = "";
      if (typeof onConfirm === "function") onConfirm(finalList);
    });
  }

  /* ======================== UNIFIED PARENT EMAIL DISPATCHER ======================== */
  async function sendParentEmailBatch(opts) {
    const assign = opts.assign;
    const emailType = opts.type || "deadline_reminder";
    const recipients = Array.isArray(opts.recipients) ? opts.recipients : [];
    const silent = !!opts.silent;
    const subIdMap = opts.subIdMap || {};

    if (!assign || !recipients.length) {
      return { ok: false, sent: 0, failed: 0, results: [], error: "No recipients" };
    }

    const lang = U().getLang ? U().getLang() : "vi";
    const assignmentUrl = buildAssignmentUrl(assign.code);
    const reqBody = {
      type: emailType,
      assignmentId: assign.id,
      quizTitle: assign.title,
      deadline: assign.deadline || "",
      assignmentUrl: assignmentUrl,
      teacherNote: assign.teacherNote || "",
      lang: lang,
      recipients: recipients.map(function (r) {
        return {
          studentId: r.studentId || "",
          studentName: r.studentName || "",
          className: r.className || "",
          to: String(r.to || "").trim(),
          score10: r.score10,
          durationSec: r.durationSec,
          feedback: r.feedback,
          receiptUrl: r.receiptUrl
        };
      })
    };

    if (!silent) {
      const targetPreview = recipients.length === 1
        ? recipients[0].to
        : (recipients.length + " " + tr("phụ huynh"));
      U().showToast(tr("Đang gửi email tới ") + targetPreview + "...", "info");
    }

    const persistDeliveryLogs = function (resultsList, fallbackCode, fallbackErr) {
      const nowIso = new Date().toISOString();
      const logs = loadEmailLogs();
      const assignments = loadAssignments();
      const targetAssign = assignments.find(function (a) { return a.id === assign.id; });
      if (targetAssign && (!targetAssign.reminderDelivery || typeof targetAssign.reminderDelivery !== "object")) {
        targetAssign.reminderDelivery = {};
      }
      const subs = loadSubmissions();
      let subsChanged = false;

      const list = resultsList.length
        ? resultsList
        : recipients.map(function (r) {
            return {
              studentId: r.studentId,
              studentName: r.studentName,
              to: r.to,
              status: "failed",
              code: fallbackCode || "EMAIL_DELIVERY_FAILED",
              error: fallbackErr || "Delivery failed",
              timestamp: nowIso
            };
          });

      list.forEach(function (r) {
        const ts = r.timestamp || nowIso;
        const verifiedSent = r.status === "sent" && Boolean(r.messageId);
        logs.push({
          id: "em_" + Date.now() + "_" + (r.studentId || Math.random().toString(36).slice(2, 6)),
          type: emailType,
          assignmentId: assign.id,
          studentId: r.studentId || "",
          to: r.to || "",
          studentName: r.studentName || "",
          quizTitle: assign.title,
          deadline: assign.deadline || "",
          status: verifiedSent ? "sent" : "failed",
          provider: r.provider || "",
          messageId: r.messageId || "",
          error: verifiedSent ? "" : (r.error || fallbackErr || "Missing messageId"),
          sentAt: ts
        });

        if (emailType === "result_report" && r.studentId && subIdMap[r.studentId]) {
          const targetSub = subs.find(function (x) { return x.id === subIdMap[r.studentId]; });
          if (targetSub) {
            targetSub.parentEmailStatus = verifiedSent ? "sent" : "failed";
            targetSub.parentEmailSentAt = verifiedSent ? ts : "";
            targetSub.parentEmailMessageId = verifiedSent ? (r.messageId || "") : "";
            targetSub.parentEmailError = verifiedSent ? "" : (r.error || fallbackErr || "Email delivery failed");
            subsChanged = true;
          }
        } else if (targetAssign && r.studentId) {
          targetAssign.reminderDelivery[r.studentId] = {
            status: verifiedSent ? "sent" : "failed",
            timestamp: ts,
            provider: r.provider || "",
            messageId: r.messageId || "",
            error: verifiedSent ? "" : (r.error || fallbackErr || "Email delivery failed")
          };
        }
      });

      saveEmailLogs(logs);
      if (targetAssign) saveAssignments(assignments);
      if (subsChanged) saveSubmissions(subs);
      if (!silent) refreshStudio();
    };

    try {
      const resp = await fetch("/api/lms/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
      });
      const data = await resp.json().catch(function () { return {}; });
      const rawResults = Array.isArray(data.results) ? data.results : [];

      if (resp.status === 503 || data.code === "EMAIL_PROVIDER_NOT_CONFIGURED") {
        persistDeliveryLogs([], "EMAIL_PROVIDER_NOT_CONFIGURED", data.error || "Email provider not configured");
        if (!silent) {
          U().showToast(tr("Chưa cấu hình dịch vụ gửi email trên máy chủ (503). Đã mở tùy chọn gửi dự phòng."), "error");
          openEmailDeliveryFallbackModal({
            assign: assign,
            pendingWithEmail: recipients.map(function (r) { return { fullName: r.studentName, className: r.className, parentEmail: r.to }; }),
            results: [],
            code: "EMAIL_PROVIDER_NOT_CONFIGURED",
            requiredEnv: data.requiredEnv,
            error: data.error
          });
        }
        return { ok: false, status: 503, code: "EMAIL_PROVIDER_NOT_CONFIGURED", sent: 0, failed: recipients.length, results: [], error: data.error };
      }

      const verifiedResults = rawResults.map(function (r) {
        if (r.status === "sent" && !r.messageId) {
          return Object.assign({}, r, { status: "failed", error: "Server returned sent without messageId" });
        }
        return r;
      });
      const sentItems = verifiedResults.filter(function (r) { return r.status === "sent" && Boolean(r.messageId); });
      const failedItems = verifiedResults.filter(function (r) { return !(r.status === "sent" && Boolean(r.messageId)); });

      persistDeliveryLogs(verifiedResults, data.code || ("HTTP_" + resp.status), data.error || ("HTTP " + resp.status));

      if (resp.ok && data.ok && sentItems.length > 0 && failedItems.length === 0) {
        const sentEmails = sentItems.map(function (r) { return r.to; }).join(", ");
        if (!silent) {
          U().showToast("✅ " + tr("Đã gửi email tới ") + sentEmails, "success");
        }
        return { ok: true, provider: data.provider || "", sent: sentItems.length, failed: 0, results: verifiedResults };
      }

      if (sentItems.length > 0 && failedItems.length > 0) {
        if (!silent) {
          U().showToast(
            tr("Đã gửi ") + sentItems.length + " email, " + tr("thất bại ") + failedItems.length + " email. Xem chi tiết lỗi.",
            "warning"
          );
          openEmailDeliveryFallbackModal({
            assign: assign,
            pendingWithEmail: recipients.map(function (r) { return { fullName: r.studentName, className: r.className, parentEmail: r.to }; }),
            results: verifiedResults,
            code: "PARTIAL_DELIVERY",
            error: tr("Một số email không thể gửi tới phụ huynh.")
          });
        }
        return { ok: false, provider: data.provider || "", sent: sentItems.length, failed: failedItems.length, results: verifiedResults };
      }

      const errMsg = data.error || (failedItems[0] && failedItems[0].error) || ("HTTP " + resp.status);
      if (!silent) {
        U().showToast(tr("Gửi email thất bại: ") + errMsg, "error");
        openEmailDeliveryFallbackModal({
          assign: assign,
          pendingWithEmail: recipients.map(function (r) { return { fullName: r.studentName, className: r.className, parentEmail: r.to }; }),
          results: verifiedResults,
          code: data.code || "EMAIL_DELIVERY_FAILED",
          error: errMsg
        });
      }
      return { ok: false, sent: 0, failed: recipients.length, results: verifiedResults, error: errMsg };
    } catch (err) {
      const msg = (err && err.message) || tr("Lỗi kết nối máy chủ gửi email.");
      persistDeliveryLogs([], "NETWORK_ERROR", msg);
      if (!silent) {
        U().showToast(tr("Gửi email thất bại: ") + msg, "error");
        openEmailDeliveryFallbackModal({
          assign: assign,
          pendingWithEmail: recipients.map(function (r) { return { fullName: r.studentName, className: r.className, parentEmail: r.to }; }),
          results: [],
          code: "NETWORK_ERROR",
          error: msg
        });
      }
      return { ok: false, sent: 0, failed: recipients.length, results: [], error: msg };
    }
  }

  function dispatchParentReportEmail(assign, student, sub) {
    if (!assign.parentEmailEnabled) return { sent: false, reason: "disabled" };
    if (assign.parentEmailOverrides && assign.parentEmailOverrides[student.id] === false) return { sent: false, reason: "override_off" };
    const toEmail = getStudentParentEmail(student);
    if (!toEmail || !isValidEmailList(toEmail)) return { sent: false, reason: "missing_email" };

    const feedback = computeDynamicFeedback(sub.score10);
    const receiptUrl = buildReceiptUrl(sub.id);
    const subIdMap = {};
    subIdMap[student.id] = sub.id;

    sendParentEmailBatch({
      assign: assign,
      type: "result_report",
      silent: true,
      subIdMap: subIdMap,
      recipients: [{
        studentId: student.id,
        studentName: student.fullName,
        className: student.className || "",
        to: toEmail,
        score10: sub.score10,
        durationSec: sub.durationSec,
        feedback: feedback,
        receiptUrl: receiptUrl
      }]
    });

    return { sent: false, queued: true };
  }

  function sendDeadlineReminders(assignId) {
    const assign = loadAssignments().find(function (a) { return a.id === assignId; });
    if (!assign) return;
    const roster = getAssignedStudentsFor(assign);
    const submittedIds = new Set(loadSubmissions().filter(function (s) { return s.assignmentId === assign.id; }).map(function (s) { return s.studentId; }));
    const pending = roster.filter(function (st) { return !submittedIds.has(st.id); });
    if (!pending.length) {
      U().showToast(tr("Tất cả học sinh đã hoàn thành bài tập này."), "info");
      return;
    }

    const ready = [];
    const missing = [];
    pending.forEach(function (st) {
      const em = getStudentParentEmail(st);
      if (em && isValidEmailList(em)) ready.push(Object.assign({}, st, { parentEmail: em }));
      else missing.push(st);
    });

    const dispatchList = function (studentList) {
      return sendParentEmailBatch({
        assign: assign,
        type: "deadline_reminder",
        silent: false,
        recipients: studentList.map(function (st) {
          return {
            studentId: st.id,
            studentName: st.fullName,
            className: st.className || "",
            to: getStudentParentEmail(st)
          };
        })
      });
    };

    if (missing.length > 0) {
      openMissingParentEmailModal({
        assign: assign,
        missingStudents: missing,
        readyStudents: ready,
        onConfirm: dispatchList
      });
      return;
    }

    return dispatchList(ready);
  }

  function sendStudentGradebookEmail(assignId, studentId) {
    const assign = loadAssignments().find(function (a) { return a.id === assignId; });
    const student = loadStudents().find(function (s) { return s.id === studentId; });
    if (!assign || !student) return;

    const stSubs = getStudentSubmissions(assign.id, student.id);
    const eff = pickEffectiveSubmission(stSubs, assign.scorePolicy || "highest");

    const dispatchSingle = function (studentList) {
      const st = studentList[0];
      if (!st) return;
      if (eff) {
        const subIdMap = {};
        subIdMap[st.id] = eff.id;
        return sendParentEmailBatch({
          assign: assign,
          type: "result_report",
          silent: false,
          subIdMap: subIdMap,
          recipients: [{
            studentId: st.id,
            studentName: st.fullName,
            className: st.className || "",
            to: getStudentParentEmail(st),
            score10: eff.score10,
            durationSec: eff.durationSec,
            feedback: computeDynamicFeedback(eff.score10),
            receiptUrl: buildReceiptUrl(eff.id)
          }]
        });
      }
      return sendParentEmailBatch({
        assign: assign,
        type: "deadline_reminder",
        silent: false,
        recipients: [{
          studentId: st.id,
          studentName: st.fullName,
          className: st.className || "",
          to: getStudentParentEmail(st)
        }]
      });
    };

    const em = getStudentParentEmail(student);
    if (!em || !isValidEmailList(em)) {
      openMissingParentEmailModal({
        assign: assign,
        missingStudents: [student],
        readyStudents: [],
        onConfirm: dispatchSingle
      });
      return;
    }
    return dispatchSingle([student]);
  }

  /* ======================== REMEDIAL / REDEMPTION ASSIGNMENT ======================== */
  function createRemedialFromSubmission(subId) {
    const sub = loadSubmissions().find(function (s) { return s.id === subId; });
    if (!sub) return;
    const st = loadStudents().find(function (s) { return s.id === sub.studentId; });
    const wrongQs = (sub.records || []).filter(function (r) { return !r.ok && r.q; }).map(function (r) { return r.q; });
    if (!wrongQs.length) {
      U().showToast("Học sinh đã làm đúng toàn bộ bài này, không cần bài bổ trợ.", "info");
      return;
    }
    const remQuiz = {
      id: "qz_rem_" + Date.now(),
      title: "Bổ trợ: " + (sub.quizTitle || "Bài tập") + (st ? " – " + st.fullName : ""),
      tag: "Bổ trợ",
      isPublic: false,
      questions: wrongQs,
      updatedAt: new Date().toISOString()
    };
    const qzs = U().loadArr(U().KEYS.quizzes) || [];
    qzs.unshift(remQuiz);
    U().saveJSON(U().KEYS.quizzes, qzs);
    openAssignmentModal({
      quizId: remQuiz.id,
      title: remQuiz.title,
      targetStudentIds: [sub.studentId],
      note: "Bài tập bổ trợ gồm các câu bạn làm chưa đúng ở bài trước. Hãy ôn kỹ và hoàn thành nhé!",
      isRemedial: true
    });
  }

  /* ======================== EXPORTS: EXCEL, GRADEBOOK PDF, A4 WORKSHEET + QR ======================== */
  function exportGradebookExcel(assignId) {
    const assign = loadAssignments().find(function (a) { return a.id === assignId; });
    if (!assign) return;
    const roster = getAssignedStudentsFor(assign);
    const allSubs = loadSubmissions().filter(function (s) { return s.assignmentId === assign.id; });
    const rows = [
      ["Student Name", "Class", "Status", "Score (10)", "Correct/Total", "Duration", "Tab Switches", "Parent Email", "Parent Read Receipt"]
    ];
    roster.forEach(function (st) {
      const eff = pickEffectiveSubmission(allSubs.filter(function (s) { return s.studentId === st.id; }), assign.scorePolicy);
      rows.push([
        st.fullName,
        st.className || "",
        eff ? "Submitted" : "Pending",
        eff ? Number(eff.score10).toFixed(1) : "",
        eff ? (eff.correctCount + "/" + eff.totalQuestions) : "",
        eff ? fmtDuration(eff.durationSec) : "",
        eff ? eff.tabSwitches : "",
        st.parentEmail || "",
        eff && eff.parentReadAt ? fmtDeadlineParts(eff.parentReadAt).full : ""
      ]);
    });
    const safeName = U().fileSafe(assign.title || "gradebook");
    if (typeof XLSX !== "undefined") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Gradebook");
      XLSX.writeFile(wb, safeName + "_gradebook.xlsx");
    } else {
      const csv = "\uFEFF" + rows.map(function (r) {
        return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
      }).join("\n");
      U().downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), safeName + "_gradebook.csv");
    }
    U().showToast("Đã xuất file bảng điểm thành công.", "success");
  }

  function exportGradebookPdf(assignId) {
    const assign = loadAssignments().find(function (a) { return a.id === assignId; });
    if (!assign) return;
    const sheet = U().$("printSheet");
    if (!sheet) return;
    const roster = getAssignedStudentsFor(assign);
    const allSubs = loadSubmissions().filter(function (s) { return s.assignmentId === assign.id; });
    const rowsHtml = roster.map(function (st, i) {
      const eff = pickEffectiveSubmission(allSubs.filter(function (s) { return s.studentId === st.id; }), assign.scorePolicy);
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(st.fullName) + '</td><td>' + esc(st.className || "") + '</td>' +
        '<td>' + (eff ? tr("Đã nộp") : tr("Chưa nộp")) + '</td>' +
        '<td><strong>' + (eff ? Number(eff.score10).toFixed(1) + "/10" : "—") + '</strong></td>' +
        '<td>' + (eff ? fmtDuration(eff.durationSec) : "—") + '</td>' +
        '<td>' + (eff ? eff.tabSwitches : "—") + '</td>' +
        '<td>' + (eff && eff.parentReadAt ? "✓ " + tr("Đã xem") : "—") + '</td></tr>';
    }).join("");
    sheet.innerHTML =
      '<div class="print-doc">' +
        '<div class="print-head"><h1>' + esc(tr("Báo cáo Bảng điểm")) + ': ' + esc(assign.title) + '</h1>' +
        '<p>' + esc(tr("Mã bài")) + ': ' + esc(assign.code) + ' · ' + esc(tr("Hạn nộp")) + ': ' + esc(fmtDeadlineParts(assign.deadline).full) + '</p></div>' +
        '<table class="print-table"><thead><tr><th>#</th><th>' + esc(tr("Họ và tên")) + '</th><th>' + esc(tr("Lớp")) + '</th><th>' + esc(tr("Trạng thái")) + '</th><th>' + esc(tr("Điểm")) + '</th><th>' + esc(tr("Thời lượng")) + '</th><th>' + esc(tr("Chuyển tab")) + '</th><th>' + esc(tr("Phụ huynh xác nhận")) + '</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
      '</div>';
    window.print();
  }

  function exportWorksheetA4Pdf(assignId) {
    const assign = loadAssignments().find(function (a) { return a.id === assignId; });
    if (!assign || !assign.quizSnapshot) return;
    const sheet = U().$("printSheet");
    if (!sheet) return;
    const qs = assign.quizSnapshot.questions || [];
    const url = buildAssignmentUrl(assign.code);
    const qrSvg = generateQrSvg(url, 96);
    const letters = U().LETTERS || ["A", "B", "C", "D", "E"];

    const qHtml = qs.map(function (q, i) {
      const opts = (q.options || []).map(function (o, oi) {
        return '<div class="ws-opt"><strong>' + letters[oi] + '.</strong> ' + U().renderRich(o) + '</div>';
      }).join("");
      return '<div class="ws-q"><div class="ws-q-txt"><strong>' + esc(tr("Câu")) + ' ' + (i + 1) + '.</strong> ' + U().renderRich(q.text) + '</div><div class="ws-opts">' + opts + '</div></div>';
    }).join("");

    const ansHtml = qs.map(function (q, i) {
      const corr = (q.correct || []).map(function (c) { return letters[c] || String(c + 1); }).join(", ");
      return '<div class="ws-ans-item"><strong>' + (i + 1) + '.</strong> ' + esc(corr) + '</div>';
    }).join("");

    sheet.innerHTML =
      '<div class="print-doc">' +
        '<div class="ws-header">' +
          '<div>' +
            '<h1 style="margin:0 0 4px;font-size:16pt">' + esc(assign.title) + '</h1>' +
            '<p style="margin:0;font-size:10pt;color:#475569">' + esc(tr("Họ và tên")) + ': _______________________ &nbsp;&nbsp; ' + esc(tr("Lớp")) + ': __________ &nbsp;&nbsp; ' + esc(tr("Mã bài")) + ': <strong>' + esc(assign.code) + '</strong></p>' +
            (assign.teacherNote ? '<p style="margin:6px 0 0;font-size:9.5pt;color:#334155"><em>' + esc(assign.teacherNote) + '</em></p>' : '') +
          '</div>' +
          '<div class="ws-qr">' +
            qrSvg +
            '<div style="font-size:7.5pt;color:#475569;margin-top:2px">' + esc(tr("Quét làm bài online")) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ws-body">' + qHtml + '</div>' +
        '<div class="ws-key-page" style="page-break-before:always">' +
          '<h2 style="margin:0 0 12px">' + esc(tr("Bảng Đáp án")) + ' – ' + esc(assign.title) + '</h2>' +
          '<div class="ws-ans-grid">' + ansHtml + '</div>' +
        '</div>' +
      '</div>';
    setTimeout(function () { window.print(); }, 120);
  }

  /* ======================== STUDENT POST-SUBMISSION A4 WORKSHEET + PDF + QR ======================== */
  function normalizeQType(q) {
    const raw = String((q && (q.qType || q.type)) || "MCQ").toUpperCase();
    if (raw === "TF_GROUP" || raw === "TRUE_FALSE_GROUP") return "TF_GROUP";
    if (raw === "SHORT_ANSWER" || raw === "SHORT") return "SHORT_ANSWER";
    if (raw === "ORDERING" || raw === "ORDER") return "ORDERING";
    if (raw === "ESSAY" || raw === "FREE_TEXT") return "ESSAY";
    return "MCQ";
  }

  function buildStudentA4SheetHtml(assign, sub, student) {
    const now = Date.now();
    const deadMs = assign && assign.deadline ? new Date(assign.deadline).getTime() : 0;
    const canReveal = !assign || assign.revealMode === "immediate" || (deadMs && now > deadMs);
    const letters = (U() && U().LETTERS) || ["A", "B", "C", "D", "E", "F"];
    const askedSet = new Set((sub && sub.askTeacherIds) || []);
    const reviewUrl = buildSubmissionReviewUrl(assign ? assign.code : "", sub ? sub.id : "");
    const qrSvg = generateQrSvg(reviewUrl, 102);
    const stuName = (student && student.fullName) || tr("Học sinh");
    const stuClass = (student && student.className) || "";
    const stuSchool = (student && student.school) || "";
    const subTimeStr = fmtDeadlineParts(sub.submittedAt).full || "";
    const durStr = fmtDuration(sub.durationSec);
    const scoreStr = Number(sub.score10 || 0).toFixed(1) + " / 10";
    const correctStr = (sub.correctCount || 0) + " / " + (sub.totalQuestions || (sub.records ? sub.records.length : 0));
    const tabStr = String(sub.tabSwitches || 0);
    const renderRich = (U() && typeof U().renderRich === "function") ? U().renderRich : esc;

    let lastCtx = "";
    let lastInstr = "";
    const qCardsHtml = (sub.records || []).map(function (r, idx) {
      const q = r.q || {};
      const qType = normalizeQType(q);
      const isAsked = askedSet.has(r.qId || q.id);
      const pickedArr = Array.isArray(r.picked) ? r.picked : [];
      const corrArr = Array.isArray(q.correct) ? q.correct : [];

      let sharedHtml = "";
      const instrTxt = String(q.instruction || "").trim();
      const ctxTxt = String(q.context || "").trim();
      if (instrTxt && instrTxt !== lastInstr) {
        lastInstr = instrTxt;
        sharedHtml += '<div class="a4-instr-box"><strong>' + esc(tr("Yêu cầu nhóm câu")) + ':</strong> ' + renderRich(instrTxt) + '</div>';
      }
      if (ctxTxt && ctxTxt !== lastCtx) {
        lastCtx = ctxTxt;
        sharedHtml += '<div class="a4-ctx-box"><div class="a4-ctx-label">' + esc(tr("Đoạn văn / Ngữ liệu dùng chung")) + '</div><div class="rich-text">' + renderRich(ctxTxt) + '</div></div>';
      }

      let bodyHtml = "";
      let studentAnsTxt = "";
      let correctAnsTxt = "";

      if (qType === "TF_GROUP") {
        const stmts = Array.isArray(q.statements) && q.statements.length ? q.statements : (q.options || []);
        const subLetters = ["a", "b", "c", "d", "e", "f"];
        bodyHtml = '<div class="a4-opts">' + stmts.map(function (st, si) {
          const text = typeof st === "string" ? st : (st.text || "");
          const isT = typeof st === "object" && st !== null ? !!st.answer : (corrArr.indexOf(si) !== -1);
          return '<div class="a4-opt"><strong>' + (subLetters[si] || (si + 1)) + ')</strong> ' + renderRich(text) +
            (canReveal ? (' <span class="a4-tf-ans">[' + (isT ? tr("Đúng") : tr("Sai")) + ']</span>') : '') + '</div>';
        }).join("") + '</div>';
        studentAnsTxt = r.userAnswerText || (pickedArr.length ? pickedArr.map(function (c) { return subLetters[c] || String(c + 1); }).join(", ") : tr("Chưa trả lời"));
        correctAnsTxt = stmts.map(function (st, si) {
          const isT = typeof st === "object" && st !== null ? !!st.answer : (corrArr.indexOf(si) !== -1);
          return (subLetters[si] || (si + 1)) + ":" + (isT ? "Đ" : "S");
        }).join(", ");
      } else if (qType === "SHORT_ANSWER") {
        studentAnsTxt = String(r.userAnswerText != null ? r.userAnswerText : (pickedArr.length ? pickedArr.join(", ") : "")).trim() || tr("Chưa trả lời");
        correctAnsTxt = String(q.answerText || (Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.join(" / ") : "") || (q.options && q.options[0]) || "—");
      } else if (qType === "ORDERING") {
        const items = Array.isArray(q.items) && q.items.length ? q.items : (q.options || []);
        bodyHtml = '<div class="a4-opts">' + items.map(function (it, ii) {
          return '<div class="a4-opt"><strong>' + (ii + 1) + '.</strong> ' + renderRich(typeof it === "string" ? it : (it.text || "")) + '</div>';
        }).join("") + '</div>';
        studentAnsTxt = String(r.userAnswerText || (pickedArr.length ? pickedArr.map(function (x) { return Number(x) + 1; }).join(" → ") : "")).trim() || tr("Chưa trả lời");
        correctAnsTxt = String(q.correctOrderText || (Array.isArray(q.correctOrder) ? q.correctOrder.join(" → ") : "") || "—");
      } else if (qType === "ESSAY") {
        studentAnsTxt = String(r.userAnswerText || "").trim() || tr("Chưa trả lời");
        correctAnsTxt = String(q.rubric || q.answerText || q.explanation || tr("Tự luận (giáo viên chấm)"));
      } else {
        // MCQ (single / multiple)
        const opts = Array.isArray(q.options) ? q.options : [];
        bodyHtml = '<div class="a4-opts">' + opts.map(function (o, oi) {
          const isPicked = pickedArr.indexOf(oi) !== -1;
          const isCorr = canReveal && corrArr.indexOf(oi) !== -1;
          const cls = "a4-opt" + (isCorr ? " is-correct" : "") + (isPicked && !isCorr && canReveal ? " is-wrong" : "") + (isPicked ? " is-picked" : "");
          return '<div class="' + cls + '"><strong>' + (letters[oi] || String(oi + 1)) + '.</strong> ' + renderRich(o) +
            (isPicked ? (' <span class="a4-tag-pick">(' + esc(tr("Bạn chọn")) + ')</span>') : '') +
            (isCorr ? (' <span class="a4-tag-ok">✓</span>') : '') +
          '</div>';
        }).join("") + '</div>';
        studentAnsTxt = pickedArr.length ? pickedArr.map(function (c) { return letters[c] || String(c + 1); }).join(", ") : tr("Chưa trả lời");
        correctAnsTxt = corrArr.length ? corrArr.map(function (c) { return letters[c] || String(c + 1); }).join(", ") : "—";
      }

      const statusBadge = canReveal
        ? (r.ok
          ? '<span class="a4-badge a4-badge-ok">✓ ' + esc(tr("Đúng")) + '</span>'
          : '<span class="a4-badge a4-badge-bad">✗ ' + esc(tr("Sai")) + '</span>')
        : '<span class="a4-badge a4-badge-neutral">' + esc(tr("Đã nộp")) + '</span>';

      const askedBadge = isAsked
        ? ' <span class="a4-badge a4-badge-flag">⚑ ' + esc(tr("Cần hỏi giáo viên")) + '</span>'
        : '';

      return sharedHtml +
        '<div class="a4-q-card">' +
          '<div class="a4-q-head">' +
            '<span class="a4-q-num">' + esc(tr("Câu")) + ' ' + (idx + 1) + (qType !== "MCQ" ? (' <span class="a4-q-type">[' + esc(qType) + ']</span>') : '') + '</span>' +
            '<span class="a4-q-badges">' + statusBadge + askedBadge + '</span>' +
          '</div>' +
          '<div class="a4-q-stem rich-text">' + renderRich(q.text || "") + '</div>' +
          (q.image ? '<div class="a4-q-img"><img src="' + esc(q.image) + '" alt="Question"></div>' : '') +
          bodyHtml +
          '<div class="a4-ans-summary">' +
            '<span>' + esc(tr("Bài làm của bạn")) + ': <strong>' + esc(studentAnsTxt) + '</strong></span>' +
            (canReveal ? ('<span> · ' + esc(tr("Đáp án đúng")) + ': <strong>' + esc(correctAnsTxt) + '</strong></span>') : '') +
          '</div>' +
          (canReveal && q.explanation
            ? '<div class="a4-explain"><strong>' + esc(tr("Lời giải / Giải thích")) + ':</strong> <span class="rich-text">' + renderRich(q.explanation) + '</span></div>'
            : '') +
        '</div>';
    }).join("");

    return '<div class="print-doc a4-sheet" id="a4ResultSheet">' +
      '<div class="a4-header">' +
        '<div class="a4-header-info">' +
          '<div class="a4-brand-line">AI TUTOR · ' + esc(tr("PHIẾU KẾT QUẢ & ÔN TẬP A4")) + (stuSchool ? (' · ' + esc(stuSchool)) : '') + '</div>' +
          '<h1 class="a4-title">' + esc(assign ? assign.title : (sub.quizTitle || tr("Bài tập"))) + '</h1>' +
          '<div class="a4-meta-grid">' +
            '<div><span class="a4-meta-k">' + esc(tr("Học sinh")) + ':</span> <strong>' + esc(stuName) + '</strong>' + (stuClass ? (' (' + esc(stuClass) + ')') : '') + '</div>' +
            '<div><span class="a4-meta-k">' + esc(tr("Thời điểm nộp")) + ':</span> <strong>' + esc(subTimeStr) + '</strong></div>' +
            '<div><span class="a4-meta-k">' + esc(tr("Thời gian làm")) + ':</span> <strong>' + esc(durStr) + '</strong></div>' +
            '<div><span class="a4-meta-k">' + esc(tr("Mã bài")) + ':</span> <strong>' + esc(assign ? assign.code : "") + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="a4-qr-box">' +
          '<div class="a4-qr-svg">' + qrSvg + '</div>' +
          '<div class="a4-qr-caption">' + esc(tr("Quét mã QR để xem lại đề & bài làm chi tiết trực tuyến")) + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="a4-kpi-grid">' +
        '<div class="a4-kpi"><div class="a4-kpi-k">' + esc(tr("Điểm số")) + '</div><div class="a4-kpi-v">' + esc(scoreStr) + '</div></div>' +
        '<div class="a4-kpi"><div class="a4-kpi-k">' + esc(tr("Số câu đúng")) + '</div><div class="a4-kpi-v">' + esc(correctStr) + '</div></div>' +
        '<div class="a4-kpi"><div class="a4-kpi-k">' + esc(tr("Thời gian làm")) + '</div><div class="a4-kpi-v">' + esc(durStr) + '</div></div>' +
        '<div class="a4-kpi"><div class="a4-kpi-k">' + esc(tr("Chuyển tab")) + '</div><div class="a4-kpi-v">' + esc(tabStr) + '</div></div>' +
      '</div>' +

      (!canReveal
        ? '<div class="a4-lock-note">' + esc(tr("Đáp án chính thức sẽ được mở khóa sau hạn nộp")) + ' (' + esc(fmtDeadlineParts(assign.deadline).full) + ').</div>'
        : '') +

      '<div class="a4-body">' + qCardsHtml + '</div>' +

      '<div class="a4-footer">' +
        '<span>AI Tutor · Creator Studio</span>' +
        '<span class="a4-footer-url">' + esc(reviewUrl) + '</span>' +
      '</div>' +
    '</div>';
  }

  function getSubContextById(subId) {
    const sub = loadSubmissions().find(function (s) { return s.id === subId; });
    if (!sub) return null;
    const assign = loadAssignments().find(function (a) { return a.id === sub.assignmentId; }) || {
      id: sub.assignmentId,
      code: lmsState.activeAssignCode || "",
      title: sub.quizTitle || tr("Bài tập"),
      revealMode: "immediate"
    };
    const student = loadStudents().find(function (st) { return st.id === sub.studentId; }) || null;
    return { sub: sub, assign: assign, student: student };
  }

  function buildStudentPdfFilename(assign, student) {
    const safe = (U() && typeof U().fileSafe === "function")
      ? U().fileSafe
      : function (s) { return String(s || "file").replace(/[^\w\-]+/g, "_"); };
    const stPart = safe((student && student.fullName) || "Student");
    const exPart = safe((assign && assign.title) || "Exam");
    return stPart + "_" + exPart + "_A4_QR.pdf";
  }

  function printStudentA4Sheet(subId) {
    const ctx = getSubContextById(subId);
    if (!ctx) return;
    const sheet = U().$("printSheet");
    if (!sheet) return;
    sheet.innerHTML = buildStudentA4SheetHtml(ctx.assign, ctx.sub, ctx.student);
    const prevTitle = document.title;
    const pdfBase = buildStudentPdfFilename(ctx.assign, ctx.student).replace(/\.pdf$/i, "");
    document.title = pdfBase;
    setTimeout(function () {
      window.print();
      setTimeout(function () { document.title = prevTitle; }, 600);
    }, 100);
  }

  function loadHtml2PdfLib() {
    if (typeof window.html2pdf === "function") return Promise.resolve(window.html2pdf);
    return new Promise(function (resolve, reject) {
      const existing = document.getElementById("uetHtml2PdfScript");
      if (existing) {
        existing.addEventListener("load", function () { resolve(window.html2pdf); });
        existing.addEventListener("error", function () { reject(new Error("html2pdf load failed")); });
        return;
      }
      const sc = document.createElement("script");
      sc.id = "uetHtml2PdfScript";
      sc.src = "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";
      sc.async = true;
      sc.onload = function () {
        if (typeof window.html2pdf === "function") resolve(window.html2pdf);
        else reject(new Error("html2pdf unavailable"));
      };
      sc.onerror = function () { reject(new Error("html2pdf load failed")); };
      document.head.appendChild(sc);
    });
  }

  async function exportStudentA4Pdf(subId) {
    const ctx = getSubContextById(subId);
    if (!ctx) return;
    const filename = buildStudentPdfFilename(ctx.assign, ctx.student);
    const sheetHtml = buildStudentA4SheetHtml(ctx.assign, ctx.sub, ctx.student);
    U().showToast(tr("Đang tạo file PDF A4 kèm mã QR..."), "info");
    try {
      const h2p = await loadHtml2PdfLib();
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:fixed;left:-99999px;top:0;width:210mm;background:#ffffff;color:#0f172a;padding:12mm;box-sizing:border-box;z-index:-1;";
      wrap.innerHTML = sheetHtml;
      document.body.appendChild(wrap);
      const targetEl = wrap.firstElementChild || wrap;
      await h2p().set({
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      }).from(targetEl).save();
      document.body.removeChild(wrap);
      U().showToast(tr("Đã tải xuống phiếu A4 PDF: ") + filename, "success");
    } catch (err) {
      // Offline / CDN fallback: crisp native browser Print-to-PDF with exact filename in document.title
      U().showToast(tr("Đang mở hộp thoại In / Lưu PDF A4 của trình duyệt..."), "info");
      printStudentA4Sheet(subId);
    }
  }

  function openStudentA4PreviewModal(subId) {
    const ctx = getSubContextById(subId);
    if (!ctx) return;
    const host = U().$("extraModals");
    if (!host) { printStudentA4Sheet(subId); return; }
    const reviewUrl = buildSubmissionReviewUrl(ctx.assign.code, ctx.sub.id);
    const sheetHtml = buildStudentA4SheetHtml(ctx.assign, ctx.sub, ctx.student);

    host.innerHTML =
      '<div class="modal-overlay a4-preview-overlay" id="lmsA4PreviewModal" role="dialog" aria-modal="true">' +
        '<div class="a4-preview-dialog">' +
          '<div class="a4-preview-toolbar no-print">' +
            '<div>' +
              '<strong>' + esc(tr("Xem trước phiếu kết quả A4 + Mã QR")) + '</strong>' +
              '<div class="muted" style="font-size:.76rem">' + esc(buildStudentPdfFilename(ctx.assign, ctx.student)) + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
              '<button type="button" class="btn btn-outline btn-sm" id="a4CopyLinkBtn">🔗 ' + esc(tr("Sao chép link QR")) + '</button>' +
              '<button type="button" class="btn btn-outline btn-sm" id="a4PrintBtn">🖨️ ' + esc(tr("In phiếu A4")) + '</button>' +
              '<button type="button" class="btn btn-primary btn-sm" id="a4DownloadPdfBtn">📄 ' + esc(tr("Tải PDF + QR")) + '</button>' +
              '<button type="button" class="btn btn-outline btn-sm" id="a4CloseBtn">✕ ' + esc(tr("Đóng")) + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="a4-preview-canvas">' +
            '<div class="a4-paper-frame">' + sheetHtml + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    U().on("a4CopyLinkBtn", "click", function () { U().copyText(reviewUrl, tr("liên kết xem lại bài làm")); });
    U().on("a4PrintBtn", "click", function () { printStudentA4Sheet(subId); });
    U().on("a4DownloadPdfBtn", "click", function () { exportStudentA4Pdf(subId); });
    U().on("a4CloseBtn", "click", function () { host.innerHTML = ""; });
  }

  /* ======================== STUDENT ASSIGNMENT ENTRY & EXAM RUNNER ======================== */
  function openStudentAssignment(code, opts) {
    lmsState.activeAssignCode = String(code || "").trim().toUpperCase();
    lmsState.studentSession = null;
    lmsState.lastSubmissionId = null;

    if (opts && (opts.attemptId || opts.review)) {
      const assign = loadAssignments().find(function (a) { return a.code === lmsState.activeAssignCode; });
      const allSubs = loadSubmissions();
      if (opts.attemptId) {
        const found = allSubs.find(function (s) { return s.id === opts.attemptId; });
        if (found) lmsState.lastSubmissionId = found.id;
      } else if (opts.review && assign) {
        const assignSubs = allSubs.filter(function (s) { return s.assignmentId === assign.id; });
        if (assignSubs.length) lmsState.lastSubmissionId = assignSubs[assignSubs.length - 1].id;
      }
    }

    if (window.UETStudio && typeof window.UETStudio.openLmsScreen === "function") {
      window.UETStudio.openLmsScreen("student-assign");
    }
  }

  function openParentReceipt(subId) {
    lmsState.activeReceiptId = subId;
    if (window.UETStudio && typeof window.UETStudio.openLmsScreen === "function") {
      window.UETStudio.openLmsScreen("parent-receipt");
    }
  }

  function renderStudentAssignmentView(root) {
    const assign = loadAssignments().find(function (a) { return a.code === lmsState.activeAssignCode; });
    if (!assign) {
      root.innerHTML = '<div class="ql-wrap"><div class="ql-card"><div class="ql-section" style="text-align:center;padding:36px 24px">' +
        '<h3>Không tìm thấy bài tập</h3>' +
        '<p class="muted">Mã bài tập không tồn tại hoặc đã bị giáo viên xóa.</p>' +
        '<button type="button" class="btn btn-outline btn-sm" data-lms-nav="assignments">Quay lại</button>' +
      '</div></div></div>';
      return;
    }

    if (lmsState.studentSession && lmsState.studentSession.assignId === assign.id) {
      renderStudentExamActive(root, assign);
      return;
    }
    if (lmsState.lastSubmissionId) {
      renderStudentPostQuizReview(root, assign, lmsState.lastSubmissionId);
      return;
    }

    const status = getAssignmentStatus(assign);
    const dl = fmtDeadlineParts(assign.deadline);
    const op = fmtDeadlineParts(assign.openAt);
    const roster = getAssignedStudentsFor(assign);

    // Post-Deadline Auto-Lock Screen
    if (status === "closed") {
      const lang = U().getLang ? U().getLang() : "vi";
      const closedMsg = lang === "en"
        ? ("This assignment closed at " + dl.hhmm + " on " + dl.ddmmyyyy + ". You can no longer take this assignment.")
        : (lang === "ja"
          ? ("この課題は " + dl.ddmmyyyy + " " + dl.hhmm + " に締め切られました。これ以上回答することはできません。")
          : ("Bài tập này đã đóng vào lúc " + dl.hhmm + " ngày " + dl.ddmmyyyy + ". Bạn không thể thực hiện bài làm này nữa."));
      root.innerHTML = '<div class="ql-wrap"><div class="ql-card">' +
        '<div class="ql-section" style="text-align:center;padding:40px 24px">' +
          '<div class="lms-lock-circle">' + ICONS.lock + '</div>' +
          '<h2 class="ql-title" style="margin-top:12px">' + esc(assign.title) + '</h2>' +
          '<p class="muted" style="max-width:460px;margin:10px auto 18px">' + esc(closedMsg) + '</p>' +
          '<button type="button" class="btn btn-outline btn-sm" data-lms-nav="assignments">Quay lại Creator Studio</button>' +
        '</div>' +
      '</div></div>';
      return;
    }

    if (status === "upcoming") {
      root.innerHTML = '<div class="ql-wrap"><div class="ql-card">' +
        '<div class="ql-section" style="text-align:center;padding:40px 24px">' +
          '<div class="lms-lock-circle">' + ICONS.clock + '</div>' +
          '<h2 class="ql-title" style="margin-top:12px">' + esc(assign.title) + '</h2>' +
          '<p class="muted">Bài tập sẽ mở vào lúc ' + esc(op.full) + '.</p>' +
          '<button type="button" class="btn btn-outline btn-sm" data-lms-nav="assignments">Quay lại</button>' +
        '</div>' +
      '</div></div>';
      return;
    }

    root.innerHTML = '<div class="ql-wrap"><div class="ql-card">' +
      '<div class="ql-header">' +
        '<div>' +
          '<h2 class="ql-title">' + esc(assign.title) + '</h2>' +
          '<p class="ql-subtitle"><span>' + (assign.quizSnapshot.questions.length) + ' câu hỏi</span><span>·</span><span>Hạn nộp: ' + esc(dl.full) + '</span></p>' +
        '</div>' +
        '<button type="button" class="ql-back-btn" data-lms-nav="assignments">' + ICONS.arrowLeft + '<span>Quay lại</span></button>' +
      '</div>' +

      (assign.teacherNote
        ? '<div class="ql-section"><span class="ql-section-label">Ghi chú từ giáo viên</span><div class="lms-note-box">' + esc(assign.teacherNote) + '</div></div>'
        : '') +

      '<div class="ql-section">' +
        '<span class="ql-section-label">Xác thực học sinh</span>' +
        '<div class="ql-grid-2 ql-grid-top">' +
          '<div class="ql-field">' +
            '<div class="ql-field-head"><label class="ql-field-label" for="lmsEntryStudent">Chọn họ và tên của bạn</label></div>' +
            '<select class="ql-select" id="lmsEntryStudent">' +
              '<option value="">-- Chọn tên từ danh sách --</option>' +
              roster.map(function (s) {
                return '<option value="' + esc(s.id) + '">' + esc(s.fullName) + ' (' + esc(s.className || "") + ')</option>';
              }).join("") +
            '</select>' +
          '</div>' +
          '<div class="ql-field">' +
            '<div class="ql-field-head"><label class="ql-field-label" for="lmsEntryPin">Mã PIN 4 số</label></div>' +
            '<input type="password" inputmode="numeric" maxlength="4" class="ql-input" id="lmsEntryPin" placeholder="••••">' +
          '</div>' +
        '</div>' +
        '<p class="ql-helper">' +
          (assign.maxAttempts === 0 ? "Không giới hạn số lần làm bài trước hạn nộp." : ("Số lần làm tối đa: " + assign.maxAttempts + ".")) + ' ' +
          (assign.durationMinutes > 0 ? ("Thời gian làm bài: " + assign.durationMinutes + " phút.") : "Không giới hạn thời gian.") +
        '</p>' +
      '</div>' +

      '<div class="ql-footer">' +
        '<button type="button" class="ql-cta-btn" data-lms="start-student-exam" data-id="' + esc(assign.id) + '">Bắt đầu làm bài</button>' +
      '</div>' +
    '</div></div>';
  }

  function startStudentExam(assignId) {
    const assign = loadAssignments().find(function (a) { return a.id === assignId; });
    if (!assign) return;
    if (getAssignmentStatus(assign) === "closed") { refreshStudio(); return; }
    const stId = U().$("lmsEntryStudent") ? U().$("lmsEntryStudent").value : "";
    const pin = U().$("lmsEntryPin") ? U().$("lmsEntryPin").value.trim() : "";
    if (!stId) { U().showToast("Vui lòng chọn tên của bạn trong danh sách.", "warning"); return; }
    const student = loadStudents().find(function (s) { return s.id === stId; });
    if (!student || student.pin !== pin) {
      U().showToast("Mã PIN 4 số không chính xác. Vui lòng thử lại.", "error");
      return;
    }

    const prevSubs = getStudentSubmissions(assign.id, student.id);
    if (assign.maxAttempts > 0 && prevSubs.length >= assign.maxAttempts) {
      U().showToast("Bạn đã hết lượt làm bài cho bài tập này.", "warning");
      lmsState.lastSubmissionId = prevSubs[prevSubs.length - 1].id;
      refreshStudio();
      return;
    }

    // Check for auto-saved draft (Auto-Save & Resume on F5 / drop)
    const draftKey = assign.id + "__" + student.id;
    const drafts = loadDrafts();
    let sess = drafts[draftKey];
    if (sess && Array.isArray(sess.questions) && sess.questions.length) {
      U().showToast("Đã khôi phục bài làm đang dang dở của bạn.", "info");
    } else {
      let qs = (assign.quizSnapshot.questions || []).map(function (q) {
        let opts = q.options.slice();
        let corr = q.correct.slice();
        if (assign.shuffleO) {
          const paired = opts.map(function (o, idx) { return { o: o, ok: corr.indexOf(idx) !== -1 }; });
          const sh = U().shuffleArray(paired);
          opts = sh.map(function (x) { return x.o; });
          corr = [];
          sh.forEach(function (x, i) { if (x.ok) corr.push(i); });
        }
        return Object.assign({}, q, { options: opts, correct: corr });
      });
      if (assign.shuffleQ) qs = U().shuffleArray(qs);
      const totalSec = assign.durationMinutes > 0 ? assign.durationMinutes * 60 : 0;
      sess = {
        assignId: assign.id,
        studentId: student.id,
        attemptNo: prevSubs.length + 1,
        questions: qs,
        answers: {},
        idx: 0,
        totalSec: totalSec,
        remainingSec: totalSec,
        startedAt: Date.now(),
        tabSwitches: 0
      };
      drafts[draftKey] = sess;
      saveDrafts(drafts);
    }

    lmsState.studentSession = sess;
    attachExamMonitors(assign);
    refreshStudio();
  }

  function persistStudentDraft() {
    const sess = lmsState.studentSession;
    if (!sess) return;
    const drafts = loadDrafts();
    drafts[sess.assignId + "__" + sess.studentId] = {
      assignId: sess.assignId,
      studentId: sess.studentId,
      attemptNo: sess.attemptNo,
      questions: sess.questions,
      answers: sess.answers,
      idx: sess.idx,
      totalSec: sess.totalSec,
      remainingSec: sess.remainingSec,
      startedAt: sess.startedAt,
      tabSwitches: sess.tabSwitches
    };
    saveDrafts(drafts);
  }

  function detachExamMonitors() {
    const sess = lmsState.studentSession;
    if (!sess) return;
    if (sess.timerId) { clearInterval(sess.timerId); sess.timerId = null; }
    if (sess.visHandler) { document.removeEventListener("visibilitychange", sess.visHandler); sess.visHandler = null; }
    if (sess.blurHandler) { window.removeEventListener("blur", sess.blurHandler); sess.blurHandler = null; }
  }

  function attachExamMonitors(assign) {
    detachExamMonitors();
    const sess = lmsState.studentSession;
    if (!sess) return;
    let lastSwitchTs = 0;
    const onSwitch = function () {
      const now = Date.now();
      if (now - lastSwitchTs < 1500) return;
      lastSwitchTs = now;
      sess.tabSwitches = (sess.tabSwitches || 0) + 1;
      persistStudentDraft();
      U().showToast("Hệ thống ghi nhận bạn vừa rời khỏi màn hình làm bài (" + sess.tabSwitches + " lần).", "warning");
      const badge = U().$("lmsTabWarnBadge");
      if (badge) { badge.textContent = String(sess.tabSwitches); badge.classList.remove("hidden"); }
    };
    sess.visHandler = function () { if (document.hidden) onSwitch(); };
    sess.blurHandler = function () { onSwitch(); };
    document.addEventListener("visibilitychange", sess.visHandler);
    window.addEventListener("blur", sess.blurHandler);

    if (sess.totalSec > 0) {
      sess.timerId = setInterval(function () {
        if (!lmsState.studentSession) { detachExamMonitors(); return; }
        sess.remainingSec = Math.max(0, sess.remainingSec - 1);
        persistStudentDraft();
        const el = U().$("lmsExamTimer");
        if (el) el.textContent = fmtDuration(sess.remainingSec);
        if (sess.remainingSec <= 0) {
          finishStudentExam(assign.id, true);
        }
      }, 1000);
    }
  }

  function renderStudentExamActive(root, assign) {
    const sess = lmsState.studentSession;
    const q = sess.questions[sess.idx];
    const picked = sess.answers[q.id] || [];
    const answeredCount = Object.keys(sess.answers).filter(function (k) { return (sess.answers[k] || []).length > 0; }).length;
    const letters = U().LETTERS || ["A", "B", "C", "D", "E"];

    root.innerHTML = '<div class="ql-wrap"><div class="ql-card">' +
      '<div class="ql-header">' +
        '<div>' +
          '<h2 class="ql-title">' + esc(assign.title) + '</h2>' +
          '<p class="ql-subtitle"><span>Câu ' + (sess.idx + 1) + ' / ' + sess.questions.length + '</span><span>·</span><span>Đã chọn ' + answeredCount + '/' + sess.questions.length + '</span>' +
            (sess.tabSwitches > 0 ? '<span>·</span><span class="lms-badge-warn">Chuyển tab: <span id="lmsTabWarnBadge">' + sess.tabSwitches + '</span></span>' : '<span id="lmsTabWarnBadge" class="hidden">0</span>') +
          '</p>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          (sess.totalSec > 0 ? '<span class="lms-timer-pill">' + ICONS.clock + ' <span id="lmsExamTimer">' + fmtDuration(sess.remainingSec) + '</span></span>' : '') +
          '<button type="button" class="btn btn-primary btn-sm" data-lms="submit-student-exam" data-id="' + esc(assign.id) + '">Nộp bài</button>' +
        '</div>' +
      '</div>' +

      '<div class="ql-section">' +
        '<div class="rich-text" style="font-size:1rem;font-weight:600;margin-bottom:14px">' + U().renderRich(q.text) + '</div>' +
        (q.image ? '<div class="q-image"><img src="' + esc(q.image) + '" alt="Question" style="max-width:100%;border-radius:8px;margin-bottom:12px"></div>' : '') +
        '<div class="lms-opt-list">' +
          q.options.map(function (opt, oi) {
            const active = picked.indexOf(oi) !== -1;
            return '<button type="button" class="lms-opt-btn' + (active ? " active" : "") + '" data-lms="pick-student-opt" data-opt="' + oi + '">' +
              '<span class="lms-opt-key">' + letters[oi] + '</span>' +
              '<span class="rich-text">' + U().renderRich(opt) + '</span>' +
            '</button>';
          }).join("") +
        '</div>' +
      '</div>' +

      '<div class="ql-footer" style="justify-content:space-between;flex-wrap:wrap;gap:10px">' +
        '<div style="display:flex;gap:8px">' +
          '<button type="button" class="btn btn-outline btn-sm" data-lms="nav-student-q" data-dir="-1"' + (sess.idx === 0 ? " disabled" : "") + '>Câu trước</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-lms="nav-student-q" data-dir="1"' + (sess.idx >= sess.questions.length - 1 ? " disabled" : "") + '>Câu tiếp</button>' +
        '</div>' +
        '<div class="lms-palette">' +
          sess.questions.map(function (item, i) {
            const done = (sess.answers[item.id] || []).length > 0;
            return '<button type="button" class="lms-pal-dot' + (i === sess.idx ? " current" : "") + (done ? " done" : "") + '" data-lms="jump-student-q" data-idx="' + i + '">' + (i + 1) + '</button>';
          }).join("") +
        '</div>' +
      '</div>' +
    '</div></div>';
  }

  function finishStudentExam(assignId, isTimeout) {
    const assign = loadAssignments().find(function (a) { return a.id === assignId; });
    const sess = lmsState.studentSession;
    if (!assign || !sess) return;
    detachExamMonitors();

    const records = sess.questions.map(function (q) {
      const picked = (sess.answers[q.id] || []).slice().sort(function (a, b) { return a - b; });
      const corr = (q.correct || []).slice().sort(function (a, b) { return a - b; });
      const ok = picked.length === corr.length && picked.every(function (v, i) { return v === corr[i]; });
      return { qId: q.id, q: q, picked: picked, ok: ok };
    });
    const correctCount = records.filter(function (r) { return r.ok; }).length;
    const total = records.length || 1;
    const score10 = Math.round((correctCount / total) * 100) / 10;
    const durationSec = Math.max(1, Math.round((Date.now() - sess.startedAt) / 1000));

    const student = loadStudents().find(function (s) { return s.id === sess.studentId; });
    const sub = {
      id: "sub_" + Date.now(),
      assignmentId: assign.id,
      quizTitle: assign.title,
      studentId: sess.studentId,
      attemptNo: sess.attemptNo,
      score10: score10,
      correctCount: correctCount,
      totalQuestions: total,
      durationSec: durationSec,
      tabSwitches: sess.tabSwitches || 0,
      records: records,
      askTeacherIds: [],
      submittedAt: new Date().toISOString(),
      parentEmailSentAt: "",
      parentReadAt: ""
    };

    if (student) {
      const mailRes = dispatchParentReportEmail(assign, student, sub);
      if (mailRes.sent) sub.parentEmailSentAt = new Date().toISOString();
    }

    const subs = loadSubmissions();
    subs.push(sub);
    saveSubmissions(subs);

    // Clear draft
    const drafts = loadDrafts();
    delete drafts[sess.assignId + "__" + sess.studentId];
    saveDrafts(drafts);

    lmsState.studentSession = null;
    lmsState.lastSubmissionId = sub.id;
    U().showToast(isTimeout ? "Đã hết giờ! Bài làm của bạn đã được nộp tự động." : "Đã nộp bài thành công!", "success");
    refreshStudio();
  }

  function renderStudentPostQuizReview(root, assign, subId) {
    const sub = loadSubmissions().find(function (s) { return s.id === subId; });
    if (!sub) { lmsState.lastSubmissionId = null; renderStudentAssignmentView(root); return; }
    const now = Date.now();
    const deadMs = assign.deadline ? new Date(assign.deadline).getTime() : 0;
    const canReveal = assign.revealMode === "immediate" || (deadMs && now > deadMs);
    const dl = fmtDeadlineParts(assign.deadline);
    const letters = U().LETTERS || ["A", "B", "C", "D", "E"];
    const askedSet = new Set(sub.askTeacherIds || []);

    root.innerHTML = '<div class="ql-wrap"><div class="ql-card">' +
      '<div class="ql-header" style="flex-wrap:wrap;gap:10px">' +
        '<div>' +
          '<h2 class="ql-title">Hoàn thành bài tập</h2>' +
          '<p class="ql-subtitle"><span>' + esc(assign.title) + '</span><span>·</span><span>' + fmtDuration(sub.durationSec) + '</span></p>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-outline btn-sm" data-lms="preview-sub-a4" data-sub="' + esc(sub.id) + '">🖨️ ' + esc(tr("Xem & In phiếu A4")) + '</button>' +
          '<button type="button" class="btn btn-primary btn-sm" data-lms="export-sub-pdf-qr" data-sub="' + esc(sub.id) + '">📄 ' + esc(tr("Xuất PDF + QR")) + '</button>' +
          '<button type="button" class="ql-back-btn" data-lms-nav="gradebook">' + ICONS.arrowLeft + '<span>Xem sổ điểm</span></button>' +
        '</div>' +
      '</div>' +

      '<div class="lms-kpi-row">' +
        '<div class="lms-kpi"><span class="lms-kpi-k">Điểm số</span><span class="lms-kpi-v">' + Number(sub.score10).toFixed(1) + ' / 10</span></div>' +
        '<div class="lms-kpi"><span class="lms-kpi-k">Số câu đúng</span><span class="lms-kpi-v">' + sub.correctCount + ' / ' + sub.totalQuestions + '</span></div>' +
        '<div class="lms-kpi"><span class="lms-kpi-k">Chuyển tab</span><span class="lms-kpi-v">' + sub.tabSwitches + '</span></div>' +
      '</div>' +

      '<div class="ql-section">' +
        (!canReveal
          ? '<div class="lms-empty">' + ICONS.lock + '<p style="margin:8px 0 0">Đáp án chi tiết sẽ được mở khóa sau khi hết hạn nộp bài của lớp (' + esc(dl.full) + ').</p></div>'
          : '<span class="ql-section-label">Xem lại chi tiết &amp; Đánh dấu câu cần hỏi giáo viên</span>' +
            (sub.records || []).map(function (r, idx) {
              const q = r.q;
              const isAsked = askedSet.has(r.qId);
              const corrTxt = (q.correct || []).map(function (c) { return letters[c]; }).join(", ");
              const pickTxt = (r.picked || []).length ? r.picked.map(function (c) { return letters[c]; }).join(", ") : "Chưa trả lời";
              return '<div class="lms-review-item ' + (r.ok ? "is-ok" : "is-bad") + '">' +
                '<div class="lms-review-top">' +
                  '<strong>Câu ' + (idx + 1) + ' · ' + (r.ok ? "Đúng" : "Sai") + '</strong>' +
                  '<button type="button" class="lms-ask-btn' + (isAsked ? " active" : "") + '" data-lms="toggle-ask-teacher" data-sub="' + esc(sub.id) + '" data-qid="' + esc(r.qId) + '">' +
                    ICONS.flag + ' <span>' + (isAsked ? "Đã đánh dấu hỏi giáo viên" : "Chưa hiểu câu này") + '</span>' +
                  '</button>' +
                '</div>' +
                '<div class="rich-text" style="margin:6px 0">' + U().renderRich(q.text) + '</div>' +
                '<div class="lms-cell-sub">Bạn chọn: <strong>' + esc(pickTxt) + '</strong> · Đáp án đúng: <strong>' + esc(corrTxt) + '</strong></div>' +
                (q.explanation ? '<div class="lms-explain-box rich-text">' + U().renderRich(q.explanation) + '</div>' : '') +
              '</div>';
            }).join("")) +
      '</div>' +
    '</div></div>';
  }

  /* ======================== PARENT READ RECEIPT VIEW ======================== */
  function renderParentReceiptView(root) {
    const sub = loadSubmissions().find(function (s) { return s.id === lmsState.activeReceiptId; });
    if (!sub) {
      root.innerHTML = '<div class="ql-wrap"><div class="ql-card"><div class="ql-section" style="text-align:center;padding:36px">' +
        '<h3>Không tìm thấy báo cáo kết quả</h3>' +
        '<button type="button" class="btn btn-outline btn-sm" data-lms-nav="gradebook">Quay lại</button>' +
      '</div></div></div>';
      return;
    }
    const assign = loadAssignments().find(function (a) { return a.id === sub.assignmentId; });
    const student = loadStudents().find(function (s) { return s.id === sub.studentId; });
    const feedback = computeDynamicFeedback(sub.score10);

    root.innerHTML = '<div class="ql-wrap"><div class="ql-card">' +
      '<div class="ql-header">' +
        '<div>' +
          '<h2 class="ql-title">Báo cáo Kết quả Học tập (Dành cho Phụ huynh)</h2>' +
          '<p class="ql-subtitle"><span>' + esc(student ? student.fullName : "") + '</span><span>·</span><span>' + esc(assign ? assign.title : sub.quizTitle) + '</span></p>' +
        '</div>' +
        '<button type="button" class="ql-back-btn" data-lms-nav="gradebook">' + ICONS.arrowLeft + '<span>Sổ điểm</span></button>' +
      '</div>' +

      '<div class="lms-kpi-row">' +
        '<div class="lms-kpi"><span class="lms-kpi-k">Điểm số</span><span class="lms-kpi-v">' + Number(sub.score10).toFixed(1) + ' / 10</span></div>' +
        '<div class="lms-kpi"><span class="lms-kpi-k">Thời gian hoàn thành</span><span class="lms-kpi-v">' + fmtDuration(sub.durationSec) + '</span></div>' +
        '<div class="lms-kpi"><span class="lms-kpi-k">Ngày nộp</span><span class="lms-kpi-v" style="font-size:.95rem">' + esc(fmtDeadlineParts(sub.submittedAt).full) + '</span></div>' +
      '</div>' +

      '<div class="ql-section">' +
        '<span class="ql-section-label">Nhận xét tự động từ giáo viên</span>' +
        '<div class="lms-note-box">' + esc(feedback) + '</div>' +
      '</div>' +

      '<div class="ql-footer" style="justify-content:space-between;flex-wrap:wrap;gap:10px">' +
        '<button type="button" class="btn btn-outline btn-sm" data-lms="view-sub" data-id="' + esc(sub.id) + '">Xem chi tiết bài làm</button>' +
        (sub.parentReadAt
          ? '<span class="lms-receipt-ok">' + ICONS.check + ' Đã xác nhận xem kết quả (' + esc(fmtDeadlineParts(sub.parentReadAt).full) + ')</span>'
          : '<button type="button" class="ql-cta-btn" data-lms="confirm-parent-read" data-id="' + esc(sub.id) + '">' + ICONS.check + '<span>Xác nhận đã xem kết quả của con</span></button>') +
      '</div>' +
    '</div></div>';
  }

  /* ======================== EVENT DELEGATION & HELPERS ======================== */
  function bindSearchInput(id, onInput) {
    const el = U().$(id);
    if (!el) return;
    el.addEventListener("input", function (e) { onInput(e.target.value); });
    el.focus();
    try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* */ }
  }

  function refreshStudio() {
    if (window.UETStudio && typeof window.UETStudio.render === "function") window.UETStudio.render();
  }

  function handleClick(e) {
    const navBtn = e.target.closest ? e.target.closest("[data-lms-nav]") : null;
    if (navBtn) {
      const target = navBtn.getAttribute("data-lms-nav");
      detachExamMonitors();
      lmsState.studentSession = null;
      lmsState.lastSubmissionId = null;
      lmsState.portfolioStudentId = null;
      if (window.UETStudio && typeof window.UETStudio.openLmsScreen === "function") {
        window.UETStudio.openLmsScreen(target);
      }
      return true;
    }

    const b = e.target.closest ? e.target.closest("[data-lms]") : null;
    if (!b) return false;
    const act = b.getAttribute("data-lms");

    if (act === "add-student") openStudentModal(null);
    else if (act === "edit-student") openStudentModal(b.getAttribute("data-id"));
    else if (act === "del-student") {
      const id = b.getAttribute("data-id");
      U().showConfirm("Xóa học sinh", "Bạn có chắc muốn xóa học sinh này khỏi danh bạ?", function () {
        saveStudents(loadStudents().filter(function (s) { return s.id !== id; }));
        U().showToast("Đã xóa học sinh.", "success");
        refreshStudio();
      });
    }
    else if (act === "import-students") openImportStudentsModal();
    else if (act === "filter-class") { lmsState.classFilter = b.getAttribute("data-val"); refreshStudio(); }
    else if (act === "open-portfolio") {
      lmsState.portfolioStudentId = b.getAttribute("data-id");
      if (window.UETStudio && typeof window.UETStudio.openLmsScreen === "function") window.UETStudio.openLmsScreen("students");
    }
    else if (act === "close-portfolio") { lmsState.portfolioStudentId = null; refreshStudio(); }
    else if (act === "create-assignment") openAssignmentModal(null);
    else if (act === "edit-assignment") openAssignmentModal({ editId: b.getAttribute("data-id") });
    else if (act === "filter-assign-grade") {
      lmsState.assignGradeFilter = b.getAttribute("data-val") || "all";
      lmsState.assignSubjectFilter = "all";
      refreshStudio();
    }
    else if (act === "filter-assign-subject") {
      lmsState.assignSubjectFilter = b.getAttribute("data-val") || "all";
      refreshStudio();
    }
    else if (act === "toggle-assign-recipients") {
      const aid = b.getAttribute("data-id");
      if (aid) {
        lmsState.expandedRecipients[aid] = !lmsState.expandedRecipients[aid];
        refreshStudio();
      }
    }
    else if (act === "edit-feedback-rules") openFeedbackRulesModal();
    else if (act === "del-assignment") {
      const id = b.getAttribute("data-id");
      U().showConfirm("Xóa bài giao", "Bạn có chắc muốn xóa bài tập đã giao này?", function () {
        saveAssignments(loadAssignments().filter(function (a) { return a.id !== id; }));
        U().showToast("Đã xóa bài giao.", "success");
        refreshStudio();
      });
    }
    else if (act === "copy-assign-link") {
      U().copyText(buildAssignmentUrl(b.getAttribute("data-code")), "liên kết bài tập");
    }
    else if (act === "open-student-entry") openStudentAssignment(b.getAttribute("data-code"));
    else if (act === "open-gradebook") {
      lmsState.selectedAssignmentId = b.getAttribute("data-id");
      if (window.UETStudio && typeof window.UETStudio.openLmsScreen === "function") window.UETStudio.openLmsScreen("gradebook");
    }
    else if (act === "send-reminders") sendDeadlineReminders(b.getAttribute("data-id"));
    else if (act === "send-student-email") sendStudentGradebookEmail(b.getAttribute("data-assign"), b.getAttribute("data-student"));
    else if (act === "export-gb-xlsx") exportGradebookExcel(b.getAttribute("data-id"));
    else if (act === "export-gb-pdf") exportGradebookPdf(b.getAttribute("data-id"));
    else if (act === "export-worksheet-pdf") exportWorksheetA4Pdf(b.getAttribute("data-id"));
    else if (act === "preview-sub-a4") openStudentA4PreviewModal(b.getAttribute("data-sub"));
    else if (act === "export-sub-pdf-qr") exportStudentA4Pdf(b.getAttribute("data-sub"));
    else if (act === "make-remedial") createRemedialFromSubmission(b.getAttribute("data-sub"));
    else if (act === "toggle-student-email") {
      const aid = b.getAttribute("data-assign"), sid = b.getAttribute("data-student");
      const list = loadAssignments();
      const a = list.find(function (x) { return x.id === aid; });
      if (a) {
        if (!a.parentEmailOverrides) a.parentEmailOverrides = {};
        a.parentEmailOverrides[sid] = a.parentEmailOverrides[sid] === false ? true : false;
        saveAssignments(list);
        refreshStudio();
      }
    }
    else if (act === "open-receipt") openParentReceipt(b.getAttribute("data-id"));
    else if (act === "confirm-parent-read") {
      const subId = b.getAttribute("data-id");
      const subs = loadSubmissions();
      const s = subs.find(function (x) { return x.id === subId; });
      if (s) {
        s.parentReadAt = new Date().toISOString();
        saveSubmissions(subs);
        U().showToast("Cảm ơn quý phụ huynh đã xác nhận xem kết quả!", "success");
        refreshStudio();
      }
    }
    else if (act === "view-sub") {
      const sub = loadSubmissions().find(function (x) { return x.id === b.getAttribute("data-id"); });
      if (sub) {
        const assign = loadAssignments().find(function (a) { return a.id === sub.assignmentId; });
        if (assign) {
          lmsState.activeAssignCode = assign.code;
          lmsState.lastSubmissionId = sub.id;
          if (window.UETStudio && typeof window.UETStudio.openLmsScreen === "function") window.UETStudio.openLmsScreen("student-assign");
        }
      }
    }
    else if (act === "start-student-exam") startStudentExam(b.getAttribute("data-id"));
    else if (act === "pick-student-opt") {
      const sess = lmsState.studentSession;
      if (!sess) return true;
      const q = sess.questions[sess.idx];
      const opt = Number(b.getAttribute("data-opt"));
      const cur = sess.answers[q.id] || [];
      if (q.type === "multiple") {
        const p = cur.indexOf(opt);
        if (p === -1) cur.push(opt); else cur.splice(p, 1);
        sess.answers[q.id] = cur;
      } else {
        sess.answers[q.id] = [opt];
      }
      persistStudentDraft();
      refreshStudio();
    }
    else if (act === "nav-student-q") {
      const sess = lmsState.studentSession;
      if (!sess) return true;
      const dir = Number(b.getAttribute("data-dir"));
      sess.idx = U().clamp(sess.idx + dir, 0, sess.questions.length - 1);
      persistStudentDraft();
      refreshStudio();
    }
    else if (act === "jump-student-q") {
      const sess = lmsState.studentSession;
      if (!sess) return true;
      sess.idx = U().clamp(Number(b.getAttribute("data-idx")), 0, sess.questions.length - 1);
      persistStudentDraft();
      refreshStudio();
    }
    else if (act === "submit-student-exam") {
      const aid = b.getAttribute("data-id");
      U().showConfirm("Nộp bài tập", "Bạn có chắc chắn muốn nộp bài ngay bây giờ?", function () {
        finishStudentExam(aid, false);
      });
    }
    else if (act === "toggle-ask-teacher") {
      const subId = b.getAttribute("data-sub");
      const qId = b.getAttribute("data-qid");
      const subs = loadSubmissions();
      const s = subs.find(function (x) { return x.id === subId; });
      if (s) {
        if (!Array.isArray(s.askTeacherIds)) s.askTeacherIds = [];
        const p = s.askTeacherIds.indexOf(qId);
        if (p === -1) {
          s.askTeacherIds.push(qId);
          U().showToast("Đã gửi đánh dấu \"Chưa hiểu câu này\" tới giáo viên.", "info");
        } else {
          s.askTeacherIds.splice(p, 1);
        }
        saveSubmissions(subs);
        refreshStudio();
      }
    }
    return true;
  }

  function handleChange(e) {
    const t = e.target;
    if (!t) return false;
    if (t.id === "lmsGradebookSelect") {
      lmsState.selectedAssignmentId = t.value;
      refreshStudio();
      return true;
    }
    return false;
  }

  function openAssignModalForQuiz(quizId) {
    openAssignmentModal({ quizId: quizId });
  }

  window.UETLms = {
    renderStudioSubnav: renderStudioSubnav,
    renderStudentsView: renderStudentsView,
    renderAssignmentsView: renderAssignmentsView,
    renderGradebookView: renderGradebookView,
    renderStudentAssignmentView: renderStudentAssignmentView,
    renderParentReceiptView: renderParentReceiptView,
    handleClick: handleClick,
    handleChange: handleChange,
    openStudentAssignment: openStudentAssignment,
    openParentReceipt: openParentReceipt,
    openAssignModalForQuiz: openAssignModalForQuiz,
    generateQrSvg: generateQrSvg,
    buildSubmissionReviewUrl: buildSubmissionReviewUrl,
    buildStudentA4SheetHtml: buildStudentA4SheetHtml,
    getStudentParentEmail: getStudentParentEmail,
    sendParentEmailBatch: sendParentEmailBatch,
    sendDeadlineReminders: sendDeadlineReminders,
    sendStudentGradebookEmail: sendStudentGradebookEmail,
    openAssignmentModal: openAssignmentModal
  };
})();
