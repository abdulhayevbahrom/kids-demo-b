import mongoose from "mongoose";

const stockTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryProduct",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["in", "out", "adjustment"],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    recipient: { type: String, trim: true, maxlength: 150, default: "" },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

stockTransactionSchema.index({ product: 1, createdAt: -1 });

export const StockTransaction = mongoose.model("StockTransaction", stockTransactionSchema);
