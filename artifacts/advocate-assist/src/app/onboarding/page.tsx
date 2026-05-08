"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Scale, User, CheckCircle, Shield, MessageSquare, Phone } from "lucide-react";
import { completeOnboarding } from "./actions";

export default function OnboardingPage() {
  const { update } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLegalPractitioner, setIsLegalPractitioner] = useState<boolean | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [whatsAppConsent, setWhatsAppConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const step1Ready = isLegalPractitioner !== null && mobileNumber.trim().length === 10;

  async function handleSubmit() {
    if (!termsAccepted) { setError("Please accept the Terms & Conditions to continue."); return; }
    setPending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("isLegalPractitioner", String(isLegalPractitioner));
      fd.append("mobileNumber", mobileNumber);
      fd.append("wantsWhatsAppUpdates", String(whatsAppConsent));
      fd.append("wantsSmsUpdates", String(smsConsent));
      fd.append("termsAccepted", "true");
      await completeOnboarding(fd);
      // Refresh the JWT token so the API routes see isOnboarded=true
      await update({ refreshUser: true });
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-slate-950 px-8 pt-8 pb-6 flex flex-col items-center">
            <img src="/logo.png" alt="Advocate Assist" className="h-16 w-16 rounded-full object-cover ring-2 ring-white ring-offset-4 ring-offset-slate-950 mb-4" />
            <h1 className="text-white text-base font-bold tracking-widest text-center">ADVOCATE ASSIST</h1>
            <p className="text-slate-400 text-[10px] tracking-widest mt-1">LEGAL ASSISTANT AI</p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-5 pb-1">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? "w-8 bg-slate-900" : s < step ? "w-4 bg-slate-400" : "w-4 bg-gray-200"}`} />
            ))}
          </div>

          <div className="px-8 py-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-slate-900 text-lg font-semibold text-center">Who are you?</h2>
                  <p className="text-slate-500 text-sm text-center mt-1">Just two quick things to get started</p>
                </div>

                {/* Role toggle */}
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { val: true, icon: Scale, title: "Advocate", sub: "Lawyer · Legal Professional" },
                    { val: false, icon: User, title: "Client", sub: "Individual · Consumer" },
                  ] as const).map(({ val, icon: Icon, title, sub }) => {
                    const active = isLegalPractitioner === val;
                    return (
                      <button key={String(val)} type="button" onClick={() => setIsLegalPractitioner(val)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${active ? "border-slate-900 bg-slate-950 text-white" : "border-gray-200 hover:border-slate-300"}`}
                      >
                        {active && <CheckCircle size={14} className="absolute top-3 right-3 text-white" />}
                        <Icon size={22} className={`mb-2 ${active ? "text-white" : "text-slate-600"}`} />
                        <p className={`font-semibold text-sm ${active ? "text-white" : "text-slate-800"}`}>{title}</p>
                        <p className={`text-[11px] mt-0.5 ${active ? "text-slate-400" : "text-slate-500"}`}>{sub}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Phone number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    <Phone size={11} className="inline mr-1 mb-0.5" />Mobile Number
                  </label>
                  <div className="flex">
                    <span className="flex items-center px-3 border border-r-0 border-gray-200 bg-gray-100 rounded-l-xl text-sm text-slate-600 font-medium">+91</span>
                    <input
                      type="tel" maxLength={10} value={mobileNumber}
                      onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      className="flex-1 border border-gray-200 rounded-r-xl px-3.5 py-2.5 text-sm text-slate-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="button" disabled={!step1Ready}
                  onClick={() => setStep(2)}
                  className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-slate-900 text-lg font-semibold text-center">Permissions & Terms</h2>
                  <p className="text-slate-500 text-sm text-center mt-1">Quick approvals to get you started</p>
                </div>

                <div className="space-y-3">
                  {/* WhatsApp */}
                  <button type="button" onClick={() => setWhatsAppConsent(!whatsAppConsent)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${whatsAppConsent ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className={`w-5 h-5 rounded mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${whatsAppConsent ? "bg-green-500" : "border-2 border-gray-300"}`}>
                      {whatsAppConsent && <CheckCircle size={13} className="text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-green-600" />
                        <p className="text-sm font-semibold text-slate-800">WhatsApp updates</p>
                        <span className="text-[10px] bg-gray-100 text-slate-500 px-1.5 py-0.5 rounded-full">Optional</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Receive legal news, judgment alerts &amp; case tips on WhatsApp</p>
                    </div>
                  </button>

                  {/* SMS */}
                  <button type="button" onClick={() => setSmsConsent(!smsConsent)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${smsConsent ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className={`w-5 h-5 rounded mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${smsConsent ? "bg-blue-500" : "border-2 border-gray-300"}`}>
                      {smsConsent && <CheckCircle size={13} className="text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-blue-600" />
                        <p className="text-sm font-semibold text-slate-800">SMS alerts</p>
                        <span className="text-[10px] bg-gray-100 text-slate-500 px-1.5 py-0.5 rounded-full">Optional</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Get important case reminders &amp; hearing alerts via SMS</p>
                    </div>
                  </button>

                  {/* Terms — required */}
                  <button type="button" onClick={() => setTermsAccepted(!termsAccepted)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${termsAccepted ? "border-slate-900 bg-slate-900" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className={`w-5 h-5 rounded mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${termsAccepted ? "bg-white" : "border-2 border-gray-300"}`}>
                      {termsAccepted && <CheckCircle size={13} className="text-slate-900" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Shield size={14} className={termsAccepted ? "text-white" : "text-slate-600"} />
                        <p className={`text-sm font-semibold ${termsAccepted ? "text-white" : "text-slate-800"}`}>Terms &amp; Conditions</p>
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Required</span>
                      </div>
                      <p className={`text-xs mt-0.5 ${termsAccepted ? "text-slate-400" : "text-slate-500"}`}>
                        I agree to Advocate Assist&apos;s{" "}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`underline ${termsAccepted ? "text-slate-300" : "text-slate-600"}`}>Terms of Service</a>,{" "}
                        <a href="/terms#privacy" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`underline ${termsAccepted ? "text-slate-300" : "text-slate-600"}`}>Privacy Policy</a>,
                        and understand that AI responses are not a substitute for legal advice
                      </p>
                    </div>
                  </button>
                </div>

                {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                <button
                  type="button" disabled={!termsAccepted || pending}
                  onClick={handleSubmit}
                  className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {pending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Setting up…
                    </>
                  ) : "Accept & Get Started"}
                </button>

                <button type="button" onClick={() => setStep(1)} className="w-full text-slate-400 text-sm hover:text-slate-600 transition-colors">
                  ← Back
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-slate-600 text-[11px] text-center mt-4 leading-relaxed px-4">
          Your case files are stored only on your device. AI responses are not legal advice.
        </p>
      </div>
    </div>
  );
}
