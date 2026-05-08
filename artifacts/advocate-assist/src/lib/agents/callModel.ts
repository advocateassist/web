// ── callModel — Resilient LLM Caller with Automatic Fallback ─────────────────
//
// Fallback chains (May 2026 engineering spec):
//   claude-sonnet-4-6      → deepseek-reasoner → deepseek-chat
//   deepseek-reasoner      → deepseek-chat
//   deepseek-chat          → gemini-2.5-flash  (emergency triage)
//   perplexity/sonar-reasoning-pro → gemini-2.5-flash  (research web-search mode)
//   gemini-2.5-flash       → (terminal — no further fallback)
//
// Fallback triggers: missing API key, HTTP 429, HTTP 5xx, network timeout.
// All fallback events are server-logged only — the user stream never pauses.

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { FALLBACK_CHAINS } from "@/lib/config/modelRegistry";
import { extractTextContent } from "@/lib/utils/contentExtractor";

export interface CallModelOptions {
  model: string;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  responseFormat?: "json" | "text";
  /** Activates web-search system instruction when falling back to Gemini from Perplexity */
  isResearchMode?: boolean;
}

export interface CallModelResult {
  text: string;
  modelUsed: string;
  /** true when a fallback model was used instead of the primary */
  fallbackOccurred: boolean;
}

// ── Provider resolution ───────────────────────────────────────────────────────
type Provider = "anthropic" | "gemini" | "perplexity" | "deepseek";

function resolveProvider(modelId: string): Provider {
  if (modelId.startsWith("claude-")) return "anthropic";
  if (modelId.startsWith("gemini-")) return "gemini";
  if (modelId.startsWith("perplexity/") || modelId === "sonar-reasoning") return "perplexity";
  return "deepseek";
}

// ── API key resolution + validation ──────────────────────────────────────────
// Accepts both Replit AI integration keys and user-provided secret names.
function resolveApiKey(provider: Provider): string | undefined {
  switch (provider) {
    case "anthropic":
      // Prefer Replit AI integration key; fall back to bare ANTHROPIC_API_KEY
      return (
        process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ||
        process.env.ANTHROPIC_API_KEY
      );
    case "gemini":
      // Prefer direct user key — the Replit AI Integrations proxy uses a
      // base URL format incompatible with the Google GenAI SDK (/v1beta/models/...).
      // Using the direct key avoids INVALID_ENDPOINT errors in production.
      return (
        process.env.GOOGLE_AI_API_KEY ||
        process.env.AI_INTEGRATIONS_GEMINI_API_KEY
      );
    case "perplexity":
      return process.env.PERPLEXITY_API_KEY;
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
  }
}

/**
 * Validates that the API key for a given provider is present.
 * Logs a warning and returns false if missing — the caller treats this as
 * a retryable condition and falls through to the next model in the chain.
 */
function validateApiKey(provider: Provider, modelId: string): boolean {
  const key = resolveApiKey(provider);
  if (!key) {
    console.warn(
      `[callModel] WARNING: API key missing for provider="${provider}" model="${modelId}". ` +
      `Treating as retryable → falling back to next model in chain.`
    );
    return false;
  }
  return true;
}

// ── Retryable error detection (429 / 5xx / network) ──────────────────────────
function isRetryable(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("server error") ||
    msg.includes("overloaded") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("network") ||
    msg.includes("api key missing")   // missing-key fast-path
  );
}

