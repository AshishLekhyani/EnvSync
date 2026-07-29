import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as notificationService from "./notification.service";

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listNotifications(req.user!.id);
  res.status(200).json(notifications);
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(
    req.user!.id,
    req.params.notificationId
  );
  res.status(200).json(notification);
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user!.id);
  res.status(204).send();
});
