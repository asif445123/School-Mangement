// Pure share / WhatsApp-send status for one fee chalan, shared by the table
// badge (components/whatsapp-status) and the unit tests. A chalan counts as
// "sent" only when WhatsApp accepted the image or a user confirmed a manual
// share — opening a share sheet / chat never counts (see the whatsapp API route).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "14 Nov 2026, 3:42 PM" — formatted by hand so it is identical on every device. */
export function formatSentAt(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) return "";
  let hour = d.getHours();
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hour}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

export function shareStatus(fee: any) {
  const w = fee?.whatsapp || {};
  const count = Number(w.sentCount || 0);
  const attempts = Number(w.attemptCount || 0);
  const sent = w.lastStatus === "sent";
  // charges were edited after the last successful send — the family still has the old image
  const stale = sent && w.sentRevision !== (fee?.revision || 0);
  const manual = String(w.lastBy || "").includes("manual");
  return {
    sent,
    stale,
    count,
    failedCount: Math.max(0, attempts - count),
    label: stale ? "Updated · send again" : sent ? "WhatsApp sent" : w.lastStatus === "failed" ? "Send failed" : "Not sent",
    lastSentText: sent || w.lastSentAt ? formatSentAt(w.lastSentAt) : "",
    recipient: w.lastTo ? String(w.lastTo) : "",
    sentBy: w.lastBy ? String(w.lastBy).replace(/\s*\(manual confirmation\)\s*/i, "") : "",
    methodLabel: !sent ? "" : manual ? "Manually confirmed" : "Accepted by WhatsApp",
    error: w.lastError ? String(w.lastError) : "",
  };
}
