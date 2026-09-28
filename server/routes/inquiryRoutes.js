import express from "express";
import {
  createInquiry,
  getInquiries,
  getInquiryById,
  addInquiryMessage,
} from "../controllers/inquiryController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// "Who can call it" follows docs/api-spec.md → Inquiries. Being part of a
// specific thread (its seeker or owner) is checked in the controller.
router.use(authenticateToken);

router.post("/", requireRole("seeker"), createInquiry);
router.get("/", requireRole("seeker", "owner"), getInquiries);
router.get("/:id", requireRole("seeker", "owner"), getInquiryById);
router.post("/:id/messages", requireRole("seeker", "owner"), addInquiryMessage);

export default router;
