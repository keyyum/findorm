import express from "express";
import { addListing ,getListings, getMyListings, getListingById, addListingPhotos, deleteListingPhoto, deleteListing, updateListingAvailability,updateListing} from "../controllers/listingController.js"; // Adjust path if needed
import { authenticateToken } from "../middleware/auth.js";
import { uploadPhotos } from "../middleware/upload.js";

const router = express.Router();

// Middleware to check if the authenticated user has the 'owner' role
const requireOwner = (req, res, next) => {
  if (req.user?.role !== "owner") {
    // 403 Forbidden: Logged in, but this role isn't allowed
    return res.status(403).json({ message: "Only property owners can create listings" });
  }
  next();
};

// Middleware to handle Multer validation errors (file size/type failures)
const handleUpload = (req, res, next) => {
  uploadPhotos(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// GET routes
router.get("/", getListings);
router.get("/mine", authenticateToken, getMyListings);
router.get("/:id", getListingById);

// POST routes
router.post("/", authenticateToken, addListing);
router.post("/:id/photos", authenticateToken, handleUpload, addListingPhotos);

// PATCH routes
router.patch("/:id", authenticateToken, updateListing); // <--- Added
router.patch("/:id/availability", authenticateToken, updateListingAvailability);

// DELETE routes
router.delete("/:id/photos/:photoId", authenticateToken, deleteListingPhoto);
router.delete("/:id", authenticateToken, deleteListing);

export default router;