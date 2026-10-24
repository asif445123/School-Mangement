import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
import { attachStudentToLogin, createStudentLogin, guardianLoginForEmail, linkedStudentIds } from "@/lib/guardian";
import User from "@/models/user";
import { syncOpening } from "@/lib/student-opening";
import { studentRights, studentScopes } from "@/lib/student-scope";
import { nz } from "@/lib/teacher-scope";

type Ctx = { params: Promise<{ resource: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const s = await scope((await params).resource, false);
  if (s.error) return s.error;
  const filter: Record<string, any> = {};
  req.nextUrl.searchParams.forEach((v, k) => { if (!k.startsWith("$") && !k.includes(".") && k !== "school") filter[k] = v; });
  filter.school = s.schoolId;
  await connectDb();
  let q = s.cfg.model.find(filter).sort({ createdAt: -1 });
  if (s.cfg.populate) q = q.populate(s.cfg.populate);
  let items = await q.lean();
  if ((await params).resource === "fees") { // previous pending = unpaid balance of the student's earlier chalans
    const earlier = await s.cfg.model.find({ school: s.schoolId, student: { $in: items.map((i: any) => i.student?._id || i.student) } }).select("student month amount paid").lean();
    items = items.map((i: any) => {
      const sid = String(i.student?._id || i.student);
      const previous = earlier.filter((e: any) => String(e.student) === sid && e.month < i.month).reduce((a: number, e: any) => a + Math.max(0, e.amount - e.paid), 0);
      return { ...i, previous, actualFee: i.actualFee ?? i.amount, discount: i.discount ?? 0 };
    });
  }
  if ((await params).resource === "students") {
    // A guardian login is shared by all his / her children, so one login can
    // appear on several student rows. loginChildCount > 1 (with the names of
    // the brothers / sisters in loginSiblings) marks such a shared login.
    const ids = items.map((i: any) => i._id);
    const logins = await User.find({ school: s.schoolId, $or: [{ student: { $in: ids } }, { children: { $in: ids } }] }).select("student children email status").lean();
    const byStudent: Record<string, any> = {};
    const linked = new Set<string>();
    for (const u of logins as any[]) for (const sid of linkedStudentIds(u)) { linked.add(sid); byStudent[sid] ??= u; }
    const names: Record<string, string> = linked.size
      ? Object.fromEntries((await s.cfg.model.find({ _id: { $in: [...linked] }, school: s.schoolId }).select("name").lean()).map((r: any) => [String(r._id), r.name]))
      : {};
    items = items.map((i: any) => {
      const u = byStudent[String(i._id)];
      const kids = u ? linkedStudentIds(u) : [];
      return {
        ...i, loginEmail: u?.email || "", loginUserId: u?._id, loginStatus: u?.status || "",
        loginChildCount: kids.length,
        loginSiblings: kids.filter((k) => k !== String(i._id)).map((k) => names[k]).filter(Boolean),
      };
    });
  }
  if ((await params).resource === "students" && s.user.role === "teacher") {
    // A teacher only ever sees the classes (and sections) he is assigned to.
    // In the classes where he is only a subject teacher the list is reduced to a
    // class list - no phone, no admission data and no student login.
    items = items
      .map((i: any) => ({ ...i, own: studentRights(s.user, i)?.own === true }))
      .filter((i: any) => studentRights(s.user, i))
      .map((i: any) => {
        if (i.own) return i;
        const { phone, dob, admissionDate, loginEmail, loginUserId, loginStatus, loginChildCount, loginSiblings, ...rest } = i;
        return rest;
      });
  }
  if ((await params).resource === "students" && s.user.role !== "school") items = items.map(({ monthlyFee, discount, previousPending, ...rest }: any) => rest);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { resource } = await params;
  const s = await scope(resource, true);
  if (s.error) return s.error;
  if (resource === "fees" && s.user.role !== "school") return fail("Only the school can add chalans", 403);
  const body = await req.json();
  delete body.school;
  if (resource === "students" && s.user.role !== "school") { delete body.previousPending; delete body.monthlyFee; delete body.discount; } // fees are set by the school only
  await connectDb();
  // A teacher may only add a student to the class (and section) he is class teacher of.
  if (resource === "students" && s.user.role === "teacher") {
    if (!String(body.section || "").trim()) {
      const own = studentScopes(s.user).find((x) => x.own && nz(x.className) === nz(body.className) && x.section);
      if (own) body.section = own.section;
    }
    if (!studentRights(s.user, body)?.own) return fail("You can only add students to your own class and section", 403);
  }
  const email = String(body.loginEmail || "").toLowerCase().trim();
  // The same login email on a brother / sister is NOT an error: it is the
  // guardian's login, and the new child is attached to it so the guardian sees
  // every child in one portal. No password is needed for the extra children -
  // the guardian keeps the password set for the first child (typing one here
  // changes the guardian's password). An email owned by any other kind of
  // account stays a conflict.
  let guardian: any = null;
  if (resource === "students" && email) {
    const g = await guardianLoginForEmail(email, s.schoolId);
    if (g.conflict) return fail("Login email already in use", 409);
    guardian = g.login;
    if (body.loginPassword && body.loginPassword.length < 6) return fail("Login password must be 6+ characters");
    if (!guardian && !body.loginPassword) return fail("Login password must be 6+ characters");
  }
  try {
    const item = await s.cfg.model.create({ ...body, school: s.schoolId });
    if (resource === "students") await syncOpening(item, s.schoolId);
    if (resource === "students" && email) {
      if (guardian) await attachStudentToLogin(guardian, item, body.loginPassword || undefined);
      else await createStudentLogin(item, email, body.loginPassword, s.schoolId);
    }
    return NextResponse.json({ item });
  } catch (e: any) { return fail(e.code === 11000 ? "Duplicate entry" : e.message); }
}
