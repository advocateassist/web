// ── Supervisor Node — State-Aware Intent Classifier v2.1 ─────────────────────
//
// KEY RULES (Engineering Override):
//  1. If state.era is already locked → NEVER ask for the incident date again.
//  2. If state.facts / state.location are present → use them for context.
//  3. If intake is incomplete and more info is needed → return ONE comprehensive
//     intake checklist (all 4 items at once — NOT drip-feed single questions).
//  4. Court-to-language mapping: detect court from message / state.location
//     and set state.courtLanguage accordingly.
//  5. Accumulate facts and location into state across turns.
//
// Intent types:
//   extraction        — extract / translate document content
//   draftClarification — draft request but details missing
//   research          — case law / statutes
//   basicDraft        — simple document with full details
//   eliteDraft        — complex document with full details
//   complexReasoning  — legal analysis / advice / strategy

import type { AgentState } from "./state";
import type { ComplexityScore, Era, QueryType, Script } from "@/types/agent";
import { MODELS, DRAFT_KEYWORDS, INDIC_UNICODE_BLOCKS } from "@/lib/config/modelRegistry";
import { regexClassifier } from "@/lib/utils/regexClassifier";
import { getEra } from "@/lib/utils/eraSegregator";
import { countTokens } from "@/lib/utils/contentExtractor";
import { GoogleGenAI } from "@google/genai";

// ── Gemini client (direct key — same pattern as utilityNode.ts) ───────────────

function getGemini() {
  const directKey = process.env.GOOGLE_AI_API_KEY;
  if (directKey) return new GoogleGenAI({ apiKey: directKey });

  const integrationKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (integrationKey) {
    return new GoogleGenAI({
      apiKey: integrationKey,
      ...(process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
        ? { httpOptions: { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL } }
        : {}),
    });
  }
  throw new Error("Gemini API key not configured (set GOOGLE_AI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY)");
}

// ── Script detection ──────────────────────────────────────────────────────────

function detectScript(text: string): Script {
  if (!text || text.length === 0) return "latin";
  const chars = [...text];
  let indicCount = 0;
  let detectedScript: Script = "latin";
  for (const char of chars) {
    const cp = char.codePointAt(0) ?? 0;
    for (const block of INDIC_UNICODE_BLOCKS) {
      if (cp >= block.start && cp <= block.end) {
        indicCount++;
        detectedScript = block.script;
        break;
      }
    }
  }
  return indicCount / chars.length > 0.3 ? detectedScript : "latin";
}

function hasDraftIntent(query: string): boolean {
  return DRAFT_KEYWORDS.some((kw) => query.toLowerCase().includes(kw));
}

// ── Court-to-language mapping ─────────────────────────────────────────────────

const HINDI_PLACES = [
  "uttar pradesh", " up ", "ghaziabad", "noida", "lucknow", "kanpur", "agra",
  "varanasi", "allahabad", "prayagraj", "meerut", "mathura", "aligarh", "bareilly",
  "gorakhpur", "moradabad", "saharanpur", "firozabad", "jhansi",
  "bihar", "patna", "gaya", "bhagalpur", "muzaffarpur", "darbhanga",
  "rajasthan", "jaipur", "jodhpur", "kota", "udaipur", "ajmer", "bikaner",
  "madhya pradesh", " mp ", "bhopal", "indore", "gwalior", "jabalpur", "ujjain",
  "haryana", "gurugram", "gurgaon", "faridabad", "ambala", "rohtak", "panipat",
  "uttarakhand", "dehradun", "haridwar", "nainital",
  "chhattisgarh", "raipur", "bilaspur",
  "jharkhand", "ranchi", "jamshedpur", "dhanbad",
  "himachal pradesh", "shimla", "dharamshala",
  "saket court", "rohini court", "patiala house", "tis hazari", "karkardooma",
  "delhi district court", "south delhi", "north delhi", "east delhi", "west delhi",
  "sessions court", "district court",
];

