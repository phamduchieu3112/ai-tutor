/* ============================================================
   AI Tutor (UET Master) - Unified Serverless & Local API Handler
   Handles /api/* on both Vercel Serverless Functions and local Node server
   ============================================================ */
const fs = require("fs");
const path = require("path");
const net = require("net");
const tls = require("tls");
const { maskApiKey, encryptSecret, isEncryptionConfigured } = require("./lib/crypto");
const { handleAiProxy } = require("./lib/ai-proxy");
const { handleAdminSystemKeys, handleAdminMe } = require("./lib/admin-keys");
const { verifyAdminRequest } = require("./lib/auth");
const storage = require("./lib/storage");

// Load local .env if present (zero-dependency)
(function loadDotEnv() {
  try {
    const envPath = path.join(__dirname, "..", ".env");
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    lines.forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    });
  } catch (e) { /* ignore */ }
})();

const ADMIN_EMAIL = "phamduchieurobotics@gmail.com";
const DEFAULT_ADMIN_NOTIFY_EMAIL = "phamduchieu.robotics@gmail.com";
const PUBLIC_SITE_URL = String(process.env.PUBLIC_SITE_URL || "https://ai-tutor.phamduchieu.site").replace(/\/+$/, "");
const DAY_MS = 86400000;
const PAID_PLANS = ["bronze", "silver", "gold", "diamond"];
const ALL_PLANS = ["unranked", "bronze", "silver", "gold", "diamond"];
const PLAN_RANK = { none: 0, unranked: 1, bronze: 2, silver: 3, gold: 4, diamond: 5 };
const PLAN_LABELS = {
  none: "Free",
  unranked: "Unranked",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  diamond: "Diamond"
};

function defaultDb() {
  return {
    registeredUsers: {},
    subscriptions: {},
    revokedSubscriptions: {},
    userApis: {},
    revokedUserApis: {},
    payment_requests: [],
    paymentConfig: { bankName: "MBV Bank", bankId: "970414", accountNo: "31122007", accountName: "PHAM DUC HIEU" },
    vouchers: [],
    deletedVouchers: {},
    shares: {},
    cloudUsers: {},
    notificationLogs: [],
    notifiedEvents: {}
  };
}

