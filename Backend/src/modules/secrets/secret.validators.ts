import { z } from "zod";

const keyRegex = /^[A-Z][A-Z0-9_]*$/;

export const createSecretSchema = z.object({
  key: z.string().min(1).max(200).regex(keyRegex, "Key must be UPPER_SNAKE_CASE"),
  value: z.string().min(1),
});
export type CreateSecretInput = z.infer<typeof createSecretSchema>;

export const updateSecretSchema = z.object({
  value: z.string().min(1),
});
export type UpdateSecretInput = z.infer<typeof updateSecretSchema>;

export const rotateSecretSchema = z.object({
  length: z.number().int().min(16).max(128).optional(),
});
export type RotateSecretInput = z.infer<typeof rotateSecretSchema>;
