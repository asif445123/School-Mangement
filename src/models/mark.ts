import { defineModel } from "@/lib/define-model";
import { Schema, model, models } from "mongoose";
const markSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true},
  paper: { type: Schema.Types.ObjectId, ref: "Paper", required: true },
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  obtained: { type: Number, default: 0 },
}, { timestamps: true });
markSchema.index({ paper: 1, student: 1 }, { unique: true });
export default defineModel("Mark", markSchema);
