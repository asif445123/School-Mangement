import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// One store item: stationery, books, furniture and equipment.
const schema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, default: "Stationery", trim: true, maxlength: 40 },
  unit: { type: String, default: "pcs", trim: true, maxlength: 20 },
  rate: { type: Number, default: 0, min: 0 },
  openingStock: { type: Number, default: 0, min: 0 },
  minStock: { type: Number, default: 0, min: 0 }, // minimum stock alert
}, { timestamps: true });
schema.index({ school: 1, name: 1 }, { unique: true });
export default defineModel("InventoryItem", schema);
