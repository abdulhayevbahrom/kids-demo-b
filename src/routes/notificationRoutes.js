import { Router } from "express";
import {
  listReadNotifications,
  markNotificationsRead,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

export const notificationRouter = Router();
notificationRouter.use(protect);
notificationRouter.get("/read", listReadNotifications);
notificationRouter.post("/read", markNotificationsRead);
