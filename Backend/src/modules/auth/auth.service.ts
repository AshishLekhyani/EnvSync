import crypto from "node:crypto";
import { prisma } from "../../db/prisma";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../common/errors/AppError";
import { sha256Hex } from "../../common/hash";
import { hashPassword, verifyPassword } from "./password";
import {
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  signAccessToken,
} from "./tokens";
import {
  ChangePasswordInput,
  DeleteAccountInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  UpdateProfileInput,
} from "./auth.validators";
import { notifyUserSessionsRevoked } from "./sse";
import { writeAuditLog } from "../audit/audit.service";
import { isValidAvatarDataUrl } from "../../common/imageValidation";
import { env } from "../../config/env";
import { isEmailConfigured, sendEmail } from "../email/email.service";
import { passwordResetEmail, verificationEmail } from "../email/templates";

const DEFAULT_NOTIFICATION_PREFS = { approvalRequests: true, accessChanges: true };

const RESET_TOKEN_PREFIX = "reset_";
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

const VERIFY_TOKEN_PREFIX = "verify_";
const VERIFY_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

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

async function createAndSendSignupVerification(email: string, name: string, passwordHash: string) {
  const rawToken = VERIFY_TOKEN_PREFIX + crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_MS);

  await prisma.pendingSignup.upsert({
    where: { email },
    create: { email, name, passwordHash, tokenHash, expiresAt },
    update: { name, passwordHash, tokenHash, expiresAt },
  });

  if (isEmailConfigured()) {
    const link = `${env.CORS_ORIGIN}/verify-email/${rawToken}`;
    await sendEmail({ to: email, ...verificationEmail(link) });
    return { sent: true, verifyToken: null as string | null };
  }

  return { sent: false, verifyToken: rawToken };
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

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  return createAndSendSignupVerification(input.email, input.name, passwordHash);
}

export async function resendSignupVerification(email: string) {
  const pending = await prisma.pendingSignup.findUnique({ where: { email } });

  if (!pending) {
    return { sent: false, verifyToken: null as string | null };
  }

  return createAndSendSignupVerification(pending.email, pending.name, pending.passwordHash);
}

export async function verifySignup(rawToken: string) {
  const tokenHash = sha256Hex(rawToken);

  const pending = await prisma.pendingSignup.findUnique({ where: { tokenHash } });

  if (!pending || pending.expiresAt < new Date()) {
    throw new UnauthorizedError("This verification link is invalid or has expired");
  }

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: pending.email } });
    if (existing) {
      await tx.pendingSignup.delete({ where: { id: pending.id } });
      throw new ConflictError("An account with this email already exists");
    }

    const created = await tx.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        passwordHash: pending.passwordHash,
        authProvider: "PASSWORD",
        emailVerifiedAt: new Date(),
      },
    });
    await tx.pendingSignup.delete({ where: { id: pending.id } });
    return created;
  });

  return toPublicUser(user);
}

export async function login(input: LoginInput, meta: SessionMeta) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);

  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const tokens = await issueSession(user.id, user.email, meta);
  return { user: toPublicUser(user), ...tokens };
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

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  currentSessionId?: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new UnauthorizedError();
  }

  if (!user.passwordHash) {
    throw new BadRequestError("This account signs in via an external provider and has no password to change");
  }

  const valid = await verifyPassword(user.passwordHash, input.currentPassword);

  if (!valid) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const newHash = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });

  notifyUserSessionsRevoked(userId);
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

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || user.authProvider !== "PASSWORD") {
    return { resetToken: null };
  }

  const rawToken = RESET_TOKEN_PREFIX + crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(rawToken);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
    },
  });

  if (isEmailConfigured()) {
    const link = `${env.CORS_ORIGIN}/reset-password/${rawToken}`;
    await sendEmail({ to: user.email, ...passwordResetEmail(link) });
    return { resetToken: null };
  }

  return { resetToken: rawToken };
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = sha256Hex(input.token);

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new UnauthorizedError("This reset link is invalid or has expired");
  }

  const newHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: newHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  notifyUserSessionsRevoked(resetToken.userId);
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
