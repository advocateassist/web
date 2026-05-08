import type { Metadata } from "next";
import Link from "next/link";
import {
  Scale,
  ShieldCheck,
  Search,
  FileText,
  Mic,
  Languages,
  CheckCircle,
  XCircle,
  ArrowRight,
  Gavel,
  BookOpen,
  Users,
  UserCheck,
  Clock,
  Sparkles,
  AlertCircle,
  Building2,
  Anchor,
  Briefcase,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Advocate Assist — Free AI Legal Guidance for India",
  description:
    "Advocate Assist was built to solve India's fragmented legal access problem. Get free AI-generated legal guidance instantly — and connect with a real verified advocate any time of day.",
  openGraph: {
    title: "About Advocate Assist — Free AI Legal Guidance for India",
    description:
      "Free AI-generated legal guidance on Indian law, available 24/7. Founded by Mayank Mittal to democratise legal access for 1.4 billion Indians.",
    url: "https://advocateassist.ai/about",
    siteName: "Advocate Assist",
    images: [{ url: "https://advocateassist.ai/opengraph.jpg", width: 1200, height: 630 }],
    locale: "en_IN",
    type: "website",
  },
};

const FEATURES = [
  {
    icon: Search,
    title: "Case Law Research",
    desc: "Instantly search verified Supreme Court and High Court judgments with citations from IndianKanoon.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: FileText,
    title: "Legal Drafting",
    desc: "Draft legal notices, affidavits, bail applications, writ petitions, rental agreements, and more — complete documents, not teasers.",
    color: "text-violet-600 bg-violet-50",
  },
  {
    icon: ShieldCheck,
    title: "AI Legal Guidance",
    desc: "Get AI-generated legal guidance on your situation — explained in plain language under BNS, BNSS, BSA, and CPC.",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: UserCheck,
    title: "Connect with Advocates",
    desc: "Need personalised advice? Connect directly with verified, vetted advocates for one-on-one consultations — for a service charge.",
    color: "text-rose-600 bg-rose-50",
  },
  {
    icon: Languages,
    title: "Multi-language",
    desc: "Ask questions and receive answers in English, Hindi, Tamil, Marathi, Bengali, Telugu, Gujarati, or Kannada.",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: Mic,
    title: "Voice & Document OCR",
    desc: "Speak your query, upload a court notice or FIR — Advocate Assist transcribes, reads, and analyses it instantly.",
    color: "text-cyan-600 bg-cyan-50",
  },
];

const WHAT_IT_DOES = [
  "Provide free AI-generated legal guidance on your specific situation",
  "Research Indian case law with verified citations",
  "Draft complete, court-ready legal documents and notices",
  "Explain legal procedures in plain language",
  "Connect you to verified advocates for one-on-one paid consultations",
  "Transcribe and analyse court hearing audio",
  "Translate legal documents between Indian languages",
  "Guide you on which court or authority to approach",
];

const WHAT_IT_DOESNT_DO = [
  "Appear or represent you in court (you need a human advocate for that)",
  "Guarantee 100% accuracy — always verify citations independently",
  "Access real-time court cause lists or live case status",
  "File documents with any court or tribunal on your behalf",
  "Replace the judgement and strategy of a qualified advocate for complex matters",
];

const WHO_FOR = [
  {
    icon: Gavel,
    title: "Advocates & Lawyers",
    desc: "Speed up research, draft pleadings, and handle routine documents faster so you can focus on strategy.",
  },
  {
    icon: Users,
    title: "Citizens & Litigants",
    desc: "Understand your legal situation, know your rights, and prepare before meeting your lawyer.",
  },
  {
    icon: BookOpen,
    title: "Law Students",
    desc: "Research judgments, explore legal concepts, and practise drafting in a guided environment.",
  },
];

