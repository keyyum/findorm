import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Requires a valid token in `Authorization: Bearer <token>` (docs/api-spec.md → Auth).
 * Loads the user on every request, so a deactivated account (D-08) is cut off
 * immediately and the role always comes from the database, not the token.
 * Sets req.user = { id, role }.
 */
export const authenticateToken = async (req, res, next) => {
  const [scheme, token] = req.headers.authorization?.split(" ") || [];

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Please log in." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please log in again." });
  }

  const user = await User.findById(decoded.id).select("role isActive");
  if (!user) {
    return res.status(401).json({ message: "Please log in." });
  }
  if (!user.isActive) {
    return res.status(401).json({ message: "This account has been deactivated." });
  }

  req.user = { id: user._id.toString(), role: user.role };
  next();
};

/**
 * Only lets the listed roles through (NFR-02). Use after authenticateToken:
 *   router.post("/", authenticateToken, requireRole("owner"), addListing);
 */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Your account type can’t do this." });
    }
    next();
  };
