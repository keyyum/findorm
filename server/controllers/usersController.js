import bcrypt from "bcrypt";
import User from "../models/User.js";
import { httpError } from "../middleware/errorHandler.js";
import { passwordError } from "./authController.js";

// GET /api/users/me — FR-03
export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw httpError(404, "User not found.");
  }

  return res.status(200).json(user);
};

// PATCH /api/users/me — FR-03. Only these fields can change; role and isActive are ignored.
export const updateMe = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw httpError(404, "User not found.");
  }

  const { firstName, lastName, email, phone } = req.body;
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (email !== undefined) {
    const normalized = typeof email === "string" ? email.trim().toLowerCase() : email;
    if (normalized !== user.email && (await User.exists({ email: normalized }))) {
      throw httpError(409, "That email is already registered.", { email: "That email is already registered." });
    }
    user.email = normalized;
  }
  // An empty phone removes it (it's optional).
  if (phone !== undefined) user.phone = phone || undefined;

  await user.save();
  return res.status(200).json(user);
};

// PATCH /api/users/me/password — FR-03
export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const pwError = passwordError(newPassword);
  if (pwError) {
    throw httpError(400, "Please fix the highlighted fields.", { newPassword: pwError });
  }

  const user = await User.findById(req.user.id).select("+password");

  if (!user) {
    throw httpError(404, "User not found.");
  }

  if (!(await bcrypt.compare(currentPassword || "", user.password))) {
    throw httpError(401, "Your current password is wrong.");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.status(204).send();
};
