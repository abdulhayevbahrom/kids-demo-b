import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";

async function seed() {
  try {
    await connectDatabase();
    const phone = process.env.SEED_ADMIN_PHONE || "+998901234567";
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    const existing = await User.findOne({ phone });
    if (existing) {
      await User.updateOne(
        { _id: existing._id },
        { $set: { username, canAccessSystem: true } }
      );
      console.log(`Administrator yangilandi: ${username}`);
      return;
    }
    await User.create({
      fullName: process.env.SEED_ADMIN_NAME || "Asosiy administrator",
      username,
      phone,
      password: process.env.SEED_ADMIN_PASSWORD || "Admin123!",
      role: "admin",
      canAccessSystem: true,
      permissions: [],
    });
    console.log(`Administrator yaratildi: ${username}`);
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
