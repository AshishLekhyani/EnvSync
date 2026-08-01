import { z } from "zod";

export const createInviteSchema = z
  .object({
    email: z.string().email(),
    role: z.enum(["OWNER", "ADMIN", "DEVELOPER", "VIEWER"]).default("DEVELOPER"),
    projectId: z.string().min(1).optional(),
  })
  .refine((data) => data.role === "OWNER" || data.role === "VIEWER" || !!data.projectId, {
    message: "A project must be selected when inviting an Admin or Developer",
    path: ["projectId"],
  });
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const setBlanketAutoApproveSchema = z.object({
  enabled: z.boolean(),
});
export type SetBlanketAutoApproveInput = z.infer<typeof setBlanketAutoApproveSchema>;
