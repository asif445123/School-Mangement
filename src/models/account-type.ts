import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// Check marks: receivable / payable list, and counts as income / expense on the dashboard
const accountTypeSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true },
  isReceivable: Boolean, isPayable: Boolean, isIncome: Boolean, isExpense: Boolean,
  nature: String, dashboard: String, // legacy values from the earlier dropdown version
}, { timestamps: true });
accountTypeSchema.index({ school: 1, name: 1 }, { unique: true });
export default defineModel("AccountType", accountTypeSchema);
