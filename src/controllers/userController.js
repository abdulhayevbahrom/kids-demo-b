import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export async function listUsers(_req, res, next) {
  try {
    const users = await User.find({ role: { $in: ["admin", "director", "teacher"] } })
      .sort({ isActive: -1, fullName: 1 });
    res.json({ success: true, users: users.map((user) => user.toSafeObject()) });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const {
      fullName, username, phone, password, role, position, salary,
      birthDate, medicalExamExpiryDate, address, permissions, canAccessSystem = false,
    } = req.body;
    if (canAccessSystem && !["admin", "director", "teacher"].includes(role)) {
      throw new AppError("Noto‘g‘ri foydalanuvchi roli.", 400);
    }
    if (canAccessSystem && (!username || !password)) {
      throw new AppError("Tizimga kiradigan xodim uchun login va parol majburiy.", 400);
    }
    if (canAccessSystem && role === "admin" && req.user.role !== "admin") {
      throw new AppError("Administrator yaratish uchun ruxsat yetarli emas.", 403);
    }
    const user = await User.create({
      fullName,
      username: canAccessSystem ? username : undefined,
      phone,
      password: canAccessSystem ? password : undefined,
      role: canAccessSystem ? role : "teacher",
      position,
      salary,
      birthDate: birthDate || null,
      medicalExamExpiryDate: medicalExamExpiryDate || null,
      address,
      permissions: canAccessSystem ? permissions : [],
      canAccessSystem,
    });
    res.status(201).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select("+password");
    if (!user) throw new AppError("Xodim topilmadi.", 404);
    if (user.role === "admin" && req.user.role !== "admin") {
      throw new AppError("Administratorni tahrirlash uchun ruxsat yetarli emas.", 403);
    }
    if (user._id.equals(req.user._id) && req.body.isActive === false) {
      throw new AppError("O‘z hisobingizni nofaol qila olmaysiz.", 400);
    }

    const allowed = [
      "fullName", "username", "phone", "role", "position", "salary",
      "birthDate", "medicalExamExpiryDate", "address", "isActive", "permissions", "canAccessSystem",
    ];
    for (const field of allowed) {
      if (Object.hasOwn(req.body, field)) {
        user[field] = ["birthDate", "medicalExamExpiryDate"].includes(field) && !req.body[field]
          ? null
          : req.body[field];
      }
    }
    if (req.body.password) user.password = req.body.password;
    if (!user.canAccessSystem) {
      user.username = undefined;
      user.password = undefined;
      user.permissions = [];
    }
    if (user.canAccessSystem && (!user.username || !user.password)) {
      throw new AppError("Tizimga kiradigan xodim uchun login va parol majburiy.", 400);
    }
    if (user.canAccessSystem && !["admin", "director", "teacher"].includes(user.role)) {
      throw new AppError("Noto‘g‘ri foydalanuvchi roli.", 400);
    }
    if (user.canAccessSystem && user.role === "admin" && req.user.role !== "admin") {
      throw new AppError("Administrator rolini berish uchun ruxsat yetarli emas.", 403);
    }

    await user.save();
    res.json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user._id.toString()) {
      throw new AppError("O‘z hisobingizni o‘chira olmaysiz.", 400);
    }
    const user = await User.findOne({
      _id: req.params.id,
      role: { $in: ["admin", "director", "teacher"] },
    });
    if (!user) throw new AppError("Xodim topilmadi.", 404);
    if (user.role === "admin" && req.user.role !== "admin") {
      throw new AppError("Administratorni o‘chirish uchun ruxsat yetarli emas.", 403);
    }
    await user.deleteOne();
    res.json({ success: true, message: "Xodim o‘chirildi." });
  } catch (error) {
    next(error);
  }
}
