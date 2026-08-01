-- DropForeignKey
ALTER TABLE "InviteAutoApproveRule" DROP CONSTRAINT "InviteAutoApproveRule_createdById_fkey";

-- DropForeignKey
ALTER TABLE "InviteAutoApproveRule" DROP CONSTRAINT "InviteAutoApproveRule_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "InviteAutoApproveRule" DROP CONSTRAINT "InviteAutoApproveRule_orgId_fkey";

-- DropForeignKey
ALTER TABLE "RoleChangeRequest" DROP CONSTRAINT "RoleChangeRequest_decidedById_fkey";

-- DropForeignKey
ALTER TABLE "RoleChangeRequest" DROP CONSTRAINT "RoleChangeRequest_orgId_fkey";

-- DropForeignKey
ALTER TABLE "RoleChangeRequest" DROP CONSTRAINT "RoleChangeRequest_userId_fkey";

-- DropTable
DROP TABLE "InviteAutoApproveRule";

-- DropTable
DROP TABLE "RoleChangeRequest";

