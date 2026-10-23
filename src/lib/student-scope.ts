import { assignmentsOf, nz, splitList } from "./teacher-scope";

// Which classes (and sections) a teacher may open on the Students page.
//   own = true  -> he is the CLASS TEACHER there, so he may add / edit / delete those students
//   own = false -> he only teaches a subject there, so the list is read-only
// A section left empty on the assignment means "every section of that class".
export type StudentScope = { className: string; section: string; own: boolean };

export function studentScopes(u: any): StudentScope[] {
  if (u?.role !== "teacher") return [];
  const out: StudentScope[] = [];
  for (const a of assignmentsOf(u)) {
    const own = a.teacherType === "Class teacher";
    for (const c of splitList(a.className)) {
      const found = out.find((x) => nz(x.className) === nz(c) && nz(x.section) === nz(a.section || ""));
      if (found) found.own = found.own || own;
      else out.push({ className: c, section: String(a.section || "").trim(), own });
    }
  }
  return out;
}

// distinct class names of a teacher, sorted the way a school reads them (1, 2, ... 9, 10)
export function scopeClasses(u: any): string[] {
  const out: string[] = [];
  for (const s of studentScopes(u)) if (!out.some((c) => nz(c) === nz(s.className))) out.push(s.className);
  return out.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

// Does this student belong to one of the teacher's classes? null = no.
// A student saved without a section stays visible to every teacher of that class
// (schools that do not use sections, and students added before this field existed).
export function studentRights(u: any, student: any): { own: boolean } | null {
  const rows = studentScopes(u).filter((s) => nz(s.className) === nz(student?.className));
  if (!rows.length) return null;
  const hits = rows.filter((s) => !s.section || !nz(student?.section) || nz(s.section) === nz(student.section));
  return hits.length ? { own: hits.some((s) => s.own) } : null;
}
