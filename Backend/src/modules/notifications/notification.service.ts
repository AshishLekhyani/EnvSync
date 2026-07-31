import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../common/errors/AppError";

export type NotificationCategory = "approvalRequests" | "accessChanges";

export async function shouldNotify(userId: string, category: NotificationCategory): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });

  const prefs = user?.notificationPrefs as Record<string, boolean> | null;
  return prefs?.[category] ?? true;
}

export function listNotifications(userId: string, restrictToOrgId?: string) {
  return prisma.notification.findMany({
    where: { recipientId: userId, ...(restrictToOrgId ? { orgId: restrictToOrgId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markRead(userId: string, notificationId: string, restrictToOrgId?: string) {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientId: userId,
      ...(restrictToOrgId ? { orgId: restrictToOrgId } : {}),
    },
    data: { read: true },
  });

  if (result.count === 0) {
    throw new NotFoundError("Notification not found");
  }

  return prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
}

export function markAllRead(userId: string, restrictToOrgId?: string) {
  return prisma.notification.updateMany({
    where: {
      recipientId: userId,
      read: false,
      ...(restrictToOrgId ? { orgId: restrictToOrgId } : {}),
    },
    data: { read: true },
  });
}

export async function dismissNotification(
  userId: string,
  notificationId: string,
  restrictToOrgId?: string
) {
  const result = await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      recipientId: userId,
      ...(restrictToOrgId ? { orgId: restrictToOrgId } : {}),
    },
  });

  if (result.count === 0) {
    throw new NotFoundError("Notification not found");
  }
}

export function clearAllNotifications(userId: string, restrictToOrgId?: string) {
  return prisma.notification.deleteMany({
    where: { recipientId: userId, ...(restrictToOrgId ? { orgId: restrictToOrgId } : {}) },
  });
}
