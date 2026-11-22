/* ============================================================
   AI Tutor - Shared AI Providers, Models & Guide Config
   Single source of truth loaded by both browser (window.AI_PROVIDERS_CONFIG)
   and Node.js serverless proxy (module.exports).
   Verified against official provider documentation (Nov 2026).
   NEVER put real API keys in this file!
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AI_PROVIDERS_CONFIG = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const PROVIDERS = [
    {
      id: "groq",
      name: "Groq Cloud",
      prefix: "gsk_",
      prefixHint: "gsk_...",
      recommended: true,
      badgeText: "Khuy\u00ean d\u00f9ng \u2022 Mi\u1ec5n ph\u00ed \u2022 Vision \u2022 Kh\u00f4ng c\u1ea7n th\u1ebb",
      keyUrl: "https://console.groq.com/keys",
      keyUrlLabel: "console.groq.com/keys",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      testEndpoint: "https://api.groq.com/openai/v1/models",
      format: "openai",
      freeTierSummary: "Mi\u1ec5n ph\u00ed (~30 RPM / 1.000 RPD), t\u1ed1c \u0111\u1ed9 LPU si\u00eau nhanh, h\u1ed7 tr\u1ee3 \u0111\u1ecdc \u1ea3nh \u0111\u1ec1 thi (Vision) v\u1edbi Qwen 3.6 27B, kh\u00f4ng c\u1ea7n th\u1ebb t\u00edn d\u1ee5ng.",
      guideSteps: [
        "M\u1edf https://console.groq.com/keys v\u00e0 \u0111\u0103ng nh\u1eadp b\u1eb1ng t\u00e0i kho\u1ea3n Google ho\u1eb7c GitHub (kh\u00f4ng c\u1ea7n th\u1ebb Visa).",
        "Nh\u1ea5n n\u00fat Create API Key, \u0111\u1eb7t t\u00ean g\u1ee3i nh\u1edb (v\u00ed d\u1ee5: ai-tutor) r\u1ed3i nh\u1ea5n Submit.",
        "Sao ch\u00e9p ngay m\u00e3 kh\u00f3a b\u1eaft \u0111\u1ea7u b\u1eb1ng gsk_... v\u00e0 d\u00e1n v\u00e0o m\u1ee5c Groq Cloud t\u1ea1i C\u00e0i \u0111\u1eb7t API."
      ],
      models: [
        {
          id: "groq:qwen/qwen3.6-27b",
          rawModel: "qwen/qwen3.6-27b",
          label: "Groq Qwen 3.6 27B (Mi\u1ec5n ph\u00ed & Vision)",
          vision: true,
          pdf: false,
          free: true,
          contextWindow: "128K"
        },
        {
          id: "groq:openai/gpt-oss-120b",
          rawModel: "openai/gpt-oss-120b",
          label: "Groq GPT-OSS 120B (Mi\u1ec5n ph\u00ed \u2022 Suy lu\u1eadn m\u1ea1nh)",
          vision: false,
          pdf: false,
          free: true,
          contextWindow: "128K"
        },
        {
          id: "groq:openai/gpt-oss-20b",
          rawModel: "openai/gpt-oss-20b",
          label: "Groq GPT-OSS 20B (Si\u00eau t\u1ed1c \u2022 Mi\u1ec5n ph\u00ed)",
          vision: false,
          pdf: false,
          free: true,
          contextWindow: "128K"
        }
      ]
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      prefix: "sk-or-",
      prefixHint: "sk-or-...",
      recommended: false,
      badgeText: "\u0110a Model :free & Paid",
      keyUrl: "https://openrouter.ai/keys",
      keyUrlLabel: "openrouter.ai/keys",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      testEndpoint: "https://openrouter.ai/api/v1/key",
      format: "openai",
      freeTierSummary: "Mi\u1ec5n ph\u00ed 20 RPM / 50 RPD (t\u0103ng l\u00ean 1.000 RPD khi n\u1ea1p t\u1ed1i thi\u1ec3u $10 m\u1ed9t l\u1ea7n). D\u00f9ng openrouter/free \u0111\u1ec3 t\u1ef1 \u0111\u1ed9ng \u0111\u1ecbnh tuy\u1ebfn model :free \u0111ang ho\u1ea1t \u0111\u1ed9ng.",
      guideSteps: [
        "Truy c\u1eadp https://openrouter.ai/keys v\u00e0 \u0111\u0103ng nh\u1eadp b\u1eb1ng t\u00e0i kho\u1ea3n Google ho\u1eb7c GitHub.",
        "Nh\u1ea5n Create Key, \u0111\u1eb7t t\u00ean t\u00f9y \u00fd r\u1ed3i x\u00e1c nh\u1eadn t\u1ea1o kh\u00f3a.",
        "Sao ch\u00e9p kh\u00f3a b\u1eaft \u0111\u1ea7u b\u1eb1ng sk-or-... \u0111\u1ec3 d\u00f9ng openrouter/free v\u00e0 c\u00e1c model :free (ho\u1eb7c n\u1ea1p th\u00eam credit n\u1ebfu c\u1ea7n)."
      ],
      models: [
        {
          id: "openrouter:openrouter/free",
          rawModel: "openrouter/free",
          label: "OpenRouter Auto Free Router (:free & Vision)",
          vision: true,
          pdf: false,
          free: true,
          contextWindow: "Dynamic"
        },
        {
          id: "openrouter:qwen/qwen2.5-vl-72b-instruct:free",
          rawModel: "qwen/qwen2.5-vl-72b-instruct:free",
          label: "OpenRouter: Qwen 2.5 VL 72B (Free & Vision)",
          vision: true,
          pdf: false,
          free: true,
          contextWindow: "128K"
        },
        {
          id: "openrouter:google/gemini-2.5-flash",
          rawModel: "google/gemini-2.5-flash",
          label: "OpenRouter: Gemini 2.5 Flash (Vision)",
          vision: true,
          pdf: false,
          free: false,
          contextWindow: "1M"
        },
        {
          id: "openrouter:openai/gpt-4o-mini",
          rawModel: "openai/gpt-4o-mini",
          label: "OpenRouter: GPT-4o Mini (Vision)",
          vision: true,
          pdf: false,
          free: false,
          contextWindow: "128K"
        },
        {
          id: "openrouter:deepseek/deepseek-chat",
          rawModel: "deepseek/deepseek-chat",
          label: "OpenRouter: DeepSeek Chat V3",
          vision: false,
          pdf: false,
          free: false,
          contextWindow: "128K"
        }
      ]
    },
    {
      id: "gemini",
      name: "Google AI Studio (Gemini)",
      prefix: "",
      prefixHint: "AIza... / AQ....",
      recommended: false,
      badgeText: "Mi\u1ec5n ph\u00ed \u2022 Ti\u1ebfng Vi\u1ec7t & PDF/T\u00e0i li\u1ec7u d\u00e0i t\u1ed1t",
      keyUrl: "https://aistudio.google.com/apikey",
      keyUrlLabel: "aistudio.google.com/apikey",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models/",
      testEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
      format: "gemini",
      freeTierSummary: "C\u00f3 g\u00f3i mi\u1ec5n ph\u00ed theo d\u1ef1 \u00e1n (RPM/TPM/RPD), ng\u1eef c\u1ea3nh r\u1ea5t d\u00e0i (1M+ token), \u0111\u1ecdc PDF scan, \u1ea3nh c\u00f4ng th\u1ee9c v\u00e0 ti\u1ebfng Vi\u1ec7t r\u1ea5t t\u1ed1t.",
      guideSteps: [
        "M\u1edf https://aistudio.google.com/apikey v\u00e0 \u0111\u0103ng nh\u1eadp b\u1eb1ng t\u00e0i kho\u1ea3n Google c\u1ee7a b\u1ea1n.",
        "Nh\u1ea5n Create API Key, ch\u1ecdn ho\u1eb7c t\u1ea1o m\u1ed9t Google Cloud Project m\u1edbi.",
        "Sao ch\u00e9p kh\u00f3a b\u1eaft \u0111\u1ea7u b\u1eb1ng AIza... v\u00e0 d\u00e1n v\u00e0o m\u1ee5c Google AI Studio (Gemini) t\u1ea1i C\u00e0i \u0111\u1eb7t API."
      ],
      models: [
        {
          id: "gemini-3.8-flash",
          rawModel: "gemini-3.8-flash",
          label: "Gemini 3.8 Flash (M\u1eb7c \u0111\u1ecbnh \u2022 Nhanh & Vision/PDF)",
          vision: true,
          pdf: true,
          free: true,
          contextWindow: "1M+"
        },
        {
          id: "gemini-3.5-flash-lite",
          rawModel: "gemini-3.5-flash-lite",
          label: "Gemini 3.5 Flash-Lite (Si\u00eau nhanh / Quota l\u1edbn)",
          vision: true,
          pdf: true,
          free: true,
          contextWindow: "1M"
        },
        {
          id: "gemini-2.5-flash-lite",
          rawModel: "gemini-2.5-flash-lite",
          label: "Gemini 2.5 Flash-Lite (\u1ed4n \u0111\u1ecbnh \u2022 Vision/PDF)",
          vision: true,
          pdf: true,
          free: true,
          contextWindow: "1M"
        },
        {
          id: "gemini-2.5-flash",
          rawModel: "gemini-2.5-flash",
          label: "Gemini 2.5 Flash (Legacy \u2014 t\u1ef1 \u0111\u1ecbnh tuy\u1ebfn 3.5 Flash-Lite)",
          vision: true,
          pdf: true,
          free: true,
          contextWindow: "1M"
        },
        {
          id: "gemini-4-argon",
          rawModel: "gemini-4-argon",
          label: "Gemini 4 Argon (Ch\u00ednh x\u00e1c cao \u2022 Tr\u1ea3 ph\u00ed)",
          vision: true,
          pdf: true,
          free: false,
          contextWindow: "1M+"
        }
      ]
    },
    {
      id: "openai",
      name: "OpenAI",
      prefix: "sk-",
      prefixHint: "sk-...",
      recommended: false,
      badgeText: "Tr\u1ea3 ph\u00ed \u2022 C\u1ea7n n\u1ea1p t\u1ed1i thi\u1ec3u",
      keyUrl: "https://platform.openai.com/api-keys",
      keyUrlLabel: "platform.openai.com/api-keys",
      endpoint: "https://api.openai.com/v1/chat/completions",
      testEndpoint: "https://api.openai.com/v1/models",
      format: "openai",
      freeTierSummary: "D\u1ecbch v\u1ee5 tr\u1ea3 ph\u00ed theo token (c\u1ea7n n\u1ea1p t\u1ed1i thi\u1ec3u $5 v\u00e0o Billing), ch\u1ea5t l\u01b0\u1ee3ng Vision & tu\u00e2n th\u1ee7 JSON \u1ed5n \u0111\u1ecbnh cao.",
      guideSteps: [
        "Truy c\u1eadp https://platform.openai.com/api-keys v\u00e0 \u0111\u0103ng nh\u1eadp t\u00e0i kho\u1ea3n OpenAI.",
        "V\u00e0o Billing n\u1ea1p credit t\u1ed1i thi\u1ec3u ($5 USD), sau \u0111\u00f3 quay l\u1ea1i API Keys nh\u1ea5n Create new secret key.",
        "Sao ch\u00e9p m\u00e3 kh\u00f3a sk-... v\u00e0 d\u00e1n \u0111\u00fang v\u00e0o tab c\u1ee7a h\u00e3ng OpenAI (tr\u00e1nh nh\u1ea7m v\u1edbi DeepSeek c\u0169ng d\u00f9ng \u0111\u1ea7u sk-)."
      ],
      models: [
        {
          id: "openai:gpt-4.1-mini",
          rawModel: "gpt-4.1-mini",
          label: "OpenAI GPT-4.1 Mini (Nhanh, ng\u1eef c\u1ea3nh 1M & Vision)",
          vision: true,
          pdf: false,
          free: false,
          contextWindow: "1M"
        },
        {
          id: "openai:gpt-4o-mini",
          rawModel: "gpt-4o-mini",
          label: "OpenAI GPT-4o Mini (Ti\u1ebft ki\u1ec7m & Vision)",
          vision: true,
          pdf: false,
          free: false,
          contextWindow: "128K"
        },
        {
          id: "openai:gpt-4o",
          rawModel: "gpt-4o",
          label: "OpenAI GPT-4o (Ch\u00ednh x\u00e1c cao & Vision)",
          vision: true,
          pdf: false,
          free: false,
          contextWindow: "128K"
        },
        {
          id: "openai:gpt-5-mini",
          rawModel: "gpt-5-mini",
          label: "OpenAI GPT-5 Mini (Suy lu\u1eadn & Vision)",
          vision: true,
          pdf: false,
          free: false,
          contextWindow: "400K"
        }
      ]
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      prefix: "sk-",
      prefixHint: "sk-...",
      recommended: false,
      badgeText: "Tr\u1ea3 ph\u00ed gi\u00e1 r\u1ebb \u2022 M\u1ea1nh To\u00e1n & Suy lu\u1eadn",
      keyUrl: "https://platform.deepseek.com/api_keys",
      keyUrlLabel: "platform.deepseek.com/api_keys",
      endpoint: "https://api.deepseek.com/chat/completions",
      testEndpoint: "https://api.deepseek.com/models",
      format: "openai",
      freeTierSummary: "Chi ph\u00ed r\u1ea5t r\u1ebb (~$0.25/1M input), c\u1ef1c m\u1ea1nh khi gi\u1ea3i b\u00e0i t\u1eadp To\u00e1n/L\u00fd/H\u00f3a v\u00e0 suy lu\u1eadn logic b\u1eb1ng v\u0103n b\u1ea3n (kh\u00f4ng h\u1ed7 tr\u1ee3 \u0111\u1ecdc \u1ea3nh Vision).",
      guideSteps: [
        "M\u1edf https://platform.deepseek.com/api_keys v\u00e0 \u0111\u0103ng nh\u1eadp t\u00e0i kho\u1ea3n DeepSeek.",
        "N\u1ea1p s\u1ed1 d\u01b0 t\u1ed1i thi\u1ec3u \u1edf m\u1ee5c Top up, sau \u0111\u00f3 nh\u1ea5n Create new API key.",
        "Sao ch\u00e9p m\u00e3 kh\u00f3a sk-... v\u00e0 d\u00e1n v\u00e0o \u0111\u00fang tab DeepSeek trong C\u00e0i \u0111\u1eb7t API."
      ],
      models: [
        {
          id: "deepseek:deepseek-chat",
          rawModel: "deepseek-chat",
          label: "DeepSeek Chat V3 (Gi\u1ea3i \u0111\u1ec1 & Chu\u1ea9n h\u00f3a)",
          vision: false,
          pdf: false,
          free: false,
          contextWindow: "128K"
        },
        {
          id: "deepseek:deepseek-reasoner",
          rawModel: "deepseek-reasoner",
          label: "DeepSeek Reasoner R1 (To\u00e1n/L\u00fd/H\u00f3a chuy\u00ean s\u00e2u)",
          vision: false,
          pdf: false,
          free: false,
          contextWindow: "128K"
        }
      ]
    }
  ];

  const DEFAULT_MODEL_ID = "gemini-3.5-flash-lite";

  const PROVIDER_MAP = {};
  const ALLOWED_MODELS = {};
  PROVIDERS.forEach(function (p) {
    PROVIDER_MAP[p.id] = p;
    (p.models || []).forEach(function (m) {
      ALLOWED_MODELS[m.id] = {
        id: m.id,
        rawModel: m.rawModel,
        label: m.label,
        provider: p.id,
        vision: !!m.vision,
        pdf: !!m.pdf,
        free: !!m.free,
        contextWindow: m.contextWindow || ""
      };
    });
  });

  // Configurable cross-provider failover order for System Default Pool
  const FALLBACK_ORDER = ["gemini", "groq", "openrouter"];

  // Capability-safe free fallback model mapping (Vision requests NEVER route to text-only models)
  const FALLBACK_MODEL_MAP = {
    text: {
      gemini: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"],
      groq: ["groq:qwen/qwen3.6-27b", "groq:openai/gpt-oss-120b", "groq:openai/gpt-oss-20b"],
      openrouter: ["openrouter:openrouter/free", "openrouter:qwen/qwen2.5-vl-72b-instruct:free"],
      openai: ["openai:gpt-4.1-mini", "openai:gpt-4o-mini"],
      deepseek: ["deepseek:deepseek-chat"]
    },
    vision: {
      gemini: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"],
      groq: ["groq:qwen/qwen3.6-27b"],
      openrouter: ["openrouter:openrouter/free", "openrouter:qwen/qwen2.5-vl-72b-instruct:free"],
      openai: ["openai:gpt-4.1-mini", "openai:gpt-4o-mini"],
      deepseek: [] // DeepSeek text models do not support vision inputs
    },
    pdf: {
      gemini: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"],
      groq: [],
      openrouter: [],
      openai: [],
      deepseek: []
    }
  };

  const PRO_TIP = {
    title: "M\u1eb9o hay (Pro Tip): T\u1ef1 \u0111\u1ed9ng xoay v\u00f2ng kh\u00f4ng lo h\u1ebft Quota",
    body: "B\u1ea1n c\u00f3 th\u1ec3 d\u00e1n nhi\u1ec1u API Key t\u1eeb nhi\u1ec1u t\u00e0i kho\u1ea3n ho\u1eb7c Google Cloud Project KH\u00c1C NHAU m\u00e0 CH\u00cdNH B\u1ea0N S\u1ede H\u1eeeU v\u00e0o \u00f4 nh\u1eadp theo t\u1eebng h\u00e3ng \u0111\u1ec3 h\u1ec7 th\u1ed1ng t\u1ef1 \u0111\u1ed9ng xoay v\u00f2ng khi 1 key ch\u1ea1m gi\u1edbi h\u1ea1n. L\u01b0u \u00fd: c\u00e1c key t\u1ea1o trong C\u00d9NG m\u1ed9t Google Cloud Project s\u1ebd d\u00f9ng chung quota v\u1edbi nhau, v\u00e0 h\u00e3y lu\u00f4n tu\u00e2n th\u1ee7 \u0110i\u1ec1u kho\u1ea3n s\u1eed d\u1ee5ng (Terms of Service) c\u1ee7a t\u1eebng nh\u00e0 cung c\u1ea5p."
  };

  const DISCLAIMER_BANNER_TEXT = "B\u1ea1n \u0111ang s\u1eed d\u1ee5ng API Key mi\u1ec5n ph\u00ed m\u1eb7c \u0111\u1ecbnh \u0111\u01b0\u1ee3c cung c\u1ea5p b\u1edfi h\u1ec7 th\u1ed1ng. Do d\u00f9ng chung n\u00ean h\u1ea1n m\u1ee9c (quota) th\u1ea5p v\u00e0 c\u00f3 th\u1ec3 b\u1ecb ch\u1eadm ho\u1eb7c gi\u00e1n \u0111o\u1ea1n. \u0110\u1ec3 c\u00f3 tr\u1ea3i nghi\u1ec7m m\u01b0\u1ee3t m\u00e0 v\u00e0 kh\u00f4ng gi\u1edbi h\u1ea1n, h\u00e3y c\u00e2n nh\u1eafc s\u1eed d\u1ee5ng API Key c\u00e1 nh\u00e2n c\u1ee7a b\u1ea1n.";

  function validateKeyFormat(provider, rawKey) {
    const k = String(rawKey || "").trim();
    if (!k) return { valid: false, reason: "Tr\u1ed1ng" };
    // No prefix or string-pattern enforcement: accept any non-empty trimmed key;
    // actual validity is verified solely via live API health check against the provider.
    return { valid: true, reason: "S\u1eb5n s\u00e0ng (ki\u1ec3m tra tr\u1ef1c ti\u1ebfp qua API)" };
  }

  return {
    DEFAULT_MODEL_ID: DEFAULT_MODEL_ID,
    PROVIDERS: PROVIDERS,
    PROVIDER_MAP: PROVIDER_MAP,
    ALLOWED_MODELS: ALLOWED_MODELS,
    FALLBACK_ORDER: FALLBACK_ORDER,
    FALLBACK_MODEL_MAP: FALLBACK_MODEL_MAP,
    PRO_TIP: PRO_TIP,
    DISCLAIMER_BANNER_TEXT: DISCLAIMER_BANNER_TEXT,
    validateKeyFormat: validateKeyFormat
  };
});
