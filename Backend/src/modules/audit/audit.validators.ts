import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  projectId: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
  // Plain "YYYY-MM-DD" from a date input, not a full ISO datetime -- parsed
  // and range-bounded in the service, same loose-string convention this
  // codebase already uses for expiresAt elsewhere.
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
