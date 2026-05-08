// ── /api/ocr — Multimodal upload handler ─────────────────────────────────────
// Accepts PDF/image/audio, runs Gemini 2.0 Flash OCR, returns extracted text.
// Uses dual env-var pattern: AI_INTEGRATIONS_GEMINI_API_KEY → GOOGLE_AI_API_KEY

import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";
import { MODELS } from "@/lib/config/modelRegistry";

/** Maximum file size accepted for OCR/transcription (20 MB) */
const MAX_FILE_BYTES = 20 * 1024 * 1024;
/**
 * Maximum multipart body size allowed before parsing (40 MB).
 * Multipart overhead means the body is larger than the file itself.
 */
const MAX_BODY_BYTES = MAX_FILE_BYTES * 2;

// ── Per-user rate limiter (in-memory, 8 req / 60 s per user) ─────────────────
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export const runtime = "nodejs";
export const maxDuration = 60;

function buildGemini() {
  // Prefer the direct Google API key — the Replit AI Integrations proxy routes
  // requests through a local URL whose path format is incompatible with the
  // Google GenAI SDK's /v1beta/models/... URL construction, causing INVALID_ENDPOINT.
  // Direct key → no baseUrl → SDK talks straight to generativelanguage.googleapis.com.
  const directKey = process.env.GOOGLE_AI_API_KEY;
  if (directKey) {
    return new GoogleGenAI({ apiKey: directKey });
  }

  // Fallback: Replit AI Integrations proxy (only when no direct key is present)
  const integrationKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (integrationKey) {
    return new GoogleGenAI({
      apiKey: integrationKey,
      ...(process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
        ? { httpOptions: { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL } }
        : {}),
    });
  }

  throw new Error(
    "Gemini API key not configured (set GOOGLE_AI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY)"
  );
}

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/m4a",
]);

export async function POST(req: Request) {
  // ── Authentication check ───────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  // ── Onboarding and consent authorization ───────────────────────────────────
  const u = session.user;
  if (
    !u.isOnboarded ||
    !u.termsAccepted ||
    !u.dataConsentAccepted ||
    !u.aiDisclaimerAccepted
  ) {
    return Response.json(
      { error: "Account setup incomplete. Please complete onboarding before uploading documents." },
      { status: 403 }
    );
  }

  // ── Rate limit (8 requests / 60 s per user) ───────────────────────────────
  const userId = session.user.email ?? session.user.id ?? "unknown";
  if (!checkRateLimit(userId)) {
    return Response.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  // ── Pre-parse body size guard ──────────────────────────────────────────────
  // Content-Length is required so we can enforce a hard byte cap before
  // buffering. Requests without it (e.g. chunked transfer) are rejected with
  // 411 to prevent memory exhaustion when Content-Length is absent or spoofed.
  const contentLength = req.headers.get("content-length");
  if (!contentLength) {
    return Response.json(
      { error: "Content-Length header is required for file uploads" },
      { status: 411 }
    );
  }
  if (parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return Response.json(
      { error: "Request body too large" },
      { status: 413 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // ── File size guard (secondary) ──────────────────────────────────────────
    // Prevents arrayBuffer() call on oversized files even when Content-Length
    // was absent or inaccurate.
    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: "File too large. Maximum allowed size is 20 MB." },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const isAudio = file.type.startsWith("audio/");

    const gemini = buildGemini();

    const prompt = isAudio
      ? `Transcribe this audio recording accurately. Preserve speaker changes if detectable. If legal content is discussed, preserve section numbers, case names, and dates verbatim.`
      : `Extract ALL text from this document. Preserve paragraph structure, section numbering, and table content.

Return EXACTLY this format:
DOCUMENT TYPE: [FIR / Court Order / Agreement / Affidavit / Notice / Charge Sheet / Bail Application / Other]
PAGE COUNT: [n]
---
[Full extracted text, preserving layout]`;

    const response = await gemini.models.generateContent({
      model: MODELS.UTILITY,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: file.type, data: base64 } },
          ],
        },
      ],
    });

    const rawText = response.text ?? "";

    if (isAudio) {
      return Response.json({
        extractedText: rawText,
        detectedDocType: "Audio Recording",
        pageCount: 1,
        mimeType: file.type,
        fileName: file.name,
        isAudio: true,
      });
    }

    // Parse structured OCR output
    const docTypeMatch = rawText.match(/DOCUMENT TYPE:\s*(.+)/i);
    const pageCountMatch = rawText.match(/PAGE COUNT:\s*(\d+)/i);
    const textAfterSeparator = rawText.includes("---")
      ? rawText.split("---").slice(1).join("---").trim()
      : rawText;

    return Response.json({
      extractedText: textAfterSeparator,
      detectedDocType: docTypeMatch?.[1]?.trim() ?? "Document",
      pageCount: parseInt(pageCountMatch?.[1] ?? "1", 10),
      mimeType: file.type,
      fileName: file.name,
      isAudio: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Log the raw error object so we can see the exact failure (status code, error code, payload)
    console.error("[/api/ocr] Raw error:", err);
    console.error(`[/api/ocr] OCR failed — model: ${MODELS.UTILITY}, error: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
}
