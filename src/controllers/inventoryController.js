import mongoose from "mongoose";
import { InventoryCount } from "../models/InventoryCount.js";
import { InventoryProduct } from "../models/InventoryProduct.js";
import { StockTransaction } from "../models/StockTransaction.js";
import { AppError } from "../utils/AppError.js";

function positiveNumber(value, label = "Miqdor") {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new AppError(`${label} musbat son bo‘lishi kerak.`, 400);
  }
  return number;
}

function dateFilter(query, field = "createdAt") {
  const filter = {};
  if (query.startDate || query.endDate) {
    filter[field] = {};
    if (query.startDate) filter[field].$gte = new Date(`${query.startDate}T00:00:00.000Z`);
    if (query.endDate) filter[field].$lte = new Date(`${query.endDate}T23:59:59.999Z`);
  }
  return filter;
}

export async function listInventoryProducts(req, res, next) {
  try {
    const filter = req.query.includeInactive === "true" ? {} : { isActive: true };
    if (req.query.category && req.query.category !== "all") filter.category = req.query.category;
    if (req.query.search?.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { note: { $regex: escaped, $options: "i" } },
      ];
    }
    const usePagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const [products, total] = await Promise.all([
      InventoryProduct.find(filter)
        .sort({ isActive: -1, name: 1 })
        .skip(usePagination ? (page - 1) * limit : 0)
        .limit(usePagination ? limit : 0)
        .lean(),
      InventoryProduct.countDocuments(filter),
    ]);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    const usage = await StockTransaction.aggregate([
      { $match: { type: "out", createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$product",
          quantity: { $sum: { $abs: "$quantity" } },
          firstUsageAt: { $min: "$createdAt" },
        },
      },
    ]);
    const usageMap = new Map(usage.map((item) => [item._id.toString(), item]));
    const today = new Date();
    const enriched = products.map((product) => {
      const usageRecord = usageMap.get(product._id.toString());
      const usedLast30Days = usageRecord?.quantity || 0;
      const usageDays = usageRecord
        ? Math.min(30, Math.max(1, Math.ceil((today - usageRecord.firstUsageAt) / 86400000) + 1))
        : 30;
      const averageDailyUsage = usedLast30Days / usageDays;
      const expectedDailyUsage = product.standardDailyUsage || averageDailyUsage;
      return {
        ...product,
        usedLast30Days,
        averageDailyUsage,
        daysRemaining: expectedDailyUsage > 0
          ? Math.floor(product.currentStock / expectedDailyUsage)
          : null,
        isLowStock: product.currentStock <= product.minimumStock,
        isOverusing: product.standardDailyUsage > 0
          && averageDailyUsage > product.standardDailyUsage * 1.1,
      };
    });
    res.json({
      success: true,
      products: enriched,
      pagination: {
        page,
        limit: usePagination ? limit : total,
        total,
        pages: usePagination ? Math.max(1, Math.ceil(total / limit)) : 1,
      },
    });
  } catch (error) { next(error); }
}

export async function createInventoryProduct(req, res, next) {
  try {
    const product = await InventoryProduct.create({
      ...req.body,
      currentStock: 0,
    });
    res.status(201).json({ success: true, product });
  } catch (error) { next(error); }
}

export async function updateInventoryProduct(req, res, next) {
  try {
    const allowed = [
      "name", "category", "unit", "minimumStock", "plannedMonthlyQuantity",
      "standardDailyUsage", "isActive", "note",
    ];
    const values = Object.fromEntries(
      allowed.filter((field) => Object.hasOwn(req.body, field))
        .map((field) => [field, req.body[field] === "" ? null : req.body[field]]),
    );
    const product = await InventoryProduct.findByIdAndUpdate(
      req.params.id,
      values,
      { new: true, runValidators: true },
    );
    if (!product) throw new AppError("Mahsulot topilmadi.", 404);
    res.json({ success: true, product });
  } catch (error) { next(error); }
}

