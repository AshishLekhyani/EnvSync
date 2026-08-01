import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { orgIdFromParam, requireOrgRole } from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as orgController from "./org.controller";
import * as membershipController from "./membership.controller";
import { checkEmailRateLimiter } from "./membership.rateLimit";
import { createOrgSchema, updateOrgSchema } from "./org.validators";
import {
  checkEmailQuerySchema,
  grantProjectAccessSchema,
  setCanViewAllProjectsSchema,
  transferOwnershipSchema,
} from "./membership.validators";

export const orgRouter = Router();

orgRouter.use(requireAuth);

orgRouter.post("/", validate({ body: createOrgSchema }), orgController.createOrg);
orgRouter.get("/", orgController.listOrgs);

orgRouter.get(
  "/:orgId",
  requireOrgRole("VIEWER", orgIdFromParam()),
  orgController.getOrg
);
orgRouter.patch(
  "/:orgId",
  requireOrgRole("OWNER", orgIdFromParam()),
  validate({ body: updateOrgSchema }),
  orgController.updateOrg
);
orgRouter.delete(
  "/:orgId",
  requireOrgRole("OWNER", orgIdFromParam()),
  orgController.deleteOrg
);
orgRouter.get(
  "/:orgId/export",
  requireOrgRole("OWNER", orgIdFromParam()),
  orgController.exportOrgData
);

orgRouter.get(
  "/:orgId/members",
  requireOrgRole("VIEWER", orgIdFromParam()),
  membershipController.listMembers
);
orgRouter.get(
  "/:orgId/members/check-email",
  checkEmailRateLimiter,
  requireOrgRole("VIEWER", orgIdFromParam()),
  validate({ query: checkEmailQuerySchema }),
  membershipController.checkEmailExists
);
orgRouter.delete(
  "/:orgId/members/:membershipId",
  requireOrgRole("VIEWER", orgIdFromParam()),
  membershipController.removeMember
);
orgRouter.post(
  "/:orgId/members/:membershipId/projects/:projectId",
  requireOrgRole("VIEWER", orgIdFromParam()),
  validate({ body: grantProjectAccessSchema }),
  membershipController.grantProjectAccess
);
orgRouter.delete(
  "/:orgId/members/:membershipId/projects/:projectId",
  requireOrgRole("VIEWER", orgIdFromParam()),
  membershipController.revokeProjectAccess
);
orgRouter.patch(
  "/:orgId/members/:membershipId/view-all",
  requireOrgRole("OWNER", orgIdFromParam()),
  validate({ body: setCanViewAllProjectsSchema }),
  membershipController.setCanViewAllProjects
);
orgRouter.post(
  "/:orgId/leave",
  requireOrgRole("VIEWER", orgIdFromParam()),
  membershipController.leaveOrganization
);
orgRouter.post(
  "/:orgId/projects/:projectId/leave",
  requireOrgRole("VIEWER", orgIdFromParam()),
  membershipController.leaveProject
);
orgRouter.post(
  "/:orgId/transfer-ownership",
  requireOrgRole("OWNER", orgIdFromParam()),
  validate({ body: transferOwnershipSchema }),
  membershipController.transferOwnership
);
