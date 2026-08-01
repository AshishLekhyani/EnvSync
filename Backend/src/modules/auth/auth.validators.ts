import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().max(65000).nullable().optional(),
  notificationPrefs: z
    .object({
      approvalRequests: z.boolean(),
      accessChanges: z.boolean(),
    })
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  confirmEmail: z.string().email(),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
