import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as auditService from "./audit.service";
import { getAccessibleProjectIds } from "../rbac/projectAccess.service";
import { ListAuditLogsQuery } from "./audit.validators";

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
      limit: query.limit,
    },
    accessibleProjectIds
  );
  res.status(200).json(logs);
});
