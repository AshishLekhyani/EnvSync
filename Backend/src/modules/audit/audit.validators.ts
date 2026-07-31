import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  projectId: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

export const purgeAuditLogsQuerySchema = z.object({
  before: z.string().refine((v) => !isNaN(new Date(v).getTime()), "Invalid date"),
});
export type PurgeAuditLogsQuery = z.infer<typeof purgeAuditLogsQuerySchema>;
