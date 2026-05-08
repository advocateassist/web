// ── Core domain types for the Advocate Assist agentic orchestrator ────────────

export type Persona = "Advocate" | "Consumer";

// Tracks which classification tier produced the queryType for a given turn.
// Emitted in structured telemetry logs for observability.
export type ClassificationSource =
  | "llm"            // DeepSeek tier-1 classifier succeeded
  | "regex"          // Tier-2 regex fallback matched
  | "fallback_error" // Both tiers failed — routed to outputNormalizer error path
  | "";              // Default / not yet classified this turn

// Complexity tier assigned by supervisor for complexReasoning queries.
// Controls model selection: STANDARD → DeepSeek V4 Pro, ELITE → Claude Sonnet 4.6.
export type ComplexityScore = "STANDARD" | "ELITE" | "";

export type Script =
  | "latin"
  | "devanagari"
  | "tamil"
  | "bengali"
  | "telugu"
  | "gujarati"
  | "kannada"
  | "malayalam"
  | "odia";

export type Era = "pre-bns" | "post-bns" | "unknown";

export type QueryType =
  | "extraction"          // Extract / translate document content — no legal reasoning
  | "draftClarification"  // Draft intent but insufficient details — ask questions
  | "research"            // Case law, statutes, legal position
  | "basicDraft"          // Simple document with full details provided
  | "eliteDraft"          // Complex document with full details provided
  | "complexReasoning"    // Legal analysis, advice, rights, strategy
  | "vague"               // Unclassifiable — generic clarification
  | "ocr";

export type VerificationStatus =
  | "Pending"
  | "Verified"
  | "HallucinationDetected";

export interface Citation {
  caseTitle: string;
  citation: string;
  year: number;
  url: string;
  holding: string;
  relevantSection: string;
}

export interface Attachment {
  type: "pdf" | "image" | "audio";
  /** base64-encoded data URI */
  data: string;
  mimeType: string;
  name: string;
}

export interface OcrResult {
  extractedText: string;
  detectedDocType: string;
  pageCount: number;
}

export interface AgentState {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  persona: Persona;
  language: string;
  script: Script;
  offenseDate: Date | "unknown";
  era: Era;
  queryType: QueryType;
  isVague: boolean;
  hasAttachment: boolean;
  attachments?: Attachment[];
  ocrText?: string;
  ocrResult?: OcrResult;
  citations: Citation[];
  flagged: boolean;
  researchAttempts: number;
  sessionTokens: number;
  finalResponse?: string;
  clarificationMessage?: string;
}

// ── SSE payload shapes sent from /api/chat ────────────────────────────────────

export interface SsePayload {
  step:
    | "status"
    | "citations"
    | "verifying"
    | "drafting"
    | "complete"
    | "warning"
    | "error";
  message?: string;
  citations?: Citation[];
  content?: string;
  node?: string;
}

// ── Chat message shape for the UI ─────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  persona?: Persona;
  timestamp?: Date;
  /** true while the word-by-word reveal animation is running */
  isAnimating?: boolean;
  /** true when the WhatsApp CTA should be shown below this message */
  showCta?: boolean;
}
