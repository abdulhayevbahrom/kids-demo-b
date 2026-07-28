import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 1000 },
  paymentMethod: { type: String, enum: ["cash", "card", "transfer"], required: true },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  paidAt: { type: Date, default: Date.now },
});

const paymentSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    amountDue: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "transfer", "unpaid"],
      default: "unpaid",
    },
    note: { type: String, trim: true, default: "" },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    transactions: { type: [paymentTransactionSchema], default: [] },
  },
  { timestamps: true }
);

paymentSchema.index({ child: 1, month: 1 }, { unique: true });
paymentSchema.virtual("debt").get(function debt() {
  return Math.max(0, this.amountDue - this.amountPaid);
});
paymentSchema.set("toJSON", { virtuals: true });

export const Payment = mongoose.model("Payment", paymentSchema);
