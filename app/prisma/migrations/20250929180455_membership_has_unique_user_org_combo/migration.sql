/*
  Warnings:

  - A unique constraint covering the columns `[userId,orgId]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Membership_userId_orgId_roleId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_orgId_key" ON "public"."Membership"("userId", "orgId");
