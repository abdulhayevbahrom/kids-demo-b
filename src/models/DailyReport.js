import mongoose from "mongoose";

const dailyReportSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    mood: { type: String, enum: ["great", "good", "calm", "sad"], default: "good" },
    meals: { type: String, enum: ["all", "most", "little", "none"], default: "most" },
    sleepMinutes: { type: Number, min: 0, max: 300, default: 0 },
    activities: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

dailyReportSchema.index({ child: 1, date: 1 }, { unique: true });
export const DailyReport = mongoose.model("DailyReport", dailyReportSchema);
