import { assignmentsOf, nz, splitList } from "./teacher-scope";

export type ClassRow = { key: string; className: string; section: string; classTeachers: string[]; subjects: { name: string; teachers: string[] }[] };
export const norm = nz;

function addSubjects(row: ClassRow, subjects: { name: string; teachers: string[] }[]) {
  for (const s of subjects) {
    const sub = row.subjects.find((x) => norm(x.name) === norm(s.name));
    if (!sub) row.subjects.push({ name: s.name, teachers: [...s.teachers] });
    else for (const t of s.teachers) if (!sub.teachers.includes(t)) sub.teachers.push(t);
  }
}

// Classes, their class teacher and the subjects to be filled, built from the teachers' assignments
export function buildClasses(teachers: any[]): ClassRow[] {
  const map = new Map<string, ClassRow>();
  for (const t of teachers) for (const a of assignmentsOf(t)) for (const c of splitList(a.className)) {
    const key = `${norm(c)}|${norm(a.section)}`;
    const row = map.get(key) || { key, className: c, section: String(a.section || "").trim(), classTeachers: [], subjects: [] };
    if (a.teacherType === "Class teacher" && !row.classTeachers.includes(t.name)) row.classTeachers.push(t.name);
    addSubjects(row, splitList(a.subject).map((s) => ({ name: s, teachers: [t.name] })));
    map.set(key, row);
  }
  // a teacher entered without a section teaches every section of that class
  for (const blank of [...map.values()].filter((r) => !r.section)) {
    const sectioned = [...map.values()].filter((r) => r.section && norm(r.className) === norm(blank.className));
    if (!sectioned.length) continue;
    for (const r of sectioned) {
      addSubjects(r, blank.subjects);
      for (const n of blank.classTeachers) if (!r.classTeachers.includes(n)) r.classTeachers.push(n);
    }
    map.delete(blank.key);
  }
  return [...map.values()].sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || a.section.localeCompare(b.section));
}
