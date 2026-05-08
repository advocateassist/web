// ── OutputCleaner — ported from llm.py OutputCleaner class ────────────────────
// Strips markdown artefacts from model outputs before rendering.
//
// Advocate (Lawyer) mode: zero lists, zero markdown, zero labels — pure paragraphic.
// Consumer mode: preserves numbered steps (intentional output format).

export class OutputCleaner {
  /**
   * Base clean: removes bold/italic/underline, headers, bullet chars, backtick fences,
   * blockquote markers, and horizontal rules. Applied to ALL model responses.
   */
  static cleanBase(text: string): string {
    return (
      text
        // ── Fenced code blocks (``` and ~~~) ──────────────────────────────────
        .replace(/^```[\w]*\n?([\s\S]*?)```/gm, "$1")
        .replace(/^~~~[\w]*\n?([\s\S]*?)~~~/gm, "$1")
        // Inline backtick spans
        .replace(/`([^`]+)`/g, "$1")
        // ── Bold / italic / underline ─────────────────────────────────────────
        .replace(/\*\*(.*?)\*\*/gm, "$1")
        .replace(/__(.*?)__/gm, "$1")
        .replace(/\*(.*?)\*/gm, "$1")
        .replace(/_(.*?)_/gm, "$1")
        // ── Markdown headers ──────────────────────────────────────────────────
        .replace(/^#{1,6}\s+/gm, "")
        // ── Bullet markers: -, *, +, •, ◆, → ────────────────────────────────
        .replace(/^[\-\*\+•◆→]\s+/gm, "")
        // ── Blockquote markers ────────────────────────────────────────────────
        .replace(/^>\s?/gm, "")
        // ── Horizontal rules ──────────────────────────────────────────────────
        .replace(/^[-\*_]{3,}\s*$/gm, "")
        // ── Stray standalone * or # ───────────────────────────────────────────
        .replace(/(?<!\w)\*(?!\w)/g, "")
        .replace(/(?<!\w)#(?!\w)/g, "")
        // ── Collapse 3+ newlines into 2 ───────────────────────────────────────
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }

  /**
   * Advocate (Lawyer) clean: zero lists, zero labels, pure paragraphic professional prose.
   *
   * Additionally strips:
   *  - Numbered list markers (1. / 1) / i. / a. )
   *  - Label-colon patterns (Key: / Note: / Summary: / Points: / Holding: etc.)
   *  - Leading whitespace/tab indents
   *  - Em-dash section dividers
   */
  static cleanForAdvocate(text: string): string {
    return OutputCleaner.cleanBase(text)
      // ── Numbered lists ────────────────────────────────────────────────────
      .replace(/^\d+[.)]\s+/gm, "")
      .replace(/^[ivxlcdm]+[.)]\s+/gim, "")    // Roman numerals i. ii. iii.
      .replace(/^[a-z][.)]\s+/gm, "")           // Alphabetic a. b. c.
      // ── Label-colon patterns at line start ────────────────────────────────
      // e.g. "Key:", "Note:", "Summary:", "Holding:", "Issue:", "Relief sought:"
      .replace(/^[A-Z][A-Za-z\s]{1,24}:\s*/gm, "")
      // ── Em-dash / en-dash section breaks ─────────────────────────────────
      .replace(/^[\u2014\u2013]{1,3}\s*/gm, "")
      // ── Leading whitespace/tab indentation ────────────────────────────────
      .replace(/^[ \t]+/gm, "")
      // ── Re-collapse any new triple newlines introduced by above strips ────
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Consumer clean: preserves numbered steps (intentional output format).
   * Only applies the base clean.
   */
  static cleanForConsumer(text: string): string {
    return OutputCleaner.cleanBase(text);
  }

  static clean(text: string, persona: "Advocate" | "Consumer"): string {
    return persona === "Advocate"
      ? OutputCleaner.cleanForAdvocate(text)
      : OutputCleaner.cleanForConsumer(text);
  }
}
