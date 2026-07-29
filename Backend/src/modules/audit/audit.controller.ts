import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as auditService from "./audit.service";
import { ListAuditLogsQuery } from "./audit.validators";

export const listAuditLogs = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListAuditLogsQuery;
  const logs = await auditService.listAuditLogs(req.params.orgId, {
    projectId: query.projectId,
    action: query.action,
    limit: query.limit,
  });
  res.status(200).json(logs);
});
