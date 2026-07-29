import { env } from "../../config/env";

let cachedKey: Buffer | null = null;

export function getMasterKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const raw = env.ENCRYPTION_MASTER_KEY.slice("base64:".length);
  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_MASTER_KEY must decode to 32 bytes, got ${key.length}`
    );
  }

  cachedKey = key;
  return cachedKey;
}
