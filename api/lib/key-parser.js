/* ============================================================
   AI Tutor - Smart Multi-Account Key Importer Parser
   Two-step parser (Preview -> Confirm Import).
   NEVER logs pasted raw text. Cross-checks line label with prefix
   (checking sk-or- BEFORE sk-) and detects duplicates via HMAC.
   ============================================================ */
const { maskApiKey, hmacKeyHash, isEncryptionConfigured } = require("./crypto");

function detectProviderFromLabel(labelRaw) {
  const s = String(labelRaw || "").toLowerCase();
  if (s.indexOf("gemini") !== -1 || s.indexOf("google ai studio") !== -1 || s.indexOf("aistudio") !== -1) return "gemini";
  if (s.indexOf("groq") !== -1) return "groq";
  if (s.indexOf("openrouter") !== -1) return "openrouter";
  if (s.indexOf("deepseek") !== -1) return "deepseek";
  if (s.indexOf("openai") !== -1 || s.indexOf("chatgpt") !== -1) return "openai";
  return "";
}

function detectProviderByPrefix(rawKey) {
  const k = String(rawKey || "").trim();
  // IMPORTANT: Check sk-or- BEFORE sk-!
  if (k.indexOf("AIza") === 0) return "gemini";
  if (k.indexOf("gsk_") === 0) return "groq";
  if (k.indexOf("sk-or-") === 0) return "openrouter";
  if (k.indexOf("sk-proj-") === 0) return "openai";
  if (k.indexOf("sk-") === 0) return "sk_ambiguous"; // OpenAI or DeepSeek per label
  return "unknown";
}

