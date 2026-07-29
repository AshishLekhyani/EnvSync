import crypto from "node:crypto";
import { SecretChangeType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { toPrismaBytes } from "../../common/bytes";
import { ConflictError, NotFoundError } from "../../common/errors/AppError";
import { getOrCreateOrgDek } from "../encryption/orgKey.service";
import { decryptWithDek, encryptWithDek } from "../encryption/envelope";
import { writeAuditLog } from "../audit/audit.service";
import { CreateSecretInput, UpdateSecretInput } from "./secret.validators";

interface SecretRow {
  id: string;
  key: string;
  currentVersion: number;
  expiresAt: Date | null;
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
}

function toMetadata(secret: SecretRow) {
  return {
    id: secret.id,
    key: secret.key,
    currentVersion: secret.currentVersion,
    expiresAt: secret.expiresAt,
    createdById: secret.createdById,
    updatedById: secret.updatedById,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  };
}

async function getEnvironmentWithOrg(environmentId: string) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { project: true },
  });

  if (!environment) {
    throw new NotFoundError("Environment not found");
  }

  return environment;
}

async function getSecretWithEnvironment(secretId: string) {
  const secret = await prisma.secret.findUnique({
    where: { id: secretId },
    include: { environment: { include: { project: true } } },
  });

  if (!secret) {
    throw new NotFoundError("Secret not found");
  }

  return secret;
}

export async function createSecret(
  environmentId: string,
  input: CreateSecretInput,
  actorId: string,
  ipAddress?: string
) {
  const environment = await getEnvironmentWithOrg(environmentId);

  const existing = await prisma.secret.findUnique({
    where: { environmentId_key: { environmentId, key: input.key } },
  });

  if (existing) {
    throw new ConflictError(
      `Secret "${input.key}" already exists in this environment`
    );
  }

  const dek = await getOrCreateOrgDek(environment.project.orgId);
  const { ciphertext, iv, authTag } = encryptWithDek(input.value, dek);

  const secret = await prisma.$transaction(async (tx) => {
    const created = await tx.secret.create({
      data: {
        environmentId,
        key: input.key,
        ciphertext: toPrismaBytes(ciphertext),
        iv: toPrismaBytes(iv),
        authTag: toPrismaBytes(authTag),
        currentVersion: 1,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdById: actorId,
        updatedById: actorId,
      },
    });

    await tx.secretVersion.create({
      data: {
        secretId: created.id,
        version: 1,
        ciphertext: toPrismaBytes(ciphertext),
        iv: toPrismaBytes(iv),
        authTag: toPrismaBytes(authTag),
        changeType: SecretChangeType.CREATE,
        createdById: actorId,
      },
    });

    await writeAuditLog(tx, {
      orgId: environment.project.orgId,
      actorId,
      action: "secret.create",
      targetType: "Secret",
      targetId: created.id,
      projectId: environment.projectId,
      metadata: { key: input.key, environmentId },
      ipAddress,
    });

    return created;
  });

  return toMetadata(secret);
}

export async function listSecrets(environmentId: string) {
  await getEnvironmentWithOrg(environmentId);

  const secrets = await prisma.secret.findMany({
    where: { environmentId },
    orderBy: { key: "asc" },
  });

  return secrets.map(toMetadata);
}

export async function getSecret(secretId: string) {
  const secret = await getSecretWithEnvironment(secretId);
  return toMetadata(secret);
}

export async function revealSecret(
  secretId: string,
  actorId: string,
  ipAddress?: string
) {
  const secret = await getSecretWithEnvironment(secretId);
  const dek = await getOrCreateOrgDek(secret.environment.project.orgId);

  const value = decryptWithDek(
    {
      ciphertext: Buffer.from(secret.ciphertext),
      iv: Buffer.from(secret.iv),
      authTag: Buffer.from(secret.authTag),
    },
    dek
  );

  await writeAuditLog(prisma, {
    orgId: secret.environment.project.orgId,
    actorId,
    action: "secret.reveal",
    targetType: "Secret",
    targetId: secret.id,
    projectId: secret.environment.projectId,
    metadata: { key: secret.key },
    ipAddress,
  });

  return { ...toMetadata(secret), value };
}

export async function updateSecret(
  secretId: string,
  input: UpdateSecretInput,
  actorId: string,
  ipAddress?: string
) {
  const secret = await getSecretWithEnvironment(secretId);
  const dek = await getOrCreateOrgDek(secret.environment.project.orgId);
  const { ciphertext, iv, authTag } = encryptWithDek(input.value, dek);
  const nextVersion = secret.currentVersion + 1;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.secret.update({
      where: { id: secretId },
      data: {
        ciphertext: toPrismaBytes(ciphertext),
        iv: toPrismaBytes(iv),
        authTag: toPrismaBytes(authTag),
        currentVersion: nextVersion,
        updatedById: actorId,
      },
    });

    await tx.secretVersion.create({
      data: {
        secretId,
        version: nextVersion,
        ciphertext: toPrismaBytes(ciphertext),
        iv: toPrismaBytes(iv),
        authTag: toPrismaBytes(authTag),
        changeType: SecretChangeType.UPDATE,
        createdById: actorId,
      },
    });

    await writeAuditLog(tx, {
      orgId: secret.environment.project.orgId,
      actorId,
      action: "secret.update",
      targetType: "Secret",
      targetId: secretId,
      projectId: secret.environment.projectId,
      metadata: { key: secret.key, version: nextVersion },
      ipAddress,
    });

    return result;
  });

  return toMetadata(updated);
}

