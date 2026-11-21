"use client";
import { useEffect, useMemo, useState } from "react";
import { api, gradeOf } from "@/lib/api";
import { studentRights } from "@/lib/student-scope";
import { useSession } from "./session";

// Result Report for one paper kind: "test" (Test Report) or "exam"
// (Exams Report). Pick a paper of that kind, then see every student's
// position, obtained marks, percentage and grade (same table that used to
// live as the single "Result report" tab inside Reports).
export default function ResultReport({ type }: { type: "test" | "exam" }) {
  const { user } = useSession();
  const isTeacher = user?.role === "teacher";
  const [papers, setPapers] = useState<any[]>([]);
  const [paperId, setPaperId] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => { api("/api/papers").then((d) => setPapers(d.items)).catch(() => setPapers([])); }, []);

  // Only papers of this kind; a teacher only sees papers of his own classes.
  const shown = useMemo(() => {
    const ofKind = papers.filter((p) => (p.type || "test") === type);
    return isTeacher
      ? ofKind.filter((p: any) => studentRights(user, { className: p.className, section: p.section }))
      : ofKind;
  }, [papers, type, isTeacher, user]);

  const paper = shown.find((p) => p._id === paperId);

  useEffect(() => { setPaperId(""); setResults([]); }, [type]);
  useEffect(() => {
    if (!paper) return setResults([]);
    Promise.all([api(`/api/students?className=${encodeURIComponent(paper.className)}`), api(`/api/marks?paper=${paper._id}`)]).then(([st, mk]) => {
      const byStudent = Object.fromEntries(mk.items.map((m: any) => [m.student, m.obtained]));
      const rows = st.items.filter((s: any) => byStudent[s._id] !== undefined).map((s: any) => ({ ...s, obtained: byStudent[s._id], pct: paper.totalMarks ? (byStudent[s._id] / paper.totalMarks) * 100 : 0 }));
      setResults(rows.sort((a: any, b: any) => b.obtained - a.obtained));
    }).catch(() => setResults([]));
  }, [paperId]); // eslint-disable-line

  const passed = results.filter((r) => r.pct >= 40).length;
  const kindLabel = type === "test" ? "test" : "exam";

  return (
    <div className="space-y-4">
      <select className="input w-full sm:w-72" value={paperId} onChange={(e) => setPaperId(e.target.value)}>
        <option value="">Select {kindLabel} paper</option>
        {shown.map((p) => <option key={p._id} value={p._id}>{p.title} - Class {p.className}</option>)}
      </select>
      {!shown.length && <p className="text-sm text-slate-400">No {kindLabel} papers yet. Add them on the {type === "test" ? "Tests" : "Exams"} page.</p>}
      {paper && (
        <div className="card overflow-x-auto p-0">
          <p className="p-4 text-sm text-slate-600">Appeared: {results.length} · Passed: {passed} · Failed: {results.length - passed} · Pass mark: 40%</p>
          <table className="w-full min-w-[600px]"><thead><tr>{["Position", "Roll #", "Student", "Obtained", "%", "Grade"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{results.map((r, i) => <tr key={r._id} className="border-t"><td className="td">{i + 1}</td><td className="td">{r.rollNo}</td><td className="td">{r.name}</td><td className="td">{r.obtained}/{paper.totalMarks}</td><td className="td">{r.pct.toFixed(1)}%</td><td className="td font-semibold">{gradeOf(r.pct)}</td></tr>)}
              {!results.length && <tr><td colSpan={6} className="td py-6 text-center text-slate-400">No marks entered for this paper yet</td></tr>}</tbody></table>
        </div>
      )}
    </div>
  );
}
