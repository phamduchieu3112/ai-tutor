/* ============================================================
   AI Tutor (UET Master) - Unified Serverless & Local API Handler
   Handles /api/* on both Vercel Serverless Functions and local Node server
   ============================================================ */
const fs = require("fs");
const path = require("path");
const net = require("net");
const tls = require("tls");
const crypto = require("crypto");
const { maskApiKey, encryptSecret, isEncryptionConfigured } = require("../lib/crypto");
const { handleAiProxy } = require("../lib/ai-proxy");
const { handleAdminSystemKeys, handleAdminMe } = require("../lib/admin-keys");
const { verifyAdminRequest } = require("../lib/auth");
const storage = require("../lib/storage");
const docCache = require("../lib/doc-cache");
const security = require("../lib/security");

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

const SEPAY_BANK_ID = "MB";
const SEPAY_BANK_BIN = "970422";
const SEPAY_ACCOUNT_NO = "316463";
const SEPAY_ACCOUNT_NAME = "PHAM DUC HIEU";
// Unranked is 0 VND / year (Free Tier); paid tiers strictly use SePay VietQR MB Bank 316463
const PLAN_PRICES = { bronze: 100000, silver: 200000, gold: 300000, diamond: 500000 };

function genOrderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  return "AITUTOR" + suffix;
}

function buildDynamicVietQrUrl(amount, orderCode) {
  return "https://img.vietqr.io/image/" + SEPAY_BANK_ID + "-" + SEPAY_ACCOUNT_NO +
    "-compact2.png?amount=" + encodeURIComponent(String(amount)) +
    "&addInfo=" + encodeURIComponent(String(orderCode)) +
    "&accountName=" + encodeURIComponent(SEPAY_ACCOUNT_NAME);
}

function defaultDb() {
  return {
    registeredUsers: {},
    subscriptions: {},
    revokedSubscriptions: {},
    userApis: {},
    revokedUserApis: {},
    payment_requests: [],
    sepayOrders: {},
    paymentConfig: { bankName: "MB Bank", bankId: "MB", bankBin: "970422", accountNo: "316463", accountName: "PHAM DUC HIEU" },
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
      if (merged.paymentConfig && (String(merged.paymentConfig.accountNo || "").trim() === "31122007" || String(merged.paymentConfig.bankId || "").trim() === "970414")) {
        merged.paymentConfig = { bankName: "MB Bank", bankId: SEPAY_BANK_ID, bankBin: SEPAY_BANK_BIN, accountNo: SEPAY_ACCOUNT_NO, accountName: SEPAY_ACCOUNT_NAME };
      }
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

const REQUIRED_EMAIL_ENV_KEYS = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS"
];

function parseEmailAddresses(input) {
  const rawList = Array.isArray(input)
    ? input
    : String(input || "").split(/[,;\n]+/);
  const valid = [];
  const invalid = [];
  const seen = new Set();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  for (let i = 0; i < rawList.length; i++) {
    const addr = String(rawList[i] || "").replace(/[\r\n<>]/g, "").trim();
    if (!addr) continue;
    const lower = addr.toLowerCase();
    if (!re.test(addr)) {
      invalid.push(addr);
      continue;
    }
    if (!seen.has(lower)) {
      seen.add(lower);
      valid.push(addr);
    }
  }
  return { valid: valid, invalid: invalid };
}

function getEmailProviderHealth() {
  const resendKey = String(process.env.RESEND_API_KEY || "").replace(/\s+/g, "").trim();
  const smtpUser = String(process.env.SMTP_USER || "").replace(/[\r\n<>]/g, "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "").trim();
  const webhookUrl = String(process.env.EMAIL_WEBHOOK_URL || "").trim();
  const fromAddress = String(process.env.EMAIL_FROM || (smtpUser ? ("AI Tutor <" + smtpUser + ">") : "AI Tutor <onboarding@resend.dev>"))
    .replace(/[\r\n]+/g, "")
    .trim();

  if (resendKey) {
    return { configured: true, provider: "resend", fromAddress: fromAddress };
  }
  if (smtpUser && smtpPass) {
    return { configured: true, provider: "smtp", fromAddress: fromAddress };
  }
  if (webhookUrl) {
    return { configured: true, provider: "webhook", fromAddress: fromAddress };
  }
  return { configured: false, provider: "none", fromAddress: fromAddress };
}

function hasConfiguredEmailProvider() {
  return getEmailProviderHealth().configured;
}

async function sendTransactionalEmail(opts) {
  const parsed = parseEmailAddresses(opts && (opts.to || opts.parentEmail || opts.parent_email || opts.email));
  if (!parsed.valid.length) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_RECIPIENT_EMAIL",
      error: parsed.invalid.length
        ? ("Invalid recipient email address: " + parsed.invalid.join(", "))
        : "Recipient email address is required."
    };
  }
  if (!hasConfiguredEmailProvider()) {
    return {
      ok: false,
      statusCode: 503,
      code: "EMAIL_PROVIDER_NOT_CONFIGURED",
      requiredEnv: REQUIRED_EMAIL_ENV_KEYS,
      error: "Email delivery provider is not configured on the server. Set RESEND_API_KEY (+ EMAIL_FROM) or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in Vercel Environment Variables."
    };
  }

  const subject = String((opts && opts.subject) || "[AI Tutor] Notification").replace(/[\r\n]+/g, " ").trim();
  const html = String((opts && opts.html) || "");
  const text = String((opts && opts.text) || "");
  const eventType = String((opts && opts.eventType) || "lms_email");
  const errors = [];

  // 1. Resend API
  const resendKey = String(process.env.RESEND_API_KEY || "").replace(/\s+/g, "").trim();
  if (resendKey && typeof fetch === "function") {
    try {
      const fromAddr = String(process.env.EMAIL_FROM || "AI Tutor <onboarding@resend.dev>").replace(/[\r\n]+/g, "").trim();
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + resendKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromAddr,
          to: parsed.valid,
          subject: subject,
          html: html,
          text: text
        })
      });
      const bodyTxt = await resp.text().catch(function () { return ""; });
      if (resp.ok) {
        let data = {};
        try { data = JSON.parse(bodyTxt || "{}"); } catch (e) { /* ignore */ }
        if (data && data.id) {
          return {
            ok: true,
            statusCode: 200,
            provider: "resend",
            to: parsed.valid,
            messageId: String(data.id),
            timestamp: new Date().toISOString()
          };
        }
        errors.push("Resend returned 200 without message id: " + bodyTxt.slice(0, 200));
      } else {
        errors.push("Resend HTTP " + resp.status + ": " + bodyTxt.slice(0, 240));
      }
    } catch (err) {
      errors.push("Resend error: " + ((err && err.message) || "Network failure"));
    }
  }

  // 2. Direct SMTP (TLS 465 / STARTTLS 587)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const sentIds = [];
      for (let i = 0; i < parsed.valid.length; i++) {
        await sendSmtpTlsEmail({ to: parsed.valid[i], subject: subject, html: html, text: text });
        sentIds.push("smtp_" + Date.now() + "_" + i);
      }
      return {
        ok: true,
        statusCode: 200,
        provider: "smtp",
        to: parsed.valid,
        messageId: sentIds.join(","),
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      errors.push("SMTP error: " + ((err && err.message) || "SMTP delivery failed"));
    }
  }

  // 3. Custom Webhook
  if (process.env.EMAIL_WEBHOOK_URL && String(process.env.EMAIL_WEBHOOK_URL).trim() && typeof fetch === "function") {
    try {
      const resp = await fetch(String(process.env.EMAIL_WEBHOOK_URL).trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: parsed.valid,
          subject: subject,
          html: html,
          text: text,
          eventType: eventType,
          payload: (opts && opts.payload) || {}
        })
      });
      if (resp.ok) {
        return {
          ok: true,
          statusCode: 200,
          provider: "webhook",
          to: parsed.valid,
          messageId: "webhook_" + Date.now(),
          timestamp: new Date().toISOString()
        };
      }
      const errTxt = await resp.text().catch(function () { return ""; });
      errors.push("Webhook HTTP " + resp.status + ": " + errTxt.slice(0, 200));
    } catch (err) {
      errors.push("Webhook error: " + ((err && err.message) || "Network failure"));
    }
  }

  return {
    ok: false,
    statusCode: 502,
    code: "EMAIL_PROVIDER_ERROR",
    error: errors.join(" | ") || "Upstream email provider rejected the request."
  };
}

function fmtIsoDisplay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour12: false
    }).formatToParts(d);
    const get = function (t) { const f = parts.find(function (p) { return p.type === t; }); return f ? f.value : ""; };
    return get("hour") + ":" + get("minute") + " " + get("day") + "/" + get("month") + "/" + get("year");
  } catch (e) {
    const p = function (n) { return n < 10 ? "0" + n : String(n); };
    return p(d.getHours()) + ":" + p(d.getMinutes()) + " " + p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
  }
}

