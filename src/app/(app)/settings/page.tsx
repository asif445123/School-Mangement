"use client";
import { FormEvent, useState } from "react";
import { useSession } from "@/components/session";
import { api } from "@/lib/api";
import { resizeImage, toast } from "@/lib/alerts";

export default function SettingsPage() {
  const { user, setUser } = useSession();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const school = user.role === "school";
  const now = new Date();
  const year = now.getFullYear() - (now.getMonth() < 6 ? 1 : 0);
  const session = (y: number) => `${y}-${String(y + 1).slice(-2)}`;
  const sessions = new Set(Array.from({length: 11}, (_, i) => session(year - 5 + i)));
  if (user.currentSession) sessions.add(user.currentSession);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("logo");
    data.delete("logo");
    setBusy(true);
    try {
      if (file instanceof File && file.size) {
        const logo = await resizeImage(file);
        if (!logo) throw new Error("Choose a readable image for the school logo");
        data.set("logo", logo);
      }
      const d = await api("/api/auth/me", { method: "PUT", body: Object.fromEntries(data) });
      setUser({ ...user, ...d.user });
      form.reset();
      setShow({});
      toast("success", "Settings updated");
    } catch (err: any) { toast("error", err.message); }
    finally { setBusy(false); }
  }
  function field(name: string, label: string, type = "text", required = false, value = user[name] || "") {
    if (type === "password") {
      const short = name === "newPassword" ? "new password" : "current password";
      return <label>{label}<span className="relative block">
        <input className="input pr-10" name={name} type={show[name] ? "text" : "password"} defaultValue={value} minLength={name === "newPassword" ? 6 : undefined} />
        <button type="button" onClick={() => setShow((s) => ({ ...s, [name]: !s[name] }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-lg" aria-label={`${show[name] ? "Hide" : "Show"} ${short}`} aria-pressed={!!show[name]} title={show[name] ? "Hide password" : "Show password"}>{show[name] ? "👁️" : "👁️‍🗨️"}</button>
      </span></label>;
    }
    return <label>{label}{required && " *"}<input className="input" name={name} type={type} required={required} defaultValue={value} /></label>;
  }
  return <form key={user.updatedAt} onSubmit={save} className="card max-w-3xl space-y-5">
    <h1 className="text-xl font-bold">{school ? "School Info" : "Account Info"}</h1>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      {field("name", "Name", "text", true)}{field("phone", "Phone", "tel")}{field("email", "Email", "email", true)}
      {school && <><label className="sm:col-span-2">School logo (choose an image to change it)
        {user.schoolInfo?.logo && <img src={user.schoolInfo.logo} alt="Current school logo" className="my-1 h-12 object-contain" />}
        <input className="mt-1 block max-w-full" type="file" name="logo" accept="image/*" /></label>
        <label className="sm:col-span-2">Current Session<select className="input" name="currentSession" defaultValue={user.currentSession || session(year)}>{[...sessions].sort().map(s => <option key={s}>{s}</option>)}</select></label>
        {field("financialYearStart", "Financial Year Start", "date", true, user.financialYearStart || `${year}-07-01`)}
        {field("financialYearEnd", "Financial Year End", "date", true, user.financialYearEnd || `${year + 1}-06-30`)}
      </>}
      {field("currentPassword", "Current password (only to change password)", "password")}
      {field("newPassword", "New password (leave empty to keep)", "password")}
    </fieldset>
    <div className="flex gap-3"><button disabled={busy} className="btn">{busy ? "Saving…" : "Save"}</button><button disabled={busy} type="reset" className="rounded-lg border px-4 py-2" onClick={() => setShow({})}>Cancel</button></div>
  </form>;
}
