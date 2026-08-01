import { z } from "zod";

export const createAccessRequestSchema = z.object({
  requestedRole: z.enum(["ADMIN", "DEVELOPER", "VIEWER"]).optional(),
});
export type CreateAccessRequestInput = z.infer<typeof createAccessRequestSchema>;
