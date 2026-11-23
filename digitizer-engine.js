/* ============================================================
   AI Tutor – Educational Digitizer Engine (digitizer-engine.js)
   Shared UMD module (Browser window.AIDigitizer + Node module.exports)
   Provides:
     1) Exact MASTER_SYSTEM_PROMPT
     2) Client-Side PDF Header/Footer/Watermark Frequency Deduplicator
     3) Smart Section Chunking (<=4 pages single request, >4 pages 3-4 page chunks
        with 150-char [PREVIOUS_CONTEXT_ONLY_DO_NOT_REPEAT] overlap & concurrency=3)
     4) Incremental Markdown State-Machine Parser (YAML, :::instruction, :::context,
        5 question types: MCQ, TF_GROUP, SHORT_ANSWER, ORDERING, ESSAY + STUDY_NOTE)
     5) Backward-compatible loader for legacy JSON/Markdown exam formats
     6) 2025 TF_GROUP scoring (0.1 / 0.25 / 0.5 / 1.0) & smart answer comparison
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AIDigitizer = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MASTER_SYSTEM_PROMPT = [
    "# ROLE",
    "",
    "You are a High-Precision Educational Content Digitizer. Convert 100% of the input document into structured Markdown (`.md`) for automated frontend parsing.",
    "",
    "# CORE RULES",
    "",
    "## 1. Accuracy & Completeness",
    "",
    "- Extract every question, instruction, table, and passage verbatim.",
    "- Never summarize, truncate with `...`, or fabricate content.",
    "- Follow multi-column order: left-to-right, top-to-bottom.",
    "- Merge split questions and passages across page breaks.",
    "- Remove OCR noise, watermarks, ads, page numbers, and repeating headers/footers without deleting real content.",
    "- Fix only obvious OCR errors; preserve intentional grammar/spelling errors in Error Identification exercises.",
    "- Mark illegible content as `[CHECK: uncertain_text]`.",
    "",
    "## 2. Instructions & Shared Context",
    "",
    "- Every question group starts with `:::instruction` containing its exact instruction.",
    "- If no explicit instruction exists, infer a concise `[Y\u00eau c\u1ea7u: ...]` only when unambiguous.",
    "- Put shared Reading passages, Cloze texts, Literature excerpts, tables, and transcripts in `:::context`.",
    "- Assign unique IDs such as `CTX_1` and correct question ranges.",
    "- Place context before its first question.",
    "- Tag every child question with `[context: CTX_1]`.",
    "- Format Cloze blanks as `**(1) _____**`.",
    "",
    "## 3. Multi-Subject Formatting",
    "",
    "- Math/Science: use LaTeX (`$...$` inline, `$$...$$` block).",
    "- Languages: preserve underlined text using `<u>text</u>` and bold using `**text**`.",
    "- Preserve Furigana/Pinyin when present.",
    "- Use Markdown tables and fenced code blocks (use `~~~~lang` for inner code blocks so the outer ` ```markdown ` fence never breaks).",
    "- Describe diagrams as `[IMAGE: concise visual description]`.",
    "",
    "Supported types:",
    "",
    "`MCQ`, `TF_GROUP`, `SHORT_ANSWER`, `ORDERING`, `ESSAY`.",
    "",
    "## 4. Answers & Document Modes",
    "",
    "- Map answer keys and explanations directly from the source.",
    "- If no answer key exists, leave it empty unless `[AUTO_SOLVE=TRUE]`.",
    "- Never invent answer keys.",
    "- Split multi-exam files using `# \u0110\u1ec0 S\u1ed0 X`; reset numbering to `C\u00e2u 1`.",
    "- For notes without questions, use structured headings, bullets, and LaTeX; set `mode: \"STUDY_NOTE\"`.",
    "- For empty, corrupt, or non-educational input, output only:",
    "",
    "`ERROR_INVALID_CONTENT: <concise reason>`",
    "",
    "## 5. Output Packaging, `.md` File Export & Discipline",
    "",
    "- **Downloadable `.md` File First (If Supported):** If your environment supports creating or exporting downloadable files (e.g., Python/Code Interpreter file creation or Canvas/Artifact export), save the complete standardized output as a downloadable `.md` file named `<sanitized_title>.md` AND also provide the raw Markdown code block below.",
    "- **Mandatory Single Raw ` ```markdown ` Code Block Wrapper:** ALWAYS wrap the entire standardized output inside ONE single fenced code block starting with ` ```markdown ` and ending with ` ``` ` (escape any inner code blocks with `~~~~` so the outer block never breaks). NEVER output un-fenced Markdown directly into the chat stream, because chat interfaces visually render un-fenced Markdown and strip raw symbols (`###`, `>`, `**`) when copied.",
    "- No greeting, introduction, commentary, or conclusion.",
    "- Do not repeat the title unnecessarily.",
    "",
    "## 6. OUTPUT TEMPLATE \u2013 STRICT PARSER CONTRACT",
    "",
    "Replace all placeholders with actual extracted content. Never output the placeholders themselves.",
    "",
    "---",
    "title: \"<Document/Exam Title>\"",
    "subject: \"<Subject>\"",
    "mode: \"<EXAM | STUDY_NOTE>\"",
    "total_questions: <Number of questions, 0 if STUDY_NOTE>",
    "duration_minutes: <Estimated or stated duration>",
    "---",
    "",
    "## <Section Name if applicable>",
    "",
    ":::instruction",
    "**<Verbatim instruction for the question group>**",
    ":::",
    "",
    ":::context [id=\"CTX_1\" questions=\"1-5\"]",
    "<100% verbatim shared reading passage / data table / transcript>",
    ":::",
    "",
    "### C\u00e2u 1 `[type: MCQ]` `[context: CTX_1]` `[level: Nh\u1eadn bi\u1ebft|Th\u00f4ng hi\u1ec3u|V\u1eadn d\u1ee5ng|V\u1eadn d\u1ee5ng cao]` `[tag: #Topic]`",
    "",
    "<Question stem>",
    "",
    "- **A.** <Option A>",
    "- **B.** <Option B>",
    "- **C.** <Option C>",
    "- **D.** <Option D>",
    "",
    "> **\u0110\u00e1p \u00e1n:** <Answer key if present in source>",
    "",
    "### C\u00e2u 2 `[type: TF_GROUP]` `[level: Th\u00f4ng hi\u1ec3u]` `[tag: #Topic]`",
    "",
    "<Main question stem>",
    "",
    "- **a)** <Statement a>",
    "- **b)** <Statement b>",
    "- **c)** <Statement c>",
    "- **d)** <Statement d>",
    "",
    "> **\u0110\u00e1p \u00e1n:** <a: \u0110/S | b: \u0110/S | c: \u0110/S | d: \u0110/S>",
    "",
    "### C\u00e2u 3 `[type: SHORT_ANSWER]` `[level: V\u1eadn d\u1ee5ng]` `[tag: #Topic]`",
    "",
    "<Short answer / sentence transformation prompt>",
    "",
    "> **\u0110\u00e1p \u00e1n:** <Concise answer>",
    "",
    "### C\u00e2u 4 `[type: ORDERING]` `[level: V\u1eadn d\u1ee5ng]` `[tag: #Topic]`",
    "",
    "<Ordering prompt and items>",
    "",
    "> **\u0110\u00e1p \u00e1n:** <Correct order if present in source>",
    "",
    "### C\u00e2u 5 `[type: ESSAY]` `[level: V\u1eadn d\u1ee5ng cao]` `[tag: #Topic]`",
    "",
    "<Essay prompt>",
    "",
    "> **\u0110\u00e1p \u00e1n:** <Answer if present in source>"
  ].join("\n");

  const QUESTION_TYPES = ["MCQ", "TF_GROUP", "SHORT_ANSWER", "ORDERING", "ESSAY"];
  const LETTERS = "ABCDE";

  /* ==================== 1. PDF HEADER / FOOTER / WATERMARK DEDUPLICATOR ==================== */
  function normalizeEdgeLine(line) {
    return String(line || "")
      .trim()
      .toLowerCase()
      .replace(/\btrang\s*\d+(?:\s*\/\s*\d+)?\b/gi, "trang #")
      .replace(/\bpage\s*\d+(?:\s*(?:of|\/)\s*\d+)?\b/gi, "page #")
      .replace(/\b\d+\s*\/\s*\d+\b/g, "#/#")
      .replace(/^\d+$/, "#")
      .replace(/\s+/g, " ");
  }

  function stripRepeatedHeadersFooters(pageLineArrays) {
    if (!Array.isArray(pageLineArrays) || pageLineArrays.length < 2) {
      return (pageLineArrays || []).map(function (lines) {
        return Array.isArray(lines) ? lines.join("\n") : String(lines || "");
      });
    }
    const pageCount = pageLineArrays.length;
    const freq = {};
    const threshold = Math.max(2, Math.ceil(pageCount * 0.5));

    pageLineArrays.forEach(function (lines) {
      if (!Array.isArray(lines) || lines.length === 0) return;
      const seenOnPage = {};
      const topSlice = lines.slice(0, Math.min(3, lines.length));
      const botSlice = lines.slice(Math.max(0, lines.length - 3));
      topSlice.concat(botSlice).forEach(function (raw) {
        const key = normalizeEdgeLine(raw);
        if (!key || key.length > 140) return;
        if (seenOnPage[key]) return;
        seenOnPage[key] = true;
        freq[key] = (freq[key] || 0) + 1;
      });
    });

    const isNoiseKey = function (key) {
      if (!key) return false;
      if (freq[key] >= threshold) return true;
      if (/^(?:trang\s*#|page\s*#|#\/#|#)$/.test(key)) return true;
      if (/(?:tailieu|thuvien|vietjack|loigiaihay|toanmath|hocmai|onthi|\.vn\b|\.com\b)/i.test(key) && freq[key] >= 2) return true;
      return false;
    };

    return pageLineArrays.map(function (lines) {
      if (!Array.isArray(lines)) return String(lines || "");
      const out = [];
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const isEdge = i < 3 || i >= lines.length - 3;
        if (isEdge && isNoiseKey(normalizeEdgeLine(raw))) continue;
        out.push(raw);
      }
      return out.join("\n");
    });
  }

  /* ==================== 2. SMART SECTION CHUNKING & CONCURRENCY RUNNER ==================== */
  function countWords(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function buildSmartChunks(pages, opts) {
    const o = opts || {};
    const maxSinglePages = o.maxSinglePages || 4;
    const maxSingleWords = o.maxSingleWords || 3500;
    const pagesPerChunk = o.pagesPerChunk || 3;
    const overlapChars = o.overlapChars || 150;

    const cleanPages = Array.isArray(pages)
      ? pages.map(function (p) { return String(p || "").trim(); }).filter(Boolean)
      : [String(pages || "").trim()].filter(Boolean);

    if (cleanPages.length === 0) return [];
    const fullText = cleanPages.join("\n\n");
    const totalWords = countWords(fullText);

    if (cleanPages.length <= maxSinglePages && totalWords <= maxSingleWords) {
      return [{
        index: 0,
        total: 1,
        pageStart: 1,
        pageEnd: cleanPages.length,
        text: fullText,
        overlap: ""
      }];
    }

    // If single huge text block without page boundaries, split by double-newline paragraphs (~1800 words/chunk)
    let pageUnits = cleanPages;
    if (cleanPages.length === 1 && totalWords > maxSingleWords) {
      pageUnits = [];
      const paras = fullText.split(/\n{2,}/);
      let buf = "";
      let bufWords = 0;
      paras.forEach(function (p) {
        const w = countWords(p);
        if (buf && bufWords + w > 1200) {
          pageUnits.push(buf);
          buf = p;
          bufWords = w;
        } else {
          buf = buf ? (buf + "\n\n" + p) : p;
          bufWords += w;
        }
      });
      if (buf) pageUnits.push(buf);
    }

    const chunks = [];
    for (let i = 0; i < pageUnits.length; i += pagesPerChunk) {
      const slice = pageUnits.slice(i, i + pagesPerChunk);
      const prevChunkText = chunks.length > 0 ? chunks[chunks.length - 1].text : "";
      const overlap = prevChunkText ? prevChunkText.slice(-overlapChars).trim() : "";
      chunks.push({
        index: chunks.length,
        total: 0,
        pageStart: i + 1,
        pageEnd: Math.min(pageUnits.length, i + slice.length),
        text: slice.join("\n\n"),
        overlap: overlap
      });
    }
    chunks.forEach(function (c) { c.total = chunks.length; });
    return chunks;
  }

  function buildChunkUserPrompt(chunk, opts) {
    const o = opts || {};
    const autoSolveFlag = o.autoSolve ? "[AUTO_SOLVE=TRUE]" : "[AUTO_SOLVE=FALSE]";
    const subjectHint = o.subject && o.subject !== "auto" ? ("[SUBJECT=" + o.subject + "] ") : "";
    let prompt = autoSolveFlag + " " + subjectHint + "\n";
    if (chunk.total > 1) {
      prompt += "[CHUNK " + (chunk.index + 1) + "/" + chunk.total + " | Pages " + chunk.pageStart + "-" + chunk.pageEnd + "]\n";
    }
    if (chunk.overlap) {
      prompt += "[PREVIOUS_CONTEXT_ONLY_DO_NOT_REPEAT]\n" + chunk.overlap + "\n[/PREVIOUS_CONTEXT_ONLY_DO_NOT_REPEAT]\n\n";
    }
    prompt += "Chuy\u1ec3n \u0111\u1ed5i 100% n\u1ed9i dung h\u1ecdc li\u1ec7u sau sang Markdown chu\u1ea9n c\u1ea5u tr\u00fac:\n\n" + chunk.text;
    return prompt;
  }

  async function runWithConcurrency(items, concurrency, workerFn, signal) {
    const limit = Math.max(1, Math.min(concurrency || 3, items.length || 1));
    const results = new Array(items.length);
    let nextIdx = 0;

    async function runner() {
      while (nextIdx < items.length) {
        if (signal && signal.aborted) break;
        const cur = nextIdx++;
        results[cur] = await workerFn(items[cur], cur);
      }
    }

    const workers = [];
    for (let i = 0; i < limit; i++) workers.push(runner());
    await Promise.all(workers);
    return results;
  }

  /* ==================== 3. SSE STREAM PARSER (GEMINI & OPENAI/GROQ/OPENROUTER) ==================== */
  function extractDeltaFromSseLine(rawLine, providerHint) {
    const line = String(rawLine || "").trim();
    if (!line || !line.startsWith("data:")) return "";
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return "";
    try {
      const obj = JSON.parse(payload);
      // OpenAI / Groq / OpenRouter / DeepSeek streaming format
      if (obj && Array.isArray(obj.choices) && obj.choices[0]) {
        const ch = obj.choices[0];
        if (ch.delta && typeof ch.delta.content === "string") return ch.delta.content;
        if (ch.message && typeof ch.message.content === "string") return ch.message.content;
      }
      // Gemini streamGenerateContent?alt=sse format
      if (obj && Array.isArray(obj.candidates) && obj.candidates[0]) {
        const parts = obj.candidates[0].content && obj.candidates[0].content.parts;
        if (Array.isArray(parts)) {
          return parts.map(function (p) { return (p && typeof p.text === "string") ? p.text : ""; }).join("");
        }
      }
      if (providerHint === "anthropic" && obj && obj.delta && typeof obj.delta.text === "string") {
        return obj.delta.text;
      }
    } catch (e) { /* partial or non-JSON SSE line */ }
    return "";
  }

  /* ==================== 4. INCREMENTAL MARKDOWN STATE-MACHINE PARSER ==================== */
  function parseYamlFrontmatter(yamlText) {
    const meta = {
      title: "",
      subject: "",
      mode: "EXAM",
      total_questions: 0,
      duration_minutes: 0
    };
    String(yamlText || "").split(/\r?\n/).forEach(function (line) {
      const m = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
      if (!m) return;
      const k = m[1].trim();
      let v = m[2].trim().replace(/^["']|["']$/g, "");
      if (k === "total_questions" || k === "duration_minutes") {
        meta[k] = parseInt(v, 10) || 0;
      } else if (k === "mode") {
        meta.mode = v.toUpperCase() === "STUDY_NOTE" ? "STUDY_NOTE" : "EXAM";
      } else {
        meta[k] = v;
      }
    });
    return meta;
  }

  function parseTfAnswerLine(rawAns) {
    const out = {};
    const str = String(rawAns || "");
    const re = /([a-dA-D])\s*[:.)\-]\s*(\u0110\u00fang|Dung|True|\u0110|D|T|Sai|False|S|F)(?=$|[\s,;|)])/gi;
    let m;
    while ((m = re.exec(str)) !== null) {
      const key = m[1].toLowerCase();
      const val = m[2].toLowerCase();
      out[key] = (val === "\u0111" || val === "d" || val === "t" || val === "\u0111\u00fang" || val === "dung" || val === "true");
    }
    return out;
  }

  function parseMcqAnswerIndices(rawAns, optionCount) {
    const clean = String(rawAns || "").trim();
    if (!clean) return [];
    const upper = clean.toUpperCase();
    // Match leading single letter or comma/slash separated letters like "A", "A, C", "B. explanation..."
    const leadMatch = upper.match(/^([A-E](?:\s*[,;\/&]\s*[A-E])*)\b/);
    const tokens = leadMatch ? leadMatch[1].split(/[,;\/&\s]+/).filter(Boolean) : [];
    const indices = [];
    tokens.forEach(function (t) {
      const idx = LETTERS.indexOf(t);
      if (idx >= 0 && (!optionCount || idx < optionCount) && indices.indexOf(idx) === -1) {
        indices.push(idx);
      }
    });
    if (indices.length > 0) return indices.sort(function (a, b) { return a - b; });
    const numMatch = upper.match(/^([1-5](?:\s*[,;\/]\s*[1-5])*)\b/);
    if (numMatch) {
      return Array.from(new Set(numMatch[1].split(/[,;\/\s]+/).map(function (n) { return Number(n) - 1; })))
        .filter(function (i) { return i >= 0 && (!optionCount || i < optionCount); })
        .sort(function (a, b) { return a - b; });
    }
    return [];
  }

  function parseQuestionBlock(headerLine, bodyLines, metaCtx) {
    const numMatch = headerLine.match(/^###\s*(?:C\u00e2u|Question|B\u00e0i)\s*(\d+)/i);
    const qNumber = numMatch ? parseInt(numMatch[1], 10) : (metaCtx.seq || 1);
    const typeMatch = headerLine.match(/\[type:\s*([A-Z_]+)\]/i);
    const ctxMatch = headerLine.match(/\[context:\s*([^\]]+)\]/i);
    const levelMatch = headerLine.match(/\[level:\s*([^\]]+)\]/i);
    const tagMatch = headerLine.match(/\[tag:\s*([^\]]+)\]/i);

    let qType = typeMatch ? typeMatch[1].toUpperCase() : "MCQ";
    if (QUESTION_TYPES.indexOf(qType) === -1) qType = "MCQ";

    const stemLines = [];
    const mcqOptions = ["", "", "", "", ""];
    const tfStatements = []; // [{ key:'a', text:'...' }]
    let answerRaw = "";
    let explanationLines = [];
    let inAnswer = false;
    let inExplain = false;
    let hasMcqOpt = false;
    let hasTfOpt = false;

    for (let i = 0; i < bodyLines.length; i++) {
      const rawLine = bodyLines[i];
      const trimmed = rawLine.trim();
      if (!trimmed && !inAnswer && !inExplain && !hasMcqOpt && !hasTfOpt && stemLines.length === 0) continue;

      const ansM = trimmed.match(/^>?\s*(?:\*\*|__)?(?:\u0110\u00e1p\s*\u00e1n|Answer|Key)\s*[:\-]\s*(?:\*\*|__)?\s*(.*)$/i);
      if (ansM) {
        inAnswer = true;
        inExplain = false;
        answerRaw = ansM[1].replace(/^\*\*\s*|\s*\*\*$/g, "").trim();
        continue;
      }
      const expM = trimmed.match(/^>?\s*(?:\*\*|__)?(?:Gi\u1ea3i\s*th\u00edch|L\u1eddi\s*gi\u1ea3i|H\u01b0\u1edbng\s*d\u1eabn\s*ch\u1ea5m|Explanation)\s*[:\-]\s*(?:\*\*|__)?\s*(.*)$/i);
      if (expM) {
        inExplain = true;
        inAnswer = false;
        if (expM[1].trim()) explanationLines.push(expM[1].trim());
        continue;
      }

      if (inExplain) {
        explanationLines.push(rawLine.replace(/^>\s?/, ""));
        continue;
      }

      // Check TF_GROUP statement: "- **a)** ..." or "a) ..."
      const tfM = trimmed.match(/^(?:[-*+]\s+)?(?:\*\*|__)?([a-d])\)\s*(?:\*\*|__)?\s*(.+)$/i);
      if (tfM && (qType === "TF_GROUP" || /^[a-d]\)/.test(trimmed.replace(/^(?:[-*+]\s+)?(?:\*\*|__)?/, "")))) {
        hasTfOpt = true;
        inAnswer = false;
        tfStatements.push({ key: tfM[1].toLowerCase(), text: tfM[2].trim() });
        continue;
      }

      // Check MCQ option: "- **A.** ..." or "A. ..."
      const mcqM = trimmed.match(/^(?:[-*+]\s+)?(?:\*\*|__)?([A-E])\s*[.)]\s*(?:\*\*|__)?\s*(.+)$/);
      if (mcqM) {
        const idx = LETTERS.indexOf(mcqM[1].toUpperCase());
        if (idx >= 0) {
          hasMcqOpt = true;
          inAnswer = false;
          mcqOptions[idx] = mcqM[2].replace(/(\*\*|__)\s*$/, "").trim();
          continue;
        }
      }

      if (inAnswer) {
        if (trimmed.startsWith(">")) {
          const cont = trimmed.replace(/^>\s?/, "").trim();
          if (cont) explanationLines.push(cont);
        } else if (trimmed) {
          answerRaw += (answerRaw ? " " : "") + trimmed;
        }
        continue;
      }

      if (!hasMcqOpt && !hasTfOpt) {
        stemLines.push(rawLine);
      } else {
        explanationLines.push(rawLine.replace(/^>\s?/, ""));
      }
    }

    if (hasTfOpt && !typeMatch) qType = "TF_GROUP";
    else if (!hasMcqOpt && !hasTfOpt && !typeMatch) qType = "SHORT_ANSWER";

    const nonEmptyMcq = mcqOptions.filter(Boolean);
    const correctIndices = qType === "MCQ" ? parseMcqAnswerIndices(answerRaw, nonEmptyMcq.length) : [];
    const tfAnswers = qType === "TF_GROUP" ? parseTfAnswerLine(answerRaw) : {};

    return {
      id: "dq_" + qNumber + "_" + (metaCtx.seq || 0),
      number: qNumber,
      qType: qType, // MCQ | TF_GROUP | SHORT_ANSWER | ORDERING | ESSAY
      type: qType === "MCQ" ? (correctIndices.length > 1 ? "Checkbox" : "Multiple Choice") : qType,
      text: stemLines.join("\n").trim(),
      options: mcqOptions,
      correct: correctIndices,
      tfStatements: tfStatements,
      tfAnswers: tfAnswers,
      answerText: answerRaw,
      explanation: explanationLines.join("\n").trim(),
      contextId: ctxMatch ? ctxMatch[1].trim() : (metaCtx.activeContextId || ""),
      instruction: metaCtx.activeInstruction || "",
      section: metaCtx.activeSection || "",
      examSet: metaCtx.activeExamSet || "",
      level: levelMatch ? levelMatch[1].trim() : "",
      tag: tagMatch ? tagMatch[1].trim() : "",
      time: 30,
      image: "",
      verified: false,
      suspect: false,
      checkNote: ""
    };
  }

  function unwrapMarkdownFence(rawText, isComplete) {
    let body = String(rawText || "").replace(/\r\n/g, "\n");
    const openMatch = body.match(/^\s*```(?:markdown|md)?[ \t]*\n/i);
    if (openMatch) {
      body = body.slice(openMatch[0].length);
      if (isComplete) body = body.replace(/\n```[ \t]*\s*$/, "");
    } else if (isComplete) {
      // Handle brief external chat preamble before the first ```markdown ... ``` block
      const embedded = body.match(/```(?:markdown|md)[ \t]*\n([\s\S]*?)\n```[ \t]*(?:\s*$)/i);
      if (embedded && embedded[1]) body = embedded[1];
    }
    // Restore inner ~~~~ code fences back to ```
    body = body.replace(/^~~~~([a-zA-Z0-9_+-]*)[ \t]*$/gm, "```$1");
    return body;
  }

  function createIncrementalParser() {
    let rawBuffer = "";

    function parseDocument(markdownText, isComplete) {
      const raw = String(markdownText || "").replace(/\r\n/g, "\n");
      const body = unwrapMarkdownFence(raw, isComplete);
      const trimmed = body.trim();
      const doc = {
        meta: { title: "", subject: "", mode: "EXAM", total_questions: 0, duration_minutes: 0 },
        error: "",
        sections: [],
        instructions: [],
        contexts: {}, // id -> { id, questions, content }
        questions: [],
        studyNoteMarkdown: "",
        streamingTail: "",
        rawMarkdown: body
      };

      if (!trimmed) return doc;
      if (/^ERROR_INVALID_CONTENT\s*:/i.test(trimmed)) {
        doc.error = trimmed.replace(/^ERROR_INVALID_CONTENT\s*:\s*/i, "").trim() || "T\u00e0i li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7.";
        return doc;
      }

      const lines = body.split("\n");
      let idx = 0;

      // 1. Optional YAML frontmatter
      if (lines[0] && lines[0].trim() === "---") {
        let endYaml = -1;
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === "---") { endYaml = i; break; }
        }
        if (endYaml !== -1) {
          doc.meta = parseYamlFrontmatter(lines.slice(1, endYaml).join("\n"));
          idx = endYaml + 1;
        } else if (!isComplete) {
          doc.streamingTail = lines.slice(0).join("\n");
          return doc;
        }
      }

      if (doc.meta.mode === "STUDY_NOTE") {
        doc.studyNoteMarkdown = lines.slice(idx).join("\n").trim();
        return doc;
      }

      // 2. State-Machine Walk for EXAM blocks
      let activeExamSet = "";
      let activeSection = "";
      let activeInstruction = "";
      let activeContextId = "";
      let state = "IDLE"; // IDLE | INSTRUCTION | CONTEXT | QUESTION
      let curHeader = "";
      let curLines = [];
      let curCtxMeta = null;
      let seq = 0;

      function flushCurrent(forceComplete) {
        if (state === "INSTRUCTION") {
          const text = curLines.join("\n").trim();
          if (text) {
            activeInstruction = text;
            doc.instructions.push({ section: activeSection, text: text });
          }
        } else if (state === "CONTEXT" && curCtxMeta) {
          const text = curLines.join("\n").trim();
          doc.contexts[curCtxMeta.id] = {
            id: curCtxMeta.id,
            questions: curCtxMeta.questions || "",
            content: text
          };
          activeContextId = curCtxMeta.id;
        } else if (state === "QUESTION" && curHeader) {
          if (forceComplete) {
            seq++;
            const qObj = parseQuestionBlock(curHeader, curLines, {
              seq: seq,
              activeInstruction: activeInstruction,
              activeContextId: "",
              activeSection: activeSection,
              activeExamSet: activeExamSet
            });
            // Auto-link context if question number falls inside a context's questions="from-to" range
            if (!qObj.contextId && qObj.number) {
              const ctxIds = Object.keys(doc.contexts);
              for (let ci = 0; ci < ctxIds.length; ci++) {
                const c = doc.contexts[ctxIds[ci]];
                const rm = String(c.questions || "").match(/(\d+)\s*[-–]\s*(\d+)/);
                if (rm && qObj.number >= Number(rm[1]) && qObj.number <= Number(rm[2])) {
                  qObj.contextId = c.id;
                  break;
                }
              }
            }
            if (qObj.text || qObj.options.some(Boolean) || qObj.tfStatements.length > 0) {
              doc.questions.push(qObj);
            }
          } else {
            doc.streamingTail = curHeader + "\n" + curLines.join("\n");
          }
        }
        state = "IDLE";
        curHeader = "";
        curLines = [];
        curCtxMeta = null;
      }

      for (let i = idx; i < lines.length; i++) {
        const line = lines[i];
        const tr = line.trim();

        if (state === "INSTRUCTION" || state === "CONTEXT") {
          if (tr === ":::") {
            flushCurrent(true);
          } else {
            curLines.push(line);
          }
          continue;
        }

        if (/^#\s+\u0110\u1ec0\s+S\u1ed0\b/i.test(tr) || /^#\s+EXAM\b/i.test(tr)) {
          flushCurrent(true);
          activeExamSet = tr.replace(/^#\s+/, "").trim();
          activeInstruction = "";
          activeContextId = "";
          continue;
        }

        if (/^##\s+/.test(tr)) {
          flushCurrent(true);
          activeSection = tr.replace(/^##\s+/, "").trim();
          doc.sections.push(activeSection);
          continue;
        }

        if (/^:::instruction\b/i.test(tr)) {
          flushCurrent(true);
          state = "INSTRUCTION";
          curLines = [];
          continue;
        }

        const ctxStart = tr.match(/^:::context\b(.*)$/i);
        if (ctxStart) {
          flushCurrent(true);
          state = "CONTEXT";
          const attrs = ctxStart[1] || "";
          const idM = attrs.match(/id\s*=\s*["']?([^"'\s\]]+)["']?/i);
          const qM = attrs.match(/questions\s*=\s*["']?([^"'\]]+)["']?/i);
          curCtxMeta = {
            id: idM ? idM[1].trim() : ("CTX_" + (Object.keys(doc.contexts).length + 1)),
            questions: qM ? qM[1].trim() : ""
          };
          curLines = [];
          continue;
        }

        if (/^###\s*(?:C\u00e2u|Question|B\u00e0i)\s*\d+/i.test(tr)) {
          flushCurrent(true);
          state = "QUESTION";
          curHeader = tr;
          curLines = [];
          continue;
        }

        if (state === "QUESTION") {
          curLines.push(line);
        }
      }

      if (isComplete) {
        flushCurrent(true);
      } else if (state !== "IDLE") {
        // Keep incomplete last block in streamingTail so UI renders skeleton/typing indicator
        doc.streamingTail = (state === "QUESTION" ? (curHeader + "\n") : "") + curLines.join("\n");
      }

      if (!doc.meta.total_questions && doc.questions.length > 0) {
        doc.meta.total_questions = doc.questions.length;
      }
      return doc;
    }

    return {
      append: function (deltaText) {
        rawBuffer += String(deltaText || "");
        return parseDocument(rawBuffer, false);
      },
      finish: function () {
        return parseDocument(rawBuffer, true);
      },
      finalize: function () {
        return parseDocument(rawBuffer, true);
      },
      getSnapshot: function () {
        return parseDocument(rawBuffer, false);
      },
      reset: function () {
        rawBuffer = "";
      },
      getRaw: function () {
        return rawBuffer;
      },
      parseFull: function (md) {
        return parseDocument(md, true);
      }
    };
  }

  /* ==================== 5. SCORING & ANSWER COMPARISON ==================== */
  // 2025 VN High School Exam TF_GROUP scoring: 1 right = 0.1, 2 = 0.25, 3 = 0.5, 4 = 1.0
  function normTfVal(v) {
    if (v === true || v === "T" || v === "true") return true;
    if (v === false || v === "F" || v === "false") return false;
    return null;
  }

  function scoreTfGroup2025(userMap, answerMap) {
    const keys = ["a", "b", "c", "d"];
    let matched = 0;
    let total = 0;
    keys.forEach(function (k) {
      const ans = answerMap ? normTfVal(answerMap[k]) : null;
      if (ans !== null) {
        total++;
        const usr = userMap ? normTfVal(userMap[k]) : null;
        if (usr !== null && usr === ans) matched++;
      }
    });
    const table = [0, 0.1, 0.25, 0.5, 1.0];
    const pts = table[Math.min(4, matched)] || 0;
    return {
      matched: matched,
      correctCount: matched,
      total: total || 4,
      points: pts,
      score: pts
    };
  }

  function normalizeShortAnswer(str) {
    return String(str || "")
      .normalize("NFKC")
      .trim()
      .replace(/\s*([-–—→>,])\s*/g, "$1")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function compareShortAnswer(userInput, expectedRaw) {
    const u = normalizeShortAnswer(userInput);
    if (!u) return false;
    const variants = String(expectedRaw || "").split(/[\/|;]/).map(normalizeShortAnswer).filter(Boolean);
    if (variants.indexOf(u) !== -1) return true;
    // Smart numeric comparison (handles 98,0 vs 98.0 vs 98)
    const uNum = Number(u.replace(",", "."));
    if (Number.isFinite(uNum) && /^[+-]?\d+(?:[.,]\d+)?$/.test(u)) {
      for (let i = 0; i < variants.length; i++) {
        if (/^[+-]?\d+(?:[.,]\d+)?$/.test(variants[i]) && Number(variants[i].replace(",", ".")) === uNum) {
          return true;
        }
      }
    }
    return u === normalizeShortAnswer(expectedRaw);
  }

  /* ==================== 6. BACKWARD COMPATIBILITY CONVERTER ==================== */
  function fromLegacyQuestions(legacyArray, meta) {
    const items = Array.isArray(legacyArray) ? legacyArray : [];
    return {
      meta: Object.assign({
        title: (meta && meta.title) || "\u0110\u1ec1 thi \u0111\u00e3 l\u01b0u",
        subject: (meta && meta.subject) || "",
        mode: "EXAM",
        total_questions: items.length,
        duration_minutes: 45
      }, meta || {}),
      error: "",
      sections: [],
      instructions: [],
      contexts: {},
      questions: items.map(function (q, i) {
        const opts = Array.isArray(q.options) ? q.options.slice(0, 5) : [];
        while (opts.length < 5) opts.push("");
        const corr = Array.isArray(q.correct) ? q.correct.slice() : [];
        return {
          id: q.id || ("legacy_" + i),
          number: i + 1,
          qType: q.qType || "MCQ",
          type: q.type || (corr.length > 1 ? "Checkbox" : "Multiple Choice"),
          text: String(q.text || q.question || "").trim(),
          options: opts,
          correct: corr,
          tfStatements: Array.isArray(q.tfStatements) ? q.tfStatements : [],
          tfAnswers: q.tfAnswers && typeof q.tfAnswers === "object" ? q.tfAnswers : {},
          answerText: q.answerText || corr.map(function (c) { return LETTERS.charAt(c); }).join(", "),
          explanation: String(q.explanation || "").trim(),
          contextId: q.contextId || "",
          instruction: q.instruction || "",
          section: q.section || "",
          examSet: "",
          level: q.level || "",
          tag: q.tag || "",
          time: Number(q.time) || 30,
          image: q.image || "",
          verified: !!q.verified,
          suspect: !!q.suspect,
          checkNote: q.checkNote || ""
        };
      }),
      studyNoteMarkdown: "",
      streamingTail: "",
      rawMarkdown: ""
    };
  }

  function exportToMarkdown(doc) {
    if (!doc) return "";
    if (doc.rawMarkdown && doc.rawMarkdown.trim()) return doc.rawMarkdown.trim();
    const m = doc.meta || {};
    const lines = [
      "---",
      'title: "' + String(m.title || "AI Tutor Exam").replace(/"/g, '\\"') + '"',
      'subject: "' + String(m.subject || "").replace(/"/g, '\\"') + '"',
      'mode: "' + (m.mode === "STUDY_NOTE" ? "STUDY_NOTE" : "EXAM") + '"',
      "total_questions: " + (m.mode === "STUDY_NOTE" ? 0 : (doc.questions ? doc.questions.length : 0)),
      "duration_minutes: " + (Number(m.duration_minutes) || 45),
      "---",
      ""
    ];
    if (m.mode === "STUDY_NOTE") {
      lines.push(doc.studyNoteMarkdown || "");
      return lines.join("\n");
    }
    const emittedCtx = {};
    let lastInstr = "";
    (doc.questions || []).forEach(function (q, idx) {
      if (q.instruction && q.instruction !== lastInstr) {
        lines.push(":::instruction", q.instruction, ":::", "");
        lastInstr = q.instruction;
      }
      if (q.contextId && doc.contexts && doc.contexts[q.contextId] && !emittedCtx[q.contextId]) {
        const c = doc.contexts[q.contextId];
        emittedCtx[q.contextId] = true;
        lines.push(':::context [id="' + c.id + '"' + (c.questions ? ' questions="' + c.questions + '"' : "") + "]", c.content, ":::", "");
      }
      const qType = q.qType || "MCQ";
      const header = "### C\u00e2u " + (q.number || (idx + 1)) + " `[type: " + qType + "]`" +
        (q.contextId ? " `[context: " + q.contextId + "]`" : "") +
        (q.level ? " `[level: " + q.level + "]`" : "") +
        (q.tag ? " `[tag: " + q.tag + "]`" : "");
      lines.push(header);
      if (q.text) lines.push(q.text);
      if (qType === "MCQ") {
        (q.options || []).forEach(function (opt, k) {
          if (opt) lines.push("- **" + LETTERS.charAt(k) + ".** " + opt);
        });
        const ansStr = q.answerText || (q.correct || []).map(function (c) { return LETTERS.charAt(c); }).join(", ");
        lines.push("> **\u0110\u00e1p \u00e1n:** " + ansStr);
      } else if (qType === "TF_GROUP") {
        (q.tfStatements || []).forEach(function (st) {
          lines.push("- **" + st.key + ")** " + st.text);
        });
        const tfStr = (q.tfStatements || []).map(function (st) {
          const v = q.tfAnswers && q.tfAnswers[st.key];
          return st.key + ": " + ((v === true || v === "T") ? "\u0110" : ((v === false || v === "F") ? "S" : "?"));
        }).join(" | ");
        lines.push("> **\u0110\u00e1p \u00e1n:** " + tfStr);
      } else {
        lines.push("> **\u0110\u00e1p \u00e1n:** " + (q.answerText || ""));
      }
      if (q.explanation) {
        lines.push("> **Gi\u1ea3i th\u00edch:** " + q.explanation.replace(/\n/g, "\n> "));
      }
      lines.push("");
    });
    return lines.join("\n").trim() + "\n";
  }

  /* ==================== 7. DETERMINISTIC QA VALIDATOR (V3.3 Section 2.6) ==================== */
  function countUnescapedChar(str, ch) {
    let n = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === ch && str[i - 1] !== "\\") n++;
    }
    return n;
  }

  function runDeterministicQA(doc, chunkStates) {
    const issues = []; // { severity: 'error' | 'warning', code, message, questionIndex? }
    const d = doc || {};
    const meta = d.meta || {};
    const qs = Array.isArray(d.questions) ? d.questions : [];
    const ctxs = d.contexts && typeof d.contexts === "object" ? d.contexts : {};
    const chunks = Array.isArray(chunkStates) ? chunkStates : [];

    // 1. YAML Frontmatter check
    if (!meta.mode || (meta.mode !== "EXAM" && meta.mode !== "STUDY_NOTE")) {
      issues.push({ severity: "warning", code: "YAML_MODE", message: "Thi\u1ebfu ho\u1eb7c sai tr\u01b0\u1eddng YAML mode (EXAM | STUDY_NOTE)." });
    }
    if (!meta.title) {
      issues.push({ severity: "warning", code: "YAML_TITLE", message: "Thi\u1ebfu ti\u00eau \u0111\u1ec1 (title) trong YAML frontmatter." });
    }

    // 2. Missing / failed chunks
    chunks.forEach(function (ch) {
      if (ch && ch.status === "error") {
        issues.push({ severity: "error", code: "CHUNK_FAILED", message: "Ph\u1ea7n \"" + (ch.label || ("Chunk " + (ch.index + 1))) + "\" b\u1ecb l\u1ed7i/thi\u1ebfu: " + (ch.error || "Unknown error") });
      }
    });

    // 3. Question count vs YAML total_questions
    if (meta.mode === "EXAM" && meta.total_questions > 0 && qs.length !== Number(meta.total_questions)) {
      issues.push({ severity: "warning", code: "COUNT_MISMATCH", message: "S\u1ed1 c\u00e2u tr\u00edch xu\u1ea5t (" + qs.length + ") kh\u00e1c v\u1edbi YAML total_questions (" + meta.total_questions + ")." });
    }

    // 4. Per-question validation: numbering, duplicates, types, options, contexts, answers, LaTeX, [CHECK:]
    const seenNumPerExam = {};
    const seenTexts = {};
    let uncertainCount = 0;

    qs.forEach(function (q, idx) {
      const qLabel = "C\u00e2u " + (q.number || (idx + 1));
      const examKey = (q.examSet || "1") + "#" + (q.number || (idx + 1));
      if (seenNumPerExam[examKey]) {
        issues.push({ severity: "warning", code: "DUP_NUMBER", questionIndex: idx, message: qLabel + ": Tr\u00f9ng s\u1ed1 th\u1ee9 t\u1ef1 c\u00e2u h\u1ecfi." });
      }
      seenNumPerExam[examKey] = true;

      const normText = String(q.text || "").trim().toLowerCase().replace(/\s+/g, " ");
      if (!normText) {
        issues.push({ severity: "error", code: "EMPTY_STEM", questionIndex: idx, message: qLabel + ": Thi\u1ebfu n\u1ed9i dung \u0111\u1ec1 b\u00e0i." });
      } else if (normText.length > 24 && seenTexts[normText] !== undefined) {
        issues.push({ severity: "warning", code: "DUP_QUESTION", questionIndex: idx, message: qLabel + ": N\u1ed9i dung tr\u00f9ng l\u1eb7p v\u1edbi C\u00e2u " + (seenTexts[normText] + 1) + "." });
      } else if (normText) {
        seenTexts[normText] = idx;
      }

      const qt = q.qType || "MCQ";
      if (QUESTION_TYPES.indexOf(qt) === -1) {
        issues.push({ severity: "warning", code: "UNKNOWN_TYPE", questionIndex: idx, message: qLabel + ": Lo\u1ea1i c\u00e2u h\u1ecfi kh\u00f4ng h\u1ee3p l\u1ec7 (" + qt + ")." });
      }

      if (qt === "MCQ") {
        const opts = (q.options || []).filter(Boolean);
        if (opts.length < 2) {
          issues.push({ severity: "error", code: "MCQ_OPTIONS", questionIndex: idx, message: qLabel + ": C\u00e2u MCQ c\u1ea7n \u00edt nh\u1ea5t 2 ph\u01b0\u01a1ng \u00e1n (hi\u1ec7n c\u00f3 " + opts.length + ")." });
        }
        if ((q.correct || []).some(function (c) { return c < 0 || c >= opts.length; })) {
          issues.push({ severity: "error", code: "ANS_OUT_OF_RANGE", questionIndex: idx, message: qLabel + ": \u0110\u00e1p \u00e1n n\u1eb1m ngo\u00e0i ph\u1ea1m vi ph\u01b0\u01a1ng \u00e1n." });
        }
      } else if (qt === "TF_GROUP") {
        const stmts = q.tfStatements || [];
        if (stmts.length === 0) {
          issues.push({ severity: "error", code: "TF_STATEMENTS", questionIndex: idx, message: qLabel + ": Thi\u1ebfu c\u00e1c m\u1ec7nh \u0111\u1ec1 a/b/c/d." });
        }
      }

      if (q.contextId && !ctxs[q.contextId]) {
        issues.push({ severity: "error", code: "MISSING_CONTEXT", questionIndex: idx, message: qLabel + ": Tham chi\u1ebfu ng\u1eef li\u1ec7u [" + q.contextId + "] nh\u01b0ng kh\u00f4ng t\u00ecm th\u1ea5y kh\u1ed1i :::context t\u01b0\u01a1ng \u1ee9ng." });
      }

      // LaTeX & Markdown balance check
      const combined = String(q.text || "") + " " + (q.options || []).join(" ") + " " + String(q.explanation || "");
      const noBlockDollar = combined.replace(/\$\$[\s\S]*?\$\$/g, "");
      if (countUnescapedChar(noBlockDollar, "$") % 2 !== 0) {
        issues.push({ severity: "warning", code: "LATEX_UNBALANCED", questionIndex: idx, message: qLabel + ": C\u00f4ng th\u1ee9c LaTeX c\u00f3 d\u1ea5u $ ch\u01b0a \u0111\u00f3ng m\u1edf c\u00e2n b\u1eb1ng." });
      }
      const checkMatches = combined.match(/\[CHECK:[^\]]*\]/gi);
      if (checkMatches && checkMatches.length > 0) {
        uncertainCount += checkMatches.length;
        issues.push({ severity: "warning", code: "UNCERTAIN_OCR", questionIndex: idx, message: qLabel + ": C\u00f3 " + checkMatches.length + " \u0111o\u1ea1n OCR c\u1ea7n ki\u1ec3m tra (" + checkMatches[0] + ")." });
      }
    });

    // 5. Context blocks [CHECK:] and LaTeX checks
    Object.keys(ctxs).forEach(function (cid) {
      const cText = String((ctxs[cid] && ctxs[cid].content) || "");
      const cm = cText.match(/\[CHECK:[^\]]*\]/gi);
      if (cm && cm.length > 0) {
        uncertainCount += cm.length;
        issues.push({ severity: "warning", code: "CTX_UNCERTAIN_OCR", message: "Ng\u1eef li\u1ec7u " + cid + ": C\u00f3 " + cm.length + " \u0111o\u1ea1n OCR ch\u01b0a ch\u1eafc ch\u1eafn." });
      }
    });

    const errors = issues.filter(function (x) { return x.severity === "error"; }).length;
    const warnings = issues.filter(function (x) { return x.severity === "warning"; }).length;
    return {
      passed: errors === 0,
      errors: errors,
      warnings: warnings,
      uncertainCount: uncertainCount,
      issues: issues
    };
  }

  return {
    MASTER_SYSTEM_PROMPT: MASTER_SYSTEM_PROMPT,
    QUESTION_TYPES: QUESTION_TYPES,
    stripRepeatedHeadersFooters: stripRepeatedHeadersFooters,
    buildSmartChunks: buildSmartChunks,
    buildChunkUserPrompt: buildChunkUserPrompt,
    runWithConcurrency: runWithConcurrency,
    extractDeltaFromSseLine: extractDeltaFromSseLine,
    createIncrementalParser: createIncrementalParser,
    unwrapMarkdownFence: unwrapMarkdownFence,
    scoreTfGroup2025: scoreTfGroup2025,
    compareShortAnswer: compareShortAnswer,
    fromLegacyQuestions: fromLegacyQuestions,
    exportToMarkdown: exportToMarkdown,
    runDeterministicQA: runDeterministicQA
  };
});
