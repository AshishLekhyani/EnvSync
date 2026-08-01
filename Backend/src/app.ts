import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requestLogger } from "./common/middleware/requestLogger";
import { errorHandler } from "./common/middleware/errorHandler";
import { notFoundHandler } from "./common/middleware/notFoundHandler";
import { apiRateLimiter } from "./common/middleware/rateLimit";
import { authRouter } from "./modules/auth/auth.routes";
import { orgRouter } from "./modules/orgs/org.routes";
import { orgProjectsRouter, projectRouter } from "./modules/projects/project.routes";
import {
  environmentRouter,
  projectEnvironmentsRouter,
} from "./modules/environments/environment.routes";
import {
  environmentSecretsRouter,
  secretRouter,
} from "./modules/secrets/secret.routes";
import { orgAuditLogsRouter } from "./modules/audit/audit.routes";
import { orgApiTokensRouter } from "./modules/apiTokens/apiToken.routes";
import { notificationsRouter } from "./modules/notifications/notification.routes";
import { orgPermissionsRouter } from "./modules/rbac/permission.routes";
import { orgInvitesRouter, publicInvitesRouter } from "./modules/invites/invite.routes";
import {
  createAccessRequestRouter,
  orgAccessRequestsRouter,
} from "./modules/projectAccessRequests/projectAccessRequest.routes";

let cliVersionCache: { version: string | null; fetchedAt: number } | null = null;
const CLI_VERSION_CACHE_MS = 60 * 60 * 1000;

export function createApp() {
  const app = express();

  app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/meta/cli-version", async (_req, res) => {
    const now = Date.now();
    if (!cliVersionCache || now - cliVersionCache.fetchedAt > CLI_VERSION_CACHE_MS) {
      try {
        const npmRes = await fetch(
          "https://registry.npmjs.org/@ashishlekhyani/envsync-cli/latest"
        );
        const data = npmRes.ok ? ((await npmRes.json()) as { version?: string }) : {};
        cliVersionCache = { version: data.version ?? null, fetchedAt: now };
      } catch {
        cliVersionCache = { version: null, fetchedAt: now };
      }
    }
    res.status(200).json({ version: cliVersionCache.version });
  });

  app.use("/api", apiRateLimiter);

  app.use("/api/auth", authRouter);
  app.use("/api/orgs", orgRouter);
  app.use("/api/orgs/:orgId/projects", orgProjectsRouter);
  app.use("/api/projects", projectRouter);
  app.use("/api/projects/:projectId/environments", projectEnvironmentsRouter);
  app.use("/api/environments", environmentRouter);
  app.use("/api/environments/:environmentId/secrets", environmentSecretsRouter);
  app.use("/api/secrets", secretRouter);
  app.use("/api/orgs/:orgId/audit-logs", orgAuditLogsRouter);
  app.use("/api/orgs/:orgId/tokens", orgApiTokensRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/orgs/:orgId/permissions", orgPermissionsRouter);
  app.use("/api/orgs/:orgId/invites", orgInvitesRouter);
  app.use("/api/invites", publicInvitesRouter);
  app.use(
    "/api/orgs/:orgId/projects/:projectId/access-requests",
    createAccessRequestRouter
  );
  app.use("/api/orgs/:orgId/project-access-requests", orgAccessRequestsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
