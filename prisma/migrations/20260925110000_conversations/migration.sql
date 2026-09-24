-- CreateEnum
CREATE TYPE "MessagingChannel" AS ENUM ('WHATSAPP', 'MESSENGER', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "channel" "MessagingChannel" NOT NULL,
    "contactId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "text" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_clientServiceId_lastMessageAt_idx" ON "conversation"("clientServiceId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_clientServiceId_channel_contactId_key" ON "conversation"("clientServiceId", "channel", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_message_externalId_key" ON "conversation_message"("externalId");

-- CreateIndex
CREATE INDEX "conversation_message_conversationId_createdAt_idx" ON "conversation_message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "client_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
