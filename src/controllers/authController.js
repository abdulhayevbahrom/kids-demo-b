import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { createToken } from "../utils/token.js";

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new AppError("Login va parolni kiriting.", 400);
    }

    const normalizedUsername = username.toLowerCase().trim();
    const user = await User.findOne({
      username: normalizedUsername,
      canAccessSystem: true,
    }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError("Login yoki parol noto‘g‘ri.", 401);
    }
    if (!user.isActive) {
      throw new AppError("Hisob faol emas. Administratorga murojaat qiling.", 403);
    }

    res.json({
      success: true,
      token: createToken(user),
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}

export function me(req, res) {
  res.json({ success: true, user: req.user.toSafeObject() });
}