const TAMIL_PLACES = ["tamil nadu", "chennai", "coimbatore", "madurai", "salem", "trichy", "madras"];
const MARATHI_PLACES = ["maharashtra", "mumbai", "pune", "nagpur", "bombay", "nashik", "aurangabad", "thane", "solapur"];
const BENGALI_PLACES = ["west bengal", "kolkata", "calcutta", "howrah", "durgapur", "siliguri"];
const TELUGU_PLACES = ["andhra pradesh", "telangana", "hyderabad", "visakhapatnam", "vizag", "vijayawada", "warangal"];
const KANNADA_PLACES = ["karnataka", "bengaluru", "bangalore", "mysore", "hubli", "dharwad", "belagavi"];
const MALAYALAM_PLACES = ["kerala", "kochi", "thiruvananthapuram", "kozhikode", "thrissur", "ernakulam"];
const GUJARATI_PLACES = ["gujarat", "ahmedabad", "surat", "vadodara", "baroda", "rajkot"];
const PUNJABI_PLACES = ["punjab", "chandigarh", "amritsar", "ludhiana", "jalandhar", "patiala"];

function detectCourtLanguage(location: string): string {
  if (!location) return "";
  const loc = location.toLowerCase();
  if (loc.includes("supreme court") || loc.includes("high court")) return "english";
  if (HINDI_PLACES.some((p) => loc.includes(p))) return "hindi";
  if (TAMIL_PLACES.some((p) => loc.includes(p))) return "tamil";
  if (MARATHI_PLACES.some((p) => loc.includes(p))) return "marathi";
  if (BENGALI_PLACES.some((p) => loc.includes(p))) return "bengali";
  if (TELUGU_PLACES.some((p) => loc.includes(p))) return "telugu";
  if (KANNADA_PLACES.some((p) => loc.includes(p))) return "kannada";
  if (MALAYALAM_PLACES.some((p) => loc.includes(p))) return "malayalam";
  if (GUJARATI_PLACES.some((p) => loc.includes(p))) return "gujarati";
  if (PUNJABI_PLACES.some((p) => loc.includes(p))) return "punjabi";
  return "english";
}

// ── Draft clarification questions ─────────────────────────────────────────────

const DRAFT_QUESTIONS: Record<string, string[]> = {
  affidavit: [
    "What is the affidavit about? (e.g. proof of residence, name change, relationship, income)",
    "Who is the deponent? (full name, age, occupation, address)",
    "What are the key facts or statements to include?",
    "Before which court or authority will it be submitted?",
    "In which language? (English / Hindi / regional language)",
  ],
  "bail application": [
    "What is the case number and FIR number (if known)?",
    "Under which sections is the accused charged?",
    "Full name and details of the accused",
    "Name of the court where the application will be filed",
    "Key grounds for bail (first offence, no prior criminal record, illness, cooperation with investigation)",
  ],
  "legal notice": [
    "Who is sending the notice? (name and address of sender)",
    "To whom? (name and address of the recipient)",
    "What is the notice about? (cheque bounce, property dispute, unpaid dues, consumer complaint)",
    "What is the specific demand or relief sought?",
    "What is the deadline you are giving for compliance?",
  ],
  petition: [
    "What type of petition? (Writ, PIL, Civil, Criminal Revision, SLP, etc.)",
    "Which court will it be filed in?",
    "Who is the petitioner and who is the respondent?",
    "What is the cause of action or grievance?",
    "What relief is being sought from the court?",
    "Brief facts of the case (chronological)",
  ],
  plaint: [
    "Which court will the suit be filed in?",
    "Who is the plaintiff and who is the defendant?",
    "What is the cause of action? (breach of contract, property dispute, etc.)",
    "What is the relief or compensation sought?",
    "Key facts and dates in chronological order",
    "Valuation of the suit (for court fee purposes)",
  ],
  vakalatnama: [
    "Name of the advocate",
    "Name of the client (party in the case)",
    "Case number and name of the court",
    "Party's role (plaintiff/defendant/petitioner/respondent)",
  ],
  "rent agreement": [
    "Landlord's full name and address",
    "Tenant's full name and address",
    "Property address (full description)",
    "Monthly rent amount",
    "Duration of the agreement (e.g. 11 months from which date)",
    "Security deposit amount",
    "Special terms (maintenance, notice period, etc.)",
  ],
  will: [
    "Testator's full name, age, and address",
    "List of assets to be bequeathed (property, bank accounts, investments, jewellery, etc.)",
    "Beneficiaries: name and relationship for each asset",
    "Name of the executor (person who will carry out the will)",
    "Any specific conditions or instructions",
  ],
  "power of attorney": [
    "Who is granting the power? (name, address — the Principal)",
    "Who is receiving the power? (name, address — the Agent/Attorney)",
    "What powers are being granted? (sell property, manage bank accounts, sign documents)",
    "Is it a General or Specific Power of Attorney?",
    "Duration (permanent or for a specific period)?",
  ],
};