function escHtml(str) {
  return String(str === null || str === undefined ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findRegisteredUserKey(db, rawEmail) {
  if (!db || !db.registeredUsers || typeof db.registeredUsers !== "object") return "";
  const em = String(rawEmail || "").trim().toLowerCase();
  if (!em) return "";
  if (db.registeredUsers[em]) return em;
  const canonical = normalizeGmail(em);
  const keys = Object.keys(db.registeredUsers);
  for (let i = 0; i < keys.length; i++) {
    if (normalizeGmail(keys[i]) === canonical) return keys[i];
  }
  return "";
}

function backfillRegisteredUsers(db) {
  if (!db.registeredUsers || typeof db.registeredUsers !== "object") db.registeredUsers = {};
  const ensureUser = function (rawEmail, nameHint, createdHint, pictureHint) {
    const em = String(rawEmail || "").trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return;
    const existingKey = findRegisteredUserKey(db, em);
    if (!existingKey) {
      const ts = createdHint || new Date().toISOString();
      db.registeredUsers[em] = {
        uid: em,
        email: em,
        name: String(nameHint || em.split("@")[0]),
        picture: String(pictureHint || ""),
        createdAt: ts,
        lastLoginAt: ts,
        loginCount: 1,
        notifiedNewUser: true
      };
    } else {
      const target = db.registeredUsers[existingKey];
      if (nameHint && (!target.name || target.name === existingKey || target.name === em)) {
        target.name = String(nameHint);
      }
      if (pictureHint && !target.picture) {
        target.picture = String(pictureHint);
      }
    }
  };

  Object.keys(db.subscriptions || {}).forEach(function (em) {
    const s = db.subscriptions[em];
    const sinceIso = s && s.since ? new Date(Number(s.since)).toISOString() : undefined;
    ensureUser(em, "", sinceIso, "");
  });
  (db.payment_requests || []).forEach(function (r) {
    if (r && r.userEmail) ensureUser(r.userEmail, r.userName, r.createdAt, "");
  });
  Object.keys(db.userApis || {}).forEach(function (em) {
    const a = db.userApis[em];
    ensureUser(em, "", a && a.updatedAt, "");
  });
  Object.keys(db.cloudUsers || {}).forEach(function (em) {
    const c = db.cloudUsers[em];
    ensureUser(em, c && c.userName, c && c.updatedAt, "");
  });
}

async function loadDb() {
  const def = defaultDb();
  try {
    const raw = await storage.loadAppDb();
    if (raw && typeof raw === "object") {
      const merged = Object.assign(def, raw);
      backfillRegisteredUsers(merged);
      global.__AI_TUTOR_DB__ = merged;
      return merged;
    }
  } catch (e) { /* fallback */ }
  backfillRegisteredUsers(def);
  global.__AI_TUTOR_DB__ = def;
  return def;
}

async function saveDb(db) {
  global.__AI_TUTOR_DB__ = db;
  try {
    await storage.saveAppDb(db);
  } catch (e) { /* keep in memory on read-only fallback */ }
}

/* ============================================================
   Awaited Serverless-Safe Email Notification Service
   Supports: Direct Gmail/SMTP (port 465 TLS & 587 STARTTLS),
             Resend API, or Custom Webhook.
   ALWAYS awaited before res.end() so Vercel Serverless never
   kills the socket mid-handshake.
   ============================================================ */
function getAdminNotificationEmail() {
  return String(process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_ADMIN_NOTIFY_EMAIL).trim();
}

function sendSmtpTlsEmail(opts) {
  return new Promise(function (resolve, reject) {
    const host = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const port = Number(process.env.SMTP_PORT || 465);
    const user = String(process.env.SMTP_USER || "").replace(/[\r\n<>]/g, "").trim();
    const rawPass = String(process.env.SMTP_PASS || "").trim();
    // Gmail App Passwords are often pasted with spaces ("xxxx xxxx xxxx xxxx"); normalize safely
    const pass = (host.toLowerCase().indexOf("gmail") !== -1 && rawPass.replace(/\s+/g, "").length === 16)
      ? rawPass.replace(/\s+/g, "")
      : rawPass;
    const toAddr = String((opts && opts.to) || "").replace(/[\r\n<>]/g, "").trim();

    if (!user || !pass) return reject(new Error("SMTP_USER or SMTP_PASS not configured"));
    if (!toAddr) return reject(new Error("Recipient email missing"));

    const useStartTls = (port === 587 || port === 25 || String(process.env.SMTP_SECURE || "").toLowerCase() === "false") && port !== 465;
    let sock = useStartTls
      ? net.connect({ host: host, port: port })
      : tls.connect({ host: host, port: port, servername: host });

    let phase = "greeting";
    let buffer = "";
    let settled = false;

    const timeout = setTimeout(function () {
      finish(new Error("SMTP timeout (" + host + ":" + port + ", phase=" + phase + ")"));
    }, 10000);

    function finish(err, info) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        if (sock && !sock.destroyed) {
          if (err) sock.destroy();
          else sock.end();
        }
      } catch (e) { /* ignore */ }
      if (err) reject(err);
      else resolve(info);
    }

    function sendLine(line) {
      if (!settled && sock && !sock.destroyed) {
        sock.write(line + "\r\n");
      }
    }

    function onSocketError(err) {
      finish(err || new Error("SMTP socket error"));
    }

    function onSocketClose() {
      if (!settled && phase !== "quit") {
        finish(new Error("SMTP connection closed unexpectedly (phase=" + phase + ")"));
      }
    }

    function onSocketData(chunk) {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.length < 3) continue;
        if (line[3] === "-") continue; // multi-line response continuation
        const code = parseInt(line.slice(0, 3), 10);
        if (isNaN(code)) continue;
        if (code >= 400) {
          return finish(new Error("SMTP error " + code + " (" + phase + "): " + line));
        }

        if (phase === "greeting" && code === 220) {
          phase = useStartTls ? "ehlo_plain" : "ehlo_tls";
          sendLine("EHLO ai-tutor.phamduchieu.site");
        } else if (phase === "ehlo_plain" && code === 250) {
          phase = "starttls";
          sendLine("STARTTLS");
        } else if (phase === "starttls" && code === 220) {
          const plainSock = sock;
          plainSock.removeListener("data", onSocketData);
          plainSock.removeListener("error", onSocketError);
          plainSock.removeListener("close", onSocketClose);
          buffer = "";
          phase = "tls_handshake";
          sock = tls.connect({ socket: plainSock, servername: host });
          sock.on("data", onSocketData);
          sock.on("error", onSocketError);
          sock.on("close", onSocketClose);
          sock.once("secureConnect", function () {
            phase = "ehlo_tls";
            sendLine("EHLO ai-tutor.phamduchieu.site");
          });
        } else if (phase === "ehlo_tls" && code === 250) {
          phase = "auth_user";
          sendLine("AUTH LOGIN");
        } else if (phase === "auth_user" && code === 334) {
          phase = "auth_pass";
          sendLine(Buffer.from(user, "utf8").toString("base64"));
        } else if (phase === "auth_pass" && code === 334) {
          phase = "auth_done";
          sendLine(Buffer.from(pass, "utf8").toString("base64"));
        } else if (phase === "auth_done" && code === 235) {
          phase = "mail_from";
          sendLine("MAIL FROM:<" + user + ">");
        } else if (phase === "mail_from" && code === 250) {
          phase = "rcpt_to";
          sendLine("RCPT TO:<" + toAddr + ">");
        } else if (phase === "rcpt_to" && code === 250) {
          phase = "data_cmd";
          sendLine("DATA");
        } else if (phase === "data_cmd" && code === 354) {
          phase = "data_body";
          const subjB64 = Buffer.from(String(opts.subject || ""), "utf8").toString("base64");
          const htmlB64 = Buffer.from(String(opts.html || ""), "utf8")
            .toString("base64")
            .replace(/.{1,76}/g, "$&\r\n")
            .trimEnd();
          const msgId = "<" + Date.now() + "." + Math.random().toString(36).slice(2, 10) + "@ai-tutor.phamduchieu.site>";
          const msg = [
            "From: \"AI Tutor Notification\" <" + user + ">",
            "To: <" + toAddr + ">",
            "Subject: =?UTF-8?B?" + subjB64 + "?=",
            "Date: " + new Date().toUTCString(),
            "Message-ID: " + msgId,
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "Content-Transfer-Encoding: base64",
            "",
            htmlB64,
            "."
          ].join("\r\n");
          sendLine(msg);
        } else if (phase === "data_body" && code === 250) {
          phase = "quit";
          sendLine("QUIT");
          return finish(null, { provider: "smtp", host: host, port: port, to: toAddr });
        }
      }
    }

    sock.on("data", onSocketData);
    sock.on("error", onSocketError);
    sock.on("close", onSocketClose);
  });
}

async function sendAdminNotificationEmail(notification) {
  const to = getAdminNotificationEmail();
  const subject = String(notification.subject || "[AI Tutor] Notification");
  const html = String(notification.html || "");
  const text = String(notification.text || "");
  const eventType = String(notification.eventType || "general");
  const logEntry = {
    id: "notif_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    eventType: eventType,
    to: to,
    subject: subject,
    createdAt: new Date().toISOString(),
    status: "queued",
    provider: "none"
  };

  try {
    // 1. Try Resend API if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY && typeof fetch === "function") {
      const fromAddr = String(process.env.EMAIL_FROM || "AI Tutor <onboarding@resend.dev>").trim();
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + String(process.env.RESEND_API_KEY).trim(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [to],
          subject: subject,
          html: html,
          text: text
        })
      });
      if (resp.ok) {
        logEntry.status = "sent";
        logEntry.provider = "resend";
        return logEntry;
      }
      const errTxt = await resp.text().catch(function () { return ""; });
      logEntry.error = "Resend HTTP " + resp.status + ": " + errTxt.slice(0, 200);
    }

    // 2. Try Direct SMTP (Gmail TLS 465 / STARTTLS 587) if SMTP_USER and SMTP_PASS are configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await sendSmtpTlsEmail({ to: to, subject: subject, html: html, text: text });
      logEntry.status = "sent";
      logEntry.provider = "smtp";
      return logEntry;
    }

    // 3. Try Custom Webhook URL if EMAIL_WEBHOOK_URL is configured
    if (process.env.EMAIL_WEBHOOK_URL && typeof fetch === "function") {
      const resp = await fetch(String(process.env.EMAIL_WEBHOOK_URL).trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to,
          subject: subject,
          html: html,
          text: text,
          eventType: eventType,
          payload: notification.payload || {}
        })
      });
      if (resp.ok) {
        logEntry.status = "sent";
        logEntry.provider = "webhook";
        return logEntry;
      }
    }

    if (!logEntry.error) {
      logEntry.status = "logged_no_provider";
      logEntry.error = "No email provider env configured (set SMTP_USER/SMTP_PASS or RESEND_API_KEY or EMAIL_WEBHOOK_URL)";
    }
  } catch (err) {
    logEntry.status = "failed";
    logEntry.error = (err && err.message) || "Email send error";
    console.error("[AI Tutor Email] Delivery failed (" + eventType + "):", logEntry.error);
  }
  return logEntry;
}

