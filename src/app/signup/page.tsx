"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Swal } from "@/lib/alerts";
import { accessDialog, contactLink } from "@/lib/access-dialog";

export default function SignupPage() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", schoolName: "", email: "", phone: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [logo, setLogo] = useState("");
  function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setLogo("");
    if (!file.type.startsWith("image/")) { Swal.fire({ icon: "error", title: "Please choose an image file" }); return; }
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { // shrink to max 200px so it stays small in the database
      const k = Math.min(1, 200 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      setLogo(c.toDataURL("image/png")); URL.revokeObjectURL(url);
    };
    img.src = url;
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password !== f.confirm) return Swal.fire({ icon: "error", title: "Passwords do not match" });
    try {
      const d = await api("/api/auth/signup", { method: "POST", body: { ...f, logo } });
      if (d.firstAdmin) await Swal.fire({ icon: "success", title: "Account created", text: "You are the admin. You can login now." });
      else {
        const c = await accessDialog("pending", { email: f.email, schoolName: f.schoolName, created: true });
        if (c === "demo") { router.push("/demo"); return; }
        if (c === "contact") { router.push(contactLink("pending", { email: f.email, schoolName: f.schoolName })); return; }
      }
      router.push("/login");
    } catch (err: any) { Swal.fire({ icon: "error", title: "Signup failed", text: err.message }); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
        <h1 className="text-center text-2xl font-bold">Register Your School</h1>
        <input className="input" placeholder="School name" required value={f.schoolName} onChange={set("schoolName")} />
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-2 text-sm text-slate-600">
          {logo ? <img src={logo} alt="Logo preview" className="h-12 w-12 rounded object-contain" /> : <span className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-xl">🏫</span>}
          <label className="flex-1 cursor-pointer">School logo (optional)<input type="file" accept="image/*" onChange={pickLogo} className="mt-1 block w-full text-xs" /></label>
        </div>
        <input className="input" placeholder="Your name (school admin)" required value={f.name} onChange={set("name")} />
        <input className="input" type="email" placeholder="Email" required value={f.email} onChange={set("email")} />
        <input className="input" placeholder="Phone" required value={f.phone} onChange={set("phone")} />
        <div className="relative">
          <input className="input pr-10" type={showPassword ? "text" : "password"} placeholder="Password (6+ chars)" required value={f.password} onChange={set("password")} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-lg">{showPassword ? "👁️" : "👁️‍🗨️"}</button>
        </div>
        <input className="input" type={showPassword ? "text" : "password"} placeholder="Confirm password" required value={f.confirm} onChange={set("confirm")} />
        <button className="btn w-full">Sign up</button>
        <p className="text-center text-sm text-slate-600">Already registered? <Link href="/login" className="text-blue-600 hover:underline">Login</Link></p>
      </form>
    </main>
  );
}
