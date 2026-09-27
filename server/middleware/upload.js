import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Pass false to filter out invalid file types
    cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."), false);
  }
};

export const uploadPhotos = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file limit[cite: 17]
  fileFilter,
}).array("photos", 10); // Expect field name 'photos'[cite: 17]