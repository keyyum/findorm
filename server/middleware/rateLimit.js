import rateLimit from "express-rate-limit";

/**
 * Rate limits (findorm-loopholes #8 and #13). Limits are per window and can be
 * tuned in .env. Set RATE_LIMIT=off to turn them all off, e.g. when running
 * tests/api.test.mjs several times in a row from one machine.
 */
const off = () => process.env.RATE_LIMIT === "off";
const num = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

// Same response shape as every other error (docs/api-spec.md → Errors).
const tooMany = (message) => (req, res, next, options) =>
  res.status(options.statusCode).json({ message, code: "RATE_LIMITED" });

const MINUTES_15 = 15 * 60 * 1000;

// Failed logins only, so people who type their password right are never locked out.
export const loginLimiter = rateLimit({
  windowMs: MINUTES_15,
  limit: () => num("LOGIN_RATE_LIMIT", 10),
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: off,
  handler: tooMany("Too many failed login attempts. Wait 15 minutes and try again."),
});

// Every sign-up counts, to slow down mass account creation.
export const registerLimiter = rateLimit({
  windowMs: MINUTES_15,
  limit: () => num("REGISTER_RATE_LIMIT", 20),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: off,
  handler: tooMany("Too many sign-ups from this network. Wait 15 minutes and try again."),
});

// Per user, not per IP: use after authenticateToken.
export const messageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: () => num("MESSAGE_RATE_LIMIT", 30),
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: off,
  handler: tooMany("You're sending messages too fast. Wait a few minutes and try again."),
});
