"use client";
import { useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { api, money } from "@/lib/api";
import { Swal, toast } from "@/lib/alerts";
import { formatMonth } from "@/lib/chalan";
import { buildFeeDefaulters, feeReminderMessage } from "@/lib/fee-defaulters";
import { studentWhatsApp, whatsappDisplay } from "@/lib/phone";
import { studentClassSection } from "@/lib/student-details";
import { useSession } from "@/components/session";
import WhatsAppStatus from "@/components/whatsapp-status";

export default function FeeDefaultersPage() {
  const { user } = useSession();
  const [fees, setFees] = useState<any[]>([]);
  const [countryCode, setCountryCode] = useState("92");
  const [className, setClassName] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api("/api/fees/defaulters"), api("/api/settings/whatsapp")])
      .then(([feeData, whatsappData]) => {
        if (!active) return;
        setFees(feeData.items || []);
        setCountryCode(whatsappData.settings?.countryCallingCode || "92");
      })
      .catch((error: any) => {
        if (active) toast("error", error.message || "Could not load pending fees");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const defaulters = useMemo(() => buildFeeDefaulters(fees), [fees]);
  const classes = useMemo(
    () => [...new Set(defaulters.map((row) => String(row.student.className || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [defaulters],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const shown = defaulters.filter((row) => {
    if (className && row.student.className !== className) return false;
    if (!normalizedQuery) return true;
    const searchable = [
      row.student.name,
      row.student.fatherName,
      row.student.rollNo,
      row.student.className,
      row.student.section,
      whatsappDisplay(row.student),
    ].join(" ").toLowerCase();
    return searchable.includes(normalizedQuery);
  });
  const schoolName = user?.schoolInfo?.name || user?.schoolName || "the school";

  async function sendReminder(studentId: string, studentName: string, href: string) {
    if (!href || sendingId) return;
    // Open synchronously from the click so the browser does not block the WhatsApp tab.
    window.open(href, "_blank", "noopener,noreferrer");
    const result = await Swal.fire({
      title: `Did you send this reminder to ${studentName}?`,
      text: "Only confirm after sending the fee reminder in WhatsApp. This records the reminder on this student's pending chalans so its status appears in Chalans & Payments.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, I sent it",
      cancelButtonText: "Not yet",
      confirmButtonColor: "#15803d",
    });
    if (!result.isConfirmed) return;
    setSendingId(studentId);
    try {
      const d = await api("/api/fees/defaulters/whatsapp", {
        method: "POST",
        body: { studentId, confirmed: true },
      });
      const updated = new Map((d.items || []).map((fee: any) => [String(fee._id), fee]));
      setFees((old) => old.map((fee) => updated.has(String(fee._id)) ? { ...fee, whatsapp: (updated.get(String(fee._id)) as any).whatsapp } : fee));
      toast("success", "WhatsApp reminder recorded on the student's pending chalans");
    } catch (error: any) {
      toast("error", error.message || "Could not record the WhatsApp reminder");
    } finally {
      setSendingId("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-base font-bold sm:text-lg">Pending Fees ({shown.length}) - WhatsApp Reminders</h1>
          <p className="mt-1 text-sm text-slate-500">Each student appears once with the total balance of all pending chalans.</p>
        </div>
        <div className="flex w-full flex-col gap-2 min-[440px]:flex-row sm:w-auto">
          <input
            className="input min-[440px]:w-60"
            placeholder="Search student…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="block text-xs font-medium text-slate-600">
            Class
            <select
              className="input mt-1 min-[440px]:w-36"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
            >
              <option value="">All</option>
              {classes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr>
              {[
                "Admission / Roll #",
                "Student",
                "Father",
                "Class",
                "Latest pending month",
                "Balance",
                "Phone",
                "Share status",
              ].map((heading) => <th key={heading} className="th">{heading}</th>)}
              <th className="th"><span className="sr-only">WhatsApp reminder</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const recipient = studentWhatsApp(row.student, countryCode);
              const message = feeReminderMessage(row, schoolName);
              const href = recipient.number
                ? `https://wa.me/${recipient.number}?text=${encodeURIComponent(message)}`
                : "";
              return (
                <tr key={row.studentId} className="border-t">
                  <td className="td whitespace-nowrap">{row.student.rollNo || "—"}</td>
                  <td className="td font-medium text-slate-900">{row.student.name}</td>
                  <td className="td">{row.student.fatherName || "—"}</td>
                  <td className="td whitespace-nowrap">{studentClassSection(row.student)}</td>
                  <td className="td whitespace-nowrap">
                    {formatMonth(row.latestMonth)}
                    {row.pendingVoucherCount > 1 && <span className="ml-1 text-xs text-slate-400">(+{row.pendingVoucherCount - 1} older)</span>}
                  </td>
                  <td className="td whitespace-nowrap font-semibold text-red-600">{money(row.balance)}</td>
                  <td className="td whitespace-nowrap">{whatsappDisplay(row.student)}</td>
                  <td className="td"><WhatsAppStatus fee={{ whatsapp: row.whatsapp, revision: row.revision || 0 }} /></td>
                  <td className="td text-center">
                    <button
                      type="button"
                      className={`icon-btn ${href ? "bg-green-600 text-white hover:bg-green-700" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}
                      title={href ? `Send WhatsApp reminder to ${row.student.name}` : "No valid WhatsApp or phone number"}
                      aria-label={`${href ? "Send WhatsApp reminder to" : "No valid WhatsApp number for"} ${row.student.name}`}
                      disabled={!href || sendingId === row.studentId}
                      onClick={() => sendReminder(row.studentId, row.student.name, href)}
                    >
                      <FaWhatsapp />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!shown.length && (
              <tr>
                <td colSpan={9} className="td py-8 text-center text-slate-400">
                  {loading ? "Loading pending fees…" : defaulters.length ? "No defaulters match this filter" : "No pending fees"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-500">
        Select the WhatsApp icon to open a pre-filled fee reminder. Confirm only after sending; the status is then recorded on the student's pending chalans and shown in both this list and Chalans & Payments.
      </p>
    </div>
  );
}