function buildLmsEmailTemplate(item, type, lang) {
  const l = lang === "en" ? "en" : (lang === "ja" ? "ja" : "vi");
  const studentName = String(item.studentName || "").trim() || (l === "en" ? "Student" : (l === "ja" ? "生徒" : "Học sinh"));
  const quizTitle = String(item.quizTitle || "").trim() || (l === "en" ? "Assignment" : (l === "ja" ? "課題" : "Bài tập"));
  const className = String(item.className || "").trim();
  const dueStr = fmtIsoDisplay(item.deadline);
  const assignUrl = String(item.assignmentUrl || "").trim();
  const receiptUrl = String(item.receiptUrl || "").trim();
  const teacherNote = String(item.teacherNote || "").trim();

  if (type === "result" || type === "result_report") {
    const scoreStr = (item.score10 != null && item.score10 !== "") ? (Number(item.score10).toFixed(1) + " / 10") : "—";
    const correctStr = (item.correctCount != null && item.totalQuestions != null)
      ? (String(item.correctCount) + " / " + String(item.totalQuestions))
      : "";
    const durSec = Number(item.durationSec);
    const durStr = Number.isFinite(durSec) && durSec >= 0
      ? (String(Math.floor(durSec / 60)).padStart(2, "0") + ":" + String(Math.round(durSec % 60)).padStart(2, "0"))
      : "";
    const subTimeStr = fmtIsoDisplay(item.submittedAt);
    const tabSwitches = item.tabSwitches != null ? String(item.tabSwitches) : "";
    const feedback = String(item.feedback || "").trim();
    const breakdown = Array.isArray(item.breakdown) ? item.breakdown : (Array.isArray(item.questions) ? item.questions : []);
    const subject = l === "en"
      ? ("[AI Tutor] Assignment Result: " + studentName + " – " + quizTitle + " (" + scoreStr + ")")
      : (l === "ja"
        ? ("[AI Tutor] 課題結果通知: " + studentName + " – " + quizTitle + " (" + scoreStr + ")")
        : ("[AI Tutor] Báo cáo kết quả: " + studentName + " – " + quizTitle + " (" + scoreStr + ")"));
    const ctaUrl = String(item.reviewUrl || "").trim() || receiptUrl || assignUrl;
    const ctaLabel = l === "en" ? "View Exam & Detailed Answers Online" : (l === "ja" ? "問題と解答をオンラインで確認" : "Xem lại đề & bài làm chi tiết trực tuyến");
    const reviewHint = l === "en"
      ? "Click the button below to view the full question-by-question breakdown, print A4 worksheet, or export PDF + QR code."
      : (l === "ja"
        ? "下のボタンから全問の解答詳細・A4印刷・PDF + QR出力をご確認いただけます。"
        : "Nhấn nút bên dưới để xem chi tiết bài làm từng câu, in phiếu A4 hoặc tải PDF kèm mã QR.");

    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;background:#f8fafc;padding:20px;border-radius:12px">' +
        '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:24px">' +
          '<div style="font-size:12px;font-weight:700;color:#5347cd;text-transform:uppercase;letter-spacing:.05em">AI Tutor · Creator Studio</div>' +
          '<h2 style="margin:8px 0 14px;font-size:19px;color:#0f172a">' + escHtml(subject) + '</h2>' +
          '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">' +
            '<tr><td style="padding:6px 0;color:#64748b;width:150px">' + (l === "en" ? "Student" : (l === "ja" ? "生徒名" : "Học sinh")) + '</td><td style="padding:6px 0;font-weight:700">' + escHtml(studentName) + '</td></tr>' +
            (className ? '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Class / Grade" : (l === "ja" ? "クラス" : "Lớp / Khối")) + '</td><td style="padding:6px 0">' + escHtml(className) + '</td></tr>' : '') +
            '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Assignment" : (l === "ja" ? "課題" : "Bài tập")) + '</td><td style="padding:6px 0;font-weight:600">' + escHtml(quizTitle) + '</td></tr>' +
            '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Final Score" : (l === "ja" ? "スコア" : "Điểm số")) + '</td><td style="padding:6px 0;font-weight:800;color:#059669;font-size:17px">' + escHtml(scoreStr) + (correctStr ? (' <span style="font-size:13px;color:#475569;font-weight:600">(' + escHtml(correctStr) + ')</span>') : '') + '</td></tr>' +
            (subTimeStr ? '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Submitted At" : (l === "ja" ? "提出日時" : "Thời điểm nộp")) + '</td><td style="padding:6px 0">' + escHtml(subTimeStr) + '</td></tr>' : '') +
            (durStr ? '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Duration" : (l === "ja" ? "所要時間" : "Thời gian làm")) + '</td><td style="padding:6px 0">' + escHtml(durStr) + '</td></tr>' : '') +
            (tabSwitches !== "" ? '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Tab Switches" : (l === "ja" ? "タブ切替回数" : "Số lần chuyển tab")) + '</td><td style="padding:6px 0">' + escHtml(tabSwitches) + '</td></tr>' : '') +
          '</table>' +
          (feedback ? '<div style="background:#f1f5f9;border-left:4px solid #5347cd;padding:12px 14px;border-radius:6px;font-size:14px;margin-bottom:14px"><strong>' + (l === "en" ? "Teacher Remark:" : (l === "ja" ? "講師コメント:" : "Nhận xét của giáo viên:")) + '</strong><br>' + escHtml(feedback) + '</div>' : '') +
          '<p style="font-size:13px;color:#475569;line-height:1.5;margin:0 0 14px">' + escHtml(reviewHint) + '</p>' +
          (ctaUrl ? '<p style="margin:0 0 8px"><a href="' + escHtml(ctaUrl) + '" style="display:inline-block;background:#5347cd;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;font-size:14px">' + escHtml(ctaLabel) + '</a></p><p style="font-size:12px;color:#64748b;word-break:break-all;margin:0">' + escHtml(ctaUrl) + '</p>' : '') +
        '</div>' +
      '</div>';

    const text = subject + "\n" +
      "Học sinh: " + studentName + (className ? (" (" + className + ")") : "") + "\n" +
      "Bài tập: " + quizTitle + "\n" +
      "Điểm số: " + scoreStr + (correctStr ? (" (" + correctStr + ")") : "") + "\n" +
      (subTimeStr ? ("Thời điểm nộp: " + subTimeStr + "\n") : "") +
      (durStr ? ("Thời gian làm: " + durStr + "\n") : "") +
      (tabSwitches !== "" ? ("Số lần chuyển tab: " + tabSwitches + "\n") : "") +
      (feedback ? ("Nhận xét: " + feedback + "\n") : "") +
      (ctaUrl ? ("Xem chi tiết bài làm trực tuyến: " + ctaUrl + "\n") : "");
    return { subject: subject, html: html, text: text };
  }

  // Default: deadline_reminder
  const subject = l === "en"
    ? ("[AI Tutor] Assignment Reminder: " + quizTitle + " (" + studentName + ")")
    : (l === "ja"
      ? ("[AI Tutor] 課題提出リマインダー: " + quizTitle + " (" + studentName + ")")
      : ("[AI Tutor] Nhắc hạn nộp bài: " + quizTitle + " – " + studentName));
  const greeting = l === "en"
    ? ("Dear Parent/Guardian of <strong>" + escHtml(studentName) + "</strong>,")
    : (l === "ja"
      ? ("<strong>" + escHtml(studentName) + "</strong> 様の保護者様、")
      : ("Kính gửi Quý phụ huynh học sinh <strong>" + escHtml(studentName) + "</strong>,"));
  const bodyLine = l === "en"
    ? "This is a friendly reminder that the following assignment has not been submitted yet:"
    : (l === "ja"
      ? "以下の課題がまだ提出されていません。期限までにご提出をお願いいたします。"
      : "Hệ thống xin nhắc nhở học sinh hiện chưa hoàn thành bài tập sau:");
  const ctaLabel = l === "en" ? "Open Assignment Now" : (l === "ja" ? "課題を開く" : "Mở bài tập để làm ngay");

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;background:#f8fafc;padding:20px;border-radius:12px">' +
      '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:24px">' +
        '<div style="font-size:12px;font-weight:700;color:#5347cd;text-transform:uppercase;letter-spacing:.05em">AI Tutor · Creator Studio</div>' +
        '<h2 style="margin:8px 0 12px;font-size:19px;color:#0f172a">' + escHtml(subject) + '</h2>' +
        '<p style="font-size:14px;line-height:1.6;margin:0 0 10px">' + greeting + '</p>' +
        '<p style="font-size:14px;line-height:1.6;margin:0 0 16px;color:#334155">' + escHtml(bodyLine) + '</p>' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">' +
          '<tr><td style="padding:6px 0;color:#64748b;width:140px">' + (l === "en" ? "Student" : (l === "ja" ? "生徒名" : "Học sinh")) + '</td><td style="padding:6px 0;font-weight:700">' + escHtml(studentName) + '</td></tr>' +
          (className ? '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Class / Course" : (l === "ja" ? "クラス" : "Lớp / Khóa học")) + '</td><td style="padding:6px 0">' + escHtml(className) + '</td></tr>' : '') +
          '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Assignment" : (l === "ja" ? "課題" : "Bài tập")) + '</td><td style="padding:6px 0;font-weight:700">' + escHtml(quizTitle) + '</td></tr>' +
          (dueStr ? '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Due Date" : (l === "ja" ? "提出期限" : "Hạn nộp")) + '</td><td style="padding:6px 0;font-weight:700;color:#dc2626">' + escHtml(dueStr) + '</td></tr>' : '') +
          '<tr><td style="padding:6px 0;color:#64748b">' + (l === "en" ? "Status" : (l === "ja" ? "状態" : "Trạng thái")) + '</td><td style="padding:6px 0;color:#d97706;font-weight:700">' + (l === "en" ? "Pending Submission" : (l === "ja" ? "未提出" : "Chưa nộp bài")) + '</td></tr>' +
        '</table>' +
        (teacherNote ? '<div style="background:#f1f5f9;border-left:4px solid #5347cd;padding:12px 14px;border-radius:6px;font-size:14px;margin-bottom:16px"><strong>' + (l === "en" ? "Teacher Note:" : (l === "ja" ? "講師メモ:" : "Ghi chú của giáo viên:")) + '</strong><br>' + escHtml(teacherNote) + '</div>' : '') +
        (assignUrl ? '<p style="margin:18px 0 10px"><a href="' + escHtml(assignUrl) + '" style="display:inline-block;background:#5347cd;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;font-size:14px">' + escHtml(ctaLabel) + '</a></p><p style="font-size:12px;color:#64748b;word-break:break-all;margin:0">' + escHtml(assignUrl) + '</p>' : '') +
      '</div>' +
    '</div>';

  const text = subject + "\n\n" +
    bodyLine + "\n" +
    "- Student: " + studentName + (className ? (" (" + className + ")") : "") + "\n" +
    "- Assignment: " + quizTitle + "\n" +
    (dueStr ? ("- Due Date: " + dueStr + "\n") : "") +
    (teacherNote ? ("- Note: " + teacherNote + "\n") : "") +
    (assignUrl ? ("- Link: " + assignUrl + "\n") : "");

  return { subject: subject, html: html, text: text };
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
    return Promise.resolve(security.sanitizeInput(req.body));
  }
  if (typeof req.body === "string") {
    try { return Promise.resolve(security.sanitizeInput(req.body ? JSON.parse(req.body) : {})); } catch (e) { return Promise.resolve({}); }
  }
  if (Buffer.isBuffer(req.body)) {
    try { return Promise.resolve(security.sanitizeInput(JSON.parse(req.body.toString("utf8") || "{}"))); } catch (e) { return Promise.resolve({}); }
  }
  return new Promise(function (resolve) {
    let data = "";
    req.on("data", function (c) {
      data += c;
      if (data.length > 8 * 1024 * 1024) { try { req.destroy(); } catch (e) { /* */ } resolve({}); }
    });
    req.on("end", function () {
      try { resolve(security.sanitizeInput(data ? JSON.parse(data) : {})); } catch (e) { resolve({}); }
    });
    req.on("error", function () { resolve({}); });
  });
}

function sendJson(res, status, obj) {
  const secHeaders = security.buildApiSecurityHeaders(res && res.__req);
  res.writeHead(status, Object.assign({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  }, secHeaders));
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

  // 2. Merge payment_requests (Admin-only sync; regular users create requests strictly via POST /api/payment-requests so stale localStorage pending records NEVER resurrect after rejection)
  if (isAdminCaller && Array.isArray(body.payment_requests)) {
    const byId = {};
    db.payment_requests.forEach(function (r) { if (r && r.id) byId[r.id] = r; });
    body.payment_requests.forEach(function (r) {
      if (!r || typeof r !== "object" || !r.id || !PAID_PLANS.includes(r.plan)) return;
      const rEmail = String(r.userEmail || "").trim().toLowerCase();
      if (!rEmail) return;
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
        changed = true;
      } else if (existing.status === "pending" && (r.status === "approved" || r.status === "rejected")) {
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
  }).sort(function (a, b) {
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
  const latestPaymentRequest = ownReqs.length > 0 ? ownReqs[ownReqs.length - 1] : null;
  return {
    subscriptions: ownSubs,
    revokedSubscriptions: db.revokedSubscriptions || {},
    userApis: ownApis,
    revokedUserApis: db.revokedUserApis,
    payment_requests: ownReqs,
    latestPaymentRequest: latestPaymentRequest,
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

  res.__req = req;
  if (method === "OPTIONS") {
    const origin = req && req.headers && req.headers.origin ? String(req.headers.origin).trim() : "";
    if (origin && !security.isAllowedOrigin(origin)) {
      res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ ok: false, error: "CORS origin not allowed" }));
    }
    res.writeHead(204, security.buildApiSecurityHeaders(req));
    return res.end();
  }

  try {
    if (p === "/api/health" && method === "GET") {
      return sendJson(res, 200, { ok: true, app: "AI Tutor" });
    }

    /* ---------- User Registration & Login Tracking API ---------- */
    if (p === "/api/users/register" && method === "POST") {
      const rl = security.checkSlidingWindowRateLimit("register", security.getClientIp(req), 25, 10 * 60 * 1000);
      if (!rl.allowed) {
        return sendJson(res, 429, { error: "Qu\u00e1 nhi\u1ec1u y\u00eau c\u1ea7u. Vui l\u00f2ng th\u1eed l\u1ea1i sau " + rl.retryAfterSec + " gi\u00e2y." });
      }
      const body = await readBody(req);
      const caller = getCallerEmail(req) || String((body && body.email) || "").trim().toLowerCase();
      if (!caller || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caller)) {
        return sendJson(res, 400, { error: "Email kh\u00f4ng h\u1ee3p l\u1ec7." });
      }
      const safeName = String((body && body.name) || caller.split("@")[0]).trim().slice(0, 120);
      const safePicture = typeof (body && body.picture) === "string" && /^https?:\/\//i.test(body.picture.trim())
        ? body.picture.trim().slice(0, 500)
        : "";
      const safeUid = String((body && body.uid) || caller).trim().slice(0, 128);
      const db = await loadDb();
      const result = upsertRegisteredUser(db, {
        uid: safeUid,
        email: caller,
        name: safeName,
        picture: safePicture
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

    /* ---------- Public/Private Share Link & Quiz Persistence API ---------- */
    if (p === "/api/shares" && method === "POST") {
      const body = await readBody(req);
      if (!body || !body.deck || !Array.isArray(body.deck.questions) || body.deck.questions.length === 0) {
        return sendJson(res, 400, { error: "B\u1ed9 \u0111\u1ec1 chia s\u1ebb kh\u00f4ng h\u1ee3p l\u1ec7.", code: "INVALID_PAYLOAD" });
      }
      const caller = getCallerEmail(req) || "guest";
      let code = String(body.code || body.deck.shareCode || "").trim().toUpperCase();
      if (!/^AIT-[A-Z0-9]{4,8}$/.test(code)) {
        code = "AIT-" + Math.floor(1000 + Math.random() * 9000);
        for (let tries = 0; tries < 8; tries++) {
          const exists = await storage.getShareByCode(code);
          if (!exists) break;
          code = "AIT-" + Math.floor(1000 + Math.random() * 9000);
        }
      } else {
        // Ownership check if overwriting an existing share code
        const existing = await storage.getShareByCode(code);
        if (existing && existing.createdBy && existing.createdBy !== "guest" && caller !== ADMIN_EMAIL && existing.createdBy.toLowerCase() !== caller.toLowerCase()) {
          return sendJson(res, 403, { error: "Kh\u00f4ng c\u00f3 quy\u1ec1n ghi \u0111\u00e8 m\u00e3 \u0111\u1ec1 c\u1ee7a ng\u01b0\u1eddi kh\u00e1c.", code: "FORBIDDEN" });
        }
      }
      const isPublic = typeof body.isPublic === "boolean"
        ? body.isPublic
        : (typeof body.deck.isPublic === "boolean" ? body.deck.isPublic : true);
      // Preserve all unknown legacy fields while normalizing safe optional ones
      const sanitizedDeck = Object.assign({}, body.deck, {
        id: String(body.deck.id || ("qz_" + Date.now())),
        title: String(body.deck.title || "Quiz kh\u00f4ng t\u00ean").trim().slice(0, 300),
        tag: String(body.deck.tag || "T\u1ed5ng h\u1ee3p").trim().slice(0, 120),
        isPublic: isPublic,
        shareCode: code,
        questions: body.deck.questions
      });
      const nowIso = new Date().toISOString();
      const entry = {
        code: code,
        isPublic: isPublic,
        deck: sanitizedDeck,
        createdBy: caller,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      try {
        const saved = await storage.saveShareByCode(code, entry);
        return sendJson(res, 201, {
          ok: true,
          code: code,
          isPublic: isPublic,
          updatedAt: nowIso,
          driver: saved.driver
        });
      } catch (saveErr) {
        return sendJson(res, 500, { error: "Kh\u00f4ng th\u1ec3 l\u01b0u b\u1ed9 \u0111\u1ec1 l\u00ean c\u01a1 s\u1edf d\u1eef li\u1ec7u: " + (saveErr.message || "DB error"), code: "DB_SAVE_FAILED" });
      }
    }

    const shareMatch = p.match(/^\/api\/shares\/([^/]+)$/);
    if (shareMatch && method === "GET") {
      const code = decodeURIComponent(shareMatch[1]).trim().toUpperCase();
      const entry = await storage.getShareByCode(code);
      if (!entry) return sendJson(res, 404, { error: "Quiz Not Found", code: "QUIZ_NOT_FOUND" });
      const isPublic = entry.isPublic !== false && (!entry.deck || entry.deck.isPublic !== false);
      const caller = getCallerEmail(req) || "";
      const isOwner = !!(caller && entry.createdBy && (caller.toLowerCase() === String(entry.createdBy).toLowerCase() || caller.toLowerCase() === ADMIN_EMAIL));
      if (!isPublic && !isOwner) {
        return sendJson(res, 403, { error: "This Quiz is Private", code: "QUIZ_PRIVATE" });
      }
      return sendJson(res, 200, { ok: true, share: entry, isPublic: isPublic, isOwner: isOwner });
    }

    if (shareMatch && method === "PATCH") {
      const code = decodeURIComponent(shareMatch[1]).trim().toUpperCase();
      const entry = await storage.getShareByCode(code);
      if (!entry) return sendJson(res, 404, { error: "Quiz Not Found", code: "QUIZ_NOT_FOUND" });
      const caller = getCallerEmail(req) || "";
      const isOwner = !!(caller && (!entry.createdBy || entry.createdBy === "guest" || caller.toLowerCase() === String(entry.createdBy).toLowerCase() || caller.toLowerCase() === ADMIN_EMAIL));
      if (!isOwner) {
        return sendJson(res, 403, { error: "Ch\u1ec9 ch\u1ee7 s\u1edf h\u1eefu m\u1edbi c\u00f3 quy\u1ec1n thay \u0111\u1ed5i quy\u1ec1n truy c\u1eadp Quiz.", code: "FORBIDDEN" });
      }
      const body = await readBody(req);
      if (typeof (body && body.isPublic) !== "boolean") {
        return sendJson(res, 400, { error: "Thi\u1ebfu tr\u01b0\u1eddng isPublic (boolean).", code: "INVALID_PAYLOAD" });
      }
      const nowIso = new Date().toISOString();
      const updated = Object.assign({}, entry, {
        isPublic: body.isPublic,
        updatedAt: nowIso,
        deck: Object.assign({}, entry.deck || {}, { isPublic: body.isPublic, shareCode: code })
      });
      try {
        await storage.saveShareByCode(code, updated);
        return sendJson(res, 200, { ok: true, code: code, isPublic: body.isPublic, updatedAt: nowIso });
      } catch (err) {
        return sendJson(res, 500, { error: "Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i Quiz.", code: "DB_SAVE_FAILED" });
      }
    }

    /* ---------- Cloud User Data Sync API ---------- */
    if (p === "/api/cloud/sync" && method === "GET") {
      const caller = normalizeGmail(getCallerEmail(req));
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const data = await storage.getCloudUser(caller);
      return sendJson(res, 200, { ok: true, data: data || null });
    }
    if (p === "/api/cloud/sync" && method === "PUT") {
      const caller = normalizeGmail(getCallerEmail(req));
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const body = await readBody(req);
      const prev = await storage.getCloudUser(caller);
      const countPayloadItems = function (obj) {
        if (!obj || typeof obj !== "object") return 0;
        const arrLen = function (v) { return Array.isArray(v) ? v.length : 0; };
        const vocabCount = obj.vocab_studio && Array.isArray(obj.vocab_studio.words) ? obj.vocab_studio.words.length : 0;
        return arrLen(obj.exam_sets) + arrLen(obj.decks) + arrLen(obj.studio_quizzes) +
          arrLen(obj.lms_students) + arrLen(obj.lms_assignments) + arrLen(obj.lms_submissions) +
          arrLen(obj.quiz_history) + vocabCount;
      };
      // Empty-device overwrite protection: never allow an empty local state to wipe non-empty cloud data
      if (prev && !body.forceReplace && countPayloadItems(prev) > 0 && countPayloadItems(body) === 0) {
        return sendJson(res, 409, {
          ok: false,
          code: "EMPTY_OVERWRITE_BLOCKED",
          error: "Blocked empty payload from overwriting existing cloud data.",
          cloudUpdatedAt: prev.updatedAt || ""
        });
      }
      // Stale backup overwrite protection
      const prevTs = prev && prev.updatedAt ? Date.parse(prev.updatedAt) : 0;
      const incTs = body && (body.updatedAt || body.exportedAt) ? Date.parse(body.updatedAt || body.exportedAt) : Date.now();
      if (prev && prevTs && incTs && incTs < prevTs && !body.forceReplace) {
        return sendJson(res, 409, { error: "Stale backup rejected to protect newer cloud data.", code: "STALE_BACKUP", cloudUpdatedAt: prev.updatedAt });
      }
      const next = Object.assign({}, prev || {}, body, { userEmail: caller, updatedAt: new Date().toISOString() });
      await storage.saveCloudUser(caller, next);
      return sendJson(res, 200, { ok: true, updatedAt: next.updatedAt });
    }

    /* ---------- Vocab Studio Cloud & Supabase Hybrid Sync API ---------- */
    if (p === "/api/vocab/sync" && method === "GET") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const data = await storage.getVocabUser(caller);
      return sendJson(res, 200, { ok: true, data: data || null });
    }
    if (p === "/api/vocab/sync" && method === "PUT") {
      const caller = getCallerEmail(req);
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const body = await readBody(req);
      const next = {
        words: Array.isArray(body && body.words) ? body.words : [],
        decks: Array.isArray(body && body.decks) ? body.decks : [],
        stats: (body && body.stats && typeof body.stats === "object") ? body.stats : {},
        settings: (body && body.settings && typeof body.settings === "object") ? body.settings : {},
        updatedAt: Date.now(),
        syncedAt: new Date().toISOString()
      };
      await storage.saveVocabUser(caller, next);
      return sendJson(res, 200, { ok: true, updatedAt: next.updatedAt, syncedAt: next.syncedAt });
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
      // Unranked tier is 0 VND / year (Free Tier)
      const rl = security.checkSlidingWindowRateLimit("unranked_free", security.getClientIp(req), 20, 10 * 60 * 1000);
      if (!rl.allowed) return sendJson(res, 429, { ok: false, error: "Qu\u00e1 nhi\u1ec1u y\u00eau c\u1ea7u. Vui l\u00f2ng th\u1eed l\u1ea1i sau." });
      const body = await readBody(req);
      const caller = getCallerEmail(req) || String((body && body.email) || "").trim().toLowerCase();
      if (!caller || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caller)) {
        return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      }
      const db = await loadDb();
      const cur = db.subscriptions[caller];
      if (cur && PAID_PLANS.includes(cur.tier) && Number(cur.expires) > Date.now()) {
        return sendJson(res, 400, { error: "B\u1ea1n \u0111ang c\u00f3 g\u00f3i cao h\u01a1n Unranked." });
      }
      const now = Date.now();
      db.subscriptions[caller] = { tier: "unranked", since: now, expires: now + 365 * DAY_MS };
      if (db.revokedSubscriptions) delete db.revokedSubscriptions[caller];
      const safeName = String((body && body.name) || caller.split("@")[0]).trim().slice(0, 120);
      const uRes = upsertRegisteredUser(db, { email: caller, name: safeName });
      await saveDb(db);
      if (uRes.shouldNotify && uRes.user) {
        try { await sendNewUserNotification(db, uRes.user); } catch (e) { /* safe */ }
      }
      return sendJson(res, 200, { ok: true, subscription: db.subscriptions[caller] });
    }

    if (p === "/api/payment-requests" && method === "POST") {
      const rl = security.checkSlidingWindowRateLimit("payment_req", security.getClientIp(req), 12, 10 * 60 * 1000);
      if (!rl.allowed) {
        return sendJson(res, 429, { error: "Qu\u00e1 nhi\u1ec1u y\u00eau c\u1ea7u thanh to\u00e1n. Th\u1eed l\u1ea1i sau " + rl.retryAfterSec + " gi\u00e2y." });
      }
      const body = await readBody(req);
      const caller = getCallerEmail(req) || String((body && body.userEmail) || "").trim().toLowerCase();
      if (!caller) return sendJson(res, 401, { error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp." });
      const planKey = String((body && body.plan) || "").trim().toLowerCase();
      if (!PLAN_PRICES[planKey]) return sendJson(res, 400, { error: "G\u00f3i thanh to\u00e1n kh\u00f4ng h\u1ee3p l\u1ec7." });
      const receiptCheck = security.validateReceiptDataUrl(body && body.receiptImage);
      if (!receiptCheck.ok) return sendJson(res, 400, { error: receiptCheck.error });
      const db = await loadDb();
      const dup = db.payment_requests.some(function (r) {
        return r && String(r.userEmail || "").toLowerCase() === caller && r.plan === planKey && r.status === "pending";
      });
      if (dup) return sendJson(res, 409, { error: "B\u1ea1n \u0111\u00e3 c\u00f3 y\u00eau c\u1ea7u \u0111ang ch\u1edd duy\u1ec7t cho g\u00f3i n\u00e0y." });
      const basePrice = PLAN_PRICES[planKey];
      let discountPct = 0;
      const voucherCode = String((body && body.voucher) || "").trim().toUpperCase();
      if (voucherCode && Array.isArray(db.vouchers)) {
        const v = db.vouchers.find(function (x) { return x && String(x.code || "").toUpperCase() === voucherCode; });
        if (v && Number(v.discountPercent) > 0 && (!v.expiresAt || Date.parse(v.expiresAt) > Date.now())) {
          discountPct = Math.min(100, Math.max(0, Number(v.discountPercent)));
        }
      }
      const serverAmount = Math.max(0, Math.round(basePrice * (100 - discountPct) / 100));
      const rec = {
        id: "req_" + Date.now() + "_" + crypto.randomBytes(3).toString("hex"),
        userId: caller,
        userEmail: caller,
        userName: String((body && body.userName) || caller).trim().slice(0, 120),
        plan: planKey,
        amount: serverAmount,
        voucher: voucherCode,
        memo: String((body && body.memo) || "").trim().slice(0, 120),
        transferNote: String((body && body.transferNote) || "").trim().slice(0, 200),
        receiptImage: receiptCheck.value,
        status: "pending",
        createdAt: new Date().toISOString(),
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

    /* ---------- SHA-256 Document Content Cache (24h TTL: Upstash Redis / In-Memory LRU) ---------- */
    if (p === "/api/docs/check-cache" && method === "GET") {
      const urlObj = new URL(String(req.url || "/"), "http://localhost");
      const hash = docCache.normalizeSha256(urlObj.searchParams.get("hash") || "");
      if (!hash) {
        return sendJson(res, 400, { ok: false, code: "INVALID_HASH", error: "Invalid SHA-256 hash (expected 64 hex characters)." });
      }
      const cached = await docCache.getCachedDoc(hash);
      if (!cached) {
        return sendJson(res, 200, { ok: true, hit: false, fileHash: hash, driver: docCache.getCacheDriver() });
      }
      return sendJson(res, 200, {
        ok: true,
        hit: true,
        docId: cached.docId,
        fileHash: cached.fileHash,
        fileName: cached.fileName,
        parsedText: cached.parsedText,
        parsedQuestions: cached.parsedQuestions,
        cachedAt: cached.cachedAt,
        driver: docCache.getCacheDriver()
      });
    }

    if (p === "/api/docs/cache" && method === "POST") {
      const rl = security.checkSlidingWindowRateLimit("doc_cache", security.getClientIp(req), 30, 10 * 60 * 1000);
      if (!rl.allowed) return sendJson(res, 429, { ok: false, error: "Rate limit exceeded." });
      const body = await readBody(req);
      const hash = docCache.normalizeSha256(body.hash || body.fileHash || "");
      if (!hash) {
        return sendJson(res, 400, { ok: false, code: "INVALID_HASH", error: "Invalid SHA-256 hash." });
      }
      const uploadCheck = security.validateUploadMeta({
        filename: body.fileName || "document.pdf",
        mimeType: body.mimeType || "",
        sizeBytes: Buffer.byteLength(String(body.parsedText || ""), "utf8"),
        maxBytes: 2 * 1024 * 1024
      });
      if (!uploadCheck.ok) {
        return sendJson(res, 400, { ok: false, error: uploadCheck.error });
      }
      const saved = await docCache.setCachedDoc(hash, {
        fileName: uploadCheck.filename,
        mimeType: body.mimeType || "",
        parsedText: body.parsedText || "",
        parsedQuestions: body.parsedQuestions || null
      });
      return sendJson(res, 200, {
        ok: true,
        docId: saved.docId,
        fileHash: saved.fileHash,
        ttlSeconds: saved.ttlSeconds,
        driver: docCache.getCacheDriver()
      });
    }

    /* ---------- LMS Cloud Assignment Sync & Public Incognito Access ---------- */
    if (p === "/api/lms/assignments/sync" && method === "POST") {
      const body = await readBody(req);
      const db = await loadDb();
      if (!db.lmsAssignments || typeof db.lmsAssignments !== "object") db.lmsAssignments = {};
      if (!Array.isArray(db.lmsSubmissions)) db.lmsSubmissions = [];

      const incoming = Array.isArray(body.assignments)
        ? body.assignments
        : (body.assignment ? [body.assignment] : []);

      let syncedCount = 0;
      const syncedIds = [];
      for (let i = 0; i < incoming.length; i++) {
        const a = incoming[i];
        if (!a || !a.code) continue;
        const code = String(a.code).trim().toUpperCase();
        if (!code) continue;
        const studentsArr = Array.isArray(a.assignedStudents) ? a.assignedStudents : [];
        db.lmsAssignments[code] = {
          id: String(a.id || ("as_" + code)),
          code: code,
          title: String(a.title || "Bài tập"),
          gradeLevel: String(a.gradeLevel || "unclassified"),
          subject: String(a.subject || ""),
          quizId: String(a.quizId || ""),
          quizSnapshot: a.quizSnapshot || null,
          targetMode: String(a.targetMode || "students"),
          targetClass: String(a.targetClass || ""),
          targetStudentIds: Array.isArray(a.targetStudentIds) ? a.targetStudentIds.map(String) : [],
          assignedStudents: studentsArr.map(function (st) {
            return {
              id: String(st.id || ""),
              fullName: String(st.fullName || st.name || ""),
              className: String(st.className || st.grade || ""),
              school: String(st.school || ""),
              pin: String(st.pin || ""),
              parentEmail: String(st.parentEmail || st.parent_email || st.email || "").trim()
            };
          }),
          openAt: a.openAt || "",
          deadline: a.deadline || a.dueAt || "",
          maxAttempts: Number(a.maxAttempts != null ? a.maxAttempts : 1),
          scorePolicy: String(a.scorePolicy || a.gradingPolicy || "first"),
          revealMode: String(a.revealMode || "immediate"),
          durationMinutes: Number(a.durationMinutes != null ? a.durationMinutes : (a.timeLimitMinutes || 0)),
          teacherNote: String(a.teacherNote || ""),
          shuffleQ: a.shuffleQ !== false,
          shuffleO: a.shuffleO !== false,
          parentEmailEnabled: a.parentEmailEnabled !== false && a.notifyParent !== false,
          parentEmailOverrides: (a.parentEmailOverrides && typeof a.parentEmailOverrides === "object") ? a.parentEmailOverrides : {},
          isRemedial: !!a.isRemedial,
          updatedAt: new Date().toISOString()
        };
        syncedCount++;
        syncedIds.push(db.lmsAssignments[code].id);
      }
      if (syncedCount > 0) await saveDb(db);

      const idSet = new Set(syncedIds);
      if (Array.isArray(body.submissions) && body.submissions.length) {
        const subMap = new Map(db.lmsSubmissions.map(function (s) { return [String(s.id), s]; }));
        let subAdded = false;
        body.submissions.forEach(function (s) {
          if (s && s.id && !subMap.has(String(s.id))) {
            db.lmsSubmissions.push(s);
            subMap.set(String(s.id), s);
            subAdded = true;
          }
        });
        if (subAdded) await saveDb(db);
      }

      const cloudSubs = db.lmsSubmissions.filter(function (s) {
        return s && (idSet.has(String(s.assignmentId)) || (s.assignCode && db.lmsAssignments[s.assignCode]));
      });
      return sendJson(res, 200, { ok: true, syncedCount: syncedCount, submissions: cloudSubs });
    }

    /* ---------- Public Completed Attempt Result Resolver (Unauthenticated-Safe) ---------- */
    if (p === "/api/lms/public-attempt" && method === "GET") {
      const urlObj = new URL(String(req.url || "/"), "http://localhost");
      const code = String(urlObj.searchParams.get("code") || urlObj.searchParams.get("assign") || "").trim().toUpperCase();
      const attemptId = String(urlObj.searchParams.get("attempt") || urlObj.searchParams.get("receipt") || "").trim();
      if (!attemptId) {
        return sendJson(res, 400, { ok: false, code: "MISSING_PARAMS", error: "Thiếu mã lượt nộp bài." });
      }
      const db = await loadDb();
      let entry = code && db.lmsAssignments ? db.lmsAssignments[code] : null;
      const allSubs = Array.isArray(db.lmsSubmissions) ? db.lmsSubmissions : [];
      const rawSub = allSubs.find(function (s) {
        if (!s || String(s.id) !== attemptId) return false;
        if (!code) return true;
        if (entry && String(s.assignmentId) === String(entry.id)) return true;
        if (s.assignCode && String(s.assignCode).toUpperCase() === code) return true;
        return false;
      }) || allSubs.find(function (s) { return s && String(s.id) === attemptId; });
      if (!rawSub) {
        return sendJson(res, 404, { ok: false, code: "ATTEMPT_NOT_FOUND", error: "Không tìm thấy kết quả bài làm với mã này." });
      }
      if (!entry && db.lmsAssignments) {
        const keys = Object.keys(db.lmsAssignments);
        for (let ki = 0; ki < keys.length; ki++) {
          const cand = db.lmsAssignments[keys[ki]];
          if (cand && (String(cand.id) === String(rawSub.assignmentId) || (rawSub.assignCode && String(cand.code).toUpperCase() === String(rawSub.assignCode).toUpperCase()))) {
            entry = cand;
            break;
          }
        }
      }
      const resolvedCode = (entry && entry.code) || rawSub.assignCode || code || "";

      const stuRec = entry && Array.isArray(entry.assignedStudents)
        ? entry.assignedStudents.find(function (st) { return String(st.id) === String(rawSub.studentId); })
        : null;

      // Strip sensitive fields (parentEmail, parentEmailTarget, raw pin)
      const safeSub = {
        id: rawSub.id,
        assignmentId: rawSub.assignmentId,
        assignCode: rawSub.assignCode || resolvedCode,
        quizTitle: rawSub.quizTitle || (entry && entry.title) || "",
        studentId: rawSub.studentId,
        studentName: rawSub.studentName || (stuRec && stuRec.fullName) || "",
        className: (stuRec && stuRec.className) || rawSub.className || "",
        attemptNo: rawSub.attemptNo || 1,
        score: rawSub.score10,
        score10: rawSub.score10,
        maxScore: 10,
        correctCount: rawSub.correctCount,
        totalQuestions: rawSub.totalQuestions,
        durationSec: rawSub.durationSec,
        durationSeconds: rawSub.durationSec,
        tabSwitches: rawSub.tabSwitches || 0,
        submittedAt: rawSub.submittedAt,
        teacherRemark: rawSub.teacherRemark || (entry && entry.teacherNote) || "",
        records: Array.isArray(rawSub.records) ? rawSub.records : [],
        askTeacherIds: Array.isArray(rawSub.askTeacherIds) ? rawSub.askTeacherIds : [],
        parentReportSentAt: rawSub.parentReportSentAt || rawSub.parentEmailSentAt || ""
      };

      const safeAssign = entry ? {
        id: entry.id,
        code: entry.code,
        title: entry.title,
        gradeLevel: entry.gradeLevel || "unclassified",
        subject: entry.subject || "",
        deadline: entry.deadline || "",
        revealMode: "immediate",
        teacherNote: entry.teacherNote || "",
        quizSnapshot: entry.quizSnapshot || null
      } : {
        id: rawSub.assignmentId,
        code: code,
        title: rawSub.quizTitle || "Bài tập",
        revealMode: "immediate",
        quizSnapshot: null
      };

      return sendJson(res, 200, {
        ok: true,
        student: {
          id: safeSub.studentId,
          fullName: safeSub.studentName,
          className: safeSub.className,
          school: (stuRec && stuRec.school) || ""
        },
        assignment: safeAssign,
        submission: safeSub
      });
    }

    if (p === "/api/lms/public-assignment" && method === "GET") {
      const urlObj = new URL(String(req.url || "/"), "http://localhost");
      const code = String(urlObj.searchParams.get("code") || "").trim().toUpperCase();
      const attemptId = String(urlObj.searchParams.get("attempt") || "").trim();
      if (!code) {
        return sendJson(res, 400, { ok: false, code: "MISSING_CODE", error: "Thiếu mã bài tập." });
      }
      const db = await loadDb();
      const entry = db.lmsAssignments && db.lmsAssignments[code];
      if (!entry) {
        return sendJson(res, 404, { ok: false, code: "ASSIGNMENT_NOT_FOUND", error: "Không tìm thấy bài tập với mã " + code + "." });
      }

      const now = Date.now();
      const deadMs = entry.deadline ? new Date(entry.deadline).getTime() : 0;
      const openMs = entry.openAt ? new Date(entry.openAt).getTime() : 0;
      const isClosed = Boolean(deadMs && now > deadMs);
      const isUpcoming = Boolean(openMs && now < openMs);
      const canReveal = entry.revealMode === "immediate" || isClosed;

      const matchedSub = attemptId && Array.isArray(db.lmsSubmissions)
        ? db.lmsSubmissions.find(function (s) { return s && String(s.id) === attemptId && String(s.assignmentId) === String(entry.id); })
        : null;

      if (isClosed && !matchedSub) {
        return sendJson(res, 403, {
          ok: false,
          code: "ASSIGNMENT_CLOSED",
          title: entry.title,
          deadline: entry.deadline,
          error: "Bài tập này đã đóng vào lúc " + fmtIsoDisplay(entry.deadline) + "."
        });
      }

      const rawQs = (entry.quizSnapshot && Array.isArray(entry.quizSnapshot.questions)) ? entry.quizSnapshot.questions : [];
      // Strip correct answers & explanations from public GET unless reviewing an unlocked attempt
      const safeQuestions = rawQs.map(function (q, idx) {
        const tfStmts = Array.isArray(q && q.tfStatements) ? q.tfStatements : (Array.isArray(q && q.statements) ? q.statements : []);
        return {
          id: String((q && q.id) || ("q_" + idx)),
          qType: (q && q.qType) || "MCQ",
          type: (q && q.type) || "single",
          text: (q && q.text) || "",
          options: Array.isArray(q && q.options) ? q.options : [],
          tfStatements: tfStmts,
          statements: tfStmts,
          items: Array.isArray(q && q.items) ? q.items : [],
          instruction: (q && q.instruction) || "",
          contextId: (q && q.contextId) || "",
          context: (q && q.context) || "",
          image: (q && q.image) || ""
        };
      });

      const safeStudents = (Array.isArray(entry.assignedStudents) ? entry.assignedStudents : []).map(function (st) {
        return {
          id: String(st.id || ""),
          fullName: String(st.fullName || st.name || ""),
          name: String(st.fullName || st.name || ""),
          className: String(st.className || st.grade || ""),
          grade: String(st.className || st.grade || ""),
          school: String(st.school || ""),
          requiresPin: Boolean(st.pin && String(st.pin).trim())
        };
      });

      return sendJson(res, 200, {
        ok: true,
        isUpcoming: isUpcoming,
        isClosed: isClosed,
        canReveal: canReveal,
        assignment: {
          id: entry.id,
          code: entry.code,
          title: entry.title,
          gradeLevel: entry.gradeLevel || "unclassified",
          subject: entry.subject || "",
          quizId: entry.quizId || "",
          openAt: entry.openAt || "",
          deadline: entry.deadline || "",
          maxAttempts: entry.maxAttempts,
          scorePolicy: entry.scorePolicy,
          revealMode: entry.revealMode,
          durationMinutes: entry.durationMinutes,
          teacherNote: entry.teacherNote || "",
          shuffleQ: entry.shuffleQ !== false,
          shuffleO: entry.shuffleO !== false,
          parentEmailEnabled: entry.parentEmailEnabled !== false,
          quizSnapshot: {
            id: (entry.quizSnapshot && entry.quizSnapshot.id) || entry.quizId || "",
            title: (entry.quizSnapshot && entry.quizSnapshot.title) || entry.title,
            questions: safeQuestions
          }
        },
        students: safeStudents,
        submission: matchedSub || null
      });
    }

    if (p === "/api/lms/verify-pin" && method === "POST") {
      const rl = security.checkSlidingWindowRateLimit("lms_pin", security.getClientIp(req), 12, 5 * 60 * 1000);
      if (!rl.allowed) {
        return sendJson(res, 429, { ok: false, error: "Qu\u00e1 nhi\u1ec1u l\u1ea7n th\u1eed m\u00e3 PIN. Vui l\u00f2ng ch\u1edd " + rl.retryAfterSec + " gi\u00e2y." });
      }
      const body = await readBody(req);
      const code = String(body.code || "").trim().toUpperCase();
      const studentId = String(body.studentId || "").trim();
      const pin = String(body.pin || "").trim();
      const db = await loadDb();
      const entry = db.lmsAssignments && db.lmsAssignments[code];
      if (!entry) {
        return sendJson(res, 404, { ok: false, code: "ASSIGNMENT_NOT_FOUND", error: "Không tìm thấy bài tập." });
      }
      const student = (entry.assignedStudents || []).find(function (s) { return String(s.id) === studentId; });
      if (!student) {
        return sendJson(res, 404, { ok: false, code: "STUDENT_NOT_FOUND", error: "Học sinh không có trong danh sách bài giao." });
      }
      if (student.pin && String(student.pin).trim() !== pin) {
        return sendJson(res, 401, { ok: false, code: "INVALID_PIN", error: "Mã PIN 4 số không chính xác. Vui lòng thử lại." });
      }
      const prevSubs = (Array.isArray(db.lmsSubmissions) ? db.lmsSubmissions : []).filter(function (s) {
        return s && String(s.assignmentId) === String(entry.id) && String(s.studentId) === studentId;
      });
      if (entry.maxAttempts > 0 && prevSubs.length >= entry.maxAttempts) {
        return sendJson(res, 403, {
          ok: false,
          code: "MAX_ATTEMPTS_REACHED",
          error: "Bạn đã hết lượt làm bài cho bài tập này.",
          latestSubmission: prevSubs[prevSubs.length - 1]
        });
      }
      return sendJson(res, 200, {
        ok: true,
        student: { id: student.id, fullName: student.fullName, className: student.className, school: student.school },
        attemptNo: prevSubs.length + 1,
        prevSubmissionsCount: prevSubs.length
      });
    }

    if (p === "/api/lms/public-submit" && method === "POST") {
      const body = await readBody(req);
      const code = String(body.code || "").trim().toUpperCase();
      const studentId = String(body.studentId || "").trim();
      const pin = String(body.pin || "").trim();
      const answers = (body.answers && typeof body.answers === "object") ? body.answers : {};
      const durationSec = Math.max(1, Math.round(Number(body.durationSeconds || body.durationSec || 1)));
      const tabSwitches = Math.max(0, Math.round(Number(body.tabSwitches || 0)));

      const db = await loadDb();
      const entry = db.lmsAssignments && db.lmsAssignments[code];
      if (!entry) {
        return sendJson(res, 404, { ok: false, code: "ASSIGNMENT_NOT_FOUND", error: "Không tìm thấy bài tập." });
      }
      const student = (entry.assignedStudents || []).find(function (s) { return String(s.id) === studentId; });
      if (!student) {
        return sendJson(res, 404, { ok: false, code: "STUDENT_NOT_FOUND", error: "Học sinh không có trong danh sách." });
      }
      if (student.pin && String(student.pin).trim() !== pin) {
        return sendJson(res, 401, { ok: false, code: "INVALID_PIN", error: "Mã PIN không hợp lệ." });
      }

      if (!Array.isArray(db.lmsSubmissions)) db.lmsSubmissions = [];
      const prevSubs = db.lmsSubmissions.filter(function (s) {
        return s && String(s.assignmentId) === String(entry.id) && String(s.studentId) === studentId;
      });

      const origQs = (entry.quizSnapshot && Array.isArray(entry.quizSnapshot.questions)) ? entry.quizSnapshot.questions : [];
      const letters = ["A", "B", "C", "D", "E", "F"];
      const normText = function (s) {
        return String(s || "").trim().toLowerCase()
          .replace(/[“”"'`]/g, "")
          .replace(/\s+/g, " ")
          .replace(/\s*([.,?!;:])\s*/g, "$1")
          .replace(/[.]+$/, "")
          .trim();
      };
      const normQType = function (q) {
        const raw = String((q && (q.qType || q.type)) || "MCQ").toUpperCase();
        if (raw === "TF_GROUP" || raw === "TRUE_FALSE_GROUP") return "TF_GROUP";
        if (raw === "SHORT_ANSWER" || raw === "SHORT") return "SHORT_ANSWER";
        if (raw === "ORDERING" || raw === "ORDER") return "ORDERING";
        if (raw === "ESSAY" || raw === "FREE_TEXT") return "ESSAY";
        return "MCQ";
      };
      const records = origQs.map(function (q, idx) {
        const qid = String((q && q.id) || ("q_" + idx));
        const qt = normQType(q);
        const hasOpts = Array.isArray(q && q.options) && q.options.length > 0;
        const rawAns = answers[qid];

        if (qt === "MCQ" && hasOpts) {
          const pickedRaw = Array.isArray(rawAns) ? rawAns.map(Number).filter(Number.isFinite) : [];
          const picked = pickedRaw.slice().sort(function (a, b) { return a - b; });
          const corr = (Array.isArray(q.correct) ? q.correct.map(Number).filter(Number.isFinite) : []).slice().sort(function (a, b) { return a - b; });
          const ok = corr.length > 0 && picked.length === corr.length && picked.every(function (v, i) { return v === corr[i]; });
          return { qId: qid, q: q, picked: picked, userAnswer: picked, ok: ok };
        }
        if (qt === "TF_GROUP") {
          const tfPick = (rawAns && typeof rawAns === "object" && !Array.isArray(rawAns)) ? rawAns : {};
          const stmts = (Array.isArray(q.tfStatements) && q.tfStatements.length) ? q.tfStatements : (Array.isArray(q.statements) ? q.statements : []);
          const keyMap = (q.tfAnswers && typeof q.tfAnswers === "object") ? q.tfAnswers : {};
          const keys = stmts.length ? stmts.map(function (st, si) { return (st && st.key) ? String(st.key) : String.fromCharCode(97 + si); }) : Object.keys(keyMap);
          let matched = 0;
          keys.forEach(function (k) {
            if (typeof keyMap[k] === "boolean" && tfPick[k] === keyMap[k]) matched++;
          });
          const ok = keys.length > 0 && matched === keys.length;
          return { qId: qid, q: q, picked: [], userAnswer: tfPick, ok: ok };
        }
        const userText = typeof rawAns === "string" ? rawAns.trim() : "";
        const expected = String((q && q.answerText) || (Array.isArray(q && q.acceptedAnswers) ? q.acceptedAnswers.join(" | ") : "") || "").trim();
        let ok = false;
        if (userText && expected) {
          const nu = normText(userText);
          const cands = expected.split(/\s*[|\/]\s*/).map(normText).filter(Boolean);
          ok = cands.indexOf(nu) !== -1 || normText(expected) === nu;
        }
        return { qId: qid, q: q, picked: [], userAnswer: userText, ok: ok };
      });
      const correctCount = records.filter(function (r) { return r.ok; }).length;
      const total = records.length || 1;
      const score10 = Math.round((correctCount / total) * 100) / 10;
      const nowIso = new Date().toISOString();
      const subId = "sub_" + Date.now();

      const sub = {
        id: subId,
        assignmentId: entry.id,
        assignCode: entry.code,
        quizTitle: entry.title,
        studentId: student.id,
        studentName: student.fullName,
        attemptNo: prevSubs.length + 1,
        score10: score10,
        correctCount: correctCount,
        totalQuestions: total,
        durationSec: durationSec,
        tabSwitches: tabSwitches,
        records: records,
        askTeacherIds: [],
        submittedAt: nowIso,
        parentEmailStatus: "",
        parentEmailTarget: student.parentEmail || "",
        parentEmailSentAt: "",
        parentReportSentAt: "",
        parentReadAt: ""
      };

      // Server-side automatic parent report email using server-stored parentEmail
      let emailResult = { sent: false, reason: "skipped" };
      const overrideOff = entry.parentEmailOverrides && entry.parentEmailOverrides[student.id] === false;
      if (entry.parentEmailEnabled !== false && !overrideOff && student.parentEmail) {
        const siteUrl = String(process.env.PUBLIC_SITE_URL || "https://ai-tutor.phamduchieu.site").replace(/\/+$/, "");
        const reviewUrl = siteUrl + "/creator-studio?assign=" + encodeURIComponent(entry.code) + "&attempt=" + encodeURIComponent(subId);
        const breakdown = records.map(function (r, idx) {
          const q = r.q || {};
          const qt = normQType(q);
          const opts = Array.isArray(q.options) ? q.options : [];
          const fmt = function (arr) {
            return arr.map(function (i) { return (letters[i] || String(i + 1)) + (opts[i] ? (": " + String(opts[i]).replace(/<[^>]+>/g, "").slice(0, 120)) : ""); }).join("; ");
          };
          let pickedText = "Chưa trả lời";
          let correctText = "—";
          if (qt === "MCQ" && opts.length > 0) {
            pickedText = r.picked && r.picked.length ? fmt(r.picked) : "Chưa trả lời";
            correctText = Array.isArray(q.correct) && q.correct.length ? fmt(q.correct) : "—";
          } else if (qt === "TF_GROUP") {
            const tfPick = (r.userAnswer && typeof r.userAnswer === "object" && !Array.isArray(r.userAnswer)) ? r.userAnswer : {};
            const tfKey = (q.tfAnswers && typeof q.tfAnswers === "object") ? q.tfAnswers : {};
            const pKeys = Object.keys(tfPick);
            const kKeys = Object.keys(tfKey);
            pickedText = pKeys.length ? pKeys.map(function (k) { return k + ": " + (tfPick[k] ? "Đúng" : "Sai"); }).join(" | ") : "Chưa trả lời";
            correctText = kKeys.length ? kKeys.map(function (k) { return k + ": " + (tfKey[k] ? "Đúng" : "Sai"); }).join(" | ") : "—";
          } else {
            pickedText = (typeof r.userAnswer === "string" && r.userAnswer.trim()) ? r.userAnswer.trim() : "Chưa trả lời";
            correctText = String(q.answerText || (Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.join(" | ") : "") || "—").trim() || "—";
          }
          return {
            index: idx + 1,
            prompt: String(q.text || "").replace(/<[^>]+>/g, "").trim(),
            pickedText: pickedText,
            correctText: correctText,
            ok: r.ok
          };
        });
        const tpl = buildLmsEmailTemplate({
          studentName: student.fullName,
          className: student.className || "",
          quizTitle: entry.title,
          score10: score10,
          correctCount: correctCount,
          totalQuestions: total,
          durationSec: durationSec,
          tabSwitches: tabSwitches,
          submittedAt: nowIso,
          reviewUrl: reviewUrl,
          breakdown: breakdown
        }, "result", String(body.lang || "vi"));

        const sendRes = await sendTransactionalEmail({
          to: student.parentEmail,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          eventType: "result",
          payload: { studentId: student.id, assignmentId: entry.id, submissionId: subId }
        });
        if (sendRes.ok && sendRes.messageId) {
          sub.parentEmailStatus = "sent";
          sub.parentEmailSentAt = sendRes.timestamp || nowIso;
          sub.parentReportSentAt = sendRes.timestamp || nowIso;
          sub.parentEmailMessageId = sendRes.messageId;
          emailResult = { sent: true, to: student.parentEmail, provider: sendRes.provider, messageId: sendRes.messageId };
        } else {
          sub.parentEmailStatus = "failed";
          sub.parentEmailError = sendRes.error || "Email delivery failed";
          emailResult = { sent: false, to: student.parentEmail, error: sendRes.error || "Email delivery failed" };
        }
      }

      db.lmsSubmissions.push(sub);
      if (db.lmsSubmissions.length > 2000) db.lmsSubmissions = db.lmsSubmissions.slice(-2000);
      await saveDb(db);

      const now = Date.now();
      const deadMs = entry.deadline ? new Date(entry.deadline).getTime() : 0;
      const canReveal = entry.revealMode === "immediate" || (deadMs && now > deadMs);

      return sendJson(res, 200, {
        ok: true,
        canReveal: canReveal,
        submission: sub,
        emailResult: emailResult
      });
    }

    /* ---------- Automated VietQR Orders & SePay Webhook (MB Bank 316463) ---------- */
    if (p === "/api/orders" && method === "POST") {
      const rl = security.checkSlidingWindowRateLimit("orders", security.getClientIp(req), 20, 10 * 60 * 1000);
      if (!rl.allowed) {
        return sendJson(res, 429, { ok: false, error: "Qu\u00e1 nhi\u1ec1u y\u00eau c\u1ea7u t\u1ea1o \u0111\u01a1n. Th\u1eed l\u1ea1i sau " + rl.retryAfterSec + " gi\u00e2y." });
      }
      const body = await readBody(req);
      const userEmail = String(getCallerEmail(req) || body.email || body.userEmail || "").trim().toLowerCase();
      const planId = String(body.planId || body.plan || "").trim().toLowerCase();
      if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
        return sendJson(res, 400, { ok: false, error: "Thi\u1ebfu email t\u00e0i kho\u1ea3n h\u1ee3p l\u1ec7." });
      }
      if (!PLAN_PRICES[planId]) return sendJson(res, 400, { ok: false, error: "G\u00f3i n\u00e2ng c\u1ea5p kh\u00f4ng h\u1ee3p l\u1ec7." });
      if (body.quantity !== undefined) {
        const qty = Number(body.quantity);
        if (!Number.isInteger(qty) || qty !== 1) {
          return sendJson(res, 400, { ok: false, error: "S\u1ed1 l\u01b0\u1ee3ng \u0111\u01a1n h\u00e0ng kh\u00f4ng h\u1ee3p l\u1ec7 (ch\u1ec9 h\u1ed7 tr\u1ee3 1 g\u00f3i/l\u1ea7n)." });
        }
      }

      const db = await loadDb();
      if (!db.sepayOrders || typeof db.sepayOrders !== "object") db.sepayOrders = {};

      const basePrice = PLAN_PRICES[planId];
      let discountPct = 0;
      const voucherCode = String(body.voucherCode || "").trim().toUpperCase();
      if (voucherCode && Array.isArray(db.vouchers)) {
        const v = db.vouchers.find(function (x) { return x && String(x.code || "").toUpperCase() === voucherCode; });
        if (!v || v.active === false) {
          return sendJson(res, 400, { ok: false, error: "M\u00e3 gi\u1ea3m gi\u00e1 kh\u00f4ng t\u1ed3n t\u1ea1i ho\u1eb7c \u0111\u00e3 ng\u1eebng ho\u1ea1t \u0111\u1ed9ng." });
        }
        if (v.expiresAt && Date.parse(v.expiresAt) <= Date.now()) {
          return sendJson(res, 400, { ok: false, error: "M\u00e3 gi\u1ea3m gi\u00e1 \u0111\u00e3 h\u1ebft h\u1ea1n." });
        }
        if (Number(v.maxUses) > 0 && Number(v.usedCount || 0) >= Number(v.maxUses)) {
          return sendJson(res, 400, { ok: false, error: "M\u00e3 gi\u1ea3m gi\u00e1 \u0111\u00e3 h\u1ebft l\u01b0\u1ee3t s\u1eed d\u1ee5ng." });
        }
        if (v.usedBy && v.usedBy[userEmail]) {
          return sendJson(res, 409, { ok: false, error: "T\u00e0i kho\u1ea3n c\u1ee7a b\u1ea1n \u0111\u00e3 s\u1eed d\u1ee5ng m\u00e3 gi\u1ea3m gi\u00e1 n\u00e0y." });
        }
        if (Number(v.discountPercent) > 0) {
          discountPct = Math.min(100, Math.max(0, Number(v.discountPercent)));
        }
      }
      const expectedAmount = Math.max(0, Math.round(basePrice * (100 - discountPct) / 100));

      let orderCode = genOrderCode();
      while (db.sepayOrders[orderCode]) orderCode = genOrderCode();

      const order = {
        orderCode: orderCode,
        userId: userEmail,
        userEmail: userEmail,
        userName: String(body.userName || "").trim().slice(0, 120),
        planId: planId,
        baseAmount: basePrice,
        discountPercent: discountPct,
        voucherCode: voucherCode,
        expectedAmount: expectedAmount,
        paidAmount: 0,
        status: "PENDING",
        sepayTransactionId: "",
        createdAt: new Date().toISOString(),
        paidAt: ""
      };
      db.sepayOrders[orderCode] = order;
      await saveDb(db);

      return sendJson(res, 201, {
        ok: true,
        order: {
          orderCode: order.orderCode,
          planId: order.planId,
          expectedAmount: order.expectedAmount,
          status: order.status,
          createdAt: order.createdAt
        },
        qrUrl: buildDynamicVietQrUrl(expectedAmount, orderCode)
      });
    }

    if (p === "/api/orders/status" && method === "GET") {
      const urlObj = new URL(String(req.url || "/"), "http://localhost");
      const code = String(urlObj.searchParams.get("code") || "").trim().toUpperCase();
      if (!code || !/^AITUTOR[A-Z0-9]+$/.test(code)) {
        return sendJson(res, 400, { ok: false, error: "M\u00e3 \u0111\u01a1n h\u00e0ng kh\u00f4ng h\u1ee3p l\u1ec7." });
      }
      const db = await loadDb();
      const order = db.sepayOrders && db.sepayOrders[code];
      if (!order) {
        return sendJson(res, 404, { ok: false, code: "ORDER_NOT_FOUND", error: "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n h\u00e0ng." });
      }
      let callerEmail = getCallerEmail(req);
      let callerIsVerifiedAdmin = false;
      try {
        const adm = await verifyAdminRequest(req);
        if (adm && adm.email) {
          callerIsVerifiedAdmin = true;
          if (!callerEmail) callerEmail = String(adm.email).toLowerCase();
        }
      } catch (e) { /* non-admin caller */ }
      if (!callerIsVerifiedAdmin && (!callerEmail || callerEmail !== String(order.userEmail || "").toLowerCase())) {
        return sendJson(res, 403, { ok: false, error: "Forbidden: Kh\u00f4ng c\u00f3 quy\u1ec1n xem tr\u1ea1ng th\u00e1i \u0111\u01a1n h\u00e0ng n\u00e0y." });
      }
      const sub = (db.subscriptions && db.subscriptions[order.userEmail]) || null;
      return sendJson(res, 200, {
        ok: true,
        orderCode: order.orderCode,
        planId: order.planId,
        expectedAmount: order.expectedAmount,
        paidAmount: order.paidAmount || 0,
        status: order.status,
        paidAt: order.paidAt || "",
        expiresAt: order.status === "PAID" && sub ? sub.expires : null,
        subscription: order.status === "PAID" && sub ? { tier: sub.tier, expires: sub.expires } : null
      });
    }

    if (p === "/api/webhooks/sepay" && method === "POST") {
      const expectedKey = String(process.env.SEPAY_WEBHOOK_API_KEY || "").trim();
      if (!expectedKey) {
        return sendJson(res, 500, { success: false, error: "Server misconfiguration: SEPAY_WEBHOOK_API_KEY is not set" });
      }
      const authHeader = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || "").trim();
      const matchAuth = authHeader.match(/^Apikey\s+(.+)$/i);
      const providedKey = matchAuth ? matchAuth[1].trim() : "";
      if (!providedKey || !security.timingSafeEqualStr(providedKey, expectedKey)) {
        return sendJson(res, 401, { success: false, error: "Unauthorized SePay webhook Apikey" });
      }

      const payload = await readBody(req);
      const transferType = String((payload && payload.transferType) || "").trim().toLowerCase();
      const accountNumber = String((payload && payload.accountNumber) || "").trim();
      if (transferType !== "in" || accountNumber !== SEPAY_ACCOUNT_NO) {
        return sendJson(res, 200, { success: true, ignored: true });
      }

      const content = String((payload && payload.content) || "");
      const codeMatch = content.match(/AITUTOR[A-Z0-9]+/i);
      if (!codeMatch) {
        return sendJson(res, 200, { success: true, ignored: true, reason: "no_order_code" });
      }
      const orderCode = codeMatch[0].toUpperCase();
      const transferAmount = Number((payload && payload.transferAmount) || 0);
      const txId = String((payload && payload.id) || "");

      const db = await loadDb();
      if (!db.sepayOrders || typeof db.sepayOrders !== "object") db.sepayOrders = {};
      const order = db.sepayOrders[orderCode];
      if (!order) {
        return sendJson(res, 200, { success: true, idempotent: true, reason: "order_not_found" });
      }
      if (order.status === "PAID") {
        return sendJson(res, 200, { success: true, idempotent: true, reason: "already_paid" });
      }

      if (transferAmount < Number(order.expectedAmount || 0)) {
        order.status = "UNDERPAID";
        order.paidAmount = transferAmount;
        order.sepayTransactionId = txId;
        order.updatedAt = new Date().toISOString();
        await saveDb(db);
        return sendJson(res, 200, { success: true, status: "UNDERPAID" });
      }

      // Atomic order completion + 1-year membership tier activation
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      order.status = "PAID";
      order.paidAmount = transferAmount;
      order.sepayTransactionId = txId;
      order.paidAt = nowIso;

      if (!db.subscriptions || typeof db.subscriptions !== "object") db.subscriptions = {};
      if (!db.revokedSubscriptions || typeof db.revokedSubscriptions !== "object") db.revokedSubscriptions = {};
      const userEmail = String(order.userEmail || order.userId || "").toLowerCase();
      if (userEmail) {
        delete db.revokedSubscriptions[userEmail];
        db.subscriptions[userEmail] = {
          tier: order.planId,
          since: now,
          expires: now + 365 * DAY_MS,
          orderCode: order.orderCode,
          sepayTransactionId: txId,
          autoApproved: true
        };
        if (order.voucherCode && Array.isArray(db.vouchers)) {
          const v = db.vouchers.find(function (x) { return x && String(x.code || "").toUpperCase() === String(order.voucherCode).toUpperCase(); });
          if (v) {
            if (!v.usedBy || typeof v.usedBy !== "object") v.usedBy = {};
            if (!v.usedBy[userEmail]) {
              v.usedBy[userEmail] = nowIso;
              v.usedCount = Number(v.usedCount || 0) + 1;
            }
          }
        }
      }
      if (Array.isArray(db.payment_requests)) {
        db.payment_requests.forEach(function (pr) {
          if (pr && pr.status === "pending" && String(pr.memo || "").toUpperCase().indexOf(orderCode) !== -1) {
            pr.status = "approved";
            pr.reviewedAt = nowIso;
            pr.reviewedBy = "SePay Webhook";
          }
        });
      }
      await saveDb(db);
      return sendJson(res, 200, { success: true, orderCode: orderCode, tier: order.planId });
    }

    /* ---------- LMS Email Health Diagnostic (No Secrets Exposed) ---------- */
    if (p === "/api/lms/email-health" && method === "GET") {
      const health = getEmailProviderHealth();
      return sendJson(res, 200, {
        ok: true,
        configured: health.configured,
        provider: health.provider,
        fromAddress: health.fromAddress
      });
    }

    /* ---------- LMS Parent Reminder & Report Email Dispatch ---------- */
    if ((p === "/api/lms/send-email" || p === "/api/lms/email") && method === "POST") {
      const body = await readBody(req);
      const emailType = String(body.type || "deadline_reminder").trim();
      const lang = String(body.lang || "vi").trim().toLowerCase();
      const health = getEmailProviderHealth();

      if (!health.configured) {
        return sendJson(res, 503, {
          ok: false,
          provider: "none",
          sent: 0,
          failed: 0,
          code: "EMAIL_PROVIDER_NOT_CONFIGURED",
          requiredEnv: REQUIRED_EMAIL_ENV_KEYS,
          error: "Chưa cấu hình dịch vụ gửi email trên máy chủ (Vercel). Vui lòng thiết lập RESEND_API_KEY + EMAIL_FROM hoặc SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS trong Vercel Environment Variables."
        });
      }

      const items = Array.isArray(body.recipients) && body.recipients.length
        ? body.recipients
        : [body];

      const results = [];
      let sentCount = 0;
      let failedCount = 0;
      let usedProvider = health.provider;

      for (let i = 0; i < items.length; i++) {
        const it = items[i] || {};
        const resolvedTo = it.to || it.parentEmail || it.parent_email || it.email || body.to || body.parentEmail || body.parent_email || "";
        const merged = Object.assign({
          quizTitle: body.quizTitle || "",
          deadline: body.deadline || "",
          assignmentUrl: body.assignmentUrl || "",
          teacherNote: body.teacherNote || "",
          className: body.className || ""
        }, it, { to: resolvedTo });
        const tpl = buildLmsEmailTemplate(merged, emailType, lang);
        const sendRes = await sendTransactionalEmail({
          to: merged.to,
          subject: merged.subject || tpl.subject,
          html: merged.html || tpl.html,
          text: merged.text || tpl.text,
          eventType: emailType,
          payload: { studentId: merged.studentId || "", assignmentId: body.assignmentId || merged.assignmentId || "" }
        });
        if (sendRes.ok && sendRes.messageId) {
          sentCount++;
          if (sendRes.provider) usedProvider = sendRes.provider;
          results.push({
            studentId: merged.studentId || "",
            studentName: merged.studentName || "",
            to: sendRes.to.join(", "),
            status: "sent",
            provider: sendRes.provider,
            messageId: sendRes.messageId,
            timestamp: sendRes.timestamp
          });
        } else {
          failedCount++;
          results.push({
            studentId: merged.studentId || "",
            studentName: merged.studentName || "",
            to: String(merged.to || ""),
            status: "failed",
            code: sendRes.code || "EMAIL_PROVIDER_ERROR",
            error: sendRes.error || "Delivery failed",
            timestamp: new Date().toISOString()
          });
        }
      }

      const allFailed = sentCount === 0 && failedCount > 0;
      const firstErr = results.find(function (r) { return r.status === "failed"; });
      const statusCode = allFailed
        ? (firstErr && firstErr.code === "INVALID_RECIPIENT_EMAIL" ? 400 : 502)
        : 200;

      return sendJson(res, statusCode, {
        ok: !allFailed,
        provider: usedProvider,
        sent: sentCount,
        failed: failedCount,
        sentCount: sentCount,
        failedCount: failedCount,
        code: allFailed ? ((firstErr && firstErr.code) || "EMAIL_DELIVERY_FAILED") : "OK",
        results: results,
        error: allFailed && firstErr ? firstErr.error : undefined
      });
    }

    /* ---------- Admin Routes ---------- */
    if (p.startsWith("/api/admin/")) {
      try {
        await verifyAdminRequest(req);
      } catch (authErr) {
        return sendJson(res, authErr.status || 403, { error: authErr.message || "Forbidden: Admin authentication required." });
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
        const nowIso = new Date().toISOString();
        const reason = String((body && body.rejectReason) || "Y\u00eau c\u1ea7u b\u1ecb t\u1eeb ch\u1ed1i").trim();
        rec.status = "rejected";
        rec.reviewedAt = nowIso;
        rec.reviewedBy = ADMIN_EMAIL;
        rec.rejectReason = reason;
        // Also mark any linked pending SePay order as REJECTED (and NEVER grant/extend tier)
        if (db.sepayOrders && typeof db.sepayOrders === "object") {
          const recEmail = String(rec.userEmail || "").trim().toLowerCase();
          const recMemo = String(rec.memo || "").toUpperCase();
          Object.keys(db.sepayOrders).forEach(function (code) {
            const ord = db.sepayOrders[code];
            if (!ord || ord.status === "PAID") return;
            const memoMatch = recMemo && recMemo.indexOf(String(code).toUpperCase()) !== -1;
            const userPlanMatch = recEmail && String(ord.userEmail || "").toLowerCase() === recEmail && String(ord.planId || "").toLowerCase() === String(rec.plan || "").toLowerCase() && (ord.status === "PENDING" || ord.status === "UNDERPAID");
            if (memoMatch || userPlanMatch) {
              ord.status = "REJECTED";
              ord.rejectReason = reason;
              ord.updatedAt = nowIso;
            }
          });
        }
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
          bankName: String((body && body.bankName) || "MB Bank").trim(),
          bankId: String((body && body.bankId) || SEPAY_BANK_ID).trim().toUpperCase(),
          accountNo: String((body && body.accountNo) || SEPAY_ACCOUNT_NO).trim(),
          accountName: String((body && body.accountName) || SEPAY_ACCOUNT_NAME).trim().toUpperCase()
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
