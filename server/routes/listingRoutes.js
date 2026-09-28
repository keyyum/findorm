import express from "express";
import {
  addListing,
  getListings,
  getMyListings,
  getListingById,
  addListingPhotos,
  deleteListingPhoto,
  deleteListing,
  updateListingAvailability,
  updateListing,
} from "../controllers/listingController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { uploadPhotos } from "../middleware/upload.js";

const router = express.Router();

// "Who can call it" follows docs/api-spec.md → Listings. Ownership of a
// specific listing ("own") is checked in the controller.

// GET routes — /mine must come before /:id
router.get("/", getListings);
router.get("/mine", authenticateToken, requireRole("owner"), getMyListings);
router.get("/:id", getListingById);

// POST routes
router.post("/", authenticateToken, requireRole("owner"), addListing);
router.post("/:id/photos", authenticateToken, requireRole("owner"), uploadPhotos, addListingPhotos);

// PATCH routes
router.patch("/:id", authenticateToken, requireRole("owner", "admin"), updateListing);
router.patch("/:id/availability", authenticateToken, requireRole("owner"), updateListingAvailability);

// DELETE routes
router.delete("/:id/photos/:photoId", authenticateToken, requireRole("owner"), deleteListingPhoto);
router.delete("/:id", authenticateToken, requireRole("owner", "admin"), deleteListing);

export default router;
