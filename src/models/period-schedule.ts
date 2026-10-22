import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";

const slotSchema = new Schema({
  start: { type: String, default: "" },
  end: { type: String, default: "" },
}, { _id: false });

const eightBlankSlots = () => Array.from({ length: 8 }, () => ({ start: "", end: "" }));

// One period-time schedule per school. Every class uses the same times.
const periodScheduleSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  regularPeriods: { type: [slotSchema], default: eightBlankSlots },
  fridayPeriods: { type: [slotSchema], default: eightBlankSlots },
  regularBreak: { type: slotSchema, default: () => ({ start: "", end: "" }) },
  fridayBreak: { type: slotSchema, default: () => ({ start: "", end: "" }) },
}, { timestamps: true });

export default defineModel("PeriodSchedule", periodScheduleSchema);
