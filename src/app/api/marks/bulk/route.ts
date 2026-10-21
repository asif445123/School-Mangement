import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
import Mark from "@/models/mark";
import Paper from "@/models/paper";
import Student from "@/models/student";

// Saves (or updates) the marks of many students for one test / exam paper.
export async function POST(req: NextRequest) {
  const s = await scope("marks", true);
  if (s.error) return s.error;
  try {
    const { paper, marks } = await req.json();
    if (!Array.isArray(marks) || !marks.length) return fail("Enter marks for at least one student");
    await connectDb();
    const p = await Paper.findOne({ _id: paper, school: s.schoolId });
    if (!p) return fail("Paper not found", 404);
    if (marks.some((m: any) => !Number.isFinite(Number(m.obtained)) || Number(m.obtained) < 0 || Number(m.obtained) > p.totalMarks)) return fail(`Marks must be between 0 and ${p.totalMarks}`);
    const own = new Set((await Student.find({ school: s.schoolId, _id: { $in: marks.map((m: any) => m.student) } }).select("_id")).map((x: any) => String(x._id)));
    if (marks.some((m: any) => !own.has(String(m.student)))) return fail("Invalid student");
    // paper + student is the unique pair, so match on it (this also adopts marks saved by older versions)
    await Mark.bulkWrite(marks.map((m: any) => ({
      updateOne: { filter: { paper: p._id, student: m.student }, update: { $set: { obtained: Number(m.obtained), school: s.schoolId } }, upsert: true },
    })));
    return NextResponse.json({ ok: true, saved: marks.length });
  } catch (e: any) {
    console.error("marks/bulk", e);
    return fail(e?.message || "Could not save marks", 500);
  }
}
