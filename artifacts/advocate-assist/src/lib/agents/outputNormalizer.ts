// ── Output Normalizer — single convergence point for all graph exits ───────────
//
// Every terminal node routes here before END. This node is the sole emitter of
// final user-facing content. No sub-agent bypasses it.
//
// Responsibilities (in order):
//  1. Choose source field: clarificationMessage (isVague paths) or finalResponse (all others)
//  2. Detect [INSUFFICIENT_CONTEXT:...] — Option A loop guard:
//     a. First occurrence (insufficientContextAttempts=0): append missing-info note to
//        last user message, clear finalResponse, route back to supervisor via empty string.
//     b. Second occurrence (>0): strip token, produce graceful user-facing message.
//  3. Apply OutputCleaner.clean() with persona-appropriate rules
//  4. Strip any leaked chain-of-thought artifacts
//  5. Inject draft teaser CTA suffix for eliteDraft / basicDraft intents
//  6. Self-error fallback: persona-aware message wraps any normalization exception
//
// routeFromNormalizer in orchestrator.ts reads state.finalResponse:
//   - empty string  → re-route to supervisor ([INSUFFICIENT_CONTEXT] first attempt)
//   - non-empty     → END

import type { AgentState } from "./state";
import { CTAS } from "@/lib/config/ctas";
import { OutputCleaner } from "@/lib/utils/outputCleaner";

const INSUFFICIENT_CONTEXT_RE = /\[INSUFFICIENT_CONTEXT:\s*([^\]]+)\]/;

function buildTeaserSuffix(persona: "Advocate" | "Consumer"): string {
  return persona === "Advocate"
    ? `\n\n---\n💬 Need to discuss this draft or require court representation? Connect with a verified advocate on WhatsApp: ${CTAS.LAWYER_WHATSAPP}`
    : `\n\n---\n💬 Want one-on-one guidance from a real advocate on this document? Connect here: ${CTAS.CUSTOMER_WHATSAPP}`;
}

function normalizerFallback(persona: "Advocate" | "Consumer"): string {
  return persona === "Advocate"
    ? "I encountered an issue formatting the response. The underlying analysis is logged for debugging. Please retry, or contact support if the issue persists."
    : "Something went wrong on our end. Please try your question again. If this continues, message us on WhatsApp.";
}

export async function outputNormalizerNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  try {
    // ── 1. Choose source field ─────────────────────────────────────────────────
    // isVague paths (supervisor clarifications): read clarificationMessage
    // All other paths (terminal nodes): read finalResponse
    const raw = state.isVague
      ? (state.clarificationMessage || "")
      : (state.finalResponse || "");

    if (!raw.trim()) {
      return {
        finalResponse: normalizerFallback(state.persona),
        activeNode: "outputNormalizer",
      };
    }

    // ── 2. [INSUFFICIENT_CONTEXT] detection — Option A loop guard ─────────────
    const insufficientMatch = raw.match(INSUFFICIENT_CONTEXT_RE);
    if (insufficientMatch) {
      if (state.insufficientContextAttempts === 0) {
        // First occurrence: append missing-info note to last user message and
        // route back to supervisor. Empty finalResponse signals routeFromNormalizer.
        const missingInfo = insufficientMatch[1].trim();
        const lastMsg = state.messages[state.messages.length - 1]?.content ?? "";
        return {
          messages: [
            ...state.messages.slice(0, -1),
            {
              role: "user",
              content: `${lastMsg}\n\n[CONTEXT NEEDED BY SYSTEM: ${missingInfo}]`,
            },
          ],
          insufficientContextAttempts: 1,
          finalResponse: "",    // empty → routeFromNormalizer sends to supervisor
          clarificationMessage: "",
          activeNode: "outputNormalizer",
        };
      }
      // Second occurrence: strip token and fall through to normal cleaning.
      // The user gets the best response we can produce without the missing info.
    }

    // ── 3. OutputCleaner ──────────────────────────────────────────────────────
    let cleaned = OutputCleaner.clean(raw, state.persona);

    // ── 4. Strip any surviving [INSUFFICIENT_CONTEXT:...] token ──────────────
    cleaned = cleaned.replace(INSUFFICIENT_CONTEXT_RE, "").trim();

    if (!cleaned) {
      return {
        finalResponse: normalizerFallback(state.persona),
        activeNode: "outputNormalizer",
      };
    }

    // ── 5. Draft teaser CTA injection ─────────────────────────────────────────
    // Only for actual draft intents — never for clarification messages or extractions.
    const isDraft =
      !state.isVague &&
      (state.queryType === "eliteDraft" || state.queryType === "basicDraft");

    if (
      isDraft &&
      !cleaned.includes(CTAS.LAWYER_WHATSAPP) &&
      !cleaned.includes(CTAS.CUSTOMER_WHATSAPP)
    ) {
      cleaned = cleaned + buildTeaserSuffix(state.persona);
    }

    return {
      finalResponse: cleaned,
      activeNode: "outputNormalizer",
    };
  } catch (err) {
    // ── 6. Self-error fallback ────────────────────────────────────────────────
    console.error(
      JSON.stringify({
        event: "output_normalizer_failure",
        run_id: state.runId,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return {
      finalResponse: normalizerFallback(state.persona),
      activeNode: "outputNormalizer",
    };
  }
}
