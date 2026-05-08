"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Scale, Shield, Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        signIn("credentials", { email, password, callbackUrl: "/" });
      }, 800);
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
            <h2 className="text-slate-900 text-xl font-semibold text-center mb-1">Create your account</h2>
            <p className="text-slate-500 text-sm text-center mb-6">Free to start — no credit card required</p>

            {success ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-slate-700 font-medium">Account created!</p>
                <p className="text-slate-500 text-sm mt-1">Signing you in…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email address</label>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Confirm password</label>
                  <input
                    type={showPass ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            )}

            <p className="text-center text-sm text-slate-500 mt-5">
              Already have an account?{" "}
              <Link href="/auth/signin" className="text-slate-800 font-semibold hover:underline">Sign in</Link>
            </p>

            <div className="border-t border-gray-100 pt-5 mt-5 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Shield size={13} className="flex-shrink-0 text-slate-300" />
                Your case files are stored only on your device — never on our servers.
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Scale size={13} className="flex-shrink-0 text-slate-300" />
                AI-powered Indian legal research under BNS, BNSS, and BSA.
              </div>
            </div>
          </div>
        </div>

        <p className="text-slate-600 text-[11px] text-center mt-5 leading-relaxed">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline hover:text-slate-800 transition-colors">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/terms#privacy" className="underline hover:text-slate-800 transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
