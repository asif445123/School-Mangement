import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser, schoolIdOf } from "@/lib/auth";
import { buildMyPeriods, buildTimetableItems, blankSchedule, PERIODS, scheduleFrom } from "@/lib/timetable";
import PeriodSchedule from "@/models/period-schedule";
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
    PeriodSchedule.findOne({ school: s.schoolId }).lean(),
  ]);

  // One-time fallback: schools that entered times before the schedule became
  // school-wide keep those times instead of starting from a blank grid.
  let schedule = saved ? scheduleFrom(saved) : blankSchedule();
  if (!saved) {
    const legacy = await Timetable.findOne({ school: s.schoolId }).sort({ updatedAt: -1 }).lean();
    if (legacy) {
      schedule = scheduleFrom(legacy);
      await PeriodSchedule.updateOne(
        { school: s.schoolId },
        { $setOnInsert: { school: s.schoolId, ...schedule } },
        { upsert: true },
      );
    }
  }

  return NextResponse.json({
    // school admin: every class | class teacher: his own class | subject teacher: none
    items: buildTimetableItems(teachers, s.me),
    // the teacher's own teaching periods (used by the "My periods" tables)
    myPeriods: buildMyPeriods(s.me),
    schedule,
    // Period times are one school-wide setting, so only the school admin edits them.
    canEdit: s.me.role === "school",
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
  // A class teacher can see the times of his own class, but the times belong to
  // the whole school and are changed only by the school admin.
  if (s.me.role !== "school") return fail("Only the school admin can change the school period times", 403);

  try {
    const body = await req.json();
    const schedule = {
      regularPeriods: cleanPeriods(body.regularPeriods, "Monday–Thursday"),
      fridayPeriods: cleanPeriods(body.fridayPeriods, "Friday"),
      regularBreak: cleanSlot(body.regularBreak, "Monday–Thursday break"),
      fridayBreak: cleanSlot(body.fridayBreak, "Friday break"),
    };
    await connectDb();
    await PeriodSchedule.findOneAndUpdate(
      { school: s.schoolId },
      { $set: { ...schedule, school: s.schoolId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return NextResponse.json({ ok: true, schedule });
  } catch (error: any) {
    return fail(error.message || "Period times could not be saved");
  }
}
