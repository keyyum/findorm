import mongoose from "mongoose";
import { ROLES } from "../config/constants.js";

// docs/data-model.md → User
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Enter your first name."],
      trim: true,
      maxlength: [50, "Use 50 characters or fewer."],
    },
    lastName: {
      type: String,
      required: [true, "Enter your last name."],
      trim: true,
      maxlength: [50, "Use 50 characters or fewer."],
    },
    email: {
      type: String,
      required: [true, "Enter your email."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."],
    },
    // bcrypt hash only (NFR-01). Never returned unless asked for with .select("+password").
    password: {
      type: String,
      required: true,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    // Cannot be changed after registration; admins only come from the seed script (D-09).
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^09\d{9}$/, "Use the format 09XXXXXXXXX (11 digits)."],
    },
    // false blocks login and every authenticated request (D-08).
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const User = mongoose.model("User", userSchema);
export default User;
