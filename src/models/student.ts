import { defineModel } from "@/lib/define-model";
import { Schema, model, models } from "mongoose";
const studentSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true},
  name: { type: String, required: true }, fatherName: String, className: { type: String, required: true },
  rollNo: String, phone: String, monthlyFee: { type: Number, default: 0 }, discount: { type: Number, default: 0 },
  previousPending: { type: Number, default: 0 }, // fee owed from before the school started using the system
  gender: String, dob: String, admissionDate: String, leftDate: String,
}, { timestamps: true });
export default defineModel("Student", studentSchema);
