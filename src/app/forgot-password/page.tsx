"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Swal } from "@/lib/alerts";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: { email } });
      setSent(true);
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Something went wrong", text: err.message });
    } finally { setSubmitting(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="mb-4 inline-block text-lg font-bold text-blue-700">🎓 School Management</Link>
          <h1 className="text-2xl font-bold">Forgot password</h1>
          <p className="mt-1 text-sm text-slate-500">We&apos;ll email you a reset link</p>
        </div>
        <div className="card">
          {sent ? (
            <p className="text-center text-sm text-slate-600">
              If an account exists for <span className="font-medium text-slate-900">{email}</span>, a password reset link is on its way. Check your inbox (and spam folder). The link works for 1 hour.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input type="email" required className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button type="submit" disabled={submitting} className="btn w-full">{submitting ? "Sending..." : "Send reset link"}</button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">Remembered it? <Link href="/login" className="font-semibold text-blue-600 hover:underline">Log in</Link></p>
        <p className="mt-2 text-center text-sm text-slate-600">Need help? <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link></p>
      </div>
    </main>
  );
}
