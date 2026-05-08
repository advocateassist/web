// ── Immutable CTAs — ported verbatim from llm.py ──────────────────────────────
// DO NOT change these URLs. They are sovereign and match the WhatsApp channels.

export const CTAS = {
  CUSTOMER_WHATSAPP: "https://tinyurl.com/advocateassist",
  LAWYER_WHATSAPP: "https://tinyurl.com/AALawyer",
} as const;

export type CtaKey = keyof typeof CTAS;
