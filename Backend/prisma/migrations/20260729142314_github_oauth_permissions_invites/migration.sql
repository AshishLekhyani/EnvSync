-- CreateEnum
CREATE TYPE "EnvironmentAccessLevel" AS ENUM ('NONE', 'READ', 'WRITE');

-- CreateTable
CREATE TABLE "OrgEnvironmentPermission" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "environmentType" "EnvironmentType" NOT NULL,
    "access" "EnvironmentAccessLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgEnvironmentPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,

    CONSTRAINT "OrgInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgEnvironmentPermission_orgId_idx" ON "OrgEnvironmentPermission"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgEnvironmentPermission_orgId_role_environmentType_key" ON "OrgEnvironmentPermission"("orgId", "role", "environmentType");

-- CreateIndex
CREATE UNIQUE INDEX "OrgInvite_tokenHash_key" ON "OrgInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "OrgInvite_orgId_idx" ON "OrgInvite"("orgId");

-- CreateIndex
CREATE INDEX "OrgInvite_email_idx" ON "OrgInvite"("email");

-- AddForeignKey
ALTER TABLE "OrgEnvironmentPermission" ADD CONSTRAINT "OrgEnvironmentPermission_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
