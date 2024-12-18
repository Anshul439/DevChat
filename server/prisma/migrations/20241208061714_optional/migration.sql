-- AlterTable
ALTER TABLE "User" ALTER COLUMN "verifyCode" DROP NOT NULL,
ALTER COLUMN "verifyCodeExpiry" DROP NOT NULL;
