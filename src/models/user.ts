import { defineModel } from "@/lib/define-model";
import { Schema, model, models } from "mongoose";
// Roles: admin (platform owner) > school (school admin) > teacher > student
const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  schoolName: { type: String, default: "" },
  resetTokenHash: String, resetExpires: Date, // password reset link (token stored hashed, valid 1 hour)
  logo: { type: String, default: "" }, // school logo as a small data URL (school role only)
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: "" },
  teacherType: { type: String, default: "" }, // class teacher / subject teacher
  className: { type: String, default: "" }, // teacher class
  section: { type: String, default: "" },   // teacher section
  subject: { type: String, default: "" },   // teacher subject
  assignments: [{ _id: false, teacherType: String, className: String, section: String, subject: String }], // extra assignments (e.g. class teacher of 9 A and subject teacher of 8 B)
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "school", "teacher", "student"], default: "school" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  school: { type: Schema.Types.ObjectId, ref: "User" },   // owning school account (teacher/student)
  student: { type: Schema.Types.ObjectId, ref: "Student" }, // linked student record (student role)
}, { timestamps: true });
export default defineModel("User", userSchema);
