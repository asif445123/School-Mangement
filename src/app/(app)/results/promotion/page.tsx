"use client";
import { useEffect, useMemo, useState } from "react";
import { FaArrowUp } from "react-icons/fa";
import { api } from "@/lib/api";
import { Swal, toast } from "@/lib/alerts";
import { examGroups, nextClassName, sessionOptions, studentResult } from "@/lib/results";
import { useExamData } from "@/lib/use-exam-data";
import { norm } from "@/lib/class-rows";
import { useSession } from "@/components/session";

const byRoll = (a: any, b: any) => (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0) || String(a.name).localeCompare(String(b.name));
const byName = (a: string, b: string) => String(a).localeCompare(String(b), undefined, { numeric: true });

// Results -> Student Promotion: pick a class, section and exam, then move the
// students (all, or only those who passed) to the next class, with a new section
// and session. Promotion changes the student's class, so it is a school tool.
export default function StudentPromotion() {
  const { user } = useSession();
  const { papers, marks, students, classes, reload } = useExamData(user);
  const groups = useMemo(() => examGroups(papers), [papers]);
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [examKey, setExamKey] = useState("");
  const [filter, setFilter] = useState<"all" | "passed">("all");
  const [target, setTarget] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newSession, setNewSession] = useState(sessionOptions()[2] || "");
  const [picked, setPicked] = useState<string[]>([]);

  const current = classes.includes(className) ? className : classes[0] || "";
  const sections = useMemo(
    () => [...new Set(students.filter((s) => norm(s.className) === norm(current)).map((s) => String(s.section || "").trim()).filter(Boolean))].sort(),
    [students, current],
  );
  const chosen = sections.includes(section) ? section : sections[0] || "";

  // the exams of this class / section (latest first)
  const classGroups = groups.filter((g) => norm(g.className) === norm(current) && (!g.section || !chosen || norm(g.section) === norm(chosen)));
  const group = classGroups.find((g) => g.key === examKey) || classGroups[0];

  const rows = useMemo(() => {
    if (!group) return [];
    const list = students
      .filter((s) => norm(s.className) === norm(current) && (!chosen || !s.section || norm(s.section) === norm(chosen)))
      .sort(byRoll);
    const out = list.map((s) => studentResult(s, group.papers.filter((p) => !p.section || !s.section || norm(p.section) === norm(s.section)), marks));
    return filter === "passed" ? out.filter((r) => r.passed) : out;
  }, [group, students, marks, current, chosen, filter]);

  // next class is the obvious target; classes with no students yet are offered too
  const next = nextClassName(current);
  const targets = useMemo(() => {
    const set = new Set(classes);
    if (next) set.add(next);
    return [...set].sort(byName);
  }, [classes, next]);
  useEffect(() => { if (!targets.includes(target)) setTarget(targets.includes(next || "") ? next || "" : ""); }, [targets]); // eslint-disable-line
  useEffect(() => { setNewSection(chosen); }, [chosen]); // eslint-disable-line

  const sessionList = useMemo(() => {
    const set = new Set(sessionOptions());
    if (group?.session) set.add(group.session);
    return [...set].sort().reverse();
  }, [group]);

  const chosenRows = rows.filter((r) => picked.includes(r.student._id));

  function toggle(id: string, on: boolean) {
    setPicked(on ? [...picked, id] : picked.filter((x) => x !== id));
  }

  async function promote(list: typeof rows) {
    if (!list.length) return;
    if (!target) return toast("error", "Choose the class to promote to");
    const res = await Swal.fire({
      title: "Promote students?",
      html: `<p style="text-align:left;font-size:14px">Move <b>${list.length}</b> student(s) from class <b>${current}</b> to class <b>${target}</b> (section ${newSection || "-"}, session ${newSession || "-"}).</p>`,
      icon: "question", showCancelButton: true, confirmButtonText: "Yes, promote", confirmButtonColor: "#2563eb", width: 440,
    });
    if (!res.isConfirmed) return;
    try {
      await Promise.all(list.map((r) => api(`/api/students/${r.student._id}`, { method: "PUT", body: { className: target, section: newSection, session: newSession } })));
      toast("success", `${list.length} student(s) promoted to ${target}`);
      setPicked([]);
      await reload();
    } catch (e: any) { toast("error", e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Student Promotion</h1>
          <p className="text-sm text-slate-500">Move the students of a class to the next class in the new session. Tick the students and promote them.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Class</label>
            <select className="input mt-1 w-28" value={current} onChange={(e) => { setClassName(e.target.value); setSection(""); setPicked([]); setTarget(""); }}>
              {!classes.length && <option value="">-</option>}
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Section</label>
            <select className="input mt-1 w-28" value={chosen} onChange={(e) => { setSection(e.target.value); setPicked([]); }}>
              {!sections.length ? <option value="">No section</option> : sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Exam</label>
            <select className="input mt-1 w-48" value={group?.key || ""} onChange={(e) => setExamKey(e.target.value)}>
              {!classGroups.length && <option value="">No exam yet</option>}
              {classGroups.map((g) => <option key={g.key} value={g.key}>{g.label}{g.session ? ` · ${g.session}` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Students</label>
            <select className="input mt-1 w-44" value={filter} onChange={(e) => { setFilter(e.target.value as any); setPicked([]); }}>
              <option value="all">All students</option>
              <option value="passed">Only pass students (as per exam)</option>
            </select>
          </div>
          <button className="btn-light" onClick={reload}>Load</button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs font-semibold text-slate-500">Promote to Class</label>
          <select className="input mt-1 w-32" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Select class</option>
            {targets.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">New Section</label>
          <select className="input mt-1 w-28" value={newSection} onChange={(e) => setNewSection(e.target.value)}>
            {!sections.length ? <option value="">No section</option> : sections.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">New Session</label>
          <select className="input mt-1 w-32" value={newSession} onChange={(e) => setNewSession(e.target.value)}>
            {sessionList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn" disabled={!chosenRows.length || !target} onClick={() => promote(chosenRows)}>Promote Selected ({chosenRows.length})</button>
      </div>

      {!group ? (
        <div className="card p-8 text-center text-slate-500">
          No exam papers for class {current || "-"} yet. Add them on the Exams page.
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr><th className="th w-10"></th><th className="th">Roll #</th><th className="th">Name</th><th className="th">Section</th><th className="th">Result</th><th className="th">Promote</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student._id} className="border-t">
                  <td className="td"><input type="checkbox" checked={picked.includes(r.student._id)} onChange={(e) => toggle(r.student._id, e.target.checked)} /></td>
                  <td className="td">{r.student.rollNo}</td><td className="td font-medium">{r.student.name}</td>
                  <td className="td">{r.student.section || "-"}</td>
                  <td className="td"><span className={`rounded px-2 py-1 text-xs font-semibold ${r.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{r.passed ? "Pass" : "Fail"}</span></td>
                  <td className="td">
                    <button className="icon-btn text-emerald-600" title={target ? `Promote ${r.student.name} to ${target}` : "Choose the class to promote to first"} onClick={() => promote([r])}>
                      <FaArrowUp />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="td py-8 text-center text-slate-400">No students in this class.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
