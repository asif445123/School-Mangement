import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
import { attachStudentToLogin, createStudentLogin, findLoginsForStudent, guardianLoginForEmail, linkedStudentIds, renameStudentLogin, unlinkStudent } from "@/lib/guardian";
import Account from "@/models/account";
import Entry from "@/models/entry";
import Fee from "@/models/fee";
import { syncOpening } from "@/lib/student-opening";
import { studentRights } from "@/lib/student-scope";

type Ctx = { params: Promise<{ resource: string; id: string }> };
// A teacher may only touch the students of the class (and section) he is class teacher of.
const ownStudent = (s: any, id: string) => s.cfg.model.findOne({ _id: id, school: s.schoolId }).lean();

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { resource, id } = await params;
  const s = await scope(resource, true);
  if (s.error) return s.error;
  if (resource === "fees" && s.user.role !== "school") return fail("Only the school can edit chalans", 403);
  const body = await req.json();
  delete body.school;
  if (resource === "students" && s.user.role !== "school") { delete body.previousPending; delete body.monthlyFee; delete body.discount; } // fees are set by the school only
  await connectDb();
  if (resource === "students" && s.user.role === "teacher") {
    const before: any = await ownStudent(s, id);
    const after = studentRights(s.user, { ...before, ...body });
    if (!before || !studentRights(s.user, before)?.own || !after?.own) return fail("You can only edit students of your own class and section", 403);
  }
  const email = String(body.loginEmail || "").toLowerCase().trim();
  // Guardian logins are shared by brothers / sisters (see lib/guardian):
  //  - the email already belongs to a sibling's login -> this child is
  //    attached to it (two old separate logins therefore MERGE into one);
  //  - a brand-new email on the only child of a login -> the login is renamed;
  //  - a brand-new email on one child of a SHARED login -> only this child is
  //    split onto his own new login, the guardian keeps the old login (and
  //    password) for the other children.
  let byEmail: any = null, current: any = null;
  if (resource === "students" && email) {
    const g = await guardianLoginForEmail(email, s.schoolId);
    if (g.conflict) return fail("Login email already in use", 409);
    byEmail = g.login;
    current = ((await findLoginsForStudent(id)) as any[])[0] || null;
    if (body.loginPassword && body.loginPassword.length < 6) return fail("Login password must be 6+ characters");
    if (!byEmail && !current && !body.loginPassword) return fail("Login password must be 6+ characters");
  }
  try {
    const item = await s.cfg.model.findOneAndUpdate({ _id: id, school: s.schoolId }, body, { new: true, runValidators: true });
    if (!item) return fail("Not found", 404);
    if (resource === "students") await syncOpening(item, s.schoolId);
    if (resource === "students" && email) {
      if (byEmail) await attachStudentToLogin(byEmail, item, body.loginPassword || undefined);
      else if (current && linkedStudentIds(current).length <= 1) await renameStudentLogin(current, item, email, body.loginPassword || undefined);
      else if (current) await createStudentLogin(item, email, body.loginPassword || undefined, s.schoolId, current); // split out of a shared guardian login
      else await createStudentLogin(item, email, body.loginPassword, s.schoolId);
    }
    return NextResponse.json({ item });
  } catch (e: any) { return fail(e.message); }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { resource, id } = await params;
  const s = await scope(resource, true);
  if (s.error) return s.error;
  if (resource === "fees" && s.user.role !== "school") return fail("Only the school can delete chalans", 403);
  await connectDb();
  if (resource === "students" && s.user.role === "teacher") {
    const row: any = await ownStudent(s, id);
    if (!row || !studentRights(s.user, row)?.own) return fail("You can only delete students of your own class and section", 403);
  }
  if (resource === "accountTypes" && (await Account.exists({ accountType: id, school: s.schoolId }))) return fail("This account type is used by accounts. Delete or change those accounts first.");
  if (resource === "accounts" && (await Entry.exists({ account: id, school: s.schoolId }))) return fail("This account has entries and cannot be deleted.");
  await s.cfg.model.findOneAndDelete({ _id: id, school: s.schoolId });
  // Unlink the student from his login; a guardian login shared with brothers /
  // sisters is only deleted when its last child is removed.
  if (resource === "students") { await unlinkStudent(id); await Fee.deleteMany({ student: id, month: "0000-00", paid: 0 }); }
  return NextResponse.json({ ok: true });
}
