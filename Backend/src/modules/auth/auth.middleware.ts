import { asyncHandler } from "../../common/middleware/asyncHandler";
import { UnauthorizedError } from "../../common/errors/AppError";
import { verifyAccessToken } from "./tokens";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing access token");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }

  next();
});
