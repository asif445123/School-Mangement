import { defineModel } from "@/lib/define-model";
import { Schema, model, models } from "mongoose";
const paperSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true},
  title: { type: String, required: true }, type: { type: String, enum: ["test", "exam"], default: "test" },
  className: String, section: String, subject: String, date: String, totalMarks: { type: Number, default: 0 }, questions: String, term: String, // exam term: First term / Mid term / Final term
  session: { type: String, default: "", trim: true }, // exam session, e.g. 2025-2026 (used by Result & Card / promotion)
  passPercentage: { type: Number, default: 0 }, // % of total marks needed to pass this paper (0 = the default 33%)
}, { timestamps: true });
export default defineModel("Paper", paperSchema);
