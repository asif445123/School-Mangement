import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// Money paid to a supplier against his payable balance.
const schema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  date: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  mode: { type: String, default: "Cash", trim: true, maxlength: 30 },
  account: { type: Schema.Types.ObjectId, ref: "Account", default: null },
  note: { type: String, default: "", trim: true, maxlength: 300 },
  entry: { type: Schema.Types.ObjectId, ref: "Entry" },
}, { timestamps: true });
export default defineModel("SupplierPayment", schema);