// Warm openers for Consumer — one per document type
const CONSUMER_OPENERS: Record<string, string> = {
  will:               "Planning ahead like this is one of the most thoughtful things you can do for your family.",
  "rent agreement":   "A proper rental agreement protects both sides — let's get this done right.",
  "power of attorney":"A Power of Attorney is an important document. I want to make sure it's exactly right for your situation.",
  affidavit:          "I can help you prepare this affidavit.",
  "bail application": "I understand this is urgent. Let me help you put together a strong application.",
  "legal notice":     "A well-drafted legal notice sets the right tone. Let's get the details right first.",
  petition:           "Let me help you frame a compelling petition.",
  plaint:             "I can help you draft the plaint. Let me get a few key details first.",
  vakalatnama:        "I can draft the Vakalatnama. Just need a few details.",
};

function getDraftClarificationMessage(documentType: string, persona: "Advocate" | "Consumer"): string {
  const key = Object.keys(DRAFT_QUESTIONS).find((k) =>
    documentType.toLowerCase().includes(k)
  );
  const allQuestions = key ? DRAFT_QUESTIONS[key] : [
    "What is the document about? Please describe the situation in brief.",
    "Who are the parties involved? (names, addresses, roles)",
    "What are the key facts or events to include?",
    "What outcome or relief are you looking for?",
    "In which court or authority will this be filed/used, and in which language?",
  ];

  const docLabel = documentType || "document";

  // Advocate: formal, all questions at once
  if (persona === "Advocate") {
    return `I can draft the ${docLabel} for you. Please provide the following details:\n\n${allQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nOnce you share these, I will draft it right away.`;
  }

  // Consumer: warm opener + first 3 questions only (consultative funnel — gather in stages)
  const opener = CONSUMER_OPENERS[key ?? ""] ?? `I can help you draft this ${docLabel}.`;
  const consumerQuestions = allQuestions.slice(0, 3);
  return `${opener} Before I draft this, I just need a few details from you:\n\n${consumerQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nFeel free to share whatever you know — we can fill in any remaining details as we go.`;
}

// ── Comprehensive one-shot intake checklist ───────────────────────────────────

function buildComprehensiveIntakeMessage(
  persona: "Advocate" | "Consumer",
  knownEra: Era,
  knownLocation: string,
  knownFacts: string,
): string {
  const items: string[] = [];

  // Only ask for date if era is not yet known
  if (knownEra === "unknown") {
    items.push(
      "**Incident Date** — When did this happen? (approximate date is fine — needed to determine which law applies: old IPC/CrPC or new BNS/BNSS post-July 2024)"
    );
  }

  // Only ask for location if not already known
  if (!knownLocation) {
    items.push(
      "**Court / Location** — Which court, police station, or authority is involved? (e.g., Ghaziabad District Court, Delhi High Court, Patna Sessions Court)"
    );
  }

  // Always ask status if not captured in facts
  if (!knownFacts || !knownFacts.toLowerCase().includes("fir")) {
    items.push(
      "**Current Status** — Please share:\n   - Has an FIR / complaint been filed? (if yes, FIR number and sections charged)\n   - Is anyone arrested, in custody, or out on bail?\n   - What stage is the matter at? (Complaint filed / Charge sheet / Trial / Appeal)"
    );
  }

  // Ask for documents
  items.push(
    "**Key Documents** — Do you have any of the following?\n   - FIR copy / Complaint copy / Court order / Summons\n   - Agreement / Title deed / Sale receipt\n   - Any other document relevant to this matter"
  );

  if (items.length === 0) {
    // Everything is known — this shouldn't happen but as a safety net
    return "";
  }

  const intro =
    persona === "Advocate"
      ? "To prepare precise legal guidance under the applicable statute, I need the following information:"
      : "To help you accurately, I need a few details about your situation:";

  return (
    `${intro}\n\n` +
    items.map((item, i) => `${i + 1}. ${item}`).join("\n\n") +
    "\n\nOnce you share these, I will provide comprehensive legal guidance."
  );
}

