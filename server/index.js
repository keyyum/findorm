import "dotenv/config";
import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "findorm-api" });
});

// Feature routes are mounted here as each module is built.
// Example, once the accounts module exists (FR-01 to FR-03):
//   import authRoutes from "./routes/auth.routes.js";
//   app.use("/api/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`FINDorm API listening on http://localhost:${PORT}`);
  });
});
