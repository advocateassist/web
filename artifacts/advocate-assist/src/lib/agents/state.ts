import { Annotation } from "@langchain/langgraph";
import type { Citation, ClassificationSource, ComplexityScore, Persona, Script, Era, QueryType } from "@/types/agent";

// ── Feature flag: server-authoritative message history ────────────────────────
// When true: state accumulates messages via append reducer; route.ts sends only
// the new user turn. When false (current): state replaces messages each turn;
// route.ts sends full history. Flip only after frontend coordination is complete.
export const SERVER_AUTHORITATIVE_HISTORY = false;

export const AgentStateAnnotation = Annotation.Root({
  // ── Conversation history ──────────────────────────────────────────────────
  // SERVER_AUTHORITATIVE_HISTORY=false: replace reducer, client sends full history.
  // SERVER_AUTHORITATIVE_HISTORY=true:  append reducer, client sends only new turn.
  messages: Annotation<Array<{ role: "user" | "assistant"; content: string }>>({
    reducer: SERVER_AUTHORITATIVE_HISTORY
      ? (prev, next) => [...prev, ...next]
      : (_, b) => b,
    default: () => [],
  }),

  // ── Persona — LOCKED after first turn ────────────────────────────────────
  // Once set to "Advocate" or "Consumer" it cannot be changed for the session.
  // route.ts logs a persona_mismatch security event if incoming differs from locked.
  persona: Annotation<Persona>({
    reducer: (prev, next) =>
      prev === "Advocate" || prev === "Consumer" ? prev : next,
    default: () => undefined as unknown as Persona,
  }),
  language: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "en",
  }),
  script: Annotation<Script>({
    reducer: (_, b) => b,
    default: () => "latin",
  }),

  // ── Era locking — once post-bns or pre-bns, NEVER revert to unknown ─────────
  offenseDate: Annotation<Date | "unknown">({
    reducer: (a, b) => (a !== "unknown" ? a : b),
    default: () => "unknown",
  }),
  era: Annotation<Era>({
    reducer: (a, b) => (a !== "unknown" ? a : b),
    default: () => "unknown",
  }),

  queryType: Annotation<QueryType>({
    reducer: (_, b) => b,
    default: () => "complexReasoning",
  }),
  isVague: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),
  hasAttachment: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),
  attachmentData: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  attachmentMimeType: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  ocrText: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  citations: Annotation<Citation[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  flagged: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),

  // ── Hallucination tracking ────────────────────────────────────────────────
  hallucinationDetected: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),
  hallucinationReason: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),

  // ── Model transparency ────────────────────────────────────────────────────
  lastModelUsed: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  fallbackOccurred: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),

  researchAttempts: Annotation<number>({
    reducer: (_, b) => b,
    default: () => 0,
  }),
  sessionTokens: Annotation<number>({
    reducer: (_, b) => b,
    default: () => 0,
  }),
  finalResponse: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  clarificationMessage: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  activeNode: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),

  // ── Classification telemetry ──────────────────────────────────────────────
  // Tracks which tier produced the queryType classification for this turn.
  // Emitted in structured telemetry logs; used by outputNormalizer for CTA logic.
  classificationSource: Annotation<ClassificationSource>({
    reducer: (_, b) => b,
    default: () => "",
  }),

  // ── Complexity tier — set by supervisor for complexReasoning queries ──────
  // STANDARD → standardReasoner (DeepSeek V4 Pro, ~90% cheaper)
  // ELITE    → eliteReasoner (Claude Sonnet 4.6, reserved for high-stakes tasks)
  // ""       → default / not applicable for this intent
  complexityScore: Annotation<ComplexityScore>({
    reducer: (_, b) => b,
    default: () => "" as ComplexityScore,
  }),

  // ── Document context summary (persists + accumulates across turns) ────────
  // postUploadClassifier writes a 1-3 sentence document summary here.
  // Accumulates across turns so subsequent queries retain document awareness.
  docContext: Annotation<string>({
    reducer: (a, b) => {
      if (!b) return a;
      if (!a) return b;
      return `${a}\n${b}`;
    },
    default: () => "",
  }),

  // ── Routing path (append per turn — for debugging and normalizer CTA) ─────
  routingPath: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),

  // ── Insufficient-context loop guard (Option A) ─────────────────────────────
  // On first [INSUFFICIENT_CONTEXT] emission: increment and re-route to supervisor.
  // If counter > 0 on second emission: short-circuit to outputNormalizer fallback.
  insufficientContextAttempts: Annotation<number>({
    reducer: (_, b) => b,
    default: () => 0,
  }),

  // ── Consumer draft clarification loop guard ────────────────────────────────
  // Incremented each time the Consumer funnel issues a draftClarification turn.
  // When >= 2, the enforcer short-circuits to basicDraft with whatever facts exist.
  clarificationAttempts: Annotation<number>({
    reducer: (_, b) => b,
    default: () => 0,
  }),

  // ── Document in progress (persisted across draft intake turns) ─────────────
  // Stores the document type the Consumer wants drafted (e.g. "will", "rent agreement").
  // Prevents the funnel from reverting to generic questions on subsequent turns.
  targetDocument: Annotation<string>({
    reducer: (a, b) => b || a,   // update when new value provided, keep existing otherwise
    default: () => "",
  }),

  // ── Run ID — unique per graph invocation ──────────────────────────────────
  // Populated by route.ts from crypto.randomUUID() before each graph.stream() call.
  // Used in structured telemetry logs and outputNormalizer error fallback.
  runId: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),

  // ── Accumulated session context (persisted via MemorySaver) ──────────────
  /** Key case facts extracted from conversation — accumulate across turns */
  facts: Annotation<string>({
    reducer: (a, b) => {
      if (!b) return a;                        // no new facts — keep existing
      if (!a) return b;                        // nothing existing — use new
      if (a.includes(b)) return a;             // duplicate — skip
      return `${a}\n${b}`;                     // append new facts
    },
    default: () => "",
  }),
  /** Court / police station / jurisdiction mentioned by the user */
  location: Annotation<string>({
    reducer: (a, b) => (b ? b : a),            // update when provided, otherwise keep
    default: () => "",
  }),
  /** Derived script language of the target court's proceedings */
  courtLanguage: Annotation<string>({
    reducer: (a, b) => (b ? b : a),
    default: () => "",
  }),
  /** True once the user has answered the comprehensive legal intake checklist */
  intakeComplete: Annotation<boolean>({
    reducer: (a, b) => a || b,                 // once true, stays true
    default: () => false,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;

export interface VerifiableLink {
  title: string;
  url: string;
  snippet: string;
}
