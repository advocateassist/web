// ── contentExtractor — ported from llm.py _extract_text_content ──────────────
// Prevents crashes when message content arrives as a list of blocks (Anthropic).

/**
 * Safely extract a plain-text string from any message content shape.
 * Handles: string, array of strings, array of content blocks ({type, text}).
 */
export function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object" && "text" in c) return (c as { text: string }).text ?? "";
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return String(content ?? "");
}

/**
 * Count approximate tokens in a string (1 token ≈ 4 chars).
 * Used for session limit enforcement.
 */
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate a message array to stay under a token budget,
 * always keeping the last MESSAGES_TO_KEEP_FULL messages intact.
 */
export function truncateMessages(
  messages: Array<{ role: string; content: string }>,
  tokenLimit: number,
  keepFull = 3
): Array<{ role: string; content: string }> {
  const tail = messages.slice(-keepFull);
  const head = messages.slice(0, -keepFull);

  let budget = tokenLimit;
  const kept: Array<{ role: string; content: string }> = [];

  for (const msg of [...tail].reverse()) {
    const t = countTokens(msg.content);
    if (budget - t < 0) break;
    budget -= t;
    kept.unshift(msg);
  }

  // Fill remaining budget from head (oldest first)
  for (const msg of [...head].reverse()) {
    const t = countTokens(msg.content);
    if (budget - t < 0) break;
    budget -= t;
    kept.unshift(msg);
  }

  return kept;
}
