import { OrgRole } from "@prisma/client";
import { z } from "zod";

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrgRole).default("VIEWER"),
  projectId: z.string().min(1).optional(),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(OrgRole),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const setCanViewAllProjectsSchema = z.object({
  canViewAllProjects: z.boolean(),
});
export type SetCanViewAllProjectsInput = z.infer<typeof setCanViewAllProjectsSchema>;
