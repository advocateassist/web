// ── Basic Drafter — DeepSeek V4 Flash (deepseek-chat) ────────────────────────
// Per May 2026 engineering spec: BASIC_DRAFTER = deepseek-chat (V4 Flash).
// Fallback chain: deepseek-chat → gemini-2.0-flash

import type { AgentState } from "./state";
import { MODELS } from "@/lib/config/modelRegistry";
import { OutputCleaner } from "@/lib/utils/outputCleaner";
import { getEraInstruction } from "@/lib/utils/eraSegregator";
import { LAWYER_SYSTEM_PROMPT } from "@/lib/prompts/lawyerSystemPrompt";
import { CUSTOMER_SYSTEM_PROMPT } from "@/lib/prompts/customerSystemPrompt";
import { callModel } from "./callModel";

// CTA suffix injection is handled by outputNormalizer — do not add here.

/** Build session-state context block so the LLM never re-asks for known facts. */
function buildStateContext(state: AgentState): string {
  const lines: string[] = [
    "── SESSION CONTEXT (DO NOT RE-ASK ANY OF THESE) ──────────────────────────",
  ];

  if (state.era !== "unknown") {
    lines.push(`• Era LOCKED: ${state.era}. Incident date already determined — do NOT ask for it.`);
  } else if (state.intakeComplete) {
    lines.push("• Intake checklist already sent. Do NOT ask for incident date or case details again.");
  }

  if (state.location) {
    lines.push(`• Court/location already known: ${state.location}. Do NOT ask for it again.`);
  }

  if (state.facts) {
    lines.push(`• Prior case facts: ${state.facts.slice(0, 400)}`);
  }

  if (state.ocrText) {
    lines.push("• Document already OCR'd and text is in the conversation above. Do NOT say you cannot process files.");
  }

  lines.push(
    "• FILE UPLOAD: This platform CAN process PDFs, images, and audio via OCR. Never tell users you cannot process attachments. If they say they 'can upload', tell them to use the attachment (📎) button."
  );

  return lines.join("\n");
}

export async function basicDrafterNode(state: AgentState): Promise<Partial<AgentState>> {
  const userMessage = state.messages[state.messages.length - 1]?.content ?? "";
  const eraInstruction = getEraInstruction(state.era);
  const basePrompt = state.persona === "Advocate" ? LAWYER_SYSTEM_PROMPT : CUSTOMER_SYSTEM_PROMPT;
  const stateContext = buildStateContext(state);

  const system = `${basePrompt}

${stateContext}

${eraInstruction ? `ERA RULE (ENFORCED): ${eraInstruction}` : "ERA STATUS: Incident date not yet confirmed — do NOT ask again if checklist was already sent."}

${state.facts
    ? `GATHERED CLIENT INFORMATION (personal details provided by the client — incorporate EVERY item into the draft, do NOT use generic placeholder text such as "[Name]" or "[Address]"):
${state.facts}
`
    : ""}DRAFTING RULE: Generate the COMPLETE document using the client's actual details above.
Do NOT use placeholder text such as "[Name]" or "[Address]" — fill in every field from the facts provided.
Produce a well-structured, court-ready draft from beginning to end.

${state.citations && state.citations.length > 0
    ? `VERIFIED CITATIONS TO INCORPORATE:\n${JSON.stringify(state.citations, null, 2)}`
    : ""}

SCRIPT RULE: ${state.script === "latin"
    ? "Respond in formal Indian English."
    : `Respond in ${state.script} script. Keep ALL of the following legal terms in English script verbatim — do NOT translate them: FIR, Bail, Anticipatory Bail, High Court, Supreme Court, Charge Sheet, Cognizance, PIL, SLP, NDPS, POCSO, Section, Writ, Injunction, Stay Order, Vakalatnama, Habeas Corpus, BNS, BNSS, BSA, IPC, CrPC, RTI, IBC, RERA.`}`;

  // Pass conversation history so the draft has context from prior turns
  const historyWindow = state.messages.slice(-6);
  const result = await callModel({
    model: MODELS.BASIC_DRAFTER,
    system,
    messages: historyWindow,
    maxTokens: 4000,
  });

  const cleaned = OutputCleaner.clean(result.text, state.persona);

  return {
    finalResponse: cleaned,
    lastModelUsed: result.modelUsed,
    fallbackOccurred: result.fallbackOccurred,
    activeNode: "basicDrafter",
  };
}
