"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSent(true);
    } catch (_e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-slate-950 px-8 pt-10 pb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Advocate Assist" className="h-20 w-20 rounded-full object-cover ring-2 ring-white ring-offset-4 ring-offset-slate-950 mb-5" />
            <h1 className="text-white text-lg font-bold tracking-widest text-center">ADVOCATE ASSIST</h1>
            <p className="text-slate-400 text-[10px] tracking-widest mt-1">LEGAL ASSISTANT AI</p>
          </div>

          <div className="px-8 py-8">
            {sent ? (
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-slate-900 text-lg font-semibold mb-2">Check your email</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. It expires in 1 hour.
                </p>
                <p className="text-slate-400 text-xs mt-4">Didn&apos;t receive it? Check your spam folder or try again.</p>
                <Link href="/auth/signin" className="block mt-6 text-sm font-semibold text-slate-800 hover:underline">
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-slate-900 text-xl font-semibold text-center mb-1">Forgot password?</h2>
                <p className="text-slate-500 text-sm text-center mb-6">
                  Enter your email and we&apos;ll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email address</label>
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>

                  {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending…" : "Send reset link"}
                  </button>
                </form>

                <Link href="/auth/signin" className="block text-center text-sm text-slate-500 mt-5 hover:underline">
                  Back to sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
