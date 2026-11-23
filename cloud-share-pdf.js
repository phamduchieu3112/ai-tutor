/* ============================================================
   AI Tutor – 3-Layer Cloud/Drive Backup, Share Link/QR & Print-Ready PDF
   ============================================================ */

// D\u00e1n OAuth 2.0 Web Client ID t\u1eeb Google Cloud Console (\u0111\u00e3 b\u1eadt Google Drive API) v\u00e0o \u0111\u00e2y:
const GOOGLE_DRIVE_CLIENT_ID = "480927164540-o3o4h9v5vmi8h93605ridg4eqvtf5rcf.apps.googleusercontent.com";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file openid email";
const DRIVE_BACKUP_NAME = "AI_Tutor_Cloud_Backup.json";

// C\u1ea5u h\u00ecnh m\u1edf r\u1ed9ng cho Cloud Sync (s\u1eb5n s\u00e0ng k\u1ebft n\u1ed1i Supabase / Firebase khi tri\u1ec3n khai)
const CLOUD_CONFIG = {
  provider: "auto", // "auto" (d\u00f9ng server c\u1ee5c b\u1ed9 n\u1ebfu c\u00f3, fallback IndexedDB/localStorage) | "supabase" | "firebase"
  supabaseUrl: "",
  supabaseAnonKey: "",
  firebaseConfig: null
};

