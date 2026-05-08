// ── Research Maker — Perplexity sonar-reasoning-pro ──────────────────────────
// Fallback: perplexity/sonar-reasoning-pro → gemini-2.5-flash (research/web-search mode)

import type { AgentState } from "./state";
import type { Citation } from "@/types/agent";
import { MODELS } from "@/lib/config/modelRegistry";
import { getEraInstruction, isValidLegalUrl, isValidYear } from "@/lib/utils/eraSegregator";
import { callModel } from "./callModel";

function extractCitations(raw: string): Citation[] {
  try {
    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed as Citation[];
    }
  } catch { /* fall through */ }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Citation[];
  } catch { /* no-op */ }
  return [];
}

function filterValidCitations(citations: Citation[]): Citation[] {
  return citations.filter((c) => isValidLegalUrl(c.url) && isValidYear(c.year));
}

export async function researchMakerNode(state: AgentState): Promise<Partial<AgentState>> {
  const userMessage = state.messages[state.messages.length - 1]?.content ?? "";
  const eraInstruction = getEraInstruction(state.era);

  const system = `You are an Indian legal citation retrieval engine.

TASK: Find real, verifiable Indian case law for the query.

DOMAIN LOCK — MANDATORY:
- Every citation URL MUST be on indiankanoon.org or an official *.gov.in domain.
- Do NOT fabricate URLs. Omit any citation you cannot find a real URL for.

ERA RULE:
${eraInstruction || "Determine the applicable era from the query context."}

OUTPUT FORMAT — Return ONLY a raw JSON array (no prose, no markdown):
[
  {
    "caseTitle": "Full case name",
    "citation": "e.g. (2023) 4 SCC 567",
    "year": 2023,
    "url": "https://indiankanoon.org/doc/...",
    "holding": "One sentence — what the court held",
    "relevantSection": "BNS Section 103 / IPC Section 302"
  }
]

Return 3–5 citations maximum. Quality over quantity.`;

  const userContent =
    `Legal query: ${userMessage}` +
    (state.ocrText ? `\n\nDocument text (OCR):\n${state.ocrText}` : "") +
    `\n\nFind relevant Indian case law. Search site:indiankanoon.org OR site:gov.in only.`;

  const result = await callModel({
    model: MODELS.RESEARCH_MAKER,
    system,
    messages: [{ role: "user", content: userContent }],
    maxTokens: 1500,
    isResearchMode: true, // activates web-search instruction on Gemini fallback
  });

  const allCitations = extractCitations(result.text);
  const validCitations = filterValidCitations(allCitations);

  return {
    citations: validCitations,
    researchAttempts: state.researchAttempts + 1,
    flagged: false,
    lastModelUsed: result.modelUsed,
    fallbackOccurred: result.fallbackOccurred,
    activeNode: "researchMaker",
  };
}
