import express from "express";
import { register, login} from "../controllers/authController.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,                 // maximum 5 requests
  message: {
    error: "Too many login attempts. Try again later."
  }
});

router.post("/register", register);
router.post("/login", loginLimiter,login);


export default router;