import { Response } from "express";

const connectionsByUserId = new Map<string, Set<Response>>();

export function registerConnection(userId: string, res: Response) {
  if (!connectionsByUserId.has(userId)) {
    connectionsByUserId.set(userId, new Set());
  }
  connectionsByUserId.get(userId)!.add(res);
}

export function unregisterConnection(userId: string, res: Response) {
  const set = connectionsByUserId.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    connectionsByUserId.delete(userId);
  }
}

export function notifyUserSessionsRevoked(userId: string) {
  const set = connectionsByUserId.get(userId);
  if (!set) return;
  for (const res of set) {
    res.write("event: session-revoked\ndata: {}\n\n");
  }
}

export function notifyUserAccessChanged(userId: string, orgId: string) {
  const set = connectionsByUserId.get(userId);
  if (!set) return;
  for (const res of set) {
    res.write(`event: access-changed\ndata: ${JSON.stringify({ orgId })}\n\n`);
  }
}