(function () {
  "use strict";

  const DRIVE_LAST_KEY = "ai_tutor_last_drive_backup";
  const SHARES_KEY = "ai_tutor_shares";
  const IDB_NAME = "ai_tutor_idb";
  const IDB_STORE = "kv";

  const cs = {
    driveToken: "",
    driveTokenExp: 0,
    driveBusy: false,
    restoreMode: "merge",
    lastSyncText: "☁️ \u0110\u00e3 \u0111\u1ed3ng b\u1ed9",
    syncTimer: null,
    backupMounted: false
  };

  function U() { return window.UET; }

  function dateStamp() {
    const d = new Date();
    return String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear();
  }

  /* ==================== LAYER 3: CLOUD STORAGE SERVICE + INDEXEDDB ==================== */
  function setSyncIndicator(stateStr) {
    cs.lastSyncText = stateStr;
    const el = U().$("syncStatusChip");
    if (el) {
      el.textContent = stateStr;
      el.classList.toggle("saving", stateStr.indexOf("\u0110ang l\u01b0u") !== -1);
    }
  }

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") return reject(new Error("no idb"));
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function (e) {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        };
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror = function () { reject(req.error); };
      } catch (e) { reject(e); }
    });
  }

  async function idbPut(key, val) {
    try {
      const db = await idbOpen();
      return await new Promise(function (resolve) {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(val, key);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      });
    } catch (e) { return false; }
  }

  async function idbGet(key) {
    try {
      const db = await idbOpen();
      return await new Promise(function (resolve) {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      });
    } catch (e) { return null; }
  }

  function buildBackupPayload() {
    const u = U().state.user;
    const vocabSnapshot = (typeof window !== "undefined" && window.VocabStudio && typeof window.VocabStudio.exportBackupData === "function")
      ? window.VocabStudio.exportBackupData()
      : U().loadJSON("vocabStudio.v2", null);
    return {
      version: 2,
      app: "AI Tutor",
      exportedAt: new Date().toISOString(),
      userEmail: u ? u.email : "",
      exam_sets: U().loadArr(U().KEYS.decks),
      wrong_questions: U().loadObj(U().KEYS.mistakes),
      quiz_history: U().loadArr(U().KEYS.history),
      studio_quizzes: U().loadArr(U().KEYS.quizzes),
      vocab_studio: vocabSnapshot,
      progress: U().loadObj(U().KEYS.progress),
      stats: U().loadObj(U().KEYS.stats),
      pins: U().loadArr(U().KEYS.pins),
      user_profiles: U().loadObj(U().KEYS.profiles),
      settings: {
        theme: U().loadJSON(U().KEYS.theme, "light"),
        font: U().loadJSON(U().KEYS.font, 17)
      }
    };
  }

  function validateBackupPayload(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
    const hasDecks = Array.isArray(obj.exam_sets) || Array.isArray(obj.decks);
    const hasWrong = obj.wrong_questions && typeof obj.wrong_questions === "object";
    const hasHist = Array.isArray(obj.quiz_history);
    const hasVocab = (obj.vocab_studio && typeof obj.vocab_studio === "object") || Array.isArray(obj.words);
    return hasDecks || hasWrong || hasHist || Array.isArray(obj.studio_quizzes) || hasVocab;
  }

  function applyBackupPayload(obj, mode) {
    if (!validateBackupPayload(obj)) {
      U().showToast("File sao l\u01b0u kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c b\u1ecb h\u1ecfng c\u1ea5u tr\u00fac.", "error");
      return false;
    }
    const isReplace = mode === "replace";
    const incomingDecks = Array.isArray(obj.exam_sets) ? obj.exam_sets : (Array.isArray(obj.decks) ? obj.decks : []);
    if (isReplace) {
      U().saveJSON(U().KEYS.decks, incomingDecks);
      U().saveJSON(U().KEYS.mistakes, obj.wrong_questions && typeof obj.wrong_questions === "object" ? obj.wrong_questions : {});
      U().saveJSON(U().KEYS.history, Array.isArray(obj.quiz_history) ? obj.quiz_history : []);
      U().saveJSON(U().KEYS.quizzes, Array.isArray(obj.studio_quizzes) ? obj.studio_quizzes : []);
      U().saveJSON(U().KEYS.progress, obj.progress && typeof obj.progress === "object" ? obj.progress : {});
      U().saveJSON(U().KEYS.stats, obj.stats && typeof obj.stats === "object" ? obj.stats : {});
      U().saveJSON(U().KEYS.pins, Array.isArray(obj.pins) ? obj.pins : []);
    } else {
      // Merge mode
      const curDecks = U().loadArr(U().KEYS.decks);
      const seen = {};
      curDecks.forEach(function (d) { if (d && d.id) seen[d.id] = true; });
      incomingDecks.forEach(function (d) { if (d && d.id && !seen[d.id]) { curDecks.push(d); seen[d.id] = true; } });
      U().saveJSON(U().KEYS.decks, curDecks);

      const curMk = Object.assign({}, U().loadObj(U().KEYS.mistakes), obj.wrong_questions || {});
      U().saveJSON(U().KEYS.mistakes, curMk);

      const curHist = U().loadArr(U().KEYS.history);
      const hSeen = {};
      curHist.forEach(function (h) { if (h) hSeen[(h.date || "") + "_" + (h.deckId || "")] = true; });
      (Array.isArray(obj.quiz_history) ? obj.quiz_history : []).forEach(function (h) {
        const k = (h && h.date || "") + "_" + (h && h.deckId || "");
        if (h && !hSeen[k]) { curHist.push(h); hSeen[k] = true; }
      });
      U().saveJSON(U().KEYS.history, curHist.slice(-200));

      const curQz = U().loadArr(U().KEYS.quizzes);
      const qById = {};
      curQz.forEach(function (q, idx) { if (q && q.id) qById[q.id] = idx; });
      (Array.isArray(obj.studio_quizzes) ? obj.studio_quizzes : []).forEach(function (q) {
        if (!q || !q.id) return;
        const normalizedQ = Object.assign({}, q, {
          isPublic: typeof q.isPublic === "boolean" ? q.isPublic : true,
          shareCode: q.shareCode || ""
        });
        if (qById[q.id] === undefined) {
          qById[q.id] = curQz.length;
          curQz.push(normalizedQ);
        } else {
          // Stale backup protection: only update if incoming record is newer
          const curItem = curQz[qById[q.id]];
          const curTs = curItem && curItem.updatedAt ? Date.parse(curItem.updatedAt) : 0;
          const incTs = normalizedQ.updatedAt ? Date.parse(normalizedQ.updatedAt) : 0;
          if (incTs > curTs) {
            curQz[qById[q.id]] = Object.assign({}, curItem, normalizedQ);
          }
        }
      });
      U().saveJSON(U().KEYS.quizzes, curQz);

      const curPins = Array.from(new Set(U().loadArr(U().KEYS.pins).concat(Array.isArray(obj.pins) ? obj.pins : [])));
      U().saveJSON(U().KEYS.pins, curPins);
    }

    if (obj.user_profiles && typeof obj.user_profiles === "object") {
      U().saveJSON(U().KEYS.profiles, Object.assign({}, U().loadObj(U().KEYS.profiles), obj.user_profiles));
    }
    if (obj.settings && typeof obj.settings === "object") {
      if (obj.settings.theme) {
        U().saveJSON(U().KEYS.theme, obj.settings.theme);
        document.documentElement.setAttribute("data-theme", obj.settings.theme === "dark" ? "dark" : "light");
      }
      if (obj.settings.font) {
        U().saveJSON(U().KEYS.font, obj.settings.font);
        document.documentElement.style.setProperty("--q-font", U().clamp(Number(obj.settings.font) || 17, 15, 24) + "px");
      }
    }

    const incomingVocab = (obj.vocab_studio && typeof obj.vocab_studio === "object")
      ? obj.vocab_studio
      : (Array.isArray(obj.words) ? obj : null);
    if (incomingVocab) {
      if (typeof window !== "undefined" && window.VocabStudio && typeof window.VocabStudio.importBackupData === "function") {
        window.VocabStudio.importBackupData(incomingVocab, mode);
      } else {
        U().saveJSON("vocabStudio.v2", incomingVocab);
      }
    }

    if (typeof U().rebuildAndRefresh === "function") U().rebuildAndRefresh();
    else U().renderTab();
    cloudStorageService.scheduleSync();
    return true;
  }

  const cloudStorageService = {
    scheduleSync: function () {
      if (!U() || !U().state.user) return;
      setSyncIndicator("🔄 \u0110ang l\u01b0u...");
      if (cs.syncTimer) clearTimeout(cs.syncTimer);
      cs.syncTimer = setTimeout(function () { cloudStorageService.push(); }, 500);
    },
    push: async function () {
      const u = U().state.user;
      if (!u) return;
      const key = "cloud_" + u.email.toLowerCase();
      const payload = buildBackupPayload();
      await idbPut(key, payload);
      if (U().state.backendOnline) {
        try {
          const hdr = { "Content-Type": "application/json", "X-User-Email": u.email };
          if (u.credential) hdr["Authorization"] = "Bearer " + u.credential;
          await fetch("/api/cloud/sync", { method: "PUT", headers: hdr, body: JSON.stringify(payload) });
        } catch (e) { /* offline fallback already in IndexedDB */ }
      }
      setSyncIndicator("☁️ \u0110\u00e3 \u0111\u1ed3ng b\u1ed9");
    },
    pull: async function () {
      const u = U().state.user;
      if (!u) return;
      setSyncIndicator("🔄 \u0110ang \u0111\u1ed3ng b\u1ed9...");
      let remote = null;
      if (U().state.backendOnline) {
        try {
          const hdr = { "X-User-Email": u.email };
          if (u.credential) hdr["Authorization"] = "Bearer " + u.credential;
          const res = await fetch("/api/cloud/sync", { headers: hdr });
          if (res.ok) {
            const j = await res.json();
            if (j && j.data) remote = j.data;
          }
        } catch (e) { /* fallback */ }
      }
      if (!remote) remote = await idbGet("cloud_" + u.email.toLowerCase());
      // Auto-recover if localStorage was wiped but IndexedDB/Cloud still has decks
      if (remote && U().loadArr(U().KEYS.decks).length === 0 && Array.isArray(remote.exam_sets) && remote.exam_sets.length > 0) {
        applyBackupPayload(remote, "merge");
        U().showToast("\u0110\u00e3 t\u1ef1 \u0111\u1ed9ng kh\u00f4i ph\u1ee5c " + remote.exam_sets.length + " b\u1ed9 \u0111\u1ec1 t\u1eeb b\u1ed9 nh\u1edb \u0111\u1ec7m Cloud/IndexedDB!", "success");
      }
      setSyncIndicator("☁️ \u0110\u00e3 \u0111\u1ed3ng b\u1ed9");
    }
  };

  /* ==================== LAYER 1: GOOGLE DRIVE API v3 ==================== */
  function isDriveClientConfigured() {
    return typeof GOOGLE_DRIVE_CLIENT_ID === "string" &&
      GOOGLE_DRIVE_CLIENT_ID.trim().length > 10 &&
      GOOGLE_DRIVE_CLIENT_ID.indexOf("YOUR_GOOGLE_CLIENT_ID") === -1;
  }

  function requestDriveToken() {
    return new Promise(function (resolve, reject) {
      if (!isDriveClientConfigured()) {
        return reject(new Error("UNCONFIGURED"));
      }
      if (cs.driveToken && Date.now() < cs.driveTokenExp - 30000) {
        return resolve(cs.driveToken);
      }
      if (typeof google === "undefined" || !google.accounts || !google.accounts.oauth2) {
        return reject(new Error("Th\u01b0 vi\u1ec7n Google Identity Services ch\u01b0a t\u1ea3i xong. Vui l\u00f2ng ki\u1ec3m tra k\u1ebft n\u1ed1i m\u1ea1ng."));
      }
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_DRIVE_CLIENT_ID,
          scope: GOOGLE_DRIVE_SCOPE,
          callback: function (resp) {
            if (!resp || resp.error || !resp.access_token) {
              return reject(new Error(resp && resp.error ? ("Google OAuth: " + resp.error) : "\u0110\u00e3 h\u1ee7y c\u1ea5p quy\u1ec1n Google Drive."));
            }
            cs.driveToken = resp.access_token;
            cs.driveTokenExp = Date.now() + (Number(resp.expires_in) || 3500) * 1000;
            resolve(cs.driveToken);
          }
        });
        client.requestAccessToken({ prompt: cs.driveToken ? "" : "consent" });
      } catch (e) { reject(e); }
    });
  }

  async function resolveDriveUserEmail(accessToken) {
    const u = U().state.user;
    if (u && typeof u.email === "string" && u.email.trim()) {
      return u.email.trim().toLowerCase();
    }
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: "Bearer " + accessToken }
    });
    if (res.status === 401) { cs.driveToken = ""; cs.driveTokenExp = 0; throw new Error("TOKEN_EXPIRED"); }
    if (!res.ok) throw new Error("Kh\u00f4ng th\u1ec3 l\u1ea5y th\u00f4ng tin email Google (HTTP " + res.status + ")");
    const info = await res.json();
    if (!info || !info.email) throw new Error("T\u00e0i kho\u1ea3n Google kh\u00f4ng cung c\u1ea5p \u0111\u1ecba ch\u1ec9 email.");
    return String(info.email).trim().toLowerCase();
  }

  async function getOrCreateUserDriveFolder(accessToken) {
    const userEmail = await resolveDriveUserEmail(accessToken);
    const folderName = "AI Tutor - " + userEmail;
    const escapedName = folderName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const q = encodeURIComponent("name='" + escapedName + "' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const searchUrl = "https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id,name)";
    const searchRes = await fetch(searchUrl, { headers: { Authorization: "Bearer " + accessToken } });
    if (searchRes.status === 401) { cs.driveToken = ""; cs.driveTokenExp = 0; throw new Error("TOKEN_EXPIRED"); }
    if (!searchRes.ok) throw new Error("L\u1ed7i ki\u1ec3m tra th\u01b0 m\u1ee5c Google Drive (HTTP " + searchRes.status + ")");
    const searchData = await searchRes.json();
    if (searchData && Array.isArray(searchData.files) && searchData.files.length > 0) {
      return { id: searchData.files[0].id, name: folderName };
    }
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder"
      })
    });
    if (createRes.status === 401) { cs.driveToken = ""; cs.driveTokenExp = 0; throw new Error("TOKEN_EXPIRED"); }
    if (!createRes.ok) throw new Error("L\u1ed7i t\u1ea1o th\u01b0 m\u1ee5c tr\u00ean Google Drive (HTTP " + createRes.status + ")");
    const created = await createRes.json();
    return { id: created.id, name: folderName };
  }

  async function findDriveBackupFile(token, folderId) {
    const parentCond = folderId ? (" and '" + folderId + "' in parents") : "";
    const q = encodeURIComponent("name='" + DRIVE_BACKUP_NAME + "'" + parentCond + " and trashed=false");
    const url = "https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id,modifiedTime)";
    const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (res.status === 401) {
      cs.driveToken = ""; cs.driveTokenExp = 0;
      throw new Error("TOKEN_EXPIRED");
    }
    if (!res.ok) throw new Error("L\u1ed7i t\u00ecm file Google Drive (HTTP " + res.status + ")");
    const data = await res.json();
    return (data && Array.isArray(data.files) && data.files[0]) ? data.files[0] : null;
  }

  async function connectGoogleDrive() {
    try {
      const token = await requestDriveToken();
      const folder = await getOrCreateUserDriveFolder(token);
      U().showToast("\u0110\u00e3 k\u1ebft n\u1ed1i Google Drive! Th\u01b0 m\u1ee5c l\u01b0u tr\u1eef: \"" + folder.name + "\".", "success");
      renderBackupPage();
    } catch (e) {
      if (e.message === "UNCONFIGURED") {
        U().showToast("Ch\u01b0a c\u1ea5u h\u00ecnh GOOGLE_DRIVE_CLIENT_ID! H\u00e3y thay th\u1ebf \"YOUR_GOOGLE_CLIENT_ID\" \u1edf d\u00f2ng 6 c\u1ee7a file cloud-share-pdf.js b\u1eb1ng Client ID t\u1eeb Google Cloud Console.", "warning");
      } else {
        U().showToast(e.message || "Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i Google Drive.", "error");
      }
    }
  }

  async function backupToGoogleDrive() {
    if (cs.driveBusy) return;
    cs.driveBusy = true;
    renderBackupPage();
    try {
      const token = await requestDriveToken();
      const folder = await getOrCreateUserDriveFolder(token);
      const existing = await findDriveBackupFile(token, folder.id);
      const payloadStr = JSON.stringify(buildBackupPayload(), null, 2);
      const boundary = "-------ai_tutor_boundary_" + Date.now();
      const meta = existing
        ? { name: DRIVE_BACKUP_NAME }
        : { name: DRIVE_BACKUP_NAME, mimeType: "application/json", parents: [folder.id] };
      const body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(meta) + "\r\n--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
        payloadStr + "\r\n--" + boundary + "--";
      const url = existing
        ? ("https://www.googleapis.com/upload/drive/v3/files/" + encodeURIComponent(existing.id) + "?uploadType=multipart")
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      const res = await fetch(url, {
        method: existing ? "PATCH" : "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": 'multipart/related; boundary="' + boundary + '"'
        },
        body: body
      });
      if (res.status === 401) { cs.driveToken = ""; cs.driveTokenExp = 0; throw new Error("TOKEN_EXPIRED"); }
      if (!res.ok) throw new Error("L\u1ed7i t\u1ea3i l\u00ean Google Drive (HTTP " + res.status + ")");
      const nowIso = new Date().toISOString();
      try { localStorage.setItem(DRIVE_LAST_KEY, nowIso); } catch (e) { /* */ }
      U().showToast("\u0110\u00e3 sao l\u01b0u " + DRIVE_BACKUP_NAME + " v\u00e0o th\u01b0 m\u1ee5c \"" + folder.name + "\" th\u00e0nh c\u00f4ng!", "success");
    } catch (e) {
      if (e.message === "UNCONFIGURED") {
        U().showToast("Ch\u01b0a thay \"YOUR_GOOGLE_CLIENT_ID\" trong cloud-share-pdf.js b\u1eb1ng OAuth Client ID t\u1eeb Google Cloud Console.", "warning");
      } else if (e.message === "TOKEN_EXPIRED") {
        U().showToast("Phi\u00ean Google Drive \u0111\u00e3 h\u1ebft h\u1ea1n (401). Vui l\u00f2ng b\u1ea5m K\u1ebft n\u1ed1i l\u1ea1i.", "warning");
      } else {
        U().showToast("Sao l\u01b0u th\u1ea5t b\u1ea1i: " + (e.message || "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh"), "error");
      }
    } finally {
      cs.driveBusy = false;
      renderBackupPage();
    }
  }

  async function restoreFromGoogleDrive(mode) {
    if (cs.driveBusy) return;
    cs.driveBusy = true;
    renderBackupPage();
    try {
      const token = await requestDriveToken();
      const folder = await getOrCreateUserDriveFolder(token);
      let existing = await findDriveBackupFile(token, folder.id);
      if (!existing) {
        // Fallback: t\u00ecm b\u1ea3n sao l\u01b0u c\u0169 n\u1eb1m ngo\u00e0i th\u01b0 m\u1ee5c n\u1ebfu c\u00f3
        existing = await findDriveBackupFile(token, "");
      }
      if (!existing) {
        U().showToast("Kh\u00f4ng t\u00ecm th\u1ea5y file " + DRIVE_BACKUP_NAME + " trong th\u01b0 m\u1ee5c \"" + folder.name + "\" tr\u00ean Google Drive.", "warning");
        return;
      }
      const res = await fetch("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(existing.id) + "?alt=media", {
        headers: { Authorization: "Bearer " + token }
      });
      if (res.status === 401) { cs.driveToken = ""; cs.driveTokenExp = 0; throw new Error("TOKEN_EXPIRED"); }
      if (!res.ok) throw new Error("Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c d\u1eef li\u1ec7u t\u1eeb Google Drive (HTTP " + res.status + ")");
      const data = await res.json();
      if (applyBackupPayload(data, mode)) {
        U().showToast("\u0110\u00e3 kh\u00f4i ph\u1ee5c d\u1eef li\u1ec7u t\u1eeb \"" + folder.name + "\" th\u00e0nh c\u00f4ng (" + (mode === "replace" ? "Ghi \u0111\u00e8" : "G\u1ed9p th\u00eam") + ")!", "success");
      }
    } catch (e) {
      if (e.message === "UNCONFIGURED") {
        U().showToast("Ch\u01b0a thay \"YOUR_GOOGLE_CLIENT_ID\" trong cloud-share-pdf.js b\u1eb1ng OAuth Client ID t\u1eeb Google Cloud Console.", "warning");
      } else if (e.message === "TOKEN_EXPIRED") {
        U().showToast("Phi\u00ean Google Drive \u0111\u00e3 h\u1ebft h\u1ea1n (401). Vui l\u00f2ng k\u1ebft n\u1ed1i l\u1ea1i.", "warning");
      } else {
        U().showToast("Kh\u00f4i ph\u1ee5c th\u1ea5t b\u1ea1i: " + (e.message || "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh"), "error");
      }
    } finally {
      cs.driveBusy = false;
      renderBackupPage();
    }
  }

  /* ==================== LAYER 2: OFFLINE JSON BACKUP ==================== */
  function exportJsonBackup() {
    try {
      const payload = buildBackupPayload();
      const fname = "AI_Tutor_Backup_" + dateStamp() + ".json";
      U().downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }), fname);
      U().showToast("\u0110\u00e3 t\u1ea3i file sao l\u01b0u " + fname, "success");
    } catch (e) { U().showToast("Kh\u00f4ng th\u1ec3 xu\u1ea5t file sao l\u01b0u.", "error"); }
  }

  function importJsonBackupFile(file, mode) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = function () { U().showToast("Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file sao l\u01b0u.", "error"); };
    reader.onload = function (ev) {
      try {
        const parsed = JSON.parse(String(ev.target.result || ""));
        if (!validateBackupPayload(parsed)) {
          U().showToast("File JSON kh\u00f4ng \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng sao l\u01b0u c\u1ee7a AI Tutor.", "error");
          return;
        }
        const deckCnt = Array.isArray(parsed.exam_sets) ? parsed.exam_sets.length : 0;
        const doApply = function () {
          if (applyBackupPayload(parsed, mode)) {
            U().showToast("\u0110\u00e3 kh\u00f4i ph\u1ee5c " + deckCnt + " b\u1ed9 \u0111\u1ec1 v\u00e0 d\u1eef li\u1ec7u h\u1ecdc t\u1eadp th\u00e0nh c\u00f4ng!", "success");
            renderBackupPage();
          }
        };
        if (mode === "replace") {
          U().showConfirm("Ghi \u0111\u00e8 d\u1eef li\u1ec7u hi\u1ec7n t\u1ea1i", "Ch\u1ebf \u0111\u1ed9 Ghi \u0111\u00e8 s\u1ebd thay th\u1ebf to\u00e0n b\u1ed9 b\u1ed9 \u0111\u1ec1 v\u00e0 ti\u1ebfn \u0111\u1ed9 hi\u1ec7n t\u1ea1i b\u1eb1ng d\u1eef li\u1ec7u t\u1eeb file (" + deckCnt + " b\u1ed9 \u0111\u1ec1). Ti\u1ebfp t\u1ee5c?", doApply);
        } else doApply();
      } catch (e) { U().showToast("File JSON b\u1ecb l\u1ed7i c\u00fa ph\u00e1p.", "error"); }
    };
    reader.readAsText(file, "UTF-8");
  }

  /* ==================== BACKUP & RESTORE PAGE UI ==================== */
  function renderBackupPage() {
    const root = U().$("backupRoot");
    if (!root) return;
    const lastDrive = (function () { try { return localStorage.getItem(DRIVE_LAST_KEY) || ""; } catch (e) { return ""; } })();
    const connected = !!(cs.driveToken && Date.now() < cs.driveTokenExp - 30000);
    const configured = isDriveClientConfigured();
    const deckCount = U().loadArr(U().KEYS.decks).length;
    const mkCount = Object.keys(U().loadObj(U().KEYS.mistakes)).length;
    const histCount = U().loadArr(U().KEYS.history).length;
    const vocabObj = (typeof window !== "undefined" && window.VocabStudio && typeof window.VocabStudio.exportBackupData === "function")
      ? window.VocabStudio.exportBackupData()
      : U().loadJSON("vocabStudio.v2", null);
    const vocabCount = (vocabObj && Array.isArray(vocabObj.words)) ? vocabObj.words.filter(function (w) { return !w.deleted; }).length : 110;

    const userEmail = U().state.user && U().state.user.email ? U().state.user.email : "email-cua-ban";
    const folderDisplay = "AI Tutor - " + userEmail;

    root.innerHTML =
      '<div class="api-wrap">' +
        '<section class="panel">' +
          '<div class="panel-head"><div><h2>☁️ Sao l\u01b0u &amp; Kh\u00f4i ph\u1ee5c d\u1eef li\u1ec7u (3 L\u1edbp)</h2>' +
          '<p class="muted" style="margin:0;font-size:.84rem">D\u1eef li\u1ec7u hi\u1ec7n c\u00f3: <strong>' + deckCount + '</strong> b\u1ed9 \u0111\u1ec1 · <strong>' + vocabCount + '</strong> t\u1eeb v\u1ef1ng (Vocab Studio) · <strong>' + mkCount + '</strong> c\u00e2u sai · <strong>' + histCount + '</strong> l\u1ecbch s\u1eed thi.</p></div>' +
          '<span class="badge badge-ok">' + U().esc(cs.lastSyncText) + '</span></div>' +

          '<div class="radio-group" style="margin-bottom:14px"><legend style="font-weight:700;font-size:.84rem">Ch\u1ebf \u0111\u1ed9 khi kh\u00f4i ph\u1ee5c d\u1eef li\u1ec7u</legend>' +
            '<label class="check-row"><input type="radio" name="restoreMode" value="merge"' + (cs.restoreMode === "merge" ? " checked" : "") + '> <strong>G\u1ed9p th\u00eam (Merge)</strong> – Gi\u1eef b\u1ed9 \u0111\u1ec1 hi\u1ec7n c\u00f3 v\u00e0 th\u00eam b\u1ed9 \u0111\u1ec1 m\u1edbi t\u1eeb b\u1ea3n sao l\u01b0u</label>' +
            '<label class="check-row"><input type="radio" name="restoreMode" value="replace"' + (cs.restoreMode === "replace" ? " checked" : "") + '> <strong>Ghi \u0111\u00e8 (Replace)</strong> – Thay th\u1ebf to\u00e0n b\u1ed9 d\u1eef li\u1ec7u tr\u00ean tr\u00ecnh duy\u1ec7t b\u1eb1ng b\u1ea3n sao l\u01b0u</label>' +
          '</div>' +

          /* Google Drive Card */
          '<div class="deck-row" style="margin-bottom:14px">' +
            '<div class="deck-title-line"><span class="deck-title">1. Google Drive c\u00e1 nh\u00e2n (📁 <code>' + U().esc(folderDisplay) + '</code> / <code>' + DRIVE_BACKUP_NAME + '</code>)</span>' +
            '<span class="badge ' + (connected ? "badge-ok" : "badge-warn") + '">' + (connected ? "\u0110\u00e3 k\u1ebft n\u1ed1i" : "Ch\u01b0a k\u1ebft n\u1ed1i") + '</span></div>' +
            '<p class="muted" style="margin:0;font-size:.82rem">T\u1ef1 \u0111\u1ed9ng t\u1ea1o th\u01b0 m\u1ee5c ri\u00eang <strong>' + U().esc(folderDisplay) + '</strong> v\u00e0 ghi \u0111\u00e8 duy nh\u1ea5t 1 file sao l\u01b0u b\u00ean trong b\u1eb1ng quy\u1ec1n <code>drive.file</code>.' +
              (lastDrive ? ' L\u1ea7n sao l\u01b0u g\u1ea7n nh\u1ea5t: <strong>' + U().esc(U().fmtDateTime(lastDrive)) + '</strong>.' : '') + '</p>' +
            (!configured ? '<div class="pending-banner" style="margin:4px 0;font-size:.8rem">ℹ️ \u0110ang d\u00f9ng placeholder <code>YOUR_GOOGLE_CLIENT_ID</code>. H\u00e3y d\u00e1n OAuth Client ID t\u1eeb Google Cloud Console v\u00e0o d\u00f2ng 6 c\u1ee7a <code>cloud-share-pdf.js</code> \u0111\u1ec3 b\u1eadt Google Drive.</div>' : "") +
            '<div class="deck-actions">' +
              '<button type="button" class="btn btn-outline btn-sm" data-bact="drive-connect"' + (cs.driveBusy ? " disabled" : "") + '>🔗 ' + (connected ? "K\u1ebft n\u1ed1i l\u1ea1i Drive" : "K\u1ebft n\u1ed1i Google Drive") + '</button>' +
              '<button type="button" class="btn btn-primary btn-sm" data-bact="drive-backup"' + (cs.driveBusy ? " disabled" : "") + '>' + (cs.driveBusy ? '<span class="spinner"></span>\u0110ang x\u1eed l\u00fd...' : "☁️ Sao l\u01b0u l\u00ean Google Drive") + '</button>' +
              '<button type="button" class="btn btn-emerald btn-sm" data-bact="drive-restore"' + (cs.driveBusy ? " disabled" : "") + '>⬇️ Kh\u00f4i ph\u1ee5c t\u1eeb Google Drive</button>' +
            '</div>' +
          '</div>' +

          /* Offline JSON Card */
          '<div class="deck-row" style="margin-bottom:14px">' +
            '<div class="deck-title-line"><span class="deck-title">2. Sao l\u01b0u &amp; Kh\u00f4i ph\u1ee5c ngo\u1ea1i tuy\u1ebfn (.json)</span><span class="badge">Ho\u1ea1t \u0111\u1ed9ng 100% Offline</span></div>' +
            '<p class="muted" style="margin:0;font-size:.82rem">T\u1ea3i v\u1ec1 m\u00e1y t\u00ednh/\u0111i\u1ec7n tho\u1ea1i file <code>AI_Tutor_Backup_' + dateStamp() + '.json</code> \u0111\u1ec3 l\u01b0u tr\u1eef an to\u00e0n ho\u1eb7c chuy\u1ec3n sang thi\u1ebft b\u1ecb kh\u00e1c.</p>' +
            '<div class="deck-actions">' +
              '<button type="button" class="btn btn-primary btn-sm" data-bact="json-export">⬇️ Xu\u1ea5t file sao l\u01b0u (.json)</button>' +
              '<label class="btn btn-outline btn-sm file-btn">⬆️ Kh\u00f4i ph\u1ee5c t\u1eeb file (.json)<input type="file" id="jsonRestoreFile" accept=".json,application/json" hidden></label>' +
            '</div>' +
          '</div>' +

          /* Cloud Sync Layer Info */
          '<div class="deck-row">' +
            '<div class="deck-title-line"><span class="deck-title">3. L\u1edbp \u0111\u1ed3ng b\u1ed9 Cloud &amp; IndexedDB t\u1ef1 \u0111\u1ed9ng</span>' +
            '<span class="badge badge-ok">' + (U().state.backendOnline ? "Server c\u1ee5c b\u1ed9 + IndexedDB" : "IndexedDB + localStorage") + '</span></div>' +
            '<p class="muted" style="margin:0;font-size:.82rem">D\u1ecbch v\u1ee5 <code>cloudStorageService</code> t\u1ef1 \u0111\u1ed9ng \u0111\u1ed3ng b\u1ed9 n\u1ec1n theo t\u00e0i kho\u1ea3n Google v\u00e0 gi\u1eef b\u1ea3n d\u1ef1 ph\u00f2ng trong IndexedDB (s\u1eb5n s\u00e0ng k\u1ebft n\u1ed1i Supabase / Firebase).</p>' +
            '<div class="deck-actions"><button type="button" class="btn btn-outline btn-sm" data-bact="cloud-sync-now">🔄 \u0110\u1ed3ng b\u1ed9 ngay</button></div>' +
          '</div>' +
        '</section>' +
      '</div>';
    if (typeof U().applyI18n === "function") U().applyI18n(root);

    if (!cs.backupMounted) {
      cs.backupMounted = true;
      root.addEventListener("click", function (e) {
        const b = e.target.closest ? e.target.closest("[data-bact]") : null;
        if (!b || b.disabled) return;
        const act = b.getAttribute("data-bact");
        if (act === "drive-connect") connectGoogleDrive();
        else if (act === "drive-backup") backupToGoogleDrive();
        else if (act === "drive-restore") restoreFromGoogleDrive(cs.restoreMode);
        else if (act === "json-export") exportJsonBackup();
        else if (act === "cloud-sync-now") { cloudStorageService.push().then(function () { U().showToast("\u0110\u00e3 \u0111\u1ed3ng b\u1ed9 d\u1eef li\u1ec7u th\u00e0nh c\u00f4ng.", "success"); }); }
      });
      root.addEventListener("change", function (e) {
        if (e.target && e.target.name === "restoreMode") cs.restoreMode = e.target.value;
        else if (e.target && e.target.id === "jsonRestoreFile") {
          const f = e.target.files && e.target.files[0];
          if (f) importJsonBackupFile(f, cs.restoreMode);
          e.target.value = "";
        }
      });
    }
  }

  /* ==================== PART 3: SHARE DECK (LINK / SHORT CODE / QR) ==================== */
  function encodeSharedDeck(deck) {
    try {
      const compact = {
        t: deck.title,
        g: deck.tag || "",
        q: deck.questions.map(function (q) {
          return [q.text, q.type === "multiple" ? 1 : 0, q.options, q.correct, q.time || 30, q.image || "", q.explanation || ""];
        })
      };
      const bytes = new TextEncoder().encode(JSON.stringify(compact));
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) { return ""; }
  }

  function decodeSharedDeck(encoded) {
    try {
      let b64 = String(encoded || "").replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) b64 += "=";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const c = JSON.parse(new TextDecoder().decode(bytes));
      if (!c || !Array.isArray(c.q) || c.q.length === 0) return null;
      return {
        id: "shared_" + Date.now(),
        title: String(c.t || "B\u1ed9 \u0111\u1ec1 \u0111\u01b0\u1ee3c chia s\u1ebb"),
        tag: String(c.g || "Chia s\u1ebb"),
        questions: c.q.map(function (row, idx) {
          return {
            id: "sq_" + idx,
            text: String(row[0] || ""),
            type: row[1] === 1 ? "multiple" : "single",
            options: Array.isArray(row[2]) ? row[2] : [],
            correct: Array.isArray(row[3]) ? row[3] : [0],
            time: Number(row[4]) || 30,
            image: String(row[5] || ""),
            explanation: String(row[6] || "")
          };
        })
      };
    } catch (e) { return null; }
  }

  function sanitizeQuizPayloadForSave(deck, code, isPublic) {
    // Preserve all unknown legacy fields while normalizing safe optional fields
    return Object.assign({}, deck, {
      id: String(deck.id || ("qz_" + Date.now())),
      title: String(deck.title || "Quiz kh\u00f4ng t\u00ean").trim().slice(0, 300),
      tag: String(deck.tag || "T\u1ed5ng h\u1ee3p").trim().slice(0, 120),
      isPublic: isPublic !== false,
      shareCode: code || deck.shareCode || "",
      questions: (Array.isArray(deck.questions) ? deck.questions : []).map(function (q, i) {
        return Object.assign({}, q, {
          id: q.id || ("sq_" + i),
          text: String(q.text || "").trim(),
          type: q.type === "multiple" || q.type === "Checkbox" ? "multiple" : "single",
          options: Array.isArray(q.options) ? q.options.map(function (o) { return String(o == null ? "" : o); }) : [],
          correct: Array.isArray(q.correct) ? q.correct.slice() : [],
          time: Number.isFinite(Number(q.time)) ? Number(q.time) : 30,
          image: String(q.image || "").trim(),
          explanation: String(q.explanation || "").trim()
        });
      })
    });
  }

  function syncLocalQuizVisibility(quizId, shareCode, isPublic) {
    try {
      const list = U().loadArr(U().KEYS.quizzes);
      let changed = false;
      list.forEach(function (item) {
        if (item && ((quizId && item.id === quizId) || (shareCode && item.shareCode === shareCode))) {
          item.isPublic = isPublic;
          if (shareCode) item.shareCode = shareCode;
          item.updatedAt = new Date().toISOString();
          changed = true;
        }
      });
      if (changed) U().saveJSON(U().KEYS.quizzes, list);
      const localShares = U().loadObj(SHARES_KEY);
      if (shareCode && localShares[shareCode]) {
        localShares[shareCode].isPublic = isPublic;
        if (localShares[shareCode].deck) localShares[shareCode].deck.isPublic = isPublic;
        U().saveJSON(SHARES_KEY, localShares);
      }
    } catch (e) { /* ignore */ }
  }

  async function updateQuizVisibility(code, isPublic, quizId) {
    const cleanCode = String(code || "").trim().toUpperCase();
    if (!cleanCode) {
      syncLocalQuizVisibility(quizId, "", isPublic);
      return { ok: true, isPublic: isPublic };
    }
    const u = U().state.user;
    const hdr = { "Content-Type": "application/json" };
    if (u && u.email) hdr["X-User-Email"] = u.email;
    if (u && u.credential) hdr["Authorization"] = "Bearer " + u.credential;

    if (U().state.backendOnline) {
      const res = await fetch("/api/shares/" + encodeURIComponent(cleanCode), {
        method: "PATCH",
        headers: hdr,
        body: JSON.stringify({ isPublic: !!isPublic })
      });
      const j = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        throw new Error(j.error || ("Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt quy\u1ec1n truy c\u1eadp (HTTP " + res.status + ")"));
      }
      syncLocalQuizVisibility(quizId, cleanCode, !!isPublic);
      return { ok: true, code: cleanCode, isPublic: !!isPublic, updatedAt: j.updatedAt };
    }
    syncLocalQuizVisibility(quizId, cleanCode, !!isPublic);
    return { ok: true, code: cleanCode, isPublic: !!isPublic, offline: true };
  }

  function showSharePersistErrorModal(deck, errMsg) {
    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="shareErrModal" role="alertdialog" aria-modal="true"><div class="modal modal-sm">' +
        '<h3>⚠️ Kh\u00f4ng th\u1ec3 l\u01b0u &amp; t\u1ea1o li\u00ean k\u1ebft chia s\u1ebb</h3>' +
        '<p class="muted" style="font-size:.86rem">' + U().esc(errMsg || "L\u1ed7i k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7.") + '</p>' +
        '<p class="muted" style="font-size:.8rem">D\u1eef li\u1ec7u Quiz c\u1ee7a b\u1ea1n v\u1eabn \u0111\u01b0\u1ee3c b\u1ea3o to\u00e0n an to\u00e0n tr\u00ean tr\u00ecnh duy\u1ec7t. H\u1ec7 th\u1ed1ng kh\u00f4ng t\u1ea1o link gi\u1ea3 khi ch\u01b0a x\u00e1c nh\u1eadn l\u01b0u th\u00e0nh c\u00f4ng.</p>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-outline" id="shareErrClose">\u0110\u00f3ng</button>' +
          '<button type="button" class="btn btn-primary" id="shareErrRetry">🔄 Th\u1eed l\u1ea1i</button>' +
        '</div>' +
      '</div></div>';
    U().on("shareErrClose", "click", function () { host.innerHTML = ""; });
    U().on("shareErrRetry", "click", function () { host.innerHTML = ""; openShareModal(deck); });
  }

  async function openShareModal(deck) {
    if (!deck || !Array.isArray(deck.questions) || deck.questions.length === 0) {
      U().showToast("B\u1ed9 \u0111\u1ec1 ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi \u0111\u1ec3 chia s\u1ebb.", "warning");
      return;
    }
    const localShares = U().loadObj(SHARES_KEY);
    const existingCode = deck.shareCode || Object.keys(localShares).find(function (k) {
      return localShares[k] && localShares[k].deck && localShares[k].deck.id === deck.id;
    });
    let code = existingCode || ("AIT-" + Math.floor(1000 + Math.random() * 9000));
    let isPublic = typeof deck.isPublic === "boolean" ? deck.isPublic : true;
    const sanitized = sanitizeQuizPayloadForSave(deck, code, isPublic);

    // Mandatory persistence step BEFORE generating Share URL
    if (U().state.backendOnline) {
      try {
        const u = U().state.user;
        const hdr = { "Content-Type": "application/json", "X-User-Email": u ? u.email : "" };
        if (u && u.credential) hdr["Authorization"] = "Bearer " + u.credential;
        const res = await fetch("/api/shares", {
          method: "POST",
          headers: hdr,
          body: JSON.stringify({ code: code, isPublic: isPublic, deck: sanitized })
        });
        const j = await res.json().catch(function () { return {}; });
        if (!res.ok || !j.ok) {
          showSharePersistErrorModal(deck, j.error || ("M\u00e1y ch\u1ee7 t\u1eeb ch\u1ed1i l\u01b0u Quiz (HTTP " + res.status + ")."));
          return;
        }
        if (j.code) code = j.code;
        if (typeof j.isPublic === "boolean") isPublic = j.isPublic;
      } catch (netErr) {
        showSharePersistErrorModal(deck, "Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7 \u0111\u1ec3 x\u00e1c nh\u1eadn l\u01b0u Quiz: " + (netErr.message || "Network Error"));
        return;
      }
    }

    sanitized.shareCode = code;
    sanitized.isPublic = isPublic;
    deck.shareCode = code;
    deck.isPublic = isPublic;
    localShares[code] = { code: code, isPublic: isPublic, deck: sanitized, createdAt: new Date().toISOString() };
    U().saveJSON(SHARES_KEY, localShares);
    syncLocalQuizVisibility(deck.id, code, isPublic);

    const origin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "";
    const compressed = encodeSharedDeck(sanitized);
    const includeHash = isPublic && compressed && compressed.length < 14000;
    const shareUrl = origin + "/quiz?code=" + encodeURIComponent(code) + (includeHash ? ("#d=" + compressed) : "");
    const qrTarget = origin + "/quiz?code=" + encodeURIComponent(code) + (includeHash && compressed.length < 1500 ? ("#d=" + compressed) : "");
    const qrImgUrl = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=" + encodeURIComponent(qrTarget);

    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="shareModal" role="dialog" aria-modal="true"><div class="modal modal-lg">' +
        '<h3>🔗 Chia s\u1ebb &amp; Xu\u1ea5t b\u1ea3n Quiz: ' + U().esc(sanitized.title) + '</h3>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);margin-bottom:12px">' +
          '<div style="font-size:.84rem"><strong>Quy\u1ec1n truy c\u1eadp (Visibility):</strong> <span id="shareVisBadge" class="badge ' + (isPublic ? "badge-ok" : "badge-warn") + '">' + (isPublic ? "🌐 Public" : "🔒 Private") + '</span></div>' +
          '<select id="shareVisSelect" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:.82rem;font-weight:700">' +
            '<option value="public"' + (isPublic ? " selected" : "") + '>🌐 Public (M\u1ecdi ng\u01b0\u1eddi c\u00f3 link \u0111\u1ec1u l\u00e0m \u0111\u01b0\u1ee3c)</option>' +
            '<option value="private"' + (!isPublic ? " selected" : "") + '>🔒 Private (Ch\u1ec9 m\u00ecnh b\u1ea1n xem \u0111\u01b0\u1ee3c)</option>' +
          '</select>' +
        '</div>' +
        '<div id="sharePrivateNotice" class="pending-banner' + (isPublic ? " hidden" : "") + '" style="margin-bottom:12px;display:' + (isPublic ? "none" : "flex") + ';align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
          '<span>🔒 Quiz n\u00e0y \u0111ang \u1edf ch\u1ebf \u0111\u1ed9 <strong>Private</strong>. Ng\u01b0\u1eddi kh\u00e1c m\u1edf link s\u1ebd th\u1ea5y th\u00f4ng b\u00e1o ri\u00eang t\u01b0.</span>' +
          '<button type="button" class="btn btn-emerald btn-sm" id="shareSwitchPublicCopy">🌐 Switch to Public &amp; Copy Link</button>' +
        '</div>' +
        '<div class="checkout-grid">' +
          '<div class="qr-box" style="flex-direction:column;gap:8px">' +
            '<img id="shareQrImg" src="' + U().esc(qrImgUrl) + '" alt="M\u00e3 QR chia s\u1ebb \u0111\u1ec1" crossorigin="anonymous">' +
            '<button type="button" class="btn btn-outline btn-sm" id="shareDownQrBtn">⬇ T\u1ea3i m\u00e3 QR</button>' +
          '</div>' +
          '<div>' +
            '<div class="field"><span>M\u00e3 \u0111\u1ec1 ng\u1eafn</span>' +
              '<div class="voucher-row"><input type="text" id="shareCodeOut" value="' + U().esc(code) + '" readonly style="font-weight:800;font-size:1.05rem;letter-spacing:.08em"><button type="button" class="btn btn-primary btn-sm" id="shareCopyCode">Sao ch\u00e9p M\u00e3 \u0111\u1ec1</button></div>' +
            '</div>' +
            '<div class="field"><span>\u0110\u01b0\u1eddng d\u1eabn tr\u1ef1c ti\u1ebfp</span>' +
              '<div class="voucher-row"><input type="text" id="shareUrlOut" value="' + U().esc(shareUrl) + '" readonly><button type="button" class="btn btn-emerald btn-sm" id="shareCopyUrl">Sao ch\u00e9p Link</button></div>' +
            '</div>' +
            '<p class="muted" style="font-size:.78rem;margin:10px 0 0">B\u1ed9 \u0111\u1ec1 g\u1ed3m <strong>' + sanitized.questions.length + ' c\u00e2u h\u1ecfi</strong> \u0111\u00e3 x\u00e1c nh\u1eadn l\u01b0u th\u00e0nh c\u00f4ng.</p>' +
          '</div>' +
        '</div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-primary" id="shareCloseBtn">\u0110\u00f3ng</button></div>' +
      '</div></div>';
    if (typeof U().applyI18n === "function") U().applyI18n(host);

    U().on("shareCloseBtn", "click", function () { host.innerHTML = ""; });
    U().on("shareCopyCode", "click", function () { U().copyText(code, "m\u00e3 \u0111\u1ec1 " + code); });
    U().on("shareCopyUrl", "click", function () { U().copyText(shareUrl, "\u0111\u01b0\u1eddng d\u1eabn chia s\u1ebb"); });
    U().on("shareVisSelect", "change", async function (ev) {
      const wantPublic = ev.target.value === "public";
      ev.target.disabled = true;
      try {
        await updateQuizVisibility(code, wantPublic, deck.id);
        isPublic = wantPublic;
        deck.isPublic = wantPublic;
        const badge = U().$("shareVisBadge");
        if (badge) {
          badge.textContent = wantPublic ? "🌐 Public" : "🔒 Private";
          badge.className = "badge " + (wantPublic ? "badge-ok" : "badge-warn");
        }
        const notice = U().$("sharePrivateNotice");
        if (notice) notice.style.display = wantPublic ? "none" : "flex";
        U().showToast("\u0110\u00e3 c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i Quiz: " + (wantPublic ? "🌐 Public" : "🔒 Private"), "success");
        if (window.UETStudio && typeof window.UETStudio.render === "function") window.UETStudio.render();
      } catch (err) {
        ev.target.value = isPublic ? "public" : "private";
        U().showToast(err.message || "C\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i th\u1ea5t b\u1ea1i.", "error");
      } finally {
        ev.target.disabled = false;
      }
    });
    U().on("shareSwitchPublicCopy", "click", async function (ev) {
      ev.target.disabled = true;
      try {
        await updateQuizVisibility(code, true, deck.id);
        isPublic = true;
        deck.isPublic = true;
        const sel = U().$("shareVisSelect");
        if (sel) sel.value = "public";
        const badge = U().$("shareVisBadge");
        if (badge) { badge.textContent = "🌐 Public"; badge.className = "badge badge-ok"; }
        const notice = U().$("sharePrivateNotice");
        if (notice) notice.style.display = "none";
        U().copyText(shareUrl, "\u0111\u01b0\u1eddng d\u1eabn chia s\u1ebb");
        U().showToast("\u0110\u00e3 chuy\u1ec3n sang 🌐 Public v\u00e0 sao ch\u00e9p Link!", "success");
        if (window.UETStudio && typeof window.UETStudio.render === "function") window.UETStudio.render();
      } catch (err) {
        U().showToast(err.message || "Kh\u00f4ng th\u1ec3 chuy\u1ec3n sang Public.", "error");
      } finally {
        ev.target.disabled = false;
      }
    });
    U().on("shareDownQrBtn", "click", async function () {
      try {
        const resp = await fetch(qrImgUrl);
        const blob = await resp.blob();
        U().downloadBlob(blob, "QR_" + code + ".png");
        U().showToast("\u0110\u00e3 t\u1ea3i m\u00e3 QR " + code + ".png", "success");
      } catch (e) {
        window.open(qrImgUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  function renderQuizLoadError(stateCode, detailMsg, retryCode) {
    const titles = {
      QUIZ_NOT_FOUND: "🔍 Quiz Not Found",
      QUIZ_PRIVATE: "🔒 This Quiz is Private",
      NETWORK_ERROR: "📡 Network Error – Retry",
      UNABLE_TO_LOAD: "⚠️ Unable to Load Quiz"
    };
    const descs = {
      QUIZ_NOT_FOUND: "Kh\u00f4ng t\u00ecm th\u1ea5y Quiz v\u1edbi m\u00e3 n\u00e0y. Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i \u0111\u01b0\u1eddng d\u1eabn ho\u1eb7c m\u00e3 chia s\u1ebb.",
      QUIZ_PRIVATE: "Quiz n\u00e0y \u0111ang \u0111\u01b0\u1ee3c \u0111\u1eb7t \u1edf ch\u1ebf \u0111\u1ed9 Ri\u00eang t\u01b0 (Private). H\u00e3y \u0111\u0103ng nh\u1eadp b\u1eb1ng t\u00e0i kho\u1ea3n ch\u1ee7 s\u1edf h\u1eefu ho\u1eb7c nh\u1edd t\u00e1c gi\u1ea3 chuy\u1ec3n sang Public.",
      NETWORK_ERROR: "Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7 \u0111\u1ec3 t\u1ea3i Quiz. Vui l\u00f2ng ki\u1ec3m tra m\u1ea1ng v\u00e0 th\u1eed l\u1ea1i.",
      UNABLE_TO_LOAD: "D\u1eef li\u1ec7u Quiz kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c kh\u00f4ng th\u1ec3 gi\u1ea3i m\u00e3."
    };
    const title = titles[stateCode] || titles.UNABLE_TO_LOAD;
    const desc = detailMsg || descs[stateCode] || descs.UNABLE_TO_LOAD;
    if (!U().state.user && typeof U().enterGuestShareMode === "function") {
      U().enterGuestShareMode();
    }
    if (typeof U().showTab === "function") U().showTab("studio");
    const root = U().$("studioRoot");
    if (root) {
      root.innerHTML =
        '<div class="panel" style="max-width:560px;margin:28px auto;text-align:center;padding:28px 22px">' +
          '<h2 style="margin:0 0 8px">' + U().esc(title) + '</h2>' +
          '<p class="muted" style="margin:0 0 18px;font-size:.9rem;line-height:1.6">' + U().esc(desc) + '</p>' +
          '<div class="deck-actions" style="justify-content:center">' +
            (stateCode === "NETWORK_ERROR" ? '<button type="button" class="btn btn-primary" id="quizErrRetryBtn">🔄 Th\u1eed l\u1ea1i (Retry)</button>' : '') +
            '<button type="button" class="btn btn-outline" id="quizErrHomeBtn">🏠 V\u1ec1 trang ch\u1ee7</button>' +
          '</div>' +
        '</div>';
      U().on("quizErrRetryBtn", "click", function () { resolveAndOpenShare(retryCode || ""); });
      U().on("quizErrHomeBtn", "click", function () { U().showTab("dashboard"); });
    }
    U().showToast(title, stateCode === "QUIZ_PRIVATE" ? "warning" : "error");
  }

  async function resolveAndOpenShare(inputCodeOrEmpty) {
    let code = String(inputCodeOrEmpty || "").trim().toUpperCase();
    let hashData = "";
    if (!code) {
      const params = new URLSearchParams(window.location.search);
      code = (params.get("quiz") || params.get("code") || params.get("share") || "").trim().toUpperCase();
      if (!code) {
        const pathMatch = String(window.location.pathname || "").match(/^\/quiz\/([^/?#]+)/i);
        if (pathMatch) code = decodeURIComponent(pathMatch[1]).trim().toUpperCase();
      }
      const m = String(window.location.hash || "").match(/d=([^&]+)/);
      if (m) hashData = m[1];
    }
    if (!code && !hashData) return false;

    let deck = null;
    let errorKind = "";
    if (code) {
      // 1. Try server/Supabase /api/shares/:code with auth headers if signed in
      try {
        const u = U().state.user;
        const hdr = {};
        if (u && u.email) hdr["X-User-Email"] = u.email;
        if (u && u.credential) hdr["Authorization"] = "Bearer " + u.credential;
        const res = await fetch("/api/shares/" + encodeURIComponent(code), { headers: hdr });
        if (res.ok) {
          const j = await res.json();
          if (j && j.share && j.share.deck) deck = j.share.deck;
        } else if (res.status === 403) {
          renderQuizLoadError("QUIZ_PRIVATE", "", code);
          return false;
        } else if (res.status === 404) {
          errorKind = "QUIZ_NOT_FOUND";
        } else if (res.status >= 500) {
          errorKind = "NETWORK_ERROR";
        }
      } catch (e) {
        errorKind = "NETWORK_ERROR";
      }
      // 2. Try localStorage cache
      if (!deck && errorKind !== "QUIZ_PRIVATE") {
        const localShares = U().loadObj(SHARES_KEY);
        if (localShares[code] && localShares[code].deck) {
          const entry = localShares[code];
          if (entry.isPublic === false) {
            const u = U().state.user;
            if (!u) {
              renderQuizLoadError("QUIZ_PRIVATE", "", code);
              return false;
            }
          }
          deck = entry.deck;
        }
      }
    }
    // 3. Fallback compressed URL payload (works in incognito tabs without server!)
    if (!deck && hashData) deck = decodeSharedDeck(hashData);

    if (!deck || !Array.isArray(deck.questions) || deck.questions.length === 0) {
      renderQuizLoadError(errorKind || (hashData ? "UNABLE_TO_LOAD" : "QUIZ_NOT_FOUND"), "", code);
      return false;
    }

    // Enter Guest Share Mode if not logged in so incognito users can play immediately!
    if (!U().state.user && typeof U().enterGuestShareMode === "function") {
      U().enterGuestShareMode();
    }
    if (window.UETStudio && typeof window.UETStudio.openLobbyFromDeck === "function") {
      window.UETStudio.openLobbyFromDeck(deck);
      U().showToast("\u0110\u00e3 m\u1edf b\u1ed9 \u0111\u1ec1 \"" + deck.title + "\" (" + deck.questions.length + " c\u00e2u). S\u1eb5n s\u00e0ng l\u00e0m b\u00e0i!", "success");
      return true;
    }
    renderQuizLoadError("UNABLE_TO_LOAD", "", code);
    return false;
  }

  /* ==================== PART 4: PRINT-READY PDF EXPORT ==================== */
  function openPdfModal(deck) {
    if (!deck || !Array.isArray(deck.questions) || deck.questions.length === 0) {
      U().showToast("B\u1ed9 \u0111\u1ec1 ch\u01b0a c\u00f3 c\u00e2u h\u1ecfi \u0111\u1ec3 xu\u1ea5t PDF.", "warning");
      return;
    }
    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="pdfModal" role="dialog" aria-modal="true"><div class="modal">' +
        '<h3>🖨️ Xu\u1ea5t \u0111\u1ec1 thi ra PDF (Chu\u1ea9n kh\u1ed5 A4)</h3>' +
        '<p class="muted" style="margin-top:0;font-size:.84rem">' + U().esc(deck.title) + ' • <strong>' + deck.questions.length + ' c\u00e2u h\u1ecfi</strong></p>' +
        '<fieldset class="radio-group"><legend style="font-weight:700;font-size:.84rem">Ch\u1ebf \u0111\u1ed9 xu\u1ea5t</legend>' +
          '<label class="check-row"><input type="radio" name="pdfMode" value="student" checked> <strong>B\u1ea3n cho h\u1ecdc sinh</strong> (ch\u1ec9 in \u0111\u1ec1 thi, \u1ea9n \u0111\u00e1p \u00e1n)</label>' +
          '<label class="check-row"><input type="radio" name="pdfMode" value="teacher"> <strong>B\u1ea3n cho gi\u00e1o vi\u00ean</strong> (t\u00f4 \u0111\u1eadm \u0111\u00e1p \u00e1n \u0111\u00fang + b\u1ea3ng \u0111\u00e1p \u00e1n &amp; gi\u1ea3i th\u00edch cu\u1ed1i trang)</label>' +
        '</fieldset>' +
        '<label class="field">B\u1ed1 c\u1ee5c c\u1ed9t ph\u01b0\u01a1ng \u00e1n tr\u1ea3 l\u1eddi' +
          '<select id="pdfCols"><option value="2">2 c\u1ed9t g\u1ecdn g\u00e0ng (A/B – C/D)</option><option value="1">1 c\u1ed9t d\u1ecdc (ph\u00f9 h\u1ee3p c\u00e2u d\u00e0i / nhi\u1ec1u c\u00f4ng th\u1ee9c)</option></select>' +
        '</label>' +
        '<label class="check-row"><input type="checkbox" id="pdfHeaderBox" checked> Th\u00eam khung <strong>H\u1ecd t\u00ean / L\u1edbp / \u0110i\u1ec3m</strong> \u1edf \u0111\u1ea7u trang</label>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-outline" id="pdfCancelBtn">H\u1ee7y</button>' +
          '<button type="button" class="btn btn-primary" id="pdfPrintBtn">🖨️ In / L\u01b0u th\u00e0nh PDF</button>' +
        '</div>' +
      '</div></div>';
    if (typeof U().applyI18n === "function") U().applyI18n(host);

    U().on("pdfCancelBtn", "click", function () { host.innerHTML = ""; });
    U().on("pdfPrintBtn", "click", function () {
      const modeEl = document.querySelector('input[name="pdfMode"]:checked');
      const mode = modeEl ? modeEl.value : "student";
      const cols = (U().$("pdfCols") ? U().$("pdfCols").value : "2") === "1" ? 1 : 2;
      const showHeader = !!(U().$("pdfHeaderBox") && U().$("pdfHeaderBox").checked);
      host.innerHTML = "";
      renderPrintSheet(deck, { mode: mode, cols: cols, showHeader: showHeader });
      setTimeout(function () { window.print(); }, 180);
    });
  }

  function renderPrintSheet(deck, opts) {
    const sheet = U().$("printSheet");
    if (!sheet) return;
    const isTeacher = opts.mode === "teacher";
    let h = '<div class="print-doc">';
    if (opts.showHeader) {
      h += '<div class="print-header-box">' +
        '<div><strong>H\u1ecd v\u00e0 t\u00ean:</strong> ................................................</div>' +
        '<div><strong>L\u1edbp / MSSV:</strong> ..........................................</div>' +
        '<div><strong>\u0110i\u1ec3m:</strong> ....................</div>' +
      '</div>';
    }
    h += '<div class="print-title"><h1>' + U().esc(deck.title) + '</h1>' +
      '<div class="print-sub">' + (deck.tag ? ("M\u00f4n: " + U().esc(deck.tag) + " · ") : "") + 'T\u1ed5ng s\u1ed1: ' + deck.questions.length + ' c\u00e2u · ' + (isTeacher ? "B\u1ea2N GI\u00c1O VI\u00caN (C\u00d3 \u0110\u00c1P \u00c1N)" : "\u0110\u1ec0 THI D\u00c0NH CHO H\u1eccC SINH") + '</div></div>';

    h += '<div class="print-questions">' + deck.questions.map(function (q, idx) {
      const optCls = opts.cols === 2 ? "print-opts cols-2" : "print-opts cols-1";
      const optsHtml = q.options.map(function (o, k) {
        const isCor = isTeacher && q.correct.indexOf(k) !== -1;
        return '<div class="print-opt' + (isCor ? " is-cor" : "") + '"><strong>' + U().LETTERS.charAt(k) + '.</strong> <span class="rich-text">' + U().renderRich(o) + '</span></div>';
      }).join("");
      return '<article class="print-q">' +
        '<div class="print-q-text"><strong>C\u00e2u ' + (idx + 1) + '.</strong> <span class="rich-text">' + U().renderRich(q.text) + '</span></div>' +
        (q.image ? '<img src="' + U().esc(q.image) + '" class="print-q-img" alt="">' : "") +
        '<div class="' + optCls + '">' + optsHtml + '</div>' +
      '</article>';
    }).join("") + '</div>';

    if (isTeacher) {
      h += '<section class="print-answer-section"><h2>B\u1ea2NG \u0110\u00c1P \u00c1N &amp; GI\u1ea2I TH\u00cdCH CHI TI\u1ebeT</h2>' +
        '<div class="print-key-grid">' + deck.questions.map(function (q, idx) {
          const ans = q.correct.map(function (c) { return U().LETTERS.charAt(c); }).join(",");
          return '<div class="print-key-cell"><strong>' + (idx + 1) + '.</strong> ' + ans + '</div>';
        }).join("") + '</div>';
      const withExp = deck.questions.map(function (q, i) { return { q: q, i: i }; }).filter(function (x) { return x.q.explanation; });
      if (withExp.length > 0) {
        h += '<div class="print-exps"><h3>Gi\u1ea3i th\u00edch chi ti\u1ebft</h3>' + withExp.map(function (x) {
          return '<div class="print-exp-item"><strong>C\u00e2u ' + (x.i + 1) + ':</strong> <span class="rich-text">' + U().renderRich(x.q.explanation) + '</span></div>';
        }).join("") + '</div>';
      }
      h += '</section>';
    }
    h += '</div>';
    sheet.innerHTML = h;
  }

  window.UETCloud = {
    cloudStorageService: cloudStorageService,
    renderBackupPage: renderBackupPage,
    getOrCreateUserDriveFolder: getOrCreateUserDriveFolder,
    backupToGoogleDrive: backupToGoogleDrive,
    restoreFromGoogleDrive: restoreFromGoogleDrive,
    exportJsonBackup: exportJsonBackup,
    openShareModal: openShareModal,
    updateQuizVisibility: updateQuizVisibility,
    sanitizeQuizPayloadForSave: sanitizeQuizPayloadForSave,
    resolveAndOpenShare: resolveAndOpenShare,
    openPdfModal: openPdfModal,
    encodeSharedDeck: encodeSharedDeck,
    decodeSharedDeck: decodeSharedDeck,
    buildBackupPayload: buildBackupPayload,
    applyBackupPayload: applyBackupPayload
  };
})();
