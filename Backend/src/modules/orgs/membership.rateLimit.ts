import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { NextFunction, Request, Response } from "express";
import { TooManyRequestsError } from "../../common/errors/AppError";

export const checkEmailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new TooManyRequestsError("Too many attempts. Please try again later."));
  },
});
