"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Swal, formDialog, toast } from "@/lib/alerts";
import { accessDialog, contactLink } from "@/lib/access-dialog";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const d = await api("/api/auth/login", { method: "POST", body: { ...form, remember } });
      router.replace(d.role === "student" ? "/my" : d.role === "admin" ? "/users" : d.role === "teacher" ? "/students" : "/dashboard");
    } catch (err: any) {
      const status = err.data?.status;
      if (status === "pending" || status === "rejected") {
        const c = await accessDialog(status, { email: form.email });
        if (c === "demo") router.push("/demo");
        else if (c === "contact") router.push(contactLink(status, { email: form.email }));
      }
      else Swal.fire({ icon: "error", title: "Login failed", text: err.message });
    } finally { setLoading(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-bold">School Login</h1>
        <input className="input" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="relative">
          <input className="input pr-10" type={showPassword ? "text" : "password"} placeholder="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-lg" aria-label="Toggle password">
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
          <Link href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
        </div>
        <button className="btn w-full" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
        <Link href="/demo" className="btn-light block w-full text-center">View Demo</Link>
        <p className="text-center text-sm text-slate-600">New here? <Link href="/signup" className="text-blue-600 hover:underline">Create account</Link></p>
        <p className="text-center text-sm text-slate-600">Need help? <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link></p>
      </form>
    </main>
  );
}
