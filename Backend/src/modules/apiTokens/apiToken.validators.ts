import { z } from "zod";

export const createApiTokenSchema = z.object({
  name: z.string().min(1).max(100),
});
export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;
