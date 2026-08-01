import { z } from "zod";

export const createInviteSchema = z
  .object({
    email: z.string().email(),
    projectId: z.string().min(1).optional(),
    role: z.enum(["ADMIN", "DEVELOPER", "VIEWER"]).optional(),
  })
  .refine((data) => (data.projectId ? !!data.role : !data.role), {
    message: "A role is required when scoping an invite to a project (and only then)",
    path: ["role"],
  });
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