const FOUNDER_JOURNEY = [
  { icon: Anchor, label: "Indian Navy", detail: "Lieutenant — Naval Design" },
  { icon: Building2, label: "Corporate India", detail: "Amazon · Reliance · Zopper · Clix" },
  { icon: Briefcase, label: "Fintech & Growth", detail: "Indifi · UNext · Fyscaltech" },
  { icon: Scale, label: "Advocate Assist", detail: "Legal-tech for 1.4 Billion Indians" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/auth/signin" className="flex items-center gap-2">
            <img src="/logo.png" alt="Advocate Assist" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-bold text-slate-900 text-sm tracking-wide">ADVOCATE ASSIST</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/founder" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
              Founder
            </Link>
            <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
              Terms
            </Link>
            <Link
              href="/auth/signin"
              className="text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-slate-950 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300 mb-6 border border-slate-700">
            <Sparkles size={13} className="text-emerald-400" />
            Free AI Legal Guidance · Available 24 × 7
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
            Legal help for every Indian —<br />
            <span className="text-emerald-400">free, instant, always on</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            Advocate Assist gives you free AI-generated legal guidance on Indian law — right now, in plain language, across Indian languages. And whenever you need a real advocate, our Advocate Connect service links you directly with verified lawyers any time of the day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Get started free <ArrowRight size={15} />
            </Link>
            <Link
              href="/auth/signin"
              className="flex items-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Free + 24/7 value proposition */}
      <section className="py-12 px-4 bg-emerald-50 border-b border-emerald-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-emerald-200 p-6 flex gap-4 items-start">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Free AI Legal Guidance</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Ask any legal question — our AI analyses your situation under Indian law and gives you clear, substantive guidance at no cost. No vague disclaimers, no paywalls.
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-200 p-6 flex gap-4 items-start">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Real Advocate · Any Time of Day</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  When you need a human expert, our Advocate Connect service connects you with a verified, Bar Council-enrolled lawyer — morning, evening, or night, including weekends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founding Story */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle size={16} className="text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Why we built this</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-6 leading-snug">
            Legal help in India is fragmented.<br />
            <span className="text-emerald-600">We are fixing that.</span>
          </h2>
          <div className="space-y-4 text-slate-600 leading-relaxed text-[15px]">
            <p>
              If you have ever needed legal help in India, you know how difficult it can be. There is no single place to go. Finding the right advocate, understanding which court to approach, knowing your rights under a new law — all of it requires time, money, and the right connections. Most people simply give up, or sign documents they do not fully understand.
            </p>
            <p>
              Legal access in India is deeply unequal. A citizen in a tier-2 city facing a landlord dispute, a first-generation entrepreneur navigating compliance, or a family member receiving a police notice — all of them deserve the same quality of legal guidance that a well-connected person in a metro city gets. But without standardisation, that has never been possible at scale.
            </p>
            <p>
              Advocate Assist was built to change that. One platform. Instant, free, AI-generated legal guidance in plain language. And whenever you need a real advocate — day or night — a human expert is just a tap away.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-14 px-4 bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">Meet the Founder</p>
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-3">Mayank Mittal</h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Mayank Mittal brings a rare breadth of experience — from serving as a Lieutenant in the Indian Navy, to building digital platforms at Amazon India, to scaling fintech businesses from zero to ₹60 Cr+/month. Having worked across government, corporate India, and the growth-stage startup world, he saw first-hand that the one sector most in need of modernisation was legal services.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                As Founder of Advocate Assist, his goal is straightforward: make decent, trustworthy legal help available to every Indian — regardless of where they live, what language they speak, or how much they can afford. The AI handles the immediate guidance for free. The verified advocate network handles what needs a human expert.
              </p>
              <Link
                href="/founder"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
              >
                Read Mayank&apos;s full story <ArrowRight size={14} />
              </Link>
            </div>
            <div className="sm:w-56 flex-shrink-0">
              <div className="space-y-3">
                {FOUNDER_JOURNEY.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                      <Icon size={16} className="text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-white">{step.label}</p>
                        <p className="text-[10px] text-slate-400">{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Who is it for?</h2>
          <p className="text-slate-500 text-center text-sm mb-10">Advocate Assist is built for everyone who works with Indian law.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {WHO_FOR.map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={18} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{w.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{w.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">What can Advocate Assist do?</h2>
          <p className="text-slate-500 text-center text-sm mb-10">Six core capabilities designed for Indian legal practice.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                    <Icon size={17} />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{f.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Does / Doesn't */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">What it does — and doesn&apos;t do</h2>
          <p className="text-slate-500 text-center text-sm mb-10">
            We believe in complete transparency about AI capabilities and limitations.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-emerald-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle size={18} className="text-emerald-600" />
                <h3 className="font-semibold text-slate-900">What it does</h3>
              </div>
              <ul className="space-y-3">
                {WHAT_IT_DOES.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-red-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <XCircle size={18} className="text-red-500" />
                <h3 className="font-semibold text-slate-900">What it doesn&apos;t do</h3>
              </div>
              <ul className="space-y-3">
                {WHAT_IT_DOESNT_DO.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
            <UserCheck size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800 leading-relaxed">
              <strong>Two tiers of support:</strong> Advocate Assist gives you free AI-generated legal guidance instantly — available morning, evening, or night. For matters where you need a real advocate — court hearings, complex disputes, or personalised strategy — our <strong>Advocate Connect</strong> service links you with a verified, Bar Council-enrolled lawyer at a service charge.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldCheck size={22} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Your privacy matters</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-xl mx-auto">
            Your case files and notes are stored only on your device — never on our servers. Queries sent to the AI are processed under strict data handling policies and are not used to train models without consent.
          </p>
          <Link href="/terms" className="text-slate-700 text-sm font-medium underline underline-offset-4 hover:text-slate-900 transition-colors">
            Read our Terms of Service & Privacy Policy →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-950 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Start for free — right now</h2>
          <p className="text-slate-400 text-sm mb-8">
            No credit card. No waiting. Instant AI-generated legal guidance, and a real advocate one tap away whenever you need one.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            Create your free account <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Advocate Assist" className="h-5 w-5 rounded-full object-cover" />
            <span>© {new Date().getFullYear()} Advocate Assist. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/about" className="hover:text-slate-600 transition-colors">About</Link>
            <Link href="/founder" className="hover:text-slate-600 transition-colors">Founder</Link>
            <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms & Privacy</Link>
            <Link href="/auth/signin" className="hover:text-slate-600 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
