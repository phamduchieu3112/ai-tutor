/* ============================================================
   UET Master – Creator Studio / Quiz Studio (studio.js)
   Quizizz / Wayground-grade Editor, Lobby, Player & Summary
   ============================================================ */
(function () {
  "use strict";

  const TIME_OPTIONS = [
    [5, "5 giây"], [10, "10 giây"], [15, "15 giây"], [20, "20 giây"], [30, "30 giây"],
    [45, "45 giây"], [60, "60 giây"], [120, "2 phút"], [180, "3 phút"], [300, "5 phút"], [0, "Không giới hạn"]
  ];

  const STUDIO_SESS_KEY = "ai_tutor_studio_sessions";

  const sState = {
    screen: "home", // home | editor | lobby | play | summary
    quiz: null,     // { id, title, tag, questions: [{ id, text, type, options[], correct[], time, image, explanation }] }
    lobby: {
      splitMode: "sessions",  // all | sessions | random
      perSession: 50,
      sessionIdx: 1,
      randomCount: 20,
      timeMode: "per_q",      // per_q | uniform | unlimited
      uniformSec: 30,
      showAnswer: "full",     // full | right_wrong | off
      showExplain: true,
      allowReview: true,
      shuffleQ: false,
      shuffleO: false,
      sound: true,
      streak: true,
      redemption: false
    },
    play: null,
    timerId: null,
    mounted: false
  };

  function getDoneSessions(quizId, perSize) {
    const all = U().loadObj(STUDIO_SESS_KEY);
    const k = String(quizId || "") + "_" + String(perSize || 50);
    return all[k] && typeof all[k] === "object" ? all[k] : {};
  }
  function markSessionDone(quizId, perSize, sessNum) {
    const all = U().loadObj(STUDIO_SESS_KEY);
    const k = String(quizId || "") + "_" + String(perSize || 50);
    if (!all[k] || typeof all[k] !== "object") all[k] = {};
    all[k][String(sessNum)] = true;
    U().saveJSON(STUDIO_SESS_KEY, all);
  }
  function initLobbyDefaultsForQuiz(qz) {
    if (!qz) return;
    const total = qz.questions.length;
    if (total > 50) {
      sState.lobby.splitMode = "sessions";
      sState.lobby.perSession = 50;
      sState.lobby.sessionIdx = 1;
    } else {
      sState.lobby.splitMode = "all";
      sState.lobby.perSession = Math.min(20, Math.max(1, total));
      sState.lobby.sessionIdx = 1;
    }
    sState.lobby.randomCount = Math.min(20, Math.max(1, total));
  }

  function U() { return window.UET; }

  function loadQuizzes() { return U().loadArr(U().KEYS.quizzes); }
  function saveQuizzes(list) { return U().saveJSON(U().KEYS.quizzes, list); }

  function playTone(ok) {
    if (!sState.lobby.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = ok ? "triangle" : "sawtooth";
      o.frequency.setValueAtTime(ok ? 523.25 : 220, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(ok ? 783.99 : 140, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.14, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
      o.start(); o.stop(ctx.currentTime + 0.25);
    } catch (e) { /* ignore audio errors */ }
  }

  function stopStudioTimer() {
    if (sState.timerId) { clearInterval(sState.timerId); sState.timerId = null; }
  }

  function newEmptyQuiz() {
    return {
      id: "qz_" + Date.now(),
      title: "Quiz mới",
      tag: "Tổng hợp",
      questions: []
    };
  }

  function openFromDeck(deck) {
    if (!deck) return;
    stopStudioTimer();
    sState.quiz = {
      id: "qz_deck_" + deck.id,
      deckId: deck.id,
      title: deck.title,
      tag: deck.tag || "Tổng hợp",
      questions: deck.questions.map(function (q, i) {
        return {
          id: q.id || ("sq_" + i),
          text: q.text,
          type: q.type === "multiple" ? "multiple" : "single",
          options: q.options.slice(),
          correct: q.correct.slice(),
          time: Number.isFinite(Number(q.time)) ? Number(q.time) : 30,
          image: q.image || "",
          explanation: q.explanation || ""
        };
      })
    };
    sState.screen = "editor";
    U().showTab("studio");
  }

  function openFromQuestions(title, tag, items) {
    stopStudioTimer();
    sState.quiz = {
      id: "qz_" + Date.now(),
      title: title || "Quiz từ AI Converter",
      tag: tag || "Tổng hợp",
      questions: items.map(function (q, i) {
        return {
          id: "sq_" + Date.now() + "_" + i,
          text: q.text,
          type: q.correct.length > 1 || q.type === "Checkbox" || q.type === "multiple" ? "multiple" : "single",
          options: q.options.filter(Boolean),
          correct: q.correct.slice(),
          time: Number.isFinite(Number(q.time)) ? Number(q.time) : 30,
          image: q.image || "",
          explanation: q.explanation || ""
        };
      })
    };
    sState.screen = "editor";
    U().showTab("studio");
  }

  function saveCurrentQuiz() {
    const qz = sState.quiz;
    if (!qz) return;
    const tEl = U().$("stQuizTitle"), tagEl = U().$("stQuizTag");
    if (tEl) qz.title = tEl.value.trim() || "Quiz không tên";
    if (tagEl) qz.tag = tagEl.value.trim() || "Tổng hợp";
    if (qz.questions.length === 0) { U().showToast("Hãy thêm ít nhất 1 câu hỏi trước khi lưu Quiz.", "warning"); return; }
    const list = loadQuizzes().filter(function (x) { return x && x.id !== qz.id; });
    list.unshift(Object.assign({}, qz, { updatedAt: new Date().toISOString() }));
    saveQuizzes(list);
    U().showToast("Đã lưu Quiz \"" + qz.title + "\" vào Creator Studio!", "success");
  }

  function saveQuizToDeckBank() {
    const qz = sState.quiz;
    if (!qz || qz.questions.length === 0) { U().showToast("Quiz chưa có câu hỏi nào.", "warning"); return; }
    const tEl = U().$("stQuizTitle"), tagEl = U().$("stQuizTag");
    if (tEl) qz.title = tEl.value.trim() || qz.title;
    if (tagEl) qz.tag = tagEl.value.trim() || qz.tag;
    U().addOrMergeDeck({ mode: "new", title: qz.title, tag: qz.tag, questions: qz.questions });
  }

  const STUDIO_ROUTE_MAP = {
    home: ["/creator-studio", "Creator Studio | AI Tutor"],
    editor: ["/creator-studio/editor", "Trình soạn thảo Quiz | AI Tutor"],
    lobby: ["/creator-studio/lobby", "Cài đặt Quiz | AI Tutor"],
    play: ["/creator-studio/play", "Đang chơi Quiz | AI Tutor"],
    summary: ["/creator-studio/summary", "Tổng kết Quiz | AI Tutor"]
  };
  function syncStudioRoute(replace) {
    if (!U() || U().state.tab !== "studio") return;
    const entry = STUDIO_ROUTE_MAP[sState.screen] || STUDIO_ROUTE_MAP.home;
    const curPath = (window.location.pathname || "").toLowerCase();
    // Keep /quiz?code=... URL intact when playing a shared link in Lobby
    if (curPath === "/quiz" && sState.screen === "lobby") {
      document.title = "Làm bài chia sẻ | AI Tutor";
      return;
    }
    if (typeof U().syncHistory === "function") U().syncHistory(entry[0], entry[1], !!replace);
  }
  function applySubRoute(sub) {
    if (sub === "home") { stopStudioTimer(); sState.screen = "home"; return; }
    if ((sub === "editor" || sub === "lobby") && sState.quiz) { stopStudioTimer(); sState.screen = sub; return; }
    if ((sub === "play" || sub === "summary") && sState.play) { sState.screen = sub; return; }
    sState.screen = "home";
  }

  /* ======================== MAIN RENDER ======================== */
  function render() {
    const root = U().$("studioRoot");
    if (!root) return;
    syncStudioRoute(false);
    if (sState.screen === "home") renderHome(root);
    else if (sState.screen === "editor") renderEditor(root);
    else if (sState.screen === "lobby") renderLobby(root);
    else if (sState.screen === "play") renderPlay(root);
    else if (sState.screen === "summary") renderSummary(root);

    if (!sState.mounted) {
      sState.mounted = true;
      root.addEventListener("click", onStudioClick);
      root.addEventListener("change", onStudioChange);
    }
    if (typeof U().applyI18n === "function") U().applyI18n(root);
  }

  /* ======================== HOME ======================== */
  function renderHome(root) {
    stopStudioTimer();
    const quizzes = loadQuizzes();
    const decks = U().getDecks();
    const convCount = window.UETConverter ? window.UETConverter.getValidQuestions().length : 0;

    let h = '<div class="panel" style="margin-bottom:16px">' +
      '<div class="panel-head"><div><h2>🎮 Creator Studio / Quiz Studio</h2>' +
      '<p class="muted" style="margin:0;font-size:.86rem">Trình tạo &amp; chơi Quiz tương tác chuẩn Quizizz / Wayground (KaTeX, Streak, Redemption, thời gian từng câu).</p></div></div>' +
      '<div class="admin-grid" style="margin:12px 0 0">' +
        '<div class="deck-row"><strong>✍️ Tạo Quiz thủ công</strong><span class="muted" style="font-size:.8rem">Tự soạn từng câu hỏi với toolbar B/I/U, LaTeX &amp; ảnh</span>' +
          '<button type="button" class="btn btn-primary btn-sm" data-sact="new-manual">Tạo Quiz mới</button></div>' +
        '<div class="deck-row"><strong>📚 Lấy từ Kho đề AI Tutor</strong><span class="muted" style="font-size:.8rem">Hiện có ' + decks.length + ' bộ đề trong Kho đề</span>' +
          (decks.length ? '<div style="display:flex;gap:6px"><select id="stPickDeck" style="flex:1;padding:6px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text)">' +
            decks.map(function (d) { return '<option value="' + U().esc(d.id) + '">' + U().esc(d.title) + ' (' + d.questions.length + ' câu)</option>'; }).join("") +
            '</select><button type="button" class="btn btn-primary btn-sm" data-sact="import-deck">Mở</button></div>' : '<span class="muted" style="font-size:.78rem">Chưa có bộ đề nào</span>') +
        '</div>' +
        '<div class="deck-row"><strong>✨ Nhập từ AI Converter</strong><span class="muted" style="font-size:.8rem">Hiện có ' + convCount + ' câu hợp lệ trong AI Converter</span>' +
          '<button type="button" class="btn btn-emerald btn-sm" data-sact="import-conv"' + (convCount === 0 ? " disabled" : "") + '>Lấy từ AI Converter (' + convCount + ')</button></div>' +
      '</div></div>';

    h += '<div class="panel"><div class="panel-head"><h2>Danh sách Quiz đã tạo (' + quizzes.length + ')</h2></div>';
    if (quizzes.length === 0) {
      h += '<div class="empty-state">Bạn chưa lưu Quiz nào trong Creator Studio. Hãy tạo mới hoặc chọn từ Kho đề ở trên!</div>';
    } else {
      h += '<div class="list">' + quizzes.map(function (qz) {
        return '<div class="deck-row"><div class="deck-title-line"><span class="deck-title">' + U().esc(qz.title) + '</span><span class="badge">' + U().esc(qz.tag || "Tổng hợp") + '</span></div>' +
          '<div class="deck-sub"><span>' + (qz.questions ? qz.questions.length : 0) + ' câu hỏi</span>' + (qz.updatedAt ? '<span>Cập nhật: ' + U().esc(U().fmtDateTime(qz.updatedAt)) + '</span>' : "") + '</div>' +
          '<div class="deck-actions">' +
            '<button type="button" class="btn btn-emerald btn-sm" data-sact="play-saved" data-id="' + U().esc(qz.id) + '">▶ Bắt đầu làm bài (Play)</button>' +
            '<button type="button" class="btn btn-primary btn-sm" data-sact="edit-saved" data-id="' + U().esc(qz.id) + '">Chỉnh sửa</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-sact="share-saved" data-id="' + U().esc(qz.id) + '">🔗 Chia sẻ</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-sact="pdf-saved" data-id="' + U().esc(qz.id) + '">🖨️ Xuất PDF</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-sact="del-saved" data-id="' + U().esc(qz.id) + '">Xóa</button>' +
          '</div></div>';
      }).join("") + '</div>';
    }
    h += '</div>';
    root.innerHTML = h;
  }

  /* ======================== 4.1 QUIZ EDITOR ======================== */
  function timeSelectHTML(val, extraAttr) {
    return '<select ' + extraAttr + ' style="padding:5px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:.8rem">' +
      TIME_OPTIONS.map(function (o) {
        return '<option value="' + o[0] + '"' + (Number(val) === o[0] ? " selected" : "") + '>' + o[1] + '</option>';
      }).join("") + '</select>';
  }

  function renderEditor(root) {
    const qz = sState.quiz || newEmptyQuiz();
    sState.quiz = qz;
    const advLock = U().can("studioAdv") ? "" : " (⏱️ Tuỳ chỉnh thời gian riêng mở khóa đầy đủ từ gói Silver)";

    let h = '<div class="studio-header">' +
      '<button type="button" class="btn btn-outline btn-sm" data-sact="back-home">← Danh sách</button>' +
      '<input type="text" id="stQuizTitle" value="' + U().esc(qz.title) + '" placeholder="Tên Quiz..." style="flex:1;min-width:180px;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-weight:700">' +
      '<input type="text" id="stQuizTag" value="' + U().esc(qz.tag) + '" placeholder="Môn học / Tag" style="width:150px;padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--text)">' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        timeSelectHTML(30, 'id="stBatchTime" aria-label="Thời gian hàng loạt"') +
        '<button type="button" class="btn btn-outline btn-sm" data-sact="batch-time">Đặt thời gian hàng loạt</button>' +
      '</div>' +
      '<button type="button" class="btn btn-outline btn-sm" data-sact="save-deck">Lưu vào Kho đề</button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-sact="share-cur"' + (qz.questions.length === 0 ? " disabled" : "") + '>🔗 Chia sẻ</button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-sact="pdf-cur"' + (qz.questions.length === 0 ? " disabled" : "") + '>🖨️ Xuất PDF</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-sact="save-quiz">💾 Lưu Quiz</button>' +
      '<button type="button" class="btn btn-emerald btn-sm" data-sact="go-lobby"' + (qz.questions.length === 0 ? " disabled" : "") + '>▶ Bắt đầu làm bài (Play)</button>' +
    '</div>';

    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
      '<span class="muted" style="font-size:.84rem">Tổng cộng <strong>' + qz.questions.length + '</strong> câu hỏi' + advLock + '</span>' +
      '<button type="button" class="btn btn-primary" data-sact="add-q">+ Thêm câu hỏi mới</button>' +
    '</div>';

    if (qz.questions.length === 0) {
      h += '<div class="panel"><div class="empty-state">Quiz này chưa có câu hỏi nào. Nhấn <strong>+ Thêm câu hỏi mới</strong> để mở Question Builder chuẩn Quizizz!</div></div>';
    } else {
      h += '<div class="list">' + qz.questions.map(function (q, idx) {
        const opts = q.options.map(function (o, k) {
          const ok = q.correct.indexOf(k) !== -1;
          return '<div class="studio-opt-pill"><span class="opt-dot' + (ok ? " ok" : "") + '"></span><span class="rich-text">' + U().renderRich(o) + '</span></div>';
        }).join("");
        return '<article class="studio-q-card">' +
          '<div class="studio-q-head">' +
            '<div style="display:flex;align-items:center;gap:8px"><span class="badge">Câu ' + (idx + 1) + '</span><span class="muted" style="font-size:.78rem">' + (q.type === "multiple" ? "Nhiều đáp án" : "1 đáp án") + '</span></div>' +
            '<div class="deck-actions">' +
              timeSelectHTML(q.time, 'data-sact="q-time" data-idx="' + idx + '" aria-label="Thời gian câu ' + (idx + 1) + '"') +
              '<button type="button" class="btn btn-outline btn-sm" data-sact="edit-q" data-idx="' + idx + '">✏️ Chỉnh sửa</button>' +
              '<button type="button" class="btn btn-outline btn-sm" data-sact="dup-q" data-idx="' + idx + '">📋 Nhân bản</button>' +
              '<button type="button" class="btn btn-outline btn-sm" data-sact="del-q" data-idx="' + idx + '">🗑 Xóa</button>' +
            '</div>' +
          '</div>' +
          '<div class="rich-text" style="font-weight:700;font-size:1.02rem">' + U().renderRich(q.text) + '</div>' +
          (q.image ? '<img src="' + U().esc(q.image) + '" alt="" style="max-height:160px;border-radius:10px;align-self:flex-start" onerror="this.style.display=\'none\'">' : "") +
          '<div class="studio-opts-grid">' + opts + '</div>' +
          (q.explanation ? '<div class="explain-box rich-text" style="margin-top:4px;font-size:.84rem"><strong>Giải thích:</strong> ' + U().renderRich(q.explanation) + '</div>' : "") +
        '</article>';
      }).join("") + '</div>';
    }
    root.innerHTML = h;
  }

  /* Quizizz-Style Question Builder Modal */
  function openQuestionBuilder(idx) {
    const qz = sState.quiz;
    if (!qz) return;
    const isNew = idx === -1;
    const q = isNew
      ? { id: "sq_" + Date.now(), text: "", type: "single", options: ["", "", "", ""], correct: [0], time: 30, image: "", explanation: "" }
      : JSON.parse(JSON.stringify(qz.questions[idx]));
    while (q.options.length < 5) q.options.push("");

    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="qbModal" role="dialog" aria-modal="true"><div class="modal modal-lg">' +
        '<h3>' + (isNew ? "Tạo câu hỏi mới (Question Builder)" : ("Chỉnh sửa câu #" + (idx + 1))) + '</h3>' +
        '<div class="qb-toolbar">' +
          '<button type="button" data-fmt="b" title="In đậm"><b>B</b></button>' +
          '<button type="button" data-fmt="i" title="In nghiêng"><i>I</i></button>' +
          '<button type="button" data-fmt="u" title="Gạch chân"><u>U</u></button>' +
          '<button type="button" data-fmt="math" title="Chèn công thức Toán LaTeX">∑ Công thức Toán (LaTeX)</button>' +
          '<button type="button" data-fmt="img" title="Chèn ảnh">🖼️ Chèn link ảnh</button>' +
          '<select id="qbType" style="margin-left:auto;padding:5px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:.82rem">' +
            '<option value="single"' + (q.type === "single" ? " selected" : "") + '>Single Choice (1 đáp án)</option>' +
            '<option value="multiple"' + (q.type === "multiple" ? " selected" : "") + '>Multiple Choice (Nhiều đáp án)</option>' +
          '</select>' +
          timeSelectHTML(q.time, 'id="qbTime"') +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field" style="margin:0">Nội dung câu hỏi<textarea id="qbText" rows="4" placeholder="Nhập câu hỏi... (dùng $...$ cho công thức LaTeX, <u>...</u> cho gạch chân)">' + U().esc(q.text) + '</textarea></label>' +
          '<div class="field" style="margin:0"><span>Xem trước trực tiếp (KaTeX + HTML)</span><div id="qbPrev" class="rich-text" style="padding:10px;border:1px solid var(--border);border-radius:10px;min-height:92px;background:var(--bg2)">' + U().renderRich(q.text) + '</div></div>' +
        '</div>' +
        '<div id="qbImgRow" class="field' + (q.image ? "" : " hidden") + '">Link hình ảnh minh họa<input type="url" id="qbImage" value="' + U().esc(q.image || "") + '" placeholder="https://..."></div>' +
        '<div class="field" style="margin-top:12px"><span>Các phương án trả lời (bấm nút tròn ✓ để chọn đáp án đúng)</span></div>' +
        '<div class="qz-builder-grid">' + [0, 1, 2, 3, 4].map(function (k) {
          const on = q.correct.indexOf(k) !== -1;
          return '<div class="qz-opt-box c' + k + '">' +
            '<button type="button" class="qz-tick' + (on ? " on" : "") + '" data-qbtick="' + k + '" title="Chọn đáp án đúng">' + (on ? "✓" : "") + '</button>' +
            '<input type="text" id="qbOpt_' + k + '" value="' + U().esc(q.options[k] || "") + '" placeholder="Phương án ' + U().LETTERS.charAt(k) + (k >= 2 ? " (tùy chọn)" : "") + '">' +
          '</div>';
        }).join("") + '</div>' +
        '<label class="field" style="margin-top:12px">Giải thích đáp án (tùy chọn)<textarea id="qbExp" rows="2" placeholder="Giải thích ngắn gọn (hỗ trợ LaTeX $...$)...">' + U().esc(q.explanation || "") + '</textarea></label>' +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" id="qbCancel">Hủy</button><button type="button" class="btn btn-primary" id="qbSave">Lưu câu hỏi</button></div>' +
      '</div></div>';

    const modal = U().$("qbModal");
    const ta = U().$("qbText");
    function wrapSel(open, close, placeholder) {
      const s = ta.selectionStart || 0, e = ta.selectionEnd || 0;
      const sel = ta.value.slice(s, e) || placeholder;
      ta.value = ta.value.slice(0, s) + open + sel + close + ta.value.slice(e);
      ta.focus();
      U().setHTML("qbPrev", U().renderRich(ta.value));
    }
    ta.addEventListener("input", function () { U().setHTML("qbPrev", U().renderRich(ta.value)); });
    modal.addEventListener("click", function (ev) {
      const fb = ev.target.closest("[data-fmt]");
      if (fb) {
        const f = fb.getAttribute("data-fmt");
        if (f === "b") wrapSel("<b>", "</b>", "chữ in đậm");
        else if (f === "i") wrapSel("<i>", "</i>", "chữ in nghiêng");
        else if (f === "u") wrapSel("<u>", "</u>", "chữ gạch chân");
        else if (f === "math") wrapSel("$", "$", "\\frac{a}{b}");
        else if (f === "img") U().toggleEl("qbImgRow", true);
        return;
      }
      const tb = ev.target.closest("[data-qbtick]");
      if (tb) {
        const k = Number(tb.getAttribute("data-qbtick"));
        const tp = U().$("qbType").value;
        if (tp === "single") {
          q.correct = [k];
          modal.querySelectorAll("[data-qbtick]").forEach(function (el) {
            const on = Number(el.getAttribute("data-qbtick")) === k;
            el.classList.toggle("on", on); el.textContent = on ? "✓" : "";
          });
        } else {
          const pos = q.correct.indexOf(k);
          if (pos === -1) q.correct.push(k); else q.correct.splice(pos, 1);
          q.correct.sort(function (a, b) { return a - b; });
          tb.classList.toggle("on", pos === -1); tb.textContent = pos === -1 ? "✓" : "";
        }
      }
    });
    U().on("qbCancel", "click", function () { host.innerHTML = ""; });
    U().on("qbSave", "click", function () {
      const text = ta.value.trim();
      if (!text) { U().showToast("Vui lòng nhập nội dung câu hỏi.", "warning"); return; }
      const opts = [], newCorr = [];
      for (let k = 0; k < 5; k++) {
        const v = U().$("qbOpt_" + k).value.trim();
        if (v) {
          if (q.correct.indexOf(k) !== -1) newCorr.push(opts.length);
          opts.push(v);
        }
      }
      if (opts.length < 2) { U().showToast("Cần ít nhất 2 phương án trả lời.", "warning"); return; }
      if (newCorr.length === 0) { U().showToast("Vui lòng chọn ít nhất 1 đáp án đúng.", "warning"); return; }
      const item = {
        id: q.id, text: text, type: newCorr.length > 1 || U().$("qbType").value === "multiple" ? "multiple" : "single",
        options: opts, correct: newCorr, time: parseInt(U().$("qbTime").value, 10) || 0,
        image: (U().$("qbImage") ? U().$("qbImage").value : "").trim(),
        explanation: (U().$("qbExp") ? U().$("qbExp").value : "").trim()
      };
      if (isNew) qz.questions.push(item); else qz.questions[idx] = item;
      host.innerHTML = "";
      render();
      U().showToast("Đã cập nhật câu hỏi.", "success");
    });
  }

  /* ======================== 4.2 QUIZ LOBBY / SETTINGS ======================== */
  function renderLobby(root) {
    const qz = sState.quiz;
    if (!qz) { sState.screen = "home"; renderHome(root); return; }
    const lb = sState.lobby;
    const total = qz.questions.length;
    const advOk = U().can("studioAdv");
    const info = U().describeSessions(total, lb.perSession);
    lb.perSession = info.size;
    lb.sessionIdx = U().clamp(lb.sessionIdx || 1, 1, info.totalSessions);
    lb.randomCount = U().clamp(lb.randomCount || 20, 1, total);
    const doneMap = getDoneSessions(qz.id, info.size);

    let sessionPickerHtml = "";
    if (lb.splitMode === "sessions") {
      let opts = "";
      for (let c = 1; c <= info.totalSessions; c++) {
        const s = (c - 1) * info.size + 1;
        const e = Math.min(c * info.size, total);
        const cnt = e - s + 1;
        opts += '<option value="' + c + '"' + (lb.sessionIdx === c ? " selected" : "") + '>' +
          (doneMap[String(c)] ? "✓ " : "") + "Phiên " + c + "/" + info.totalSessions + " (Câu " + s + "–" + e + " · " + cnt + " câu)</option>";
      }
      // Clickable pills for fast jumping (cap pill grid at 60 items so 824/4=206 stays ultra-snappy via dropdown)
      let pillsHtml = "";
      if (info.totalSessions <= 60) {
        pillsHtml = '<div class="pills pills-sm" style="max-height:110px;overflow-y:auto;margin:6px 0 0">';
        for (let c = 1; c <= info.totalSessions; c++) {
          const s = (c - 1) * info.size + 1;
          const e = Math.min(c * info.size, total);
          const cnt = e - s + 1;
          const done = !!doneMap[String(c)];
          pillsHtml += '<button type="button" class="pill' + (lb.sessionIdx === c ? " active" : "") + '" data-sact="pick-sess" data-sess="' + c + '" title="Câu ' + s + '–' + e + '">' +
            (done ? "✓ " : "") + "Phiên " + c + " (" + cnt + ")</button>";
        }
        pillsHtml += "</div>";
      }
      sessionPickerHtml =
        '<div style="margin-top:10px">' +
          '<div class="pills pills-sm" style="margin-bottom:6px">' +
            [4, 5, 10, 25, 50, 100].map(function (n) {
              return '<button type="button" class="pill' + (info.size === n ? " active" : "") + '" data-sact="sess-preset" data-val="' + n + '">' + n + ' câu/phiên</button>';
            }).join("") +
          '</div>' +
          '<div style="display:grid;grid-template-columns:160px 1fr;gap:10px;align-items:end">' +
            '<label class="field" style="margin:0">Số câu mỗi phiên<input type="number" id="lbPerSession" min="1" max="' + total + '" value="' + info.size + '"></label>' +
            '<label class="field" style="margin:0">Chọn phiên muốn làm<select id="lbSessionIdx">' + opts + '</select></label>' +
          '</div>' +
          '<div class="checkout-notice" style="margin:8px 0 0;padding:8px 12px;font-size:.82rem">📊 <strong>' + U().esc(info.summary) + '</strong></div>' +
          pillsHtml +
        '</div>';
    } else if (lb.splitMode === "random") {
      sessionPickerHtml =
        '<div style="margin-top:8px;display:flex;align-items:end;gap:10px;flex-wrap:wrap">' +
          '<label class="field" style="margin:0;width:200px">Số câu ngẫu nhiên (1–' + total + ')<input type="number" id="lbRandomCount" min="1" max="' + total + '" value="' + lb.randomCount + '"></label>' +
          '<div class="pills pills-sm" style="margin:0">' +
            [4, 5, 10, 20, 40, 50].filter(function (n) { return n <= total; }).map(function (n) {
              return '<button type="button" class="pill' + (lb.randomCount === n ? " active" : "") + '" data-sact="rand-preset" data-val="' + n + '">' + n + ' câu</button>';
            }).join("") +
          '</div>' +
        '</div>';
    }

    const startLabel = lb.splitMode === "sessions"
      ? ("🚀 Bắt đầu Phiên " + lb.sessionIdx + "/" + info.totalSessions + " (" + (Math.min(lb.sessionIdx * info.size, total) - (lb.sessionIdx - 1) * info.size) + " câu)")
      : (lb.splitMode === "random" ? ("🚀 Bắt đầu (" + lb.randomCount + " câu ngẫu nhiên)") : ("🚀 Bắt đầu toàn bộ (" + total + " câu)"));

    root.innerHTML =
      '<div class="panel" style="max-width:780px;margin:0 auto">' +
        '<div class="panel-head"><div><h2>⚙️ Cài đặt trước khi làm bài (Quiz Lobby)</h2>' +
        '<p class="muted" style="margin:0">' + U().esc(qz.title) + ' • <strong>' + total + '</strong> câu hỏi</p></div>' +
        '<button type="button" class="btn btn-outline btn-sm" data-sact="back-editor">← Quay lại Editor</button></div>' +

        /* Session Splitter Box (Free for all users!) */
        '<div class="radio-group" style="margin-bottom:14px;background:var(--bg2)">' +
          '<legend style="font-weight:700;font-size:.86rem">📦 Chọn số lượng câu &amp; Chia phiên làm bài</legend>' +
          '<div class="pills" style="margin:6px 0 0">' +
            '<button type="button" class="pill' + (lb.splitMode === "sessions" ? " active" : "") + '" data-sact="split-mode" data-val="sessions">Chia nhiều phiên (VD: 50 câu/phiên)</button>' +
            '<button type="button" class="pill' + (lb.splitMode === "random" ? " active" : "") + '" data-sact="split-mode" data-val="random">Chọn ngẫu nhiên N câu</button>' +
            '<button type="button" class="pill' + (lb.splitMode === "all" ? " active" : "") + '" data-sact="split-mode" data-val="all">Làm toàn bộ (' + total + ' câu)</button>' +
          '</div>' +
          sessionPickerHtml +
        '</div>' +

        (!advOk ? '<p class="lock-note">🔒 Một số tính năng nâng cao (Streak 🔥, Redemption Question, Đảo đề/đáp án) mở khóa từ Gói Silver trở lên.</p>' : "") +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
          '<label class="field">Chế độ thời gian<select id="lbTimeMode">' +
            '<option value="per_q"' + (lb.timeMode === "per_q" ? " selected" : "") + '>Dùng thời gian riêng từng câu</option>' +
            '<option value="uniform"' + (lb.timeMode === "uniform" ? " selected" : "") + '>Ghi đè thời gian chung cho tất cả câu</option>' +
            '<option value="unlimited"' + (lb.timeMode === "unlimited" ? " selected" : "") + '>Không giới hạn thời gian</option>' +
          '</select></label>' +
          '<label class="field">Thời gian chung (giây)<input type="number" id="lbUniformSec" min="5" max="600" value="' + lb.uniformSec + '"' + (lb.timeMode !== "uniform" ? " disabled" : "") + '></label>' +
          '<label class="field">Hiện đáp án đúng sau mỗi câu<select id="lbShowAnswer">' +
            '<option value="full"' + (lb.showAnswer === "full" ? " selected" : "") + '>Bật (Hiện đáp án đúng + Đúng/Sai)</option>' +
            '<option value="right_wrong"' + (lb.showAnswer === "right_wrong" ? " selected" : "") + '>Chỉ hiện Đúng / Sai</option>' +
            '<option value="off"' + (lb.showAnswer === "off" ? " selected" : "") + '>Tắt (Ẩn cho đến khi nộp bài)</option>' +
          '</select></label>' +
          '<div class="field"><span>Tùy chọn hiển thị</span>' +
            '<label class="check-row" style="margin:4px 0"><input type="checkbox" id="lbShowExplain"' + (lb.showExplain ? " checked" : "") + '> Hiện giải thích đáp án ngay sau mỗi câu</label>' +
            '<label class="check-row" style="margin:4px 0"><input type="checkbox" id="lbAllowReview"' + (lb.allowReview ? " checked" : "") + '> Cho phép xem lại bài làm &amp; đáp án sau khi nộp</label>' +
          '</div>' +
        '</div>' +

        '<div class="radio-group" style="margin-top:12px"><legend style="font-weight:700;font-size:.86rem">Tùy chọn nâng cao chuẩn Quizizz</legend>' +
          '<label class="check-row"><input type="checkbox" id="lbShuffleQ"' + (lb.shuffleQ && advOk ? " checked" : "") + (!advOk ? " disabled" : "") + '> Đảo thứ tự câu hỏi</label>' +
          '<label class="check-row"><input type="checkbox" id="lbShuffleO"' + (lb.shuffleO && advOk ? " checked" : "") + (!advOk ? " disabled" : "") + '> Đảo thứ tự đáp án (Zero-Drift)</label>' +
          '<label class="check-row"><input type="checkbox" id="lbSound"' + (lb.sound ? " checked" : "") + '> Bật âm thanh hiệu ứng Đúng / Sai</label>' +
          '<label class="check-row"><input type="checkbox" id="lbStreak"' + (lb.streak && advOk ? " checked" : "") + (!advOk ? " disabled" : "") + '> Bật thanh Streak 🔥 &amp; điểm thưởng tốc độ</label>' +
          '<label class="check-row"><input type="checkbox" id="lbRedemption"' + (lb.redemption && advOk ? " checked" : "") + (!advOk ? " disabled" : "") + '> Câu hỏi cứu vớt (Redemption Question – làm lại câu sai ở cuối bài)</label>' +
        '</div>' +

        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-emerald" style="font-size:1rem;padding:11px 28px" data-sact="start-play">' + startLabel + '</button>' +
        '</div>' +
      '</div>';
  }

  /* ======================== 4.3 QUIZ PLAYER ======================== */
  function startPlaySession(subsetQuestions) {
    const qz = sState.quiz;
    if (!qz) return;
    stopStudioTimer();
    const lb = sState.lobby;
    const advOk = U().can("studioAdv");
    let sourceQs = subsetQuestions;
    let sessionMeta = null;

    if (!sourceQs) {
      if (lb.splitMode === "sessions") {
        const info = U().describeSessions(qz.questions.length, lb.perSession);
        const idx = U().clamp(lb.sessionIdx || 1, 1, info.totalSessions);
        const st = (idx - 1) * info.size;
        const en = Math.min(idx * info.size, qz.questions.length);
        sourceQs = qz.questions.slice(st, en);
        sessionMeta = { idx: idx, totalSessions: info.totalSessions, perSession: info.size, startNum: st + 1, endNum: en };
      } else if (lb.splitMode === "random") {
        const cnt = U().clamp(lb.randomCount || 20, 1, qz.questions.length);
        sourceQs = U().shuffleArray(qz.questions).slice(0, cnt);
      } else {
        sourceQs = qz.questions;
      }
    }

    let list = sourceQs.map(function (q) {
      let opts = q.options.slice();
      let corr = q.correct.slice().sort(function (a, b) { return a - b; });
      if (lb.shuffleO && advOk) {
        const paired = q.options.map(function (opt, idx) { return { opt: opt, ok: q.correct.indexOf(idx) !== -1 }; });
        const sh = U().shuffleArray(paired);
        opts = sh.map(function (p) { return p.opt; });
        corr = sh.map(function (p, idx) { return p.ok ? idx : -1; }).filter(function (x) { return x !== -1; });
      }
      const sec = lb.timeMode === "unlimited" ? 0 : (lb.timeMode === "uniform" ? lb.uniformSec : (Number(q.time) || 0));
      return { id: q.id, text: q.text, type: q.type, options: opts, correct: corr, time: sec, image: q.image || "", explanation: q.explanation || "" };
    });
    if (lb.shuffleQ && advOk) list = U().shuffleArray(list);

    sState.play = {
      questions: list,
      sessionMeta: sessionMeta,
      idx: 0,
      selected: [],
      locked: false,
      lastOk: null,
      score: 0,
      streak: 0,
      maxStreak: 0,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      totalTimeMs: 0,
      qStartMs: Date.now(),
      remSec: list[0] ? list[0].time : 0,
      records: [],
      redemptionMode: false,
      redemptionDone: false
    };
    sState.screen = "play";
    startQuestionClock();
    render();
  }

  function startQuestionClock() {
    stopStudioTimer();
    const pl = sState.play;
    if (!pl) return;
    const q = pl.questions[pl.idx];
    pl.qStartMs = Date.now();
    pl.remSec = q ? q.time : 0;
    if (!q || q.time <= 0) return;
    sState.timerId = setInterval(function () {
      if (!sState.play || sState.play.locked) { stopStudioTimer(); return; }
      pl.remSec = Math.max(0, pl.remSec - 1);
      const el = U().$("qzTimerBox");
      if (el) {
        el.textContent = "⏱ " + pl.remSec + "s";
        el.classList.toggle("danger", pl.remSec > 0 && pl.remSec < 5);
      }
      if (pl.remSec <= 0) {
        stopStudioTimer();
        submitPlayAnswer(true);
      }
    }, 1000);
  }

  function submitPlayAnswer(isTimeout) {
    const pl = sState.play;
    if (!pl || pl.locked) return;
    stopStudioTimer();
    const q = pl.questions[pl.idx];
    const elapsed = Date.now() - pl.qStartMs;
    pl.totalTimeMs += elapsed;
    const sel = isTimeout ? [] : pl.selected.slice().sort(function (a, b) { return a - b; });
    const corr = q.correct.slice().sort(function (a, b) { return a - b; });
    const ok = !isTimeout && sel.length === corr.length && sel.every(function (v, i) { return v === corr[i]; });

    pl.locked = true;
    pl.lastOk = ok;
    playTone(ok);

    if (ok) {
      pl.streak++;
      if (pl.streak > pl.maxStreak) pl.maxStreak = pl.streak;
      const speedBonus = (sState.lobby.streak && U().can("studioAdv") && q.time > 0) ? Math.round((pl.remSec / q.time) * 400) : 0;
      const streakBonus = (sState.lobby.streak && U().can("studioAdv")) ? Math.min(pl.streak * 100, 500) : 0;
      pl.score += 600 + speedBonus + streakBonus;
      if (!pl.redemptionMode) pl.correctCount++;
      else {
        // Redemption recovered a wrong question!
        pl.correctCount++;
        pl.wrongCount = Math.max(0, pl.wrongCount - 1);
      }
    } else {
      pl.streak = 0;
      if (!pl.redemptionMode) {
        if (isTimeout && sel.length === 0) pl.skippedCount++;
        else pl.wrongCount++;
        if (sState.quiz && sState.quiz.deckId) U().recordMistake(sState.quiz.deckId, q);
      }
    }

    if (!pl.redemptionMode) {
      pl.records.push({ q: q, selected: sel, ok: ok, skipped: isTimeout && sel.length === 0, timeMs: elapsed });
    } else {
      const rec = pl.records.find(function (r) { return r.q.id === q.id && !r.ok; });
      if (rec && ok) { rec.ok = true; rec.selected = sel; rec.redeemed = true; }
    }

    if (sState.lobby.showAnswer === "off" && !sState.lobby.showExplain) {
      setTimeout(advancePlayQuestion, 250);
    } else {
      render();
    }
  }

  function advancePlayQuestion() {
    const pl = sState.play;
    if (!pl) return;
    if (pl.idx + 1 < pl.questions.length) {
      pl.idx++;
      pl.selected = [];
      pl.locked = false;
      pl.lastOk = null;
      startQuestionClock();
      render();
      return;
    }
    // Check Redemption Question (Silver+)
    if (!pl.redemptionDone && sState.lobby.redemption && U().can("studioAdv")) {
      const wrongQs = pl.records.filter(function (r) { return !r.ok; }).map(function (r) { return r.q; });
      if (wrongQs.length > 0) {
        pl.redemptionMode = true;
        pl.redemptionDone = true;
        pl.questions = wrongQs.slice(0, 3); // up to 3 redemption questions
        pl.idx = 0;
        pl.selected = [];
        pl.locked = false;
        pl.lastOk = null;
        U().showToast("🔥 Câu hỏi cứu vớt (Redemption)! Làm lại " + pl.questions.length + " câu sai để gỡ điểm!", "info");
        startQuestionClock();
        render();
        return;
      }
    }
    finishPlay();
  }

  function finishPlay() {
    stopStudioTimer();
    const pl = sState.play;
    if (!pl) return;
    const total = pl.records.length || 1;
    const score10 = ((pl.correctCount / total) * 10).toFixed(2);
    if (pl.sessionMeta && sState.quiz) {
      markSessionDone(sState.quiz.id, pl.sessionMeta.perSession, pl.sessionMeta.idx);
    }
    const sessSuffix = pl.sessionMeta ? (" – Phiên " + pl.sessionMeta.idx + "/" + pl.sessionMeta.totalSessions) : "";
    U().recordStats(sState.quiz ? (sState.quiz.deckId || sState.quiz.id) : "studio", total, pl.correctCount);
    U().saveExamHistory({
      deckId: sState.quiz ? sState.quiz.id : "studio",
      deckTitle: (sState.quiz ? sState.quiz.title : "Quiz Studio") + sessSuffix + " (Studio)",
      date: new Date().toISOString(),
      score: score10,
      correct: pl.correctCount,
      total: total
    });
    sState.screen = "summary";
    render();
  }

  function renderPlay(root) {
    const pl = sState.play;
    if (!pl) return;
    const q = pl.questions[pl.idx];
    const total = pl.questions.length;
    const pct = Math.round(((pl.idx + (pl.locked ? 1 : 0)) / total) * 100);
    const lb = sState.lobby;
    const showFull = pl.locked && lb.showAnswer === "full";
    const showRW = pl.locked && (lb.showAnswer === "full" || lb.showAnswer === "right_wrong");

    let h = '<div class="qz-player-shell">' +
      (pl.redemptionMode ? '<div class="pending-banner" style="margin:0">🔥 <strong>Vòng Cứu vớt (Redemption Question):</strong> Trả lời đúng để gỡ lại câu bạn vừa làm sai!</div>' : "") +
      '<div class="qz-topbar">' +
        '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:160px">' +
          (pl.sessionMeta ? '<span class="badge badge-warn">Phiên ' + pl.sessionMeta.idx + "/" + pl.sessionMeta.totalSessions + '</span>' : "") +
          '<span class="badge">' + (pl.idx + 1) + "/" + total + '</span>' +
          '<div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        (q.time > 0 ? '<span class="qz-timer' + (pl.remSec > 0 && pl.remSec < 5 ? " danger" : "") + '" id="qzTimerBox">⏱ ' + pl.remSec + 's</span>' : '<span class="badge">∞ Không giới hạn</span>') +
        (lb.streak && U().can("studioAdv") ? '<span class="qz-streak">🔥 Streak ' + pl.streak + '</span>' : "") +
        '<span class="badge badge-ok" style="font-size:.9rem">⭐ ' + pl.score + ' điểm</span>' +
        '<button type="button" class="btn btn-outline btn-sm" data-sact="quit-play">Thoát</button>' +
      '</div>' +

      '<div class="qz-question-box">' +
        '<div class="muted" style="font-size:.82rem;margin-bottom:6px">' + (q.type === "multiple" ? "Chọn nhiều đáp án rồi bấm Xác nhận (Enter)" : "Chọn một đáp án (phím tắt 1–" + q.options.length + ")") + '</div>' +
        '<div class="q-text rich-text">' + U().renderRich(q.text) + '</div>' +
        (q.image ? '<img src="' + U().esc(q.image) + '" alt="" style="max-height:260px;max-width:100%;border-radius:12px" onerror="this.style.display=\'none\'">' : "") +
      '</div>' +

      '<div class="qz-tiles">' + q.options.map(function (opt, k) {
        const isSel = pl.selected.indexOf(k) !== -1;
        const isCor = q.correct.indexOf(k) !== -1;
        let cls = "c" + (k % 5);
        if (showFull) {
          if (isCor) cls += " is-correct";
          else if (isSel) cls += " is-wrong";
          else cls += " dim";
        } else if (showRW) {
          if (isSel) cls += pl.lastOk ? " is-correct" : " is-wrong";
          else cls += " dim";
        } else if (isSel) cls += " selected";
        return '<button type="button" class="qz-tile ' + cls + '" data-sact="pick-opt" data-opt="' + k + '"' + (pl.locked ? " disabled" : "") + '>' +
          '<span class="qz-key">' + (k + 1) + '</span><span class="rich-text" style="flex:1">' + U().renderRich(opt) + '</span></button>';
      }).join("") + '</div>';

    if (!pl.locked && q.type === "multiple") {
      h += '<div style="text-align:center"><button type="button" class="btn btn-emerald" data-sact="submit-multi"' + (pl.selected.length === 0 ? " disabled" : "") + '>Xác nhận đáp án (Enter)</button></div>';
    }
    if (pl.locked) {
      if (showRW) {
        h += '<div class="feedback ' + (pl.lastOk ? "ok" : "bad") + '" style="text-align:center">' + (pl.lastOk ? "🎉 Chính xác!" : "❌ Chưa chính xác!") + '</div>';
      }
      if (lb.showExplain && q.explanation) {
        h += '<div class="explain-box rich-text"><strong>Giải thích:</strong> ' + U().renderRich(q.explanation) + '</div>';
      }
      h += '<div style="text-align:center"><button type="button" class="btn btn-primary" data-sact="next-q">Câu tiếp theo → (Enter)</button></div>';
    }
    h += '</div>';
    root.innerHTML = h;
  }

  /* ======================== SUMMARY SCREEN ======================== */
  function renderSummary(root) {
    const pl = sState.play;
    if (!pl) { sState.screen = "home"; renderHome(root); return; }
    const total = pl.records.length || 1;
    const acc = Math.round((pl.correctCount / total) * 100);
    const avgSec = (pl.totalTimeMs / Math.max(1, pl.records.length) / 1000).toFixed(1);
    const wrongCount = pl.records.filter(function (r) { return !r.ok; }).length;

    const sm = pl.sessionMeta;
    const hasNextSess = sm && sm.idx < sm.totalSessions;
    let h = '<div class="panel" style="max-width:920px;margin:0 auto">' +
      '<div style="text-align:center;margin-bottom:18px"><h2>🏆 Tổng kết Quiz – ' + U().esc(sState.quiz ? sState.quiz.title : "") + (sm ? (' <span class="badge">Phiên ' + sm.idx + "/" + sm.totalSessions + '</span>') : "") + '</h2></div>' +
      '<div class="kpi-grid">' +
        '<div class="kpi-card"><span class="kpi-label">Độ chính xác</span><span class="kpi-value" style="color:var(--emerald)">' + acc + '%</span></div>' +
        '<div class="kpi-card"><span class="kpi-label">Tổng điểm</span><span class="kpi-value">' + pl.score + '</span></div>' +
        '<div class="kpi-card"><span class="kpi-label">Đúng / Sai / Bỏ qua</span><span class="kpi-value" style="font-size:1.35rem">' + pl.correctCount + ' / ' + pl.wrongCount + ' / ' + pl.skippedCount + '</span></div>' +
        '<div class="kpi-card"><span class="kpi-label">Streak dài nhất · TB/câu</span><span class="kpi-value" style="font-size:1.35rem">🔥 ' + pl.maxStreak + ' · ' + avgSec + 's</span></div>' +
      '</div>' +
      '<div class="deck-actions" style="justify-content:center;margin-bottom:20px">' +
        (hasNextSess ? '<button type="button" class="btn btn-primary" data-sact="next-session">▶ Làm tiếp Phiên ' + (sm.idx + 1) + "/" + sm.totalSessions + '</button>' : "") +
        (wrongCount > 0 ? '<button type="button" class="btn btn-danger" data-sact="retry-wrong">🔁 Làm lại các câu sai (' + wrongCount + ')</button>' : "") +
        '<button type="button" class="btn btn-emerald" data-sact="retry-all">🔄 Làm lại phiên này</button>' +
        '<button type="button" class="btn btn-outline" data-sact="back-lobby">⚙️ Chọn phiên khác</button>' +
        '<button type="button" class="btn btn-outline" data-sact="back-editor">✏️ Quay lại Editor</button>' +
      '</div>';

    if (sState.lobby.allowReview) {
      h += '<h3>Xem lại chi tiết từng câu</h3><div class="list">' + pl.records.map(function (rec, idx) {
        const q = rec.q;
        const userAns = rec.selected.length ? rec.selected.map(function (i) { return U().LETTERS.charAt(i) + ". " + q.options[i]; }).join(" | ") : "Chưa trả lời";
        const corrAns = q.correct.map(function (i) { return U().LETTERS.charAt(i) + ". " + q.options[i]; }).join(" | ");
        return '<div class="deck-row" style="border-left:5px solid ' + (rec.ok ? "var(--emerald)" : "var(--rose)") + '">' +
          '<div class="deck-title-line"><strong class="rich-text">Câu ' + (idx + 1) + ": " + U().renderRich(q.text) + '</strong>' +
          '<span class="badge ' + (rec.ok ? "badge-ok" : "badge-bad") + '">' + (rec.redeemed ? "🔥 Đã cứu vớt" : (rec.ok ? "Đúng" : "Sai")) + '</span></div>' +
          '<div class="rich-text" style="font-size:.84rem"><strong>Bạn chọn:</strong> ' + U().renderRich(userAns) + '</div>' +
          '<div class="rich-text" style="font-size:.84rem;color:var(--emerald)"><strong>Đáp án đúng:</strong> ' + U().renderRich(corrAns) + '</div>' +
          (q.explanation ? '<div class="muted rich-text" style="font-size:.82rem"><strong>Giải thích:</strong> ' + U().renderRich(q.explanation) + '</div>' : "") +
        '</div>';
      }).join("") + '</div>';
    }
    h += '</div>';
    root.innerHTML = h;
  }

  /* ======================== EVENTS & SHORTCUTS ======================== */
  function onStudioClick(e) {
    const b = e.target.closest ? e.target.closest("[data-sact]") : null;
    if (!b || b.disabled) return;
    const act = b.getAttribute("data-sact");
    if (act === "new-manual") { sState.quiz = newEmptyQuiz(); sState.screen = "editor"; render(); }
    else if (act === "import-deck") {
      const sel = U().$("stPickDeck");
      const d = sel ? U().getDeck(sel.value) : null;
      if (d) openFromDeck(d);
    }
    else if (act === "import-conv") {
      const qs = window.UETConverter ? window.UETConverter.getValidQuestions() : [];
      if (qs.length) openFromQuestions("Quiz từ AI Converter", "AI Converter", qs);
    }
    else if (act === "edit-saved") {
      const qz = loadQuizzes().find(function (x) { return x && x.id === b.getAttribute("data-id"); });
      if (qz) { sState.quiz = JSON.parse(JSON.stringify(qz)); sState.screen = "editor"; render(); }
    }
    else if (act === "play-saved") {
      const qz = loadQuizzes().find(function (x) { return x && x.id === b.getAttribute("data-id"); });
      if (qz) { sState.quiz = JSON.parse(JSON.stringify(qz)); initLobbyDefaultsForQuiz(sState.quiz); sState.screen = "lobby"; render(); }
    }
    else if (act === "del-saved") {
      const id = b.getAttribute("data-id");
      U().showConfirm("Xóa Quiz", "Xóa Quiz này khỏi Creator Studio?", function () {
        saveQuizzes(loadQuizzes().filter(function (x) { return x && x.id !== id; }));
        render();
      });
    }
    else if (act === "back-home") { stopStudioTimer(); sState.screen = "home"; render(); }
    else if (act === "back-editor") { stopStudioTimer(); sState.screen = "editor"; render(); }
    else if (act === "batch-time") {
      const t = parseInt(U().$("stBatchTime") ? U().$("stBatchTime").value : "30", 10);
      if (sState.quiz) { sState.quiz.questions.forEach(function (q) { q.time = t; }); render(); U().showToast("Đã đặt thời gian hàng loạt cho tất cả câu.", "success"); }
    }
    else if (act === "save-quiz") saveCurrentQuiz();
    else if (act === "save-deck") saveQuizToDeckBank();
    else if (act === "share-cur") {
      if (sState.quiz && window.UETCloud) window.UETCloud.openShareModal(sState.quiz);
    }
    else if (act === "pdf-cur") {
      if (sState.quiz && window.UETCloud) window.UETCloud.openPdfModal(sState.quiz);
    }
    else if (act === "share-saved") {
      const qz = loadQuizzes().find(function (x) { return x && x.id === b.getAttribute("data-id"); });
      if (qz && window.UETCloud) window.UETCloud.openShareModal(qz);
    }
    else if (act === "pdf-saved") {
      const qz = loadQuizzes().find(function (x) { return x && x.id === b.getAttribute("data-id"); });
      if (qz && window.UETCloud) window.UETCloud.openPdfModal(qz);
    }
    else if (act === "go-lobby") {
      const tEl = U().$("stQuizTitle"), tagEl = U().$("stQuizTag");
      if (tEl && sState.quiz) sState.quiz.title = tEl.value.trim() || sState.quiz.title;
      if (tagEl && sState.quiz) sState.quiz.tag = tagEl.value.trim() || sState.quiz.tag;
      initLobbyDefaultsForQuiz(sState.quiz);
      sState.screen = "lobby"; render();
    }
    else if (act === "back-lobby") { stopStudioTimer(); sState.screen = "lobby"; render(); }
    else if (act === "split-mode") { sState.lobby.splitMode = b.getAttribute("data-val"); render(); }
    else if (act === "sess-preset") { sState.lobby.perSession = parseInt(b.getAttribute("data-val"), 10) || 50; sState.lobby.sessionIdx = 1; render(); }
    else if (act === "pick-sess") { sState.lobby.sessionIdx = parseInt(b.getAttribute("data-sess"), 10) || 1; render(); }
    else if (act === "rand-preset") { sState.lobby.randomCount = parseInt(b.getAttribute("data-val"), 10) || 20; render(); }
    else if (act === "next-session") {
      if (sState.play && sState.play.sessionMeta) {
        sState.lobby.splitMode = "sessions";
        sState.lobby.perSession = sState.play.sessionMeta.perSession;
        sState.lobby.sessionIdx = sState.play.sessionMeta.idx + 1;
        startPlaySession();
      }
    }
    else if (act === "add-q") openQuestionBuilder(-1);
    else if (act === "edit-q") openQuestionBuilder(Number(b.getAttribute("data-idx")));
    else if (act === "dup-q") {
      const i = Number(b.getAttribute("data-idx"));
      if (sState.quiz && sState.quiz.questions[i]) {
        const copy = JSON.parse(JSON.stringify(sState.quiz.questions[i]));
        copy.id = "sq_" + Date.now();
        sState.quiz.questions.splice(i + 1, 0, copy);
        render();
      }
    }
    else if (act === "del-q") {
      const i = Number(b.getAttribute("data-idx"));
      if (sState.quiz) { sState.quiz.questions.splice(i, 1); render(); }
    }
    else if (act === "start-play") startPlaySession();
    else if (act === "pick-opt") {
      const pl = sState.play; if (!pl || pl.locked) return;
      const q = pl.questions[pl.idx];
      const opt = Number(b.getAttribute("data-opt"));
      if (q.type === "multiple") {
        const p = pl.selected.indexOf(opt);
        if (p === -1) pl.selected.push(opt); else pl.selected.splice(p, 1);
        render();
      } else {
        pl.selected = [opt];
        submitPlayAnswer(false);
      }
    }
    else if (act === "submit-multi") submitPlayAnswer(false);
    else if (act === "next-q") advancePlayQuestion();
    else if (act === "quit-play") {
      U().showConfirm("Thoát Quiz", "Bạn có chắc muốn thoát phiên làm bài hiện tại?", function () { stopStudioTimer(); sState.screen = "editor"; render(); });
    }
    else if (act === "retry-wrong") {
      const wrongQs = sState.play ? sState.play.records.filter(function (r) { return !r.ok; }).map(function (r) { return r.q; }) : [];
      if (wrongQs.length) startPlaySession(wrongQs);
    }
    else if (act === "retry-all") startPlaySession();
  }

  function onStudioChange(e) {
    const t = e.target;
    if (!t) return;
    if (t.getAttribute("data-sact") === "q-time") {
      const q = sState.quiz && sState.quiz.questions[Number(t.getAttribute("data-idx"))];
      if (q) q.time = parseInt(t.value, 10) || 0;
    }
    else if (t.id === "lbPerSession") { sState.lobby.perSession = Math.max(1, parseInt(t.value, 10) || 50); sState.lobby.sessionIdx = 1; render(); }
    else if (t.id === "lbSessionIdx") { sState.lobby.sessionIdx = Math.max(1, parseInt(t.value, 10) || 1); render(); }
    else if (t.id === "lbRandomCount") { sState.lobby.randomCount = Math.max(1, parseInt(t.value, 10) || 20); render(); }
    else if (t.id === "lbTimeMode") { sState.lobby.timeMode = t.value; render(); }
    else if (t.id === "lbUniformSec") sState.lobby.uniformSec = Math.max(5, parseInt(t.value, 10) || 30);
    else if (t.id === "lbShowAnswer") sState.lobby.showAnswer = t.value;
    else if (t.id === "lbShowExplain") sState.lobby.showExplain = t.checked;
    else if (t.id === "lbAllowReview") sState.lobby.allowReview = t.checked;
    else if (t.id === "lbShuffleQ") sState.lobby.shuffleQ = t.checked;
    else if (t.id === "lbShuffleO") sState.lobby.shuffleO = t.checked;
    else if (t.id === "lbSound") sState.lobby.sound = t.checked;
    else if (t.id === "lbStreak") sState.lobby.streak = t.checked;
    else if (t.id === "lbRedemption") sState.lobby.redemption = t.checked;
  }

  function onKeyDown(e) {
    if (sState.screen !== "play" || !sState.play) return false;
    const pl = sState.play;
    const q = pl.questions[pl.idx];
    if (!q) return false;
    if (/^[1-5]$/.test(e.key) && !pl.locked) {
      const opt = Number(e.key) - 1;
      if (opt < q.options.length) {
        e.preventDefault();
        if (q.type === "multiple") {
          const p = pl.selected.indexOf(opt);
          if (p === -1) pl.selected.push(opt); else pl.selected.splice(p, 1);
          render();
        } else { pl.selected = [opt]; submitPlayAnswer(false); }
        return true;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (pl.locked) advancePlayQuestion();
      else if (q.type === "multiple" && pl.selected.length > 0) submitPlayAnswer(false);
      return true;
    }
    return false;
  }

  function openLobbyFromDeck(deck) {
    if (!deck) return;
    openFromDeck(deck);
    initLobbyDefaultsForQuiz(sState.quiz);
    sState.screen = "lobby";
    render();
  }

  window.UETStudio = {
    render: render,
    applySubRoute: applySubRoute,
    openFromDeck: openFromDeck,
    openLobbyFromDeck: openLobbyFromDeck,
    openFromQuestions: openFromQuestions,
    onKeyDown: onKeyDown
  };
})();
