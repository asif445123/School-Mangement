import { Schema } from "mongoose";
import { defineModel } from "@/lib/define-model";
// One line of the G.R. (General) Register: admission, personal details and leaving details of a student
const grEntrySchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  grNo: { type: String, required: true, trim: true },
  admissionDate: String,
  name: { type: String, required: true, trim: true },
  fatherName: String, fatherOccupation: String, gender: String, dob: String, address: String, phone: String,
  admissionClass: String, previousSchool: String,
  leavingDate: String, leavingClass: String, leavingReason: String, remarks: String,
  student: { type: Schema.Types.ObjectId, ref: "Student" }, // optional link to the student record
}, { timestamps: true });
grEntrySchema.index({ school: 1, grNo: 1 }, { unique: true });
export default defineModel("GrEntry", grEntrySchema);
