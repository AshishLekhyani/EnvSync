import { prisma } from "../../db/prisma";

const RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function runSecretPurge() {
  const cutoff = new Date(Date.now() - RECOVERY_WINDOW_MS);
  const result = await prisma.secret.deleteMany({
    where: { deletedAt: { not: null, lt: cutoff } },
  });
  return { purged: result.count };
}

export function startSecretPurgeScanner(intervalMs: number) {
  const timer = setInterval(() => {
    runSecretPurge().catch((err) => console.error("Secret purge failed", err));
  }, intervalMs);
  timer.unref();
  return timer;
}
