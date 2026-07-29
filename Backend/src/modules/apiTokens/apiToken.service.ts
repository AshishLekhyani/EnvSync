import crypto from "node:crypto";
import { prisma } from "../../db/prisma";
import { sha256Hex } from "../../common/hash";
import { ConflictError, NotFoundError } from "../../common/errors/AppError";
import { writeAuditLog } from "../audit/audit.service";
import { CreateApiTokenInput } from "./apiToken.validators";

export const TOKEN_PREFIX = "envsync_";

function generateRawToken(): string {
  return TOKEN_PREFIX + crypto.randomBytes(32).toString("base64url");
}

interface ApiTokenRow {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdBy: { id: string; name: string; email: string };
}

function toMetadata(token: ApiTokenRow) {
  return {
    id: token.id,
    name: token.name,
    createdBy: token.createdBy,
    createdAt: token.createdAt,
    lastUsedAt: token.lastUsedAt,
    revokedAt: token.revokedAt,
  };
}

export async function createApiToken(
  orgId: string,
  input: CreateApiTokenInput,
  actorId: string,
  ipAddress?: string
) {
  const rawToken = generateRawToken();
  const tokenHash = sha256Hex(rawToken);

  const created = await prisma.$transaction(async (tx) => {
    const token = await tx.apiToken.create({
      data: { orgId, name: input.name, tokenHash, createdById: actorId },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId,
      action: "apitoken.create",
      targetType: "ApiToken",
      targetId: token.id,
      metadata: { name: input.name },
      ipAddress,
    });

    return token;
  });

  return { ...toMetadata(created), token: rawToken };
}

export async function listApiTokens(orgId: string) {
  const tokens = await prisma.apiToken.findMany({
    where: { orgId },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return tokens.map(toMetadata);
}

export async function revokeApiToken(
  orgId: string,
  tokenId: string,
  actorId: string,
  ipAddress?: string
) {
  const token = await prisma.apiToken.findUnique({
    where: { id: tokenId },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  if (!token || token.orgId !== orgId) {
    throw new NotFoundError("API token not found");
  }

  if (token.revokedAt) {
    throw new ConflictError("Token already revoked");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.apiToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId,
      action: "apitoken.revoke",
      targetType: "ApiToken",
      targetId: tokenId,
      metadata: { name: token.name },
      ipAddress,
    });

    return result;
  });

  return toMetadata(updated);
}

export async function authenticateApiToken(rawToken: string) {
  const tokenHash = sha256Hex(rawToken);

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: { createdBy: { select: { id: true, email: true } } },
  });

  if (!token || token.revokedAt) {
    return null;
  }

  void prisma.apiToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  });

  return token;
}
