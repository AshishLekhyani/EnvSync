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

// Fired whenever any session belonging to this user is revoked (explicit revoke,
// or the "revoke every other session" side effect of a password change). We don't
// try to target only the affected connection — each connected tab just re-verifies
// its own session via a silent refresh, which is a no-op if it wasn't the one revoked.
export function notifyUserSessionsRevoked(userId: string) {
  const set = connectionsByUserId.get(userId);
  if (!set) return;
  for (const res of set) {
    res.write("event: session-revoked\ndata: {}\n\n");
  }
}