export async function listStockTransactions(req, res, next) {
  try {
    const filter = dateFilter(req.query);
    if (req.query.product && mongoose.isValidObjectId(req.query.product)) {
      filter.product = req.query.product;
    }
    if (["in", "out", "adjustment"].includes(req.query.type)) filter.type = req.query.type;
    const transactions = await StockTransaction.find(filter)
      .select("-stockBefore -stockAfter")
      .populate("product", "name unit category")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .limit(1000);
    res.json({ success: true, transactions });
  } catch (error) { next(error); }
}

export async function createStockTransaction(req, res, next) {
  try {
    const { product: productId, type, recipient = "Oshpaz", note } = req.body;
    if (!["in", "out"].includes(type)) throw new AppError("Kirim yoki chiqim turini tanlang.", 400);
    const quantity = positiveNumber(req.body.quantity);
    if (type === "out" && !recipient?.trim()) throw new AppError("Mahsulotni olgan xodimni kiriting.", 400);

    const existing = await InventoryProduct.findById(productId);
    if (!existing || !existing.isActive) throw new AppError("Mahsulot topilmadi yoki nofaol.", 404);
    if (type === "out" && existing.currentStock < quantity) {
      throw new AppError(`Omborda yetarli mahsulot yo‘q. Qoldiq: ${existing.currentStock} ${existing.unit}.`, 400);
    }
    const delta = type === "in" ? quantity : -quantity;
    const updates = { $inc: { currentStock: delta } };
    const product = await InventoryProduct.findOneAndUpdate(
      {
        _id: productId,
        isActive: true,
        ...(type === "out" ? { currentStock: { $gte: quantity } } : {}),
      },
      updates,
      { new: true, runValidators: true },
    );
    if (!product) throw new AppError("Qoldiq o‘zgardi yoki mahsulot yetarli emas. Qayta urinib ko‘ring.", 409);
    try {
      const transaction = await StockTransaction.create({
        product: productId,
        type,
        quantity: delta,
        recipient: type === "out" ? recipient : "",
        note,
        createdBy: req.user._id,
      });
      await transaction.populate([
        { path: "product", select: "name unit category" },
        { path: "createdBy", select: "fullName" },
      ]);
      res.status(201).json({ success: true, transaction, product });
    } catch (error) {
      await InventoryProduct.findByIdAndUpdate(productId, { $inc: { currentStock: -delta } });
      throw error;
    }
  } catch (error) { next(error); }
}

export async function listInventoryCounts(req, res, next) {
  try {
    const counts = await InventoryCount.find(dateFilter(req.query, "countedAt"))
      .populate("product", "name unit")
      .populate("countedBy", "fullName")
      .sort({ countedAt: -1 })
      .limit(500);
    res.json({ success: true, counts });
  } catch (error) { next(error); }
}

export async function createInventoryCount(req, res, next) {
  try {
    const actualStock = Number(req.body.actualStock);
    if (!Number.isFinite(actualStock) || actualStock < 0) {
      throw new AppError("Haqiqiy qoldiq manfiy bo‘lmagan son bo‘lishi kerak.", 400);
    }
    const product = await InventoryProduct.findById(req.body.product);
    if (!product || !product.isActive) throw new AppError("Mahsulot topilmadi.", 404);
    const systemStock = product.currentStock;
    const difference = actualStock - systemStock;
    product.currentStock = actualStock;
    await product.save();
    try {
      const count = await InventoryCount.create({
        product: product._id,
        systemStock,
        actualStock,
        difference,
        note: req.body.note,
        countedAt: req.body.countedAt || new Date(),
        countedBy: req.user._id,
      });
      if (difference !== 0) {
        await StockTransaction.create({
          product: product._id,
          type: "adjustment",
          quantity: difference,
          note: req.body.note,
          createdBy: req.user._id,
        });
      }
      await count.populate([
        { path: "product", select: "name unit" },
        { path: "countedBy", select: "fullName" },
      ]);
      res.status(201).json({ success: true, count, product });
    } catch (error) {
      product.currentStock = systemStock;
      await product.save();
      throw error;
    }
  } catch (error) { next(error); }
}
