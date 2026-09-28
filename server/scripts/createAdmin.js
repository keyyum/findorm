/**
 * Creates an admin account. Admins can't sign up through the API (D-09).
 *
 *   ADMIN_EMAIL=admin@findorm.test ADMIN_PASSWORD='a-long-password' npm run create-admin
 *
 * Optional: ADMIN_FIRST_NAME, ADMIN_LAST_NAME (default "FINDorm" "Admin").
 * Uses MONGO_URI from server/.env.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { passwordError } from "../controllers/authController.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const firstName = process.env.ADMIN_FIRST_NAME || "FINDorm";
const lastName = process.env.ADMIN_LAST_NAME || "Admin";

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!email || !password) fail("Set ADMIN_EMAIL and ADMIN_PASSWORD. See the comment at the top of scripts/createAdmin.js.");
const pwError = passwordError(password);
if (pwError) fail(`ADMIN_PASSWORD: ${pwError}`);

await connectDB();

const existing = await User.findOne({ email });
if (existing) {
  await mongoose.disconnect();
  // Roles can't change after registration (docs/data-model.md), so don't promote.
  fail(existing.role === "admin" ? `${email} is already an admin.` : `${email} is already registered as a ${existing.role}. Use another email.`);
}

const user = new User({ firstName, lastName, email, password: "unhashed", role: "admin" });
await user.validate();
user.password = await bcrypt.hash(password, 10);
await user.save();

console.log(`Admin created: ${email}`);
await mongoose.disconnect();
