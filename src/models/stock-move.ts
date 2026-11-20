import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// One Stock In / Stock Out row. A purchase invoice also writes its own
// "in" rows, so the stock always matches the purchases.
const schema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: String, required: true },
  item: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true, index: true },
  type: { type: String, enum: ["in", "out"], required: true },
  qty: { type: Number, required: true, min: 0 },
  rate: { type: Number, default: 0, min: 0 },
  note: { type: String, default: "", trim: true, maxlength: 200 },
  ref: { type: String, default: "", trim: true, maxlength: 40 }, // e.g. PI-0001 / requisition
  entry: { type: Schema.Types.ObjectId, ref: "Entry" }, // expense entry posted for a Stock Out
}, { timestamps: true });
schema.index({ school: 1, date: -1 });
export default defineModel("StockMove", schema);
