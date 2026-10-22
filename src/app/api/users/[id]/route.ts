import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser } from "@/lib/auth";
import User from "@/models/user";
import Student from "@/models/student";
import Fee from "@/models/fee";
import Diary from "@/models/diary";
import Paper from "@/models/paper";
import Mark from "@/models/mark";
import Timetable from "@/models/timetable";
import { classTeacherAssignment, classTeacherClasses, cleanAssignments, periodNumber, subjectMatch } from "@/lib/teacher-scope";

type Ctx = { params: Promise<{ id: string }> };

async function guard(id: string): Promise<any> {
  const me = await getSessionUser();
  const ct: any = classTeacherAssignment(me);
  const cts = classTeacherClasses(me);
  if (!me || !(["admin", "school"].includes(me.role) || ct)) return { error: fail("Access denied", 403) };
  if (String(me._id) === id) return { error: fail("You cannot change your own account here") };
  await connectDb();
  const t = await User.findById(id);
  const ok = t && (me.role === "admin" ? t.role === "school"
    : me.role === "school" ? String(t.school) === String(me._id) && ["teacher", "student"].includes(t.role)
    : String(t.school) === String(me.school) && t.role === "teacher" && cts.some((c) => subjectMatch(t, c) >= 0));
  return ok ? { target: t, ct: cts.find((c) => subjectMatch(t, c) >= 0), classTeacher: me.role === "teacher" } : { error: fail("Not found", 404) };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const g = await guard((await params).id); if (g.error) return g.error;
  const { status, password, name, teacherType, email, phone, className, section, subject, period, extras } = await req.json();
  const t = g.target;
  if (period !== undefined && period !== "" && !periodNumber(period)) return fail("Period must be from 1 to 8");
  if (password !== undefined) { // reset a login password
    if (String(password).length < 6) return fail("Password must be 6+ characters");
    t.password = await bcrypt.hash(password, 10);
  }
  if (status !== undefined) {
    if (!["pending", "approved", "rejected"].includes(status)) return fail("Invalid status");
    t.status = status;
  }
  if (name !== undefined) { if (!String(name).trim()) return fail("Name is required"); t.name = name; }
  if (email !== undefined && String(email).toLowerCase() !== t.email) {
    if (await User.findOne({ email: String(email).toLowerCase() })) return fail("Email already in use", 409);
    t.email = email;
  }
  if (phone !== undefined) t.phone = phone;
  if (g.classTeacher) { // a class teacher may only change the subject / period he teaches in his own class
    if (subject !== undefined || period !== undefined) {
      const i = subjectMatch(t, g.ct);
      if (subject !== undefined) {
        if (i === 0) t.subject = subject; else t.assignments[i - 1].subject = subject;
      }
      if (period !== undefined) {
        if (i === 0) t.period = periodNumber(period); else t.assignments[i - 1].period = periodNumber(period);
      }
      t.markModified("assignments");
    }
  } else {
    if (subject !== undefined) t.subject = subject;
    if (period !== undefined) t.period = periodNumber(period);
    if (className !== undefined) t.className = className;
    if (section !== undefined) t.section = section;
    if (teacherType !== undefined) t.teacherType = teacherType;
    if (extras !== undefined) t.assignments = cleanAssignments(extras);
  }
  await t.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const g = await guard((await params).id); if (g.error) return g.error;
  const id = g.target._id;
  if (g.target.role === "school") { // remove the whole school and its data
    await Promise.all([Student, Fee, Diary, Paper, Mark, Timetable].map((m: any) => m.deleteMany({ school: id })));
    await User.deleteMany({ school: id });
  }
  await User.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
