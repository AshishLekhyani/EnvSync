import { prisma } from "../../db/prisma";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../../common/errors/AppError";
import { generateRefreshToken, getRefreshTokenExpiry, hashRefreshToken, signAccessToken } from "./tokens";
import { DeleteAccountInput, UpdateProfileInput } from "./auth.validators";
import { notifyUserSessionsRevoked } from "./sse";
import { writeAuditLog } from "../audit/audit.service";
import { isValidAvatarDataUrl } from "../../common/imageValidation";

const DEFAULT_NOTIFICATION_PREFS = { approvalRequests: true, accessChanges: true };

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  authProvider: string;
  avatarUrl?: string | null;
  notificationPrefs?: unknown;
  emailVerifiedAt?: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    authProvider: user.authProvider,
    avatarUrl: user.avatarUrl ?? null,
    notificationPrefs: (user.notificationPrefs as typeof DEFAULT_NOTIFICATION_PREFS | null) ?? DEFAULT_NOTIFICATION_PREFS,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
  };
}

export async function issueSession(userId: string, email: string, meta: SessionMeta) {
  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = generateRefreshToken();

  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return { accessToken, refreshToken };
}

export async function refresh(rawRefreshToken: string, meta: SessionMeta) {
  const tokenHash = hashRefreshToken(rawRefreshToken);

  const session = await prisma.session.findFirst({
    where: { refreshTokenHash: tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueSession(session.userId, session.user.email, meta);
  return { user: toPublicUser(session.user), ...tokens };
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashRefreshToken(rawRefreshToken);

  await prisma.session.updateMany({
    where: { refreshTokenHash: tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function listSessions(userId: string, rawRefreshToken?: string) {
  const currentHash = rawRefreshToken ? hashRefreshToken(rawRefreshToken) : null;

  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    current: currentHash !== null && s.refreshTokenHash === currentHash,
  }));
}

export async function revokeSession(userId: string, sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });

  if (!session || session.userId !== userId) {
    throw new NotFoundError("Session not found");
  }

  if (session.revokedAt) {
    throw new ConflictError("Session already revoked");
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

  notifyUserSessionsRevoked(userId);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.avatarUrl != null && !isValidAvatarDataUrl(input.avatarUrl)) {
    throw new BadRequestError("Invalid image");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      avatarUrl: input.avatarUrl,
      notificationPrefs: input.notificationPrefs,
    },
  });

  return toPublicUser(user);
}

export async function findSessionByRefreshToken(rawRefreshToken: string) {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  return prisma.session.findFirst({ where: { refreshTokenHash: tokenHash } });
}

export async function getMe(userId: string, restrictToOrgId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new UnauthorizedError();
  }

  const memberships = await prisma.orgMembership.findMany({
    where: { userId, ...(restrictToOrgId ? { orgId: restrictToOrgId } : {}) },
    include: { org: true },
  });

  return {
    ...toPublicUser(user),
    organizations: memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      role: m.role,
    })),
  };
}

export async function deleteAccount(userId: string, input: DeleteAccountInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new UnauthorizedError();
  }

  if (input.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    throw new BadRequestError("Type your account email exactly to confirm");
  }

  const ownerships = await prisma.orgMembership.findMany({
    where: { userId, role: "OWNER" },
    include: { org: { select: { id: true, name: true } } },
  });

  const soloOwnedOrgs: { id: string; name: string }[] = [];
  const blockingOrgs: { id: string; name: string }[] = [];

  for (const ownership of ownerships) {
    const otherMembers = await prisma.orgMembership.count({
      where: { orgId: ownership.orgId, userId: { not: userId } },
    });
    if (otherMembers > 0) {
      blockingOrgs.push(ownership.org);
    } else {
      soloOwnedOrgs.push(ownership.org);
    }
  }

  if (blockingOrgs.length > 0) {
    const names = blockingOrgs.map((o) => o.name).join(", ");
    throw new ConflictError(
      `You're the sole owner of ${names}. Transfer ownership to someone else or delete ${
        blockingOrgs.length > 1 ? "these organizations" : "this organization"
      } before deleting your account.`
    );
  }

  const otherMemberships = await prisma.orgMembership.findMany({
    where: { userId, role: { not: "OWNER" } },
    select: { id: true, orgId: true, role: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const org of soloOwnedOrgs) {
      await writeAuditLog(tx, {
        orgId: org.id,
        actorId: userId,
        action: "org.delete",
        targetType: "Organization",
        targetId: org.id,
        metadata: { name: org.name, reason: "account_deleted" },
      });
      await tx.organization.delete({ where: { id: org.id } });
    }

    for (const membership of otherMemberships) {
      await writeAuditLog(tx, {
        orgId: membership.orgId,
        actorId: userId,
        action: "member.remove",
        targetType: "OrgMembership",
        targetId: membership.id,
        metadata: { email: user.email, role: membership.role, reason: "account_deleted" },
      });
    }

    await tx.user.delete({ where: { id: userId } });
  });
}
