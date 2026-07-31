import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as notificationService from "./notification.service";

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listNotifications(
    req.user!.id,
    req.apiTokenOrgId
  );
  res.status(200).json(notifications);
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(
    req.user!.id,
    req.params.notificationId,
    req.apiTokenOrgId
  );
  res.status(200).json(notification);
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user!.id, req.apiTokenOrgId);
  res.status(204).send();
});

export const dismissNotification = asyncHandler(async (req, res) => {
  await notificationService.dismissNotification(
    req.user!.id,
    req.params.notificationId,
    req.apiTokenOrgId
  );
  res.status(204).send();
});

export const clearAllNotifications = asyncHandler(async (req, res) => {
  await notificationService.clearAllNotifications(req.user!.id, req.apiTokenOrgId);
  res.status(204).send();
});