export async function setSecretExpiry(
  secretId: string,
  expiresAt: string | null,
  actorId: string,
  ipAddress?: string
) {
  const secret = await getSecretWithEnvironment(secretId);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.secret.update({
      where: { id: secretId },
      data: { expiresAt: expiresAt ? new Date(expiresAt) : null },
    });

    await writeAuditLog(tx, {
      orgId: secret.environment.project.orgId,
      actorId,
      action: "secret.expiry_update",
      targetType: "Secret",
      targetId: secretId,
      projectId: secret.environment.projectId,
      metadata: { key: secret.key, expiresAt },
      ipAddress,
    });

    return result;
  });

  return toMetadata(updated);
}

export async function rotateSecret(
  secretId: string,
  actorId: string,
  ipAddress?: string,
  length = 32
) {
  const secret = await getSecretWithEnvironment(secretId);
  const dek = await getOrCreateOrgDek(secret.environment.project.orgId);
  const newValue = crypto.randomBytes(length).toString("base64url");
  const { ciphertext, iv, authTag } = encryptWithDek(newValue, dek);
  const nextVersion = secret.currentVersion + 1;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.secret.update({
      where: { id: secretId },
      data: {
        ciphertext: toPrismaBytes(ciphertext),
        iv: toPrismaBytes(iv),
        authTag: toPrismaBytes(authTag),
        currentVersion: nextVersion,
        updatedById: actorId,
      },
    });

    await tx.secretVersion.create({
      data: {
        secretId,
        version: nextVersion,
        ciphertext: toPrismaBytes(ciphertext),
        iv: toPrismaBytes(iv),
        authTag: toPrismaBytes(authTag),
        changeType: SecretChangeType.ROTATE,
        createdById: actorId,
      },
    });

    await writeAuditLog(tx, {
      orgId: secret.environment.project.orgId,
      actorId,
      action: "secret.rotate",
      targetType: "Secret",
      targetId: secretId,
      projectId: secret.environment.projectId,
      metadata: { key: secret.key, version: nextVersion, length },
      ipAddress,
    });

    return result;
  });

  return { ...toMetadata(updated), value: newValue };
}

export async function deleteSecret(
  secretId: string,
  actorId: string,
  ipAddress?: string
) {
  const secret = await getSecretWithEnvironment(secretId);

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      orgId: secret.environment.project.orgId,
      actorId,
      action: "secret.delete",
      targetType: "Secret",
      targetId: secretId,
      projectId: secret.environment.projectId,
      metadata: { key: secret.key },
      ipAddress,
    });

    await tx.secret.delete({ where: { id: secretId } });
  });
}

export async function listSecretVersions(secretId: string) {
  await getSecretWithEnvironment(secretId);

  return prisma.secretVersion.findMany({
    where: { secretId },
    select: {
      id: true,
      version: true,
      changeType: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { version: "desc" },
  });
}

async function getSecretVersion(secretId: string, version: number) {
  const secretVersion = await prisma.secretVersion.findUnique({
    where: { secretId_version: { secretId, version } },
  });

  if (!secretVersion) {
    throw new NotFoundError("Secret version not found");
  }

  return secretVersion;
}

export async function revealSecretVersion(
  secretId: string,
  version: number,
  actorId: string,
  ipAddress?: string
) {
  const secret = await getSecretWithEnvironment(secretId);
  const secretVersion = await getSecretVersion(secretId, version);
  const dek = await getOrCreateOrgDek(secret.environment.project.orgId);

  const value = decryptWithDek(
    {
      ciphertext: Buffer.from(secretVersion.ciphertext),
      iv: Buffer.from(secretVersion.iv),
      authTag: Buffer.from(secretVersion.authTag),
    },
    dek
  );

  await writeAuditLog(prisma, {
    orgId: secret.environment.project.orgId,
    actorId,
    action: "secret.version_reveal",
    targetType: "Secret",
    targetId: secret.id,
    projectId: secret.environment.projectId,
    metadata: { key: secret.key, version },
    ipAddress,
  });

  return { version, value };
}

export async function restoreSecretVersion(
  secretId: string,
  version: number,
  actorId: string,
  ipAddress?: string
) {
  const secret = await getSecretWithEnvironment(secretId);

  if (version === secret.currentVersion) {
    throw new ConflictError("This version is already current");
  }

  const secretVersion = await getSecretVersion(secretId, version);
  const nextVersion = secret.currentVersion + 1;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.secret.update({
      where: { id: secretId },
      data: {
        ciphertext: secretVersion.ciphertext,
        iv: secretVersion.iv,
        authTag: secretVersion.authTag,
        currentVersion: nextVersion,
        updatedById: actorId,
      },
    });

    await tx.secretVersion.create({
      data: {
        secretId,
        version: nextVersion,
        ciphertext: secretVersion.ciphertext,
        iv: secretVersion.iv,
        authTag: secretVersion.authTag,
        changeType: SecretChangeType.RESTORE,
        createdById: actorId,
      },
    });

    await writeAuditLog(tx, {
      orgId: secret.environment.project.orgId,
      actorId,
      action: "secret.restore",
      targetType: "Secret",
      targetId: secretId,
      projectId: secret.environment.projectId,
      metadata: { key: secret.key, restoredFromVersion: version, newVersion: nextVersion },
      ipAddress,
    });

    return result;
  });

  return toMetadata(updated);
}
