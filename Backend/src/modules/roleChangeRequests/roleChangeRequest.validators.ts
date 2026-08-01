import { z } from "zod";

export const createRoleChangeRequestSchema = z.object({
  requestedRole: z.enum(["ADMIN", "DEVELOPER", "VIEWER"]),
});
export type CreateRoleChangeRequestInput = z.infer<typeof createRoleChangeRequestSchema>;
