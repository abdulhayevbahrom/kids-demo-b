import { ReadNotification } from "../models/ReadNotification.js";
import { AppError } from "../utils/AppError.js";

export async function listReadNotifications(req, res, next) {
  try {
    const records = await ReadNotification.find({ user: req.user._id })
      .select("key -_id")
      .sort({ readAt: -1 })
      .limit(2000)
      .lean();
    res.json({ success: true, keys: records.map((record) => record.key) });
  } catch (error) { next(error); }
}

export async function markNotificationsRead(req, res, next) {
  try {
    const keys = [...new Set(
      (Array.isArray(req.body.keys) ? req.body.keys : [])
        .filter((key) => typeof key === "string" && key.trim())
        .map((key) => key.trim()),
    )];
    if (!keys.length) throw new AppError("O‘qilgan xabarlar tanlanmagan.", 400);
    if (keys.length > 100) throw new AppError("Bir vaqtda 100 tagacha xabarni belgilash mumkin.", 400);
    const now = new Date();
    await ReadNotification.bulkWrite(
      keys.map((key) => ({
        updateOne: {
          filter: { user: req.user._id, key },
          update: { $set: { readAt: now } },
          upsert: true,
        },
      })),
    );
    res.json({ success: true, keys });
  } catch (error) { next(error); }
}
