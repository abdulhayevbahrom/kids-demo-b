import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    audience: {
      type: String,
      enum: ["all", "parents", "teachers", "group"],
      default: "all",
    },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    priority: { type: String, enum: ["normal", "important", "urgent"], default: "normal" },
    publishAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Announcement = mongoose.model("Announcement", announcementSchema);
