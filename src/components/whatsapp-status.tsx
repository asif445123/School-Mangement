"use client";
import { FaCheck, FaClock, FaTimes } from "react-icons/fa";
import { shareStatus } from "@/lib/share-status";

/** Compact share status with send metadata available from a per-row details dropdown. */
export default function WhatsAppStatus({ fee }: { fee: any }) {
  const s = shareStatus(fee);
  const pill = s.stale
    ? "bg-amber-100 text-amber-800"
    : s.sent
      ? "bg-green-100 text-green-700"
      : "bg-red-50 text-red-600";

  return <div className="min-w-36 text-xs">
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 font-semibold ${pill}`}>
      {s.sent && !s.stale ? <FaCheck aria-label="Sent" /> : <FaTimes aria-label="Not sent or failed" />}{s.label}
    </span>
    <p className="mt-1.5 font-semibold text-slate-700">
      {s.count} {s.count === 1 ? "time" : "times"} sent
      {s.failedCount > 0 && <span className="font-normal text-red-600"> · {s.failedCount} failed</span>}
    </p>
    <details className="group mt-1">
      <summary className="w-fit cursor-pointer select-none font-medium text-blue-700 underline decoration-dotted underline-offset-2">Details</summary>
      <div className="mt-1.5 space-y-1 rounded border border-slate-200 bg-white p-2 text-slate-600 shadow-sm">
        {s.lastSentText
          ? <p className="flex items-start gap-1"><FaClock className="mt-0.5 shrink-0" />Last sent: {s.lastSentText}</p>
          : <p>No successful send yet.</p>}
        {s.recipient && <p>To: +{s.recipient}</p>}
        {s.methodLabel && <p>{s.methodLabel}{s.sentBy ? ` · by ${s.sentBy}` : ""}</p>}
        {s.error && <p className="break-words text-red-600">{s.error}</p>}
      </div>
    </details>
  </div>;
}
