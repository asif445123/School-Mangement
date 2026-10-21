import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// One amount against one account (no debit / credit)
const entrySchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  jv: Number, // voucher number, same for all rows saved together
  date: { type: String, required: true },
  account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  narration: { type: String, default: "" },
  amount: { type: Number, required: true, min: 0 },
}, { timestamps: true });
export default defineModel("Entry", entrySchema);
