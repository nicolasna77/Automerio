-- AlterTable
ALTER TABLE "conversation" ADD COLUMN     "humanTakeoverAt" TIMESTAMP(3),
ADD COLUMN     "lastInboundAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "conversation_message" ADD COLUMN     "sentById" TEXT;

-- AddForeignKey
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Conversations existantes : date du dernier message reçu.
UPDATE "conversation" c
SET "lastInboundAt" = m."lastInbound"
FROM (
  SELECT "conversationId", MAX("createdAt") AS "lastInbound"
  FROM "conversation_message"
  WHERE "direction" = 'INBOUND'
  GROUP BY "conversationId"
) m
WHERE m."conversationId" = c."id";
