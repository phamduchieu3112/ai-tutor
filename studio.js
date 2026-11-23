/* ============================================================
   UET Master – Creator Studio / Quiz Studio (studio.js)
   Quizizz / Wayground-grade Editor, Lobby, Player & Summary
   ============================================================ */
(function () {
  "use strict";

  const TIME_OPTIONS = [
    [5, "5 gi\u00e2y"], [10, "10 gi\u00e2y"], [15, "15 gi\u00e2y"], [20, "20 gi\u00e2y"], [30, "30 gi\u00e2y"],
    [45, "45 gi\u00e2y"], [60, "60 gi\u00e2y"], [120, "2 ph\u00fat"], [180, "3 ph\u00fat"], [300, "5 ph\u00fat"], [0, "Kh\u00f4ng gi\u1edbi h\u1ea1n"]
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
      redemption: false,
      advOpen: false
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
      title: "Quiz m\u1edbi",
      tag: "T\u1ed5ng h\u1ee3p",
      isPublic: true,
      shareCode: "",
      questions: []
    };
  }

  function openFromDeck(deck) {
    if (!deck) return;
    stopStudioTimer();
    sState.quiz = Object.assign({}, deck, {
      id: deck.id && String(deck.id).indexOf("qz_") === 0 ? deck.id : ("qz_deck_" + deck.id),
      deckId: deck.id,
      title: deck.title,
      tag: deck.tag || "T\u1ed5ng h\u1ee3p",
      isPublic: typeof deck.isPublic === "boolean" ? deck.isPublic : true,
      shareCode: deck.shareCode || "",
      questions: deck.questions.map(function (q, i) {
        return Object.assign({}, q, {
          id: q.id || ("sq_" + i),
          text: q.text,
          type: q.type === "multiple" ? "multiple" : "single",
          options: q.options.slice(),
          correct: q.correct.slice(),
          time: Number.isFinite(Number(q.time)) ? Number(q.time) : 30,
          image: q.image || "",
          explanation: q.explanation || ""
        });
      })
    });
    sState.screen = "editor";
    U().showTab("studio");
  }

  function openFromQuestions(title, tag, items) {
    stopStudioTimer();
    sState.quiz = {
      id: "qz_" + Date.now(),
      title: title || "Quiz t\u1eeb AI Converter",
      tag: tag || "T\u1ed5ng h\u1ee3p",
      isPublic: true,
      shareCode: "",
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
    const tEl = U().$("stQuizTitle"), tagEl = U().$("stQuizTag"), visEl = U().$("stQuizVis");
    if (tEl) qz.title = tEl.value.trim() || "Quiz kh\u00f4ng t\u00ean";
    if (tagEl) qz.tag = tagEl.value.trim() || "T\u1ed5ng h\u1ee3p";
    if (visEl) qz.isPublic = visEl.value === "public";
    else if (typeof qz.isPublic !== "boolean") qz.isPublic = true;
    if (qz.questions.length === 0) { U().showToast("H\u00e3y th\u00eam \u00edt nh\u1ea5t 1 c\u00e2u h\u1ecfi tr\u01b0\u1edbc khi l\u01b0u Quiz.", "warning"); return; }
    const list = loadQuizzes().filter(function (x) { return x && x.id !== qz.id; });
    list.unshift(Object.assign({}, qz, { updatedAt: new Date().toISOString() }));
    saveQuizzes(list);
    U().showToast("\u0110\u00e3 l\u01b0u Quiz \"" + qz.title + "\" (" + (qz.isPublic ? "🌐 Public" : "🔒 Private") + ") v\u00e0o Creator Studio!", "success");
  }

  function saveQuizToDeckBank() {
    const qz = sState.quiz;
    if (!qz || qz.questions.length === 0) { U().showToast("Quiz ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi n\u00e0o.", "warning"); return; }
    const tEl = U().$("stQuizTitle"), tagEl = U().$("stQuizTag");
    if (tEl) qz.title = tEl.value.trim() || qz.title;
    if (tagEl) qz.tag = tagEl.value.trim() || qz.tag;
    U().addOrMergeDeck({ mode: "new", title: qz.title, tag: qz.tag, questions: qz.questions });
  }

  const STUDIO_ROUTE_MAP = {
    home: ["/creator-studio", "Creator Studio | AI Tutor"],
    editor: ["/creator-studio/editor", "Tr\u00ecnh so\u1ea1n th\u1ea3o Quiz | AI Tutor"],
    lobby: ["/creator-studio/lobby", "C\u00e0i \u0111\u1eb7t Quiz | AI Tutor"],
    play: ["/creator-studio/play", "\u0110ang ch\u01a1i Quiz | AI Tutor"],
    summary: ["/creator-studio/summary", "T\u1ed5ng k\u1ebft Quiz | AI Tutor"],
    students: ["/creator-studio/students", "H\u1ecdc sinh & L\u1edbp h\u1ecdc | AI Tutor"],
    assignments: ["/creator-studio/assignments", "Giao b\u00e0i t\u1eadp | AI Tutor"],
    gradebook: ["/creator-studio/gradebook", "S\u1ed5 \u0111i\u1ec3m & Ph\u00e2n t\u00edch | AI Tutor"],
    "student-assign": ["/creator-studio/assignment", "L\u00e0m b\u00e0i t\u1eadp | AI Tutor"],
    "parent-receipt": ["/creator-studio/receipt", "X\u00e1c nh\u1eadn k\u1ebft qu\u1ea3 | AI Tutor"]
  };
  function syncStudioRoute(replace) {
    if (!U() || U().state.tab !== "studio") return;
    const entry = STUDIO_ROUTE_MAP[sState.screen] || STUDIO_ROUTE_MAP.home;
    const curPath = (window.location.pathname || "").toLowerCase();
    // Keep /quiz?code=... URL intact when playing a shared link in Lobby
    if (curPath === "/quiz" && sState.screen === "lobby") {
      document.title = "L\u00e0m b\u00e0i chia s\u1ebb | AI Tutor";
      return;
    }
    if ((window.location.search || "").indexOf("assign=") !== -1 && sState.screen === "student-assign") return;
    if ((window.location.search || "").indexOf("receipt=") !== -1 && sState.screen === "parent-receipt") return;
    if (typeof U().syncHistory === "function") U().syncHistory(entry[0], entry[1], !!replace);
  }
  function applySubRoute(sub) {
    if (sub === "home" || sub === "students" || sub === "assignments" || sub === "gradebook" || sub === "student-assign" || sub === "parent-receipt") {
      stopStudioTimer();
      sState.screen = sub;
      return;
    }
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
    else if (sState.screen === "students" && window.UETLms) window.UETLms.renderStudentsView(root);
    else if (sState.screen === "assignments" && window.UETLms) window.UETLms.renderAssignmentsView(root);
    else if (sState.screen === "gradebook" && window.UETLms) window.UETLms.renderGradebookView(root);
    else if (sState.screen === "student-assign" && window.UETLms) window.UETLms.renderStudentAssignmentView(root);
    else if (sState.screen === "parent-receipt" && window.UETLms) window.UETLms.renderParentReceiptView(root);

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

    let h = (window.UETLms && typeof window.UETLms.renderStudioSubnav === "function" ? window.UETLms.renderStudioSubnav("home") : "") +
      '<div class="panel" style="margin-bottom:16px">' +
      '<div class="panel-head"><div><h2>🎮 Creator Studio / Quiz Studio</h2>' +
      '<p class="muted" style="margin:0;font-size:.86rem">Tr\u00ecnh t\u1ea1o &amp; ch\u01a1i Quiz t\u01b0\u01a1ng t\u00e1c chu\u1ea9n Quizizz / Wayground (KaTeX, Streak, Redemption, th\u1eddi gian t\u1eebng c\u00e2u).</p></div></div>' +
      '<div class="admin-grid" style="margin:12px 0 0">' +
        '<div class="deck-row"><strong>✍️ T\u1ea1o Quiz th\u1ee7 c\u00f4ng</strong><span class="muted" style="font-size:.8rem">T\u1ef1 so\u1ea1n t\u1eebng c\u00e2u h\u1ecfi v\u1edbi toolbar B/I/U, LaTeX &amp; \u1ea3nh</span>' +
          '<button type="button" class="btn btn-primary btn-sm" data-sact="new-manual">T\u1ea1o Quiz m\u1edbi</button></div>' +
        '<div class="deck-row"><strong>📚 L\u1ea5y t\u1eeb Kho \u0111\u1ec1 AI Tutor</strong><span class="muted" style="font-size:.8rem">Hi\u1ec7n c\u00f3 ' + decks.length + ' b\u1ed9 \u0111\u1ec1 trong Kho \u0111\u1ec1</span>' +
          (decks.length ? '<div style="display:flex;gap:6px"><select id="stPickDeck" style="flex:1;padding:6px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text)">' +
            decks.map(function (d) { return '<option value="' + U().esc(d.id) + '">' + U().esc(d.title) + ' (' + d.questions.length + ' c\u00e2u)</option>'; }).join("") +
            '</select><button type="button" class="btn btn-primary btn-sm" data-sact="import-deck">M\u1edf</button></div>' : '<span class="muted" style="font-size:.78rem">Ch\u01b0a c\u00f3 b\u1ed9 \u0111\u1ec1 n\u00e0o</span>') +
        '</div>' +
        '<div class="deck-row"><strong>✨ Nh\u1eadp t\u1eeb AI Converter</strong><span class="muted" style="font-size:.8rem">Hi\u1ec7n c\u00f3 ' + convCount + ' c\u00e2u h\u1ee3p l\u1ec7 trong AI Converter</span>' +
          '<button type="button" class="btn btn-emerald btn-sm" data-sact="import-conv"' + (convCount === 0 ? " disabled" : "") + '>L\u1ea5y t\u1eeb AI Converter (' + convCount + ')</button></div>' +
      '</div></div>';

    h += '<div class="panel"><div class="panel-head"><h2>Danh s\u00e1ch Quiz \u0111\u00e3 t\u1ea1o (' + quizzes.length + ')</h2></div>';
    if (quizzes.length === 0) {
      h += '<div class="empty-state">B\u1ea1n ch\u01b0a l\u01b0u Quiz n\u00e0o trong Creator Studio. H\u00e3y t\u1ea1o m\u1edbi ho\u1eb7c ch\u1ecdn t\u1eeb Kho \u0111\u1ec1 \u1edf tr\u00ean!</div>';
    } else {
      h += '<div class="list">' + quizzes.map(function (qz) {
        const isPub = qz.isPublic !== false;
        return '<div class="deck-row"><div class="deck-title-line"><span class="deck-title">' + U().esc(qz.title) + '</span>' +
          '<span class="badge">' + U().esc(qz.tag || "T\u1ed5ng h\u1ee3p") + '</span>' +
          '<span class="badge ' + (isPub ? "badge-ok" : "badge-warn") + '">' + (isPub ? "🌐 Public" : "🔒 Private") + '</span>' +
          (qz.shareCode ? '<span class="badge">🔑 ' + U().esc(qz.shareCode) + '</span>' : '') +
          '</div>' +
          '<div class="deck-sub"><span>' + (qz.questions ? qz.questions.length : 0) + ' c\u00e2u h\u1ecfi</span>' + (qz.updatedAt ? '<span>C\u1eadp nh\u1eadt: ' + U().esc(U().fmtDateTime(qz.updatedAt)) + '</span>' : "") + '</div>' +
          '<div class="deck-actions">' +
            '<button type="button" class="btn btn-emerald btn-sm" data-sact="play-saved" data-id="' + U().esc(qz.id) + '">▶ B\u1eaft \u0111\u1ea7u l\u00e0m b\u00e0i (Play)</button>' +
            '<button type="button" class="btn btn-primary btn-sm" data-sact="assign-saved" data-id="' + U().esc(qz.id) + '">Giao b\u00e0i</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-sact="edit-saved" data-id="' + U().esc(qz.id) + '">Ch\u1ec9nh s\u1eeda</button>' +
            '<select data-sact="card-vis" data-id="' + U().esc(qz.id) + '" aria-label="Quy\u1ec1n truy c\u1eadp Quiz" style="padding:5px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:.78rem;font-weight:700">' +
              '<option value="public"' + (isPub ? " selected" : "") + '>🌐 Public</option>' +
              '<option value="private"' + (!isPub ? " selected" : "") + '>🔒 Private</option>' +
            '</select>' +
            (!isPub ? '<button type="button" class="btn btn-emerald btn-sm" data-sact="switch-pub-copy" data-id="' + U().esc(qz.id) + '">🌐 Switch to Public &amp; Copy Link</button>' : '') +
            '<button type="button" class="btn btn-outline btn-sm" data-sact="share-saved" data-id="' + U().esc(qz.id) + '">🔗 Chia s\u1ebb</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-sact="pdf-saved" data-id="' + U().esc(qz.id) + '">🖨️ Xu\u1ea5t PDF</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-sact="del-saved" data-id="' + U().esc(qz.id) + '">X\u00f3a</button>' +
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
    const advLock = U().can("studioAdv") ? "" : " (⏱️ Tu\u1ef3 ch\u1ec9nh th\u1eddi gian ri\u00eang m\u1edf kh\u00f3a \u0111\u1ea7y \u0111\u1ee7 t\u1eeb g\u00f3i Silver)";

    let h = '<div class="studio-header">' +
      '<button type="button" class="btn btn-outline btn-sm" data-sact="back-home">← Danh s\u00e1ch</button>' +
      '<input type="text" id="stQuizTitle" value="' + U().esc(qz.title) + '" placeholder="T\u00ean Quiz..." style="flex:1;min-width:180px;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-weight:700">' +
      '<input type="text" id="stQuizTag" value="' + U().esc(qz.tag) + '" placeholder="M\u00f4n h\u1ecdc / Tag" style="width:140px;padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--text)">' +
      '<select id="stQuizVis" aria-label="Quy\u1ec1n truy c\u1eadp Quiz" style="padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:.82rem;font-weight:700">' +
        '<option value="public"' + (qz.isPublic !== false ? " selected" : "") + '>🌐 Public</option>' +
        '<option value="private"' + (qz.isPublic === false ? " selected" : "") + '>🔒 Private</option>' +
      '</select>' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        timeSelectHTML(30, 'id="stBatchTime" aria-label="Th\u1eddi gian h\u00e0ng lo\u1ea1t"') +
        '<button type="button" class="btn btn-outline btn-sm" data-sact="batch-time">\u0110\u1eb7t th\u1eddi gian h\u00e0ng lo\u1ea1t</button>' +
      '</div>' +
      '<button type="button" class="btn btn-outline btn-sm" data-sact="save-deck">L\u01b0u v\u00e0o Kho \u0111\u1ec1</button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-sact="share-cur"' + (qz.questions.length === 0 ? " disabled" : "") + '>🔗 Chia s\u1ebb</button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-sact="pdf-cur"' + (qz.questions.length === 0 ? " disabled" : "") + '>🖨️ Xu\u1ea5t PDF</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-sact="save-quiz">💾 L\u01b0u Quiz</button>' +
      '<button type="button" class="btn btn-emerald btn-sm" data-sact="go-lobby"' + (qz.questions.length === 0 ? " disabled" : "") + '>▶ B\u1eaft \u0111\u1ea7u l\u00e0m b\u00e0i (Play)</button>' +
    '</div>';

    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
      '<span class="muted" style="font-size:.84rem">T\u1ed5ng c\u1ed9ng <strong>' + qz.questions.length + '</strong> c\u00e2u h\u1ecfi' + advLock + '</span>' +
      '<button type="button" class="btn btn-primary" data-sact="add-q">+ Th\u00eam c\u00e2u h\u1ecfi m\u1edbi</button>' +
    '</div>';

    if (qz.questions.length === 0) {
      h += '<div class="panel"><div class="empty-state">Quiz n\u00e0y ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi n\u00e0o. Nh\u1ea5n <strong>+ Th\u00eam c\u00e2u h\u1ecfi m\u1edbi</strong> \u0111\u1ec3 m\u1edf Question Builder chu\u1ea9n Quizizz!</div></div>';
    } else {
      h += '<div class="list">' + qz.questions.map(function (q, idx) {
        const opts = q.options.map(function (o, k) {
          const ok = q.correct.indexOf(k) !== -1;
          return '<div class="studio-opt-pill"><span class="opt-dot' + (ok ? " ok" : "") + '"></span><span class="rich-text">' + U().renderRich(o) + '</span></div>';
        }).join("");
        return '<article class="studio-q-card">' +
          '<div class="studio-q-head">' +
            '<div style="display:flex;align-items:center;gap:8px"><span class="badge">C\u00e2u ' + (idx + 1) + '</span><span class="muted" style="font-size:.78rem">' + (q.type === "multiple" ? "Nhi\u1ec1u \u0111\u00e1p \u00e1n" : "1 \u0111\u00e1p \u00e1n") + '</span></div>' +
            '<div class="deck-actions">' +
              timeSelectHTML(q.time, 'data-sact="q-time" data-idx="' + idx + '" aria-label="Th\u1eddi gian c\u00e2u ' + (idx + 1) + '"') +
              '<button type="button" class="btn btn-outline btn-sm" data-sact="edit-q" data-idx="' + idx + '">✏️ Ch\u1ec9nh s\u1eeda</button>' +
              '<button type="button" class="btn btn-outline btn-sm" data-sact="dup-q" data-idx="' + idx + '">📋 Nh\u00e2n b\u1ea3n</button>' +
              '<button type="button" class="btn btn-outline btn-sm" data-sact="del-q" data-idx="' + idx + '">🗑 X\u00f3a</button>' +
            '</div>' +
          '</div>' +
          '<div class="rich-text" style="font-weight:700;font-size:1.02rem">' + U().renderRich(q.text) + '</div>' +
          (q.image ? '<img src="' + U().esc(q.image) + '" alt="" style="max-height:160px;border-radius:10px;align-self:flex-start" onerror="this.style.display=\'none\'">' : "") +
          '<div class="studio-opts-grid">' + opts + '</div>' +
          (q.explanation ? '<div class="explain-box rich-text" style="margin-top:4px;font-size:.84rem"><strong>Gi\u1ea3i th\u00edch:</strong> ' + U().renderRich(q.explanation) + '</div>' : "") +
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
        '<h3>' + (isNew ? "T\u1ea1o c\u00e2u h\u1ecfi m\u1edbi (Question Builder)" : ("Ch\u1ec9nh s\u1eeda c\u00e2u #" + (idx + 1))) + '</h3>' +
        '<div class="qb-toolbar">' +
          '<button type="button" data-fmt="b" title="In \u0111\u1eadm"><b>B</b></button>' +
          '<button type="button" data-fmt="i" title="In nghi\u00eang"><i>I</i></button>' +
          '<button type="button" data-fmt="u" title="G\u1ea1ch ch\u00e2n"><u>U</u></button>' +
          '<button type="button" data-fmt="math" title="Ch\u00e8n c\u00f4ng th\u1ee9c To\u00e1n LaTeX">∑ C\u00f4ng th\u1ee9c To\u00e1n (LaTeX)</button>' +
          '<button type="button" data-fmt="img" title="Ch\u00e8n \u1ea3nh">🖼️ Ch\u00e8n link \u1ea3nh</button>' +
          '<select id="qbType" style="margin-left:auto;padding:5px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:.82rem">' +
            '<option value="single"' + (q.type === "single" ? " selected" : "") + '>Single Choice (1 \u0111\u00e1p \u00e1n)</option>' +
            '<option value="multiple"' + (q.type === "multiple" ? " selected" : "") + '>Multiple Choice (Nhi\u1ec1u \u0111\u00e1p \u00e1n)</option>' +
          '</select>' +
          timeSelectHTML(q.time, 'id="qbTime"') +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field" style="margin:0">N\u1ed9i dung c\u00e2u h\u1ecfi<textarea id="qbText" rows="4" placeholder="Nh\u1eadp c\u00e2u h\u1ecfi... (d\u00f9ng $...$ cho c\u00f4ng th\u1ee9c LaTeX, <u>...</u> cho g\u1ea1ch ch\u00e2n)">' + U().esc(q.text) + '</textarea></label>' +
          '<div class="field" style="margin:0"><span>Xem tr\u01b0\u1edbc tr\u1ef1c ti\u1ebfp (KaTeX + HTML)</span><div id="qbPrev" class="rich-text" style="padding:10px;border:1px solid var(--border);border-radius:10px;min-height:92px;background:var(--bg2)">' + U().renderRich(q.text) + '</div></div>' +
        '</div>' +
        '<div id="qbImgRow" class="field' + (q.image ? "" : " hidden") + '">Link h\u00ecnh \u1ea3nh minh h\u1ecda<input type="url" id="qbImage" value="' + U().esc(q.image || "") + '" placeholder="https://..."></div>' +
        '<div class="field" style="margin-top:12px"><span>C\u00e1c ph\u01b0\u01a1ng \u00e1n tr\u1ea3 l\u1eddi (b\u1ea5m n\u00fat tr\u00f2n ✓ \u0111\u1ec3 ch\u1ecdn \u0111\u00e1p \u00e1n \u0111\u00fang)</span></div>' +
        '<div class="qz-builder-grid">' + [0, 1, 2, 3, 4].map(function (k) {
          const on = q.correct.indexOf(k) !== -1;
          return '<div class="qz-opt-box c' + k + '">' +
            '<button type="button" class="qz-tick' + (on ? " on" : "") + '" data-qbtick="' + k + '" title="Ch\u1ecdn \u0111\u00e1p \u00e1n \u0111\u00fang">' + (on ? "✓" : "") + '</button>' +
            '<input type="text" id="qbOpt_' + k + '" value="' + U().esc(q.options[k] || "") + '" placeholder="Ph\u01b0\u01a1ng \u00e1n ' + U().LETTERS.charAt(k) + (k >= 2 ? " (t\u00f9y ch\u1ecdn)" : "") + '">' +
          '</div>';
        }).join("") + '</div>' +
        '<label class="field" style="margin-top:12px">Gi\u1ea3i th\u00edch \u0111\u00e1p \u00e1n (t\u00f9y ch\u1ecdn)<textarea id="qbExp" rows="2" placeholder="Gi\u1ea3i th\u00edch ng\u1eafn g\u1ecdn (h\u1ed7 tr\u1ee3 LaTeX $...$)...">' + U().esc(q.explanation || "") + '</textarea></label>' +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" id="qbCancel">H\u1ee7y</button><button type="button" class="btn btn-primary" id="qbSave">L\u01b0u c\u00e2u h\u1ecfi</button></div>' +
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
        if (f === "b") wrapSel("<b>", "</b>", "ch\u1eef in \u0111\u1eadm");
        else if (f === "i") wrapSel("<i>", "</i>", "ch\u1eef in nghi\u00eang");
        else if (f === "u") wrapSel("<u>", "</u>", "ch\u1eef g\u1ea1ch ch\u00e2n");
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
      if (!text) { U().showToast("Vui l\u00f2ng nh\u1eadp n\u1ed9i dung c\u00e2u h\u1ecfi.", "warning"); return; }
      const opts = [], newCorr = [];
      for (let k = 0; k < 5; k++) {
        const v = U().$("qbOpt_" + k).value.trim();
        if (v) {
          if (q.correct.indexOf(k) !== -1) newCorr.push(opts.length);
          opts.push(v);
        }
      }
      if (opts.length < 2) { U().showToast("C\u1ea7n \u00edt nh\u1ea5t 2 ph\u01b0\u01a1ng \u00e1n tr\u1ea3 l\u1eddi.", "warning"); return; }
      if (newCorr.length === 0) { U().showToast("Vui l\u00f2ng ch\u1ecdn \u00edt nh\u1ea5t 1 \u0111\u00e1p \u00e1n \u0111\u00fang.", "warning"); return; }
      const item = {
        id: q.id, text: text, type: newCorr.length > 1 || U().$("qbType").value === "multiple" ? "multiple" : "single",
        options: opts, correct: newCorr, time: parseInt(U().$("qbTime").value, 10) || 0,
        image: (U().$("qbImage") ? U().$("qbImage").value : "").trim(),
        explanation: (U().$("qbExp") ? U().$("qbExp").value : "").trim()
      };
      if (isNew) qz.questions.push(item); else qz.questions[idx] = item;
      host.innerHTML = "";
      render();
      U().showToast("\u0110\u00e3 c\u1eadp nh\u1eadt c\u00e2u h\u1ecfi.", "success");
    });
  }

  /* ======================== 4.2 QUIZ LOBBY / SETTINGS ======================== */
  const QL_ICONS = {
    arrowLeft: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>',
    chevronDown: '<svg class="ql-acc-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>',
    lock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    play: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>'
  };

  function qlSwitch(id, checked, disabled) {
    return '<span class="ql-switch">' +
      '<input type="checkbox" id="' + id + '"' + (checked ? " checked" : "") + (disabled ? " disabled" : "") + '>' +
      '<span class="ql-slider"></span>' +
    '</span>';
  }

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
          (doneMap[String(c)] ? "✓ " : "") + "Phi\u00ean " + c + "/" + info.totalSessions + " (C\u00e2u " + s + "–" + e + " · " + cnt + " c\u00e2u)</option>";
      }
      sessionPickerHtml =
        '<div class="ql-grid-2">' +
          '<div class="ql-field">' +
            '<div class="ql-field-head">' +
              '<label class="ql-field-label" for="lbPerSession">S\u1ed1 c\u00e2u m\u1ed7i phi\u00ean</label>' +
              '<div class="ql-quick-tags">' +
                [10, 25, 50, 100].map(function (n) {
                  return '<button type="button" class="ql-tag' + (info.size === n ? " active" : "") + '" data-sact="sess-preset" data-val="' + n + '">' + n + '</button>';
                }).join("") +
              '</div>' +
            '</div>' +
            '<input type="number" class="ql-input" id="lbPerSession" min="1" max="' + total + '" value="' + info.size + '">' +
          '</div>' +
          '<div class="ql-field">' +
            '<div class="ql-field-head">' +
              '<label class="ql-field-label" for="lbSessionIdx">Ch\u1ecdn phi\u00ean</label>' +
            '</div>' +
            '<select class="ql-select" id="lbSessionIdx">' + opts + '</select>' +
          '</div>' +
        '</div>' +
        '<p class="ql-helper">' + U().esc(info.summary) + '</p>';
    } else if (lb.splitMode === "random") {
      const randPresets = [10, 20, 40, 50].filter(function (n) { return n <= total; });
      sessionPickerHtml =
        '<div class="ql-grid-2">' +
          '<div class="ql-field">' +
            '<div class="ql-field-head">' +
              '<label class="ql-field-label" for="lbRandomCount">S\u1ed1 c\u00e2u ng\u1eabu nhi\u00ean</label>' +
              (randPresets.length ? '<div class="ql-quick-tags">' +
                randPresets.map(function (n) {
                  return '<button type="button" class="ql-tag' + (lb.randomCount === n ? " active" : "") + '" data-sact="rand-preset" data-val="' + n + '">' + n + '</button>';
                }).join("") +
              '</div>' : "") +
            '</div>' +
            '<input type="number" class="ql-input" id="lbRandomCount" min="1" max="' + total + '" value="' + lb.randomCount + '">' +
          '</div>' +
        '</div>' +
        '<p class="ql-helper">Ch\u1ecdn ng\u1eabu nhi\u00ean ' + lb.randomCount + ' trong t\u1ed5ng s\u1ed1 ' + total + ' c\u00e2u h\u1ecfi.</p>';
    } else {
      sessionPickerHtml =
        '<p class="ql-helper">L\u00e0m to\u00e0n b\u1ed9 ' + total + ' c\u00e2u h\u1ecfi trong m\u1ed9t phi\u00ean duy nh\u1ea5t.</p>';
    }

    const activeAdvCount =
      (lb.shuffleQ && advOk ? 1 : 0) +
      (lb.shuffleO && advOk ? 1 : 0) +
      (lb.sound ? 1 : 0) +
      (lb.streak && advOk ? 1 : 0) +
      (lb.redemption && advOk ? 1 : 0);

    const sessCount = Math.min(lb.sessionIdx * info.size, total) - (lb.sessionIdx - 1) * info.size;
    const startLabel = lb.splitMode === "sessions"
      ? ("B\u1eaft \u0111\u1ea7u Phi\u00ean " + lb.sessionIdx + "/" + info.totalSessions + " (" + sessCount + " c\u00e2u)")
      : (lb.splitMode === "random"
        ? ("B\u1eaft \u0111\u1ea7u (" + lb.randomCount + " c\u00e2u ng\u1eabu nhi\u00ean)")
        : ("B\u1eaft \u0111\u1ea7u to\u00e0n b\u1ed9 (" + total + " c\u00e2u)"));

    const uniformDisabled = lb.timeMode !== "uniform";

    root.innerHTML =
      '<div class="ql-wrap">' +
        '<div class="ql-card">' +
          /* Section 1: Card Header */
          '<div class="ql-header">' +
            '<div>' +
              '<h2 class="ql-title">C\u00e0i \u0111\u1eb7t tr\u01b0\u1edbc khi l\u00e0m b\u00e0i</h2>' +
              '<p class="ql-subtitle"><span>' + U().esc(qz.title) + '</span><span>·</span><span>' + total + ' c\u00e2u h\u1ecfi</span></p>' +
            '</div>' +
            '<button type="button" class="ql-back-btn" data-sact="back-editor">' + QL_ICONS.arrowLeft + '<span>Quay l\u1ea1i tr\u00ecnh so\u1ea1n th\u1ea3o</span></button>' +
          '</div>' +

          /* Section 2: Quiz Mode & Session Splitting */
          '<div class="ql-section">' +
            '<span class="ql-section-label">Ch\u1ebf \u0111\u1ed9 l\u00e0m b\u00e0i &amp; Chia phi\u00ean</span>' +
            '<div class="ql-seg" role="tablist">' +
              '<button type="button" role="tab" aria-selected="' + (lb.splitMode === "sessions" ? "true" : "false") + '" class="ql-seg-btn' + (lb.splitMode === "sessions" ? " active" : "") + '" data-sact="split-mode" data-val="sessions">Chia phi\u00ean l\u00e0m b\u00e0i</button>' +
              '<button type="button" role="tab" aria-selected="' + (lb.splitMode === "random" ? "true" : "false") + '" class="ql-seg-btn' + (lb.splitMode === "random" ? " active" : "") + '" data-sact="split-mode" data-val="random">Ng\u1eabu nhi\u00ean N c\u00e2u</button>' +
              '<button type="button" role="tab" aria-selected="' + (lb.splitMode === "all" ? "true" : "false") + '" class="ql-seg-btn' + (lb.splitMode === "all" ? " active" : "") + '" data-sact="split-mode" data-val="all">To\u00e0n b\u1ed9 \u0111\u1ec1</button>' +
            '</div>' +
            sessionPickerHtml +
          '</div>' +

          /* Section 3: Time Settings & Answer Feedback */
          '<div class="ql-section">' +
            '<span class="ql-section-label">Th\u1eddi gian &amp; Ph\u1ea3n h\u1ed3i \u0111\u00e1p \u00e1n</span>' +
            '<div class="ql-grid-2 ql-grid-top">' +
              '<div class="ql-field">' +
                '<div class="ql-field-head"><label class="ql-field-label" for="lbTimeMode">Ch\u1ebf \u0111\u1ed9 th\u1eddi gian</label></div>' +
                '<select class="ql-select" id="lbTimeMode">' +
                  '<option value="per_q"' + (lb.timeMode === "per_q" ? " selected" : "") + '>Th\u1eddi gian ri\u00eang t\u1eebng c\u00e2u</option>' +
                  '<option value="uniform"' + (lb.timeMode === "uniform" ? " selected" : "") + '>Th\u1eddi gian chung cho m\u1ecdi c\u00e2u</option>' +
                  '<option value="unlimited"' + (lb.timeMode === "unlimited" ? " selected" : "") + '>Kh\u00f4ng gi\u1edbi h\u1ea1n th\u1eddi gian</option>' +
                '</select>' +
              '</div>' +
              '<div class="ql-field' + (uniformDisabled ? " is-disabled" : "") + '">' +
                '<div class="ql-field-head"><label class="ql-field-label" for="lbUniformSec">Th\u1eddi gian chung (gi\u00e2y)</label></div>' +
                '<input type="number" class="ql-input" id="lbUniformSec" min="5" max="600" value="' + lb.uniformSec + '"' + (uniformDisabled ? " disabled" : "") + '>' +
              '</div>' +
            '</div>' +

            '<div class="ql-toggle-list">' +
              '<label class="ql-toggle-row" for="lbShowAnswerToggle">' +
                '<span class="ql-toggle-info">' +
                  '<span class="ql-toggle-title">Hi\u1ec7n \u0111\u00e1p \u00e1n \u0111\u00fang ngay l\u1eadp t\u1ee9c</span>' +
                  '<span class="ql-toggle-desc">Hi\u1ec3n th\u1ecb k\u1ebft qu\u1ea3 \u0111\u00fang/sai v\u00e0 \u0111\u00e1p \u00e1n ngay sau khi ch\u1ecdn</span>' +
                '</span>' +
                qlSwitch("lbShowAnswerToggle", lb.showAnswer !== "off", false) +
              '</label>' +
              '<label class="ql-toggle-row" for="lbShowExplain">' +
                '<span class="ql-toggle-info">' +
                  '<span class="ql-toggle-title">Hi\u1ec7n gi\u1ea3i th\u00edch chi ti\u1ebft</span>' +
                  '<span class="ql-toggle-desc">Hi\u1ec3n th\u1ecb ph\u1ea7n gi\u1ea3i th\u00edch \u0111\u00e1p \u00e1n ngay sau m\u1ed7i c\u00e2u</span>' +
                '</span>' +
                qlSwitch("lbShowExplain", !!lb.showExplain, false) +
              '</label>' +
              '<label class="ql-toggle-row" for="lbAllowReview">' +
                '<span class="ql-toggle-info">' +
                  '<span class="ql-toggle-title">Cho ph\u00e9p xem l\u1ea1i sau khi n\u1ed9p</span>' +
                  '<span class="ql-toggle-desc">Xem l\u1ea1i to\u00e0n b\u1ed9 c\u00e2u h\u1ecfi v\u00e0 \u0111\u00e1p \u00e1n \u1edf m\u00e0n h\u00ecnh t\u1ed5ng k\u1ebft</span>' +
                '</span>' +
                qlSwitch("lbAllowReview", !!lb.allowReview, false) +
              '</label>' +
            '</div>' +
          '</div>' +

          /* Section 4: Advanced Settings Collapsible Accordion (closed by default) */
          '<div class="ql-accordion">' +
            '<button type="button" class="ql-acc-trigger" data-sact="toggle-adv" aria-expanded="' + (lb.advOpen ? "true" : "false") + '">' +
              '<span class="ql-acc-left">' +
                '<span class="ql-acc-title">C\u00e0i \u0111\u1eb7t n\u00e2ng cao</span>' +
                '<span class="ql-acc-pill" id="qlAdvCountPill">' + activeAdvCount + ' \u0111ang b\u1eadt</span>' +
              '</span>' +
              QL_ICONS.chevronDown +
            '</button>' +
            '<div class="ql-acc-body' + (lb.advOpen ? "" : " hidden") + '">' +
              (!advOk ? '<div class="ql-lock-note">' + QL_ICONS.lock + '<span>M\u1ed9t s\u1ed1 t\u00f9y ch\u1ecdn n\u00e2ng cao y\u00eau c\u1ea7u g\u00f3i Silver tr\u1edf l\u00ean.</span></div>' : "") +
              '<div class="ql-adv-grid">' +
                '<label class="ql-adv-card' + (!advOk ? " is-disabled" : "") + '" for="lbShuffleQ">' +
                  '<span class="ql-toggle-info">' +
                    '<span class="ql-toggle-title">\u0110\u1ea3o th\u1ee9 t\u1ef1 c\u00e2u h\u1ecfi</span>' +
                    '<span class="ql-toggle-desc">Tr\u1ed9n ng\u1eabu nhi\u00ean th\u1ee9 t\u1ef1 c\u00e1c c\u00e2u h\u1ecfi</span>' +
                  '</span>' +
                  qlSwitch("lbShuffleQ", lb.shuffleQ && advOk, !advOk) +
                '</label>' +
                '<label class="ql-adv-card' + (!advOk ? " is-disabled" : "") + '" for="lbShuffleO">' +
                  '<span class="ql-toggle-info">' +
                    '<span class="ql-toggle-title">\u0110\u1ea3o th\u1ee9 t\u1ef1 \u0111\u00e1p \u00e1n (Zero-Drift)</span>' +
                    '<span class="ql-toggle-desc">X\u00e1o tr\u1ed9n ph\u01b0\u01a1ng \u00e1n, gi\u1eef \u0111\u00fang kh\u00f3a \u0111\u00e1p \u00e1n</span>' +
                  '</span>' +
                  qlSwitch("lbShuffleO", lb.shuffleO && advOk, !advOk) +
                '</label>' +
                '<label class="ql-adv-card" for="lbSound">' +
                  '<span class="ql-toggle-info">' +
                    '<span class="ql-toggle-title">Hi\u1ec7u \u1ee9ng \u00e2m thanh</span>' +
                    '<span class="ql-toggle-desc">Ph\u00e1t \u00e2m thanh ph\u1ea3n h\u1ed3i khi tr\u1ea3 l\u1eddi \u0111\u00fang/sai</span>' +
                  '</span>' +
                  qlSwitch("lbSound", !!lb.sound, false) +
                '</label>' +
                '<label class="ql-adv-card' + (!advOk ? " is-disabled" : "") + '" for="lbStreak">' +
                  '<span class="ql-toggle-info">' +
                    '<span class="ql-toggle-title">Thanh chu\u1ed7i \u0111\u00fang &amp; th\u01b0\u1edfng t\u1ed1c \u0111\u1ed9</span>' +
                    '<span class="ql-toggle-desc">C\u1ed9ng \u0111i\u1ec3m th\u01b0\u1edfng khi tr\u1ea3 l\u1eddi nhanh li\u00ean ti\u1ebfp</span>' +
                  '</span>' +
                  qlSwitch("lbStreak", lb.streak && advOk, !advOk) +
                '</label>' +
                '<label class="ql-adv-card' + (!advOk ? " is-disabled" : "") + '" for="lbRedemption">' +
                  '<span class="ql-toggle-info">' +
                    '<span class="ql-toggle-title">C\u00e2u h\u1ecfi c\u1ee9u v\u1edbt</span>' +
                    '<span class="ql-toggle-desc">L\u00e0m l\u1ea1i c\u00e2u \u0111\u00e3 tr\u1ea3 l\u1eddi sai \u1edf cu\u1ed1i phi\u00ean</span>' +
                  '</span>' +
                  qlSwitch("lbRedemption", lb.redemption && advOk, !advOk) +
                '</label>' +
              '</div>' +
            '</div>' +
          '</div>' +

          /* Card Footer */
          '<div class="ql-footer">' +
            '<button type="button" class="ql-cta-btn" data-sact="start-play">' + QL_ICONS.play + '<span>' + startLabel + '</span></button>' +
          '</div>' +
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
        U().showToast("🔥 C\u00e2u h\u1ecfi c\u1ee9u v\u1edbt (Redemption)! L\u00e0m l\u1ea1i " + pl.questions.length + " c\u00e2u sai \u0111\u1ec3 g\u1ee1 \u0111i\u1ec3m!", "info");
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
    const sessSuffix = pl.sessionMeta ? (" – Phi\u00ean " + pl.sessionMeta.idx + "/" + pl.sessionMeta.totalSessions) : "";
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
      (pl.redemptionMode ? '<div class="pending-banner" style="margin:0">🔥 <strong>V\u00f2ng C\u1ee9u v\u1edbt (Redemption Question):</strong> Tr\u1ea3 l\u1eddi \u0111\u00fang \u0111\u1ec3 g\u1ee1 l\u1ea1i c\u00e2u b\u1ea1n v\u1eeba l\u00e0m sai!</div>' : "") +
      '<div class="qz-topbar">' +
        '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:160px">' +
          (pl.sessionMeta ? '<span class="badge badge-warn">Phi\u00ean ' + pl.sessionMeta.idx + "/" + pl.sessionMeta.totalSessions + '</span>' : "") +
          '<span class="badge">' + (pl.idx + 1) + "/" + total + '</span>' +
          '<div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        (q.time > 0 ? '<span class="qz-timer' + (pl.remSec > 0 && pl.remSec < 5 ? " danger" : "") + '" id="qzTimerBox">⏱ ' + pl.remSec + 's</span>' : '<span class="badge">∞ Kh\u00f4ng gi\u1edbi h\u1ea1n</span>') +
        (lb.streak && U().can("studioAdv") ? '<span class="qz-streak">🔥 Streak ' + pl.streak + '</span>' : "") +
        '<span class="badge badge-ok" style="font-size:.9rem">⭐ ' + pl.score + ' \u0111i\u1ec3m</span>' +
        '<button type="button" class="btn btn-outline btn-sm" data-sact="quit-play">Tho\u00e1t</button>' +
      '</div>' +

      '<div class="qz-question-box">' +
        '<div class="muted" style="font-size:.82rem;margin-bottom:6px">' + (q.type === "multiple" ? "Ch\u1ecdn nhi\u1ec1u \u0111\u00e1p \u00e1n r\u1ed3i b\u1ea5m X\u00e1c nh\u1eadn (Enter)" : "Ch\u1ecdn m\u1ed9t \u0111\u00e1p \u00e1n (ph\u00edm t\u1eaft 1–" + q.options.length + ")") + '</div>' +
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
      h += '<div style="text-align:center"><button type="button" class="btn btn-emerald" data-sact="submit-multi"' + (pl.selected.length === 0 ? " disabled" : "") + '>X\u00e1c nh\u1eadn \u0111\u00e1p \u00e1n (Enter)</button></div>';
    }
    if (pl.locked) {
      if (showRW) {
        h += '<div class="feedback ' + (pl.lastOk ? "ok" : "bad") + '" style="text-align:center">' + (pl.lastOk ? "🎉 Ch\u00ednh x\u00e1c!" : "❌ Ch\u01b0a ch\u00ednh x\u00e1c!") + '</div>';
      }
      if (lb.showExplain && q.explanation) {
        h += '<div class="explain-box rich-text"><strong>Gi\u1ea3i th\u00edch:</strong> ' + U().renderRich(q.explanation) + '</div>';
      }
      h += '<div style="text-align:center"><button type="button" class="btn btn-primary" data-sact="next-q">C\u00e2u ti\u1ebfp theo → (Enter)</button></div>';
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
      '<div style="text-align:center;margin-bottom:18px"><h2>🏆 T\u1ed5ng k\u1ebft Quiz – ' + U().esc(sState.quiz ? sState.quiz.title : "") + (sm ? (' <span class="badge">Phi\u00ean ' + sm.idx + "/" + sm.totalSessions + '</span>') : "") + '</h2></div>' +
      '<div class="kpi-grid">' +
        '<div class="kpi-card"><span class="kpi-label">\u0110\u1ed9 ch\u00ednh x\u00e1c</span><span class="kpi-value" style="color:var(--emerald)">' + acc + '%</span></div>' +
        '<div class="kpi-card"><span class="kpi-label">T\u1ed5ng \u0111i\u1ec3m</span><span class="kpi-value">' + pl.score + '</span></div>' +
        '<div class="kpi-card"><span class="kpi-label">\u0110\u00fang / Sai / B\u1ecf qua</span><span class="kpi-value" style="font-size:1.35rem">' + pl.correctCount + ' / ' + pl.wrongCount + ' / ' + pl.skippedCount + '</span></div>' +
        '<div class="kpi-card"><span class="kpi-label">Streak d\u00e0i nh\u1ea5t · TB/c\u00e2u</span><span class="kpi-value" style="font-size:1.35rem">🔥 ' + pl.maxStreak + ' · ' + avgSec + 's</span></div>' +
      '</div>' +
      '<div class="deck-actions" style="justify-content:center;margin-bottom:20px">' +
        (hasNextSess ? '<button type="button" class="btn btn-primary" data-sact="next-session">▶ L\u00e0m ti\u1ebfp Phi\u00ean ' + (sm.idx + 1) + "/" + sm.totalSessions + '</button>' : "") +
        (wrongCount > 0 ? '<button type="button" class="btn btn-danger" data-sact="retry-wrong">🔁 L\u00e0m l\u1ea1i c\u00e1c c\u00e2u sai (' + wrongCount + ')</button>' : "") +
        '<button type="button" class="btn btn-emerald" data-sact="retry-all">🔄 L\u00e0m l\u1ea1i phi\u00ean n\u00e0y</button>' +
        '<button type="button" class="btn btn-outline" data-sact="back-lobby">⚙️ Ch\u1ecdn phi\u00ean kh\u00e1c</button>' +
        '<button type="button" class="btn btn-outline" data-sact="back-editor">✏️ Quay l\u1ea1i Editor</button>' +
      '</div>';

    if (sState.lobby.allowReview) {
      h += '<h3>Xem l\u1ea1i chi ti\u1ebft t\u1eebng c\u00e2u</h3><div class="list">' + pl.records.map(function (rec, idx) {
        const q = rec.q;
        const userAns = rec.selected.length ? rec.selected.map(function (i) { return U().LETTERS.charAt(i) + ". " + q.options[i]; }).join(" | ") : "Ch\u01b0a tr\u1ea3 l\u1eddi";
        const corrAns = q.correct.map(function (i) { return U().LETTERS.charAt(i) + ". " + q.options[i]; }).join(" | ");
        return '<div class="deck-row" style="border-left:5px solid ' + (rec.ok ? "var(--emerald)" : "var(--rose)") + '">' +
          '<div class="deck-title-line"><strong class="rich-text">C\u00e2u ' + (idx + 1) + ": " + U().renderRich(q.text) + '</strong>' +
          '<span class="badge ' + (rec.ok ? "badge-ok" : "badge-bad") + '">' + (rec.redeemed ? "🔥 \u0110\u00e3 c\u1ee9u v\u1edbt" : (rec.ok ? "\u0110\u00fang" : "Sai")) + '</span></div>' +
          '<div class="rich-text" style="font-size:.84rem"><strong>B\u1ea1n ch\u1ecdn:</strong> ' + U().renderRich(userAns) + '</div>' +
          '<div class="rich-text" style="font-size:.84rem;color:var(--emerald)"><strong>\u0110\u00e1p \u00e1n \u0111\u00fang:</strong> ' + U().renderRich(corrAns) + '</div>' +
          (q.explanation ? '<div class="muted rich-text" style="font-size:.82rem"><strong>Gi\u1ea3i th\u00edch:</strong> ' + U().renderRich(q.explanation) + '</div>' : "") +
        '</div>';
      }).join("") + '</div>';
    }
    h += '</div>';
    root.innerHTML = h;
  }

  /* ======================== EVENTS & SHORTCUTS ======================== */
  function onStudioClick(e) {
    if (window.UETLms && typeof window.UETLms.handleClick === "function" && window.UETLms.handleClick(e)) return;
    const b = e.target.closest ? e.target.closest("[data-sact]") : null;
    if (!b || b.disabled) return;
    const act = b.getAttribute("data-sact");
    if (act === "assign-saved") {
      if (window.UETLms && typeof window.UETLms.openAssignModalForQuiz === "function") {
        window.UETLms.openAssignModalForQuiz(b.getAttribute("data-id"));
      }
      return;
    }
    if (act === "new-manual") { sState.quiz = newEmptyQuiz(); sState.screen = "editor"; render(); }
    else if (act === "import-deck") {
      const sel = U().$("stPickDeck");
      const d = sel ? U().getDeck(sel.value) : null;
      if (d) openFromDeck(d);
    }
    else if (act === "import-conv") {
      const qs = window.UETConverter ? window.UETConverter.getValidQuestions() : [];
      if (qs.length) openFromQuestions("Quiz t\u1eeb AI Converter", "AI Converter", qs);
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
      U().showConfirm("X\u00f3a Quiz", "X\u00f3a Quiz n\u00e0y kh\u1ecfi Creator Studio?", function () {
        saveQuizzes(loadQuizzes().filter(function (x) { return x && x.id !== id; }));
        render();
      });
    }
    else if (act === "back-home") { stopStudioTimer(); sState.screen = "home"; render(); }
    else if (act === "back-editor") { stopStudioTimer(); sState.screen = "editor"; render(); }
    else if (act === "batch-time") {
      const t = parseInt(U().$("stBatchTime") ? U().$("stBatchTime").value : "30", 10);
      if (sState.quiz) { sState.quiz.questions.forEach(function (q) { q.time = t; }); render(); U().showToast("\u0110\u00e3 \u0111\u1eb7t th\u1eddi gian h\u00e0ng lo\u1ea1t cho t\u1ea5t c\u1ea3 c\u00e2u.", "success"); }
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
    else if (act === "toggle-adv") { sState.lobby.advOpen = !sState.lobby.advOpen; render(); }
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
    else if (act === "switch-pub-copy") {
      const id = b.getAttribute("data-id");
      const list = loadQuizzes();
      const qz = list.find(function (x) { return x && x.id === id; });
      if (!qz) return;
      b.disabled = true;
      (async function () {
        try {
          if (qz.shareCode && window.UETCloud && typeof window.UETCloud.updateQuizVisibility === "function") {
            await window.UETCloud.updateQuizVisibility(qz.shareCode, true, qz.id);
            const url = (window.location.origin || "") + "/quiz?code=" + encodeURIComponent(qz.shareCode);
            U().copyText(url, "\u0111\u01b0\u1eddng d\u1eabn chia s\u1ebb");
            U().showToast("\u0110\u00e3 chuy\u1ec3n sang 🌐 Public v\u00e0 sao ch\u00e9p Link!", "success");
            render();
          } else {
            qz.isPublic = true;
            saveQuizzes(list);
            if (window.UETCloud) await window.UETCloud.openShareModal(qz);
            render();
          }
        } catch (err) {
          U().showToast(err.message || "Kh\u00f4ng th\u1ec3 chuy\u1ec3n sang Public.", "error");
        } finally {
          b.disabled = false;
        }
      })();
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
      U().showConfirm("Tho\u00e1t Quiz", "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n tho\u00e1t phi\u00ean l\u00e0m b\u00e0i hi\u1ec7n t\u1ea1i?", function () { stopStudioTimer(); sState.screen = "editor"; render(); });
    }
    else if (act === "retry-wrong") {
      const wrongQs = sState.play ? sState.play.records.filter(function (r) { return !r.ok; }).map(function (r) { return r.q; }) : [];
      if (wrongQs.length) startPlaySession(wrongQs);
    }
    else if (act === "retry-all") startPlaySession();
  }

  function onStudioChange(e) {
    if (window.UETLms && typeof window.UETLms.handleChange === "function" && window.UETLms.handleChange(e)) return;
    const t = e.target;
    if (!t) return;
    if (t.getAttribute("data-sact") === "q-time") {
      const q = sState.quiz && sState.quiz.questions[Number(t.getAttribute("data-idx"))];
      if (q) q.time = parseInt(t.value, 10) || 0;
    }
    else if (t.id === "stQuizVis" && sState.quiz) {
      const wantPublic = t.value === "public";
      const prev = sState.quiz.isPublic !== false;
      if (sState.quiz.shareCode && window.UETCloud && typeof window.UETCloud.updateQuizVisibility === "function") {
        t.disabled = true;
        window.UETCloud.updateQuizVisibility(sState.quiz.shareCode, wantPublic, sState.quiz.id)
          .then(function () {
            sState.quiz.isPublic = wantPublic;
            U().showToast("\u0110\u00e3 c\u1eadp nh\u1eadt: " + (wantPublic ? "🌐 Public" : "🔒 Private"), "success");
          })
          .catch(function (err) {
            t.value = prev ? "public" : "private";
            U().showToast(err.message || "C\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i th\u1ea5t b\u1ea1i.", "error");
          })
          .finally(function () { t.disabled = false; });
      } else {
        sState.quiz.isPublic = wantPublic;
      }
    }
    else if (t.getAttribute("data-sact") === "card-vis") {
      const id = t.getAttribute("data-id");
      const list = loadQuizzes();
      const qz = list.find(function (x) { return x && x.id === id; });
      if (!qz) return;
      const wantPublic = t.value === "public";
      const prev = qz.isPublic !== false;
      t.disabled = true;
      (window.UETCloud && typeof window.UETCloud.updateQuizVisibility === "function"
        ? window.UETCloud.updateQuizVisibility(qz.shareCode || "", wantPublic, qz.id)
        : Promise.resolve().then(function () { qz.isPublic = wantPublic; saveQuizzes(list); })
      ).then(function () {
        U().showToast("\u0110\u00e3 c\u1eadp nh\u1eadt \"" + qz.title + "\": " + (wantPublic ? "🌐 Public" : "🔒 Private"), "success");
        render();
      }).catch(function (err) {
        t.value = prev ? "public" : "private";
        U().showToast(err.message || "C\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i th\u1ea5t b\u1ea1i.", "error");
      }).finally(function () { t.disabled = false; });
    }
    else if (t.id === "lbPerSession") { sState.lobby.perSession = Math.max(1, parseInt(t.value, 10) || 50); sState.lobby.sessionIdx = 1; render(); }
    else if (t.id === "lbSessionIdx") { sState.lobby.sessionIdx = Math.max(1, parseInt(t.value, 10) || 1); render(); }
    else if (t.id === "lbRandomCount") { sState.lobby.randomCount = Math.max(1, parseInt(t.value, 10) || 20); render(); }
    else if (t.id === "lbTimeMode") { sState.lobby.timeMode = t.value; render(); }
    else if (t.id === "lbUniformSec") sState.lobby.uniformSec = Math.max(5, parseInt(t.value, 10) || 30);
    else if (t.id === "lbShowAnswerToggle") sState.lobby.showAnswer = t.checked ? "full" : "off";
    else if (t.id === "lbShowAnswer") sState.lobby.showAnswer = t.value;
    else if (t.id === "lbShowExplain") sState.lobby.showExplain = t.checked;
    else if (t.id === "lbAllowReview") sState.lobby.allowReview = t.checked;
    else if (t.id === "lbShuffleQ") { sState.lobby.shuffleQ = t.checked; render(); }
    else if (t.id === "lbShuffleO") { sState.lobby.shuffleO = t.checked; render(); }
    else if (t.id === "lbSound") { sState.lobby.sound = t.checked; render(); }
    else if (t.id === "lbStreak") { sState.lobby.streak = t.checked; render(); }
    else if (t.id === "lbRedemption") { sState.lobby.redemption = t.checked; render(); }
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

  function openLmsScreen(screenName) {
    stopStudioTimer();
    sState.screen = screenName || "home";
    if (U().state.tab !== "studio") U().showTab("studio");
    else render();
  }

  window.UETStudio = {
    render: render,
    applySubRoute: applySubRoute,
    openFromDeck: openFromDeck,
    openLobbyFromDeck: openLobbyFromDeck,
    openFromQuestions: openFromQuestions,
    openLmsScreen: openLmsScreen,
    onKeyDown: onKeyDown
  };
})();
