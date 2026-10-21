import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser } from "@/lib/auth";
import User from "@/models/user";
import { anyMatch, classTeacherAssignment, classTeacherClasses, cleanAssignments, subjectMatch } from "@/lib/teacher-scope";

// admin -> schools | school -> its teachers / student logins (?role=) | class teacher -> subject teachers of his class
export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  const ct: any = classTeacherAssignment(me);
  if (!me || !(["admin", "school"].includes(me.role) || ct)) return fail("Access denied", 403);
  await connectDb();
  const role = req.nextUrl.searchParams.get("role");
  const roles = role === "teacher" || role === "student" ? [role] : ["teacher", "student"];
  if (me.role === "admin") return NextResponse.json({ items: await User.find({ role: "school" }).select("-password -logo").sort({ createdAt: -1 }) });
  if (me.role === "school") return NextResponse.json({ items: await User.find({ school: me._id, role: { $in: roles } }).select("-password -logo").sort({ createdAt: -1 }) });
  // a school has few teachers: load them and keep those who are subject teachers of this class (main or extra assignment)
  const all = await User.find({ school: me.school, role: "teacher", _id: { $ne: me._id } }).select("-password -logo").sort({ createdAt: -1 });
  const cts = classTeacherClasses(me); // all classes he is class teacher of
  // ?view=class -> every teacher who teaches a subject in his class (for the status tables); default -> only his subject teachers (to manage)
  const match = req.nextUrl.searchParams.get("view") === "class" ? anyMatch : subjectMatch;
  const found = all.filter((t: any) => cts.some((c) => match(t, c) >= 0));
  // matchedSubject = the subject he teaches in THIS class (the account's own fields stay unchanged)
  return NextResponse.json({ items: found.map((t: any) => { const c: any = cts.find((x) => match(t, x) >= 0), i = match(t, c), o = t.toObject(); return { ...o, matchedSubject: i > 0 ? t.assignments[i - 1].subject : t.subject }; }) });
}

// School creates any teacher (with extra assignments); a class teacher creates subject teachers for his own class and section
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  const ct: any = classTeacherAssignment(me);
  if (!me || (me.role !== "school" && !ct)) return fail("You cannot create teachers", 403);
  const { name, teacherType, email, phone, className, section, subject, extras, password } = await req.json();
  if (!name || !email || !password || password.length < 6) return fail("Name, email and a password of 6+ characters are required");
  await connectDb();
  if (await User.findOne({ email: email.toLowerCase() })) return fail("Email already registered", 409);
  await User.create({
    name, email, phone, subject, password: await bcrypt.hash(password, 10), role: "teacher", status: "approved",
    ...(me.role === "school"
      ? { teacherType, className, section, assignments: cleanAssignments(extras), school: me._id }
      : { teacherType: "Subject teacher", className: ct.className, section: ct.section || "", school: me.school }),
  });
  return NextResponse.json({ ok: true });
}
