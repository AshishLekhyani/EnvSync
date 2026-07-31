import { prisma } from "../../db/prisma";
import { notifyUserNotificationCreated } from "../auth/sse";

const WARNING_WINDOW_DAYS = 7;

export async function runExpiryScan() {
  const warningThreshold = new Date(Date.now() + WARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const expiringSecrets = await prisma.secret.findMany({
    where: { expiresAt: { not: null, lte: warningThreshold } },
    include: { environment: { include: { project: true } } },
  });

  let created = 0;

  for (const secret of expiringSecrets) {
    const orgId = secret.environment.project.orgId;
    const isExpired = secret.expiresAt!.getTime() <= Date.now();
    const type = isExpired ? "secret.expired" : "secret.expiring_soon";

    const alreadyNotified = await prisma.notification.findFirst({
      where: { orgId, type, targetId: secret.id },
      select: { id: true },
    });

    if (alreadyNotified) continue;

    const recipients = await prisma.orgMembership.findMany({
      where: { orgId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });

    if (recipients.length === 0) continue;

    const message = isExpired
      ? `Secret "${secret.key}" has expired`
      : `Secret "${secret.key}" expires in ${Math.ceil(
          (secret.expiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )} day(s)`;

    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        orgId,
        recipientId: r.userId,
        type,
        message,
        targetType: "Secret",
        targetId: secret.id,
        metadata: { key: secret.key, expiresAt: secret.expiresAt!.toISOString() },
      })),
    });

    for (const r of recipients) {
      notifyUserNotificationCreated(r.userId);
    }
    created += recipients.length;
  }

  return { scanned: expiringSecrets.length, notificationsCreated: created };
}

export function startExpiryScanner(intervalMs: number) {
  const timer = setInterval(() => {
    runExpiryScan().catch((err) => console.error("Expiry scan failed", err));
  }, intervalMs);
  timer.unref();
  return timer;
}
