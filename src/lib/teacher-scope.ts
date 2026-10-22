import type { Field } from "./alerts";

export type Assignment = { teacherType?: string; className?: string; section?: string; subject?: string };
export const splitList = (s?: string) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

// A teacher has one main assignment (teacherType / className / section / subject on the account) plus optional extra ones.
export const assignmentsOf = (u: any): Assignment[] =>
  [{ teacherType: u?.teacherType, className: u?.className, section: u?.section, subject: u?.subject }, ...(u?.assignments || [])].filter((a) => a.teacherType || a.className || a.subject);

// The class a teacher is "Class teacher" of (any of his assignments)
export const classTeacherAssignment = (u: any) => (u?.role === "teacher" ? assignmentsOf(u).find((a) => a.teacherType === "Class teacher" && a.className) : undefined);

// Names are compared without caring about capital letters or extra spaces ("9th " = "9TH")
export const nz = (s: any) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

// Every class (with its section) a teacher is class teacher of; "5, 6" counts as two classes
export const classTeacherClasses = (u: any): { className: string; section: string }[] =>
  u?.role === "teacher" ? assignmentsOf(u).filter((a) => a.teacherType === "Class teacher" && a.className).flatMap((a) => splitList(a.className).map((c) => ({ className: c, section: a.section || "" }))) : [];

// Does this assignment teach in the class of the class teacher `ct`? No section on either side matches every section.
const inClass = (a: any, ct: { className?: string; section?: string }) =>
  splitList(a?.className).some((c) => nz(c) === nz(ct.className)) && (!nz(a?.section) || !nz(ct.section) || nz(a.section) === nz(ct.section));

// Where a teacher is a SUBJECT teacher of the given class: -1 = no, 0 = main assignment, n = extra assignment n-1 (used for managing him)
export function subjectMatch(t: any, ct: { className?: string; section?: string }): number {
  const same = (a: any) => a?.teacherType === "Subject teacher" && inClass(a, ct);
  if (same({ teacherType: t.teacherType, className: t.className, section: t.section })) return 0;
  const i = (t.assignments || []).findIndex(same);
  return i >= 0 ? i + 1 : -1;
}

// Same, for ANY teacher who teaches a subject in that class (whatever his type): used to show him in the status tables
export function anyMatch(t: any, ct: { className?: string; section?: string }): number {
  const same = (a: any) => !!splitList(a?.subject).length && inClass(a, ct);
  if (same({ className: t.className, section: t.section, subject: t.subject })) return 0;
  const i = (t.assignments || []).findIndex(same);
  return i >= 0 ? i + 1 : -1;
}

// Same class, section, subject and type (ignoring capitals and spaces)
export const sameAssignment = (a: Assignment, b: Assignment) =>
  nz(a.teacherType) === nz(b.teacherType) && nz(a.className) === nz(b.className) && nz(a.section) === nz(b.section) && nz(a.subject) === nz(b.subject);

export const cleanAssignments = (x: any) => (Array.isArray(x) ? x.slice(0, 10).map((a: any) => ({
  teacherType: ["Class teacher", "Subject teacher"].includes(a?.teacherType) ? a.teacherType : "Subject teacher",
  className: String(a?.className || "").trim(), section: String(a?.section || "").trim(), subject: String(a?.subject || "").trim(),
})).filter((a: any) => a.className || a.subject) : []);

// Diary / paper popups: a teacher's class and subject come from the account the school created.
// One class+subject -> no field (added automatically); several -> one dropdown; none set -> text boxes.
export function classSubjectFields(user: any) {
  const teacher = user.role === "teacher";
  const options: { label: string; className: string; section: string; subject: string }[] = [];
  if (teacher) for (const a of assignmentsOf(user)) for (const c of splitList(a.className)) for (const s of splitList(a.subject)) {
    const label = `${c}${a.section ? " " + a.section : ""} - ${s}`;
    if (!options.some((o) => o.label === label)) options.push({ label, className: c, section: a.section || "", subject: s });
  }
  const fields: Field[] = [], extra: any = {};
  let transform = (v: any, _isNew: boolean) => v;
  if (teacher && options.length === 1) { extra.className = options[0].className; extra.subject = options[0].subject; extra.section = options[0].section; }
  else if (teacher && options.length > 1) {
    fields.push({ name: "assignment", label: "Class - Subject", type: "select", options: options.map((o) => o.label) });
    transform = (v: any, isNew: boolean) => {
      const { assignment, ...rest } = v, o = options.find((x) => x.label === assignment);
      return isNew && o ? { ...rest, className: o.className, section: o.section, subject: o.subject } : rest;
    };
  } else fields.push({ name: "className", label: "Class", required: true }, { name: "subject", label: "Subject", required: true });
  // when editing an existing row a teacher is not asked again
  return { classSubject: fields, editClassSubject: teacher && options.length ? [] : fields, extra, transform };
}
