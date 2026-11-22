"use client";
import { useState } from "react";
import { FaDownload, FaPrint } from "react-icons/fa";
import { gradeOf, money, today } from "@/lib/api";
import { printChalan } from "@/lib/print";
import { accountTypeLabel } from "@/lib/payment-accounts";
import type { PortalBundle } from "./my-portal-data";

// ---------------------------------------------------------------------------
// The four portal sections. Each one is a page of its own on a child's route
// (/my/<childId>/fees, /diary, /tests, /exams), so the sidebar can open them
// directly and a guardian with several children reads each child separately.
// ---------------------------------------------------------------------------

export const TERMS = ["First term", "Mid term", "Final term"];

const badge: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  unpaid: "bg-red-100 text-red-700",
};
const statusLabel: Record<string, string> = { paid: "Received", partial: "Part received", unpaid: "Pending" };

export const feeStatus = (f: any) => ((Number(f.amount) || 0) - (Number(f.paid) || 0) <= 0 ? "paid" : f.paid > 0 ? "partial" : "unpaid");

// same three states for a {total, paid, balance} summary
export const totalsStatus = (t: { total: number; paid: number; balance: number }) =>
  (t.balance <= 0 ? "paid" : t.paid > 0 ? "partial" : "unpaid");

export const totalsOf = (fees: any[] = []) => {
  const total = fees.reduce((a, f) => a + (Number(f.amount) || 0), 0);
  const paid = fees.reduce((a, f) => a + (Number(f.paid) || 0), 0);
  return { total, paid, balance: total - paid };
};

// exam marks of one child for one term (every term when `term` is empty)
export const examStats = (bundle: PortalBundle, term = "") => {
  const rows = (bundle.marks || []).filter((x: any) => x.paper && x.paper.type === "exam" && (!term || x.paper.term === term));
  const obt = rows.reduce((a: number, m: any) => a + (Number(m.obtained) || 0), 0);
  const tot = rows.reduce((a: number, m: any) => a + (Number(m.paper.totalMarks) || 0), 0);
  return { obt, tot, pct: tot ? (obt / tot) * 100 : null, count: rows.length };
};

// one small summary card ("Paid amount", "Balance"...)
export function StatCard({ label, value, tone = "text-slate-800" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

// one date picker for one list (diary and tests each keep their own date)
export function DatePick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="text-xs font-semibold text-slate-500" htmlFor={`date-${label.replace(/\s+/g, "-").toLowerCase()}`}>{label}</label>
        <input
          id={`date-${label.replace(/\s+/g, "-").toLowerCase()}`}
          type="date"
          className="input mt-1 w-full sm:w-44"
          value={value}
          onChange={(e) => onChange(e.target.value || today())}
        />
      </div>
      {value !== today() && <button className="btn-light" onClick={() => onChange(today())}>Today</button>}
    </div>
  );
}

