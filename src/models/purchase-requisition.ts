import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// A department asks the office to buy something (demand, not the purchase itself).
const schema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: String, required: true },
  item: { type: String, required: true, trim: true, maxlength: 160 }, // item / description
  quantity: { type: Number, required: true, min: 0 },
  department: { type: String, default: "", trim: true, maxlength: 80 },
  requestedBy: { type: String, default: "", trim: true, maxlength: 80 },
  status: { type: String, default: "Pending", trim: true, maxlength: 20 },
  note: { type: String, default: "", trim: true, maxlength: 300 },
}, { timestamps: true });
export default defineModel("PurchaseRequisition", schema);
