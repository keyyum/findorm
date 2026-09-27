import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";


// GET /api/users/me
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "Not found" });
        }

        return res.status(200).json(user);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// PATCH /api/users/me
export const updateMe = async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;

    try {
        const updates = {};

        if (firstName !== undefined) updates.firstName = firstName;
        if (lastName !== undefined) updates.lastName = lastName;
        if (email !== undefined) updates.email = email;
        if (phone !== undefined) updates.phone = phone;

        // Check email uniqueness if updating email
        if (email !== undefined) {
            const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
            if (existingUser) {
                return res.status(409).json({ message: "Email already taken" });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id, // Use req.user.id from token, not req.params.id
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json(user);

    } catch (err) {
        return res.status(400).json({
            message: "Invalid input"
        });
    }
};

// PATCH /api/users/me/password
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 400 Bad Request: Validate minimum password length requirement (NFR-05 style validation)[cite: 2, 5]
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }

    // Retrieve user including the password field (since it is excluded by default)
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password match
    const isMatch = await bcrypt.compare(currentPassword || "", user.password);
    
    // 401 Unauthorized: Current password incorrect
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is wrong" });
    }

    // Hash the new password and update user record
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // 204 No Content: Successful update with no body returned[cite: 5]
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};