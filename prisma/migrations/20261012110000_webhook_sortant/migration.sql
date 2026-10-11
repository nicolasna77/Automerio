-- Webhook sortant par solution : adresse https choisie par le client et
-- secret de signature (chiffré par l'application, comme les jetons Meta).
ALTER TABLE "client_service" ADD COLUMN "webhookUrl" TEXT;
ALTER TABLE "client_service" ADD COLUMN "webhookSecret" TEXT;
