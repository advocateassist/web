// ── /api/chat — SSE streaming endpoint ───────────────────────────────────────
// Streams live agent status, fallback events, and final response via SSE.

import { auth } from "@/auth";
import { getOrchestrator } from "@/lib/agents/orchestrator";
import type { Citation, Persona } from "@/types/agent";
import { SESSION_WARNING_THRESHOLD, MODELS } from "@/lib/config/modelRegistry";
import { CTAS } from "@/lib/config/ctas";
import { db, chatTurnsTable } from "@workspace/db";

// ── Server-authoritative history flag ────────────────────────────────────────
// Must stay in sync with SERVER_AUTHORITATIVE_HISTORY in state.ts.
// When flipped to true, also update the frontend to send only the new user turn.
// Do not flip this flag without completing Section 1.5 frontend coordination.
const SERVER_AUTHORITATIVE_HISTORY = false;

// ── Per-user rate limiter (in-memory, 8 req / 60 s per user) ─────────────────
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export const runtime = "nodejs";
export const maxDuration = 120;

// ── Request size limits ───────────────────────────────────────────────────────
/** Hard byte cap on the streamed request body (25 MB) */
const MAX_BODY_BYTES = 25 * 1024 * 1024;
/** Maximum base64 attachment string length (~20 MB binary after decoding) */
const MAX_ATTACHMENT_B64_CHARS = 27_000_000;
/** Maximum number of history messages accepted */
const MAX_HISTORY_MESSAGES = 200;
/** Maximum length for the query string */
const MAX_QUERY_CHARS = 10_000;
/** Maximum length for pre-extracted OCR text */
const MAX_OCR_TEXT_CHARS = 20_000;

class RequestTooLargeError extends Error {
  constructor() { super("Request body too large"); }
}

/**
 * Reads the request body as a string while enforcing a hard byte limit.
 * Cancels the stream and throws RequestTooLargeError if the limit is exceeded,
 * regardless of whether a Content-Length header is present.
 */
async function readBodyWithLimit(req: Request, maxBytes: number): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) return "";

  let total = 0;
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        reader.cancel().catch(() => {});
        throw new RequestTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

// ── Human-readable status labels ──────────────────────────────────────────────
const NODE_STATUS_MESSAGES: Record<string, string> = {
  supervisor:              "Classifying your query...",
  utility:                 "Extracting text from your document...",
  utilityTranslate:        "Translating your document...",
  meetingTranscriber:      "Structuring your meeting notes...",
  researchMaker:           "Searching legal databases...",
  legalChecker:            "Verifying legal citations...",
  basicDrafter:            "Drafting your document...",
  eliteReasoner:           "Generating your response...",
  standardReasoner:        "Analysing your legal question...",
  sessionGuard:            "Checking session...",
  postUploadClassifier:    "Analysing document context...",
  outputNormalizer:        "Preparing response...",
};

// Primary model for each node (used for fallback detection)
const NODE_PRIMARY_MODELS: Record<string, string> = {
  supervisor:         MODELS.SUPERVISOR,
  researchMaker:      MODELS.RESEARCH_MAKER,
  legalChecker:       MODELS.LEGAL_CHECKER,
  meetingTranscriber: MODELS.LEGAL_CHECKER,
  basicDrafter:       MODELS.BASIC_DRAFTER,
  eliteReasoner:      MODELS.ELITE_REASONER,
  standardReasoner:   MODELS.STANDARD,
};

function getFallbackLabel(modelUsed: string): string {
  if (modelUsed.startsWith("claude-"))    return "Claude 4.6 Sonnet";
  if (modelUsed === "deepseek-reasoner") return "DeepSeek V4 Pro";
  if (modelUsed === "deepseek-chat")     return "DeepSeek V4 Flash";
  if (modelUsed.startsWith("gemini-"))   return "Gemini 2.5 Flash";
  if (modelUsed.includes("sonar"))       return "Perplexity sonar-reasoning";
  return modelUsed;
}

