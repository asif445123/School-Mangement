import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";

// Keep each payment and the installments it recovers in one atomic staff write.
const schema = new Schema({
  school: { type: Schema.Types.ObjectId, required: true },
  staff: { type: Schema.Types.ObjectId, required: true },
  name: String,
  advances: [{ date: String, amount: Number, installment: Number, recovered: Number,
    mode: String, bank: String, note: String }],
  salaries: [{ month: String, name: String, designation: String, basic: Number, allowances: Number,
    attendance: Number, absent: Number, leave: Number, late: Number, early: Number,
    bonus: Number, overtime: Number, other: Number, paidOn: Date, recovered: Number }],
}, { optimisticConcurrency: true });
schema.index({ school: 1, staff: 1 }, { unique: true });
export default defineModel("StaffPayroll", schema);
