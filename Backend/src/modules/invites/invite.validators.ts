import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "DEVELOPER", "VIEWER"]).default("DEVELOPER"),
  projectId: z.string().min(1).optional(),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
