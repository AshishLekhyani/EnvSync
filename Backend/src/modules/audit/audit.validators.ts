import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  projectId: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
