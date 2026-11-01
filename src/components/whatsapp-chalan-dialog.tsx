"use client";
import { useState } from "react";
import Link from "next/link";
import { FaDownload, FaShare, FaWhatsapp } from "react-icons/fa";
import Modal from "./modal";
import WhatsAppStatus from "./whatsapp-status";
import { api, money } from "@/lib/api";
import { Swal, toast } from "@/lib/alerts";
import { studentWhatsApp } from "@/lib/phone";
import { chalanFileName } from "@/lib/chalan";
export default function WhatsAppChalanDialog({ fee, onClose, onChanged, configured, countryCode = "92" }: { fee: any; onClose: () => void; onChanged: (fee: any) => void; configured: boolean; countryCode?: string }) {
  const [busy, setBusy] = useState(false), [current, setCurrent] = useState(fee);
  const recipient = studentWhatsApp(fee.student, countryCode);
  const src = `/api/fees/${fee._id}/image`;
  async function send(mode: "api" | "manual") {
    if (mode === "manual") {
      const result = await Swal.fire({ title: "Did you send this image?", text: "Only confirm after attaching and sending the current voucher image in WhatsApp. This records a manual send; it cannot verify delivery.", icon: "question", showCancelButton: true, confirmButtonText: "Yes, I sent it", confirmButtonColor: "#15803d" });
      if (!result.isConfirmed) return;
    }
    setBusy(true);
    try { const d = await api(`/api/fees/${fee._id}/whatsapp`, { method: "POST", body: { mode, confirmed: mode === "manual", expectedRevision: fee.revision || 0 } }); setCurrent(d.item); onChanged(d.item); toast("success", d.message); }
    catch (e: any) { if (e.data?.item) { setCurrent(e.data.item); onChanged(e.data.item); } toast("error", e.message); }
    finally { setBusy(false); }
  }
  async function imageBlob() { const response = await fetch(src); if (!response.ok) throw new Error("Could not load the voucher image"); return response.blob(); }
  async function download() { setBusy(true); try { const url = URL.createObjectURL(await imageBlob()); const a = document.createElement("a"); a.href = url; a.download = chalanFileName(fee); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast("info", "Image downloaded. Attach it in WhatsApp, then confirm the manual send."); } catch (e: any) { toast("error", e.message); } finally { setBusy(false); } }
  async function share() {
    setBusy(true);
    try {
      const file = new File([await imageBlob()], chalanFileName(fee), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "School fee chalan" }); toast("info", "If you sent the image, use Record manual send below."); }
      else { const url = URL.createObjectURL(file); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); window.open(`https://wa.me/${recipient.number}?text=${encodeURIComponent(`Fee chalan ${fee.chalanNo} - ${fee.student?.name}. Please find the voucher image attached.`)}`, "_blank", "noopener,noreferrer"); toast("info", "Attach the downloaded image in WhatsApp. Opening the chat is not a send."); }
    } catch (e: any) { if (e.name !== "AbortError") toast("error", e.message || "Sharing unavailable. Download the image instead."); }
    finally { setBusy(false); }
  }
  return <Modal title="Send fee chalan on WhatsApp" onClose={() => { if (!busy) onClose(); }} wide>
    <div className="grid gap-5 md:grid-cols-[1fr_260px]"><div className="rounded-lg bg-slate-100 p-2"><img src={src} alt={`Fee chalan ${fee.chalanNo} for ${fee.student?.name}`} className="mx-auto max-h-[60dvh] w-auto shadow-sm" /></div><div className="space-y-4">
      <div><p className="font-semibold">{fee.student?.name}</p><p className="text-sm text-slate-500">Chalan {fee.chalanNo} · {fee.month}</p><p className="mt-2 text-sm">WhatsApp: <b>{recipient.value || "Not provided"}</b></p><p className="text-xs text-slate-500">{recipient.usesPhone ? "Using student phone number as WhatsApp." : "Using separate WhatsApp number."}</p>{!recipient.number && <p className="mt-2 text-sm text-red-600">Add a valid number in Students before sending.</p>}</div>
      <WhatsAppStatus fee={current} />
      <button className="btn w-full !bg-green-700 hover:!bg-green-800" disabled={busy || !recipient.number || !configured} onClick={() => send("api")}><FaWhatsapp />{busy ? "Please wait…" : current.whatsapp?.sentCount ? "Send again via WhatsApp" : "Send image via WhatsApp"}</button>
      {!configured && <p className="text-xs text-slate-500">Automatic sending is not connected. <Link className="text-blue-700 underline" href="/whatsapp-settings">Open WhatsApp settings</Link>, or share the image manually below.</p>}
      <div className="space-y-2 border-t pt-4"><button className="btn-light w-full" disabled={busy} onClick={download}><FaDownload />Download image</button><button className="btn-light w-full" disabled={busy || !recipient.number} onClick={share}><FaShare />Share manually</button><button className="text-sm font-medium text-green-700 underline disabled:opacity-50" disabled={busy || !recipient.number} onClick={() => send("manual")}>Record manual send</button><p className="text-xs text-slate-500">Manual sharing never marks a voucher sent until you confirm it.</p></div>
      <p className="text-xs text-slate-500">Voucher total: {money(fee.amount)}. Previous balances and payment accounts are included in the image. A green tick confirms acceptance, not delivery or reading.</p>
    </div></div>
  </Modal>;
}
