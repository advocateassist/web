"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FolderLock,
  Settings,
  Paperclip,
  Mic,
  MicOff,
  Send,
  FileText,
  Menu,
  X,
  SquarePen,
  ChevronRight,
  Plus,
  ShieldCheck,
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  BookOpen,
  Scale,
  User,
  Gavel,
  // Quick action icons
  ScrollText,
  Home,
  ShieldAlert,
  Briefcase,
  HeartHandshake,
  Building2,
  Car,
  CreditCard,
  Globe,
  FileSignature,
  ClipboardList,
  BookMarked,
  Landmark,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Case } from "@/lib/db";
import type { Citation, Persona, ChatMessage } from "@/types/agent";
import { WhatsAppConsultButton } from "@/components/WhatsAppConsultButton";

// ── Web Speech API types ───────────────────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ── Language options ──────────────────────────────────────────────────────────
const LANGUAGE_OPTIONS = [
  { code: "en-IN", label: "English (India)", bcp: "en" },
  { code: "hi-IN", label: "Hindi", bcp: "hi" },
  { code: "ta-IN", label: "Tamil", bcp: "ta" },
  { code: "mr-IN", label: "Marathi", bcp: "mr" },
  { code: "bn-IN", label: "Bengali", bcp: "bn" },
  { code: "te-IN", label: "Telugu", bcp: "te" },
  { code: "gu-IN", label: "Gujarati", bcp: "gu" },
  { code: "kn-IN", label: "Kannada", bcp: "kn" },
];

type AgentStep =
  | "idle"
  | "status"
  | "citations"
  | "verifying"
  | "drafting"
  | "complete"
  | "error"
  | "fallback"
  | "hallucination";

interface ThoughtEvent {
  ts: number;
  step: string;
  node?: string;
  message?: string;
  modelUsed?: string;
  modelLabel?: string;
  primaryModel?: string;
  fallbackOccurred?: boolean;
  era?: string;
  queryType?: string;
  reason?: string;
  citations?: unknown[];
  [key: string]: unknown;
}

// ── Quick Action tiles (Gemini-style) ─────────────────────────────────────────

interface QuickAction {
  icon: React.ElementType;
  label: string;
  sub: string;
  prompt: string;
  color: string;
}

