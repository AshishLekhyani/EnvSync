-- CreateEnum
CREATE TYPE "InviteApprovalStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "OrgInvite" ADD COLUMN     "approvalStatus" "InviteApprovalStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT;

-- AlterTable
ALTER TABLE "OrgMembership" ADD COLUMN     "invitedById" TEXT;

-- CreateTable
CREATE TABLE "InviteAutoApproveRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "inviterId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteAutoApproveRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InviteAutoApproveRule_orgId_idx" ON "InviteAutoApproveRule"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteAutoApproveRule_orgId_inviterId_key" ON "InviteAutoApproveRule"("orgId", "inviterId");

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteAutoApproveRule" ADD CONSTRAINT "InviteAutoApproveRule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteAutoApproveRule" ADD CONSTRAINT "InviteAutoApproveRule_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteAutoApproveRule" ADD CONSTRAINT "InviteAutoApproveRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
