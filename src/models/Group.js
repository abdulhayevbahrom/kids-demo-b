import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    ageRange: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1, default: 20 },
    monthlyFee: { type: Number, required: true, min: 0, default: 0 },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    room: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Group = mongoose.model("Group", groupSchema);
