import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
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
    const logins = await User.find({ student: { $in: items.map((i: any) => i._id) } }).select("student email status").lean();
    const byStudent = Object.fromEntries(logins.map((u: any) => [String(u.student), u]));
    items = items.map((i: any) => ({ ...i, loginEmail: byStudent[String(i._id)]?.email || "", loginUserId: byStudent[String(i._id)]?._id, loginStatus: byStudent[String(i._id)]?.status || "" }));
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
        const { phone, dob, admissionDate, loginEmail, loginUserId, loginStatus, ...rest } = i;
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
  if (resource === "students" && email) {
    if (!body.loginPassword || body.loginPassword.length < 6) return fail("Login password must be 6+ characters");
    if (await User.findOne({ email })) return fail("Login email already in use", 409);
  }
  try {
    const item = await s.cfg.model.create({ ...body, school: s.schoolId });
    if (resource === "students") await syncOpening(item, s.schoolId);
    if (resource === "students" && email) {
      await User.create({ name: item.name, email, phone: item.phone || "", password: await bcrypt.hash(body.loginPassword, 10), role: "student", status: "approved", school: s.schoolId, student: item._id });
    }
    return NextResponse.json({ item });
  } catch (e: any) { return fail(e.code === 11000 ? "Duplicate entry" : e.message); }
}
