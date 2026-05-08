// ── Analytics — Chat Turn Log ─────────────────────────────────────────────────
//
// One row per /api/chat POST. Written fire-and-forget at the end of every turn.
// Never blocks the SSE stream. Survives failed writes silently (analytics must
// never interrupt the user experience).
//
// Key columns for dashboards:
//  is_drop_off = true   → customer got the Tier-3 fallback ("I'm having trouble…")
//  is_vague = true      → clarification question was sent (funnel step, not error)
//  error_type           → gemini_503 | classification_failure | stream_error | etc.
//  classification_source → llm | regex | fallback_error (for funnel quality)

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const chatTurnsTable = pgTable("chat_turns", {
  id:                       uuid("id").primaryKey().defaultRandom(),

  // ── Identity ───────────────────────────────────────────────────────────────
  runId:                    text("run_id").notNull(),         // unique per graph invocation
  threadId:                 text("thread_id").notNull(),      // MemorySaver session key
  userId:                   text("user_id").notNull(),        // authenticated user

  // ── Request context ────────────────────────────────────────────────────────
  persona:                  text("persona").notNull(),        // "Advocate" | "Consumer"
  language:                 text("language"),
  queryLength:              integer("query_length"),          // char count (not stored verbatim)
  hasAttachment:            boolean("has_attachment").notNull().default(false),

  // ── Classification outcome ─────────────────────────────────────────────────
  intent:                   text("intent"),                   // queryType: basicDraft, research …
  classificationSource:     text("classification_source"),   // llm | regex | fallback_error
  triageModelUsed:          text("triage_model_used"),       // gemini-2.5-flash, gemini-2.0-flash …
  triageFallbackOccurred:   boolean("triage_fallback_occurred").notNull().default(false),

  // ── Response flags ─────────────────────────────────────────────────────────
  isVague:                  boolean("is_vague").notNull().default(false),    // clarification turn
  isDropOff:                boolean("is_drop_off").notNull().default(false), // Tier-3 fallback fired

  // ── Error tracking ─────────────────────────────────────────────────────────
  errorType:                text("error_type"),   // null = success | gemini_503 | classification_failure | stream_error

  // ── Performance ───────────────────────────────────────────────────────────
  latencyMs:                integer("latency_ms"),

  // ── Timestamp ─────────────────────────────────────────────────────────────
  createdAt:                timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatTurn = typeof chatTurnsTable.$inferSelect;
export type InsertChatTurn = typeof chatTurnsTable.$inferInsert;
