import { z } from "zod";

const keyRegex = /^[A-Z][A-Z0-9_]*$/;

const valueSchema = z.string().min(1).max(65536);

export const createSecretSchema = z.object({
  key: z.string().min(1).max(200).regex(keyRegex, "Key must be UPPER_SNAKE_CASE"),
  value: valueSchema,
  expiresAt: z.string().datetime().nullable().optional(),
});
export type CreateSecretInput = z.infer<typeof createSecretSchema>;

export const updateSecretSchema = z.object({
  value: valueSchema,
});
export type UpdateSecretInput = z.infer<typeof updateSecretSchema>;

export const setSecretExpirySchema = z.object({
  expiresAt: z.string().datetime().nullable(),
});
export type SetSecretExpiryInput = z.infer<typeof setSecretExpirySchema>;

export const rotateSecretSchema = z.object({
  length: z.number().int().min(16).max(128).optional(),
});
export type RotateSecretInput = z.infer<typeof rotateSecretSchema>;

export const bulkUpsertSecretsSchema = z.object({
  secrets: z
    .array(
      z.object({
        key: z.string().min(1).max(200).regex(keyRegex, "Key must be UPPER_SNAKE_CASE"),
        value: valueSchema,
      })
    )
    .min(1)
    .max(100),
});
export type BulkUpsertSecretsInput = z.infer<typeof bulkUpsertSecretsSchema>;
