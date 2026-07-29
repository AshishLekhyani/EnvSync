import { EnvironmentType } from "@prisma/client";
import { z } from "zod";

export const createEnvironmentSchema = z.object({
  type: z.nativeEnum(EnvironmentType),
  name: z.string().min(1).max(60).optional(),
});
export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;
