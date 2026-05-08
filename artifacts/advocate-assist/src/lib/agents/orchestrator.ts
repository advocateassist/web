// ── Advocate Assist — Sovereign Orchestrator v3.1 ────────────────────────────
//
// State is persisted via MemorySaver (in-process checkpointer).
// Each conversation is keyed by thread_id supplied by the client.
//
// Pipeline (intent-first, all exits converge through outputNormalizer):
//
//   START → supervisor (two-tier triage: LLM → regex → graceful failure)
//     ├─ isVague / draftClarification / intake    → outputNormalizer → END
//     ├─ classificationSource=fallback_error       → outputNormalizer → END
//     ├─ sessionLimit                             → sessionGuard → outputNormalizer → END
//     │
//     ├─ hasAttachment (extraction)               → utility → outputNormalizer → END
//     ├─ hasAttachment (audio)                    → utility → meetingTranscriber → outputNormalizer → END
//     ├─ hasAttachment (other intent)             → utility → postUploadClassifier → ROUTING_TABLE → outputNormalizer → END
//     │
//     └─ text-only queries (ROUTING_TABLE):
//          research / eliteDraft   → researchMaker → legalChecker
//          │                             ├─ flagged + attempts < 2 → researchMaker (loop)
//          │                             └─ passed → eliteReasoner / basicDrafter → outputNormalizer → END
//          basicDraft              → basicDrafter → outputNormalizer → END
//          complexReasoning:STANDARD → standardReasoner (DeepSeek V4 Pro) → outputNormalizer → END
//          complexReasoning:ELITE   → eliteReasoner   (Claude Sonnet 4.6) → outputNormalizer → END
//
//     outputNormalizer → supervisor  ← [INSUFFICIENT_CONTEXT] Option A (first attempt)
//     outputNormalizer → END         ← all other cases

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentStateAnnotation, type AgentState } from "./state";
import { supervisorNode } from "./supervisor";
import { researchMakerNode } from "./researchMaker";
import { legalCheckerNode } from "./legalChecker";
import { basicDrafterNode } from "./basicDrafter";
import { eliteReasonerNode } from "./eliteReasoner";
import { standardReasonerNode } from "./standardReasoner";
import { utilityNode } from "./utilityNode";
import { meetingTranscriberNode } from "./meetingTranscriber";
import { postUploadClassifierNode } from "./postUploadClassifier";
import { outputNormalizerNode } from "./outputNormalizer";
import { CTAS } from "@/lib/config/ctas";
import { SESSION_TOKEN_LIMIT } from "@/lib/config/modelRegistry";

// ── Session limit guard ───────────────────────────────────────────────────────
async function sessionGuardNode(state: AgentState): Promise<Partial<AgentState>> {
  const url = state.persona === "Advocate" ? CTAS.LAWYER_WHATSAPP : CTAS.CUSTOMER_WHATSAPP;
  return {
    finalResponse: `Session limit reached. Please start a new chat.\n\n📄 Continue on WhatsApp: ${url}`,
    activeNode: "sessionGuard",
  };
}

// ── Consolidated routing table (intent → first downstream node) ───────────────
// Both personas share the same routing for now.
// To add per-persona routing, nest by persona key: ROUTING_TABLE[persona][qt]
// NOTE: "complexReasoning" is NOT in this table — it branches on complexityScore
//       via explicit logic in routeFromSupervisor and routeFromPostUploadClassifier.
const ROUTING_TABLE: Record<string, string> = {
  research:   "researchMaker",
  eliteDraft: "researchMaker",  // → legalChecker → eliteReasoner via routeFromChecker
  basicDraft: "basicDrafter",
};

// ── Routing ───────────────────────────────────────────────────────────────────

function routeFromStart(state: AgentState): string {
  if (state.sessionTokens >= SESSION_TOKEN_LIMIT) return "sessionGuard";
  return "supervisor";
}

