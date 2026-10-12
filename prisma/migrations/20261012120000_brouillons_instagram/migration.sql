-- Brouillons de publications Instagram (légende, carrousel, hashtags,
-- planning) rédigés pour le client ; effacés avec la solution.
CREATE TYPE "InstagramDraftKind" AS ENUM ('CAPTION', 'CAROUSEL', 'HASHTAGS', 'WEEKLY_PLAN');

CREATE TABLE "instagram_draft" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "createdById" TEXT,
    "kind" "InstagramDraftKind" NOT NULL,
    "subject" TEXT NOT NULL,
    "goal" TEXT,
    "details" TEXT,
    "content" JSONB NOT NULL,
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_draft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "instagram_draft_clientServiceId_createdAt_idx" ON "instagram_draft"("clientServiceId", "createdAt");

ALTER TABLE "instagram_draft" ADD CONSTRAINT "instagram_draft_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "client_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "instagram_draft" ADD CONSTRAINT "instagram_draft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
