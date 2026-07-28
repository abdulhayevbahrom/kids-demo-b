import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5001,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bogcha",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV || "development",
};

if (env.nodeEnv === "production" && !process.env.JWT_SECRET) {
  throw new Error("Production rejimida JWT_SECRET majburiy.");
}
