import { asyncHandler } from "../../common/middleware/asyncHandler";
import { UnauthorizedError } from "../../common/errors/AppError";
import { verifyAccessToken } from "./tokens";
import { authenticateApiToken, TOKEN_PREFIX } from "../apiTokens/apiToken.service";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing access token");
  }

  const token = header.slice("Bearer ".length);

  if (token.startsWith(TOKEN_PREFIX)) {
    const apiToken = await authenticateApiToken(token);
    if (!apiToken) {
      throw new UnauthorizedError("Invalid or revoked API token");
    }
    req.user = { id: apiToken.createdBy.id, email: apiToken.createdBy.email };
    req.apiTokenId = apiToken.id;
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }

  next();
});
