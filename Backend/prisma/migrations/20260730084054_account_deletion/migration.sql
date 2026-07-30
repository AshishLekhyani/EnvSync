-- DropForeignKey
ALTER TABLE "SecretVersion" DROP CONSTRAINT "SecretVersion_createdById_fkey";

-- AlterTable
ALTER TABLE "SecretVersion" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SecretVersion" ADD CONSTRAINT "SecretVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