function appendNotificationLog(db, entry) {
  if (!db || !entry) return;
  if (!Array.isArray(db.notificationLogs)) db.notificationLogs = [];
  db.notificationLogs.push(entry);
  if (db.notificationLogs.length > 100) db.notificationLogs = db.notificationLogs.slice(-100);
}

async function sendNewUserNotification(db, userRec) {
  if (!userRec || !userRec.email) return null;
  const email = String(userRec.email).trim().toLowerCase();
  const canonical = normalizeGmail(email);
  // Never spam "New User Registered" for the site admin's own account
  if (canonical === ADMIN_EMAIL) return null;

  // Atomic one-time dedup across all browsers, devices & Vercel serverless containers
  const claimed = await storage.claimNotificationOnce("new_user:" + canonical);
  if (!claimed) return null;

  const displayName = String(userRec.name || email);
  const regTime = String(userRec.createdAt || new Date().toISOString());
  const adminLink = PUBLIC_SITE_URL + "/admin/members";
  const subject = "[AI Tutor] New User Registered: " + (displayName !== email ? (displayName + " (" + email + ")") : email);
  const html =
    '<div style="font-family:sans-serif;max-width:560px;line-height:1.6;color:#1e293b;border:1px solid #e2e8f0;border-radius:12px;padding:20px">' +
      '<h2 style="margin:0 0 12px;color:#5347CD">AI Tutor - New User Registered</h2>' +
      '<p style="margin:0 0 12px">A new user has registered an account on <strong>AI Tutor</strong>:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
        '<tr><td style="padding:6px 0;color:#64748b;width:160px">Display Name:</td><td style="padding:6px 0;font-weight:700">' + escHtml(displayName) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b">User Email:</td><td style="padding:6px 0;font-weight:700">' + escHtml(email) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b">Registered At:</td><td style="padding:6px 0">' + escHtml(regTime) + '</td></tr>' +
      '</table>' +
      '<a href="' + escHtml(adminLink) + '" style="display:inline-block;background:#5347CD;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">Open Admin Panel (Members &amp; Plans)</a>' +
    '</div>';
  const text =
    "AI Tutor - New User Registered\n" +
    "Display Name: " + displayName + "\n" +
    "User Email: " + email + "\n" +
    "Registered At: " + regTime + "\n" +
    "Admin Panel: " + adminLink;

  const entry = await sendAdminNotificationEmail({
    eventType: "new_user",
    subject: subject,
    html: html,
    text: text,
    payload: { name: displayName, email: email, createdAt: regTime, adminUrl: adminLink }
  });
  appendNotificationLog(db, entry);
  await saveDb(db);
  return entry;
}

async function sendPaymentRequestNotification(db, reqRec) {
  if (!reqRec || !reqRec.userEmail) return null;
  const reqId = String(reqRec.id || (reqRec.userEmail + "_" + reqRec.plan + "_" + reqRec.createdAt));
  const claimed = await storage.claimNotificationOnce("payreq:" + reqId);
  if (!claimed) return null;

  const userName = String(reqRec.userName || reqRec.userEmail);
  const userEmail = String(reqRec.userEmail);
  const planName = PLAN_LABELS[reqRec.plan] || String(reqRec.plan || "").toUpperCase();
  const amountStr = Number(reqRec.amount || 0).toLocaleString("vi-VN") + " VND";
  const refStr = [reqRec.memo, reqRec.transferNote, reqRec.voucher ? ("Voucher: " + reqRec.voucher) : ""].filter(Boolean).join(" | ") || "N/A";
  const subTime = String(reqRec.createdAt || new Date().toISOString());
  const adminLink = PUBLIC_SITE_URL + "/admin/requests";
  const subject = "[AI Tutor] New Payment Confirmation Request: " + userEmail + " - " + planName;
  const html =
    '<div style="font-family:sans-serif;max-width:560px;line-height:1.6;color:#1e293b;border:1px solid #e2e8f0;border-radius:12px;padding:20px">' +
      '<h2 style="margin:0 0 12px;color:#059669">AI Tutor - New Payment Confirmation Request</h2>' +
      '<p style="margin:0 0 12px">A user has submitted a payment confirmation request awaiting your approval:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
        '<tr><td style="padding:6px 0;color:#64748b;width:160px">User Name:</td><td style="padding:6px 0;font-weight:700">' + escHtml(userName) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b">User Email:</td><td style="padding:6px 0;font-weight:700">' + escHtml(userEmail) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b">Selected Plan:</td><td style="padding:6px 0;font-weight:700;color:#5347CD">' + escHtml(planName) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b">Amount:</td><td style="padding:6px 0;font-weight:700;color:#059669">' + escHtml(amountStr) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b">Transfer Reference:</td><td style="padding:6px 0">' + escHtml(refStr) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b">Submitted At:</td><td style="padding:6px 0">' + escHtml(subTime) + '</td></tr>' +
      '</table>' +
      '<a href="' + escHtml(adminLink) + '" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">Review &amp; Approve Payment in Admin Panel</a>' +
    '</div>';
  const text =
    "AI Tutor - New Payment Confirmation Request\n" +
    "User Name: " + userName + "\n" +
    "User Email: " + userEmail + "\n" +
    "Selected Plan: " + planName + "\n" +
    "Amount: " + amountStr + "\n" +
    "Transfer Reference: " + refStr + "\n" +
    "Submitted At: " + subTime + "\n" +
    "Payment Approvals: " + adminLink;

  const entry = await sendAdminNotificationEmail({
    eventType: "payment_request",
    subject: subject,
    html: html,
    text: text,
    payload: {
      id: reqRec.id,
      userName: userName,
      userEmail: userEmail,
      plan: planName,
      amount: reqRec.amount,
      transferReference: refStr,
      createdAt: subTime,
      adminUrl: adminLink
    }
  });
  appendNotificationLog(db, entry);
  await saveDb(db);
  return entry;
}

