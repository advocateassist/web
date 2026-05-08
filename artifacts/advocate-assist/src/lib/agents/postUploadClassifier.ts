// ── Post-Upload Classifier — re-classification with document context ──────────
//
// Runs after the utility (OCR) node when the attachment is NOT a raw extraction
// or audio request. Re-classifies the query intent using the extracted OCR text.
//
// DAG-safe: only routes FORWARD to researchMaker, basicDrafter, eliteReasoner,
// or outputNormalizer (on Tier-3 failure). Cannot route back to utility.
//
// Two-tier classification:
//  Tier-1: LLM with document context (DeepSeek V4 Flash, 200 tokens)
//  Tier-2: Regex fallback (regexClassifier pure function)
//  Tier-3: Graceful failure → sets finalResponse + classificationSource="fallback_error"
//          → outputNormalizer emits the persona-aware error to the user

import type { AgentState } from "./state";
import type { QueryType } from "@/types/agent";
import { MODELS } from "@/lib/config/modelRegistry";
import { regexClassifier } from "@/lib/utils/regexClassifier";
import { callModel } from "./callModel";

const ALLOWED_INTENTS = new Set<QueryType>([
  "research", "basicDraft", "eliteDraft", "complexReasoning",
]);

function buildClassificationPrompt(
  userMessage: string,
  ocrText: string,
  persona: string,
  priorIntent: string
): string {
  return (
    `You are a legal query classifier. A user uploaded a document and asked a question.\n` +
    `Given the document text and the user's message, determine what they want.\n\n` +
    `PERSONA: ${persona}\n` +
    `PRIOR INTENT (before document was available): ${priorIntent}\n\n` +
    `USER'S MESSAGE:\n${userMessage.slice(0, 1000)}\n\n` +
    `DOCUMENT TEXT (first 2000 chars):\n${ocrText.slice(0, 2000)}\n\n` +
    `Classify into exactly one intent:\n` +
    `- "research"         — user wants analysis, case law, or legal position on the document\n` +
    `- "basicDraft"       — user wants a simple letter/notice/reply drafted using the document\n` +
    `- "eliteDraft"       — user wants a complex petition/application drafted using the document\n` +
    `- "complexReasoning" — user wants legal advice, strategy, or detailed analysis of the document\n\n` +
    `Also write a 1-3 sentence plain-English document summary (docContext).\n\n` +
    `Respond ONLY with valid JSON (no markdown):\n` +
    `{"intent":"...","docContext":"..."}`
  );
}

export async function postUploadClassifierNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const startMs = Date.now();
  const userMessage = state.messages[state.messages.length - 1]?.content ?? "";

  let queryType: QueryType = state.queryType;
  let classificationSource: AgentState["classificationSource"] = "";
  let docContext = "";

  // ── Tier-1: LLM with OCR context ─────────────────────────────────────────
  try {
    const result = await callModel({
      model: MODELS.SUPERVISOR,
      messages: [{
        role: "user",
        content: buildClassificationPrompt(
          userMessage,
          state.ocrText || "",
          state.persona,
          state.queryType,
        ),
      }],
      maxTokens: 200,
      responseFormat: "json",
    });

    const jsonMatch = result.text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { intent?: string; docContext?: string };
      const intent = parsed.intent as QueryType;
      if (ALLOWED_INTENTS.has(intent)) {
        queryType = intent;
        classificationSource = "llm";
        docContext = (parsed.docContext ?? "").slice(0, 500);
      }
    }
  } catch {
    // Tier-1 failed — fall through to Tier-2
    console.error("[postUploadClassifier] Tier-1 LLM call failed — trying regex");
  }

  // ── Tier-2: Regex fallback ────────────────────────────────────────────────
  if (classificationSource !== "llm") {
    const regexResult = regexClassifier(userMessage, true);
    if (regexResult && ALLOWED_INTENTS.has(regexResult)) {
      queryType = regexResult;
      classificationSource = "regex";
      console.error(`[postUploadClassifier] Tier-2 regex classified as "${regexResult}"`);
    }
  }

  // ── Tier-3: Graceful failure ──────────────────────────────────────────────
  if (!classificationSource) {
    classificationSource = "fallback_error";
    const fallbackMsg =
      state.persona === "Advocate"
        ? "I extracted text from the document but could not determine what you need me to do with it. Could you clarify whether you need research, drafting, or legal analysis?"
        : "I read your document but I'm not sure what you'd like me to do next. Could you tell me — do you need advice, a draft letter, or an explanation of your rights?";

    console.error(JSON.stringify({
      event: "classification_failure",
      run_id: state.runId,
      node: "postUploadClassifier",
      persona: state.persona,
      classification_source: "fallback_error",
      message_length: userMessage.length,
      latency_ms: Date.now() - startMs,
    }));

    return {
      queryType: "complexReasoning",
      classificationSource: "fallback_error",
      docContext: "",
      // Non-empty finalResponse signals outputNormalizer to emit the error
      // and routeFromPostUploadClassifier to go to outputNormalizer
      finalResponse: fallbackMsg,
      activeNode: "postUploadClassifier",
    };
  }

  // ── Structured telemetry ──────────────────────────────────────────────────
  console.log(JSON.stringify({
    event: "classification_complete",
    run_id: state.runId,
    node: "postUploadClassifier",
    persona: state.persona,
    classification_source: classificationSource,
    query_type: queryType,
    message_length: userMessage.length,
    latency_ms: Date.now() - startMs,
  }));

  return {
    queryType,
    classificationSource,
    docContext,
    activeNode: "postUploadClassifier",
  };
}
