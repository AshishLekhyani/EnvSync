import { Response } from "express";

const MAX_CONNECTIONS_PER_USER = 8;

const connectionsByUserId = new Map<string, Set<Response>>();

export function registerConnection(userId: string, res: Response) {
  let set = connectionsByUserId.get(userId);
  if (!set) {
    set = new Set();
    connectionsByUserId.set(userId, set);
  }

  if (set.size >= MAX_CONNECTIONS_PER_USER) {
    const oldest = set.values().next().value;
    if (oldest) {
      set.delete(oldest);
      safeEnd(oldest);
    }
  }

  set.add(res);
}

export function unregisterConnection(userId: string, res: Response) {
  const set = connectionsByUserId.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    connectionsByUserId.delete(userId);
  }
}

function safeEnd(res: Response) {
  try {
    res.end();
  } catch {
    /* connection already gone */
  }
}

function broadcast(userId: string, payload: string) {
  const set = connectionsByUserId.get(userId);
  if (!set) return;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      set.delete(res);
    }
  }
}

export function notifyUserSessionsRevoked(userId: string) {
  broadcast(userId, "event: session-revoked\ndata: {}\n\n");
}

export function notifyUserAccessChanged(userId: string, orgId: string, projectId?: string) {
  broadcast(userId, `event: access-changed\ndata: ${JSON.stringify({ orgId, projectId })}\n\n`);
}

export function notifyUserNotificationCreated(userId: string) {
  broadcast(userId, "event: notification-created\ndata: {}\n\n");
}