function routeFromSupervisor(state: AgentState): string {
  // isVague or Tier-3 classification failure → outputNormalizer (emits clarification / error)
  if (state.isVague) return "outputNormalizer";
  // Attachment present: always go through the utility (OCR) node first
  if (state.hasAttachment) return "utility";
  // complexReasoning branches on complexity_score for cost optimisation
  if (state.queryType === "complexReasoning") {
    return state.complexityScore === "ELITE" ? "eliteReasoner" : "standardReasoner";
  }
  // All other intents: consult routing table; unknown intents default to standardReasoner
  return ROUTING_TABLE[state.queryType] ?? "standardReasoner";
}

function routeFromUtility(state: AgentState): string {
  const isAudio = state.attachmentMimeType?.startsWith("audio/") ?? false;
  if (isAudio) return "meetingTranscriber";
  // Pure extraction: utility set finalResponse directly → normalizer emits it
  if (state.queryType === "extraction") return "outputNormalizer";
  // All other intents with a document → postUploadClassifier for context-aware re-classification
  return "postUploadClassifier";
}

function routeFromPostUploadClassifier(state: AgentState): string {
  // Tier-3 failure: finalResponse is set with error message → outputNormalizer emits it
  if (state.classificationSource === "fallback_error") return "outputNormalizer";
  // complexReasoning branches on complexity_score for cost optimisation
  if (state.queryType === "complexReasoning") {
    return state.complexityScore === "ELITE" ? "eliteReasoner" : "standardReasoner";
  }
  // All other intents: consult routing table; unknown intents default to standardReasoner
  return ROUTING_TABLE[state.queryType] ?? "standardReasoner";
}

function routeFromChecker(state: AgentState): string {
  if (state.flagged && state.researchAttempts < 2) return "researchMaker";
  return state.queryType === "basicDraft" ? "basicDrafter" : "eliteReasoner";
}

function routeFromNormalizer(state: AgentState): string {
  // [INSUFFICIENT_CONTEXT] first attempt: normalizer cleared finalResponse → supervisor re-runs
  if (!state.finalResponse && state.insufficientContextAttempts === 1) {
    return "supervisor";
  }
  return END as string;
}

// ── Singleton graph with MemorySaver ──────────────────────────────────────────
// The MemorySaver persists thread state in-process (Node.js warm module).
// For multi-instance production, swap with a Redis/Postgres checkpointer.

const _checkpointer = new MemorySaver();
let _graph: ReturnType<typeof _buildGraph> | null = null;

function _buildGraph() {
  return new StateGraph(AgentStateAnnotation)
    .addNode("supervisor", supervisorNode)
    .addNode("utility", utilityNode)
    .addNode("meetingTranscriber", meetingTranscriberNode)
    .addNode("postUploadClassifier", postUploadClassifierNode)
    .addNode("researchMaker", researchMakerNode)
    .addNode("legalChecker", legalCheckerNode)
    .addNode("basicDrafter", basicDrafterNode)
    .addNode("eliteReasoner", eliteReasonerNode)
    .addNode("standardReasoner", standardReasonerNode)
    .addNode("sessionGuard", sessionGuardNode)
    .addNode("outputNormalizer", outputNormalizerNode)

    .addConditionalEdges(START, routeFromStart)
    .addConditionalEdges("supervisor", routeFromSupervisor)
    .addConditionalEdges("utility", routeFromUtility)
    .addConditionalEdges("postUploadClassifier", routeFromPostUploadClassifier)
    .addEdge("researchMaker", "legalChecker")
    .addConditionalEdges("legalChecker", routeFromChecker)

    // All terminal nodes → outputNormalizer (no direct exits to END)
    .addEdge("meetingTranscriber", "outputNormalizer")
    .addEdge("basicDrafter", "outputNormalizer")
    .addEdge("eliteReasoner", "outputNormalizer")
    .addEdge("standardReasoner", "outputNormalizer")
    .addEdge("sessionGuard", "outputNormalizer")

    // outputNormalizer → END (normal) or → supervisor ([INSUFFICIENT_CONTEXT] retry)
    .addConditionalEdges("outputNormalizer", routeFromNormalizer)

    .compile({ checkpointer: _checkpointer });
}

/** Return the singleton compiled graph (lazy-init). */
export function getOrchestrator() {
  if (!_graph) _graph = _buildGraph();
  return _graph;
}

/** @deprecated Use getOrchestrator() instead. */
export function buildOrchestrator() {
  return getOrchestrator();
}
