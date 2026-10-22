"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { feePayments, n } from "@/lib/accounting";
import { printElement } from "@/lib/print";
import { useSession } from "./session";

const MONTHS = ["APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR"]; // academic year runs April - March
const startYearNow = () => { const d = new Date(); return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; };
const label = "text-xs font-semibold text-slate-500";

// Month wise fees receivable detail: one row per student, opening balance + a column for each month of the academic year
export default function FeeMonthReport() {
  const { user } = useSession();
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(startYearNow());
  const [cls, setCls] = useState("");
  const [who, setWho] = useState("present");
  const [mode, setMode] = useState("receivable");
  const [grMap, setGrMap] = useState<Record<string, string>>({}); // student id -> G.R. No

  useEffect(() => { Promise.all([api("/api/students"), api("/api/fees"), api("/api/grRegister")]).then(([s, f, g]) => { setStudents(s.items); setFees(f.items); setGrMap(Object.fromEntries(g.items.filter((x: any) => x.student).map((x: any) => [x.student, x.grNo]))); }).finally(() => setLoading(false)); }, []);

  const keys = MONTHS.map((_, i) => (i < 9 ? `${year}-${String(i + 4).padStart(2, "0")}` : `${year + 1}-${String(i - 8).padStart(2, "0")}`));
  const classes = [...new Set(students.map((s) => s.className).filter(Boolean))].sort((a: any, b: any) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const receivable = mode === "receivable";

  const { rows, totals } = useMemo(() => {
    const byStudent = new Map<string, any[]>();
    fees.forEach((f) => { const id = String(f.student?._id || f.student); byStudent.set(id, [...(byStudent.get(id) || []), f]); });
    const list = students
      .filter((s) => (!cls || s.className === cls) && (who === "all" || (who === "left" ? !!s.leftDate : !s.leftDate)))
      .sort((a, b) => String(a.className).localeCompare(String(b.className), undefined, { numeric: true }) || Number(a.rollNo) - Number(b.rollNo))
      .map((s) => {
        const sf = byStudent.get(s._id) || [], pays = feePayments(sf);
        const fee = keys.map((k) => sf.find((f) => f.month === k)?.amount || 0);
        const got = keys.map((k) => pays.filter((p) => p.date.startsWith(k)).reduce((a, p) => a + p.amount, 0));
        // opening = fees billed before the year minus money received before the year
        const opening = Math.max(0, sf.filter((f) => f.month < keys[0]).reduce((a, f) => a + f.amount, 0) - pays.filter((p) => p.date < `${keys[0]}-01`).reduce((a, p) => a + p.amount, 0));
        const months = receivable ? fee : got;
        return { s, opening: receivable ? opening : 0, months, total: (receivable ? opening : 0) + months.reduce((a, v) => a + v, 0) };
      });
    return { rows: list, totals: { opening: list.reduce((a, r) => a + r.opening, 0), total: list.reduce((a, r) => a + r.total, 0), months: keys.map((_, i) => list.reduce((a, r) => a + r.months[i], 0)) } };
  }, [students, fees, cls, who, mode, year]); // eslint-disable-line

  const heading = `MONTH WISE FEES ${receivable ? "RECEIVABLE" : "RECEIVED"} DETAIL FOR THE ACADEMIC YEAR ${year}-${String(year + 1).slice(2)} { ${who === "present" ? "Present" : who === "left" ? "Left" : "All"} Students }`;
  const who2 = (s: any) => (s.fatherName ? `${s.name} ${s.gender === "Female" ? "D/o" : "S/o"} ${s.fatherName}` : s.name);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-4">
        <div><label className={label}>Academic year starts (April)</label><input type="number" className="input mt-1 w-36" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div><label className={label}>Class</label><select className="input mt-1 w-36" value={cls} onChange={(e) => setCls(e.target.value)}><option value="">All classes</option>{classes.map((c: any) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className={label}>Students</label><select className="input mt-1 w-36" value={who} onChange={(e) => setWho(e.target.value)}><option value="present">Present</option><option value="left">Left</option><option value="all">All</option></select></div>
        <div><label className={label}>Show</label><select className="input mt-1 w-40" value={mode} onChange={(e) => setMode(e.target.value)}><option value="receivable">Fee receivable</option><option value="received">Fee received</option></select></div>
        <button className="btn-light" onClick={() => printElement(heading, document.getElementById("report-area"), user.schoolInfo)}>Print</button>
      </div>
      <div className="card overflow-x-auto p-0">
        <h2 className="p-4 text-sm font-bold">{heading}</h2>
        <div id="report-area">
          <table className="w-full min-w-[600px] text-xs">
            <thead><tr className="bg-cyan-100">
              {["Class", "G.R. No", "Roll No", "Student Name", "Total", ...(receivable ? ["Opening"] : []), ...MONTHS].map((h) => <th key={h} className={`th !bg-cyan-100 ${["Class", "G.R. No", "Roll No", "Student Name"].includes(h) ? "" : "text-right"}`}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(({ s, opening, months, total }) => (
                <tr key={s._id} className="border-t">
                  <td className="td whitespace-nowrap">{s.className}</td><td className="td">{grMap[s._id] || "-"}</td><td className="td">{s.rollNo || "-"}</td><td className="td whitespace-nowrap">{who2(s)}</td>
                  <td className="td text-right font-semibold">{n(total)}</td>{receivable && <td className="td text-right">{n(opening)}</td>}
                  {months.map((v: number, i: number) => <td key={i} className="td text-right">{n(v)}</td>)}
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={17} className="td py-6 text-center text-slate-400">No students found</td></tr>}
              <tr className="border-t-2 border-slate-400 bg-slate-50 font-bold">
                <td className="td" colSpan={3}>Total Students: {rows.length}</td><td className="td text-right">Total:</td>
                <td className="td text-right">{n(totals.total)}</td>{receivable && <td className="td text-right">{n(totals.opening)}</td>}
                {totals.months.map((v: number, i: number) => <td key={i} className="td text-right">{n(v)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
