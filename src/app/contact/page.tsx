"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Swal } from "@/lib/alerts";
import { CONTACT } from "@/lib/contact";

function ContactForm() {
  const q = useSearchParams();
  const kind = q.get("kind") || "";
  const who = [q.get("name"), q.get("email")].filter(Boolean).join(" - ");
  const first = q.get("message") || (kind === "rejected" ? `Hello, my school account${who ? ` (${who})` : ""} was rejected. Please review it and approve it.` : kind === "pending" ? `Hello, I registered my school${who ? ` (${who})` : ""} on the School Management System and I am waiting for approval.` : "");
  const [f, setF] = useState({ name: q.get("name") || "", email: q.get("email") || "", message: first });
  const [sending, setSending] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const wa = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(f.message || "Hello, I need help with the School Management System.")}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api("/api/contact", { method: "POST", body: { ...f, kind } });
      await Swal.fire({ icon: "success", title: "Message sent", text: "Thank you! We will contact you soon." });
      setF({ ...f, message: "" });
    } catch (err: any) { Swal.fire({ icon: "error", title: "Could not send", text: err.message }); }
    finally { setSending(false); }
  }

  return (
    <div className="card w-full max-w-lg space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Contact Us</h1>
        <p className="mt-1 text-sm text-slate-500">{kind === "rejected" ? "Your account was rejected. Tell us who you are and we will review it." : kind === "pending" ? "Your school is waiting for approval. Send us a message for quick approval." : "Questions, help or account approval - send us a message."}</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Your name / school name" required value={f.name} onChange={set("name")} />
        <input className="input" type="email" placeholder="Your email (we reply here)" required value={f.email} onChange={set("email")} />
        <textarea className="input min-h-32" placeholder="Your message" required value={f.message} onChange={set("message")} />
        <button className="btn w-full" disabled={sending}>{sending ? "Sending..." : "Send message"}</button>
      </form>
      <div className="flex items-center justify-center gap-3 border-t pt-4 text-sm text-slate-600">
        <span>Or chat with us:</span>
        <a href={wa} target="_blank" rel="noopener" className="rounded-lg bg-green-500 px-3 py-1.5 font-medium text-white hover:bg-green-600">WhatsApp</a>
      </div>
      <p className="text-center text-sm"><Link href="/login" className="text-blue-600 hover:underline">&larr; Back to Login</Link> <span className="text-slate-400">or</span> <Link href="/demo" className="text-blue-600 hover:underline">View Demo</Link></p>
    </div>
  );
}

export default function ContactPage() {
  return <main className="flex min-h-screen items-center justify-center p-4"><Suspense fallback={null}><ContactForm /></Suspense></main>;
}
