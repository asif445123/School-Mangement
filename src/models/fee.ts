import { defineModel } from "@/lib/define-model";
import { Schema, model, models } from "mongoose";
const feeSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true},
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  actualFee: Number, discount: { type: Number, default: 0 },
  month: { type: String, required: true }, chalanNo: String,
  amount: { type: Number, required: true }, paid: { type: Number, default: 0 },
  status: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" }, receivedDate: String,
  payments: [{ _id: false, amount: Number, date: String, receivedBy: String, narration: String }],
}, { timestamps: true });
feeSchema.index({ student: 1, month: 1 }, { unique: true });
export default defineModel("Fee", feeSchema);
