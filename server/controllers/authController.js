import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { httpError } from "../middleware/errorHandler.js";

// Token goes back in the response body; the client stores it and sends it as
// `Authorization: Bearer <token>`. Logout is client-side (D-13), so no cookie.
const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : email);

/** Password rules from docs/data-model.md. bcrypt ignores anything past 72 bytes. */
export function passwordError(password) {
  if (typeof password !== "string" || password.length < 8) return "Use at least 8 characters.";
  if (Buffer.byteLength(password) > 72) return "Use 72 characters or fewer.";
  return null;
}

// POST /api/auth/register — FR-01
export const register = async (req, res) => {
  const { firstName, lastName, password, role, phone } = req.body;
  const email = normalizeEmail(req.body.email);

  // Admin accounts only come from the seed script (D-09).
  if (!["seeker", "owner"].includes(role)) {
    throw httpError(400, "Please fix the highlighted fields.", { role: "Choose seeker or owner." });
  }

  const pwError = passwordError(password);
  if (pwError) {
    throw httpError(400, "Please fix the highlighted fields.", { password: pwError });
  }

  if (await User.exists({ email })) {
    throw httpError(409, "That email is already registered.", { email: "That email is already registered." });
  }

  // Validate everything else before spending time on the hash.
  const user = new User({ firstName, lastName, email, password: "unhashed", role, phone: phone || undefined });
  await user.validate();
  user.password = await bcrypt.hash(password, 10);
  await user.save();

  return res.status(201).json({ token: generateToken(user), user });
};

// POST /api/auth/login — FR-02
export const login = async (req, res) => {
  const { password } = req.body;
  const email = normalizeEmail(req.body.email);

  if (!email || !password) {
    throw httpError(400, "Enter your email and password.");
  }

  const user = await User.findOne({ email }).select("+password");

  // Same message for unknown email and wrong password, so emails can't be probed.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw httpError(401, "Wrong email or password.");
  }

  // Checked after the password so this doesn't reveal which emails exist (D-08).
  if (!user.isActive) {
    throw httpError(401, "This account has been deactivated.");
  }

  return res.status(200).json({ token: generateToken(user), user });
};
