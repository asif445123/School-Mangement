import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { fail, getSessionUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { studentWhatsApp } from "@/lib/phone";
import Fee from "@/models/fee";
import Student from "@/models/student";
import User from "@/models/user";

// Record an administrator-confirmed reminder against every currently pending
// chalan for the student, so Chalans & Payments reflects the reminder too.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (user?.role !== "school") return fail("Only the school administrator can record fee reminders", 403);

  const body = await req.json().catch(() => ({}));
  if (body.confirmed !== true) return fail("Confirm that you sent the reminder in WhatsApp first");
  const studentId = String(body.studentId || "");
  if (!Types.ObjectId.isValid(studentId)) return fail("Student not found", 404);

  await connectDb();
  const student = await Student.findOne({ _id: studentId, school: user._id }).lean();
  if (!student) return fail("Student not found", 404);
  const owner: any = await User.findById(user._id).select("whatsapp.countryCallingCode").lean();
  const recipient = studentWhatsApp(student, owner?.whatsapp?.countryCallingCode || "92");
  if (!recipient.number) return fail("Add a valid WhatsApp number or phone number for this student first");

  const pending = await Fee.find({
    school: user._id,
    student: studentId,
    $expr: { $gt: [{ $ifNull: ["$amount", 0] }, { $ifNull: ["$paid", 0] }] },
  }).select("_id revision").lean();
  if (!pending.length) return fail("This student has no pending chalans to attach the reminder to", 409);

  const now = new Date();
  const ids = pending.map((fee: any) => fee._id);
  await Fee.updateMany({ _id: { $in: ids }, school: user._id }, {
    $set: {
      "whatsapp.lastStatus": "sent",
      "whatsapp.lastMessageType": "reminder",
      "whatsapp.lastAttemptAt": now,
      "whatsapp.lastSentAt": now,
      "whatsapp.lastTo": recipient.number,
      "whatsapp.lastBy": `${user.name} (manual confirmation)`,
      "whatsapp.sentRevision": null,
      "whatsapp.deliveryStatus": "manually_confirmed",
    },
    $inc: { "whatsapp.sentCount": 1, "whatsapp.attemptCount": 1 },
    $unset: { "whatsapp.lastError": 1 },
  });
  const items = await Fee.find({ _id: { $in: ids }, school: user._id }).lean();
  return NextResponse.json({ items, message: "Manual WhatsApp reminder recorded on pending chalans" });
}
