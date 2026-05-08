import type { Metadata } from "next";
import Link from "next/link";
import { Scale, Shield, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service & Privacy Policy — Advocate Assist",
  description:
    "Read Advocate Assist's Terms of Service and Privacy Policy. Learn how we handle your data, AI limitations, and your rights as a user.",
  openGraph: {
    title: "Terms of Service & Privacy Policy — Advocate Assist",
    description: "Terms of Service and Privacy Policy for Advocate Assist — AI legal assistant for India.",
    url: "https://advocateassist.ai/terms",
    siteName: "Advocate Assist",
  },
};

const LAST_UPDATED = "8 May 2025";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
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

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Terms of Service &amp; Privacy Policy</h1>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
            Please read these terms carefully before using Advocate Assist. By creating an account or using the service, you agree to be bound by these terms and our privacy policy.
          </p>

          {/* Quick nav */}
          <div className="mt-6 bg-gray-50 rounded-xl p-4 text-xs">
            <p className="font-semibold text-slate-700 mb-2">Jump to section:</p>
            <div className="flex flex-wrap gap-3">
              {[
                ["#terms", "Terms of Service"],
                ["#ai-disclaimer", "AI Disclaimer"],
                ["#privacy", "Privacy Policy"],
                ["#data", "Data & Storage"],
                ["#contact", "Contact"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Terms of Service */}
        <Section id="terms" title="1. Terms of Service">
          <p>
            Advocate Assist (&quot;the Service&quot;, &quot;we&quot;, &quot;our&quot;) is an AI-powered legal research and document drafting tool intended for use in the Indian legal context. These Terms of Service govern your access to and use of our website at <strong>advocateassist.ai</strong> and all related services.
          </p>
          <p>
            By registering for an account or using any feature of the Service, you (&quot;you&quot;, &quot;the User&quot;) agree to be bound by these Terms. If you do not agree, please do not use the Service.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">1.1 Eligibility</h3>
          <p>You must be at least 18 years of age to use Advocate Assist. By using the Service, you represent that you meet this requirement.</p>

          <h3 className="font-semibold text-slate-800 mt-4">1.2 Account Responsibility</h3>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorised use of your account.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">1.3 Acceptable Use</h3>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Use the Service for any unlawful purpose or in violation of Indian law</li>
            <li>Upload malicious files or attempt to compromise the security of the Service</li>
            <li>Attempt to reverse-engineer, scrape, or extract data from the Service in an automated fashion</li>
            <li>Represent AI-generated content as the independent work of a licensed advocate without disclosure</li>
            <li>Use the Service to harass, defame, or harm any individual or entity</li>
          </ul>

          <h3 className="font-semibold text-slate-800 mt-4">1.4 Service Availability</h3>
          <p>
            We strive to maintain continuous availability but do not guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">1.5 Intellectual Property</h3>
          <p>
            All content, trademarks, logos, and software comprising the Service are the intellectual property of Advocate Assist or its licensors. You may use AI-generated output for your own legal matters but may not resell or redistribute the Service itself.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">1.6 Governing Law</h3>
          <p>
            These Terms are governed by the laws of India. Any dispute arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </Section>

        {/* AI Guidance & Advocate Network */}
        <Section id="ai-disclaimer" title="2. AI-Generated Legal Guidance & Advocate Network">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="font-semibold text-emerald-900 mb-2">Two tiers of legal support — AI and human.</p>
            <p className="text-emerald-800">
              Advocate Assist provides <strong>AI-generated legal guidance</strong> powered by custom large language models trained on Indian law. For matters requiring personalised, one-on-one advice, we connect you with <strong>verified, vetted advocates</strong> via our Advocate Network — available for a service charge.
            </p>
          </div>

          <h3 className="font-semibold text-slate-800 mt-4">2.1 AI-Generated Legal Guidance</h3>
          <p>
            The Advocate Assist AI provides legal guidance — including case law research, rights explanations, document drafting, procedure walkthroughs, and situation-specific guidance — based on Indian statutes and jurisprudence including BNS, BNSS, BSA, CPC, IPC, and other applicable laws. This guidance is generated by our AI system and is intended to help you understand your legal position and options.
          </p>
          <p>
            AI-generated guidance is <strong>not a substitute for the formal legal advice</strong> of a licensed advocate in proceedings before courts, tribunals, or regulatory authorities. For such matters, we recommend using our Advocate Connect service (see 2.3 below).
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">2.2 AI Limitations</h3>
          <p>
            AI models can make errors, may not reflect the most recent amendments to Indian law, and cannot account for all facts of your specific situation. You should independently verify all legal citations, statutory references, and procedural information — particularly before filing documents or appearing in any proceedings.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">2.3 Advocate Connect — One-on-One Human Advice</h3>
          <p>
            For situations requiring personalised legal advice, court representation, or complex legal strategy, Advocate Assist connects you with verified, Bar Council-enrolled advocates through our Advocate Network. These consultations are conducted directly between you and the advocate and are subject to a service charge. The advocates in our network operate independently and are fully responsible for the legal advice they provide. Advocate Assist acts solely as an intermediary platform for such connections.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">2.4 Limitation of Liability</h3>
          <p>
            To the fullest extent permitted by law, Advocate Assist shall not be liable for any loss, damage, or consequences arising from your reliance on AI-generated guidance or from advice provided by advocates accessed through the platform. You engage with both the AI guidance and the Advocate Network at your own informed discretion.
          </p>
        </Section>

        {/* Privacy Policy */}
        <Section id="privacy" title="3. Privacy Policy">
          <p>
            This Privacy Policy describes how Advocate Assist collects, uses, and protects your personal information in accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (DPDPA).
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">3.1 Information We Collect</h3>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Account information:</strong> Name, email address, and authentication method (Google, Facebook, or email/password)</li>
            <li><strong>Onboarding data:</strong> Whether you are a legal practitioner, mobile number (for WhatsApp/SMS alerts with your consent), and communication preferences</li>
            <li><strong>Usage data:</strong> Queries submitted, documents uploaded for OCR, and audio files submitted for transcription</li>
            <li><strong>Device information:</strong> Browser type, IP address, and general location for security purposes</li>
          </ul>

          <h3 className="font-semibold text-slate-800 mt-4">3.2 How We Use Your Information</h3>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>To provide and improve the Advocate Assist service</li>
            <li>To authenticate your account and maintain security</li>
            <li>To send WhatsApp or SMS alerts if you have consented to receive them</li>
            <li>To process your queries through third-party AI providers (see below)</li>
            <li>To comply with applicable Indian law and regulatory requirements</li>
          </ul>

          <h3 className="font-semibold text-slate-800 mt-4">3.3 Third-Party AI Providers</h3>
          <p>
            To generate responses, Advocate Assist forwards your queries and uploaded content to third-party AI providers including Google (Gemini), Anthropic (Claude), DeepSeek, and Perplexity. These providers process your data under their own privacy policies. We do not share your personally identifiable information with these providers beyond what is necessary to generate responses to your queries.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">3.4 Your Rights under DPDPA 2023</h3>
          <p>Under the Digital Personal Data Protection Act, 2023, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate personal data</li>
            <li>Request erasure of your personal data</li>
            <li>Withdraw consent for processing at any time</li>
            <li>Nominate another person to exercise your rights on your behalf</li>
          </ul>
        </Section>

        {/* Data & Storage */}
        <Section id="data" title="4. Data Storage & Case Files">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <Scale size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-800">
                <strong>Your case files are stored only on your device.</strong> Case notes, chat history, and case organisation data are stored in your browser&apos;s local storage and are never transmitted to our servers.
              </p>
            </div>
          </div>

          <h3 className="font-semibold text-slate-800 mt-4">4.1 Server-side Data</h3>
          <p>
            Your account credentials, onboarding preferences, and session data are stored securely in our database. We use industry-standard encryption and security practices.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">4.2 Uploaded Documents</h3>
          <p>
            Documents and audio files uploaded for OCR or transcription are processed in real-time and are not permanently stored on our servers after processing is complete.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">4.3 Data Retention</h3>
          <p>
            We retain your account data for as long as your account is active. You may request deletion of your account and associated data by contacting us at the address below.
          </p>

          <h3 className="font-semibold text-slate-800 mt-4">4.4 Cookies</h3>
          <p>
            We use session cookies for authentication and onboarding state. We do not use third-party advertising cookies.
          </p>
        </Section>

        {/* Changes */}
        <Section id="changes" title="5. Changes to These Terms">
          <p>
            We may update these Terms and Privacy Policy from time to time. We will notify registered users of material changes via email or an in-app notice. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
          </p>
        </Section>

        {/* Contact */}
        <Section id="contact" title="6. Contact Us">
          <p>
            If you have questions about these Terms or our Privacy Policy, or wish to exercise your data rights, please contact us at:
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mt-2">
            <p className="font-semibold text-slate-800">Advocate Assist</p>
            <p className="mt-1">Email: <a href="mailto:support@advocateassist.ai" className="text-blue-600 hover:underline">support@advocateassist.ai</a></p>
            <p>Website: <a href="https://advocateassist.ai" className="text-blue-600 hover:underline">advocateassist.ai</a></p>
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-8 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Advocate Assist. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link href="/about" className="hover:text-slate-600 transition-colors">About</Link>
            <Link href="/auth/signin" className="hover:text-slate-600 transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
