import express from "express";
import { getUsers, updateUserStatus, getAllListings } from "../controllers/adminController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Everything under /api/admin is admin only (docs/api-spec.md → Administration).
// Admins edit and delete listings through the normal /api/listings routes.
router.use(authenticateToken, requireRole("admin"));

router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);
router.get("/listings", getAllListings);

export default router;
