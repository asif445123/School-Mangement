"use client";
import { useMemo, useRef, useState } from "react";
import { FaPrint } from "react-icons/fa";
import { examGroups, studentResult } from "@/lib/results";
import { printElement, printResultCard, printResultCards } from "@/lib/print";
import { useExamData } from "@/lib/use-exam-data";
import { norm } from "@/lib/class-rows";
import { useSession } from "@/components/session";

const byRoll = (a: any, b: any) => (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0) || String(a.name).localeCompare(String(b.name));
const bySubject = (a: any, b: any) => String(a.subject).localeCompare(String(b.subject));

// Results -> Result & Card: pick an exam (one session + term + class), then see
// every student's position, subject wise marks, total, percentage, grade and
// Pass / Fail. Each row has a Card button, plus Print All Result Cards and a
// printable Result Sheet.
export default function ResultCardPage() {
  const { user } = useSession();
  const { papers, marks, students, reload } = useExamData(user);
  const groups = useMemo(() => examGroups(papers), [papers]);
  const [examKey, setExamKey] = useState("");
  const group = groups.find((g) => g.key === examKey) || groups[0];
  const sheetRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    if (!group) return [];
    const list = students
      .filter((s) => norm(s.className) === norm(group.className) && (!group.section || !s.section || norm(s.section) === norm(group.section)))
      .sort(byRoll);
    return list
      .map((s) => studentResult(s, group.papers.filter((p) => !p.section || !s.section || norm(p.section) === norm(s.section)), marks))
      .sort((a, b) => b.pct - a.pct || b.obtained - a.obtained || byRoll(a.student, b.student))
      .map((r, i) => ({ ...r, pos: i + 1 }));
  }, [group, students, marks]);

  const subjects = group ? [...group.papers].sort(bySubject) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Result & Card</h1>
          <p className="text-sm text-slate-500">Pick an exam to see the result of its class. Use Card for one student, or print every card / the result sheet.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Exam</label>
            <select className="input mt-1 w-52" value={group?.key || ""} onChange={(e) => setExamKey(e.target.value)}>
              {!groups.length && <option value="">No exam yet</option>}
              {groups.map((g) => <option key={g.key} value={g.key}>{g.label}{g.session ? ` · ${g.session}` : ""}</option>)}
            </select>
          </div>
          <button className="btn" onClick={reload}>Show Result</button>
          <button className="btn-light" disabled={!rows.length} onClick={() => printResultCards(rows, user.schoolInfo, group?.session || "")}><FaPrint className="mr-1 inline" />Print All Result Cards</button>
          <button className="btn-light" disabled={!rows.length} onClick={() => printElement(`Result Sheet - ${group?.label || ""}`, sheetRef.current, user.schoolInfo, true)}>Result Sheet</button>
        </div>
      </div>

      {!group ? (
        <div className="card p-8 text-center text-slate-500">
          No exam papers yet. Add them on the Exams page.
        </div>
      ) : (
        <>
          <h2 className="px-1 text-lg font-semibold">{group.label}{group.session ? ` · ${group.session}` : ""}</h2>
          <div className="card overflow-x-auto p-0" ref={sheetRef}>
            <table className="w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="th">Pos</th><th className="th">Roll #</th><th className="th">Name</th>
                  {subjects.map((p) => (
                    <th key={p._id} className="th">{p.subject}<br /><span className="text-xs font-normal text-slate-400">/ {p.totalMarks}</span></th>
                  ))}
                  <th className="th">Total</th><th className="th">%</th><th className="th">Grade</th><th className="th">Result</th><th className="th">Card</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.student._id} className="border-t">
                    <td className="td font-semibold">{r.pos}</td>
                    <td className="td">{r.student.rollNo}</td><td className="td font-medium">{r.student.name}</td>
                    {subjects.map((p) => {
                      const s = r.subjects.find((x) => x.paper._id === p._id);
                      return (
                        <td key={p._id} className="td">
                          {s && s.entered ? s.obtained : <span className="text-red-500">not entered</span>} <span className="text-slate-400">/ {p.totalMarks}</span>
                        </td>
                      );
                    })}
                    <td className="td font-semibold">{r.obtained} / {r.total}</td>
                    <td className="td">{r.pct.toFixed(1)}</td>
                    <td className="td">{r.grade}</td>
                    <td className="td"><span className={`rounded px-2 py-1 text-xs font-semibold ${r.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{r.passed ? "Pass" : "Fail"}</span></td>
                    <td className="td"><button className="icon-btn text-slate-600" title={`Print result card of ${r.student.name}`} onClick={() => printResultCard(r, user.schoolInfo, group.session)}><FaPrint /></button></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={subjects.length + 8} className="td py-8 text-center text-slate-400">No students in this class.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
