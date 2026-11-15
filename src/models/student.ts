import { defineModel } from "@/lib/define-model";
import { Schema } from "mongoose";
import { normalizeStudentStatus, studentStatuses } from "@/lib/student-details";
const studentSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true},
  name: { type: String, required: true }, fatherName: String, className: { type: String, required: true },
  section: { type: String, default: "", trim: true }, // A / B / C ... (empty = the school does not use sections)
  rollNo: String, phone: String, whatsapp: { type: String, default: "", trim: true }, monthlyFee: { type: Number, default: 0 }, discount: { type: Number, default: 0 },
  previousPending: { type: Number, default: 0 }, // fee owed from before the school started using the system
  address: { type: String, trim: true },
  previousSchool: { type: String, trim: true },
  previousClass: { type: String, trim: true },
  previousResult: { type: String, trim: true },
  leavingCertificateNumber: { type: String, trim: true },
  status: { type: String, enum: [...studentStatuses, "Passed out"], set: normalizeStudentStatus, required: true, default: function () { return this.leftDate ? "Left" : "Active"; } },
  gender: String, dob: String, admissionDate: String, leftDate: String,
}, { timestamps: true });
export default defineModel("Student", studentSchema);
