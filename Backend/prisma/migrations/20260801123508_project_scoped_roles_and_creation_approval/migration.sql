-- CreateEnum
CREATE TYPE "ProjectCreationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ProjectMembership" ADD COLUMN     "role" "OrgRole" NOT NULL DEFAULT 'VIEWER';

-- CreateTable
CREATE TABLE "ProjectCreationRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "requestedById" TEXT NOT NULL,
    "status" "ProjectCreationStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCreationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCreateAutoApproveRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCreateAutoApproveRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectCreationRequest_orgId_idx" ON "ProjectCreationRequest"("orgId");

-- CreateIndex
CREATE INDEX "ProjectCreateAutoApproveRule_orgId_idx" ON "ProjectCreateAutoApproveRule"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCreateAutoApproveRule_orgId_adminId_key" ON "ProjectCreateAutoApproveRule"("orgId", "adminId");

-- AddForeignKey
ALTER TABLE "ProjectCreationRequest" ADD CONSTRAINT "ProjectCreationRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreationRequest" ADD CONSTRAINT "ProjectCreationRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreationRequest" ADD CONSTRAINT "ProjectCreationRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreateAutoApproveRule" ADD CONSTRAINT "ProjectCreateAutoApproveRule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreateAutoApproveRule" ADD CONSTRAINT "ProjectCreateAutoApproveRule_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreateAutoApproveRule" ADD CONSTRAINT "ProjectCreateAutoApproveRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

