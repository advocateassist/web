"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/auth/signin"), 2000);
    } catch (_e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500 text-sm">Invalid reset link. Please request a new one.</p>
        <Link href="/auth/forgot-password" className="block mt-4 text-sm font-semibold text-slate-800 hover:underline">Request new link</Link>
      </div>
    );
  }

  return success ? (
    <div className="text-center py-4">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </div>
      <p className="text-slate-700 font-medium">Password updated!</p>
      <p className="text-slate-500 text-sm mt-1">Redirecting to sign in…</p>
    </div>
  ) : (
    <>
      <h2 className="text-slate-900 text-xl font-semibold text-center mb-1">Set new password</h2>
      <p className="text-slate-500 text-sm text-center mb-6">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">New password</label>
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
          <label className="block text-xs font-medium text-slate-600 mb-1">Confirm new password</label>
          <input
            type={showPass ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
            <Suspense fallback={<div className="text-center text-sm text-slate-500">Loading…</div>}>
              <ResetForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
