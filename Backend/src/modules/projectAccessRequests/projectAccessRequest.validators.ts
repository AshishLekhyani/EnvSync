import { z } from "zod";

export const createAccessRequestSchema = z.object({
  projectId: z.string().min(1),
});
export type CreateAccessRequestInput = z.infer<typeof createAccessRequestSchema>;