export async function POST(req: Request) {
  // ── Authentication check ───────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Authentication required." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Onboarding and consent authorization ───────────────────────────────────
  const u = session.user;
  if (
    !u.isOnboarded ||
    !u.termsAccepted ||
    !u.dataConsentAccepted ||
    !u.aiDisclaimerAccepted
  ) {
    return new Response(
      JSON.stringify({ error: "Account setup incomplete. Please complete onboarding before using the assistant." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Rate limit (8 requests / 60 s per user) ───────────────────────────────
  const userId = session.user.email ?? session.user.id ?? "unknown";
  if (!checkRateLimit(userId)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment before trying again." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Streaming body read with hard byte cap ─────────────────────────────────
  let rawBody: string;
  try {
    rawBody = await readBodyWithLimit(req, MAX_BODY_BYTES);
  } catch (err) {
    if (err instanceof RequestTooLargeError) {
      return new Response(
        JSON.stringify({ error: "Request body too large" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }
    throw err;
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const {
    query,
    persona = "Consumer",
    language = "en",
    history = [],
    attachmentData,
    attachmentMimeType,
    prextractedOcrText,
    threadId,
  } = body as {
    query: string;
    persona?: "Advocate" | "Consumer";
    language?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    attachmentData?: string;
    attachmentMimeType?: string;
    /** Pre-extracted text from the /api/ocr pre-flight call in the UI */
    prextractedOcrText?: string;
    /** Stable conversation ID for MemorySaver state persistence across turns */
    threadId?: string;
  };

  // ── Post-parse field size guards ───────────────────────────────────────────
  if (Array.isArray(history) && history.length > MAX_HISTORY_MESSAGES) {
    return new Response(
      JSON.stringify({ error: "Chat history exceeds maximum allowed length" }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }

  if (typeof attachmentData === "string" && attachmentData.length > MAX_ATTACHMENT_B64_CHARS) {
    return new Response(
      JSON.stringify({ error: "Attachment data too large" }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }

  if (typeof query === "string" && query.length > MAX_QUERY_CHARS) {
    return new Response(
      JSON.stringify({ error: "Query text too large" }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }

  if (typeof prextractedOcrText === "string" && prextractedOcrText.length > MAX_OCR_TEXT_CHARS) {
    return new Response(
      JSON.stringify({ error: "Pre-extracted OCR text too large" }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!query?.trim() && !attachmentData) {
    return new Response(
      JSON.stringify({ error: "Please provide more details about your legal query." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      function checkAndEmitFallback(nodeName: string, chunk: Record<string, unknown>) {
        const lastModelUsed = chunk.lastModelUsed as string | undefined;
        const fallbackOccurred = chunk.fallbackOccurred as boolean | undefined;
        const primaryModel = NODE_PRIMARY_MODELS[nodeName];
        // Only emit fallback when a different (cheaper) model was actually used.
        // If no primary model is registered for the node (e.g. utility) or the
        // model used equals the primary, this is not a real model fallback.
        if (fallbackOccurred && lastModelUsed && primaryModel && lastModelUsed !== primaryModel) {
          send({
            step: "fallback",
            node: nodeName,
            modelUsed: lastModelUsed,
            modelLabel: getFallbackLabel(lastModelUsed),
            primaryModel,
          });
        }
      }

      // ── Analytics tracking — hoisted before try so catch/finally can read them ─
      // Stable thread ID for MemorySaver — use provided ID or fall back to user-scoped default
      const effectiveThreadId = threadId?.trim() || `${userId}-default`;
      // Unique run ID for telemetry and outputNormalizer error fallback
      const runId = crypto.randomUUID();
      let capturedQueryType = "";
      let capturedIsVague = false;
      let capturedClassificationSource = "";
      let capturedTriageModel = "";
      let capturedTriageFallback = false;
      let capturedStreamError: string | null = null;
      const turnStart = Date.now();

      try {
        const orchestrator = getOrchestrator();
        send({ step: "status", node: "supervisor", message: NODE_STATUS_MESSAGES.supervisor });

        // ── Persona-mismatch security check ──────────────────────────────────
        // Fetch existing checkpoint to detect if incoming persona differs from
        // the locked persona in state. Locked value always wins silently.
        try {
          const existingState = await orchestrator.getState({
            configurable: { thread_id: effectiveThreadId },
          });
          const lockedPersona = existingState.values?.persona as Persona | undefined;
          if (
            lockedPersona &&
            (lockedPersona === "Advocate" || lockedPersona === "Consumer") &&
            lockedPersona !== persona
          ) {
            console.error(JSON.stringify({
              event: "persona_mismatch",
              session_id: effectiveThreadId,
              locked_persona: lockedPersona,
              incoming_persona: persona,
              run_id: runId,
              ip: req.headers.get("x-forwarded-for") ?? "unknown",
            }));
          }
        } catch {
          // Non-fatal — first turn has no checkpoint, getState returns empty
        }

        // Build user message — inject pre-extracted OCR text if available
        const userContent =
          prextractedOcrText && prextractedOcrText.length > 10
            ? `${query?.trim() ?? ""}${query?.trim() ? "\n\n" : ""}[Document content pre-scanned]\n${prextractedOcrText.slice(0, 3000)}`
            : (query?.trim() ?? "");

        // ── Message history — controlled by SERVER_AUTHORITATIVE_HISTORY flag ──
        // When false (current): client sends full history, state.messages is replaced.
        // When true (future):   client sends only new turn, state.messages accumulates.
        // Flip both this flag and the one in state.ts simultaneously with frontend update.
        const messages = SERVER_AUTHORITATIVE_HISTORY
          ? [{ role: "user" as const, content: userContent || "[Document attached]" }]
          : [
              ...history,
              { role: "user" as const, content: userContent || "[Document attached]" },
            ];

        const sessionTokens = history.reduce(
          (n, m) => n + Math.ceil(m.content.length / 4),
          0
        );

        if (sessionTokens >= SESSION_WARNING_THRESHOLD) {
          send({
            step: "warning",
            message: "Approaching session limit — consider starting a new chat soon.",
          });
        }

        const graphStream = await orchestrator.stream(
          {
            messages,
            persona,
            language,
            hasAttachment: !!(attachmentData && attachmentMimeType),
            attachmentData: attachmentData ?? "",
            attachmentMimeType: attachmentMimeType ?? "",
            sessionTokens,
            runId,
          },
          {
            streamMode: "updates",
            configurable: { thread_id: effectiveThreadId },
          }
        );

        for await (const chunkRaw of graphStream) {
          const chunk = chunkRaw as Record<string, Record<string, unknown>>;

          // ── Supervisor ────────────────────────────────────────────────────
          if (chunk.supervisor) {
            const s = chunk.supervisor;
            capturedQueryType = (s.queryType as string) ?? "";
            capturedIsVague = !!(s.isVague);
            capturedClassificationSource = (s.classificationSource as string) ?? "";
            capturedTriageModel = (s.lastModelUsed as string) ?? "";
            capturedTriageFallback = !!(s.fallbackOccurred);
            checkAndEmitFallback("supervisor", s);
            // No early return — isVague paths now flow to outputNormalizer
            send({
              step: "thought",
              node: "supervisor",
              era: s.era,
              queryType: s.queryType,
              isVague: s.isVague,
              lastModelUsed: s.lastModelUsed,
              fallbackOccurred: s.fallbackOccurred,
            });
          }

          // ── Utility (OCR / transcription / extraction) ────────────────────
          if (chunk.utility) {
            const u = chunk.utility;
            checkAndEmitFallback("utility", u);
            const isAudio = (u.attachmentMimeType as string)?.startsWith("audio/") ??
              attachmentMimeType?.startsWith("audio/");
            const isExtraction = capturedQueryType === "extraction";
            const wantsTranslation = /translat/i.test(query ?? "");
            const statusMsg = isAudio
              ? "Gemini 2.0 Flash is transcribing your audio recording..."
              : isExtraction && wantsTranslation
                ? NODE_STATUS_MESSAGES.utilityTranslate
                : NODE_STATUS_MESSAGES.utility;
            send({ step: "status", node: "utility", message: statusMsg });
            send({
              step: "thought",
              node: "utility",
              isAudio,
              isExtraction,
              ocrText: typeof u.ocrText === "string" ? u.ocrText.slice(0, 120) + "…" : "",
              lastModelUsed: u.lastModelUsed,
              fallbackOccurred: u.fallbackOccurred,
            });
            // Extraction path now routes to outputNormalizer — no early return here
          }

          // ── Meeting Transcriber ───────────────────────────────────────────
          if (chunk.meetingTranscriber) {
            const mt = chunk.meetingTranscriber;
            checkAndEmitFallback("meetingTranscriber", mt);
            send({ step: "status", node: "meetingTranscriber", message: NODE_STATUS_MESSAGES.meetingTranscriber });
            send({
              step: "thought",
              node: "meetingTranscriber",
              lastModelUsed: mt.lastModelUsed,
              fallbackOccurred: mt.fallbackOccurred,
            });
            // complete is emitted by outputNormalizer — not here
          }

          // ── Post-Upload Classifier ────────────────────────────────────────
          if (chunk.postUploadClassifier) {
            const puc = chunk.postUploadClassifier;
            // Update captured queryType with the document-aware re-classification
            if (puc.queryType) capturedQueryType = puc.queryType as string;
            send({
              step: "status",
              node: "postUploadClassifier",
              message: NODE_STATUS_MESSAGES.postUploadClassifier,
            });
            send({
              step: "thought",
              node: "postUploadClassifier",
              queryType: puc.queryType,
              classificationSource: puc.classificationSource,
              docContext: typeof puc.docContext === "string"
                ? puc.docContext.slice(0, 100)
                : "",
            });
            // If classificationSource="fallback_error", finalResponse is set
            // and outputNormalizer will emit it. Nothing extra needed here.
          }

          // ── Research Maker ────────────────────────────────────────────────
          if (chunk.researchMaker) {
            const r = chunk.researchMaker;
            checkAndEmitFallback("researchMaker", r);
            const attempts = (r.researchAttempts as number) ?? 1;
            const statusMsg = attempts > 1
              ? "Hallucination flagged — re-searching for correct statute references..."
              : NODE_STATUS_MESSAGES.researchMaker;
            send({
              step: "status",
              node: "researchMaker",
              message: statusMsg,
              lastModelUsed: r.lastModelUsed,
              fallbackOccurred: r.fallbackOccurred,
            });
            const citations = (r.citations as Citation[]) ?? [];
            send({
              step: "citations",
              citations,
              message: `Found ${citations.length} case reference(s). Auditing...`,
            });
            send({
              step: "thought",
              node: "researchMaker",
              researchAttempts: attempts,
              citationCount: citations.length,
              isRetry: attempts > 1,
              lastModelUsed: r.lastModelUsed,
              fallbackOccurred: r.fallbackOccurred,
            });
          }

          // ── Legal Checker ─────────────────────────────────────────────────
          if (chunk.legalChecker) {
            const lc = chunk.legalChecker;
            checkAndEmitFallback("legalChecker", lc);
            send({ step: "status", node: "legalChecker", message: NODE_STATUS_MESSAGES.legalChecker });

            const flagged = lc.flagged as boolean;
            const hallucinationDetected = lc.hallucinationDetected as boolean;
            const hallucinationReason = lc.hallucinationReason as string | undefined;
            const citations = (lc.citations as Citation[]) ?? [];

            if (hallucinationDetected) {
              send({
                step: "hallucination",
                node: "legalChecker",
                reason: hallucinationReason ?? "Statute era mismatch detected",
                message: "Hallucination detected — triggering BNS re-search...",
                lastModelUsed: lc.lastModelUsed,
              });
            }

            send({
              step: "verifying",
              flagged,
              hallucinationDetected,
              citations,
              message: hallucinationDetected
                ? `Hallucination confirmed (${hallucinationReason ?? "era mismatch"}) — re-searching...`
                : flagged
                  ? "Citations flagged — re-searching authoritative sources..."
                  : `Citations audited — ${citations.length} verified.`,
            });

            send({
              step: "thought",
              node: "legalChecker",
              flagged,
              hallucinationDetected,
              hallucinationReason: hallucinationReason ?? "",
              verifiedCitations: citations.length,
              routingDecision: flagged
                ? "loop → researchMaker (hallucination retry)"
                : `pass → ${lc.queryType === "basicDraft" ? "basicDrafter" : "eliteReasoner"}`,
              lastModelUsed: lc.lastModelUsed,
              fallbackOccurred: lc.fallbackOccurred,
            });
          }

          // ── Basic Drafter ─────────────────────────────────────────────────
          if (chunk.basicDrafter) {
            const bd = chunk.basicDrafter;
            checkAndEmitFallback("basicDrafter", bd);
            send({ step: "status", node: "basicDrafter", message: NODE_STATUS_MESSAGES.basicDrafter });
            send({
              step: "thought",
              node: "basicDrafter",
              lastModelUsed: bd.lastModelUsed,
              fallbackOccurred: bd.fallbackOccurred,
            });
            // complete is emitted by outputNormalizer — not here
          }

          // ── Elite Reasoner ────────────────────────────────────────────────
          if (chunk.eliteReasoner) {
            const er = chunk.eliteReasoner;
            checkAndEmitFallback("eliteReasoner", er);
            send({ step: "status", node: "eliteReasoner", message: NODE_STATUS_MESSAGES.eliteReasoner });
            send({
              step: "thought",
              node: "eliteReasoner",
              lastModelUsed: er.lastModelUsed,
              fallbackOccurred: er.fallbackOccurred,
            });
            // complete is emitted by outputNormalizer — not here
          }

          // ── Standard Reasoner ─────────────────────────────────────────────
          if (chunk.standardReasoner) {
            const sr = chunk.standardReasoner;
            checkAndEmitFallback("standardReasoner", sr);
            send({ step: "status", node: "standardReasoner", message: NODE_STATUS_MESSAGES.standardReasoner });
            send({
              step: "thought",
              node: "standardReasoner",
              lastModelUsed: sr.lastModelUsed,
              fallbackOccurred: sr.fallbackOccurred,
            });
            // complete is emitted by outputNormalizer — not here
          }

          // ── Session Guard ─────────────────────────────────────────────────
          if (chunk.sessionGuard) {
            send({ step: "thought", node: "sessionGuard", lastModelUsed: "", fallbackOccurred: false });
            // complete is emitted by outputNormalizer — not here
          }

          // ── Output Normalizer — sole emitter of complete events ───────────
          if (chunk.outputNormalizer) {
            const norm = chunk.outputNormalizer;
            const finalContent = norm.finalResponse as string;

            if (!finalContent) {
              // [INSUFFICIENT_CONTEXT] re-route: normalizer cleared finalResponse,
              // supervisor will re-run next. Emit status and wait for the next pass.
              send({
                step: "status",
                node: "supervisor",
                message: "Seeking additional context for your query...",
              });
            } else {
              // All content decisions (CTA, teaser, cleaning) were made by normalizer
              const isDraft =
                capturedQueryType === "eliteDraft" ||
                capturedQueryType === "basicDraft";
              const isExtraction = capturedQueryType === "extraction";
              const isSessionLimit =
                norm.activeNode === "sessionGuard" ||
                (typeof norm.finalResponse === "string" &&
                  (norm.finalResponse as string).startsWith("Session limit reached"));

              send({
                step: "complete",
                content: finalContent,
                persona,
                isVague: capturedIsVague,
                isExtraction,
                isSessionLimit,
                showCta: !capturedIsVague && !isDraft && !isExtraction && !isSessionLimit,
                lastModelUsed: (norm.lastModelUsed as string) ?? "",
              });
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        capturedStreamError = message;
        send({ step: "error", message });
      } finally {
        controller.close();

        // ── Fire-and-forget analytics write ──────────────────────────────────
        // Never awaited — must never block or crash the SSE response.
        const isDropOff = capturedClassificationSource === "fallback_error";
        const errorType = capturedStreamError
          ? "stream_error"
          : isDropOff
            ? "classification_failure"
            : (capturedTriageFallback && capturedTriageModel === "gemini-2.5-flash-lite")
              ? "gemini_503"
              : null;

        void db.insert(chatTurnsTable).values({
          runId:                  runId,
          threadId:               effectiveThreadId,
          userId:                 userId,
          persona:                persona,
          language:               language ?? "en",
          queryLength:            typeof query === "string" ? query.length : 0,
          hasAttachment:          !!(attachmentData && attachmentMimeType),
          intent:                 capturedQueryType || null,
          classificationSource:   capturedClassificationSource || null,
          triageModelUsed:        capturedTriageModel || null,
          triageFallbackOccurred: capturedTriageFallback,
          isVague:                capturedIsVague,
          isDropOff:              isDropOff,
          errorType:              errorType,
          latencyMs:              Date.now() - turnStart,
        }).catch((dbErr: unknown) => {
          // Log but never surface to user — analytics must not affect UX
          console.error("[analytics] chat_turns insert failed:", dbErr instanceof Error ? dbErr.message : String(dbErr));
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
