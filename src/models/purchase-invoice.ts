import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// A purchase of store items from a supplier (or a cash purchase).
const schema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  invoiceNo: { type: String, required: true, trim: true }, // PI-0001 (auto)
  date: { type: String, required: true },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
  supplierName: { type: String, default: "Cash Purchase", trim: true, maxlength: 120 },
  rows: [{
    item: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    name: { type: String, default: "", trim: true, maxlength: 120 },
    unit: { type: String, default: "pcs", trim: true, maxlength: 20 },
    qty: { type: Number, required: true, min: 0 },
    rate: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
  }],
  total: { type: Number, default: 0, min: 0 },
  paid: { type: Number, default: 0, min: 0 }, // paid now; the rest becomes supplier payable
  mode: { type: String, default: "Cash", trim: true, maxlength: 30 },
  account: { type: Schema.Types.ObjectId, ref: "Account", default: null }, // bank / cash account of the payment
  note: { type: String, default: "", trim: true, maxlength: 300 },
  entry: { type: Schema.Types.ObjectId, ref: "Entry" }, // accounting entry posted for the paid amount
}, { timestamps: true });
schema.index({ school: 1, invoiceNo: 1 }, { unique: true });
export default defineModel("PurchaseInvoice", schema);