function upsertRegisteredUser(db, userInput, opts) {
  if (!db.registeredUsers || typeof db.registeredUsers !== "object") db.registeredUsers = {};
  const em = String((userInput && userInput.email) || "").trim().toLowerCase();
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { isNew: false, shouldNotify: false, user: null };
  const nowIso = new Date().toISOString();
  const existingKey = findRegisteredUserKey(db, em);
  const existing = existingKey ? db.registeredUsers[existingKey] : null;
  if (!existing) {
    const isAdminSelf = normalizeGmail(em) === ADMIN_EMAIL;
    const newUser = {
      uid: String(userInput.uid || em),
      email: em,
      name: String(userInput.name || em.split("@")[0]).trim(),
      picture: String(userInput.picture || "").trim(),
      createdAt: String(userInput.createdAt || nowIso),
      lastLoginAt: String(userInput.lastLoginAt || nowIso),
      loginCount: 1,
      notifiedNewUser: true
    };
    db.registeredUsers[em] = newUser;
    const shouldNotify = !isAdminSelf && (!opts || opts.suppressEmail !== true);
    return { isNew: true, shouldNotify: shouldNotify, user: newUser };
  }
  if (userInput.name && String(userInput.name).trim()) existing.name = String(userInput.name).trim();
  if (userInput.picture && String(userInput.picture).trim()) existing.picture = String(userInput.picture).trim();
  if (userInput.uid) existing.uid = String(userInput.uid);
  if (opts && opts.bumpLogin) {
    existing.lastLoginAt = nowIso;
    existing.loginCount = (Number(existing.loginCount) || 1) + 1;
  } else if (userInput.lastLoginAt && String(userInput.lastLoginAt) > String(existing.lastLoginAt || "")) {
    existing.lastLoginAt = String(userInput.lastLoginAt);
  }
  return { isNew: false, shouldNotify: false, user: existing };
}

function decodeJwtEmail(authHeader) {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return "";
    const parts = authHeader.slice(7).split(".");
    if (parts.length < 2) return "";
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const payload = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    if (payload && payload.email_verified === true && typeof payload.email === "string") {
      return payload.email.trim().toLowerCase();
    }
    return "";
  } catch (e) { return ""; }
}

function getCallerEmail(req) {
  const headers = (req && req.headers) || {};
  const jwtEmail = decodeJwtEmail(headers.authorization || headers.Authorization || "");
  if (jwtEmail) return jwtEmail;
  const hdr = String(headers["x-user-email"] || headers["X-User-Email"] || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hdr) ? hdr : "";
}

function normalizeGmail(email) {
  const e = String(email || "").trim().toLowerCase();
  const parts = e.split("@");
  if (parts.length === 2 && (parts[1] === "gmail.com" || parts[1] === "googlemail.com")) {
    return parts[0].replace(/\./g, "") + "@gmail.com";
  }
  return e;
}

function isCallerAdmin(req) {
  return normalizeGmail(getCallerEmail(req)) === ADMIN_EMAIL;
}

function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === "string") {
    try { return Promise.resolve(req.body ? JSON.parse(req.body) : {}); } catch (e) { return Promise.resolve({}); }
  }
  if (Buffer.isBuffer(req.body)) {
    try { return Promise.resolve(JSON.parse(req.body.toString("utf8") || "{}")); } catch (e) { return Promise.resolve({}); }
  }
  return new Promise(function (resolve) {
    let data = "";
    req.on("data", function (c) {
      data += c;
      if (data.length > 8 * 1024 * 1024) { try { req.destroy(); } catch (e) { /* */ } resolve({}); }
    });
    req.on("end", function () {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
    });
    req.on("error", function () { resolve({}); });
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  });
  res.end(JSON.stringify(obj));
}

