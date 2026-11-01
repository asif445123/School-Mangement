import { Types } from "mongoose";
import Student from "@/models/student";
import Fee from "@/models/fee";
import PaymentAccount from "@/models/payment-account";
import User from "@/models/user";
import { feeValues, feeStatus, validMonth } from "@/lib/fee-calculation";
import { publicPaymentAccount } from "@/lib/payment-accounts";

export async function prepareFeeCreate(school: any, body: any) {
  if (!Types.ObjectId.isValid(String(body.student || ""))) throw new Error("Select a student");
  if (!validMonth(body.month)) throw new Error("Select a valid chalan month");
  const student = await Student.findOne({ _id: body.student, school }).lean();
  if (!student) throw new Error("Student not found in your school");
  if (await Fee.exists({ school, student: body.student, month: body.month })) throw new Error("This student already has a chalan for this month. Edit the existing voucher instead.");
  const values = feeValues({ ...body, actualFee: body.actualFee ?? (student as any).monthlyFee ?? 0, discount: body.discount ?? (student as any).discount ?? 0 });
  return { school, student: (student as any)._id, month: body.month, chalanNo: `${body.month.replace("-", "")}-${String((student as any).className).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}-${String((student as any).rollNo || String((student as any)._id).slice(-6)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`, ...values };
}

// Never accept client-supplied paid, status, school, student, month or WhatsApp
// history through the generic update endpoint. Only the four charge fields edit a voucher.
export async function prepareFeeUpdate(school: any, id: string, body: any) {
  const fee: any = await Fee.findOne({ _id: id, school }).select("+whatsapp.lockUntil");
  if (!fee) throw new Error("Chalan not found");
  if (fee.whatsapp?.lockUntil > new Date()) throw new Error("This voucher is being sent. Wait before editing it.");
  const before = feeValues(fee.toObject());
  const requested: any = {};
  for (const key of ["actualFee", "discount", "admissionFee", "annualCharges"]) if (body[key] !== undefined) requested[key] = body[key];
  const values = feeValues({ ...before, ...requested });
  const changed = Object.keys(requested).some((key) => Number(requested[key]) !== before[key as keyof typeof before]);
  if (changed && values.amount < fee.paid) throw new Error(`The voucher total cannot be less than the Rs ${fee.paid} already received`);
  return { $set: { ...values, status: feeStatus(values.amount, fee.paid) }, ...(changed ? { $inc: { revision: 1 }, $unset: { "whatsapp.deliveryStatus": 1 } } : {}) };
}

export async function voucherContext(fee: any) {
  const school = fee.school?._id || fee.school;
  const [owner, accounts, student, earlier] = await Promise.all([
    User.findById(school).select("schoolName logo").lean(),
    PaymentAccount.find({ school, active: true }).sort({ createdAt: 1 }).lean(),
    Student.findOne({ _id: fee.student?._id || fee.student, school }).lean(),
    Fee.find({ school, student: fee.student?._id || fee.student, month: { $lt: fee.month } }).select("amount paid").lean(),
  ]);
  if (!owner || !student) throw new Error("The school or student record no longer exists");
  const f = fee.toObject ? fee.toObject() : fee;
  return { fee: { ...f, student, previous: earlier.reduce((sum: number, row: any) => sum + Math.max(0, row.amount - row.paid), 0) }, school: { name: (owner as any).schoolName || (owner as any).name || "School", logo: (owner as any).logo || "" }, accounts: accounts.map(publicPaymentAccount) };
}
