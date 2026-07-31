import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as auditService from "./audit.service";
import { getAccessibleProjectIds } from "../rbac/projectAccess.service";
import { ListAuditLogsQuery, PurgeAuditLogsQuery } from "./audit.validators";

export const listAuditLogs = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListAuditLogsQuery;
  const accessibleProjectIds = await getAccessibleProjectIds(
    req.params.orgId,
    req.user!.id,
    req.membership!.role,
    req.membership!
  );
  const logs = await auditService.listAuditLogs(
    req.params.orgId,
    {
      projectId: query.projectId,
      action: query.action,
      actorId: query.actorId,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      page: query.page,
    },
    accessibleProjectIds
  );
  res.status(200).json(logs);
});

export const purgeAuditLogs = asyncHandler(async (req, res) => {
  const query = req.query as unknown as PurgeAuditLogsQuery;
  const result = await auditService.purgeAuditLogs(
    req.params.orgId,
    query.before,
    req.user!.id,
    req.ip
  );
  res.status(200).json(result);
});