function sanitizeAccountLabel(str) {
  return String(str || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>`"'\\]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractShortAccountLabel(headerLine) {
  let clean = sanitizeAccountLabel(headerLine)
    .replace(/^\s*\d{1,3}\s*[.)]\s*/, "")
    .trim();
  const emailMatch = clean.match(/[^\s@<>;:,()]+@[^\s@<>;:,()]+\.[^\s@<>;:,()]+/);
  if (emailMatch) {
    return sanitizeAccountLabel(emailMatch[0]).toLowerCase().slice(0, 80);
  }
  // Strip any accidental MSSV / student IDs (6-12 digits) if no email is present
  clean = clean
    .replace(/\b(?:mssv|msv|id)\s*[:\-]?\s*\d{4,12}\b/gi, "")
    .replace(/\b\d{6,12}\b/g, "")
    .split(/[\u2014\u2013|]/)[0]
    .replace(/\s+/g, " ")
    .trim();
  return (clean || "Account").slice(0, 48);
}

function computeSafeHash(provider, keyValue) {
  if (isEncryptionConfigured()) {
    return hmacKeyHash(provider, keyValue);
  }
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(provider + ":" + keyValue).digest("hex");
}

function parseAccountGroupedText(rawText, existingHashesSet) {
  const lines = String(rawText || "").replace(/\r\n/g, "\n").split("\n");
  const knownHashes = existingHashesSet instanceof Set ? existingHashesSet : new Set();
  const batchHashes = new Set();

  let currentAccount = "Default Account";
  let currentLineNum = 0;

  const validEntries = [];
  const skipped = [];
  const duplicates = [];
  const mismatches = [];
  const summaryByProvider = { gemini: 0, groq: 0, openrouter: 0, openai: 0, deepseek: 0 };
  const summaryByAccount = {};

  const accountHeaderRe = /^\s*\d{1,3}\s*[.)]\s+(.+)$/;
  const keyLineRe = /^\s*(?:[-*\u2022\u2014\u2013]+\s*)?(.+?)\s*[:\u2014\u2013-]\s*(.*)$/;

  lines.forEach(function (rawLine, idx) {
    currentLineNum = idx + 1;
    const trimmed = String(rawLine || "").trim();
    if (!trimmed) return; // Safely ignore empty lines

    // Check if numbered account header like: "1. Pham Duc Hieu — email@gmail.com"
    const mAcc = trimmed.match(accountHeaderRe);
    if (mAcc) {
      const possibleProv = detectProviderFromLabel(trimmed);
      if (!possibleProv || trimmed.indexOf("@") !== -1 || /[\u2014\u2013]/.test(trimmed)) {
        currentAccount = extractShortAccountLabel(mAcc[1]);
        return;
      }
    }

    // Also allow plain header containing @ without leading bullet "- " and without provider name
    if (!/^[-*\u2022]/.test(trimmed) && trimmed.indexOf("@") !== -1 && !detectProviderFromLabel(trimmed)) {
      currentAccount = extractShortAccountLabel(trimmed);
      return;
    }

    // Check provider key line
    const colonIdx = trimmed.indexOf(":");
    let labelPart = "";
    let valPart = "";
    if (colonIdx !== -1) {
      labelPart = trimmed.slice(0, colonIdx).replace(/^[-*\u2022\s]+/, "").trim();
      valPart = trimmed.slice(colonIdx + 1).trim();
    } else {
      const mDash = trimmed.match(keyLineRe);
      if (mDash) {
        labelPart = mDash[1].trim();
        valPart = mDash[2].trim();
      } else {
        skipped.push({ line: currentLineNum, accountLabel: currentAccount, reason: "Không nhận diện được định dạng nhãn:giá trị" });
        return;
      }
    }

    const provider = detectProviderFromLabel(labelPart);
    if (!provider) {
      if (trimmed.indexOf("@") !== -1) {
        currentAccount = extractShortAccountLabel(trimmed);
        return;
      }
      skipped.push({ line: currentLineNum, accountLabel: currentAccount, reason: "Không xác định được hãng AI từ nhãn \"" + labelPart.slice(0, 40) + "\"" });
      return;
    }

    // Normalize placeholder/empty values safely
    const keyVal = valPart.replace(/^<|>$/g, "").trim();
    if (!keyVal || /^(?:empty|none|null|n\/a|tr\u1ed1ng|ch\u01b0a c\u00f3|ch\u01b0a t\u1ea1o|chua tao|chua co|-+|\u2014+|\u2013+)$/i.test(keyVal)) {
      skipped.push({ line: currentLineNum, accountLabel: currentAccount, provider: provider, label: labelPart, reason: "Gi\u00e1 tr\u1ecb tr\u1ed1ng (b\u1ecf qua)" });
      return;
    }

    if (/\s/.test(keyVal) || keyVal.length < 16) {
      skipped.push({ line: currentLineNum, accountLabel: currentAccount, provider: provider, label: labelPart, maskedKey: maskApiKey(keyVal), reason: "Chu\u1ed7i Key qu\u00e1 ng\u1eafn ho\u1eb7c ch\u1ee9a kho\u1ea3ng tr\u1eafng" });
      return;
    }

    // Cross-check label provider against actual key prefix (checking sk-or- BEFORE sk-)
    const detectedByPrefix = detectProviderByPrefix(keyVal);
    let mismatchMsg = "";
    if (provider === "gemini" && detectedByPrefix !== "gemini") {
      mismatchMsg = "Nhãn là Gemini nhưng tiền tố Key là \"" + keyVal.slice(0, 6) + "...\" (chuẩn AIza...)";
    } else if (provider === "groq" && detectedByPrefix !== "groq") {
      mismatchMsg = "Nhãn là Groq nhưng tiền tố Key là \"" + keyVal.slice(0, 6) + "...\" (chuẩn gsk_...)";
    } else if (provider === "openrouter" && detectedByPrefix !== "openrouter") {
      mismatchMsg = "Nhãn là OpenRouter nhưng tiền tố Key là \"" + keyVal.slice(0, 7) + "...\" (chuẩn sk-or-...)";
    } else if (provider === "openai" && detectedByPrefix !== "openai" && detectedByPrefix !== "sk_ambiguous") {
      mismatchMsg = "Nhãn là OpenAI nhưng tiền tố Key là \"" + keyVal.slice(0, 7) + "...\" (chuẩn sk-..., không phải " + detectedByPrefix + ")";
    } else if (provider === "deepseek" && detectedByPrefix !== "sk_ambiguous") {
      mismatchMsg = "Nhãn là DeepSeek nhưng tiền tố Key là \"" + keyVal.slice(0, 7) + "...\" (chuẩn sk-...)";
    }

    if (mismatchMsg) {
      mismatches.push({
        line: currentLineNum,
        accountLabel: currentAccount,
        provider: provider,
        label: labelPart,
        detectedPrefixProvider: detectedByPrefix,
        maskedKey: maskApiKey(keyVal),
        reason: mismatchMsg
      });
      return;
    }

    const keyHash = computeSafeHash(provider, keyVal);
    if (knownHashes.has(keyHash) || batchHashes.has(keyHash)) {
      duplicates.push({
        line: currentLineNum,
        accountLabel: currentAccount,
        provider: provider,
        maskedKey: maskApiKey(keyVal),
        reason: "Tr\u00f9ng l\u1eb7p (Key \u0111\u00e3 t\u1ed3n t\u1ea1i trong H\u1ec7 th\u1ed1ng ho\u1eb7c l\u1eb7p l\u1ea1i trong danh s\u00e1ch d\u00e1n)"
      });
      return;
    }
    batchHashes.add(keyHash);

    summaryByProvider[provider] = (summaryByProvider[provider] || 0) + 1;
    summaryByAccount[currentAccount] = (summaryByAccount[currentAccount] || 0) + 1;

    validEntries.push({
      line: currentLineNum,
      accountLabel: currentAccount,
      provider: provider,
      rawKey: keyVal,
      maskedKey: maskApiKey(keyVal),
      keyHash: keyHash
    });
  });

  const summaryByAccountList = Object.keys(summaryByAccount).map(function (acc) {
    return { accountLabel: acc, count: summaryByAccount[acc] };
  });

  return {
    validEntries: validEntries,
    previewItems: validEntries.map(function (item) {
      return {
        line: item.line,
        accountLabel: item.accountLabel,
        provider: item.provider,
        maskedKey: item.maskedKey
      };
    }),
    skipped: skipped,
    duplicates: duplicates,
    mismatches: mismatches,
    summaryByProvider: summaryByProvider,
    summaryByAccount: summaryByAccountList,
    summaryByAccountMap: summaryByAccount,
    totalValid: validEntries.length
  };
}

module.exports = {
  parseAccountGroupedText: parseAccountGroupedText,
  detectProviderFromLabel: detectProviderFromLabel,
  detectProviderByPrefix: detectProviderByPrefix,
  extractShortAccountLabel: extractShortAccountLabel,
  computeSafeHash: computeSafeHash
};
