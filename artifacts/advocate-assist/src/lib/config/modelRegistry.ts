// ── Model Registry — MAY 2026 SOTA ────────────────────────────────────────────
// Primary model IDs (verbatim, never substitute at declaration level).
// Fallback substitution happens exclusively inside callModel.ts.

export const MODELS = {
  // Ultra-low-latency triage — DeepSeek V4 Flash
  SUPERVISOR: "deepseek-chat",

  // OCR + transcription — Gemini 2.5 Flash (multimodal, supported by Replit AI Integrations)
  UTILITY: "gemini-2.5-flash",

  // Real-time Indian case law retrieval — Perplexity sonar-reasoning-pro
  RESEARCH_MAKER: "perplexity/sonar-reasoning-pro",

  // Citation auditor — DeepSeek V4 Pro
  LEGAL_CHECKER: "deepseek-reasoner",

  // Routine drafting — DeepSeek V4 Flash  (per 2026-05 engineering spec)
  BASIC_DRAFTER: "deepseek-chat",

  // Complex analysis + elite drafting — Claude 4.6 Sonnet
  ELITE_REASONER: "claude-sonnet-4-6",

  // History summariser — Claude 4.6 Sonnet (NOT Opus — latency guard)
  SUMMARISER: "claude-sonnet-4-6",

  // Emergency triage router fallback — Gemini 2.5 Flash
  EMERGENCY_ROUTER: "gemini-2.5-flash",

  // ── Semantic tier aliases (2026-05 unit-economics spec) ───────────────────
  // Maps complexity tiers to the appropriate model. Use these in new nodes.
  TRIAGE:   "deepseek-chat",       // Fast classification  (alias: SUPERVISOR)
  STANDARD: "deepseek-reasoner",   // STANDARD complexity  — DeepSeek V4 Pro (~90% cheaper than ELITE)
  REASONER: "deepseek-reasoner",   // Statutory logic tier — DeepSeek R2 (→ V4 Pro until R2 ships)
  ELITE:    "claude-sonnet-4-6",   // ELITE complexity     — Claude Sonnet 4.6 (alias: ELITE_REASONER)
} as const;

// ── Intelligent fallback chains ───────────────────────────────────────────────
// Each key is a primary model ID. Values are tried in order on 429/5xx/timeout.
// Resolved by callModel.ts — nodes never call fallbacks directly.
export const FALLBACK_CHAINS: Record<string, string[]> = {
  // Elite path: Claude → DeepSeek V4 Pro → DeepSeek V4 Flash
  "claude-sonnet-4-6": ["deepseek-reasoner", "deepseek-chat"],

  // Pro path: DeepSeek V4 Pro → DeepSeek V4 Flash
  "deepseek-reasoner": ["deepseek-chat"],

  // Flash path: DeepSeek V4 Flash → Gemini 2.5 Flash (emergency router)
  "deepseek-chat": ["gemini-2.5-flash"],

  // Research path: Perplexity → Gemini 2.5 Flash (with web-search instruction)
  "perplexity/sonar-reasoning-pro": ["gemini-2.5-flash"],

  // Gemini: no further fallback
  "gemini-2.5-flash": [],
};

// ── Token limits ──────────────────────────────────────────────────────────────
export const SESSION_TOKEN_LIMIT = 32000;
export const SESSION_WARNING_THRESHOLD = 24000;
export const MAX_TOKENS_RESPONSE = 4000;
export const MAX_TOKENS_SUMMARY = 150;
export const MESSAGES_TO_KEEP_FULL = 6;
export const SUMMARIZE_THRESHOLD = 8;

// ── Drafting intent keywords ──────────────────────────────────────────────────
export const DRAFT_KEYWORDS = [
  "draft","prepare","write","create document","notice","petition","affidavit",
  "complaint","bail application","vakalatnama","agreement","application","letter",
  "plaint","written statement","memo","writ petition","appeal",
];

// ── Legal terms preserved in Latin script in Indic responses ─────────────────
export const HYBRID_LEGAL_TERMS = [
  "FIR","Bail","Quashing","Affidavit","High Court","Supreme Court",
  "Section 302","Section 482","Vakalatnama","Habeas Corpus","PIL","SLP",
  "NDPS","POCSO","Anticipatory Bail","Charge Sheet","Cognizance","Summons",
  "Warrant","Writ","Stay Order","Injunction","Decree","Plaintiff","Defendant",
  "Petitioner","Respondent",
];

// ── Indic Unicode block ranges ────────────────────────────────────────────────
export const INDIC_UNICODE_BLOCKS = [
  { start: 0x0900, end: 0x097f, script: "devanagari" as const },
  { start: 0x0b80, end: 0x0bff, script: "tamil" as const },
  { start: 0x0980, end: 0x09ff, script: "bengali" as const },
  { start: 0x0c00, end: 0x0c7f, script: "telugu" as const },
  { start: 0x0a80, end: 0x0aff, script: "gujarati" as const },
  { start: 0x0c80, end: 0x0cff, script: "kannada" as const },
  { start: 0x0d00, end: 0x0d7f, script: "malayalam" as const },
  { start: 0x0b00, end: 0x0b7f, script: "odia" as const },
];
