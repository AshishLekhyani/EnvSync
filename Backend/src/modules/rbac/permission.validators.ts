import { z } from "zod";

export const setPermissionOverrideSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "DEVELOPER", "VIEWER"]),
  environmentType: z.enum(["DEVELOPMENT", "TESTING", "STAGING", "PRODUCTION"]),
  access: z.enum(["NONE", "READ", "WRITE"]).nullable(),
});
export type SetPermissionOverrideInput = z.infer<typeof setPermissionOverrideSchema>;
