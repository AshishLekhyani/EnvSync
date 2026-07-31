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
  max: 40,
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

export const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: rateLimitHandler,
});
