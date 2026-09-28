import multer from "multer";
import { MAX_PHOTO_BYTES, MAX_PHOTOS, PHOTO_TYPES } from "../config/constants.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (PHOTO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Use JPEG, PNG, or WebP images only."), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_PHOTO_BYTES }, // 5 MB per file
  fileFilter,
}).array("photos", MAX_PHOTOS); // Field name 'photos' (docs/api-spec.md)

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: "Each photo must be 5 MB or smaller.",
  LIMIT_FILE_COUNT: `A listing can have up to ${MAX_PHOTOS} photos.`,
  LIMIT_UNEXPECTED_FILE: "Send photos in the 'photos' field.",
};

/** Runs multer and turns its errors (wrong type, too big, too many) into a 400. */
export const uploadPhotos = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: MULTER_MESSAGES[err.code] || err.message });
    }
    next();
  });
};
