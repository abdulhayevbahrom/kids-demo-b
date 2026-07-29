import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { authRouter } from "./routes/authRoutes.js";
import { managementRouter } from "./routes/managementRoutes.js";
import { userRouter } from "./routes/userRoutes.js";
import { inventoryRouter } from "./routes/inventoryRoutes.js";
import { notificationRouter } from "./routes/notificationRoutes.js";

export const app = express();

app.use(helmet());
const corsOptions =
  env.nodeEnv === "production"
    ? { origin: env.clientUrls, credentials: true }
    : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Bog‘cha API ishlayapti." });
});
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api", managementRouter);
app.use(notFound);
app.use(errorHandler);
