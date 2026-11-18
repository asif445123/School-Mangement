import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser } from "@/lib/auth";
import StaffTiming from "@/models/staff-timing";

// School staff timings: one expected arrival/departure time per staff
// designation. School admin only.
async function schoolScope() {
  const me = await getSessionUser();
  if (!me || me.role !== "school") return { error: fail("Access denied", 403) };
  return { me, schoolId: me._id };
}

export async function GET() {
  const s = await schoolScope();
  if (s.error) return s.error;
  const { schoolId } = s as any;
  await connectDb();
  const designations = await StaffTiming.find({ school: schoolId }).sort({ designation: 1 }).lean();
  return NextResponse.json({ designations });
}

export async function POST(req: NextRequest) {
  const s = await schoolScope();
  if (s.error) return s.error;
  const { schoolId } = s as any;
  const body = await req.json().catch(() => null);
  const designation = String(body?.designation || "").trim();
  const arrivalTime = String(body?.arrivalTime || "").trim();
  const departureTime = String(body?.departureTime || "").trim();
  if (!designation) return fail("Enter a designation");
  await connectDb();
  const updated = await StaffTiming.findOneAndUpdate(
    { school: schoolId, designation },
    { $set: { arrivalTime, departureTime } },
    { upsert: true, new: true },
  ).lean();
  return NextResponse.json({ ok: true, designation: updated });
}

export async function DELETE(req: NextRequest) {
  const s = await schoolScope();
  if (s.error) return s.error;
  const { schoolId } = s as any;
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return fail("Timing id is required");
  await connectDb();
  await StaffTiming.deleteOne({ _id: id, school: schoolId });
  return NextResponse.json({ ok: true });
}
