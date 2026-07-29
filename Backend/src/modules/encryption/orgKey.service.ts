import { prisma } from "../../db/prisma";
import { toPrismaBytes } from "../../common/bytes";
import { getMasterKey } from "./masterKey";
import { generateDek, unwrapDek, wrapDek } from "./envelope";

export async function getOrCreateOrgDek(orgId: string): Promise<Buffer> {
  const masterKey = getMasterKey();

  const existing = await prisma.orgEncryptionKey.findUnique({
    where: { orgId },
  });

  if (existing) {
    return unwrapDek(
      {
        wrappedDek: Buffer.from(existing.wrappedDek),
        iv: Buffer.from(existing.iv),
        authTag: Buffer.from(existing.authTag),
      },
      masterKey
    );
  }

  const dek = generateDek();
  const wrapped = wrapDek(dek, masterKey);

  await prisma.orgEncryptionKey.create({
    data: {
      orgId,
      wrappedDek: toPrismaBytes(wrapped.wrappedDek),
      iv: toPrismaBytes(wrapped.iv),
      authTag: toPrismaBytes(wrapped.authTag),
    },
  });

  return dek;
}
