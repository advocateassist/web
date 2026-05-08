import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Linkedin,
  Mail,
  MapPin,
  ExternalLink,
  Award,
  TrendingUp,
  Globe,
  Anchor,
  Scale,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mayank Mittal — Founder, Advocate Assist",
  description:
    "Meet Mayank Mittal, Founder of Advocate Assist AI. 18+ years building digital platforms across fintech, legal-tech, and edtech. Ex-Amazon, Indifi, Clix Capital.",
  openGraph: {
    title: "Mayank Mittal — Founder, Advocate Assist",
    description:
      "AI-enabled growth & product leader with 18+ years in fintech, legal-tech & edtech. Founder of Advocate Assist AI — democratising legal access for 1.4 billion Indians.",
    url: "https://advocateassist.ai/founder",
    siteName: "Advocate Assist",
    images: [{ url: "https://advocateassist.ai/opengraph.jpg", width: 1200, height: 630 }],
    locale: "en_IN",
    type: "profile",
  },
};

const EXPERIENCE = [
  {
    company: "Advocate Assist AI",
    role: "Founder",
    period: "Sep 2024 – Present",
    location: "Delhi, India",
    highlight: "Building India's first AI-powered legal-tech platform",
    bullets: [
      "Architected enterprise-grade platform with 99% OCR accuracy across Indian languages",
      "Deployed custom LLM trained on legal datasets for superior legal advisory responses",
      "Curated 3,500+ legal document templates covering 90% of common use cases",
      "Onboarded 30+ verified legal professionals with quality assurance protocols",
    ],
    accent: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    company: "Fyscaltech",
    role: "Advisor — AI, Strategy & Compliance",
    period: "Nov 2024 – Present",
    location: "Singapore",
    highlight: "Advisor to fintech platforms across SE Asia & Middle East",
    bullets: [
      "Advised founders and CXOs on AI-driven financial products with embedded compliance",
      "Structured market entry strategies aligning local regulations with growth objectives",
      "Optimised data flows, scoring models, and AI/ML interventions for better underwriting",
    ],
    accent: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
  },
  {
    company: "Indifi",
    role: "Head — Partnerships, Portfolio & Online Business",
    period: "Oct 2021 – Sep 2024",
    location: "Delhi, India",
    highlight: "650% growth in MSME lending volume",
    bullets: [
      "Scaled self-acquisition channel from ₹3 Cr/month to ₹30 Cr/month",
      "Reduced Customer Acquisition Cost from 5% to 2% through diversified digital marketing",
      "Expanded tier-1 partner channels (Paisabazaar, Bajaj Finserv) 10× in volume",
      "Maintained 7–8% gross margins while achieving 650% total volume growth",
    ],
    accent: "bg-violet-50 border-violet-200",
    dot: "bg-violet-500",
  },
  {
    company: "UNext Learning (OnlineManipal — Manipal Education Group)",
    role: "Head — Consumer Product & Online Education",
    period: "Jul 2019 – Oct 2021",
    location: "Bengaluru, India",
    highlight: "Launched India's largest online degree platform in 90 days",
    bullets: [
      "Delivered end-to-end platform from concept to launch in 90 days during COVID-19",
      "Achieved 7,000-student first batch enrolment within 6 months of launch",
      "Generated ₹30 Cr revenue with 40% gross margin in the first operational year",
      "Achieved 200K+ customer engagement with 12,000+ enrolments",
    ],
    accent: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  {
    company: "Clix Capital",
    role: "VP — National Sales Head Digital Lending",
    period: "Sep 2018 – Jul 2019",
    location: "Gurgaon, India",
    highlight: "12× growth: ₹5 Cr → ₹60 Cr/month",
    bullets: [
      "Transformed manual underwriting into algorithmic real-time lending decisions",
      "Reduced complete lending cycle from 11 days to 4 days",
      "Pioneered end-to-end digital lending journey eliminating paper-based workflows",
    ],
    accent: "bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
  },
  {
    company: "Reliance Retail",
    role: "General Manager — Head E-commerce",
    period: "May 2017 – Sep 2018",
    location: "Mumbai, India",
    highlight: "Led omnichannel transformation across 2,000+ stores",
    bullets: [
      "Spearheaded e-commerce platform on SAP Hybris enterprise stack",
      "Designed omnichannel strategy integrating 2,000+ stores with digital touchpoints",
      "Negotiated MOU with major e-commerce player for demand generation partnership",
    ],
    accent: "bg-cyan-50 border-cyan-200",
    dot: "bg-cyan-500",
  },
  {
    company: "Zopper.com",
    role: "Vice President — Marketplace & Product",
    period: "Jun 2015 – Jan 2017",
    location: "Delhi, India",
    highlight: "4 → 2,000+ orders/day · $100M GMV · Strategic exit to Flipkart Group",
    bullets: [
      "Scaled from 4 orders/day to 2,000+ orders/day achieving $100M GMV run rate",
      "Achieved 2.5M app installs with 4.3 rating and 25K+ reviews",
      "Launched 40+ categories with 100K+ SKUs from 15K retailers",
    ],
    accent: "bg-orange-50 border-orange-200",
    dot: "bg-orange-500",
  },
  {
    company: "Amazon",
    role: "Category Manager — Electronics",
    period: "Aug 2012 – May 2015",
    location: "India & Germany",
    highlight: "Among first 20 hires establishing Amazon India",
    bullets: [
      "Selected among top 6 employees for intensive training at Amazon Germany",
      "Launched 5 major electronics categories with 10,000+ SKUs",
      "Generated 1.7M weekly views and acquired 700K unique customers",
      "Reduced TV shipment shrinkage from 10% to <1% through breakthrough packaging",
    ],
    accent: "bg-slate-50 border-slate-200",
    dot: "bg-slate-500",
  },
  {
    company: "Indian Navy",
    role: "Lieutenant — Assistant Director Naval Design",
    period: "Jan 2004 – Mar 2009",
    location: "Delhi, India",
    highlight: "Contributed to design of P17A class stealth frigates",
    bullets: [
      "Contributed to design and development of the P17A class stealth frigates",
      "Collaborated with IIT Kanpur on conceptual design of Wing-in-Ground Effect (WIG) craft",
      "Engaged in high-pressure naval construction projects with stringent defence requirements",
    ],
    accent: "bg-indigo-50 border-indigo-200",
    dot: "bg-indigo-500",
  },
];

const STATS = [
  { label: "Years of experience", value: "18+", icon: Award },
  { label: "Business growth delivered", value: "650%", icon: TrendingUp },
  { label: "Countries advised in", value: "5+", icon: Globe },
  { label: "Naval service", value: "5 yrs", icon: Anchor },
];

export default function FounderPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/auth/signin" className="flex items-center gap-2">
            <img src="/logo.png" alt="Advocate Assist" className="h-7 w-7 rounded-full object-cover" />
            <span className="font-bold text-slate-900 text-sm tracking-wide">ADVOCATE ASSIST</span>
          </Link>
          <Link href="/about" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={13} /> About
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Hero */}
        <div className="bg-slate-950 rounded-3xl p-8 sm:p-10 mb-10 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-3xl font-bold text-white">
              M
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold">Mayank Mittal</h1>
                <Scale size={18} className="text-emerald-400" />
              </div>
              <p className="text-slate-300 text-sm leading-relaxed max-w-xl mb-4">
                AI-Enabled Growth &amp; Product Leader · 18+ years in Fintech, Legal-Tech &amp; EdTech · Founder, Advocate Assist AI · Ex-Amazon, Indifi, Clix Capital
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-500" />
                  Delhi, India
                </div>
                <a
                  href="https://www.linkedin.com/in/mittal-mayank"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Linkedin size={13} />
                  linkedin.com/in/mittal-mayank
                  <ExternalLink size={10} />
                </a>
                <a
                  href="mailto:mayankmittal1982@gmail.com"
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
                >
                  <Mail size={12} />
                  mayankmittal1982@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                <Icon size={18} className="text-slate-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-gray-100">About</h2>
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Mayank Mittal is an AI-enabled product and growth leader with 18+ years of experience building and scaling digital platforms across fintech, legal-tech, edtech, e-commerce, and retail. He has a proven track record of driving 300%+ annual growth, 650%+ volume expansion, and multi-channel P&L outcomes while maintaining disciplined margins.
            </p>
            <p>
              As Founder of Advocate Assist AI, Mayank is building India&apos;s first comprehensive AI-powered legal-tech ecosystem — combining custom LLMs, 99% OCR accuracy, and multilingual workflows to democratise access to legal advice for 1.4+ billion people. The platform combines curated templates, vetted lawyers, and a roadmap of AI-driven case management, court submission, and compliance utilities.
            </p>
            <p>
              Mayank&apos;s advisory work through Fyscaltech extends across Singapore, South/Southeast Asia, and the Middle East, where he helps founders and CXOs design AI-integrated, regulation-compliant financial products and market entry strategies. His earlier career spans Amazon India (among the first 20 hires), Indifi, Clix Capital, Reliance Digital, Zopper, UNext, and P&G — across which he built or scaled platforms from zero to ₹60 Cr+/month, 0 to $100M GMV, and 4 to 2,000+ orders/day.
            </p>
            <p>
              Before entering the corporate world, Mayank served as a Lieutenant in the Indian Navy for over five years, contributing to the design of the P17A class stealth frigates and collaborating with IIT Kanpur on Wing-in-Ground Effect craft research. He is an alumnus of IIM Lucknow.
            </p>
          </div>
        </div>

        {/* Experience timeline */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b border-gray-100">Career Timeline</h2>
          <div className="space-y-5">
            {EXPERIENCE.map((exp, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${exp.accent}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${exp.dot}`} />
                      <h3 className="font-semibold text-slate-900 text-sm">{exp.company}</h3>
                    </div>
                    <p className="text-xs text-slate-500 ml-4">{exp.role}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-medium text-slate-500">{exp.period}</p>
                    <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                      <MapPin size={9} />{exp.location}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-700 mb-2 ml-4 italic">{exp.highlight}</p>
                <ul className="space-y-1 ml-4">
                  {exp.bullets.map((b, bi) => (
                    <li key={bi} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-slate-400 mt-1 flex-shrink-0">·</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Education & Certs */}
        <div className="grid sm:grid-cols-2 gap-5 mb-10">
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Award size={15} className="text-slate-500" /> Education
            </h2>
            <div>
              <p className="text-sm font-semibold text-slate-800">Indian Institute of Management, Lucknow</p>
              <p className="text-xs text-slate-500 mt-0.5">Management · IIM Lucknow</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Award size={15} className="text-slate-500" /> Certifications & Skills
            </h2>
            <ul className="space-y-1.5">
              <li className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-slate-400 mt-1">·</span>
                Technology for Product Managers
              </li>
              <li className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-slate-400 mt-1">·</span>
                Strategic Business Development
              </li>
              <li className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-slate-400 mt-1">·</span>
                NBFC &amp; Fintech Compliance
              </li>
              <li className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-slate-400 mt-1">·</span>
                Languages: Hindi, English
              </li>
            </ul>
          </div>
        </div>

        {/* Connect CTA */}
        <div className="bg-slate-950 rounded-3xl p-8 text-white text-center">
          <h2 className="text-xl font-bold mb-2">Connect with Mayank</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Have questions about Advocate Assist, partnership opportunities, or advisory work?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://www.linkedin.com/in/mittal-mayank"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <Linkedin size={15} /> LinkedIn
            </a>
            <a
              href="mailto:mayankmittal1982@gmail.com"
              className="flex items-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <Mail size={15} /> Email
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Advocate Assist. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link href="/about" className="hover:text-slate-600 transition-colors">About</Link>
            <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms & Privacy</Link>
            <Link href="/auth/signin" className="hover:text-slate-600 transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
