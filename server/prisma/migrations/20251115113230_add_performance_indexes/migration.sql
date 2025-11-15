-- DropIndex
DROP INDEX "public"."Friendship_status_idx";

-- DropIndex
DROP INDEX "public"."Friendship_user1Id_idx";

-- DropIndex
DROP INDEX "public"."Friendship_user2Id_idx";

-- DropIndex
DROP INDEX "public"."Message_receiverId_idx";

-- DropIndex
DROP INDEX "public"."Message_senderId_idx";

-- DropIndex
DROP INDEX "public"."Message_senderId_receiverId_idx";

-- CreateIndex
CREATE INDEX "Friendship_user1Id_status_idx" ON "public"."Friendship"("user1Id", "status");

-- CreateIndex
CREATE INDEX "Friendship_user2Id_status_idx" ON "public"."Friendship"("user2Id", "status");

-- CreateIndex
CREATE INDEX "Group_creatorId_idx" ON "public"."Group"("creatorId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "public"."GroupMember"("userId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "public"."GroupMember"("groupId");

-- CreateIndex
CREATE INDEX "GroupMessage_groupId_createdAt_idx" ON "public"."GroupMessage"("groupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GroupMessage_senderId_idx" ON "public"."GroupMessage"("senderId");

-- CreateIndex
CREATE INDEX "Message_senderId_receiverId_createdAt_idx" ON "public"."Message"("senderId", "receiverId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_receiverId_senderId_createdAt_idx" ON "public"."Message"("receiverId", "senderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "public"."Message"("createdAt" DESC);
