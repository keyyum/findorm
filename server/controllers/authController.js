import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Helper function to sign tokens
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1h" }
  );
};

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone } = req.body;

    // 400 Bad Request: Invalid input (missing mandatory fields)
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // 400 Bad Request: Invalid input (disallowed role or admin request)
    if (role === "admin" || !["seeker", "owner"].includes(role)) {
      return res.status(400).json({ message: "Role must be 'seeker' or 'owner'." });
    }

    // 400 Bad Request: Invalid input (password shorter than 8 chars)
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password should contain minimum of 8 characters"
      });
    }

    // 409 Conflict: Conflicts with current state (email taken)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      phone
    });

    const token = generateToken(newUser);

    res.cookie("findorm_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000
    });

    const userResponse = newUser.toObject();
    delete userResponse.password;

    // 201 Created -> { "token": "...", "user": User }
    return res.status(201).json({
      token,
      user: userResponse
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 400 Bad Request: Invalid input (missing login fields)
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    // 401 Unauthorized: Wrong email or bad credentials
    if (!user) {
      return res.status(401).json({ message: "Wrong email or password" });
    }

    // 401 Unauthorized: Account deactivated
    if (user.isDeactivated) {
      return res.status(401).json({ message: "Account deactivated" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    // 401 Unauthorized: Wrong password or bad credentials
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong email or password" });
    }

    const token = generateToken(user);

    res.cookie("findorm_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    // 200 OK -> { "token": "...", "user": User }
    return res.status(200).json({
      token,
      user: userResponse
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};