function Marks({ title, rows }: { title: string; rows: any[] }) {
  const obt = rows.reduce((a: number, m: any) => a + (Number(m.obtained) || 0), 0);
  const tot = rows.reduce((a: number, m: any) => a + (Number(m.paper.totalMarks) || 0), 0);
  return (
    <div className="card overflow-x-auto p-0">
      <h3 className="p-4 pb-2 font-semibold">{title}</h3>
      <table className="w-full min-w-[600px]">
        <thead><tr>{["Subject", "Paper", "Marks", "%", "Grade"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((m) => {
            const pct = (m.obtained / (m.paper.totalMarks || 1)) * 100;
            return (
              <tr key={m._id} className="border-t">
                <td className="td">{m.paper.subject}</td><td className="td">{m.paper.title}</td>
                <td className="td">{m.obtained} / {m.paper.totalMarks}</td><td className="td">{pct.toFixed(1)}%</td>
                <td className="td font-semibold">{gradeOf(pct)}</td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={5} className="td py-5 text-center text-slate-400">No marks yet</td></tr>}
          {rows.length > 0 && (
            <tr className="border-t bg-slate-50 font-semibold">
              <td className="td" colSpan={2}>Total</td><td className="td">{obt} / {tot}</td>
              <td className="td">{tot ? ((obt / tot) * 100).toFixed(1) : "0.0"}%</td>
              <td className="td">{tot ? gradeOf((obt / tot) * 100) : "-"}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- Fee chalan ------------------------------------------------------------
export function FeeChalanSection({ bundle, schoolInfo, accounts = [] }: { bundle: PortalBundle; schoolInfo?: any; accounts?: any[] }) {
  const { student, fees } = bundle;
  const { total, paid, balance } = totalsOf(fees);
  const pending = fees.filter((f: any) => feeStatus(f) !== "paid").length;

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <h2 className="font-semibold">Fee chalan summary</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total amount" value={money(total)} />
          <StatCard label="Paid amount" value={money(paid)} tone="text-green-700" />
          <StatCard label="Balance" value={money(balance)} tone={balance > 0 ? "text-red-600" : "text-green-700"} />
        </div>
        <p className="text-sm text-slate-600">
          {fees.length} {fees.length === 1 ? "chalan" : "chalans"} · {pending ? `${pending} still to be paid` : "everything cleared"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Month by month chalans</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>{["Month", "Chalan #", "Admission", "Annual charges", "Amount", "Paid", "Balance", "Status", "Voucher"].map((h) => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {fees.map((f: any) => {
                const bal = f.amount - f.paid;
                const st = feeStatus(f);
                return (
                  <tr key={f._id} className="border-t">
                    <td className="td">{f.month === "0000-00" ? "Previous pending" : f.month}</td>
                    <td className="td">{f.chalanNo}</td>
                    <td className="td">{money(f.admissionFee)}</td>
                    <td className="td">{money(f.annualCharges)}</td>
                    <td className="td">{money(f.amount)}</td>
                    <td className="td">{money(f.paid)}</td>
                    <td className="td font-semibold">{money(bal)}</td>
                    <td className="td"><span className={`rounded px-2 py-1 text-xs ${badge[st]}`}>{statusLabel[st]}</span></td>
                    <td className="td whitespace-nowrap">
                      <button className="icon-btn" title="Print voucher" aria-label={`Print chalan ${f.chalanNo}`} onClick={() => printChalan({ ...f, student }, schoolInfo, accounts)}><FaPrint /></button>
                      <a className="icon-btn text-green-700" title="Download voucher image" aria-label={`Download chalan ${f.chalanNo}`} href={`/api/fees/${f._id}/image?download=1`}><FaDownload /></a>
                    </td>
                  </tr>
                );
              })}
              {!fees.length && <tr><td colSpan={9} className="td py-6 text-center text-slate-400">No chalans yet</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {accounts.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold">School payment accounts</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map((a: any) => (
              <div key={a._id} className="rounded-lg border bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold text-blue-700">{accountTypeLabel(a.type)}</p>
                <p className="font-semibold">{a.title}</p>
                <p className="break-all">{a.accountNumber}</p>
                {a.bankName && <p>{a.bankName}</p>}
                {a.iban && <p className="break-all text-xs">IBAN: {a.iban}</p>}
                {a.instructions && <p className="mt-1 text-xs text-slate-500">{a.instructions}</p>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Verify the account title and number before paying. Share your payment receipt with the school office.</p>
        </section>
      )}
    </div>
  );
}

// --- Daily diary -----------------------------------------------------------
export function DiarySection({ bundle }: { bundle: PortalBundle }) {
  const [date, setDate] = useState(today());
  const rows = bundle.diary.filter((x: any) => x.date === date);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-semibold">Daily diary</h2>
        <DatePick label="Diary date" value={date} onChange={setDate} />
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead><tr>{["Date", "Subject", "Homework / Note"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((x: any) => (
              <tr key={x._id} className="border-t"><td className="td whitespace-nowrap">{x.date}</td><td className="td">{x.subject}</td><td className="td">{x.text}</td></tr>
            ))}
            {!rows.length && <tr><td colSpan={3} className="td py-5 text-center text-slate-400">No diary for {date === today() ? "today" : date}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">The diary is written by the class teacher for the whole class. Pick another date to look back.</p>
    </section>
  );
}

// --- Tests -----------------------------------------------------------------
export function TestsSection({ bundle }: { bundle: PortalBundle }) {
  const [date, setDate] = useState(today());
  const papers = bundle.papers.filter((p: any) => p.date === date && p.type === "test");
  const markOf = (id: string) => bundle.marks.find((m: any) => m.paper?._id === id);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-semibold">Tests</h2>
        <DatePick label="Test date" value={date} onChange={setDate} />
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead><tr>{["Date", "Subject", "Test", "Total marks", "Marks obtained", "%"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {papers.map((p: any) => {
              const mark = markOf(p._id);
              return (
                <tr key={p._id} className="border-t">
                  <td className="td whitespace-nowrap">{p.date}</td><td className="td">{p.subject}</td><td className="td">{p.title}</td>
                  <td className="td">{p.totalMarks}</td>
                  <td className="td font-semibold">{mark ? mark.obtained : "-"}</td>
                  <td className="td">{mark && p.totalMarks ? `${((mark.obtained / p.totalMarks) * 100).toFixed(1)}%` : "-"}</td>
                </tr>
              );
            })}
            {!papers.length && <tr><td colSpan={6} className="td py-5 text-center text-slate-400">No test on {date === today() ? "today" : date}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">A test paper appears here for the date it was scheduled. Marks show as soon as the teacher enters them.</p>
    </section>
  );
}

// --- Exams -----------------------------------------------------------------
export function ExamsSection({ bundle }: { bundle: PortalBundle }) {
  const exams = bundle.marks.filter((m: any) => m.paper && m.paper.type === "exam");
  const overall = examStats(bundle);

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <h2 className="font-semibold">Exams</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {TERMS.map((term) => {
            const s = examStats(bundle, term);
            return (
              <div key={term} className="card">
                <p className="text-sm text-slate-500">{term}</p>
                <p className="mt-1 text-xl font-bold">{s.pct === null ? "-" : `${s.pct.toFixed(1)}%`}</p>
                <p className="text-sm text-slate-600">{s.pct === null ? "No marks yet" : `${s.obt} / ${s.tot} · Grade ${gradeOf(s.pct)}`}</p>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-slate-600">
          Overall: <b>{overall.pct === null ? "no exam marks yet" : `${overall.pct.toFixed(1)}% (${gradeOf(overall.pct)})`}</b>
          {overall.count > 0 && <> · {overall.count} paper{overall.count === 1 ? "" : "s"} marked</>}
        </p>
      </section>

      {TERMS.map((term) => <Marks key={term} title={`${term} marks`} rows={exams.filter((m: any) => m.paper.term === term)} />)}
    </div>
  );
}
