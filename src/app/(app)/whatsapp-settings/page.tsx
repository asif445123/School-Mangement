"use client";
import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { api } from "@/lib/api";
import { toast } from "@/lib/alerts";
export default function WhatsAppSettingsPage() {
  const [form, setForm] = useState<any>({ enabled: false, phoneNumberId: "", accessToken: "", templateName: "", templateLanguage: "en_US", countryCallingCode: "92", clearToken: false });
  const [ready, setReady] = useState(false), [saving, setSaving] = useState(false), [encryptionReady, setEncryptionReady] = useState(false);
  useEffect(() => { api("/api/settings/whatsapp").then((d) => { setForm({ ...d.settings, accessToken: "", clearToken: false }); setEncryptionReady(d.encryptionReady); }).catch((e) => toast("error", e.message)).finally(() => setReady(true)); }, []);
  const set = (key: string, value: any) => setForm((v: any) => ({ ...v, [key]: value }));
  async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); try { const d = await api("/api/settings/whatsapp", { method: "PUT", body: form }); setForm({ ...d.settings, accessToken: "", clearToken: false }); toast("success", "WhatsApp settings saved"); } catch (e: any) { toast("error", e.message); } finally { setSaving(false); } }
  const field = (key: string, label: string, hint: string, type = "text") => <label className="block text-sm font-medium">{label}<input className="input mt-1" type={type} value={form[key] || ""} onChange={(e) => set(key, e.target.value)} autoComplete={type === "password" ? "new-password" : "off"} maxLength={type === "password" ? 2048 : 512} />{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}</label>;
  if (!ready) return <p className="text-slate-500">Loading settings…</p>;
  return <div className="mx-auto max-w-3xl space-y-5"><div><h1 className="flex items-center gap-2 text-xl font-bold"><FaWhatsapp className="text-green-600" /> WhatsApp settings</h1><p className="mt-1 text-sm text-slate-500">Connect your school's WhatsApp Business Platform account to send fee chalan images.</p></div>
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Before connecting:</b> create a Meta developer app, add WhatsApp, and use a permanent System User access token with <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code> permissions. A Phone Number ID is not a phone number. Meta messaging charges may apply.</div>
    {!encryptionReady && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Server setup required: set <code>CREDENTIALS_ENCRYPTION_KEY</code> to at least 32 random characters in the server environment, then restart. Keep this key stable and private. Tokens are encrypted before storage.</div>}
    <form onSubmit={save} className="card space-y-5">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Connection</h2><span className={`rounded-full px-3 py-1 text-xs ${form.hasAccessToken ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{form.hasAccessToken ? "Access token saved" : "No access token"}</span></div>
      {field("phoneNumberId", "WhatsApp Business Phone Number ID", "Find this in Meta → WhatsApp → API Setup. Numeric ID only.")}
      {field("accessToken", form.hasAccessToken ? "Replace access token (leave blank to keep)" : "Access token", "Stored encrypted on the server. Never shown again or sent to other users.", "password")}
      {form.hasAccessToken && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.clearToken} onChange={(e) => set("clearToken", e.target.checked)} /> Remove saved token and disable automatic sending</label>}
      {field("countryCallingCode", "Default country calling code", "92 for Pakistan. Local student numbers are converted to international format; numbers starting with + keep their country code.")}
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Enable sending through WhatsApp</label>
      <div className="space-y-4 border-t pt-4"><h2 className="font-semibold">Approved template (recommended)</h2><p className="text-sm text-slate-500">Outside a customer's 24-hour service window, Meta requires an approved template. Create a UTILITY template with an IMAGE header and four body variables in this order: student name, chalan number, month, balance due. The generated voucher is attached as the header image.</p>{field("templateName", "Template name (optional)", "For example: school_fee_chalan. Leave blank only for image messages inside an open 24-hour service window.")}{field("templateLanguage", "Template language", "Use the exact approved language code, for example en_US or ur.")}</div>
      <button className="btn" disabled={saving}>{saving ? "Saving…" : "Save WhatsApp settings"}</button>
    </form>
    <div className="card text-sm text-slate-600"><h2 className="mb-2 font-semibold text-slate-800">Sending and status</h2><p>Open Fee Chalan → WhatsApp on a voucher. Preview and send the image, send it again, or download it for manual sharing. A green tick means WhatsApp accepted the image message, or an administrator explicitly confirmed a manual send—not that the family has read it. A red cross means not sent or the latest attempt failed. Successful sends are counted separately from failed attempts.</p><p className="mt-2">Without Meta credentials, use Download image or Share manually. Opening WhatsApp never changes the status automatically.</p></div>
  </div>;
}
