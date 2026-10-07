-- Un compte Meta (numéro WhatsApp, page Facebook, compte Instagram) ne peut
-- être relié qu'à une seule solution. Si des doublons existent déjà, la
-- création de l'index échoue volontairement : les repérer avec
--   SELECT "whatsappPhoneNumberId", count(*) FROM "client_service"
--   WHERE "whatsappPhoneNumberId" IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- (idem pour "facebookPageId" et "instagramAccountId"), déconnecter le compte
-- de la solution en trop, puis rejouer la migration.

-- CreateIndex
CREATE UNIQUE INDEX "client_service_whatsappPhoneNumberId_key" ON "client_service"("whatsappPhoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "client_service_facebookPageId_key" ON "client_service"("facebookPageId");

-- CreateIndex
CREATE UNIQUE INDEX "client_service_instagramAccountId_key" ON "client_service"("instagramAccountId");
