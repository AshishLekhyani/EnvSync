import { prisma } from "../../db/prisma";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../common/errors/AppError";
import { hashPassword, verifyPassword } from "./password";
import {
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  signAccessToken,
} from "./tokens";
import { ChangePasswordInput, LoginInput, SignupInput, UpdateProfileInput } from "./auth.validators";

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  authProvider: string;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    authProvider: user.authProvider,
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

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      authProvider: "PASSWORD",
    },
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
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name },
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
}

export async function findSessionByRefreshToken(rawRefreshToken: string) {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  return prisma.session.findFirst({ where: { refreshTokenHash: tokenHash } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new UnauthorizedError();
  }

  const memberships = await prisma.orgMembership.findMany({
    where: { userId },
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
