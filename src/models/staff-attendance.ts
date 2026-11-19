import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";

// One row per staff member per day: status plus the actual arrival/departure
// times (HH:mm) and the computed late / early minutes against the timing set
// for the staff member's designation.
const staffAttendanceSchema = new Schema(
  {
    school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    staff: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: ["Present", "Absent", "Leave"], default: "Present", required: true },
    arrivalTime: { type: String, default: "" },   // HH:mm actual arrival
    departureTime: { type: String, default: "" }, // HH:mm actual departure
    lateArrival: { type: Boolean, default: false },
    earlyDeparture: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    earlyMinutes: { type: Number, default: 0 },
  },
  { timestamps: true },
);
staffAttendanceSchema.index({ school: 1, staff: 1, date: 1 }, { unique: true });
staffAttendanceSchema.index({ school: 1, date: 1 });
export default defineModel("StaffAttendance", staffAttendanceSchema);
