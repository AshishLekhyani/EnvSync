import { z } from "zod";

export const checkEmailQuerySchema = z.object({
  email: z.string().email(),
});
export type CheckEmailQuery = z.infer<typeof checkEmailQuerySchema>;

export const setCanViewAllProjectsSchema = z.object({
  canViewAllProjects: z.boolean(),
});
export type SetCanViewAllProjectsInput = z.infer<typeof setCanViewAllProjectsSchema>;

export const transferOwnershipSchema = z.object({
  membershipId: z.string().min(1),
});
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

export const grantProjectAccessSchema = z.object({
  role: z.enum(["ADMIN", "DEVELOPER", "VIEWER"]),
});
export type GrantProjectAccessInput = z.infer<typeof grantProjectAccessSchema>;
