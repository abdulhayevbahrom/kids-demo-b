import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = [
  "food",
  "salary",
  "utilities",
  "rent",
  "education",
  "medicine",
  "repair",
  "transport",
  "other",
];

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Harajat nomi majburiy."],
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Summa majburiy."],
      min: [1, "Summa 0 dan katta bo‘lishi kerak."],
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "click", "bank", "card", "transfer"],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1, expenseDate: -1 });

export const Expense = mongoose.model("Expense", expenseSchema);
