/* ============================================================
   AI Tutor - Smart Multi-Account Key Importer Parser
   Two-step parser (Preview -> Confirm Import).
   NO string pattern or prefix validation on API keys:
     - Assigns provider strictly from the user-entered label.
     - Accepts any non-empty trimmed key string (e.g. AQ.Ab8..., AIza..., custom keys).
     - Cleanly skips blank/empty provider lines without errors.
     - Detects duplicates via HMAC-SHA256.
     - NEVER logs pasted raw text.
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
    .replace(/^\s*(?:account|t\u00e0i\s*kho\u1ea3n)\s*[:\u2014\u2013-]\s*/i, "")
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
  const summaryByProvider = { gemini: 0, groq: 0, openrouter: 0, openai: 0, deepseek: 0 };
  const summaryByAccount = {};

  const explicitAccountRe = /^\s*(?:[-*\u2022]+\s*)?(?:account|t\u00e0i\s*kho\u1ea3n)\s*[:\u2014\u2013-]\s*(.+)$/i;
  const numberedAccountRe = /^\s*\d{1,3}\s*[.)]\s+(.+)$/;
  const dashLineRe = /^\s*(?:[-*\u2022\u2014\u2013]+\s*)?(.+?)\s*[\u2014\u2013-]\s*(.*)$/;

  lines.forEach(function (rawLine, idx) {
    currentLineNum = idx + 1;
    const trimmed = String(rawLine || "").trim();
    if (!trimmed) return; // Safely ignore blank lines

    // 1. Explicit "Account: <USER_EMAIL>" header (primary supported format)
    const mExplicitAcc = trimmed.match(explicitAccountRe);
    if (mExplicitAcc) {
      currentAccount = extractShortAccountLabel(mExplicitAcc[1]);
      return;
    }

    // 2. Numbered account header like "1. Name — email@gmail.com" (backward-compatible)
    const mNumAcc = trimmed.match(numberedAccountRe);
    if (mNumAcc) {
      const possibleProv = detectProviderFromLabel(trimmed);
      if (!possibleProv || trimmed.indexOf("@") !== -1 || /[\u2014\u2013]/.test(trimmed)) {
        currentAccount = extractShortAccountLabel(mNumAcc[1]);
        return;
      }
    }

    // 3. Plain header line containing an email without provider label
    if (!/^[-*\u2022]/.test(trimmed) && trimmed.indexOf("@") !== -1 && !detectProviderFromLabel(trimmed)) {
      currentAccount = extractShortAccountLabel(trimmed);
      return;
    }

    // 4. Parse "Provider Label: <API_KEY>" strictly at the FIRST colon so exact key value is preserved
    const colonIdx = trimmed.indexOf(":");
    let labelPart = "";
    let valPart = "";
    if (colonIdx !== -1) {
      labelPart = trimmed.slice(0, colonIdx).replace(/^[-*\u2022\s]+/, "").trim();
      valPart = trimmed.slice(colonIdx + 1).trim();
    } else {
      const mDash = trimmed.match(dashLineRe);
      if (mDash) {
        labelPart = mDash[1].trim();
        valPart = mDash[2].trim();
      } else {
        skipped.push({
          line: currentLineNum,
          accountLabel: currentAccount,
          label: trimmed.slice(0, 40),
          reason: "Kh\u00f4ng ph\u1ea3i d\u00f2ng nh\u00e3n nh\u00e0 cung c\u1ea5p (b\u1ecf qua)"
        });
        return;
      }
    }

    const provider = detectProviderFromLabel(labelPart);
    if (!provider) {
      if (trimmed.indexOf("@") !== -1) {
        currentAccount = extractShortAccountLabel(trimmed);
        return;
      }
      skipped.push({
        line: currentLineNum,
        accountLabel: currentAccount,
        label: labelPart.slice(0, 40),
        reason: "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh \u0111\u01b0\u1ee3c h\u00e3ng AI t\u1eeb nh\u00e3n \"" + labelPart.slice(0, 40) + "\""
      });
      return;
    }

    // Trim leading/trailing whitespace only; ignore blank/omitted slots cleanly without error
    const keyVal = valPart.trim();
    if (!keyVal || /^(?:empty|none|null|n\/a|tr\u1ed1ng|ch\u01b0a c\u00f3|ch\u01b0a t\u1ea1o|chua tao|chua co|-+|\u2014+|\u2013+)$/i.test(keyVal)) {
      skipped.push({
        line: currentLineNum,
        accountLabel: currentAccount,
        provider: provider,
        label: labelPart,
        reason: "D\u00f2ng tr\u1ed1ng (b\u1ecf qua)"
      });
      return;
    }

    // NO format or prefix validation: accept ANY non-empty API key string strictly under the label's provider.
    // Live validity is determined exclusively via live API health check against the provider's endpoint.
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
    mismatches: [],
    summaryByProvider: summaryByProvider,
    summaryByAccount: summaryByAccountList,
    summaryByAccountMap: summaryByAccount,
    totalValid: validEntries.length
  };
}

module.exports = {
  parseAccountGroupedText: parseAccountGroupedText,
  detectProviderFromLabel: detectProviderFromLabel,
  extractShortAccountLabel: extractShortAccountLabel,
  computeSafeHash: computeSafeHash
};
