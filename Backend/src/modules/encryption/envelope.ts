import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const DEK_LENGTH = 32;

export interface WrappedKey {
  wrappedDek: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export interface EncryptedPayload {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export function generateDek(): Buffer {
  return crypto.randomBytes(DEK_LENGTH);
}

export function wrapDek(dek: Buffer, masterKey: Buffer): WrappedKey {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  const wrappedDek = Buffer.concat([cipher.update(dek), cipher.final()]);
  return { wrappedDek, iv, authTag: cipher.getAuthTag() };
}

export function unwrapDek(wrapped: WrappedKey, masterKey: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, wrapped.iv);
  decipher.setAuthTag(wrapped.authTag);
  return Buffer.concat([
    decipher.update(wrapped.wrappedDek),
    decipher.final(),
  ]);
}

export function encryptWithDek(plaintext: string, dek: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptWithDek(payload: EncryptedPayload, dek: Buffer): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, dek, payload.iv);
  decipher.setAuthTag(payload.authTag);
  const plaintext = Buffer.concat([
    decipher.update(payload.ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
