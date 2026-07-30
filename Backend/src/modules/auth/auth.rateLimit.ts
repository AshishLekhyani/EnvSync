import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { NextFunction, Request, Response } from "express";
import { TooManyRequestsError } from "../../common/errors/AppError";

function rateLimitHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new TooManyRequestsError("Too many attempts. Please try again later."));
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "unknown";
    return `${ipKeyGenerator(req.ip ?? "")}:${email}`;
  },
  handler: rateLimitHandler,
});

export const signupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // Project-scoped invites (Phase 11) make "several teammates signing up from
  // the same office IP within an hour" a realistic legitimate scenario, not
  // just abuse — bumped up from 8 to give that room while still bounding bots.
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: rateLimitHandler,
});

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: rateLimitHandler,
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: rateLimitHandler,
});

// Separate from forgotPasswordRateLimiter: submitting a reset token means guessing a 256-bit
// value, which a generous limit doesn't meaningfully aid — unlike forgot-password's account
// enumeration/spam risk, which is why that one stays tight.
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: rateLimitHandler,
});