// ── Single-model call dispatcher ──────────────────────────────────────────────
async function callSingleModel(opts: CallModelOptions): Promise<string> {
  const provider = resolveProvider(opts.model);

  // Validate key before making any network call
  if (!validateApiKey(provider, opts.model)) {
    throw new Error(`API key missing for provider="${provider}" — triggering fallback`);
  }

  const key = resolveApiKey(provider)!;

  // ── Anthropic ─────────────────────────────────────────────────────────────
  if (provider === "anthropic") {
    const client = new Anthropic({
      apiKey: key,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
    const response = await client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1000,
      ...(opts.system ? { system: opts.system } : {}),
      messages: opts.messages,
    });
    return extractTextContent(response.content);
  }

  // ── Gemini (text-only path) ───────────────────────────────────────────────
  if (provider === "gemini") {
    // Only use the Replit proxy baseUrl when falling back to the integration
    // key — if the user's direct GOOGLE_AI_API_KEY is present, talk straight
    // to generativelanguage.googleapis.com to avoid INVALID_ENDPOINT errors.
    const usingIntegrationKey =
      !process.env.GOOGLE_AI_API_KEY &&
      !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    const client = new GoogleGenAI({
      apiKey: key,
      httpOptions:
        usingIntegrationKey && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
          ? { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL }
          : undefined,
    });

    // Perplexity → Gemini fallback: inject web-search framing instruction
    const systemInstruction = opts.isResearchMode
      ? `WEB SEARCH INSTRUCTION: Thoroughly search your knowledge of Indian case law. ` +
        `Prioritise cases from indiankanoon.org and *.gov.in. ` +
        `Return only real, verifiable judgments — never fabricate citations.\n\n${opts.system ?? ""}`
      : opts.system;

    const contents = opts.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await client.models.generateContent({
      model: opts.model,
      contents,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        maxOutputTokens: opts.maxTokens ?? 1000,
      },
    });
    return response.text ?? "";
  }

  // ── Perplexity (OpenAI-compatible) ────────────────────────────────────────
  if (provider === "perplexity") {
    const client = new OpenAI({
      apiKey: key,
      baseURL: "https://api.perplexity.ai",
    });
    // Strip "perplexity/" namespace prefix before the API call
    const modelId = opts.model.startsWith("perplexity/")
      ? opts.model.slice("perplexity/".length)
      : opts.model;

    const res = await client.chat.completions.create({
      model: modelId,
      messages: [
        ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
        ...opts.messages,
      ],
      max_tokens: opts.maxTokens ?? 1500,
    });
    return extractTextContent(res.choices[0]?.message?.content);
  }

  // ── DeepSeek (OpenAI-compatible) ──────────────────────────────────────────
  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://api.deepseek.com",
  });
  const res = await client.chat.completions.create({
    model: opts.model,
    messages: [
      ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
      ...opts.messages,
    ],
    max_tokens: opts.maxTokens ?? 1000,
    ...(opts.responseFormat === "json"
      ? { response_format: { type: "json_object" as const } }
      : {}),
  });
  return extractTextContent(res.choices[0]?.message?.content);
}

// ── Main export: callModel with automatic fallback ────────────────────────────
export async function callModel(opts: CallModelOptions): Promise<CallModelResult> {
  const chain = [opts.model, ...(FALLBACK_CHAINS[opts.model] ?? [])];

  for (let i = 0; i < chain.length; i++) {
    const modelId = chain[i];
    const isFallback = i > 0;

    try {
      const isResearchMode =
        opts.isResearchMode && resolveProvider(modelId) === "gemini";

      const text = await callSingleModel({ ...opts, model: modelId, isResearchMode });

      if (isFallback) {
        console.error(
          `[callModel] FALLBACK SUCCESS: primary=${opts.model} → used=${modelId} (index ${i})`
        );
      }

      return { text, modelUsed: modelId, fallbackOccurred: isFallback };
    } catch (err) {
      const retryable = isRetryable(err);
      console.error(
        `[callModel] ${modelId} FAILED (${retryable ? "retryable" : "non-retryable"}):`,
        err instanceof Error ? err.message : String(err)
      );
      if (i < chain.length - 1) {
        console.error(`[callModel] → switching to fallback: ${chain[i + 1]}`);
      }
      // Always continue to next model regardless of error type
    }
  }

  throw new Error(
    `[callModel] Entire fallback chain exhausted for primary="${opts.model}"`
  );
}
