// ── eraSegregator — July 1, 2024 cutoff logic ────────────────────────────────
// Ported from llm.py sovereign legal logic (Section 3.1).

import type { Era } from "@/types/agent";

/** The date on which IPC/CrPC/IEA were replaced by BNS/BNSS/BSA */
export const BNS_EFFECTIVE_DATE = new Date("2024-07-01T00:00:00.000Z");

/**
 * Determine the legal era for a given offense date.
 *
 * - pre-bns  → cite IPC, CrPC, Indian Evidence Act
 * - post-bns → cite BNS, BNSS, BSA
 * - unknown  → Supervisor must ask before routing
 */
export function getEra(offenseDate: Date | "unknown"): Era {
  if (offenseDate === "unknown") return "unknown";
  return offenseDate < BNS_EFFECTIVE_DATE ? "pre-bns" : "post-bns";
}

/**
 * Returns the era-appropriate statute instruction to inject into prompts.
 */
export function getEraInstruction(era: Era): string {
  if (era === "pre-bns") {
    return (
      "The offense occurred BEFORE 1 July 2024. " +
      "You MUST cite IPC (Indian Penal Code), CrPC (Code of Criminal Procedure), " +
      "and Indian Evidence Act. Do NOT cite BNS, BNSS, or BSA."
    );
  }
  if (era === "post-bns") {
    return (
      "The offense occurred ON OR AFTER 1 July 2024. " +
      "You MUST cite BNS (Bharatiya Nyaya Sanhita), BNSS (Bharatiya Nagarik Suraksha Sanhita), " +
      "and BSA (Bharatiya Sakshya Adhiniyam). Do NOT cite IPC, CrPC, or Indian Evidence Act."
    );
  }
  return "";
}

/**
 * Validate a citation string against the expected era.
 * Returns true if the citation violates era rules (hallucination).
 */
export function isEraViolation(citationText: string, era: Era): boolean {
  const text = citationText.toUpperCase();
  const preBnsTerms = ["IPC", "CRPC", "EVIDENCE ACT", "CR.P.C", "I.P.C"];
  const postBnsTerms = ["BNS", "BNSS", "BSA"];

  if (era === "post-bns") {
    return preBnsTerms.some((t) => text.includes(t));
  }
  if (era === "pre-bns") {
    return postBnsTerms.some((t) => text.includes(t));
  }
  return false;
}

/**
 * Validate a URL is on whitelisted Indian legal domains.
 */
export function isValidLegalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "indiankanoon.org" ||
      u.hostname.endsWith(".gov.in") ||
      u.hostname.endsWith(".nic.in")
    );
  } catch {
    return false;
  }
}

/**
 * Validate citation year is not in the future.
 */
export function isValidYear(year: number): boolean {
  return year >= 1950 && year <= new Date().getFullYear();
}
