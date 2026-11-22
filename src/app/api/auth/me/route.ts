import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser } from "@/lib/auth";
import { linkedStudentIds } from "@/lib/guardian";
import User from "@/models/user";
import Student from "@/models/student";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Not logged in", 401);
  const obj: any = user.toObject();
  const owner: any = user.role === "school" ? obj : user.school ? await User.findById(user.school).select("schoolName logo").lean() : null;
  const schoolLogo = owner?.logo || "";
  delete obj.logo;
  // A student / guardian login needs the names of every linked child so the
  // sidebar can show one group of reports per child (Fee Chalan, Daily Diary,
  // Tests, Exams). Only the few fields the menu prints are sent here - the
  // portal pages read the full data from /api/my.
  if (user.role === "student") {
    const ids = linkedStudentIds(user);
    const found: any[] = ids.length
      ? await Student.find({ _id: { $in: ids }, school: user.school }).select("name className section rollNo").lean()
      : [];
    obj.portalChildren = ids
      .map((id) => found.find((s: any) => String(s._id) === id))
      .filter(Boolean)
      .map((s: any) => ({ _id: String(s._id), name: s.name, className: s.className || "", section: s.section || "", rollNo: s.rollNo || "" }));
  }
  return NextResponse.json({ user: { ...obj, schoolInfo: owner ? { name: owner.schoolName, logo: schoolLogo } : null } });
}
export async function PUT(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return fail("Not logged in", 401);
  const { name, phone, email, currentPassword, newPassword, logo, currentSession, financialYearStart, financialYearEnd } = await req.json();
  await connectDb();
  const user = await User.findById(session._id);
  if (user.role === "school" && [currentSession, financialYearStart, financialYearEnd].some(v => v !== undefined)) {
    const validDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
    if (typeof currentSession !== "string" || !/^\d{4}-\d{2}$/.test(currentSession) || Number(currentSession.slice(-2)) !== (Number(currentSession.slice(0, 4)) + 1) % 100) return fail("Select a valid session");
    if (!validDate(financialYearStart) || !validDate(financialYearEnd) || financialYearEnd < financialYearStart) return fail("Enter a valid financial year date range");
    Object.assign(user, { currentSession, financialYearStart, financialYearEnd });
  }
  if (email && email.toLowerCase() !== user.email && (await User.findOne({ email: email.toLowerCase() }))) return fail("Email already in use", 409);
  if (newPassword) {
    if (newPassword.length < 6) return fail("New password must be 6+ characters");
    if (!(await bcrypt.compare(currentPassword || "", user.password))) return fail("Current password is incorrect", 401);
    user.password = await bcrypt.hash(newPassword, 10);
  }
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (user.role === "school" && typeof logo === "string" && logo.startsWith("data:image/") && logo.length < 400000) user.logo = logo;
  await user.save();
  const { password, logo: _logo, ...safe } = user.toObject();
  return NextResponse.json({ user: { ...safe, ...(user.role === "school" ? { schoolInfo: { name: user.schoolName, logo: user.logo || "" } } : {}) } });
}
