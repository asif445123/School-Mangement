"use client";
import { FaCheck, FaTimes } from "react-icons/fa";
export default function WhatsAppStatus({ fee }: { fee: any }) {
  const w = fee.whatsapp || {}, sent = w.lastStatus === "sent", count = w.sentCount || 0;
  const stale = sent && w.sentRevision !== (fee.revision || 0);
  const date = w.lastSentAt ? new Date(w.lastSentAt).toLocaleString() : "";
  return <div className="min-w-36 text-xs" title={w.lastError || (date ? `Last successful send: ${date} to +${w.lastTo}` : "No successful send yet")}>
    <span className={`inline-flex items-center gap-1.5 font-semibold ${sent && !stale ? "text-green-700" : "text-red-600"}`}>{sent && !stale ? <FaCheck aria-label="Sent" /> : <FaTimes aria-label="Not sent or failed" />}{stale ? "Updated · send again" : sent ? "WhatsApp sent" : w.lastStatus === "failed" ? "Send failed" : "Not sent"}</span>
    <p className="mt-1 text-slate-500">{count ? `${count} ${count === 1 ? "time" : "times"} sent` : "0 times sent"}{w.attemptCount > count ? ` · ${w.attemptCount - count} failed` : ""}</p>
    {sent && <p className="mt-0.5 text-slate-400">{w.lastBy?.includes("manual") ? "Manually confirmed" : "Accepted by WhatsApp"}</p>}
    {w.lastError && <p className="mt-1 max-w-52 break-words text-red-600">{w.lastError}</p>}
  </div>;
}
