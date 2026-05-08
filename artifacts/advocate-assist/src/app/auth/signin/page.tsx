"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Scale, Shield, Eye, EyeOff } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function SignInPage() {
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  async function handleOAuth(provider: "google" | "facebook") {
    setOauthLoading(provider);
    await signIn(provider, { callbackUrl: "/" });
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setEmailLoading(false);
    if (result?.error) {
      setEmailError("Incorrect email or password. Please try again.");
    } else {
      window.location.href = "/";
    }
  }

  const anyLoading = !!oauthLoading || emailLoading;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-slate-950 px-8 pt-10 pb-8 flex flex-col items-center">
            <img
              src="/logo.png"
              alt="Advocate Assist"
              className="h-20 w-20 rounded-full object-cover ring-2 ring-white ring-offset-4 ring-offset-slate-950 mb-5"
            />
            <h1 className="text-white text-lg font-bold tracking-widest text-center">ADVOCATE ASSIST</h1>
            <p className="text-slate-400 text-[10px] tracking-widest mt-1">LEGAL ASSISTANT AI</p>
          </div>

          <div className="px-8 py-8">
            <h2 className="text-slate-900 text-xl font-semibold text-center mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm text-center mb-6">Sign in to access your legal assistant</p>

            {/* Email / password */}
            <form onSubmit={handleEmailSignIn} className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email address</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" disabled={anyLoading}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Password</label>
                  <Link href="/auth/forgot-password" className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Your password" disabled={anyLoading}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {emailError && <p className="text-red-500 text-xs text-center">{emailError}</p>}

              <button
                type="submit" disabled={anyLoading}
                className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {emailLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Signing in…
                  </span>
                ) : "Sign in"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mb-4">
              New here?{" "}
              <Link href="/auth/signup" className="text-slate-800 font-semibold hover:underline">Create an account</Link>
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-slate-400">or continue with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* OAuth */}
            <div className="space-y-3">
              <button
                onClick={() => handleOAuth("google")} disabled={anyLoading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {oauthLoading === "google" ? (
                  <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : <GoogleIcon />}
                Google
              </button>
              <button
                onClick={() => handleOAuth("facebook")} disabled={anyLoading}
                className="w-full flex items-center justify-center gap-3 bg-[#1877F2] rounded-xl py-3 px-4 text-sm font-medium text-white hover:bg-[#166fe5] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {oauthLoading === "facebook" ? (
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : <FacebookIcon />}
                Facebook
              </button>
            </div>

            {/* Trust badges */}
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
          By signing in you agree to our{" "}
          <Link href="/terms" className="underline hover:text-slate-800 transition-colors">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/terms#privacy" className="underline hover:text-slate-800 transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
