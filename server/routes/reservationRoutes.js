import express from "express";
import {
  createReservation,
  getMyReservations,
  getIncomingReservations,
  acceptReservation,
  rejectReservation,
  withdrawReservation,
} from "../controllers/reservationController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// "Who can call it" follows docs/api-spec.md → Reservations. Ownership of a
// specific request ("own") is checked in the controller.
router.use(authenticateToken);

router.post("/", requireRole("seeker"), createReservation);
router.get("/mine", requireRole("seeker"), getMyReservations);
router.get("/incoming", requireRole("owner"), getIncomingReservations);
router.patch("/:id/accept", requireRole("owner"), acceptReservation);
router.patch("/:id/reject", requireRole("owner"), rejectReservation);
router.delete("/:id", requireRole("seeker"), withdrawReservation);

export default router;
