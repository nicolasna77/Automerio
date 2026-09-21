-- 1. Le quota de la prise de rendez-vous par téléphone était compté en appels,
-- alors que la consommation, elle, court à la minute : un appel long pesait
-- autant qu'une poignée d'appels courts sans que le quota s'en aperçoive. Même
-- unité que le standard téléphonique, et le dépassement suit la consommation
-- réelle.
UPDATE "service"
SET "includedUsageUnits" = 150,
    "usageUnit" = 'MINUTE'::"UsageUnit",
    "overageUnitPriceCents" = 30
WHERE "slug" = 'prise-rdv-telephone';

-- 2. Retrait des prestations d'administration : elles n'avaient aucun code
-- derrière elles et n'étaient affichées nulle part sur la page d'accueil.
--
-- `client_service` référence `service` en ON DELETE CASCADE : supprimer une
-- prestation qu'un client a activée effacerait sa solution, ses appels et son
-- historique. On ne supprime donc que celles que personne n'a activées, et on
-- se contente de désactiver les autres — invisibles au catalogue, mais leurs
-- clients gardent tout.
DELETE FROM "service" s
WHERE s."slug" IN (
    'devis-factures-bons-commande',
    'contrats-courriers-administratifs',
    'relance-impayes',
    'signature-electronique',
    'archivage-intelligent'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "client_service" cs WHERE cs."serviceId" = s."id"
  );

UPDATE "service"
SET "isActive" = false
WHERE "slug" IN (
  'devis-factures-bons-commande',
  'contrats-courriers-administratifs',
  'relance-impayes',
  'signature-electronique',
  'archivage-intelligent'
);
