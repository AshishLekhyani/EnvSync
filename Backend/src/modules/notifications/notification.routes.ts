import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import * as notificationController from "./notification.controller";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", notificationController.listNotifications);
notificationsRouter.post("/read-all", notificationController.markAllRead);
notificationsRouter.patch("/:notificationId/read", notificationController.markRead);
