// ── Tier-2 Regex Classifier — pure function, no LLM ──────────────────────────
//
// Used as a fast fallback when the Tier-1 LLM triage call fails or returns
// unparseable JSON. Patterns are ordered by specificity (most specific first).
//
// Returns null if no pattern matches — caller must handle the null case
// (Tier-3 graceful failure or default intent).

import type { QueryType } from "@/types/agent";

type PatternMap = Partial<Record<QueryType, RegExp[]>>;

const PATTERNS: PatternMap = {
  // ── Extraction ────────────────────────────────────────────────────────────
  extraction: [
    /\bextract\b/i,
    /\bsummari[sz]e\b.*\b(this|the)\b.*(document|pdf|file|notice|order)/i,
    /\bwhat(?:'s| is) in (this|the)\b/i,
    /\btranslate\b.*(document|pdf|notice|order)/i,
    /\bread (this|the)\b.*(document|pdf|file)/i,
  ],

  // ── Elite draft (complex petitions / applications) ────────────────────────
  eliteDraft: [
    /\bdraft\b.*(petition|writ|written statement|application under section|bail application|anticipatory bail|vakalatnama|affidavit|plaint)\b/i,
    /\bwrit petition\b/i,
    /\banticipatory bail\b/i,
    /\bhabeas corpus\b/i,
    /\bslp\b/i,
    /\bpil\b.*(file|draft|prepare)/i,
    /\bunder section \d+.*of.*(bns|bnss|crpc|ipc)/i,
  ],

  // ── Basic draft (letters, notices, simple complaints, will, agreements) ──────
  basicDraft: [
    /\bdraft\b.*(letter|notice|complaint|reply|email|noc|consent|demand|legal notice)\b/i,
    /\bwrite\b.*(letter|email|notice|complaint)\b/i,
    /\bprepare\b.*(letter|notice|noc)\b/i,
    /\bneed\b.*(letter|notice|draft)\b/i,
    // Will / testament
    /\b(write|draft|prepare|make|create|banana|banwana|banaiye|banao)\b.{0,40}\b(will|testament|wasiyat|wasiyatnama)\b/i,
    /\b(will|testament|wasiyat|wasiyatnama)\b.{0,60}\b(write|draft|prepare|make|distribute|property|assets|death|maut|death)\b/i,
    /\bsimple will\b/i,
    /\bwill banw/i,
    /\bwill banana\b/i,
    // Agreements / deeds / rent
    /\b(write|draft|prepare|make|create)\b.{0,40}\b(agreement|contract|deed|rent|lease)\b/i,
    /\b(rent|lease|employment|service|partnership)\b.*\bagreement\b/i,
    // Generic Hinglish drafting intent
    /\b(document|agreement|letter|notice|will|petition)\b.*\b(banana|banwana|banaiye|banao|likhna|likhwana|chahiye|chahte)\b/i,
    /\b(banana|banwana|banaiye|banao|likhna|likhwana)\b.{0,60}\b(will|agreement|letter|petition|notice|document)\b/i,
  ],

  // ── Research ──────────────────────────────────────────────────────────────
  research: [
    /\bcase (law |)on\b/i,
    /\bjudgment on\b/i,
    /\bwhat does (the |)law say\b/i,
    /\bprecedent\b/i,
    /\bcase law\b/i,
    /\bcourt ruling\b/i,
    /\b(supreme court|high court).*(held|ruled|decided)\b/i,
    /\blegal position on\b/i,
    /\bsection \d+\b.*(ipc|bns|crpc|bnss|pocso|ndps)\b/i,
  ],

  // ── Complex reasoning (advice / strategy / analysis) ─────────────────────
  complexReasoning: [
    /\bwhat should i do\b/i,
    /\badvi[sc]e me\b/i,
    /\bhow (do i|should i|can i)\b.*(proceed|handle|challenge|appeal|fight|respond)\b/i,
    /\bwhat are my (rights|options|remedies)\b/i,
    /\blegal (opinion|advice|strategy|analysis)\b/i,
    /\bis it legal\b/i,
    /\bcan (they|he|she|the police|the court)\b/i,
  ],
};

// Priority order — most specific intent wins (eliteDraft before basicDraft)
const PRIORITY_ORDER: QueryType[] = [
  "extraction",
  "eliteDraft",
  "basicDraft",
  "research",
  "complexReasoning",
];

/**
 * Tier-2 regex classifier. Pure function — no I/O, O(n patterns).
 *
 * @param message    - Raw user message string
 * @param _hasAttachment - Reserved for future per-attachment overrides
 * @returns The matched QueryType, or null if no pattern matches
 */
export function regexClassifier(
  message: string,
  _hasAttachment: boolean
): QueryType | null {
  for (const intent of PRIORITY_ORDER) {
    const patterns = PATTERNS[intent];
    if (patterns && patterns.some((p) => p.test(message))) {
      return intent;
    }
  }
  return null;
}
