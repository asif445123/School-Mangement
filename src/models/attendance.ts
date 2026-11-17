import { defineModel } from "@/lib/define-model";
import { Schema } from "mongoose";
import { attendanceStatuses } from "@/lib/attendance";

// One row per student per day. className / section are a snapshot of the
// student's class when the attendance was marked, so the monthly register
// keeps its class even if the student is moved to another class later.
const attendanceSchema = new Schema(
  {
    school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: [...attendanceStatuses], required: true },
    className: { type: String, default: "" },
    section: { type: String, default: "" },
  },
  { timestamps: true },
);
attendanceSchema.index({ school: 1, student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ school: 1, date: 1 });
export default defineModel("Attendance", attendanceSchema);