// ── Triage prompt ─────────────────────────────────────────────────────────────

interface TriageResult {
  intent: string;
  documentType: string;
  offenseDateStr: string;
  extractedLocation: string;
  extractedFacts: string;
  intakeAnswered: boolean;
  isCriminalQuery: boolean;
  complexityScore: string;
  clarificationMessage?: string;
  reasoning: string;
}

function buildTriagePrompt(
  userMessage: string,
  hasAttachment: boolean,
  isDraft: boolean,
  persona: string,
  priorEra: string,
  priorLocation: string,
  priorFacts: string,
  intakeComplete: boolean,
  priorTargetDocument: string,
): string {
  const contextLines = [
    priorEra !== "unknown" ? `- Era already LOCKED: ${priorEra} (do NOT ask for date again)` : "- Era: unknown",
    priorLocation ? `- Court/location already known: ${priorLocation}` : "- Location: unknown",
    priorFacts ? `- Prior facts: ${priorFacts.slice(0, 200)}` : "- Prior facts: none",
    `- Intake complete: ${intakeComplete}`,
    priorTargetDocument
      ? `- Document in progress: "${priorTargetDocument}" — we are already in the intake loop for this document. Do NOT ask what document they want.`
      : "- Target document: not yet identified",
  ].join("\n");

  return `You are an intent classifier for an Indian legal AI assistant. Classify the user message into EXACTLY ONE intent and extract context. Respond with valid JSON only.

PRIOR SESSION CONTEXT:
${contextLines}

INTENT DEFINITIONS:
1. "extraction" — User wants to extract text, read content, translate, or summarise a document.
2. "draftClarification" — User wants to DRAFT a document but has NOT provided enough details.
3. "research" — Case law, precedents, statute interpretation, legal position on a topic — including service law, pension, constitutional, civil, property, family, tax, labour, armed forces, administrative matters.
4. "basicDraft" — Simple document AND user has already provided SUFFICIENT details.
5. "eliteDraft" — Complex document AND user has provided SUFFICIENT details.
6. "complexReasoning" — Legal analysis, advice, rights, strategy, general legal questions.

RULES:
- If file attached and user wants to extract/read/translate/summarise → "extraction"
- For draft with missing details → "draftClarification"
- For draft with sufficient details → "basicDraft" or "eliteDraft"
- Otherwise → "research" or "complexReasoning"

ALSO EXTRACT:
- documentType: exact document type if drafting intent (e.g. "affidavit", "bail application"). Empty if not drafting.
- offenseDateStr: ISO date (YYYY-MM-DD) of the incident if mentioned in THIS message, else "unknown"
- extractedLocation: court/police station/city/district mentioned in THIS message, else ""
- extractedFacts: brief summary of case facts mentioned in THIS message (1-2 sentences), else ""
- intakeAnswered: true if the user is clearly providing answers to prior questions — EITHER (a) criminal intake answers (FIR number, incident date, arrest status, court name, charge sections) OR (b) document drafting details (testator/party full names, asset lists, property addresses, beneficiary names, party-specific facts for the draft). MULTILINGUAL TOLERANCE: Users frequently answer in Hinglish (Romanised Hindi) or regional languages. You MUST internally translate and evaluate these inputs. If the user provides substantive facts (names, ages, assets, addresses) in ANY language or script — including Hinglish such as "Mera naam Rajesh hai, age 45, ek flat hai Delhi mein, beta aur beti ko milega" — set intakeAnswered: true. false ONLY if the user is simply requesting a document without providing any substantive personal detail.
- isCriminalQuery: true ONLY if the matter involves criminal offences, FIR, arrest, bail, custody, charge sheet, conviction, IPC/BNS sections, NDPS, POCSO, or other criminal proceedings. false for service law, pension, civil disputes, property, family law, constitutional petitions, armed forces service matters, employment, tax, administrative law, etc.
- clarificationMessage: ONLY when intent is "draftClarification" — write 2-3 warm, specific questions to collect the minimum details needed to draft the document. CRITICAL: you MUST write these questions in the EXACT SAME language and script as the user's message. If the user wrote in Hinglish (Roman-script Hindi, e.g. "mera will banana hai"), reply in Hinglish. If in Devanagari Hindi, reply in Hindi. If in English, reply in English. Do NOT fall back to a fixed English template. For all other intents set to "".

CONSUMER DRAFT RULE — MANDATORY (applies ONLY when Persona is "Consumer"):
When a Consumer asks to draft ANY document (will, lease, agreement, petition, affidavit, etc.) and has NOT yet provided their specific personal details (full names, addresses, asset lists, party details), you MUST classify the intent as "draftClarification" — NOT "basicDraft" or "eliteDraft".
Exception: if intakeAnswered is true (the user is actively providing detailed personal answers), classify as "basicDraft" or "eliteDraft" as appropriate.
This rule does NOT apply to Advocate persona — Advocates may receive "basicDraft" or "eliteDraft" directly.

COMPLEXITY SCORE (only meaningful when intent is "complexReasoning"):
Return "ELITE" if ANY of the following apply:
- Appellate-level SC/HC precedent research (SLP, Writ, constitutional petition, PIL at High Court or above)
- Multi-jurisdictional conflict of laws or complex treaty/private international law analysis
- Complex litigation strategy at High Court or Supreme Court level requiring deep precedent synthesis
- Armed Forces Tribunal (AFT) service law matters
Return "STANDARD" for all other complexReasoning queries (this is the default for most cases):
- Trademark registration, IP rights, passing-off, copyright, trade secrets, domain disputes
- Consumer protection, compliance FAQs, general rights queries
- District court / NCLT / NCDRC / MACT / Labour Court / Debt Recovery Tribunal matters
- Property disputes, employment law, tax, regulatory compliance, service matters at district level
- General legal advice at any level not involving appellate SC/HC strategy
Return "" (empty string) for all non-complexReasoning intents.

User message: ${userMessage}
Has file attached: ${hasAttachment}
Persona: ${persona}
Has drafting keywords: ${isDraft}

Respond ONLY with JSON: {"intent":"...","documentType":"...","offenseDateStr":"...","extractedLocation":"...","extractedFacts":"...","intakeAnswered":true|false,"isCriminalQuery":true|false,"complexityScore":"STANDARD"|"ELITE"|"","clarificationMessage":"...","reasoning":"..."}`;
}

