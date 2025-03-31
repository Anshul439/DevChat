/*
  Warnings:

  - Added the required column `updatedAt` to the `GroupMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
