import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// Payment destinations printed on vouchers, separate from the accounting ledger.
const schema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["bank", "jazzcash", "easypaisa", "raast"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  accountNumber: { type: String, required: true, trim: true, maxlength: 64 },
  bankName: { type: String, default: "", trim: true, maxlength: 100 },
  branch: { type: String, default: "", trim: true, maxlength: 120 },
  iban: { type: String, default: "", trim: true, maxlength: 34 },
  instructions: { type: String, default: "", trim: true, maxlength: 300 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default defineModel("PaymentAccount", schema);