// ── Main supervisor node ──────────────────────────────────────────────────────

export async function supervisorNode(state: AgentState): Promise<Partial<AgentState>> {
  const userMessage = state.messages[state.messages.length - 1]?.content ?? "";
  const script = detectScript(userMessage);
  const effectiveLanguage = script === "latin" ? "en" : state.language;
  const newTokens = state.sessionTokens + countTokens(userMessage);
  const isDraft = hasDraftIntent(userMessage);

  // ── Already-known session context (from MemorySaver checkpoint) ────────────
  const priorEra = state.era;          // "unknown" | "pre-bns" | "post-bns"
  const priorLocation = state.location ?? "";
  const priorFacts = state.facts ?? "";
  const intakeComplete = state.intakeComplete ?? false;

  let lastModelUsed = "";
  let fallbackOccurred = false;
  let classificationSource: AgentState["classificationSource"] = "";
  const classifyStartMs = Date.now();

  // ── Tier-1: LLM triage call ───────────────────────────────────────────────
  let triage: TriageResult = {
    intent: "complexReasoning",
    documentType: "",
    offenseDateStr: "unknown",
    extractedLocation: "",
    extractedFacts: "",
    intakeAnswered: false,
    isCriminalQuery: false,
    complexityScore: "",
    reasoning: "",
  };

  try {
    const ai = getGemini();
    const triagePromptText = buildTriagePrompt(
      userMessage, state.hasAttachment, isDraft, state.persona,
      priorEra, priorLocation, priorFacts, intakeComplete,
      state.targetDocument ?? "",
    );
    const geminiContents = [{ role: "user", parts: [{ text: triagePromptText }] }];

    // Try 2.5-flash first; on 503 overload retry immediately with 2.5-flash-lite
    let geminiResult;
    let geminiModel = "gemini-2.5-flash";
    try {
      geminiResult = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: geminiContents });
    } catch (innerErr) {
      if ((innerErr as { status?: number }).status === 503) {
        console.error("[supervisor] gemini-2.5-flash 503 — retrying with gemini-2.5-flash-lite");
        geminiModel = "gemini-2.5-flash-lite";
        geminiResult = await ai.models.generateContent({ model: "gemini-2.5-flash-lite", contents: geminiContents });
      } else {
        throw innerErr;
      }
    }

    const rawText = geminiResult.text ?? "";
    // Strip markdown code fences Gemini occasionally wraps around JSON
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    triage = JSON.parse(cleaned) as TriageResult;
    lastModelUsed = geminiModel;
    fallbackOccurred = geminiModel !== "gemini-2.5-flash";
    classificationSource = "llm";
  } catch (err) {
    console.error("[supervisor] Gemini triage raw error:", err);
    console.error("[supervisor] Gemini triage failed — trying regex fallback");
  }

  // ── Tier-2: Regex fallback ────────────────────────────────────────────────
  if (classificationSource !== "llm") {
    const regexResult = regexClassifier(userMessage, state.hasAttachment);
    if (regexResult) {
      triage = { ...triage, intent: regexResult };
      classificationSource = "regex";
      console.error(`[supervisor] Tier-2 regex classified as "${regexResult}"`);
    }
  }

  // ── Tier-3: Graceful failure ──────────────────────────────────────────────
  if (!classificationSource) {
    classificationSource = "fallback_error";
    const fallbackMsg =
      state.persona === "Advocate"
        ? "I'm unable to determine the nature of your query. Could you rephrase or specify whether you need research, drafting, or legal analysis?"
        : "I'm having trouble understanding what you need. Could you tell me a little more about your situation?";
    console.error(JSON.stringify({
      event: "classification_failure",
      run_id: state.runId,
      persona: state.persona,
      classification_source: "fallback_error",
      message_length: userMessage.length,
      has_attachment: state.hasAttachment,
      latency_ms: Date.now() - classifyStartMs,
    }));
    return {
      classificationSource: "fallback_error",
      isVague: true,
      clarificationMessage: fallbackMsg,
      queryType: "complexReasoning",
      activeNode: "supervisor",
      sessionTokens: newTokens,
    };
  }

  // ── Consumer draft enforcement + loop breaker ─────────────────────────────
  // Guards: only Consumer + draft intent. Advocates always pass through directly.
  // Loop breaker: after 2 clarification turns, force-proceed with whatever facts exist.
  if (state.persona === "Consumer" && isDraft && !triage.intakeAnswered) {
    const isDraftIntent =
      triage.intent === "basicDraft" ||
      triage.intent === "eliteDraft" ||
      triage.intent === "complexReasoning";
    if (isDraftIntent) {
      if (state.clarificationAttempts >= 1) {
        // Hard loop breaker: 1 round of questions is the maximum — proceed to drafter
        console.error(JSON.stringify({
          event: "consumer_draft_funnel_max_attempts",
          run_id: state.runId,
          clarification_attempts: state.clarificationAttempts,
          document_type: triage.documentType || state.targetDocument,
        }));
        triage.intent = "basicDraft";
        triage.intakeAnswered = true;   // triggers intakeAnswered path → routes to basicDraft
      } else {
        console.error(JSON.stringify({
          event: "consumer_draft_funnel_override",
          run_id: state.runId,
          original_intent: triage.intent,
          document_type: triage.documentType || state.targetDocument,
          attempt: state.clarificationAttempts + 1,
        }));
        triage.intent = "draftClarification";
      }
    }
  }

  const intent = triage.intent as QueryType;

  // ── Classification telemetry ──────────────────────────────────────────────
  console.log(JSON.stringify({
    event: "classification_complete",
    run_id: state.runId,
    persona: state.persona,
    classification_source: classificationSource,
    query_type: intent,
    message_length: userMessage.length,
    has_attachment: state.hasAttachment,
    latency_ms: Date.now() - classifyStartMs,
  }));

  // ── Extract and accumulate location ───────────────────────────────────────
  const newLocation = triage.extractedLocation || priorLocation;
  const newFacts = triage.extractedFacts
    ? (priorFacts ? `${priorFacts}\n${triage.extractedFacts}` : triage.extractedFacts)
    : priorFacts;
  const newCourtLanguage = newLocation ? detectCourtLanguage(newLocation) : (state.courtLanguage ?? "");

  // ── Resolve era ────────────────────────────────────────────────────────────
  // Era is locked in state reducer once set; we only compute a NEW era if unknown
  let resolvedOffenseDate: Date | "unknown" = state.offenseDate;
  let resolvedEra: Era = priorEra;
  if (priorEra === "unknown" && triage.offenseDateStr && triage.offenseDateStr !== "unknown") {
    const parsed = new Date(triage.offenseDateStr);
    if (!isNaN(parsed.getTime())) {
      resolvedOffenseDate = parsed;
      resolvedEra = getEra(parsed);
    }
  }

  // ── Court language acknowledgement message ─────────────────────────────────
  // Emit a note when we first detect a Hindi-medium court so the user knows
  // the draft will be prepared accordingly.
  let courtLangNote = "";
  if (newCourtLanguage && newCourtLanguage !== "english" && !state.courtLanguage) {
    const langName = newCourtLanguage.charAt(0).toUpperCase() + newCourtLanguage.slice(1);
    courtLangNote = `\n\n> **Note:** ${newLocation} follows ${langName}-medium court proceedings. Legal drafts for this jurisdiction will be prepared in ${langName} (with technical terms retained in English as per standard court practice).`;
  }

  // ── Common state fields to return ─────────────────────────────────────────
  const baseUpdate: Partial<AgentState> = {
    script,
    language: effectiveLanguage,
    sessionTokens: newTokens,
    lastModelUsed,
    fallbackOccurred,
    activeNode: "supervisor",
    location: newLocation,
    facts: newFacts,
    courtLanguage: newCourtLanguage,
    offenseDate: resolvedOffenseDate,
    era: resolvedEra,
    classificationSource,
    complexityScore: (triage.complexityScore as ComplexityScore) || "",
  };

  // ── 1. Extraction intent ───────────────────────────────────────────────────
  if (intent === "extraction") {
    if (!state.hasAttachment) {
      return {
        ...baseUpdate,
        isVague: true,
        clarificationMessage: "Please attach the document (PDF, image, or audio) you would like me to extract or translate.",
        queryType: "extraction",
      };
    }
    return { ...baseUpdate, isVague: false, queryType: "extraction" };
  }

  // ── 2. Draft clarification ─────────────────────────────────────────────────
  if (intent === "draftClarification") {
    const effectiveDocType = triage.documentType || state.targetDocument;
    // Gemini generates the message dynamically in the user's own language/script.
    // Fall back to the static template only when Gemini returned nothing.
    const dynamicMsg = triage.clarificationMessage?.trim()
      || getDraftClarificationMessage(effectiveDocType, state.persona);
    return {
      ...baseUpdate,
      isVague: true,
      clarificationMessage: dynamicMsg + courtLangNote,
      queryType: "draftClarification",
      targetDocument: effectiveDocType,
      // Increment only for Consumer — loop breaker does not apply to Advocate
      clarificationAttempts: state.persona === "Consumer"
        ? state.clarificationAttempts + 1
        : state.clarificationAttempts,
    };
  }

  // ── 3. File attached (non-extraction) → let utility node handle OCR ────────
  if (state.hasAttachment) {
    return {
      ...baseUpdate,
      isVague: false,
      queryType:
        intent === "basicDraft" || intent === "eliteDraft" || intent === "research"
          ? intent
          : "complexReasoning",
    };
  }

  // ── 3b. User mentions uploading / attaching but no file yet ──────────────
  // The triage model often classifies "I can upload the documents" as
  // complexReasoning rather than extraction. Catch it here so we never route
  // to the LLM with a message about file uploads that it cannot act on.
  const uploadMentioned =
    /\b(upload|attach|send|share)\b.{0,40}\b(document|file|pdf|image|photo|paper|copy|fir|order|notice|agreement)\b/i.test(userMessage) ||
    /\b(i can|i will|let me|i want to)\b.{0,25}\b(upload|attach|send|share)\b/i.test(userMessage) ||
    /\b(documents?|files?|papers?|copies)\b.{0,25}\b(available|ready|here|share|upload|attach|send)\b/i.test(userMessage);

  if (uploadMentioned) {
    return {
      ...baseUpdate,
      isVague: true,
      clarificationMessage:
        "Please use the **attachment button** (📎 paperclip icon at the left side of the message box) to upload your document, then send your message.\n\nI support: PDFs, images (JPG, PNG, WebP, GIF), and audio files (MP3, WAV, M4A). Once attached, I will read and analyse the document for you.",
      queryType: "extraction",
    };
  }

  // ── 4. Criminal intake gate ────────────────────────────────────────────────
  //
  // The criminal intake checklist (FIR details, era/offense date, arrest status)
  // is ONLY relevant when:
  //   a) The query involves criminal law (FIR, bail, custody, IPC/BNS offenses), AND
  //   b) It is a DRAFT request (where correct section numbers matter critically), AND
  //   c) The era (IPC vs BNS) is still unknown.
  //
  // Research queries — whether about pension law, service law, Supreme Court
  // judgments, civil disputes, constitutional matters, armed forces, or ANY
  // non-criminal topic — go DIRECTLY to the research node. The researchMaker
  // can resolve ambiguity on its own without interrogating the user first.
  //
  // complexReasoning goes directly to eliteReasoner; no intake needed there either.
  //
  const isCriminal = triage.isCriminalQuery;
  const needsCriminalIntake =
    isCriminal &&
    (intent === "eliteDraft" || intent === "basicDraft") &&
    resolvedEra === "unknown" &&
    !intakeComplete &&
    !triage.intakeAnswered;

  if (needsCriminalIntake) {
    const intakeMsg = buildComprehensiveIntakeMessage(
      state.persona,
      resolvedEra,
      newLocation,
      newFacts,
    );
    return {
      ...baseUpdate,
      isVague: true,
      clarificationMessage: intakeMsg + courtLangNote,
      queryType: intent,
    };
  }

  // ── 5. User answered intake → mark complete, proceed ──────────────────────
  if (triage.intakeAnswered) {
    return {
      ...baseUpdate,
      isVague: false,
      intakeComplete: true,
      queryType: intent,
    };
  }

  // ── 6. Route directly — research, complexReasoning, non-criminal drafts ───
  return {
    ...baseUpdate,
    isVague: false,
    intakeComplete: needsCriminalIntake ? false : intakeComplete,
    queryType: intent,
  };
}
