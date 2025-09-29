/*
  Warnings:

  - A unique constraint covering the columns `[userId,orgId,roleId]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_orgId_roleId_key" ON "public"."Membership"("userId", "orgId", "roleId");
