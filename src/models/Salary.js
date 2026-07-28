import mongoose from "mongoose";

const salaryTransactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 1 },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "transfer"],
    required: true,
  },
  note: { type: String, trim: true, maxlength: 300, default: "" },
  paidAt: { type: Date, required: true, default: Date.now },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const salarySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    baseSalary: { type: Number, required: true, min: 0 },
    adjustment: { type: Number, default: 0 },
    adjustmentNote: { type: String, trim: true, maxlength: 300, default: "" },
    transactions: { type: [salaryTransactionSchema], default: [] },
  },
  { timestamps: true },
);

salarySchema.index({ employee: 1, month: 1 }, { unique: true });

export const Salary = mongoose.model("Salary", salarySchema);
