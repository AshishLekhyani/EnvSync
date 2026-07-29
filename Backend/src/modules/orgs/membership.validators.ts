import { OrgRole } from "@prisma/client";
import { z } from "zod";

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrgRole).default("VIEWER"),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(OrgRole),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
