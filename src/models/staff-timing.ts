import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";

// One expected school timing per staff designation (e.g. Teacher 08:00-14:00,
// Staff 09:00-17:00). Staff Attendance uses these scheduled times to compute
// late arrival / early departure minutes for every staff member of that
// designation. School admin can add any number of designation timings.
const staffTimingSchema = new Schema(
  {
    school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    designation: { type: String, required: true, trim: true }, // Teacher / Staff / ...
    arrivalTime: { type: String, default: "" },   // HH:mm expected arrival
    departureTime: { type: String, default: "" }, // HH:mm expected departure
  },
  { timestamps: true },
);
staffTimingSchema.index({ school: 1, designation: 1 }, { unique: true });
export default defineModel("StaffTiming", staffTimingSchema);
