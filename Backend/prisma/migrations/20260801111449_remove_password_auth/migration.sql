-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash",
ALTER COLUMN "authProvider" SET DEFAULT 'GOOGLE';

-- DropTable
DROP TABLE "PasswordResetToken";

-- DropTable
DROP TABLE "PendingSignup";

