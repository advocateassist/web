// ── Legal Checker (Auditor) — DeepSeek V4 Pro (deepseek-reasoner) ────────────
// Fallback chain: deepseek-reasoner → deepseek-chat
//
// Sovereign Era Check (ported from llm.py — Section 3.1):
//   post-BNS (offense ≥ 01 Jul 2024) + IPC/CrPC citation → HALLUCINATION
//   pre-BNS  (offense < 01 Jul 2024) + BNS/BNSS/BSA citation → HALLUCINATION
//
// When HallucinationDetected: sets flagged=true, hallucinationDetected=true,
// and hallucinationReason — orchestrator re-routes to researchMaker for a
// BNS-corrected re-search.

import type { AgentState } from "./state";
import type { Citation } from "@/types/agent";
import { MODELS } from "@/lib/config/modelRegistry";
import {
  isEraViolation,
  isValidLegalUrl,
  isValidYear,
} from "@/lib/utils/eraSegregator";
import { callModel } from "./callModel";

// ── Explicit hallucination patterns (test-case driven) ────────────────────────
const POST_BNS_FORBIDDEN = ["IPC", "I.P.C", "CRPC", "CR.P.C", "EVIDENCE ACT", "INDIAN PENAL CODE", "CODE OF CRIMINAL PROCEDURE"];
const PRE_BNS_FORBIDDEN  = ["BNS", "BNSS", "BSA", "BHARATIYA NYAYA", "BHARATIYA NAGARIK", "BHARATIYA SAKSHYA"];

interface HallucinationCheck {
  detected: boolean;
  reason: string;
  forbiddenTermsFound: string[];
}

/**
 * Test case: offense date 2025 (post-BNS) + Perplexity returns IPC citation
 * → legalChecker MUST detect HallucinationDetected and trigger BNS re-search.
 */
function detectHallucination(citation: Citation, era: string): HallucinationCheck {
  if (era === "unknown") return { detected: false, reason: "", forbiddenTermsFound: [] };

  const citationText = [
    citation.caseTitle,
    citation.citation,
    citation.relevantSection,
    citation.holding ?? "",
  ].join(" ").toUpperCase();

  const forbidden = era === "post-bns" ? POST_BNS_FORBIDDEN : PRE_BNS_FORBIDDEN;
  const found = forbidden.filter((term) => citationText.includes(term));

  if (found.length > 0) {
    const correctStatutes = era === "post-bns"
      ? "BNS, BNSS, BSA"
      : "IPC, CrPC, Indian Evidence Act";
    return {
      detected: true,
      reason:
        `Hallucination detected: era="${era}" but citation references ` +
        `${found.join(", ")}. Correct statutes for this era: ${correctStatutes}. ` +
        `Triggering re-search for ${correctStatutes} equivalents.`,
      forbiddenTermsFound: found,
    };
  }
  return { detected: false, reason: "", forbiddenTermsFound: [] };
}

