// ── Elite Reasoner / Drafter — Claude 4.6 Sonnet (claude-sonnet-4-6) ─────────
// Fallback chain: claude-sonnet-4-6 → deepseek-reasoner → deepseek-chat
// LATENCY GUARD: claude-opus-4-7 is NEVER called.

import type { AgentState } from "./state";
import { MODELS } from "@/lib/config/modelRegistry";
import { OutputCleaner } from "@/lib/utils/outputCleaner";
import { getEraInstruction } from "@/lib/utils/eraSegregator";
import { LAWYER_SYSTEM_PROMPT } from "@/lib/prompts/lawyerSystemPrompt";
import { CUSTOMER_SYSTEM_PROMPT } from "@/lib/prompts/customerSystemPrompt";
import { callModel } from "./callModel";

// CTA suffix injection is handled by outputNormalizer — do not add here.

/** Build a session-state context block so the LLM never re-asks for known facts. */
function buildStateContext(state: AgentState): string {
  const lines: string[] = [
    "── SESSION CONTEXT (DO NOT RE-ASK ANY OF THESE) ──────────────────────────",
  ];

  if (state.era !== "unknown") {
    lines.push(`• Era LOCKED: ${state.era}. The incident date is already determined — do NOT ask for it.`);
  } else if (state.intakeComplete) {
    lines.push("• Intake checklist has already been sent. Do NOT ask for incident date or case details again — await user's reply.");
  }

  if (state.location) {
    lines.push(`• Court/location already known: ${state.location}. Do NOT ask for it again.`);
  }

  if (state.facts) {
    lines.push(`• Prior case facts: ${state.facts.slice(0, 400)}`);
  }

  if (state.ocrText) {
    lines.push("• Document already processed: The user's uploaded file has been OCR'd and its text is incorporated in the conversation above. Do NOT say you cannot process files.");
  }

  lines.push(
    "• FILE UPLOAD: This platform CAN process PDFs, images, and audio files via OCR. Never tell users you cannot process attachments. If a user says they 'can upload' a document but hasn't attached one yet, tell them to use the attachment (📎) button."
  );

  return lines.join("\n");
}

export async function eliteReasonerNode(state: AgentState): Promise<Partial<AgentState>> {
  const userMessage = state.messages[state.messages.length - 1]?.content ?? "";
  const eraInstruction = getEraInstruction(state.era);
  const basePrompt = state.persona === "Advocate" ? LAWYER_SYSTEM_PROMPT : CUSTOMER_SYSTEM_PROMPT;
  const isDraftRequest = state.queryType === "eliteDraft";
  const stateContext = buildStateContext(state);

  const system = `${basePrompt}

${stateContext}

${eraInstruction ? `ERA RULE (ENFORCED): ${eraInstruction}` : "ERA STATUS: Incident date not yet determined — do NOT ask again if the intake checklist was already sent. Wait for user's reply."}

${isDraftRequest ? `DRAFTING RULE: Generate the COMPLETE document from start to finish.
Use all available case facts — do NOT use placeholder text such as "[Name]" or "[Address]".
Produce a polished, court-ready draft in its entirety with all required clauses and sections.` : ""}

${state.citations && state.citations.length > 0
    ? `VERIFIED CITATIONS (audited by Legal Checker):
${JSON.stringify(state.citations, null, 2)}
${state.flagged ? "WARNING: Some citations were flagged. Exercise caution." : ""}`
    : ""}

SCRIPT RULE: ${state.script === "latin"
    ? "Respond in formal Indian English."
    : `Respond in ${state.script} script. Keep these legal terms in English: FIR, Bail, High Court, Supreme Court, Anticipatory Bail, Charge Sheet, Cognizance, PIL, SLP, NDPS, POCSO, Section numbers, Writ, Injunction, Stay Order, Vakalatnama, Habeas Corpus.`}`;

  // Pass full conversation history so the model has context from prior turns
  const historyWindow = state.messages.slice(-8);
  const result = await callModel({
    model: MODELS.ELITE_REASONER,
    system,
    messages: historyWindow,
    maxTokens: 3500,
  });

  const cleaned = OutputCleaner.clean(result.text, state.persona);

  return {
    finalResponse: cleaned,
    lastModelUsed: result.modelUsed,
    fallbackOccurred: result.fallbackOccurred,
    activeNode: "eliteReasoner",
  };
}