const CLIENT_ACTIONS: QuickAction[] = [
  {
    icon: ScrollText,
    label: "Draft a Will",
    sub: "Simple testamentary will",
    prompt: "I want to write a simple Will to distribute my property and assets after my death. Please guide me step by step on what it must include under Indian law.",
    color: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    icon: Home,
    label: "Rental Agreement",
    sub: "Residential / commercial lease",
    prompt: "Help me draft a rental agreement for my residential property in India. Include clauses for rent, notice period, security deposit, and maintenance.",
    color: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    icon: ShieldAlert,
    label: "File a Complaint",
    sub: "FIR, police complaint, consumer",
    prompt: "I want to file a police complaint / FIR. Explain the process, what I need to say at the police station, and draft a written complaint for me.",
    color: "bg-red-50 text-red-700 border-red-100",
  },
  {
    icon: ClipboardList,
    label: "Write an Application",
    sub: "RTI, government application",
    prompt: "Help me write an RTI application to get information from a government department in India. What can I ask and how do I submit it?",
    color: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    icon: HeartHandshake,
    label: "Family Law",
    sub: "Divorce, maintenance, custody",
    prompt: "I need to understand my rights under Indian family law. Explain the divorce process, maintenance rights, and child custody rules under the Hindu Marriage Act / Special Marriage Act.",
    color: "bg-rose-50 text-rose-700 border-rose-100",
  },
  {
    icon: Building2,
    label: "Property Dispute",
    sub: "Land, flat, ownership",
    prompt: "I am involved in a property dispute in India. Explain what legal options I have, what documents I need, and how to approach the civil court.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    icon: Car,
    label: "Road Accident / MACT",
    sub: "Motor accident compensation",
    prompt: "I was in a road accident. Explain how to file a MACT (Motor Accident Claims Tribunal) claim in India, what compensation I can get, and the process.",
    color: "bg-orange-50 text-orange-700 border-orange-100",
  },
  {
    icon: CreditCard,
    label: "Banking / Loan Issue",
    sub: "Bank dispute, loan harassment",
    prompt: "I am facing harassment from a bank or loan recovery agent. What are my rights under RBI guidelines and SARFAESI Act? How can I file a complaint?",
    color: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
];

const ADVOCATE_ACTIONS: QuickAction[] = [
  {
    icon: FileSignature,
    label: "Draft Legal Notice",
    sub: "Civil, criminal, demand",
    prompt: "Help me draft a formal legal notice under Section 80 CPC / under the Negotiable Instruments Act Section 138 for a cheque bounce matter. Provide a template with all mandatory clauses.",
    color: "bg-slate-50 text-slate-700 border-slate-200",
  },
  {
    icon: BookMarked,
    label: "Research Case Law",
    sub: "Precedents on IndianKanoon",
    prompt: "Research the latest Supreme Court and High Court judgments on [topic]. Provide citations, holdings, and the current legal position with relevant sections.",
    color: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    icon: Gavel,
    label: "Draft Bail Application",
    sub: "Regular bail / anticipatory",
    prompt: "Help me draft a regular bail application under Section 483 BNSS (formerly Section 437 CrPC) for my client. Provide the grounds, legal arguments, and case law to cite.",
    color: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    icon: Landmark,
    label: "Writ Petition",
    sub: "HC / SC constitutional petition",
    prompt: "I need to file a Writ Petition under Article 226 of the Constitution before the High Court. Draft the petition with grounds, prayer clause, and key constitutional arguments.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    icon: Globe,
    label: "Translate Document",
    sub: "Legal translation (any language)",
    prompt: "I need to translate a legal document from [source language] to English accurately. Maintain legal terminology and formatting. Here is the text: [paste document]",
    color: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    icon: ScrollText,
    label: "Draft Affidavit",
    sub: "Sworn statement, CPC Order XIX",
    prompt: "Draft a general affidavit for submission before a court under CPC Order XIX. Include proper jurat, verification clause, and standard notarization language under Indian law.",
    color: "bg-rose-50 text-rose-700 border-rose-100",
  },
  {
    icon: Briefcase,
    label: "Vakalatnama",
    sub: "Power of attorney for litigation",
    prompt: "Draft a Vakalatnama (engagement letter / power of attorney) authorising me as the advocate for my client in a civil / criminal matter before the District Court.",
    color: "bg-orange-50 text-orange-700 border-orange-100",
  },
  {
    icon: Scale,
    label: "Court Process Guide",
    sub: "Procedure, timelines, forms",
    prompt: "Explain the step-by-step procedure for filing a [type of case] in India. Include which court to approach, required forms, court fees, timelines, and key procedural rules under BNSS / CPC.",
    color: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
];

// ── Quick action grid ─────────────────────────────────────────────────────────
function QuickActionGrid({ persona, onSelect }: { persona: Persona; onSelect: (prompt: string) => void }) {
  const actions = persona === "Advocate" ? ADVOCATE_ACTIONS : CLIENT_ACTIONS;
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-2 pb-4">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 text-center">
        {persona === "Advocate" ? "What would you like to work on?" : "What can I help you with today?"}
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => onSelect(a.prompt)}
              className={`group flex flex-col gap-1.5 p-3 rounded-2xl border text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${a.color}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <p className="text-xs font-semibold leading-snug">{a.label}</p>
              <p className="text-[10px] opacity-70 leading-snug hidden sm:block">{a.sub}</p>
              <ArrowRight size={11} className="self-end opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Create-Case Modal ─────────────────────────────────────────────────────────
function CreateCaseModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    await db.cases.add({ title: trimmed, status: "active", createdAt: new Date(), updatedAt: new Date() });
    await db.analytics.add({ action: "case_created", timestamp: new Date() });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-slate-700" />
            <h3 className="font-semibold text-slate-900 text-base">New Local Case</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed bg-slate-50 rounded-lg px-3 py-2">
          Stored only on your device. Nothing is sent to our servers.
        </p>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Case Title</label>
        <input
          ref={inputRef}
          type="text"
          placeholder="e.g. State vs. Sharma"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 mb-5 transition-all"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-slate-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || saving}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${title.trim() && !saving ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
          >
            {saving ? "Saving…" : "Create Case"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Agent status banner ───────────────────────────────────────────────────────
function AgentStatusBanner({
  step, message, fallbackLabel,
}: {
  step: AgentStep;
  message: string;
  node?: string;
  fallbackLabel?: string;
}) {
  if (step === "idle" || step === "complete") return null;

  const isFallback     = step === "fallback";
  const isHallucination = step === "hallucination" || message.toLowerCase().includes("hallucination");
  const isError        = step === "error";

  const icon = isFallback
    ? <Loader2 size={14} className="flex-shrink-0 animate-spin text-blue-500" />
    : isError || isHallucination
    ? <AlertTriangle size={14} className="flex-shrink-0" />
    : step === "verifying"
    ? <CheckCircle size={14} className="flex-shrink-0 text-green-600" />
    : step === "citations"
    ? <Search size={14} className="flex-shrink-0 animate-pulse" />
    : <Loader2 size={14} className="flex-shrink-0 animate-spin" />;

  const bg = isFallback
    ? "bg-blue-50 border-blue-200 text-blue-800"
    : isError || isHallucination
    ? "bg-amber-50 border-amber-200 text-amber-800"
    : step === "verifying"
    ? "bg-green-50 border-green-200 text-green-800"
    : "bg-slate-50 border-slate-200 text-slate-700";

  const displayMessage = isFallback
    ? `Optimizing connection${fallbackLabel ? ` → ${fallbackLabel}` : ""}...`
    : message;

  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border mx-auto max-w-2xl mb-2 ${bg}`}>
      {icon}
      <span>{displayMessage}</span>
    </div>
  );
}

