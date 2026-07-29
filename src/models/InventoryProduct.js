import mongoose from "mongoose";

const inventoryProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Mahsulot nomi majburiy."],
      trim: true,
      maxlength: 120,
      unique: true,
    },
    category: {
      type: String,
      enum: ["grain", "meat", "dairy", "vegetable", "fruit", "oil", "grocery", "other"],
      default: "other",
    },
    unit: {
      type: String,
      enum: ["kg", "litr", "dona", "quti", "paket"],
      required: [true, "O‘lchov birligi majburiy."],
    },
    currentStock: { type: Number, min: 0, default: 0 },
    minimumStock: { type: Number, min: 0, default: 0 },
    plannedMonthlyQuantity: { type: Number, min: 0, default: 0 },
    standardDailyUsage: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

inventoryProductSchema.index({ category: 1, name: 1 });

export const InventoryProduct = mongoose.model("InventoryProduct", inventoryProductSchema);
