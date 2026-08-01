import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as projectService from "./project.service";
import {
  canBrowseAllProjects,
  getAccessibleProjectIds,
  getProjectRole,
} from "../rbac/projectAccess.service";
import { CreateProjectInput, UpdateProjectInput } from "./project.validators";

export const createProject = asyncHandler(async (req, res) => {
  const result = await projectService.createProject(
    req.params.orgId,
    req.body as CreateProjectInput,
    req.user!.id,
    req.membership!.role,
    req.ip
  );
  if (result.kind === "created") {
    res.status(201).json({ status: "created", project: result.project });
  } else {
    res.status(202).json({ status: "pending", request: result.request });
  }
});

export const listProjectCreationRequests = asyncHandler(async (req, res) => {
  const requests = await projectService.listProjectCreationRequests(req.params.orgId);
  res.status(200).json(requests);
});

export const approveProjectCreationRequest = asyncHandler(async (req, res) => {
  const project = await projectService.approveProjectCreationRequest(
    req.params.orgId,
    req.params.requestId,
    req.user!.id,
    req.ip
  );
  res.status(200).json(project);
});

export const rejectProjectCreationRequest = asyncHandler(async (req, res) => {
  await projectService.rejectProjectCreationRequest(
    req.params.orgId,
    req.params.requestId,
    req.user!.id,
    req.ip
  );
  res.status(204).send();
});

export const listCreateAutoApproveRules = asyncHandler(async (req, res) => {
  const rules = await projectService.listCreateAutoApproveRules(req.params.orgId);
  res.status(200).json(rules);
});

export const enableCreateAutoApprove = asyncHandler(async (req, res) => {
  await projectService.enableCreateAutoApprove(
    req.params.orgId,
    req.params.adminId,
    req.user!.id
  );
  res.status(204).send();
});

export const disableCreateAutoApprove = asyncHandler(async (req, res) => {
  await projectService.disableCreateAutoApprove(req.params.orgId, req.params.adminId);
  res.status(204).send();
});

export const listProjects = asyncHandler(async (req, res) => {
  const accessibleProjectIds = await getAccessibleProjectIds(
    req.params.orgId,
    req.user!.id,
    req.membership!.role,
    req.membership!
  );
  const browseAll =
    accessibleProjectIds !== "all" && canBrowseAllProjects(req.membership!.role);
  const projects = await projectService.listProjects(
    req.params.orgId,
    accessibleProjectIds,
    browseAll,
    req.user!.id,
    req.membership!.role
  );
  res.status(200).json(projects);
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.params.projectId);
  const myRole = await getProjectRole(req.user!.id, req.params.projectId, req.membership!.role);
  res.status(200).json({ ...project, myRole });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(
    req.params.projectId,
    req.body as UpdateProjectInput,
    req.user!.id,
    req.ip
  );
  res.status(200).json(project);
});

export const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.projectId, req.user!.id, req.ip);
  res.status(204).send();
});
