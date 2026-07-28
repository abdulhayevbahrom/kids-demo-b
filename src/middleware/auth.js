import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/token.js";

export async function protect(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError("Tizimga kirish talab qilinadi.", 401);
    }

    const payload = verifyToken(header.slice(7));
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AppError("Foydalanuvchi topilmadi yoki faol emas.", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new AppError("Sessiya yaroqsiz yoki muddati tugagan.", 401));
    }
    next(error);
  }
}

export function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("Bu amal uchun ruxsat yetarli emas.", 403));
    }
    next();
  };
}

export function allowPermission(permission) {
  return (req, _res, next) => {
    if (req.user.role === "admin" || req.user.permissions?.includes(permission)) {
      return next();
    }
    next(new AppError("Bu bo‘lim uchun ruxsat berilmagan.", 403));
  };
}
