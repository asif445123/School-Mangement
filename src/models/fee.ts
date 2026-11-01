import { defineModel } from "@/lib/define-model";
import { Schema, model, models } from "mongoose";
const feeSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true},
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  actualFee: Number, discount: { type: Number, default: 0 },
  admissionFee: { type: Number, default: 0, min: 0 }, annualCharges: { type: Number, default: 0, min: 0 },
  month: { type: String, required: true }, chalanNo: String,
  amount: { type: Number, required: true }, paid: { type: Number, default: 0 },
  status: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" }, receivedDate: String,
  payments: [{ _id: false, amount: Number, date: String, receivedBy: String, narration: String }],
  revision: { type: Number, default: 0 },
  whatsapp: {
    sentCount: { type: Number, default: 0 }, attemptCount: { type: Number, default: 0 },
    lastStatus: { type: String, enum: ["sent", "failed"], default: undefined },
    lastAttemptAt: Date, lastSentAt: Date, lastTo: String, lastBy: String,
    lastError: String, lastMessageId: String, sentRevision: Number,
    deliveryStatus: String, deliveryAt: Date,
    lockUntil: { type: Date, select: false }, lockToken: { type: String, select: false },
  },
}, { timestamps: true });
feeSchema.index({ student: 1, month: 1 }, { unique: true });
export default defineModel("Fee", feeSchema);
