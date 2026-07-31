import rateLimit from "express-rate-limit";
import { NextFunction, Request, Response } from "express";
import { TooManyRequestsError } from "../errors/AppError";

export const apiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new TooManyRequestsError("Too many requests. Please try again later."));
  },
});
