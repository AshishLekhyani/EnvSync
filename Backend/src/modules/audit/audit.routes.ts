import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { orgIdFromParam, requireOrgRole } from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as auditController from "./audit.controller";
import { listAuditLogsQuerySchema, purgeAuditLogsQuerySchema } from "./audit.validators";

export const orgAuditLogsRouter = Router({ mergeParams: true });

orgAuditLogsRouter.use(requireAuth);

orgAuditLogsRouter.get(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  validate({ query: listAuditLogsQuerySchema }),
  auditController.listAuditLogs
);

orgAuditLogsRouter.delete(
  "/",
  requireOrgRole("OWNER", orgIdFromParam()),
  validate({ query: purgeAuditLogsQuerySchema }),
  auditController.purgeAuditLogs
);
