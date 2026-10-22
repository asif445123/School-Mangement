import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser, schoolIdOf } from "@/lib/auth";
import { classTeacherAssignment, classTeacherClasses, nz } from "@/lib/teacher-scope";
import { buildTimetableItems, PERIODS, timetableKey } from "@/lib/timetable";
import Timetable from "@/models/timetable";
import User from "@/models/user";

async function session() {
  const me = await getSessionUser();
  const schoolId = schoolIdOf(me);
  if (!me || !["school", "teacher"].includes(me.role) || !schoolId) return { error: fail("Access denied", 403) };
  return { me, schoolId };
}

export async function GET() {
  const s = await session();
  if (s.error) return s.error;
  await connectDb();
  const [teachers, saved] = await Promise.all([
    User.find({ school: s.schoolId, role: "teacher" }).select("name teacherType className section subject period assignments").lean(),
    Timetable.find({ school: s.schoolId }).lean(),
  ]);
  return NextResponse.json({
    items: buildTimetableItems(teachers, saved, s.me),
    canEdit: s.me.role === "school" || !!classTeacherAssignment(s.me),
  });
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
function cleanSlot(value: any, label: string) {
  const start = String(value?.start || "").trim();
  const end = String(value?.end || "").trim();
  if (!start && !end) return { start: "", end: "" };
  if (!timePattern.test(start) || !timePattern.test(end)) throw new Error(`${label}: select both start and end times`);
  if (end <= start) throw new Error(`${label}: end time must be after start time`);
  return { start, end };
}
function cleanPeriods(value: any, label: string) {
  if (!Array.isArray(value) || value.length !== PERIODS.length) throw new Error(`${label}: all eight period rows are required`);
  return PERIODS.map((period, i) => cleanSlot(value[i], `${label}, period ${period}`));
}

export async function PUT(req: NextRequest) {
  const s = await session();
  if (s.error) return s.error;
  const canEdit = s.me.role === "school" || !!classTeacherAssignment(s.me);
  if (!canEdit) return fail("Subject teachers have read-only timetable access", 403);

  const body = await req.json();
  const className = String(body.className || "").trim();
  const section = String(body.section || "").trim();
  if (!className || className.length > 60 || section.length > 30) return fail("Select a valid class and section");
  if (s.me.role !== "school") {
    const allowed = classTeacherClasses(s.me).some((ct) =>
      nz(ct.className) === nz(className) && (!nz(ct.section) || nz(ct.section) === nz(section)));
    if (!allowed) return fail("You can only set the timetable for your own class", 403);
  }

  try {
    const values = {
      className,
      section,
      regularPeriods: cleanPeriods(body.regularPeriods, "Monday–Thursday"),
      fridayPeriods: cleanPeriods(body.fridayPeriods, "Friday"),
      regularBreak: cleanSlot(body.regularBreak, "Monday–Thursday break"),
      fridayBreak: cleanSlot(body.fridayBreak, "Friday break"),
    };
    await connectDb();
    await Timetable.findOneAndUpdate(
      { school: s.schoolId, key: timetableKey(className, section) },
      { ...values, school: s.schoolId, key: timetableKey(className, section) },
      { new: true, upsert: true, runValidators: true },
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return fail(error.message || "Timetable could not be saved");
  }
}
