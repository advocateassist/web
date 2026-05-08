// ── /api/whatsapp-context — Dynamic WhatsApp link generator ──────────────────
//
// POST { messages, persona, userName }
//   → calls Gemini 2.5 Flash to produce a 2-sentence professional legal summary
//   → returns { url } — a fully encoded wa.me link for 919958846926
//
// Auth-gated. Never blocks the UI — the button opens the link immediately
// if this route fails for any reason.

import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

const WA_NUMBER = "919958846926";
const WA_BASE   = `https://wa.me/${WA_NUMBER}?text=`;
const MAX_MESSAGE_CHARS = 650;

function getGemini() {
  const key = process.env.GOOGLE_AI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key not configured");
  return new GoogleGenAI({ apiKey: key });
}

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages?: IncomingMessage[]; persona?: string; userName?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages = [], persona = "Consumer", userName = "User" } = body;
  const displayName = userName.trim() || "User";

  // Condense to last 8 turns — enough context, avoids large prompts
  const transcript = messages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content.slice(0, 350)}`)
    .join("\n");

  let sentence1 = "";
  let sentence2 = "";

  if (transcript) {
    try {
      const gemini = getGemini();
      const prompt =
        `You are a professional legal assistant. Read the chat excerpt below and write EXACTLY two short sentences:\n` +
        `Sentence 1 (≤25 words): The core legal matter or document the user needs help with.\n` +
        `Sentence 2 (≤30 words): One key fact — names, assets, parties involved, or next step needed.\n` +
        `Rules: professional tone, plain English, no bullet points, no labels, return ONLY the two sentences separated by a newline.\n\n` +
        `CHAT:\n${transcript}`;

      const result = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.1, maxOutputTokens: 100 },
      });

      const lines = (result.text ?? "").trim().split("\n").map((s) => s.trim()).filter(Boolean);
      sentence1 = lines[0] ?? "";
      sentence2 = lines[1] ?? "";
    } catch (err) {
      console.error("[whatsapp-context] Gemini error:", err instanceof Error ? err.message : String(err));
      // Fall through to client-side text extraction fallback below
    }
  }

  // If Gemini produced a summary, build a rich templated message
  let message: string;
  if (sentence1) {
    message =
      persona === "Advocate"
        ? `Hi, I am ${displayName} (Advocate). I'm using Advocate Assist AI regarding: ${sentence1}. I need to consult a senior counsel.${sentence2 ? " Context: " + sentence2 : ""}`
        : `Hi, I am ${displayName} (Client). I want to consult a senior lawyer to discuss: ${sentence1}.${sentence2 ? " Context: " + sentence2 : ""}`;
  } else {
    // Graceful fallback — extract directly from the first user message
    const firstUser = messages.find((m) => m.role === "user")?.content ?? "";
    const topic = firstUser.slice(0, 200).trim() || "a legal matter";
    message =
      persona === "Advocate"
        ? `Hi, I am ${displayName} (Advocate). I'm using Advocate Assist AI regarding: ${topic}. I need to consult a senior counsel.`
        : `Hi, I am ${displayName} (Client). I want to consult a senior lawyer to discuss: ${topic}.`;
  }

  const url = WA_BASE + encodeURIComponent(message.slice(0, MAX_MESSAGE_CHARS));
  return Response.json({ url });
}
