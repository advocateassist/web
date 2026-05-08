// ── Utility Node — Gemini 2.0 Flash ──────────────────────────────────────────
//
// Handles two modes:
//
//  1. extraction intent (queryType === "extraction")
//     → OCR/translate the document and set finalResponse directly.
//        The orchestrator routes to END after this — no further reasoning node.
//
//  2. Legal analysis with attachment (all other intents)
//     → OCR/transcribe the document, inject extracted text into messages,
//        then hand off to eliteReasoner / meetingTranscriber for reasoning.
//
// Primary: gemini-2.5-flash (multimodal)
// Fallback: logs error and returns graceful placeholder — multimodal cannot
//           be replicated by text-only models.

import { GoogleGenAI } from "@google/genai";
import type { AgentState } from "./state";
import { MODELS } from "@/lib/config/modelRegistry";

function getGemini() {
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

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildExtractionPrompt(userMessage: string, mimeType: string, language: string): string {
  const isAudio = mimeType.startsWith("audio/");

  if (isAudio) {
    return `Transcribe this audio recording accurately. Preserve speaker changes if detectable.
If legal content is discussed, preserve section numbers, case names, and dates verbatim.
${language !== "en" ? `The user prefers output in language code: ${language}. Transcribe in the original language and add a brief summary in ${language}.` : ""}`;
  }

  // Check if the user wants translation
  const wantsTranslation = /translat|convert.*hindi|convert.*english|in hindi|in english|in tamil|in telugu|in marathi|in bengali|in gujarati|in kannada/i.test(userMessage);
  const targetLangMatch = userMessage.match(/(?:in|to|into)\s+(hindi|english|tamil|telugu|marathi|bengali|gujarati|kannada|malayalam|punjabi|odia)/i);
  const targetLang = targetLangMatch?.[1] ?? null;

  if (wantsTranslation && targetLang) {
    return `First, extract ALL text from this document (PDF or image). Preserve paragraph structure, section numbering, tables, and signatures/stamps.

Then translate the extracted text into ${targetLang}.

Return in this exact format:
DOCUMENT TYPE: [FIR / Court Order / Agreement / Affidavit / Notice / Other]
PAGE COUNT: [n]
ORIGINAL LANGUAGE: [detected language]
---
## Original Text
[Full extracted text preserving layout]

---
## Translation (${targetLang})
[Complete translation]`;
  }

  return `Extract ALL text from this document. Preserve paragraph structure, section numbering, table content, and date formats as-is.
Note signatures and stamps as "[Signature/Stamp present]".

Return EXACTLY this format:
DOCUMENT TYPE: [FIR / Court Order / Agreement / Affidavit / Notice / Charge Sheet / Bail Application / Other]
PAGE COUNT: [n]
---
[Full extracted text, preserving layout]`;
}

function buildLegalAnalysisPrompt(persona: "Advocate" | "Consumer", mimeType: string): string {
  const isAudio = mimeType.startsWith("audio/");

  if (isAudio) {
    return persona === "Advocate"
      ? `You are transcribing a legal meeting/hearing recording for an Indian law professional.

Transcribe the audio accurately. Structure the output as:

## Case Notes

**Parties:** ...
**Matter:** ...
**Date:** ...

### Key Points Discussed
[paragraph form]

### Action Items / Next Steps
[paragraph form]

### Legal Issues Identified
[paragraph form]

If the audio is in a regional language, transcribe in that language but keep the template labels in English.`
      : `You are transcribing a legal meeting/hearing recording.

Transcribe the audio accurately. Structure the output as:

## Meeting Summary

**What was discussed:** ...
**Next steps:** ...
**Important dates:** ...

Step 1: ...
Step 2: ...`;
  }

  return `You are performing OCR and content extraction on a legal document for Indian courts.

TASK: Extract all text from this document. Preserve:
- Paragraph structure and numbering
- Section headings
- Tables (convert to readable text)
- Signatures/stamp references (note as "[Signature/Stamp present]")
- Date formats as-is

Also identify:
- Document type (FIR, Court Order, Agreement, Affidavit, Notice, etc.)
- Approximate page count

OUTPUT FORMAT:
DOCUMENT TYPE: [type]
PAGE COUNT: [n]
---
[Full extracted text]`;
}

// ── Format extraction result for direct display ───────────────────────────────

function formatExtractionResponse(rawText: string, mimeType: string, userMessage: string): string {
  if (mimeType.startsWith("audio/")) {
    return rawText;
  }

  const docTypeMatch = rawText.match(/DOCUMENT TYPE:\s*(.+)/i);
  const pageCountMatch = rawText.match(/PAGE COUNT:\s*(\d+)/i);
  const separator = rawText.indexOf("---");
  const bodyText = separator !== -1 ? rawText.slice(separator + 3).trim() : rawText;

  const docType = docTypeMatch?.[1]?.trim() ?? "Document";
  const pageCount = pageCountMatch?.[1] ? parseInt(pageCountMatch[1], 10) : null;

  const hasTranslation = bodyText.includes("## Translation");

  let header = `**${docType}**`;
  if (pageCount) header += ` · ${pageCount} page${pageCount > 1 ? "s" : ""}`;
  header += "\n\n";

  if (hasTranslation) {
    return header + bodyText;
  }

  return header + bodyText;
}

// ── Main utility node ─────────────────────────────────────────────────────────

export async function utilityNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.hasAttachment || !state.attachmentData) {
    return { activeNode: "utility" };
  }

  const gemini = getGemini();
  const userMessage = state.messages[state.messages.length - 1]?.content ?? "";
  const mimeType = state.attachmentMimeType || "image/jpeg";
  const isExtraction = state.queryType === "extraction";
  const isAudio = mimeType.startsWith("audio/");
  const isDocument = mimeType === "application/pdf" || mimeType.startsWith("image/");

  if (!isAudio && !isDocument) {
    return { activeNode: "utility" };
  }

  const prompt = isExtraction
    ? buildExtractionPrompt(userMessage, mimeType, state.language)
    : buildLegalAnalysisPrompt(state.persona, mimeType);

  try {
    const response = await gemini.models.generateContent({
      model: MODELS.UTILITY,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: state.attachmentData.replace(/^data:[^;]+;base64,/, ""),
              },
            },
          ],
        },
      ],
    });

    const extractedText = response.text ?? "";

    // ── Extraction mode: format and return directly (orchestrator → outputNormalizer) ──
    if (isExtraction) {
      const formatted = formatExtractionResponse(extractedText, mimeType, userMessage);
      return {
        ocrText: extractedText,
        attachmentData: "",  // ── Clear binary blob from state after consumption (Section 1.7)
        finalResponse: formatted,
        lastModelUsed: MODELS.UTILITY,
        fallbackOccurred: false,
        activeNode: "utility",
        attachmentMimeType: mimeType,
      };
    }

    // ── Legal analysis mode: inject OCR text into messages for postUploadClassifier ─
    const combined = userMessage
      ? `${userMessage}\n\n[Extracted from uploaded document]\n${extractedText}`
      : extractedText;

    return {
      ocrText: extractedText,
      attachmentData: "",  // ── Clear binary blob from state after consumption (Section 1.7)
      messages: [
        ...state.messages.slice(0, -1),
        { role: "user", content: combined },
      ],
      lastModelUsed: MODELS.UTILITY,
      fallbackOccurred: false,
      activeNode: "utility",
      attachmentMimeType: mimeType,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Log the raw error object so we can see the exact failure (status code, error code, payload)
    console.error("[utilityNode] Gemini OCR raw error:", err);
    console.error(`[utilityNode] Gemini OCR failed — model: ${MODELS.UTILITY}, mimeType: ${mimeType}, isExtraction: ${isExtraction}, error: ${msg}`);

    if (isExtraction) {
      return {
        ocrText: "",
        attachmentData: "",  // ── Clear binary blob even on error (Section 1.7)
        finalResponse: "I was unable to extract text from this document. Please ensure the file is a clear image or PDF and try again.",
        lastModelUsed: MODELS.UTILITY,
        fallbackOccurred: false,  // ── No model fallback occurred; OCR failed outright
        activeNode: "utility",
      };
    }

    return {
      ocrText: "[OCR unavailable — document could not be processed]",
      attachmentData: "",  // ── Clear binary blob even on error (Section 1.7)
      lastModelUsed: MODELS.UTILITY,
      fallbackOccurred: false,  // ── No model fallback occurred; OCR failed outright
      activeNode: "utility",
    };
  }
}
