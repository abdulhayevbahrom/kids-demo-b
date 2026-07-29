import mongoose from "mongoose";

const readNotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      maxlength: 250,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

readNotificationSchema.index({ user: 1, key: 1 }, { unique: true });

export const ReadNotification = mongoose.model("ReadNotification", readNotificationSchema);
