import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// A supplier of store items. Every purchase invoice and payment of this
// supplier makes up his ledger (payable) balance.
const schema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, default: "", trim: true, maxlength: 30 },
  address: { type: String, default: "", trim: true, maxlength: 240 },
  openingPayable: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
schema.index({ school: 1, name: 1 }, { unique: true });
export default defineModel("Supplier", schema);
