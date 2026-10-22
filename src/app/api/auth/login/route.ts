import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { fail, signToken } from "@/lib/auth";
import { classTeacherClasses } from "@/lib/teacher-scope";
import User from "@/models/user";

export async function POST(req: NextRequest) {
  const { email, password, remember } = await req.json();
  await connectDb();
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(password || "", user.password))) return fail("Invalid email or password", 401);
  if (user.status !== "approved") return fail(`Account ${user.status}`, 403, { status: user.status });
  // classTeacher tells the client where a teacher starts: Students (class teacher) or Marks (subject teacher)
  const res = NextResponse.json({ ok: true, role: user.role, classTeacher: classTeacherClasses(user).length > 0 });
  res.cookies.set("token", signToken(String(user._id), !!remember), {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
  return res;
}
