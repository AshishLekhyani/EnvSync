import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../common/errors/AppError";

export function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markRead(userId: string, notificationId: string) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: userId },
    data: { read: true },
  });

  if (result.count === 0) {
    throw new NotFoundError("Notification not found");
  }

  return prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
}

export function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { recipientId: userId, read: false },
    data: { read: true },
  });
}
