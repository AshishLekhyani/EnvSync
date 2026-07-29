import crypto from "node:crypto";

export function sha256Hex(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
