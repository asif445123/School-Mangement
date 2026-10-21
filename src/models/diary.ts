import { defineModel } from "@/lib/define-model";
import { Schema, model, models } from "mongoose";
const diarySchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true}, date: String, className: String, section: String, subject: String, text: String }, { timestamps: true });
export default defineModel("Diary", diarySchema);
