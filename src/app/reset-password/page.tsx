"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Swal } from "@/lib/alerts";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return Swal.fire({ icon: "error", title: "Passwords do not match" });
    setSubmitting(true);
    try {
      await api("/api/auth/reset-password", { method: "POST", body: { token, password } });
      await Swal.fire({ icon: "success", title: "Password changed", text: "You can now log in with your new password." });
      router.push("/login");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Could not reset", text: err.message });
    } finally { setSubmitting(false); }
  }

  if (!token) return (
    <div className="card w-full max-w-sm text-center">
      <p className="text-sm text-slate-600">This reset link is not valid. Please request a new one.</p>
      <Link href="/forgot-password" className="btn mt-4 inline-block">Request a new link</Link>
    </div>
  );
  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
      <h1 className="text-center text-2xl font-bold">Set a new password</h1>
      <div className="relative">
        <input className="input pr-10" type={showPassword ? "text" : "password"} placeholder="New password (6+ characters)" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-lg" aria-label="Show or hide password">{showPassword ? "👁️" : "👁️‍🗨️"}</button>
      </div>
      <input className="input" type={showPassword ? "text" : "password"} placeholder="Confirm new password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <button className="btn w-full" disabled={submitting}>{submitting ? "Saving..." : "Change password"}</button>
      <p className="text-center text-sm"><Link href="/login" className="text-blue-600 hover:underline">&larr; Back to Login</Link></p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return <main className="flex min-h-screen items-center justify-center p-4"><Suspense fallback={null}><ResetForm /></Suspense></main>;
}
