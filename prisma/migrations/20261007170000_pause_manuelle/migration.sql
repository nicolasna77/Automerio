-- Pause décidée par le client depuis son tableau de bord.
ALTER TABLE "client_service" ADD COLUMN "pausedAt" TIMESTAMP(3);

ALTER TYPE "ServiceEventType" ADD VALUE 'PAUSED' BEFORE 'CANCELED';
ALTER TYPE "ServiceEventType" ADD VALUE 'RESUMED' BEFORE 'CANCELED';