function resolveApiPath(req) {
  const rawUrl = String((req && req.url) || "/");
  const urlObj = new URL(rawUrl, "http://localhost");
  const rewritten = urlObj.searchParams.get("__path");
  let p = rewritten ? String(rewritten).trim() : urlObj.pathname;
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function mergeClientSnapshot(db, body, isAdminCaller, callerEmail) {
  if (!body || typeof body !== "object") return { changed: false, newUsers: [], newPaymentReqs: [] };
  let changed = false;
  const newUsers = [];
  const newPaymentReqs = [];
  if (!db.revokedSubscriptions || typeof db.revokedSubscriptions !== "object") db.revokedSubscriptions = {};
  if (!db.deletedVouchers || typeof db.deletedVouchers !== "object") db.deletedVouchers = {};
  if (!db.registeredUsers || typeof db.registeredUsers !== "object") db.registeredUsers = {};

  // 0. Merge currentUser or registeredUsers
  if (body.currentUser && typeof body.currentUser === "object" && body.currentUser.email) {
    const uEm = String(body.currentUser.email).trim().toLowerCase();
    if (isAdminCaller || normalizeGmail(uEm) === normalizeGmail(callerEmail)) {
      const r = upsertRegisteredUser(db, body.currentUser, { bumpLogin: false });
      if (r.isNew) {
        changed = true;
        if (r.shouldNotify && r.user) newUsers.push(r.user);
      }
    }
  }
  if (isAdminCaller && body.registeredUsers && typeof body.registeredUsers === "object") {
    Object.keys(body.registeredUsers).forEach(function (em) {
      const u = body.registeredUsers[em];
      if (u && typeof u === "object" && u.email) {
        const r = upsertRegisteredUser(db, u, { suppressEmail: true });
        if (r.isNew) changed = true;
      }
    });
  }

  // 1. Merge subscriptions
  if (body.subscriptions && typeof body.subscriptions === "object") {
    Object.keys(body.subscriptions).forEach(function (rawEmail) {
      const em = String(rawEmail || "").trim().toLowerCase();
      if (!em || (!isAdminCaller && em !== callerEmail)) return;
      const incoming = body.subscriptions[rawEmail];
      if (!incoming || typeof incoming !== "object" || !ALL_PLANS.includes(incoming.tier)) return;
      const revokedAt = Number(db.revokedSubscriptions[em]) || 0;
      const inSince = Number(incoming.since) || 0;
      if (revokedAt && inSince <= revokedAt) return;
      const cur = db.subscriptions[em];
      if (!cur) {
        db.subscriptions[em] = {
          tier: incoming.tier,
          since: inSince || Date.now(),
          expires: Number(incoming.expires) || (Date.now() + 365 * DAY_MS)
        };
        changed = true;
      } else if (isAdminCaller) {
        const curRank = PLAN_RANK[cur.tier] || 0;
        const inRank = PLAN_RANK[incoming.tier] || 0;
        if (inSince > (Number(cur.since) || 0) || (inRank > curRank && Number(incoming.expires) > Date.now())) {
          db.subscriptions[em] = {
            tier: incoming.tier,
            since: inSince || cur.since || Date.now(),
            expires: Number(incoming.expires) || cur.expires || (Date.now() + 365 * DAY_MS)
          };
          changed = true;
        }
      }
    });
  }

  // 2. Merge payment_requests
  if (Array.isArray(body.payment_requests)) {
    const byId = {};
    db.payment_requests.forEach(function (r) { if (r && r.id) byId[r.id] = r; });
    body.payment_requests.forEach(function (r) {
      if (!r || typeof r !== "object" || !r.id || !PAID_PLANS.includes(r.plan)) return;
      const rEmail = String(r.userEmail || "").trim().toLowerCase();
      if (!rEmail || (!isAdminCaller && rEmail !== callerEmail)) return;
      const existing = byId[r.id];
      if (!existing) {
        const rec = {
          id: String(r.id),
          userId: String(r.userId || rEmail),
          userEmail: rEmail,
          userName: String(r.userName || rEmail),
          plan: r.plan,
          amount: Number(r.amount) || 0,
          voucher: String(r.voucher || ""),
          memo: String(r.memo || ""),
          transferNote: String(r.transferNote || ""),
          receiptImage: typeof r.receiptImage === "string" ? r.receiptImage.slice(0, 600000) : "",
          status: ["pending", "approved", "rejected"].includes(r.status) ? r.status : "pending",
          createdAt: r.createdAt || new Date().toISOString(),
          reviewedAt: r.reviewedAt || null,
          reviewedBy: r.reviewedBy || null,
          rejectReason: String(r.rejectReason || ""),
          notifiedEmail: true
        };
        db.payment_requests.push(rec);
        byId[rec.id] = rec;
        upsertRegisteredUser(db, { email: rEmail, name: rec.userName, createdAt: rec.createdAt }, { suppressEmail: true });
        if (rec.status === "pending" && !r.notifiedEmail) {
          newPaymentReqs.push(rec);
        }
        changed = true;
      } else if (isAdminCaller && existing.status === "pending" && (r.status === "approved" || r.status === "rejected")) {
        existing.status = r.status;
        existing.reviewedAt = r.reviewedAt || new Date().toISOString();
        existing.reviewedBy = r.reviewedBy || ADMIN_EMAIL;
        existing.rejectReason = String(r.rejectReason || "");
        changed = true;
      }
    });
  }

  // 3. Merge vouchers (Admin can seed vouchers from local storage if container cold-started)
  if (isAdminCaller && Array.isArray(body.vouchers)) {
    const existingCodes = {};
    db.vouchers.forEach(function (v) { if (v && v.code) existingCodes[String(v.code).toUpperCase()] = true; });
    body.vouchers.forEach(function (v) {
      if (!v || !v.code) return;
      const code = String(v.code).trim().toUpperCase();
      const pct = Number(v.discountPercent);
      if (!code || !(pct >= 1 && pct <= 100)) return;
      if (db.deletedVouchers[code]) return;
      if (!existingCodes[code]) {
        db.vouchers.push({ code: code, discountPercent: pct });
        existingCodes[code] = true;
        changed = true;
      }
    });
  }

  // 4. Merge paymentConfig if Admin
  if (isAdminCaller && body.paymentConfig && typeof body.paymentConfig === "object") {
    const pc = body.paymentConfig;
    if (pc.bankId && pc.accountNo && (!db.paymentConfig || !db.paymentConfig.accountNo)) {
      db.paymentConfig = {
        bankName: String(pc.bankName || "MBV Bank"),
        bankId: String(pc.bankId),
        accountNo: String(pc.accountNo),
        accountName: String(pc.accountName || "")
      };
      changed = true;
    }
  }

  // 5. Merge Admin-assigned user AI key metadata (encrypted/masked on server; never push raw keys out)
  if (!db.userApis || typeof db.userApis !== "object") db.userApis = {};
  if (!db.revokedUserApis || typeof db.revokedUserApis !== "object") db.revokedUserApis = {};
  if (isAdminCaller && body.userApis && typeof body.userApis === "object") {
    Object.keys(body.userApis).forEach(function (rawEm) {
      const em = String(rawEm || "").trim().toLowerCase();
      const item = body.userApis[rawEm];
      if (!em || !item || typeof item !== "object" || !item.apiKey) return;
      const revAt = Number(db.revokedUserApis[em]) || 0;
      const inTs = Number(item.ts) || 0;
      if (revAt && inTs <= revAt) return;
      const cur = db.userApis[em];
      if (!cur || inTs > (Number(cur.ts) || 0)) {
        const rawPrimary = String(item.apiKey).trim();
        const isAlreadyMasked = rawPrimary.indexOf("\u2022") !== -1;
        db.userApis[em] = {
          email: em,
          maskedKey: item.maskedKey || (isAlreadyMasked ? rawPrimary : maskApiKey(rawPrimary)),
          encrypted: (!isAlreadyMasked && isEncryptionConfigured()) ? encryptSecret(rawPrimary) : (cur && cur.encrypted ? cur.encrypted : null),
          model: String(item.model || "gemini-2.5-flash"),
          assignedBy: ADMIN_EMAIL,
          updatedAt: item.updatedAt || new Date().toISOString(),
          ts: inTs || Date.now()
        };
        changed = true;
      }
    });
  }

  return { changed: changed, newUsers: newUsers, newPaymentReqs: newPaymentReqs };
}

function toSafeMaskedUserApisMap(rawMap) {
  const safe = {};
  Object.keys(rawMap || {}).forEach(function (em) {
    const it = rawMap[em];
    if (!it || typeof it !== "object") return;
    const masked = it.maskedKey || maskApiKey(it.apiKey || "");
    if (!masked) return;
    safe[em] = {
      email: em,
      maskedKey: masked,
      model: String(it.model || "gemini-2.5-flash"),
      assignedBy: it.assignedBy || ADMIN_EMAIL,
      updatedAt: it.updatedAt || "",
      ts: Number(it.ts) || 0
    };
  });
  return safe;
}

function buildBillingResponse(db, isAdminCaller, caller) {
  if (!db.userApis || typeof db.userApis !== "object") db.userApis = {};
  if (!db.revokedUserApis || typeof db.revokedUserApis !== "object") db.revokedUserApis = {};
  if (!db.registeredUsers || typeof db.registeredUsers !== "object") db.registeredUsers = {};
  const safeAllApis = toSafeMaskedUserApisMap(db.userApis);
  if (isAdminCaller) {
    return {
      registeredUsers: db.registeredUsers,
      subscriptions: db.subscriptions,
      revokedSubscriptions: db.revokedSubscriptions || {},
      userApis: safeAllApis,
      revokedUserApis: db.revokedUserApis,
      payment_requests: db.payment_requests,
      paymentConfig: db.paymentConfig,
      vouchers: db.vouchers,
      deletedVouchers: db.deletedVouchers || {},
      notificationLogs: (db.notificationLogs || []).slice(-30),
      adminNotificationEmail: getAdminNotificationEmail(),
      storageDriver: storage.getDriverInfo()
    };
  }
  const ownSubs = {};
  if (caller && db.subscriptions[caller]) ownSubs[caller] = db.subscriptions[caller];
  const ownApis = {};
  if (caller && safeAllApis[caller]) ownApis[caller] = safeAllApis[caller];
  const ownReqs = db.payment_requests.filter(function (r) {
    return r && String(r.userEmail || "").toLowerCase() === caller;
  });
  return {
    subscriptions: ownSubs,
    revokedSubscriptions: db.revokedSubscriptions || {},
    userApis: ownApis,
    revokedUserApis: db.revokedUserApis,
    payment_requests: ownReqs,
    paymentConfig: db.paymentConfig,
    vouchers: db.vouchers,
    deletedVouchers: db.deletedVouchers || {}
  };
}

module.exports = async function apiHandler(req, res) {
  const p = resolveApiPath(req);
  const method = String((req && req.method) || "GET").toUpperCase();

  // Enterprise Zero-Exposure AI Proxy & System Key Pool Management
  if (p === "/api/ai/proxy") {
    return handleAiProxy(req, res);
  }
  if (p === "/api/admin/me") {
    return handleAdminMe(req, res);
  }
  if (p === "/api/admin/system-keys" || p.indexOf("/api/admin/system-keys/") === 0) {
    return handleAdminSystemKeys(req, res, p);
  }

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Email",
      "Access-Control-Expose-Headers": "X-AI-Fallback-Provider, X-AI-Fallback-Model, X-AI-RateLimit-Remaining, X-AI-RateLimit-Limit"
    });
    return res.end();
  }

  try {
    if (p === "/api/health" && method === "GET") {
      return sendJson(res, 200, { ok: true, app: "AI Tutor" });
    }

    /* ---------- User Registration & Login Tracking API ---------- */
    if (p === "/api/users/register" && method === "POST") {
      const body = await readBody(req);
      const caller = getCallerEmail(req) || String((body && body.email) || "").trim().toLowerCase();
      if (!caller || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caller)) {
        return sendJson(res, 400, { error: "Email kh\u00f4ng h\u1ee3p l\u1ec7." });
      }
      const db = await loadDb();
      const result = upsertRegisteredUser(db, {
        uid: (body && body.uid) || caller,
        email: caller,
        name: (body && body.name) || caller.split("@")[0],
        picture: (body && body.picture) || ""
      }, { bumpLogin: true });
      await saveDb(db);
      let emailNotification = null;
      if (result.shouldNotify && result.user) {
        try {
          emailNotification = await sendNewUserNotification(db, result.user);
        } catch (mailErr) {
          console.error("[AI Tutor Email] /api/users/register notify error:", mailErr && mailErr.message);
        }
      }
      return sendJson(res, 200, {
        ok: true,
        isNewUser: result.isNew,
        user: result.user,
        emailStatus: emailNotification ? emailNotification.status : (result.isNew ? "skipped" : "already_registered")
      });
    }

    /* ---------- Public Share Link / Short Code API ---------- */
    if (p === "/api/shares" && method === "POST") {
      const body = await readBody(req);
      if (!body || !body.deck || !Array.isArray(body.deck.questions) || body.deck.questions.length === 0) {
        return sendJson(res, 400, { error: "B\u1ed9 \u0111\u1ec1 chia s\u1ebb kh\u00f4ng h\u1ee3p l\u1ec7." });
      }
      let code = String(body.code || "").trim().toUpperCase();
      if (!/^AIT-\d{4,6}$/.test(code)) {
        code = "AIT-" + Math.floor(1000 + Math.random() * 9000);
        for (let tries = 0; tries < 8; tries++) {
          const exists = await storage.getShareByCode(code);
          if (!exists) break;
          code = "AIT-" + Math.floor(1000 + Math.random() * 9000);
        }
      }
      const entry = {
        code: code,
        deck: body.deck,
        createdBy: getCallerEmail(req) || "guest",
        createdAt: new Date().toISOString()
      };
      await storage.saveShareByCode(code, entry);
      return sendJson(res, 201, { ok: true, code: code });
    }

    const shareGet = p.match(/^\/api\/shares\/([^/]+)$/);
    if (shareGet && method === "GET") {
      const code = decodeURIComponent(shareGet[1]).trim().toUpperCase();
      const entry = await storage.getShareByCode(code);
      if (!entry) return sendJson(res, 404, { error: "Kh\u00f4ng t\u00ecm th\u1ea5y m\u00e3 \u0111\u1ec1 " + code });
      return sendJson(res, 200, { ok: true, share: entry });
    }

    /* ---------- Cloud User Data Sync API ---------- */
    if (p === "/api/cloud/sync" && method === "GET") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const data = await storage.getCloudUser(caller);
      return sendJson(res, 200, { ok: true, data: data || null });
    }
    if (p === "/api/cloud/sync" && method === "PUT") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const body = await readBody(req);
      const prev = await storage.getCloudUser(caller);
      const next = Object.assign({}, prev || {}, body, { updatedAt: new Date().toISOString() });
      await storage.saveCloudUser(caller, next);
      return sendJson(res, 200, { ok: true, updatedAt: next.updatedAt });
    }

    /* ---------- Billing State & Bidirectional Sync ---------- */
    if (p === "/api/billing/state" && method === "GET") {
      const caller = getCallerEmail(req);
      const db = await loadDb();
      return sendJson(res, 200, buildBillingResponse(db, isCallerAdmin(req), caller));
    }

    if (p === "/api/billing/sync" && method === "POST") {
      const caller = getCallerEmail(req);
      const isAdminCaller = isCallerAdmin(req);
      const body = await readBody(req);
      const db = await loadDb();
      const merged = mergeClientSnapshot(db, body, isAdminCaller, caller);
      if (merged.changed) {
        await saveDb(db);
      }
      for (let i = 0; i < merged.newUsers.length; i++) {
        try { await sendNewUserNotification(db, merged.newUsers[i]); } catch (e) { /* safe */ }
      }
      for (let j = 0; j < merged.newPaymentReqs.length; j++) {
        try { await sendPaymentRequestNotification(db, merged.newPaymentReqs[j]); } catch (e) { /* safe */ }
      }
      return sendJson(res, 200, buildBillingResponse(db, isAdminCaller, caller));
    }

    if (p === "/api/subscriptions/unranked" && method === "POST") {
      const body = await readBody(req);
      const caller = getCallerEmail(req) || String((body && body.email) || "").trim().toLowerCase();
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const db = await loadDb();
      const cur = db.subscriptions[caller];
      if (cur && PAID_PLANS.includes(cur.tier) && Number(cur.expires) > Date.now()) {
        return sendJson(res, 400, { error: "B\u1ea1n \u0111ang c\u00f3 g\u00f3i cao h\u01a1n Unranked." });
      }
      const now = Date.now();
      db.subscriptions[caller] = { tier: "unranked", since: now, expires: now + 365 * DAY_MS };
      if (db.revokedSubscriptions) delete db.revokedSubscriptions[caller];
      const uRes = upsertRegisteredUser(db, { email: caller, name: (body && body.name) || caller.split("@")[0] });
      await saveDb(db);
      if (uRes.shouldNotify && uRes.user) {
        try { await sendNewUserNotification(db, uRes.user); } catch (e) { /* safe */ }
      }
      return sendJson(res, 200, { ok: true, subscription: db.subscriptions[caller] });
    }

    if (p === "/api/payment-requests" && method === "POST") {
      const body = await readBody(req);
      const caller = getCallerEmail(req) || String((body && body.userEmail) || "").trim().toLowerCase();
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      if (!body || !PAID_PLANS.includes(body.plan)) return sendJson(res, 400, { error: "G\u00f3i thanh to\u00e1n kh\u00f4ng h\u1ee3p l\u1ec7." });
      const db = await loadDb();
      const dup = db.payment_requests.some(function (r) {
        return r && String(r.userEmail || "").toLowerCase() === caller && r.plan === body.plan && r.status === "pending";
      });
      if (dup) return sendJson(res, 409, { error: "B\u1ea1n \u0111\u00e3 c\u00f3 y\u00eau c\u1ea7u \u0111ang ch\u1edd duy\u1ec7t cho g\u00f3i n\u00e0y." });
      const rec = {
        id: String(body.id || ("req_" + Date.now())),
        userId: String(body.userId || caller),
        userEmail: caller,
        userName: String(body.userName || caller),
        plan: body.plan,
        amount: Number(body.amount) || 0,
        voucher: String(body.voucher || ""),
        memo: String(body.memo || ""),
        transferNote: String(body.transferNote || ""),
        receiptImage: typeof body.receiptImage === "string" ? body.receiptImage.slice(0, 600000) : "",
        status: "pending",
        createdAt: body.createdAt || new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        rejectReason: "",
        notifiedEmail: true
      };
      db.payment_requests.push(rec);
      upsertRegisteredUser(db, { email: caller, name: rec.userName }, { suppressEmail: true });
      await saveDb(db);
      let emailNotification = null;
      try {
        emailNotification = await sendPaymentRequestNotification(db, rec);
      } catch (mailErr) {
        console.error("[AI Tutor Email] /api/payment-requests notify error:", mailErr && mailErr.message);
      }
      return sendJson(res, 201, {
        ok: true,
        request: rec,
        emailStatus: emailNotification ? emailNotification.status : "skipped"
      });
    }

    /* ---------- Strict Admin Routes ---------- */
    if (p.startsWith("/api/admin/")) {
      if (!isCallerAdmin(req)) {
        return sendJson(res, 403, { error: "Forbidden: Ch\u1ec9 t\u00e0i kho\u1ea3n phamduchieurobotics@gmail.com c\u00f3 quy\u1ec1n qu\u1ea3n tr\u1ecb." });
      }
      const db = await loadDb();
      if (!db.revokedSubscriptions) db.revokedSubscriptions = {};
      if (!db.deletedVouchers) db.deletedVouchers = {};
      if (!db.registeredUsers) db.registeredUsers = {};

      if (p === "/api/admin/users" && method === "GET") {
        return sendJson(res, 200, { ok: true, users: db.registeredUsers, storageDriver: storage.getDriverInfo() });
      }

      if (p === "/api/admin/test-email" && method === "POST") {
        try {
          await verifyAdminRequest(req);
        } catch (authErr) {
          return sendJson(res, authErr.status || 403, { error: authErr.message });
        }
        const nowIso = new Date().toISOString();
        const drv = storage.getDriverInfo();
        const entry = await sendAdminNotificationEmail({
          eventType: "admin_test",
          subject: "[AI Tutor] Test Email Notification (SMTP Check)",
          html:
            '<div style="font-family:sans-serif;max-width:560px;line-height:1.6;color:#1e293b;border:1px solid #e2e8f0;border-radius:12px;padding:20px">' +
              '<h2 style="margin:0 0 12px;color:#5347CD">AI Tutor - SMTP Test Successful</h2>' +
              '<p>H\u1ec7 th\u1ed1ng g\u1eedi th\u00f4ng b\u00e1o email t\u1ef1 \u0111\u1ed9ng (Google SMTP) \u0111ang ho\u1ea1t \u0111\u1ed9ng b\u00ecnh th\u01b0\u1eddng.</p>' +
              '<p style="font-size:13px;color:#64748b">Storage driver: <strong>' + escHtml(drv.label) + '</strong><br>Timestamp: ' + escHtml(nowIso) + '</p>' +
            '</div>',
          text: "AI Tutor SMTP Test Successful. Storage: " + drv.label + " at " + nowIso
        });
        appendNotificationLog(db, entry);
        await saveDb(db);
        return sendJson(res, entry.status === "sent" ? 200 : 500, {
          ok: entry.status === "sent",
          emailNotification: entry,
          storageDriver: drv,
          error: entry.status === "sent" ? "" : (entry.error || "Email delivery failed")
        });
      }

      const approveMatch = p.match(/^\/api\/admin\/payment-requests\/([^/]+)\/approve$/);
      if (approveMatch && method === "POST") {
        const id = decodeURIComponent(approveMatch[1]);
        const body = await readBody(req);
        let rec = db.payment_requests.find(function (r) { return r && r.id === id; });
        if (!rec && body && body.request && body.request.id === id) {
          rec = Object.assign({}, body.request, { status: "pending" });
          db.payment_requests.push(rec);
        }
        if (!rec || rec.status !== "pending") return sendJson(res, 404, { error: "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n ch\u1edd duy\u1ec7t." });
        rec.status = "approved";
        rec.reviewedAt = new Date().toISOString();
        rec.reviewedBy = ADMIN_EMAIL;
        rec.rejectReason = "";
        const userEmail = String(rec.userEmail || "").trim().toLowerCase();
        const old = db.subscriptions[userEmail];
        const now = Date.now();
        const start = old && old.tier === rec.plan && Number(old.expires) > now ? Number(old.expires) : now;
        db.subscriptions[userEmail] = { tier: rec.plan, since: now, expires: start + 365 * DAY_MS };
        delete db.revokedSubscriptions[userEmail];
        upsertRegisteredUser(db, { email: userEmail, name: rec.userName }, { suppressEmail: true });
        await saveDb(db);
        return sendJson(res, 200, { ok: true, request: rec, subscription: db.subscriptions[userEmail] });
      }

      const rejectMatch = p.match(/^\/api\/admin\/payment-requests\/([^/]+)\/reject$/);
      if (rejectMatch && method === "POST") {
        const id = decodeURIComponent(rejectMatch[1]);
        const body = await readBody(req);
        let rec = db.payment_requests.find(function (r) { return r && r.id === id; });
        if (!rec && body && body.request && body.request.id === id) {
          rec = Object.assign({}, body.request, { status: "pending" });
          db.payment_requests.push(rec);
        }
        if (!rec || rec.status !== "pending") return sendJson(res, 404, { error: "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n ch\u1edd duy\u1ec7t." });
        rec.status = "rejected";
        rec.reviewedAt = new Date().toISOString();
        rec.reviewedBy = ADMIN_EMAIL;
        rec.rejectReason = String((body && body.rejectReason) || "Y\u00eau c\u1ea7u b\u1ecb t\u1eeb ch\u1ed1i").trim();
        await saveDb(db);
        return sendJson(res, 200, { ok: true, request: rec });
      }

      if (p === "/api/admin/subscriptions" && method === "POST") {
        const body = await readBody(req);
        const em = String((body && body.email) || "").trim().toLowerCase();
        if (!em || !ALL_PLANS.includes(body && body.tier)) return sendJson(res, 400, { error: "D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7." });
        const now = Date.now();
        db.subscriptions[em] = { tier: body.tier, since: now, expires: now + 365 * DAY_MS };
        delete db.revokedSubscriptions[em];
        upsertRegisteredUser(db, { email: em }, { suppressEmail: true });
        await saveDb(db);
        return sendJson(res, 200, { ok: true, subscription: db.subscriptions[em] });
      }

      const delSubMatch = p.match(/^\/api\/admin\/subscriptions\/([^/]+)$/);
      if (delSubMatch && method === "DELETE") {
        const em = decodeURIComponent(delSubMatch[1]).trim().toLowerCase();
        delete db.subscriptions[em];
        db.revokedSubscriptions[em] = Date.now();
        await saveDb(db);
        return sendJson(res, 200, { ok: true });
      }

      if (p === "/api/admin/payment-config" && method === "PUT") {
        const body = await readBody(req);
        db.paymentConfig = {
          bankName: String((body && body.bankName) || "MBV Bank").trim(),
          bankId: String((body && body.bankId) || "970414").trim().toUpperCase(),
          accountNo: String((body && body.accountNo) || "31122007").trim(),
          accountName: String((body && body.accountName) || "PHAM DUC HIEU").trim().toUpperCase()
        };
        await saveDb(db);
        return sendJson(res, 200, { ok: true, paymentConfig: db.paymentConfig });
      }

      if (p === "/api/admin/vouchers" && method === "PUT") {
        const body = await readBody(req);
        if (Array.isArray(body && body.vouchers)) {
          const nextCodes = {};
          const clean = [];
          body.vouchers.forEach(function (v) {
            if (!v || !v.code) return;
            const code = String(v.code).trim().toUpperCase();
            const pct = Number(v.discountPercent);
            if (code && pct >= 1 && pct <= 100 && !nextCodes[code]) {
              nextCodes[code] = true;
              delete db.deletedVouchers[code];
              clean.push({ code: code, discountPercent: pct });
            }
          });
          (db.vouchers || []).forEach(function (oldV) {
            if (oldV && oldV.code) {
              const c = String(oldV.code).trim().toUpperCase();
              if (!nextCodes[c]) db.deletedVouchers[c] = Date.now();
            }
          });
          db.vouchers = clean;
        }
        await saveDb(db);
        return sendJson(res, 200, { ok: true, vouchers: db.vouchers });
      }

      if (!db.userApis) db.userApis = {};
      if (!db.revokedUserApis) db.revokedUserApis = {};

      if (p === "/api/admin/user-apis" && method === "POST") {
        try {
          await verifyAdminRequest(req);
        } catch (authErr) {
          return sendJson(res, authErr.status || 403, { error: authErr.message });
        }
        const body = await readBody(req);
        const em = String((body && body.email) || "").trim().toLowerCase();
        const apiKey = String((body && body.apiKey) || "").trim();
        const apiPool = String((body && body.apiPool) || "").trim();
        const model = String((body && body.model) || "gemini-3.5-flash-lite").trim();
        const primaryKey = apiKey || (apiPool.split(/[\r\n,;]+/).map(function (x) { return x.trim(); }).filter(Boolean)[0] || "");
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || !primaryKey) {
          return sendJson(res, 400, { error: "Email ho\u1eb7c Gemini API Key kh\u00f4ng h\u1ee3p l\u1ec7." });
        }
        const now = Date.now();
        db.userApis[em] = {
          email: em,
          maskedKey: maskApiKey(primaryKey),
          encrypted: isEncryptionConfigured() ? encryptSecret(primaryKey) : null,
          model: model,
          assignedBy: ADMIN_EMAIL,
          updatedAt: new Date(now).toISOString(),
          ts: now
        };
        delete db.revokedUserApis[em];
        upsertRegisteredUser(db, { email: em }, { suppressEmail: true });
        await saveDb(db);
        const safeMap = toSafeMaskedUserApisMap(db.userApis);
        return sendJson(res, 200, { ok: true, entry: safeMap[em], userApis: safeMap });
      }

      const delApiMatch = p.match(/^\/api\/admin\/user-apis\/([^/]+)$/);
      if (delApiMatch && method === "DELETE") {
        try {
          await verifyAdminRequest(req);
        } catch (authErr) {
          return sendJson(res, authErr.status || 403, { error: authErr.message });
        }
        const em = decodeURIComponent(delApiMatch[1]).trim().toLowerCase();
        delete db.userApis[em];
        db.revokedUserApis[em] = Date.now();
        await saveDb(db);
        return sendJson(res, 200, { ok: true, userApis: toSafeMaskedUserApisMap(db.userApis) });
      }

      return sendJson(res, 404, { error: "API route not found" });
    }

    return sendJson(res, 404, { error: "API endpoint not found: " + p });
  } catch (e) {
    return sendJson(res, 500, { error: (e && e.message) || "Server error" });
  }
};
