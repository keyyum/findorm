import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

// Tokens can't be signed or checked without a secret, and a default one would
// let anyone forge logins. Refuse to start instead.
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5050;

// Behind a proxy or host (Render, Heroku, nginx), every request would look like
// it comes from the proxy's IP and the IP-based rate limits would lock everyone
// out together. Set TRUST_PROXY to the number of proxies in front (usually 1).
const trustProxy = Number(process.env.TRUST_PROXY);
if (Number.isInteger(trustProxy) && trustProxy > 0) app.set("trust proxy", trustProxy);

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "findorm-api" });
});

// Demo photos from scripts/seedDorms.js when Cloudinary isn't set up (local only).
const seedImages = path.join(path.dirname(fileURLToPath(import.meta.url)), "scripts/seed-data/images");
app.use("/api/seed-images", express.static(seedImages, { fallthrough: false }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`FINDorm API listening on http://localhost:${PORT}`);
  });
});
