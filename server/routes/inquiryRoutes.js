import express from "express";
import {
  createInquiry,
  getInquiries,
  getInquiryById,
  addInquiryMessage,
} from "../controllers/inquiryController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { messageLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// "Who can call it" follows docs/api-spec.md → Inquiries. Being part of a
// specific thread (its seeker or owner) is checked in the controller.
router.use(authenticateToken);

// Owners can start a thread too, from one of their reservation requests.
router.post("/", requireRole("seeker", "owner"), messageLimiter, createInquiry);
router.get("/", requireRole("seeker", "owner"), getInquiries);
router.get("/:id", requireRole("seeker", "owner"), getInquiryById);
router.post("/:id/messages", requireRole("seeker", "owner"), messageLimiter, addInquiryMessage);

export default router;
