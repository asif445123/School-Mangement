import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser } from "@/lib/auth";
import User from "@/models/user";
import StaffAttendance from "@/models/staff-attendance";
import StaffTiming from "@/models/staff-timing";
import { isValidDate, isValidMonth } from "@/lib/attendance";
import { lateMinutesOf, earlyMinutesOf, monthlyRows, timingKey, withTiming } from "@/lib/staff-attendance";

// Staff Attendance (school admin only): daily marking, monthly sheet &
// deduction, and per-staff monthly arrival/departure detail.
const FIELDS = "_id name designation type empCode monthlySalary email activeStatus";

async function schoolScope() {
  const me = await getSessionUser();
  if (!me || me.role !== "school") return { error: fail("Access denied", 403) };
  return { me, schoolId: me._id };
}

// Load timings once per request and match designations case-insensitively.
async function schoolTimings(schoolId: any) {
  const timings = await StaffTiming.find({ school: schoolId }).lean();
  return new Map<string, any>(timings.map((t: any) => [timingKey(t.designation), t]));
}

export async function GET(req: NextRequest) {
  const s = await schoolScope();
  if (s.error) return s.error;
  const { schoolId } = s as any;
  const q = req.nextUrl.searchParams;
  const mode = q.get("mode") || "day";
  const date = String(q.get("date") || "").trim();
  const month = String(q.get("month") || "").trim();
  const staffId = String(q.get("staff") || "").trim();
  await connectDb();

  if (mode === "day") {
    if (!isValidDate(date)) return fail("Enter a valid date");
    const staffs = await User.find({ school: schoolId, role: "teacher" })
      .select(FIELDS)
      .sort({ name: 1 })
      .lean();
    const timings = await schoolTimings(schoolId);
    const records = await StaffAttendance.find({ school: schoolId, date, staff: { $in: staffs.map((st: any) => st._id) } }).lean();
    const recordOf = new Map(records.map((r: any) => [String(r.staff), r]));
    return NextResponse.json({
      date,
      staffs: staffs.map((st: any) => {
        const timing = timings.get(timingKey(st.designation)) || null;
        const record = recordOf.get(String(st._id)) || null;
        return { ...st, timing, record: record ? withTiming(record, timing) : null };
      }),
    });
  }

  if (mode === "month") {
    if (!isValidMonth(month)) return fail("Enter a valid month");
    const staffs = await User.find({ school: schoolId, role: "teacher" }).select(FIELDS).sort({ name: 1 }).lean();
    const staffIds = staffs.map((st: any) => st._id);
    const records = await StaffAttendance.find({
      school: schoolId,
      staff: { $in: staffIds },
      date: { $gte: `${month}-01`, $lte: `${month}-31` },
    }).lean();
    const timings = await schoolTimings(schoolId);
    const rows = monthlyRows(staffs, records, timings);
    return NextResponse.json({ month, rows, days: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate() });
  }

  if (mode === "staff-report") {
    if (!staffId) return fail("Select a staff member");
    if (!isValidMonth(month)) return fail("Enter a valid month");
    const staff = await User.findOne({ _id: staffId, school: schoolId, role: "teacher" }).select(FIELDS).lean();
    if (!staff) return fail("Staff member not found", 404);
    const records = await StaffAttendance.find({
      school: schoolId, staff: staffId,
      date: { $gte: `${month}-01`, $lte: `${month}-31` },
    }).sort({ date: 1 }).lean();
    const timings = await schoolTimings(schoolId);
    const timing = timings.get(timingKey((staff as any).designation));
    return NextResponse.json({ month, staff, timing: timing || null, records: records.map((r: any) => withTiming(r, timing)) });
  }

  return fail("Unknown mode", 400);
}

export async function POST(req: NextRequest) {
  const s = await schoolScope();
  if (s.error) return s.error;
  const { schoolId } = s as any;
  const body = await req.json().catch(() => null);
  const date = String(body?.date || "").trim();
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  if (!isValidDate(date)) return fail("Enter a valid date");
  if (!rows.length) return fail("No attendance rows to save");

  await connectDb();
  const staffIds = [...new Set(rows.map((r: any) => r?.staff).filter(Boolean))];
  const staffs = await User.find({ school: schoolId, role: "teacher", _id: { $in: staffIds } }).select(FIELDS).lean();
  const byId = new Map(staffs.map((st: any) => [String(st._id), st]));
  const timings = await schoolTimings(schoolId);
  const ops: any[] = [];
  for (const r of rows) {
    const st = byId.get(String(r?.staff || ""));
    if (!st) return fail("One of the staff members does not belong to this school", 403);
    const status = ["Present", "Absent", "Leave"].includes(String(r.status)) ? String(r.status) : "Present";
    let lateArrival = !!r.lateArrival, earlyDeparture = !!r.earlyDeparture;
    let lateMinutes = Number(r.lateMinutes || 0) || 0;
    let earlyMinutes = Number(r.earlyMinutes || 0) || 0;
    const timing = timings.get(timingKey(st.designation));
    if (r.arrivalTime) {
      lateMinutes = lateMinutesOf(String(r.arrivalTime), timing?.arrivalTime || "");
      lateArrival = lateArrival || lateMinutes > 0;
    }
    if (r.departureTime) {
      earlyMinutes = earlyMinutesOf(String(r.departureTime), timing?.departureTime || "");
      earlyDeparture = earlyDeparture || earlyMinutes > 0;
    }
    ops.push({
      updateOne: {
        filter: { school: schoolId, staff: st._id, date },
        update: {
          $set: {
            school: schoolId,
            staff: st._id,
            date,
            status,
            arrivalTime: String(r.arrivalTime || ""),
            departureTime: String(r.departureTime || ""),
            lateArrival,
            earlyDeparture,
            lateMinutes,
            earlyMinutes,
          },
        },
        upsert: true,
      },
    });
  }
  await StaffAttendance.bulkWrite(ops, { ordered: false });
  return NextResponse.json({ ok: true, saved: ops.length, date });
}