export async function legalCheckerNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const citations = state.citations ?? [];

  if (citations.length === 0) {
    return { flagged: false, hallucinationDetected: false, activeNode: "legalChecker" };
  }

  // ── Step 1: Sovereign Era Check (local — no LLM cost) ────────────────────
  // This is the primary hallucination gate. Any citation failing era rules
  // is dropped before the LLM audit.
  const cleanedLocally: Citation[] = [];
  const hallucinationReasons: string[] = [];
  let maxSeverityDetected = false;

  for (const c of citations) {
    const problems: string[] = [];

    // URL whitelist check
    if (!isValidLegalUrl(c.url)) problems.push(`Invalid URL domain: ${c.url}`);

    // Year sanity check
    if (!isValidYear(c.year)) problems.push(`Invalid year: ${c.year}`);

    // Sovereign Era Check (IPC-in-post-BNS / BNS-in-pre-BNS)
    if (state.era !== "unknown") {
      const halluCheck = detectHallucination(c, state.era);
      if (halluCheck.detected) {
        problems.push(halluCheck.reason);
        hallucinationReasons.push(halluCheck.reason);
        maxSeverityDetected = true;
      } else {
        // Secondary check via generic isEraViolation
        const legacyCheck = `${c.caseTitle} ${c.citation} ${c.relevantSection}`;
        if (isEraViolation(legacyCheck, state.era)) {
          const reason = `Era violation (legacy check): era="${state.era}" — citation incompatible`;
          problems.push(reason);
          hallucinationReasons.push(reason);
          maxSeverityDetected = true;
        }
      }
    }

    if (problems.length > 0) {
      console.error("[legalChecker] Citation DROPPED:", c.caseTitle, "→", problems.join("; "));
    } else {
      cleanedLocally.push(c);
    }
  }

  // If hallucinations detected and ALL citations failed → flag immediately
  // This triggers orchestrator re-route to researchMaker for BNS re-search
  if (maxSeverityDetected && cleanedLocally.length === 0) {
    const combinedReason = hallucinationReasons.join(" | ");
    console.error("[legalChecker] HallucinationDetected — all citations failed sovereign era check:", combinedReason);
    return {
      flagged: true,
      hallucinationDetected: true,
      hallucinationReason: combinedReason,
      citations: [],
      lastModelUsed: MODELS.LEGAL_CHECKER,
      fallbackOccurred: false,
      activeNode: "legalChecker",
    };
  }

  // Partial hallucinations — continue with surviving citations
  if (maxSeverityDetected && cleanedLocally.length > 0) {
    console.error("[legalChecker] Partial hallucinations removed. Remaining:", cleanedLocally.length);
  }

  // ── Step 2: LLM semantic audit via DeepSeek V4 Pro (with fallback) ────────
  const auditPrompt = `You are a strict Indian legal citation auditor enforcing SOVEREIGN ERA RULES.

ERA RULES (NON-NEGOTIABLE):
- era="post-bns" (offense on/after 01 Jul 2024):
  Citing IPC, CrPC, Indian Evidence Act WITHOUT explicit BNS transitional reasoning = HALLUCINATION.
  Required statutes: BNS, BNSS, BSA only.
- era="pre-bns" (offense before 01 Jul 2024):
  Citing BNS, BNSS, BSA = HALLUCINATION.
  Required statutes: IPC, CrPC, Indian Evidence Act only.
- era="unknown": apply leniency — do not flag on era grounds alone.

URL RULE: Must be on indiankanoon.org or *.gov.in. Any other domain = invalid.
YEAR RULE: Year must not exceed ${new Date().getFullYear()}.

Current era: ${state.era}
Citations to audit:
${JSON.stringify(cleanedLocally, null, 2)}

Respond ONLY with valid JSON:
{
  "flagged": true|false,
  "reason": "explanation if flagged",
  "hallucinationDetected": true|false,
  "passedIndices": [0, 1, 2]
}`;

  try {
    const result = await callModel({
      model: MODELS.LEGAL_CHECKER,
      messages: [{ role: "user", content: auditPrompt }],
      maxTokens: 400,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const audit = JSON.parse(jsonMatch[0]) as {
        flagged: boolean;
        reason: string;
        hallucinationDetected?: boolean;
        passedIndices: number[];
      };

      const passedCitations = audit.passedIndices
        ? audit.passedIndices.map((i) => cleanedLocally[i]).filter(Boolean)
        : cleanedLocally;

      const hallucinationDetected =
        maxSeverityDetected || (audit.hallucinationDetected ?? false);
      const hallucinationReason = hallucinationReasons.join(" | ") || audit.reason || "";

      return {
        flagged: audit.flagged && passedCitations.length === 0,
        hallucinationDetected,
        hallucinationReason,
        citations: passedCitations,
        lastModelUsed: result.modelUsed,
        fallbackOccurred: result.fallbackOccurred,
        activeNode: "legalChecker",
      };
    }
  } catch (err) {
    console.error(
      "[legalChecker] LLM audit chain fully exhausted — using local-only results:",
      err instanceof Error ? err.message : err
    );
  }

  return {
    flagged: false,
    hallucinationDetected: maxSeverityDetected,
    hallucinationReason: hallucinationReasons.join(" | "),
    citations: cleanedLocally,
    lastModelUsed: MODELS.LEGAL_CHECKER,
    fallbackOccurred: false,
    activeNode: "legalChecker",
  };
}
