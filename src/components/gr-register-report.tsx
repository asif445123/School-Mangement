"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { printElement } from "@/lib/print";
import { useSession } from "./session";

const dmy = (v?: string) => (v ? v.split("-").reverse().join("-") : "");
const label = "text-xs font-semibold text-slate-500";
const heads = ["G.R. No", "Date of admission", "Name of student", "Father's name & occupation", "Gender", "Date of birth", "Address", "Class admitted", "Previous school", "Date of leaving", "Class at leaving", "Reason for leaving", "Remarks"];

// The G.R. Register in register format, with filters and print
export default function GrRegisterReport() {
  const { user } = useSession();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cls, setCls] = useState("");
  const [status, setStatus] = useState("all");
  useEffect(() => { api("/api/grRegister").then((d) => setRows(d.items)).finally(() => setLoading(false)); }, []);

  const classes = [...new Set(rows.map((r) => r.admissionClass).filter(Boolean))].sort((a: any, b: any) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const list = useMemo(() => rows
    .filter((r) => (!from || (r.admissionDate || "") >= from) && (!to || (r.admissionDate || "9999") <= to) && (!cls || r.admissionClass === cls) && (status === "all" || (status === "left" ? !!r.leavingDate : !r.leavingDate)))
    .sort((a, b) => String(a.grNo).localeCompare(String(b.grNo), undefined, { numeric: true })), [rows, from, to, cls, status]);
  const title = `G.R. REGISTER${status === "present" ? " (Present Students)" : status === "left" ? " (Left Students)" : ""}`;

  if (loading) return <p className="text-slate-500">Loading...</p>;
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-4">
        <div><label className={label}>Admission from</label><input type="date" className="input mt-1 w-44" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className={label}>Admission to</label><input type="date" className="input mt-1 w-44" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div><label className={label}>Class admitted</label><select className="input mt-1 w-36" value={cls} onChange={(e) => setCls(e.target.value)}><option value="">All classes</option>{classes.map((c: any) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className={label}>Students</label><select className="input mt-1 w-36" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option><option value="present">Present</option><option value="left">Left</option></select></div>
        <button className="btn-light" onClick={() => printElement(title, document.getElementById("report-area"), user.schoolInfo, true)}>Print</button>
      </div>
      <div className="card overflow-x-auto p-0">
        <h2 className="p-4 text-sm font-bold">{title}</h2>
        <div id="report-area">
          <table className="w-full text-xs">
            <thead><tr>{heads.map((h) => <th key={h} className="th !bg-cyan-100">{h}</th>)}</tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id} className="border-t align-top">
                  <td className="td font-semibold">{r.grNo}</td><td className="td whitespace-nowrap">{dmy(r.admissionDate)}</td><td className="td">{r.name}</td>
                  <td className="td">{r.fatherName}{r.fatherOccupation ? <div className="text-slate-500">{r.fatherOccupation}</div> : null}</td>
                  <td className="td">{r.gender}</td><td className="td whitespace-nowrap">{dmy(r.dob)}</td><td className="td">{r.address}</td><td className="td">{r.admissionClass}</td>
                  <td className="td">{r.previousSchool}</td><td className="td whitespace-nowrap">{dmy(r.leavingDate)}</td><td className="td">{r.leavingClass}</td><td className="td">{r.leavingReason}</td><td className="td">{r.remarks}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={heads.length} className="td py-6 text-center text-slate-400">No register entries</td></tr>}
              <tr className="border-t-2 border-slate-400 bg-slate-50 font-bold"><td className="td" colSpan={heads.length}>Total Students: {list.length}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
