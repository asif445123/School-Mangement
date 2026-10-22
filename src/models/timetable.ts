import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";

const slotSchema = new Schema({
  start: { type: String, default: "" },
  end: { type: String, default: "" },
}, { _id: false });

const eightBlankSlots = () => Array.from({ length: 8 }, () => ({ start: "", end: "" }));

const timetableSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true },
  key: { type: String, required: true },
  className: { type: String, required: true, trim: true },
  section: { type: String, default: "", trim: true },
  regularPeriods: { type: [slotSchema], default: eightBlankSlots },
  fridayPeriods: { type: [slotSchema], default: eightBlankSlots },
  regularBreak: { type: slotSchema, default: () => ({ start: "", end: "" }) },
  fridayBreak: { type: slotSchema, default: () => ({ start: "", end: "" }) },
}, { timestamps: true });

timetableSchema.index({ school: 1, key: 1 }, { unique: true });

export default defineModel("Timetable", timetableSchema);
