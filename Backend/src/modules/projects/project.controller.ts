import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as projectService from "./project.service";
import { getAccessibleProjectIds } from "../rbac/projectAccess.service";
import { CreateProjectInput, UpdateProjectInput } from "./project.validators";

export const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(
    req.params.orgId,
    req.body as CreateProjectInput,
    req.user!.id,
    req.ip
  );
  res.status(201).json(project);
});

export const listProjects = asyncHandler(async (req, res) => {
  const accessibleProjectIds = await getAccessibleProjectIds(
    req.params.orgId,
    req.user!.id,
    req.membership!.role,
    req.membership!
  );
  const projects = await projectService.listProjects(req.params.orgId, accessibleProjectIds);
  res.status(200).json(projects);
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.params.projectId);
  res.status(200).json(project);
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
