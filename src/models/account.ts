import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// Account master file
const accountSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  code: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  accountType: { type: Schema.Types.ObjectId, ref: "AccountType", required: true },
}, { timestamps: true });
accountSchema.index({ school: 1, code: 1 }, { unique: true });
export default defineModel("Account", accountSchema);