// ── Thought Stream Debug Panel ─────────────────────────────────────────────────
function ThoughtStreamPanel({ events }: { events: ThoughtEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="p-3 text-[10px] text-slate-500 italic text-center">
        No events yet — send a query to see the thought stream.
      </div>
    );
  }
  return (
    <div className="overflow-y-auto max-h-full p-2 space-y-1">
      {[...events].reverse().map((ev, i) => {
        const isFallback = ev.step === "fallback";
        const isHallucination = ev.step === "hallucination";
        const isError = ev.step === "error";
        const dot = isFallback ? "bg-blue-400" : isHallucination ? "bg-amber-400" : isError ? "bg-red-400" : "bg-emerald-400";
        return (
          <div key={i} className="bg-slate-900 rounded-md p-2 text-[9px] font-mono leading-relaxed border border-slate-800">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-slate-300 font-semibold uppercase tracking-wider">{ev.step}</span>
              {ev.node && <span className="text-slate-500">· {ev.node}</span>}
              <span className="ml-auto text-slate-600">{new Date(ev.ts).toLocaleTimeString()}</span>
            </div>
            <pre className="text-slate-400 whitespace-pre-wrap break-all overflow-hidden">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(ev).filter(([k]) => k !== "ts")
                ),
                null, 2
              )}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

// ── Citations panel ───────────────────────────────────────────────────────────
function CitationsPanel({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 flex items-center gap-1.5 border-b border-gray-100">
        <BookOpen size={12} className="text-slate-500" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Verified Citations</span>
      </div>
      <ul className="divide-y divide-gray-50">
        {citations.map((c, i) => (
          <li key={i} className="px-3 py-2.5">
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 group">
              <ExternalLink size={11} className="flex-shrink-0 mt-0.5 text-blue-500 group-hover:text-blue-700" />
              <div>
                <p className="text-xs font-medium text-blue-600 group-hover:underline leading-snug">{c.caseTitle}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{c.citation} · {c.year}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{c.holding}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Mobile Thought Stream slide-up drawer ─────────────────────────────────────
// Full Thought Stream panel as a bottom sheet on mobile (hidden on lg+).
// Uses CSS transform so no shadcn dependency needed.
function MobileThoughtDrawer({
  open,
  onClose,
  events,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  events: ThoughtEvent[];
  onClear: () => void;
}) {
  return (
    <>
      {/* Backdrop — tap to close */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      {/* Slide-up panel */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-50 bg-slate-950 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "72vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-slate-700" />
        </div>
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
              Thought Stream
            </span>
            <span className="text-[9px] font-mono text-slate-500">{events.length} events</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="text-slate-600 hover:text-slate-400 text-[10px] px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-600 transition-colors"
            >
              Clear
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <ThoughtStreamPanel events={events} />
        </div>
      </div>
    </>
  );
}

// ── Inline markdown renderer ──────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
          return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={i}>{part.slice(1, -1)}</em>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const t = block.trim();
        if (!t) return null;
        if (t.startsWith("### ")) return <h4 key={bi} className="font-semibold text-slate-700 mt-1 text-sm">{renderInline(t.slice(4))}</h4>;
        if (t.startsWith("## "))  return <h3 key={bi} className="font-semibold text-slate-800 text-sm mt-1">{renderInline(t.slice(3))}</h3>;
        if (t.startsWith("# "))   return <h2 key={bi} className="font-bold text-slate-900 text-sm mt-1">{renderInline(t.slice(2))}</h2>;

        const lines = t.split("\n");

        // ── Table detection ────────────────────────────────────────────────
        const pipeLines = lines.filter(l => l.trim().startsWith("|"));
        const hasSeparator = pipeLines.some(l => /^\|[\s\-: |]+\|/.test(l.trim()) && l.includes("-"));
        if (pipeLines.length >= 2 && hasSeparator) {
          const parseRow = (row: string) =>
            row.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
          const dataLines = pipeLines.filter(
            l => !/^\|[\s\-: |]+\|/.test(l.trim()) || !l.includes("-")
          );
          const headers = dataLines.length > 0 ? parseRow(dataLines[0]) : [];
          const dataRows = dataLines.slice(1).map(parseRow);
          return (
            <div key={bi} className="overflow-x-auto my-1 rounded-lg border border-slate-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    {headers.map((h, hi) => (
                      <th key={hi} className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">{renderInline(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="border-t border-slate-100 px-3 py-2 text-slate-600 leading-relaxed">{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // ── List detection ─────────────────────────────────────────────────
        const isListBlock = lines.some(l => /^[-*•]\s/.test(l) || /^\d+\.\s/.test(l));
        if (isListBlock) {
          return (
            <ul key={bi} className="space-y-0.5 pl-4 list-disc">
              {lines.filter(l => l.trim()).map((line, li) => {
                const stripped = line.replace(/^[-*•]\s/, "").replace(/^\d+\.\s/, "");
                return (
                  <li key={li} className="text-slate-700 leading-relaxed">{renderInline(stripped)}</li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={bi} className="text-slate-700 leading-relaxed">
            {lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ── Teaser content renderer ───────────────────────────────────────────────────
// Detects the drafting teaser separator and renders only the preview portion,
// replacing the "[...Document continues...]" marker with an inline WhatsApp CTA.
const TEASER_PATTERN =
  /\[\.\.\.(?:Document continues|Full document available via WhatsApp)\.\.\.\]/;

function hasTeaserMarker(content: string): boolean {
  return TEASER_PATTERN.test(content);
}

function TeaserContent({
  content,
  persona,
  allMessages,
  userName,
}: {
  content: string;
  persona?: Persona;
  allMessages?: ChatMessage[];
  userName?: string;
}) {
  const match = TEASER_PATTERN.exec(content);
  if (!match) return <>{content}</>;
  // Trim everything from the last \n\n before the marker
  const cutIdx = content.lastIndexOf("\n\n", match.index);
  const previewText = cutIdx > 0 ? content.slice(0, cutIdx) : content.slice(0, match.index);
  return (
    <>
      {previewText}
      <span className="block mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400 italic">
        📄 Preview only — full document available via WhatsApp
      </span>
      <div className="mt-2">
        <WhatsAppConsultButton
          persona={persona ?? "Consumer"}
          messages={allMessages}
          userName={userName}
        />
      </div>
    </>
  );
}

// ── Mobile Agent Steps drawer ─────────────────────────────────────────────────
// Visible only on mobile (hidden on lg+). Shows running agent steps as a
// collapsible bar at the top of the chat feed.
function MobileAgentDrawer({
  isStreaming,
}: {
  steps: Array<{ node: string; message: string; ts: number }>;
  open: boolean;
  onToggle: () => void;
  isStreaming: boolean;
}) {
  if (!isStreaming) return null;
  return (
    <div className="lg:hidden mx-3 mb-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="h-2 w-2 rounded-full flex-shrink-0 bg-blue-500 animate-pulse" />
        <span className="text-xs text-slate-500">Processing your request...</span>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  allMessages,
  userName,
}: {
  msg: ChatMessage;
  allMessages?: ChatMessage[];
  userName?: string;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap">{msg.content}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-full flex-shrink-0 overflow-hidden ring-1 ring-gray-100">
        <img src="/logo.png" alt="AI" className="h-full w-full object-cover" />
      </div>
      <div className="flex-1 max-w-[85%] space-y-2">
        <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 text-sm text-slate-700">
          {hasTeaserMarker(msg.content) ? (
            <TeaserContent
              content={msg.content}
              persona={msg.persona}
              allMessages={allMessages}
              userName={userName}
            />
          ) : (
            <>
              {renderMarkdown(msg.content)}
              {msg.isAnimating && (
                <span className="inline-block w-0.5 h-3.5 bg-slate-400 ml-0.5 align-middle animate-pulse" />
              )}
            </>
          )}
        </div>
        {msg.citations && msg.citations.length > 0 && <CitationsPanel citations={msg.citations} />}
        {msg.showCta && !msg.isAnimating && (
          <WhatsAppConsultButton
            persona={msg.persona ?? "Consumer"}
            messages={allMessages}
            userName={userName}
          />
        )}
      </div>
    </div>
  );
}

// ── Welcome screen (empty state) ──────────────────────────────────────────────
function WelcomeScreen({ persona, onQuickAction }: { persona: Persona; onQuickAction: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-6 pb-4">
      {/* Greeting bubble */}
      <div className="flex gap-3 w-full max-w-2xl px-4 mb-6">
        <div className="h-8 w-8 rounded-full flex-shrink-0 overflow-hidden ring-1 ring-gray-100">
          <img src="/logo.png" alt="AI" className="h-full w-full object-cover" />
        </div>
        <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 text-sm leading-relaxed text-slate-600 max-w-[85%] space-y-1">
          <p className="font-semibold text-slate-800">
            {persona === "Advocate"
              ? "Welcome, Advocate. How can I assist with your matter today?"
              : "Welcome to Advocate Assist. How can I help you today?"}
          </p>
          <p className="text-slate-500 text-xs">
            {persona === "Advocate"
              ? "Provide the specific facts, court stage, and relevant sections. I will research authoritative precedents and draft precise legal documents."
              : "Tell me about your legal situation in your own words, or choose one of the options below — I'll explain your rights clearly and guide you on what to do."}
          </p>
        </div>
      </div>

      {/* Role-based quick-action tiles */}
      <QuickActionGrid persona={persona} onSelect={onQuickAction} />
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdvocateAssistDashboard() {
  const { data: session, update } = useSession();
  const [chatInput, setChatInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );
  const [agentStep, setAgentStep] = useState<AgentStep>("idle");
  const [agentMessage, setAgentMessage] = useState("");
  const [agentNode, setAgentNode] = useState("");
  const [agentFallbackLabel, setAgentFallbackLabel] = useState("");
  const [pendingCitations, setPendingCitations] = useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [persona, setPersona] = useState<Persona>("Consumer");
  const [selectedLang, setSelectedLang] = useState(LANGUAGE_OPTIONS[0]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  // ── Debug thought stream ──────────────────────────────────────────────────
  const [showDebug, setShowDebug] = useState(false);
  const [thoughtStream, setThoughtStream] = useState<ThoughtEvent[]>([]);
  // ── OCR pre-flight + mobile Agent Steps drawer ────────────────────────────
  const [ocrPreview, setOcrPreview] = useState<{ loading: boolean; docType: string; text: string } | null>(null);
  const [agentSteps, setAgentSteps] = useState<Array<{ node: string; message: string; ts: number }>>([]);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // ── Mobile Thought Stream slide-up drawer ─────────────────────────────────
  const [mobileThoughtOpen, setMobileThoughtOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── Fallback banner timer — must be cancellable when complete fires ────────
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cases = useLiveQuery(() => db.cases.orderBy("createdAt").reverse().toArray(), []);

  // If the JWT token has stale onboarding state (e.g. user completed onboarding
  // in a previous session or via an OAuth sign-in that missed custom fields),
  // auto-refresh the token from the DB so OCR/chat routes stop returning 403.
  useEffect(() => {
    if (session && session.user && !(session.user as { isOnboarded?: boolean }).isOnboarded) {
      update({ refreshUser: true }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  // Read persona from cookie set after onboarding
  useEffect(() => {
    const match = document.cookie.split("; ").find(row => row.startsWith("aa_persona="));
    if (match) {
      const val = match.split("=")[1];
      if (val === "Advocate" || val === "Consumer") setPersona(val);
    }
    setSttSupported(typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentStep, agentMessage]);

  useEffect(() => {
    historyRef.current = messages.map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  // Auto-grow textarea — expands up to 4 rows while typing, collapses after send
  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }

  function collapseTextarea() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  // ── Quick action handler ────────────────────────────────────────────────────
  const handleQuickAction = useCallback((prompt: string) => {
    setChatInput(prompt);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        autoGrow(textareaRef.current);
      }
    }, 50);
  }, []);

  // ── Web Speech API STT ──────────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (!sttSupported) { alert("Voice input not supported on this browser."); return; }
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLang.code;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join("");
      setChatInput(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    // Haptic feedback on Android / iOS (Vibration API)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(50); } catch (_e) { /* unsupported — ignore */ }
    }
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [isRecording, sttSupported, selectedLang.code]);

  // ── File attach — triggers OCR pre-flight for images/PDFs/audio ─────────────
  const handleFileAttach = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAttachedFile(file);
    setOcrPreview(null);

    // Only run OCR pre-flight for supported multimodal types
    const needsOcr =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      file.type.startsWith("audio/");
    if (!needsOcr) return;

    setOcrPreview({ loading: true, docType: "", text: "" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json() as { extractedText?: string; detectedDocType?: string };
        setOcrPreview({
          loading: false,
          docType: data.detectedDocType ?? "Document",
          text: data.extractedText ?? "",
        });
      } else {
        setOcrPreview({ loading: false, docType: "Document", text: "" });
      }
    } catch (_e) {
      setOcrPreview({ loading: false, docType: "Document", text: "" });
    }
  }, []);

  // ── Streaming chat handler ──────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const query = chatInput.trim();
    if ((!query && !attachedFile) || isStreaming) return;

    await db.analytics.add({ action: "query_sent", timestamp: new Date() });

    let attachmentData: string | undefined;
    let attachmentMimeType: string | undefined;

    if (attachedFile) {
      const reader = new FileReader();
      await new Promise<void>((res) => {
        reader.onload = () => { attachmentData = reader.result as string; attachmentMimeType = attachedFile.type; res(); };
        reader.readAsDataURL(attachedFile);
      });
    }

    const userContent = query || (attachedFile ? `[Attached: ${attachedFile.name}]` : "");
    setMessages((prev) => [...prev, { role: "user", content: userContent, persona }]);
    setChatInput("");
    setTimeout(collapseTextarea, 0);
    setAttachedFile(null);
    setOcrPreview(null);
    setIsStreaming(true);
    setAgentStep("status");
    setAgentMessage("Triaging your query...");
    setAgentNode("supervisor");
    setAgentFallbackLabel("");
    setPendingCitations([]);
    setThoughtStream([]);
    setAgentSteps([]);
    setMobileDrawerOpen(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userContent,
          persona,
          language: selectedLang.bcp,
          history: historyRef.current,
          threadId: conversationId,
          ...(attachmentData && { attachmentData, attachmentMimeType }),
          ...(ocrPreview?.text ? { prextractedOcrText: ocrPreview.text } : {}),
        }),
      });

      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalCitations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;

          // Capture every event in the thought stream (debug mode)
          setThoughtStream((prev) => [
            ...prev,
            { ...payload, ts: Date.now() } as ThoughtEvent,
          ]);

          switch (payload.step) {
            case "status":
              setAgentStep("status");
              setAgentNode(payload.node as string ?? "");
              setAgentMessage(payload.message as string);
              setAgentFallbackLabel("");
              setAgentSteps((prev) => [
                ...prev,
                { node: (payload.node as string) ?? "", message: payload.message as string, ts: Date.now() },
              ]);
              break;
            case "fallback":
              // Brief "Optimizing connection..." banner — auto-clears after 2.5s.
              // Store the timer ID so complete/error can cancel it before it fires.
              if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
              setAgentStep("fallback");
              setAgentFallbackLabel(payload.modelLabel as string ?? "");
              fallbackTimerRef.current = setTimeout(() => {
                fallbackTimerRef.current = null;
                setAgentStep("status");
                setAgentFallbackLabel("");
              }, 2500);
              break;
            case "hallucination":
              setAgentStep("hallucination");
              setAgentMessage(payload.message as string ?? "Hallucination detected — re-searching...");
              break;
            case "thought":
              // Thought events are captured in stream only; no UI banner change
              break;
            case "citations":
              finalCitations = (payload.citations as Citation[]) ?? [];
              setPendingCitations(finalCitations);
              setAgentStep("citations");
              setAgentMessage(payload.message as string);
              break;
            case "verifying":
              setAgentStep("verifying");
              setAgentMessage(payload.message as string);
              if (!(payload.flagged as boolean)) finalCitations = (payload.citations as Citation[]) ?? finalCitations;
              break;
            case "warning":
              setAgentMessage(payload.message as string);
              break;
            case "complete": {
              const fullContent = payload.content as string;
              const showCta = (payload.showCta as boolean) ?? false;
              // Cancel any pending fallback-banner timer before changing step —
              // prevents the stale 2.5s callback from resurrecting "status" after
              // the response has already been marked complete (OCR failure race).
              if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
              }
              setAgentStep("complete");
              // Clear any prior animation
              if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
              // Add placeholder with empty content
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "", citations: finalCitations, persona, isAnimating: true, showCta },
              ]);
              // Reveal 3 characters every 20 ms — visible streaming animation
              let charIdx = 0;
              streamIntervalRef.current = setInterval(() => {
                charIdx = Math.min(charIdx + 3, fullContent.length);
                const shown = fullContent.slice(0, charIdx);
                const done = charIdx >= fullContent.length;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant" && last.isAnimating) {
                    next[next.length - 1] = { ...last, content: shown, isAnimating: !done };
                  }
                  return next;
                });
                if (done) {
                  if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
                  setAgentStep("idle");
                }
              }, 20);
              break;
            }
            case "error":
              throw new Error(payload.message as string);
          }
        }
      }
    } catch (err) {
      // Cancel any pending fallback-banner timer so it doesn't overwrite "error"
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      setAgentStep("error");
      setAgentMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      setTimeout(() => setAgentStep("idle"), 6000);
    } finally {
      setIsStreaming(false);
      setPendingCitations([]);
    }
  }, [chatInput, attachedFile, isStreaming, persona, selectedLang.bcp]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="flex h-screen w-full bg-white font-sans text-slate-900 overflow-hidden">
      {showCreateModal && <CreateCaseModal onClose={() => setShowCreateModal(false)} />}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col w-72 bg-slate-950 text-white transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 lg:w-64 lg:flex-shrink-0`}>
        <div className="p-5 flex flex-col items-center border-b border-slate-800 relative">
          <button className="absolute top-4 right-4 text-slate-400 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
          <img src="/logo.png" alt="Advocate Assist Logo" className="h-16 w-16 mb-3 rounded-full object-cover ring-2 ring-white ring-offset-2 ring-offset-slate-950" />
          <h1 className="text-base font-bold tracking-widest text-center leading-tight">ADVOCATE<br />ASSIST</h1>
          <p className="text-[9px] text-slate-400 tracking-widest mt-1">LEGAL ASSISTANT AI</p>
        </div>

        {/* Persona selector */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">I am a</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPersona("Consumer")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${persona === "Consumer" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              <User size={13} />
              Client
            </button>
            <button
              onClick={() => setPersona("Advocate")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${persona === "Advocate" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              <Gavel size={13} />
              Advocate
            </button>
          </div>
        </div>

        {/* Language selector */}
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Language</p>
          <select
            value={selectedLang.code}
            onChange={(e) => setSelectedLang(LANGUAGE_OPTIONS.find((l) => l.code === e.target.value) ?? LANGUAGE_OPTIONS[0])}
            className="w-full bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {LANGUAGE_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto border-t border-slate-800">
          <button
            className="w-full flex items-center gap-3 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg mb-5 transition-colors"
            onClick={() => {
              setMessages([]);
              setPendingCitations([]);
              setAgentStep("idle");
              setSidebarOpen(false);
              // New conversation → new thread_id so MemorySaver starts fresh state
              setConversationId(
                typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)
              );
            }}
          >
            <SquarePen size={16} />
            <span className="font-medium text-sm">New Consultation</span>
          </button>

          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Local Vault</p>
            <button onClick={() => { setSidebarOpen(false); setShowCreateModal(true); }} className="flex items-center gap-1 text-slate-400 hover:text-white text-[10px] font-medium hover:bg-slate-800 rounded-md px-1.5 py-1 transition-colors">
              <Plus size={12} />New
            </button>
          </div>

          {cases === undefined ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-10 bg-slate-800 rounded-lg animate-pulse" />)}</div>
          ) : cases.length === 0 ? (
            <button onClick={() => { setSidebarOpen(false); setShowCreateModal(true); }} className="w-full flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-400 py-5 rounded-lg border border-dashed border-slate-800 hover:border-slate-700 transition-colors">
              <FolderLock size={20} className="opacity-50" />
              <span className="text-[11px]">No cases yet — create one</span>
            </button>
          ) : (
            <ul className="space-y-1">
              {cases.map((c) => (
                <li key={c.id} onClick={() => { setActiveCase(c); setSidebarOpen(false); }} className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-colors group ${activeCase?.id === c.id ? "bg-slate-700 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800"}`}>
                  <FolderLock size={15} className="flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{c.title}</span>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 flex-shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1">
          {/* Debug: Thought Stream toggle */}
          <button
            onClick={() => setShowDebug((v) => !v)}
            className={`flex items-center gap-3 transition-colors w-full p-2 rounded-lg ${showDebug ? "bg-emerald-900 text-emerald-300 hover:bg-emerald-800" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
          >
            <BookOpen size={15} />
            <span className="text-xs font-medium">
              {showDebug ? "Hide Thought Stream" : "Thought Stream"}
            </span>
            {showDebug && (
              <span className="ml-auto text-[9px] bg-emerald-700 text-emerald-200 rounded px-1.5 py-0.5 font-mono">
                {thoughtStream.length}
              </span>
            )}
          </button>
          <button className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full p-2 rounded-lg hover:bg-slate-800">
            <Settings size={17} />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE: THOUGHT STREAM SLIDE-UP DRAWER ── */}
      <MobileThoughtDrawer
        open={mobileThoughtOpen}
        onClose={() => setMobileThoughtOpen(false)}
        events={thoughtStream}
        onClear={() => setThoughtStream([])}
      />

      {/* ── DEBUG: THOUGHT STREAM PANEL (desktop only) ── */}
      {showDebug && (
        <div className="hidden lg:flex fixed inset-y-0 right-0 z-40 w-80 bg-slate-950 border-l border-slate-800 flex-col shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen size={13} className="text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">Thought Stream</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500">{thoughtStream.length} events</span>
              <button
                onClick={() => setThoughtStream([])}
                className="text-slate-600 hover:text-slate-400 text-[10px] px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-600 transition-colors"
              >
                Clear
              </button>
              <button onClick={() => setShowDebug(false)} className="text-slate-500 hover:text-white transition-colors ml-1">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ThoughtStreamPanel events={thoughtStream} />
          </div>
        </div>
      )}

      {/* ── MAIN COLUMN ── */}
      <div className={`flex flex-col flex-1 min-w-0 bg-white transition-all duration-300 ${showDebug ? "mr-80" : ""}`}>
        {/* Top bar */}
        <header className="flex items-center h-14 lg:h-16 px-4 lg:px-6 border-b border-gray-100 gap-3 flex-shrink-0">
          <button className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <Scale size={18} className="text-slate-400 hidden lg:block" />
          <h2 className="flex-1 text-base lg:text-lg font-semibold text-slate-800 truncate">
            {activeCase ? activeCase.title : "Active Consultation"}
          </h2>
          <span className={`hidden md:inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${persona === "Advocate" ? "bg-slate-900 text-white" : "bg-blue-50 text-blue-700"}`}>
            {persona === "Advocate" ? <Gavel size={11} /> : <User size={11} />}
            {persona === "Advocate" ? "Advocate" : "Client"}
          </span>
          {/* Mobile: Thought Stream trigger (slide-up drawer) */}
          <button
            className="lg:hidden p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 transition-colors relative"
            onClick={() => setMobileThoughtOpen(true)}
            title="Thought Stream"
          >
            <BookOpen size={19} />
            {thoughtStream.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 text-[8px] text-white flex items-center justify-center font-bold">
                {thoughtStream.length > 9 ? "9+" : thoughtStream.length}
              </span>
            )}
          </button>
          <button className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setShowCreateModal(true)}>
            <SquarePen size={20} />
          </button>
        </header>

        {/* Chat feed */}
        <div className="flex-1 overflow-y-auto bg-gray-50/40">
          <div className="max-w-2xl mx-auto px-0 py-6 space-y-6">
            {messages.length === 0 ? (
              <WelcomeScreen persona={persona} onQuickAction={handleQuickAction} />
            ) : (
              <div className="px-4 space-y-6">
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    msg={msg}
                    allMessages={messages}
                    userName={session?.user?.name ?? ""}
                  />
                ))}
              </div>
            )}

            {/* Mobile: Agent Steps drawer (hidden on desktop) */}
            <MobileAgentDrawer
              steps={agentSteps}
              open={mobileDrawerOpen}
              onToggle={() => setMobileDrawerOpen((v) => !v)}
              isStreaming={isStreaming}
            />

            <div className="px-4">
              <AgentStatusBanner
                step={agentStep}
                message={agentMessage}
                node={agentNode}
                fallbackLabel={agentFallbackLabel}
              />
            </div>
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Attached file preview — shows OCR doc-type badge after pre-flight */}
        {attachedFile && (
          <div className="mx-4 mb-1 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
            <FileText size={13} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium leading-tight">{attachedFile.name}</p>
              {ocrPreview?.loading && (
                <p className="text-blue-500 flex items-center gap-1 mt-0.5">
                  <Loader2 size={10} className="animate-spin" /> Scanning document...
                </p>
              )}
              {ocrPreview && !ocrPreview.loading && ocrPreview.docType && (
                <p className="text-emerald-600 font-semibold mt-0.5">
                  ✓ {ocrPreview.docType} detected
                </p>
              )}
            </div>
            <button
              onClick={() => { setAttachedFile(null); setOcrPreview(null); }}
              className="text-blue-400 hover:text-blue-700 transition-colors flex-shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-100 p-3 lg:p-4 bg-white flex-shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-300 transition-all">
              {/* Attach */}
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.ogg" onChange={handleFileAttach} />
              <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-slate-700 transition-colors p-1 flex-shrink-0 self-end mb-0.5" title="Attach document or audio">
                <Paperclip size={18} />
              </button>

              {/* Text area */}
              <textarea
                ref={textareaRef}
                value={chatInput}
                onChange={(e) => { setChatInput(e.target.value); autoGrow(e.target); }}
                onKeyDown={handleKeyDown}
                placeholder={persona === "Advocate" ? "State the facts, court stage, and relevant sections…" : "Tell me what happened…"}
                rows={1}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
                style={{ minHeight: "24px" }}
                disabled={isStreaming}
              />

              {/* Mic */}
              <button onClick={toggleRecording} className={`p-1 flex-shrink-0 self-end mb-0.5 transition-colors ${isRecording ? "text-red-500 animate-pulse" : "text-slate-400 hover:text-slate-700"}`} title={isRecording ? "Stop recording" : "Voice input"}>
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={(!chatInput.trim() && !attachedFile) || isStreaming}
                className={`p-2 rounded-xl flex-shrink-0 self-end transition-all ${(chatInput.trim() || attachedFile) && !isStreaming ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
              >
                {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Advocate Assist · Indian Law · Not a substitute for professional legal advice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
