-- AlterEnum
ALTER TYPE "SecretChangeType" ADD VALUE 'ROTATE';

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_orgId_idx" ON "ApiToken"("orgId");

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
