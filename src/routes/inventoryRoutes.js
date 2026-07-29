import { Router } from "express";
import {
  createInventoryCount,
  createInventoryProduct,
  createStockTransaction,
  listInventoryCounts,
  listInventoryProducts,
  listStockTransactions,
  updateInventoryProduct,
} from "../controllers/inventoryController.js";
import { allowPermission, protect } from "../middleware/auth.js";

export const inventoryRouter = Router();
inventoryRouter.use(protect, allowPermission("inventory"));

inventoryRouter.route("/products")
  .get(listInventoryProducts)
  .post(createInventoryProduct);
inventoryRouter.patch("/products/:id", updateInventoryProduct);
inventoryRouter.route("/transactions")
  .get(listStockTransactions)
  .post(createStockTransaction);
inventoryRouter.route("/counts")
  .get(listInventoryCounts)
  .post(createInventoryCount);
