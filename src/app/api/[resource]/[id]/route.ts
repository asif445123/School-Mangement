import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
import User from "@/models/user";
import Account from "@/models/account";
import Entry from "@/models/entry";
import Fee from "@/models/fee";
import { syncOpening } from "@/lib/student-opening";

type Ctx = { params: Promise<{ resource: string; id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { resource, id } = await params;
  const s = await scope(resource, true);
  if (s.error) return s.error;
  if (resource === "fees" && s.user.role !== "school") return fail("Only the school can edit chalans", 403);
  const body = await req.json();
  delete body.school;
  if (resource === "students" && s.user.role !== "school") { delete body.previousPending; delete body.monthlyFee; delete body.discount; } // fees are set by the school only
  await connectDb();
  const email = String(body.loginEmail || "").toLowerCase().trim();
  let login: any = null;
  if (resource === "students" && email) {
    login = await User.findOne({ student: id });
    const taken = await User.findOne({ email });
    if (taken && String(taken._id) !== String(login?._id)) return fail("Login email already in use", 409);
    if ((!login || body.loginPassword) && (!body.loginPassword || body.loginPassword.length < 6)) return fail("Login password must be 6+ characters");
  }
  try {
    const item = await s.cfg.model.findOneAndUpdate({ _id: id, school: s.schoolId }, body, { new: true, runValidators: true });
    if (!item) return fail("Not found", 404);
    if (resource === "students") await syncOpening(item, s.schoolId);
    if (resource === "students" && email) {
      if (!login) await User.create({ name: item.name, email, phone: item.phone || "", password: await bcrypt.hash(body.loginPassword, 10), role: "student", status: "approved", school: s.schoolId, student: item._id });
      else {
        login.email = email; login.name = item.name;
        if (body.loginPassword) login.password = await bcrypt.hash(body.loginPassword, 10);
        await login.save();
      }
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
  if (resource === "accountTypes" && (await Account.exists({ accountType: id, school: s.schoolId }))) return fail("This account type is used by accounts. Delete or change those accounts first.");
  if (resource === "accounts" && (await Entry.exists({ account: id, school: s.schoolId }))) return fail("This account has entries and cannot be deleted.");
  await s.cfg.model.findOneAndDelete({ _id: id, school: s.schoolId });
  if (resource === "students") { await User.deleteMany({ student: id }); await Fee.deleteMany({ student: id, month: "0000-00", paid: 0 }); } // remove the student's login too
  return NextResponse.json({ ok: true });
}
