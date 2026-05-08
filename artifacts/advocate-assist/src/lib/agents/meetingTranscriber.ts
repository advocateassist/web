// ── Meeting Transcriber — DeepSeek V4 Pro (deepseek-reasoner) ────────────────
// Runs AFTER utilityNode when the upload is an audio file.
// Takes the raw Gemini transcript (state.ocrText) and structures it as a
// professional, paragraphic Case Note using Advocate tonality from llm.py.
//
// Fallback chain: deepseek-reasoner → deepseek-chat

import type { AgentState } from "./state";
import { MODELS } from "@/lib/config/modelRegistry";
import { OutputCleaner } from "@/lib/utils/outputCleaner";
import { callModel } from "./callModel";

const ADVOCATE_CASE_NOTE_TEMPLATE = `
STRUCTURE:

Case Note
=========
Parties: [names of parties mentioned, or "Not specified"]
Matter: [brief description of the legal matter discussed]
Date of Recording: [date if mentioned, else "Not specified"]
Forum/Court: [court or office, if mentioned]

Facts Discussed
---------------
[Paragraph form — integrate all facts and context seamlessly. No bullets.]

Legal Issues Identified
-----------------------
[Each legal issue as a distinct paragraph. Reference applicable statutes (BNS/BNSS/BSA for post-2024 incidents, IPC/CrPC for pre-2024). No bullets.]

Action Items / Next Steps
-------------------------
[Paragraph form — what needs to be done, by whom, by when.]

Important Dates & Deadlines
-----------------------------
[Paragraph form — only if dates were mentioned.]
`.trim();

const CONSUMER_SUMMARY_TEMPLATE = `
STRUCTURE:

Meeting Summary
===============
What was discussed: [brief one-line summary]
Date: [if mentioned]

Key Points
----------
Step 1: [first action or point]
Step 2: [next action or point]
(Continue numbering as needed)

What to do next: [clear next action for the user]
Important deadline: [if any, else omit this line]
`.trim();

export async function meetingTranscriberNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const rawTranscript = state.ocrText;
  if (!rawTranscript || rawTranscript.includes("[OCR unavailable")) {
    return {
      finalResponse: "[Transcription unavailable — could not process audio]",
      lastModelUsed: MODELS.LEGAL_CHECKER,
      fallbackOccurred: false,
      activeNode: "meetingTranscriber",
    };
  }

  const userQuery = state.messages[state.messages.length - 1]?.content ?? "";
  const template = state.persona === "Advocate"
    ? ADVOCATE_CASE_NOTE_TEMPLATE
    : CONSUMER_SUMMARY_TEMPLATE;

  const structurePrompt = `You are structuring a raw audio transcript into a professional legal document.

STRICT RULES:
- Advocate mode: ZERO bullet points, ZERO markdown headers, ZERO numbered lists.
  Write ONLY in flowing, formal paragraphs — exactly as a senior Indian advocate would write case notes.
- Consumer mode: numbered steps are permitted. Keep language plain and accessible.
- Do NOT fabricate facts. Use ONLY information present in the transcript.
- Preserve all section numbers, case names, dates, and legal terms verbatim.
- SCRIPT RULE: Even if the transcript or output is in Hindi or any regional language, ALL legal terms MUST remain in English script: FIR, Bail, Anticipatory Bail, High Court, Supreme Court, Section, Writ, Injunction, Stay Order, Habeas Corpus, PIL, SLP, BNS, BNSS, BSA, IPC, CrPC, POCSO, NDPS, Charge Sheet, Vakalatnama.

${state.persona === "Advocate" ? "MODE: ADVOCATE — paragraphic only" : "MODE: CONSUMER — clear steps"}

${template}

RAW TRANSCRIPT:
${rawTranscript}

${userQuery ? `ADDITIONAL CONTEXT FROM USER: ${userQuery}` : ""}

Now write the structured ${state.persona === "Advocate" ? "Case Note" : "Meeting Summary"} following the template exactly.`;

  const result = await callModel({
    model: MODELS.LEGAL_CHECKER, // deepseek-reasoner = DeepSeek V4 Pro
    system: state.persona === "Advocate"
      ? "You are a senior Indian advocate writing formal case notes. Use paragraphs only — no bullets, no markdown."
      : "You are helping an Indian citizen understand their legal situation. Use simple, clear language.",
    messages: [{ role: "user", content: structurePrompt }],
    maxTokens: 1200,
  });

  const cleaned = OutputCleaner.clean(result.text, state.persona);

  return {
    finalResponse: cleaned,
    lastModelUsed: result.modelUsed,
    fallbackOccurred: result.fallbackOccurred,
    activeNode: "meetingTranscriber",
  };
}
