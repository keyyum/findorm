import express from "express";
import { getMe, updateMe, updatePassword } from "../controllers/usersController.js";
import { authenticateToken } from "../middleware/auth.js"; // Adjust path as needed

const router = express.Router();

router.get("/me", authenticateToken, getMe);
router.patch("/me", authenticateToken, updateMe);
router.patch("/me/password", authenticateToken, updatePassword);


export default router;