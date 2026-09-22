import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; // Add cookie-parser

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js"; // Import your new auth routes
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
app.use(cookieParser()); // Add cookie-parser middleware

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "findorm-api" });
});

// Mount your auth routes here
app.use("/api/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`FINDorm API listening on http://localhost:${PORT}`);
  });
});