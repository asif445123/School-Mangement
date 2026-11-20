import { gradeOf } from "./api";
import { norm } from "./class-rows";

// School sessions offered in the exam form and the result pickers (e.g. 2025-2026).
// Two years back and two years forward cover a session already finished and the next one being planned.
export const sessionOptions = (): string[] => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => `${y - 2 + i}-${y - 1 + i}`);
};

// Old exam papers predate the pass percentage field - they keep the classic 33%.
export const DEFAULT_PASS_PERCENT = 33;
export const passPercent = (paper: any): number => {
  const n = Number(paper?.passPercentage);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PASS_PERCENT;
};
export const passMarks = (paper: any): number => ((Number(paper?.totalMarks) || 0) * passPercent(paper)) / 100;

export type SubjectResult = { paper: any; obtained: number; entered: boolean; required: number; pass: boolean };
export type StudentResult = {
  student: any; subjects: SubjectResult[]; obtained: number; total: number;
  pct: number; grade: string; passed: boolean; pos?: number;
};

// One exam event of a class: all exam papers of one session + term (+ section).
// This is what the "Exam" dropdown of Result & Card / Student Promotion offers,
// e.g. "Mid Term - Class1".
export type ExamGroup = { key: string; session: string; term: string; className: string; section: string; label: string; date: string; papers: any[] };
export const examGroups = (papers: any[]): ExamGroup[] => {
  const map = new Map<string, ExamGroup>();
  for (const p of papers) {
    const session = String(p.session || "").trim();
    const term = String(p.term || "").trim();
    const section = String(p.section || "").trim();
    const key = [session, term, norm(p.className), section].join("|");
    let g = map.get(key);
    if (!g) { g = { key, session, term, className: String(p.className), section, label: "", date: "", papers: [] }; map.set(key, g); }
    g.papers.push(p);
    if (String(p.date || "") > g.date) g.date = String(p.date || "");
  }
  return [...map.values()]
    .map((g) => ({ ...g, label: `${g.term || "Exam"} - ${g.className}${g.section ? " " + g.section : ""}` }))
    .sort((a, b) => b.date.localeCompare(a.date) || byClassName(a.className, b.className) || a.term.localeCompare(b.term));
};

// One student's result over the exam papers of a session: subject wise obtained
// marks, total, percentage, grade and pass / fail (pass = every subject passed).
export function studentResult(student: any, papers: any[], marks: any[]): StudentResult {
  const subjects: SubjectResult[] = papers.map((p) => {
    const m = marks.find((x) => String(x.paper?._id || x.paper) === String(p._id) && String(x.student?._id || x.student) === String(student._id));
    const obtained = m ? Number(m.obtained) || 0 : 0;
    const required = passMarks(p);
    return { paper: p, obtained, entered: !!m, required, pass: obtained >= required - 1e-9 };
  });
  const obtained = subjects.reduce((a, s) => a + s.obtained, 0);
  const total = papers.reduce((a, p) => a + (Number(p.totalMarks) || 0), 0);
  const pct = total > 0 ? (obtained / total) * 100 : 0;
  return {
    student, subjects, obtained, total, pct,
    grade: papers.length ? gradeOf(pct) : "-",
    passed: papers.length > 0 && subjects.every((s) => s.pass),
  };
}

// "5" -> "6", "Class 5" -> "Class 6", "9th" -> "10th"; null when the class name has no number.
export const nextClassName = (className: string): string | null => {
  const m = String(className || "").match(/^(.*?)(\d+)(.*)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}${m[3]}` : null;
};

// Numeric-first ordering used for class lists: 1, 2, ... 9, 10, 11
export const byClassName = (a: string, b: string) => String(a).localeCompare(String(b), undefined, { numeric: true });
