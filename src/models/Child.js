import mongoose from "mongoose";

const guardianSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+998\d{9}$/, "Ota-ona telefoni +998XXXXXXXXX formatida bo‘lishi kerak."],
    },
    relationship: { type: String, required: true, trim: true },
    canPickup: { type: Boolean, default: true },
  },
  { _id: true }
);

const childSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    birthDate: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    enrollmentDate: { type: Date, default: Date.now },
    guardians: {
      type: [guardianSchema],
      validate: [(items) => items.length > 0, "Kamida bitta ota-ona ma’lumoti kerak."],
    },
    allergies: { type: String, trim: true, default: "" },
    medicalNotes: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    departureDate: { type: Date, default: null },
    departureReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const Child = mongoose.model("Child", childSchema);
