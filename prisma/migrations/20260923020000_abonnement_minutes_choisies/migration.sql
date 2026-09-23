-- AlterTable
-- Bornes du curseur, cote catalogue. Nulles tant qu'une solution n'est pas
-- personnalisable : elle se vend alors telle quelle, comme aujourd'hui.
ALTER TABLE "service" ADD COLUMN "maxUsageUnits" INTEGER;
ALTER TABLE "service" ADD COLUMN "usageStepUnits" INTEGER;
ALTER TABLE "service" ADD COLUMN "extraUnitPriceCents" INTEGER;

-- AlterTable
-- Ce que le client a choisi, et le prix convenu alors. Nuls pour les
-- prestations existantes : les valeurs du catalogue continuent de faire foi.
ALTER TABLE "client_service" ADD COLUMN "includedUsageUnits" INTEGER;
ALTER TABLE "client_service" ADD COLUMN "monthlyPriceCents" INTEGER;
