import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
import Fee from "@/models/fee";

// Receives a payment: oldest pending chalans of the student are cleared first, then this chalan.
export async function POST(req: NextRequest) {
  const s = await scope("fees", true);
  if (s.error) return s.error;
  const { fee: feeId, amount, date, receivedBy, narration } = await req.json();
  const pay = Number(amount);
  if (!(pay > 0)) return fail("Enter a valid amount");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return fail("Select the receiving date");
  await connectDb();
  const fee = await Fee.findOne({ _id: feeId, school: s.schoolId });
  if (!fee) return fail("Chalan not found", 404);
  const older = await Fee.find({ school: s.schoolId, student: fee.student, month: { $lt: fee.month } }).sort({ month: 1 });
  const queue = [...older, fee].filter((f: any) => f.amount - f.paid > 0);
  const totalDue = queue.reduce((a: number, f: any) => a + (f.amount - f.paid), 0);
  if (pay > totalDue) return fail(`Amount cannot be more than the balance (Rs ${totalDue})`);
  const by = String(receivedBy || s.user.name).trim().slice(0, 80);
  const note = String(narration || "").trim().slice(0, 300);
  let left = pay;
  for (const f of queue) {
    const take = Math.min(f.amount - f.paid, left);
    f.paid += take; left -= take;
    f.status = f.paid >= f.amount ? "paid" : "partial";
    f.receivedDate = date;
    f.payments.push({ amount: take, date, receivedBy: by, narration: note });
    await f.save();
  }
  return NextResponse.json({ ok: true });
}
