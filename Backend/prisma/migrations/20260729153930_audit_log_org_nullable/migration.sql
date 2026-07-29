-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_orgId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "orgId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
