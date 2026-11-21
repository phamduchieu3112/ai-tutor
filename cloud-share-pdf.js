/* ============================================================
   AI Tutor – 3-Layer Cloud/Drive Backup, Share Link/QR & Print-Ready PDF
   ============================================================ */

// Dán OAuth 2.0 Web Client ID từ Google Cloud Console (đã bật Google Drive API) vào đây:
const GOOGLE_DRIVE_CLIENT_ID = "480927164540-o3o4h9v5vmi8h93605ridg4eqvtf5rcf.apps.googleusercontent.com";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file openid email";
const DRIVE_BACKUP_NAME = "AI_Tutor_Cloud_Backup.json";

// Cấu hình mở rộng cho Cloud Sync (sẵn sàng kết nối Supabase / Firebase khi triển khai)
const CLOUD_CONFIG = {
  provider: "auto", // "auto" (dùng server cục bộ nếu có, fallback IndexedDB/localStorage) | "supabase" | "firebase"
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
    lastSyncText: "☁️ Đã đồng bộ",
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
      el.classList.toggle("saving", stateStr.indexOf("Đang lưu") !== -1);
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
    return {
      version: 2,
      app: "AI Tutor",
      exportedAt: new Date().toISOString(),
      userEmail: u ? u.email : "",
      exam_sets: U().loadArr(U().KEYS.decks),
      wrong_questions: U().loadObj(U().KEYS.mistakes),
      quiz_history: U().loadArr(U().KEYS.history),
      studio_quizzes: U().loadArr(U().KEYS.quizzes),
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
    return hasDecks || hasWrong || hasHist || Array.isArray(obj.studio_quizzes);
  }

  function applyBackupPayload(obj, mode) {
    if (!validateBackupPayload(obj)) {
      U().showToast("File sao lưu không hợp lệ hoặc bị hỏng cấu trúc.", "error");
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
      const qSeen = {};
      curQz.forEach(function (q) { if (q && q.id) qSeen[q.id] = true; });
      (Array.isArray(obj.studio_quizzes) ? obj.studio_quizzes : []).forEach(function (q) {
        if (q && q.id && !qSeen[q.id]) { curQz.push(q); qSeen[q.id] = true; }
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

    if (typeof U().rebuildAndRefresh === "function") U().rebuildAndRefresh();
    else U().renderTab();
    cloudStorageService.scheduleSync();
    return true;
  }

  const cloudStorageService = {
    scheduleSync: function () {
      if (!U() || !U().state.user) return;
      setSyncIndicator("🔄 Đang lưu...");
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
      setSyncIndicator("☁️ Đã đồng bộ");
    },
    pull: async function () {
      const u = U().state.user;
      if (!u) return;
      setSyncIndicator("🔄 Đang đồng bộ...");
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
        U().showToast("Đã tự động khôi phục " + remote.exam_sets.length + " bộ đề từ bộ nhớ đệm Cloud/IndexedDB!", "success");
      }
      setSyncIndicator("☁️ Đã đồng bộ");
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
        return reject(new Error("Thư viện Google Identity Services chưa tải xong. Vui lòng kiểm tra kết nối mạng."));
      }
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_DRIVE_CLIENT_ID,
          scope: GOOGLE_DRIVE_SCOPE,
          callback: function (resp) {
            if (!resp || resp.error || !resp.access_token) {
              return reject(new Error(resp && resp.error ? ("Google OAuth: " + resp.error) : "Đã hủy cấp quyền Google Drive."));
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
    if (!res.ok) throw new Error("Không thể lấy thông tin email Google (HTTP " + res.status + ")");
    const info = await res.json();
    if (!info || !info.email) throw new Error("Tài khoản Google không cung cấp địa chỉ email.");
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
    if (!searchRes.ok) throw new Error("Lỗi kiểm tra thư mục Google Drive (HTTP " + searchRes.status + ")");
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
    if (!createRes.ok) throw new Error("Lỗi tạo thư mục trên Google Drive (HTTP " + createRes.status + ")");
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
    if (!res.ok) throw new Error("Lỗi tìm file Google Drive (HTTP " + res.status + ")");
    const data = await res.json();
    return (data && Array.isArray(data.files) && data.files[0]) ? data.files[0] : null;
  }

  async function connectGoogleDrive() {
    try {
      const token = await requestDriveToken();
      const folder = await getOrCreateUserDriveFolder(token);
      U().showToast("Đã kết nối Google Drive! Thư mục lưu trữ: \"" + folder.name + "\".", "success");
      renderBackupPage();
    } catch (e) {
      if (e.message === "UNCONFIGURED") {
        U().showToast("Chưa cấu hình GOOGLE_DRIVE_CLIENT_ID! Hãy thay thế \"YOUR_GOOGLE_CLIENT_ID\" ở dòng 6 của file cloud-share-pdf.js bằng Client ID từ Google Cloud Console.", "warning");
      } else {
        U().showToast(e.message || "Không thể kết nối Google Drive.", "error");
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
      if (!res.ok) throw new Error("Lỗi tải lên Google Drive (HTTP " + res.status + ")");
      const nowIso = new Date().toISOString();
      try { localStorage.setItem(DRIVE_LAST_KEY, nowIso); } catch (e) { /* */ }
      U().showToast("Đã sao lưu " + DRIVE_BACKUP_NAME + " vào thư mục \"" + folder.name + "\" thành công!", "success");
    } catch (e) {
      if (e.message === "UNCONFIGURED") {
        U().showToast("Chưa thay \"YOUR_GOOGLE_CLIENT_ID\" trong cloud-share-pdf.js bằng OAuth Client ID từ Google Cloud Console.", "warning");
      } else if (e.message === "TOKEN_EXPIRED") {
        U().showToast("Phiên Google Drive đã hết hạn (401). Vui lòng bấm Kết nối lại.", "warning");
      } else {
        U().showToast("Sao lưu thất bại: " + (e.message || "Không xác định"), "error");
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
        // Fallback: tìm bản sao lưu cũ nằm ngoài thư mục nếu có
        existing = await findDriveBackupFile(token, "");
      }
      if (!existing) {
        U().showToast("Không tìm thấy file " + DRIVE_BACKUP_NAME + " trong thư mục \"" + folder.name + "\" trên Google Drive.", "warning");
        return;
      }
      const res = await fetch("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(existing.id) + "?alt=media", {
        headers: { Authorization: "Bearer " + token }
      });
      if (res.status === 401) { cs.driveToken = ""; cs.driveTokenExp = 0; throw new Error("TOKEN_EXPIRED"); }
      if (!res.ok) throw new Error("Không tải được dữ liệu từ Google Drive (HTTP " + res.status + ")");
      const data = await res.json();
      if (applyBackupPayload(data, mode)) {
        U().showToast("Đã khôi phục dữ liệu từ \"" + folder.name + "\" thành công (" + (mode === "replace" ? "Ghi đè" : "Gộp thêm") + ")!", "success");
      }
    } catch (e) {
      if (e.message === "UNCONFIGURED") {
        U().showToast("Chưa thay \"YOUR_GOOGLE_CLIENT_ID\" trong cloud-share-pdf.js bằng OAuth Client ID từ Google Cloud Console.", "warning");
      } else if (e.message === "TOKEN_EXPIRED") {
        U().showToast("Phiên Google Drive đã hết hạn (401). Vui lòng kết nối lại.", "warning");
      } else {
        U().showToast("Khôi phục thất bại: " + (e.message || "Không xác định"), "error");
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
      U().showToast("Đã tải file sao lưu " + fname, "success");
    } catch (e) { U().showToast("Không thể xuất file sao lưu.", "error"); }
  }

  function importJsonBackupFile(file, mode) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = function () { U().showToast("Không thể đọc file sao lưu.", "error"); };
    reader.onload = function (ev) {
      try {
        const parsed = JSON.parse(String(ev.target.result || ""));
        if (!validateBackupPayload(parsed)) {
          U().showToast("File JSON không đúng định dạng sao lưu của AI Tutor.", "error");
          return;
        }
        const deckCnt = Array.isArray(parsed.exam_sets) ? parsed.exam_sets.length : 0;
        const doApply = function () {
          if (applyBackupPayload(parsed, mode)) {
            U().showToast("Đã khôi phục " + deckCnt + " bộ đề và dữ liệu học tập thành công!", "success");
            renderBackupPage();
          }
        };
        if (mode === "replace") {
          U().showConfirm("Ghi đè dữ liệu hiện tại", "Chế độ Ghi đè sẽ thay thế toàn bộ bộ đề và tiến độ hiện tại bằng dữ liệu từ file (" + deckCnt + " bộ đề). Tiếp tục?", doApply);
        } else doApply();
      } catch (e) { U().showToast("File JSON bị lỗi cú pháp.", "error"); }
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

    const userEmail = U().state.user && U().state.user.email ? U().state.user.email : "email-cua-ban";
    const folderDisplay = "AI Tutor - " + userEmail;

    root.innerHTML =
      '<div class="api-wrap">' +
        '<section class="panel">' +
          '<div class="panel-head"><div><h2>☁️ Sao lưu &amp; Khôi phục dữ liệu (3 Lớp)</h2>' +
          '<p class="muted" style="margin:0;font-size:.84rem">Dữ liệu hiện có: <strong>' + deckCount + '</strong> bộ đề · <strong>' + mkCount + '</strong> câu sai · <strong>' + histCount + '</strong> lịch sử thi.</p></div>' +
          '<span class="badge badge-ok">' + U().esc(cs.lastSyncText) + '</span></div>' +

          '<div class="radio-group" style="margin-bottom:14px"><legend style="font-weight:700;font-size:.84rem">Chế độ khi khôi phục dữ liệu</legend>' +
            '<label class="check-row"><input type="radio" name="restoreMode" value="merge"' + (cs.restoreMode === "merge" ? " checked" : "") + '> <strong>Gộp thêm (Merge)</strong> – Giữ bộ đề hiện có và thêm bộ đề mới từ bản sao lưu</label>' +
            '<label class="check-row"><input type="radio" name="restoreMode" value="replace"' + (cs.restoreMode === "replace" ? " checked" : "") + '> <strong>Ghi đè (Replace)</strong> – Thay thế toàn bộ dữ liệu trên trình duyệt bằng bản sao lưu</label>' +
          '</div>' +

          /* Google Drive Card */
          '<div class="deck-row" style="margin-bottom:14px">' +
            '<div class="deck-title-line"><span class="deck-title">1. Google Drive cá nhân (📁 <code>' + U().esc(folderDisplay) + '</code> / <code>' + DRIVE_BACKUP_NAME + '</code>)</span>' +
            '<span class="badge ' + (connected ? "badge-ok" : "badge-warn") + '">' + (connected ? "Đã kết nối" : "Chưa kết nối") + '</span></div>' +
            '<p class="muted" style="margin:0;font-size:.82rem">Tự động tạo thư mục riêng <strong>' + U().esc(folderDisplay) + '</strong> và ghi đè duy nhất 1 file sao lưu bên trong bằng quyền <code>drive.file</code>.' +
              (lastDrive ? ' Lần sao lưu gần nhất: <strong>' + U().esc(U().fmtDateTime(lastDrive)) + '</strong>.' : '') + '</p>' +
            (!configured ? '<div class="pending-banner" style="margin:4px 0;font-size:.8rem">ℹ️ Đang dùng placeholder <code>YOUR_GOOGLE_CLIENT_ID</code>. Hãy dán OAuth Client ID từ Google Cloud Console vào dòng 6 của <code>cloud-share-pdf.js</code> để bật Google Drive.</div>' : "") +
            '<div class="deck-actions">' +
              '<button type="button" class="btn btn-outline btn-sm" data-bact="drive-connect"' + (cs.driveBusy ? " disabled" : "") + '>🔗 ' + (connected ? "Kết nối lại Drive" : "Kết nối Google Drive") + '</button>' +
              '<button type="button" class="btn btn-primary btn-sm" data-bact="drive-backup"' + (cs.driveBusy ? " disabled" : "") + '>' + (cs.driveBusy ? '<span class="spinner"></span>Đang xử lý...' : "☁️ Sao lưu lên Google Drive") + '</button>' +
              '<button type="button" class="btn btn-emerald btn-sm" data-bact="drive-restore"' + (cs.driveBusy ? " disabled" : "") + '>⬇️ Khôi phục từ Google Drive</button>' +
            '</div>' +
          '</div>' +

          /* Offline JSON Card */
          '<div class="deck-row" style="margin-bottom:14px">' +
            '<div class="deck-title-line"><span class="deck-title">2. Sao lưu &amp; Khôi phục ngoại tuyến (.json)</span><span class="badge">Hoạt động 100% Offline</span></div>' +
            '<p class="muted" style="margin:0;font-size:.82rem">Tải về máy tính/điện thoại file <code>AI_Tutor_Backup_' + dateStamp() + '.json</code> để lưu trữ an toàn hoặc chuyển sang thiết bị khác.</p>' +
            '<div class="deck-actions">' +
              '<button type="button" class="btn btn-primary btn-sm" data-bact="json-export">⬇️ Xuất file sao lưu (.json)</button>' +
              '<label class="btn btn-outline btn-sm file-btn">⬆️ Khôi phục từ file (.json)<input type="file" id="jsonRestoreFile" accept=".json,application/json" hidden></label>' +
            '</div>' +
          '</div>' +

          /* Cloud Sync Layer Info */
          '<div class="deck-row">' +
            '<div class="deck-title-line"><span class="deck-title">3. Lớp đồng bộ Cloud &amp; IndexedDB tự động</span>' +
            '<span class="badge badge-ok">' + (U().state.backendOnline ? "Server cục bộ + IndexedDB" : "IndexedDB + localStorage") + '</span></div>' +
            '<p class="muted" style="margin:0;font-size:.82rem">Dịch vụ <code>cloudStorageService</code> tự động đồng bộ nền theo tài khoản Google và giữ bản dự phòng trong IndexedDB (sẵn sàng kết nối Supabase / Firebase).</p>' +
            '<div class="deck-actions"><button type="button" class="btn btn-outline btn-sm" data-bact="cloud-sync-now">🔄 Đồng bộ ngay</button></div>' +
          '</div>' +
        '</section>' +
      '</div>';

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
        else if (act === "cloud-sync-now") { cloudStorageService.push().then(function () { U().showToast("Đã đồng bộ dữ liệu thành công.", "success"); }); }
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
        title: String(c.t || "Bộ đề được chia sẻ"),
        tag: String(c.g || "Chia sẻ"),
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

  async function openShareModal(deck) {
    if (!deck || !Array.isArray(deck.questions) || deck.questions.length === 0) {
      U().showToast("Bộ đề chưa có câu hỏi để chia sẻ.", "warning");
      return;
    }
    let code = "AIT-" + Math.floor(1000 + Math.random() * 9000);
    const localShares = U().loadObj(SHARES_KEY);
    // Reuse existing code for same deck if already shared
    const existingCode = Object.keys(localShares).find(function (k) { return localShares[k] && localShares[k].deck && localShares[k].deck.id === deck.id; });
    if (existingCode) code = existingCode;

    if (U().state.backendOnline) {
      try {
        const res = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Email": U().state.user ? U().state.user.email : "" },
          body: JSON.stringify({ code: code, deck: { id: deck.id, title: deck.title, tag: deck.tag, questions: deck.questions } })
        });
        if (res.ok) {
          const j = await res.json();
          if (j && j.code) code = j.code;
        }
      } catch (e) { /* fallback local */ }
    }
    localShares[code] = { code: code, deck: { id: deck.id, title: deck.title, tag: deck.tag, questions: deck.questions }, createdAt: new Date().toISOString() };
    U().saveJSON(SHARES_KEY, localShares);

    const origin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "";
    const compressed = encodeSharedDeck(deck);
    const includeHash = compressed && compressed.length < 14000;
    const shareUrl = origin + "/quiz?code=" + encodeURIComponent(code) + (includeHash ? ("#d=" + compressed) : "");
    const qrTarget = origin + "/quiz?code=" + encodeURIComponent(code) + (includeHash && compressed.length < 1500 ? ("#d=" + compressed) : "");
    const qrImgUrl = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=" + encodeURIComponent(qrTarget);

    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="shareModal" role="dialog" aria-modal="true"><div class="modal modal-lg">' +
        '<h3>🔗 Chia sẻ bộ đề: ' + U().esc(deck.title) + '</h3>' +
        '<p class="muted" style="margin-top:0;font-size:.84rem">Học sinh mở Link, quét mã QR hoặc nhập Mã đề ở trang chủ sẽ vào thẳng <strong>Quiz Lobby</strong> làm bài ngay (không cần import Excel).</p>' +
        '<div class="checkout-grid">' +
          '<div class="qr-box" style="flex-direction:column;gap:8px">' +
            '<img id="shareQrImg" src="' + U().esc(qrImgUrl) + '" alt="Mã QR chia sẻ đề" crossorigin="anonymous">' +
            '<button type="button" class="btn btn-outline btn-sm" id="shareDownQrBtn">⬇ Tải mã QR</button>' +
          '</div>' +
          '<div>' +
            '<div class="field"><span>Mã đề ngắn</span>' +
              '<div class="voucher-row"><input type="text" id="shareCodeOut" value="' + U().esc(code) + '" readonly style="font-weight:800;font-size:1.05rem;letter-spacing:.08em"><button type="button" class="btn btn-primary btn-sm" id="shareCopyCode">Sao chép Mã đề</button></div>' +
            '</div>' +
            '<div class="field"><span>Đường dẫn trực tiếp (hoạt động cả tab ẩn danh)</span>' +
              '<div class="voucher-row"><input type="text" id="shareUrlOut" value="' + U().esc(shareUrl) + '" readonly><button type="button" class="btn btn-emerald btn-sm" id="shareCopyUrl">Sao chép Link</button></div>' +
            '</div>' +
            '<p class="muted" style="font-size:.78rem;margin:10px 0 0">Bộ đề gồm <strong>' + deck.questions.length + ' câu hỏi</strong>. ' + (includeHash ? "Dữ liệu đã được đóng gói kèm Link để mở trực tiếp trên mọi trình duyệt." : "Bộ đề dung lượng lớn được lưu qua mã đề " + U().esc(code) + " trên máy chủ.") + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-primary" id="shareCloseBtn">Đóng</button></div>' +
      '</div></div>';

    U().on("shareCloseBtn", "click", function () { host.innerHTML = ""; });
    U().on("shareCopyCode", "click", function () { U().copyText(code, "mã đề " + code); });
    U().on("shareCopyUrl", "click", function () { U().copyText(shareUrl, "đường dẫn chia sẻ"); });
    U().on("shareDownQrBtn", "click", async function () {
      try {
        const resp = await fetch(qrImgUrl);
        const blob = await resp.blob();
        U().downloadBlob(blob, "QR_" + code + ".png");
        U().showToast("Đã tải mã QR " + code + ".png", "success");
      } catch (e) {
        window.open(qrImgUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  async function resolveAndOpenShare(inputCodeOrEmpty) {
    let code = String(inputCodeOrEmpty || "").trim().toUpperCase();
    let hashData = "";
    if (!code) {
      const params = new URLSearchParams(window.location.search);
      code = (params.get("code") || params.get("share") || "").trim().toUpperCase();
      const m = String(window.location.hash || "").match(/d=([^&]+)/);
      if (m) hashData = m[1];
    }
    if (!code && !hashData) return false;

    let deck = null;
    if (code) {
      // 1. Try local server /api/shares/:code
      try {
        const res = await fetch("/api/shares/" + encodeURIComponent(code));
        if (res.ok) {
          const j = await res.json();
          if (j && j.share && j.share.deck) deck = j.share.deck;
        }
      } catch (e) { /* ignore */ }
      // 2. Try localStorage
      if (!deck) {
        const localShares = U().loadObj(SHARES_KEY);
        if (localShares[code] && localShares[code].deck) deck = localShares[code].deck;
      }
    }
    // 3. Fallback compressed URL payload (works in incognito tabs without server!)
    if (!deck && hashData) deck = decodeSharedDeck(hashData);

    if (!deck || !Array.isArray(deck.questions) || deck.questions.length === 0) {
      U().showToast("Không tìm thấy bộ đề với mã " + (code || "đã nhập") + ".", "error");
      return false;
    }

    // Enter Guest Share Mode if not logged in so incognito users can play immediately!
    if (!U().state.user && typeof U().enterGuestShareMode === "function") {
      U().enterGuestShareMode();
    }
    if (window.UETStudio && typeof window.UETStudio.openLobbyFromDeck === "function") {
      window.UETStudio.openLobbyFromDeck(deck);
      U().showToast("Đã mở bộ đề \"" + deck.title + "\" (" + deck.questions.length + " câu). Sẵn sàng làm bài!", "success");
      return true;
    }
    return false;
  }

  /* ==================== PART 4: PRINT-READY PDF EXPORT ==================== */
  function openPdfModal(deck) {
    if (!deck || !Array.isArray(deck.questions) || deck.questions.length === 0) {
      U().showToast("Bộ đề chưa có câu hỏi để xuất PDF.", "warning");
      return;
    }
    const host = U().$("extraModals");
    if (!host) return;
    host.innerHTML =
      '<div class="modal-overlay" id="pdfModal" role="dialog" aria-modal="true"><div class="modal">' +
        '<h3>🖨️ Xuất đề thi ra PDF (Chuẩn khổ A4)</h3>' +
        '<p class="muted" style="margin-top:0;font-size:.84rem">' + U().esc(deck.title) + ' • <strong>' + deck.questions.length + ' câu hỏi</strong></p>' +
        '<fieldset class="radio-group"><legend style="font-weight:700;font-size:.84rem">Chế độ xuất</legend>' +
          '<label class="check-row"><input type="radio" name="pdfMode" value="student" checked> <strong>Bản cho học sinh</strong> (chỉ in đề thi, ẩn đáp án)</label>' +
          '<label class="check-row"><input type="radio" name="pdfMode" value="teacher"> <strong>Bản cho giáo viên</strong> (tô đậm đáp án đúng + bảng đáp án &amp; giải thích cuối trang)</label>' +
        '</fieldset>' +
        '<label class="field">Bố cục cột phương án trả lời' +
          '<select id="pdfCols"><option value="2">2 cột gọn gàng (A/B – C/D)</option><option value="1">1 cột dọc (phù hợp câu dài / nhiều công thức)</option></select>' +
        '</label>' +
        '<label class="check-row"><input type="checkbox" id="pdfHeaderBox" checked> Thêm khung <strong>Họ tên / Lớp / Điểm</strong> ở đầu trang</label>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-outline" id="pdfCancelBtn">Hủy</button>' +
          '<button type="button" class="btn btn-primary" id="pdfPrintBtn">🖨️ In / Lưu thành PDF</button>' +
        '</div>' +
      '</div></div>';

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
        '<div><strong>Họ và tên:</strong> ................................................</div>' +
        '<div><strong>Lớp / MSSV:</strong> ..........................................</div>' +
        '<div><strong>Điểm:</strong> ....................</div>' +
      '</div>';
    }
    h += '<div class="print-title"><h1>' + U().esc(deck.title) + '</h1>' +
      '<div class="print-sub">' + (deck.tag ? ("Môn: " + U().esc(deck.tag) + " · ") : "") + 'Tổng số: ' + deck.questions.length + ' câu · ' + (isTeacher ? "BẢN GIÁO VIÊN (CÓ ĐÁP ÁN)" : "ĐỀ THI DÀNH CHO HỌC SINH") + '</div></div>';

    h += '<div class="print-questions">' + deck.questions.map(function (q, idx) {
      const optCls = opts.cols === 2 ? "print-opts cols-2" : "print-opts cols-1";
      const optsHtml = q.options.map(function (o, k) {
        const isCor = isTeacher && q.correct.indexOf(k) !== -1;
        return '<div class="print-opt' + (isCor ? " is-cor" : "") + '"><strong>' + U().LETTERS.charAt(k) + '.</strong> <span class="rich-text">' + U().renderRich(o) + '</span></div>';
      }).join("");
      return '<article class="print-q">' +
        '<div class="print-q-text"><strong>Câu ' + (idx + 1) + '.</strong> <span class="rich-text">' + U().renderRich(q.text) + '</span></div>' +
        (q.image ? '<img src="' + U().esc(q.image) + '" class="print-q-img" alt="">' : "") +
        '<div class="' + optCls + '">' + optsHtml + '</div>' +
      '</article>';
    }).join("") + '</div>';

    if (isTeacher) {
      h += '<section class="print-answer-section"><h2>BẢNG ĐÁP ÁN &amp; GIẢI THÍCH CHI TIẾT</h2>' +
        '<div class="print-key-grid">' + deck.questions.map(function (q, idx) {
          const ans = q.correct.map(function (c) { return U().LETTERS.charAt(c); }).join(",");
          return '<div class="print-key-cell"><strong>' + (idx + 1) + '.</strong> ' + ans + '</div>';
        }).join("") + '</div>';
      const withExp = deck.questions.map(function (q, i) { return { q: q, i: i }; }).filter(function (x) { return x.q.explanation; });
      if (withExp.length > 0) {
        h += '<div class="print-exps"><h3>Giải thích chi tiết</h3>' + withExp.map(function (x) {
          return '<div class="print-exp-item"><strong>Câu ' + (x.i + 1) + ':</strong> <span class="rich-text">' + U().renderRich(x.q.explanation) + '</span></div>';
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
    resolveAndOpenShare: resolveAndOpenShare,
    openPdfModal: openPdfModal,
    encodeSharedDeck: encodeSharedDeck,
    decodeSharedDeck: decodeSharedDeck,
    buildBackupPayload: buildBackupPayload,
    applyBackupPayload: applyBackupPayload
  };
})();
