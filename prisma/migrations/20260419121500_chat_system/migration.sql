CREATE TYPE "ConversationType" AS ENUM ('GENERAL_SUPPORT', 'ORDER_SUPPORT');
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE');

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "conversationKey" TEXT NOT NULL,
  "type" "ConversationType" NOT NULL,
  "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  "userId" TEXT NOT NULL,
  "orderId" TEXT,
  "title" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastMessageAt" TIMESTAMP(3),
  "lastMessagePreview" TEXT,
  "unreadByUser" INTEGER NOT NULL DEFAULT 0,
  "unreadByAdmin" INTEGER NOT NULL DEFAULT 0,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderRole" "UserRole" NOT NULL,
  "type" "MessageType" NOT NULL DEFAULT 'TEXT',
  "body" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "attachmentName" TEXT,
  "attachmentMimeType" TEXT,
  "attachmentSize" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "readAt" TIMESTAMP(3),
  "editedAt" TIMESTAMP(3),
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_conversationKey_key" ON "Conversation"("conversationKey");
CREATE UNIQUE INDEX "Conversation_orderId_key" ON "Conversation"("orderId");
CREATE INDEX "Conversation_userId_updatedAt_idx" ON "Conversation"("userId", "updatedAt");
CREATE INDEX "Conversation_status_lastMessageAt_idx" ON "Conversation"("status", "lastMessageAt");
CREATE INDEX "Conversation_type_updatedAt_idx" ON "Conversation"("type", "updatedAt");

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
