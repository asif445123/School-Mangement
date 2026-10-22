import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser, schoolIdOf } from "@/lib/auth";
import { assignmentsOf, nz, splitList } from "@/lib/teacher-scope";
import Student from "@/models/student";

// Class roster used by the marks screen and the status tables.
// It deliberately sends only what a teacher needs to tick a student off
// (name, roll number, class) - never the student's record itself
// (father name, phone, fees, admission data, leaving certificate, login email).
const ROSTER = "_id name rollNo className leftDate";

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  const schoolId = schoolIdOf(me);
  if (!me || !["school", "teacher"].includes(me.role) || !schoolId) return fail("Access denied", 403);
  const className = String(req.nextUrl.searchParams.get("className") || "").trim();
  await connectDb();

  if (me.role === "school") {
    const filter: Record<string, any> = { school: schoolId };
    if (className) filter.className = className;
    return NextResponse.json({ items: await Student.find(filter).select(ROSTER).sort({ rollNo: 1 }).lean() });
  }

  // A teacher gets the roster of the classes he teaches only (subject teacher: his
  // own classes; class teacher: his class and the classes he teaches elsewhere).
  const mine = new Set(assignmentsOf(me).flatMap((a) => splitList(a.className)).map(nz));
  const students = await Student.find({ school: schoolId }).select(ROSTER).sort({ rollNo: 1 }).lean();
  const items = students.filter((s: any) => mine.has(nz(s.className)) && (!className || nz(s.className) === nz(className)));
  return NextResponse.json({ items });
}
