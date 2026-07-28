import { Router } from "express";
import { createUser, deleteUser, listUsers, updateUser } from "../controllers/userController.js";
import { allowPermission, protect } from "../middleware/auth.js";

export const userRouter = Router();

userRouter.use(protect, allowPermission("employees"));
userRouter.route("/").get(listUsers).post(createUser);
userRouter.route("/:id").patch(updateUser).delete(deleteUser);
