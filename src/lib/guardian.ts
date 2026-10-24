import bcrypt from "bcryptjs";
import User from "@/models/user";

// ---------------------------------------------------------------------------
// Guardian (parent) logins: ONE student-role login may belong to a guardian
// who has several children (brothers / sisters) in the same school. The login
// is linked to every child, so the guardian opens ONE portal (/my) and sees
// the daily diary, fee chalans, tests and exam marks of ALL of them.
//
// How a child gets linked: the school (or class teacher) enters the SAME
// login email on each brother / sister in the Students form. The first child
// creates the login; every later child with that email is attached to it
// instead of failing with "email already in use". Nothing is ever linked by
// phone or father name alone - only the email the school typed - so one
// family can never see another family's children by accident.
//
// Old data needs no migration: logins created before this existed only have
// `student` set and an empty `children` array. linkedStudentIds() treats the
// two fields as one list, and setLinkedStudentIds() keeps `student` pointing
// at the first child so older code keeps working.
// ---------------------------------------------------------------------------

// Every student id this login may see, de-duplicated, first child first.
export function linkedStudentIds(u: any): string[] {
  const out: string[] = [];
  const push = (v: any) => { const s = v ? String(v._id || v) : ""; if (s && !out.includes(s)) out.push(s); };
  push(u?.student);
  (u?.children || []).forEach(push);
  return out;
}

// Replace the linked students and keep `student` = the first of them.
export function setLinkedStudentIds(u: any, ids: string[]): string[] {
  const clean = [...new Set(ids.map((x) => String(x || "")).filter(Boolean))];
  u.children = clean;
  u.student = clean[0] || undefined;
  if (typeof u.markModified === "function") u.markModified("children");
  return clean;
}

const norm = (v: any) => String(v || "").trim().toLowerCase();

// Does a class-level record (diary entry / paper) belong to this student?
// Same class, and the section must match when both sides have one - a diary
// written for section B is not shown to a section A child, while students or
// entries saved without a section (schools that do not use sections) match.
export function belongsToStudentClass(item: any, student: any): boolean {
  return norm(item?.className) === norm(student?.className)
    && (!norm(item?.section) || !norm(student?.section) || norm(item?.section) === norm(student?.section));
}

export function feeTotals(fees: any[]) {
  const total = (fees || []).reduce((a, f) => a + (Number(f.amount) || 0), 0);
  const paid = (fees || []).reduce((a, f) => a + (Number(f.paid) || 0), 0);
  return { total, paid, balance: total - paid };
}

// The login that owns an email, if it may be used as a guardian login of this
// school. An email owned by any other account (a teacher, another school, ...)
// is a conflict and must never be linked or leaked.
export async function guardianLoginForEmail(email: string, schoolId: any): Promise<{ login: any | null; conflict: boolean }> {
  if (!email) return { login: null, conflict: false };
  const u: any = await User.findOne({ email });
  if (!u) return { login: null, conflict: false };
  const ok = u.role === "student" && String(u.school || "") === String(schoolId || "");
  return { login: ok ? u : null, conflict: !ok };
}

// Every login currently linked to a student (normally one).
export const findLoginsForStudent = (studentId: any) =>
  User.find({ $or: [{ student: studentId }, { children: studentId }] });

// Remove a student from every login (except `exceptUserId`). A login is only
// deleted when it has no children left - deleting one brother must never lock
// the guardian (and his other children) out of the portal.
export async function unlinkStudent(studentId: any, exceptUserId?: any) {
  const id = String(studentId || "");
  if (!id) return;
  for (const u of await findLoginsForStudent(studentId) as any[]) {
    if (exceptUserId && String(u._id) === String(exceptUserId)) continue;
    const rest = linkedStudentIds(u).filter((x) => x !== id);
    if (!rest.length) await User.findByIdAndDelete(u._id);
    else { setLinkedStudentIds(u, rest); await u.save(); }
  }
}

// Attach a student to an existing guardian login (a brother / sister was given
// the same login email). The guardian's password is kept unless a new one was
// typed, and the student is detached from any previous separate login, so two
// old logins MERGE into the guardian's one.
export async function attachStudentToLogin(login: any, student: any, password?: string) {
  const ids = linkedStudentIds(login);
  if (!ids.includes(String(student._id))) ids.push(String(student._id));
  setLinkedStudentIds(login, ids);
  // with more than one child the account belongs to the guardian, so show his
  // name in the portal header; a single-child login keeps the student's name
  if (ids.length > 1 && student.fatherName) login.name = student.fatherName;
  else if (ids.length === 1) login.name = student.name;
  if (!login.phone && student.phone) login.phone = student.phone;
  if (password) login.password = await bcrypt.hash(password, 10);
  await login.save();
  await unlinkStudent(student._id, login._id);
  return login;
}

// Rename a login that belongs to this student alone (new email, and a new
// password when one was typed).
export async function renameStudentLogin(login: any, student: any, email: string, password?: string) {
  login.email = email;
  login.name = student.name;
  setLinkedStudentIds(login, [String(student._id)]);
  if (password) login.password = await bcrypt.hash(password, 10);
  await login.save();
  await unlinkStudent(student._id, login._id);
  return login;
}

// Create a fresh login for one student. `inherit` (the login the child is
// being split out of) lets the new login keep the same password hash and
// approval status when no new password was typed, so nobody is locked out.
export async function createStudentLogin(student: any, email: string, password: string | undefined, schoolId: any, inherit?: any) {
  const u = await User.create({
    name: student.name, email, phone: student.phone || inherit?.phone || "",
    password: password ? await bcrypt.hash(password, 10) : inherit?.password,
    role: "student", status: inherit?.status || "approved",
    school: schoolId, student: student._id, children: [student._id],
  });
  await unlinkStudent(student._id, (u as any)._id);
  return u;
}
