import { prisma } from "../../db/prisma";
import { ConflictError, UnauthorizedError } from "../../common/errors/AppError";
import { hashPassword, verifyPassword } from "./password";
import {
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  signAccessToken,
} from "./tokens";
import { LoginInput, SignupInput } from "./auth.validators";

interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

function toPublicUser(user: { id: string; email: string; name: string }) {
  return { id: user.id, email: user.email, name: user.name };
}

async function issueSession(userId: string, email: string, meta: SessionMeta) {
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
