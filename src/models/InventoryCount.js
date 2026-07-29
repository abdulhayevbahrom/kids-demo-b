import mongoose from "mongoose";

const inventoryCountSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryProduct",
      required: true,
      index: true,
    },
    systemStock: { type: Number, required: true, min: 0 },
    actualStock: { type: Number, required: true, min: 0 },
    difference: { type: Number, required: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    countedAt: { type: Date, default: Date.now, index: true },
    countedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const InventoryCount = mongoose.model("InventoryCount", inventoryCountSchema);
