import bcrypt from "bcrypt";
import User from "../models/User.js";
import { httpError } from "../middleware/errorHandler.js";
import { generateToken, passwordError } from "./authController.js";

/**
 * Wrong or missing current password is a 400 with a field error, not a 401, so
 * every 401 keeps meaning "your session ended" (findorm-loopholes #3).
 */
async function checkCurrentPassword(user, currentPassword) {
  if (!currentPassword) {
    throw httpError(400, "Please fix the highlighted fields.", { currentPassword: "Enter your current password." });
  }
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw httpError(400, "Please fix the highlighted fields.", { currentPassword: "Your current password is wrong." }, "WRONG_PASSWORD");
  }
}

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
  const user = await User.findById(req.user.id).select("+password");

  if (!user) {
    throw httpError(404, "User not found.");
  }

  const { firstName, lastName, email, phone, currentPassword } = req.body;
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (email !== undefined) {
    const normalized = typeof email === "string" ? email.trim().toLowerCase() : email;
    // Changing the email (the login name) needs the password, so a stolen
    // session can't take over the account (findorm-loopholes #7).
    if (normalized !== user.email) {
      await checkCurrentPassword(user, currentPassword);
      if (await User.exists({ email: normalized })) {
        throw httpError(409, "That email is already registered.", { email: "That email is already registered." }, "EMAIL_TAKEN");
      }
      user.email = normalized;
    }
  }
  // An empty phone removes it (it's optional).
  if (phone !== undefined) user.phone = phone || undefined;

  await user.save();
  return res.status(200).json(user);
};

// PATCH /api/users/me/password — FR-03
// Signs out every other device and returns a fresh token for this one (findorm-loopholes #6).
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

  await checkCurrentPassword(user, currentPassword);

  user.password = await bcrypt.hash(newPassword, 10);
  // Tokens issued before this moment stop working (checked in middleware/auth.js).
  user.passwordChangedAt = new Date();
  await user.save();

  return res.status(200).json({ token: generateToken(user) });
};
