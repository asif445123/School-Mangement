"use client";
import { FaCheck, FaClock, FaTimes } from "react-icons/fa";
import { shareStatus } from "@/lib/share-status";

/**
 * Share status of one chalan, shown in the Fee Chalan table and in the
 * WhatsApp preview dialog: whether the chalan image was sent, HOW MANY TIMES
 * it was sent, and when / to whom / by whom the last send happened.
 */
export default function WhatsAppStatus({ fee }: { fee: any }) {
  const s = shareStatus(fee);
  const pill = s.stale
    ? "bg-amber-100 text-amber-800"
    : s.sent
      ? "bg-green-100 text-green-700"
      : "bg-red-50 text-red-600";
  const title = s.error
    || (s.lastSentText ? `Last successful send: ${s.lastSentText}${s.recipient ? ` to +${s.recipient}` : ""}` : "No successful send yet");
  return <div className="min-w-44 text-xs" title={title}>
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 font-semibold ${pill}`}>
      {s.sent && !s.stale ? <FaCheck aria-label="Sent" /> : <FaTimes aria-label="Not sent or failed" />}{s.label}
    </span>
    <p className="mt-1.5 font-semibold text-slate-700">
      {s.count} {s.count === 1 ? "time" : "times"} sent
      {s.failedCount > 0 && <span className="font-normal text-red-600"> · {s.failedCount} failed</span>}
    </p>
    {s.lastSentText && <p className="mt-0.5 flex items-center gap-1 text-slate-500"><FaClock className="shrink-0" />Last sent: {s.lastSentText}</p>}
    {s.recipient && <p className="mt-0.5 text-slate-500">To: +{s.recipient}</p>}
    {s.methodLabel && <p className="mt-0.5 text-slate-400">{s.methodLabel}{s.sentBy ? ` · by ${s.sentBy}` : ""}</p>}
    {s.error && <p className="mt-1 max-w-52 break-words text-red-600">{s.error}</p>}
  </div>;
}
