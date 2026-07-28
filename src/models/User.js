import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export const USER_ROLES = ["admin", "director", "teacher", "parent"];
export const USER_PERMISSIONS = [
  "dashboard", "groups", "children", "employees", "attendance",
  "payments", "debtors", "expenses", "salaries", "daily", "announcements", "reports",
];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Ism-familiya majburiy."],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    username: {
      type: String,
      required: function usernameRequired() {
        return this.canAccessSystem;
      },
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 60,
      match: [/^[a-z0-9._-]+$/, "Login faqat lotin harflari, raqam, nuqta va chiziqdan iborat bo‘lishi kerak."],
    },
    phone: {
      type: String,
      required: [true, "Telefon raqami majburiy."],
      unique: true,
      trim: true,
      match: [/^\+998\d{9}$/, "Telefon +998XXXXXXXXX formatida bo‘lishi kerak."],
    },
    password: {
      type: String,
      required: function passwordRequired() {
        return this.canAccessSystem;
      },
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "parent",
    },
    permissions: {
      type: [{ type: String, enum: USER_PERMISSIONS }],
      default: ["dashboard"],
    },
    canAccessSystem: {
      type: Boolean,
      default: false,
    },
    position: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    salary: {
      type: Number,
      min: 0,
      default: 0,
    },
    birthDate: {
      type: Date,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password || !candidate) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    fullName: this.fullName,
    username: this.username,
    phone: this.phone,
    role: this.role,
    permissions: this.permissions,
    canAccessSystem: this.canAccessSystem,
    position: this.position,
    salary: this.salary,
    birthDate: this.birthDate,
    address: this.address,
    isActive: this.isActive,
  };
};

export const User = mongoose.model("User", userSchema);
